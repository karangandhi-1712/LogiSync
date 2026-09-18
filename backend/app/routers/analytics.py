from fastapi import APIRouter, Query, Depends, Request, HTTPException
from typing import Dict, Any, List, Optional
from app.services.fuel_model import fuel_model
from app.middleware.rate_limiter import limiter
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.ports import DEFAULT_PORT_ID, is_valid_port
import hashlib

router = APIRouter(prefix="/analytics", tags=["Analytics & Predictive BI"], dependencies=[Depends(get_current_user)])


def _require_port(port: Optional[str]) -> str:
    port_id = port or DEFAULT_PORT_ID
    if not is_valid_port(port_id):
        raise HTTPException(status_code=400, detail=f"Unknown port '{port_id}'")
    return port_id


def _port_factor(port_id: str) -> float:
    """Deterministic per-port scale for simulated BI numbers. VOC stays 1.0."""
    if port_id == DEFAULT_PORT_ID:
        return 1.0
    h = int(hashlib.md5(f"bi-{port_id}".encode()).hexdigest(), 16)
    return round(0.7 + (h % 60) / 100.0, 3)


class SimulationRequest(BaseModel):
    num_trucks: Optional[int] = 100
    arrival_distribution: Optional[str] = "poisson"
    gate_capacity_multiplier: Optional[float] = 1.0
    dynamic_rerouting_enabled: Optional[bool] = True
    time_horizon_hours: Optional[int] = 8


@router.get("/kpis")
def get_kpis(
    period: Optional[str] = Query("24h"),
    port: Optional[str] = Query(None, description="Port id (e.g. voc, vizag)"),
):
    """Returns top-level port performance KPIs with comparison against baseline."""
    port_id = _require_port(port)
    f = _port_factor(port_id)
    # Scale slightly based on period
    scale = 1.0
    if period == "7d":
        scale = 7.0
    elif period == "30d":
        scale = 30.0

    return {
        "avg_queue_wait_min": round((14.2 if period == "24h" else (16.8 if period == "7d" else 15.5)) * f, 1),
        "avg_queue_wait_delta": -34.8,  # -34.8% reduction
        "gate_utilization_pct": round((78.5 if period == "24h" else (82.1 if period == "7d" else 80.4)) * min(f, 1.15), 1),
        "gate_utilization_delta": 12.3,
        "reroutes_triggered_today": int(23 * scale * f),
        "fuel_saved_litres_today": round(142.5 * scale * f, 1),
        "co2_saved_kg_today": round(381.9 * scale * f, 1),
        "slot_adherence_pct": round(max(62.0, min(98.5, 91.4 + (1.0 - f) * 20.0)), 1),
        "active_trucks_in_port": int((142 if period == "24h" else 156) * f),
        "turnaround_time_baseline_min": 58,
        "turnaround_time_current_min": 31,
    }


@router.get("/charts/congestion-heatmap")
def get_congestion_heatmap(
    period: Optional[str] = Query("24h"),
    port: Optional[str] = Query(None, description="Port id (e.g. voc, vizag)"),
):
    """Hourly congestion scores per gate (0-100 scale)."""
    from app.ports import PORTS
    port_id = _require_port(port)
    f = _port_factor(port_id)
    gates = PORTS[port_id]["gates"] if port_id != DEFAULT_PORT_ID else ["Gate 1 (Bulk)", "Gate 2 (General)", "Gate 3 (Container)", "Gate 4 (Rail)"]
    hours = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"]

    # Generate realistic patterns
    base_scores = {
        "Gate 1 (Bulk)": [22, 45, 68, 85, 76, 52, 38, 20, 15],
        "Gate 2 (General)": [18, 38, 72, 79, 65, 48, 32, 19, 12],
        "Gate 3 (Container)": [30, 62, 94, 91, 88, 75, 54, 33, 20],
        "Gate 4 (Rail)": [15, 25, 42, 50, 48, 36, 28, 16, 10]
    }
    legacy_keys = list(base_scores.keys())

    data = []
    for g_idx, gate in enumerate(gates):
        pattern = base_scores[legacy_keys[g_idx % len(legacy_keys)]]
        for h_idx, hour in enumerate(hours):
            score = max(5, min(99, int(pattern[h_idx] * f)))
            data.append({
                "gate": gate,
                "gate_index": g_idx,
                "hour": hour,
                "hour_index": h_idx,
                "score": score
            })
    return {"gates": gates, "hours": hours, "data": data}


@router.get("/charts/turnaround")
def get_turnaround_chart(
    period: Optional[str] = Query("7d"),
    port: Optional[str] = Query(None, description="Port id (e.g. voc, vizag)"),
):
    """Actual vs AI-Predicted turnaround times across days."""
    f = _port_factor(_require_port(port))
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    actual = [round(v * f, 1) for v in [34.5, 32.0, 29.8, 31.2, 33.6, 28.4, 27.0]]
    predicted = [round(v * f, 1) for v in [33.0, 31.5, 30.2, 30.8, 32.5, 28.0, 26.5]]
    baseline_unoptimized = [round(v * f, 1) for v in [56.0, 58.2, 55.4, 59.1, 62.0, 52.3, 49.0]]

    return {
        "categories": days,
        "actual": actual,
        "predicted": predicted,
        "baseline_unoptimized": baseline_unoptimized,
        "unit": "minutes"
    }


@router.get("/charts/queue-depth")
def get_queue_depth_chart(
    gate: Optional[str] = Query(None),
    port: Optional[str] = Query(None, description="Port id (e.g. voc, vizag)"),
):
    """Queue depth and throughput over time."""
    f = _port_factor(_require_port(port))
    times = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]
    scale = lambda xs: [max(0, int(v * f)) for v in xs]
    return {
        "timestamps": times,
        "g1": scale([5, 8, 12, 14, 11, 7, 6, 8, 5, 3]),
        "g2": scale([4, 6, 9, 10, 8, 6, 5, 6, 4, 2]),
        "g3": scale([2, 4, 3, 2, 4, 3, 2, 3, 2, 1]),
        "g4": scale([6, 9, 15, 16, 12, 8, 7, 9, 6, 4]),
        "throughput_vehicles_per_hr": scale([42, 65, 88, 92, 84, 76, 82, 85, 68, 45])
    }


@router.get("/charts/reroute-impact")
def get_reroute_impact_chart(port: Optional[str] = Query(None, description="Port id (e.g. voc, vizag)")):
    """Before/after reroute corridor performance metrics."""
    from app.ports import PORTS
    port_id = _require_port(port)
    f = _port_factor(port_id)
    if port_id == DEFAULT_PORT_ID:
        corridors = [
            "Madurai Hwy (NH 38)",
            "Harbour Expressway",
            "Tuticorin Bypass",
            "SIPCOT Link Rd",
            "Port Gate 3 Approach"
        ]
    else:
        corridor = PORTS[port_id]["corridor"]
        corridors = [
            corridor,
            f"{PORTS[port_id]['short']} Bypass",
            f"{PORTS[port_id]['city']} Link Rd",
            "Port Approach Rd",
            "Port Gate 3 Approach"
        ]
    scale = lambda xs: [round(v * f, 1) for v in xs]
    return {
        "corridors": corridors,
        "without_ai_wait_min": scale([38.5, 29.0, 24.5, 31.0, 42.0]),
        "with_ai_wait_min": scale([18.2, 16.5, 14.0, 15.8, 19.5]),
        "fuel_saved_pct": [32.4, 28.5, 22.0, 27.8, 35.2],
        "co2_reduction_pct": [34.0, 29.2, 23.5, 29.0, 36.8]
    }


@router.get("/telemetry-stats")
def get_telemetry_stats(port: Optional[str] = Query(None, description="Port id (e.g. voc, vizag)")):
    """Aggregate telemetry statistics for active fleet."""
    from app.db import SessionLocal
    from app.models.truck import TruckModel
    port_id = _require_port(port)
    db = SessionLocal()
    try:
        q = db.query(TruckModel)
        if port_id != DEFAULT_PORT_ID:
            # Per-port live counts; VOC keeps legacy network-wide numbers.
            total = q.filter(TruckModel.port_id == port_id).count()
            delayed = q.filter(TruckModel.port_id == port_id, TruckModel.status == "delayed").count()
            reefer = q.filter(TruckModel.port_id == port_id, TruckModel.reefer_temp.isnot(None)).count()
            return {
                "total_active_trucks": total,
                "gnss_locked_count": total,
                "avg_5g_latency_ms": 4.2,
                "fleet_avg_speed_kmh": 46.8,
                "total_distance_cleared_km": round(118.4 * total, 1),
                "total_active_missions": total,
                "delayed_trucks_count": delayed,
                "reefer_active_monitors": reefer,
                "gate_throughput_rate": 86.4
            }
    finally:
        db.close()
    return {
        "total_active_trucks": 24,
        "gnss_locked_count": 24,
        "avg_5g_latency_ms": 4.2,
        "fleet_avg_speed_kmh": 46.8,
        "total_distance_cleared_km": 2840.5,
        "total_active_missions": 22,
        "delayed_trucks_count": 3,
        "reefer_active_monitors": 6,
        "gate_throughput_rate": 86.4
    }


@router.post("/simulate")
@limiter.limit("20/minute")
def run_monte_carlo_simulation(req: SimulationRequest, request: Request):
    """
    Monte Carlo Queue Simulation:
    Evaluates truck queuing, gate utilization, and waiting times across simulated arrivals.
    """
    import random
    import math

    # Run 500 simulated scenarios
    runs = 500
    waits_no_ai = []
    waits_with_ai = []
    throughput_samples = []

    base_arrival = req.num_trucks / req.time_horizon_hours
    capacity = 16.0 * req.gate_capacity_multiplier

    for _ in range(runs):
        arrival_rate = random.gauss(base_arrival, base_arrival * 0.18)
        # Queue model: M/M/c approximation
        rho_no_ai = arrival_rate / capacity
        wait_no = max(4.0, (rho_no_ai / (1.0 - min(0.95, rho_no_ai))) * 12.0 + random.uniform(-2, 3))
        waits_no_ai.append(round(wait_no, 1))

        # With AI Slot Allocation & Dynamic Rerouting, peaks are smoothed by ~40%
        smoothed_rho = (arrival_rate * 0.72) / capacity
        wait_ai = max(2.5, (smoothed_rho / (1.0 - min(0.92, smoothed_rho))) * 7.5 + random.uniform(-1, 1.5))
        waits_with_ai.append(round(wait_ai, 1))
        throughput_samples.append(int(arrival_rate * req.time_horizon_hours * random.uniform(0.95, 1.0)))

    # Compute distribution buckets
    bucket_ranges = ["0-10m", "10-20m", "20-30m", "30-40m", "40-50m", ">50m"]
    dist_no_ai = [0] * len(bucket_ranges)
    dist_with_ai = [0] * len(bucket_ranges)

    for w in waits_no_ai:
        idx = min(5, int(w // 10))
        dist_no_ai[idx] += 1
    for w in waits_with_ai:
        idx = min(5, int(w // 10))
        dist_with_ai[idx] += 1

    mean_no = sum(waits_no_ai) / len(waits_no_ai)
    mean_ai = sum(waits_with_ai) / len(waits_with_ai)

    return {
        "status": "success",
        "simulation_parameters": {
            "num_trucks": req.num_trucks,
            "distribution": req.arrival_distribution,
            "capacity_multiplier": req.gate_capacity_multiplier,
            "dynamic_rerouting": req.dynamic_rerouting_enabled,
            "time_horizon_hours": req.time_horizon_hours,
            "iterations": runs
        },
        "results": {
            "mean_wait_without_ai_min": round(mean_no, 1),
            "mean_wait_with_ai_min": round(mean_ai, 1),
            "wait_time_reduction_pct": round(((mean_no - mean_ai) / mean_no) * 100, 1),
            "p95_wait_without_ai_min": round(sorted(waits_no_ai)[int(runs * 0.95)], 1),
            "p95_wait_with_ai_min": round(sorted(waits_with_ai)[int(runs * 0.95)], 1),
            "expected_throughput_trucks": int(sum(throughput_samples) / len(throughput_samples)),
            "bucket_ranges": bucket_ranges,
            "distribution_without_ai": dist_no_ai,
            "distribution_with_ai": dist_with_ai
        }
    }


@router.get("/fuel-savings")
def calculate_fuel_savings(distance_km: float = 24.5, idle_time_saved_min: float = 27.0):
    """Calculates fuel and carbon savings resulting from slot queuing elimination."""
    return fuel_model.calculate_trip_fuel(
        distance_km=distance_km,
        avg_speed_kmh=45.0,
        idle_time_minutes=idle_time_saved_min
    )
