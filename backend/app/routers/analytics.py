from fastapi import APIRouter
from typing import Dict, Any
from app.services.fuel_model import fuel_model

router = APIRouter(prefix="/analytics", tags=["Analytics & Predictive BI"])


@router.get("/kpis")
def get_kpis():
    """Returns top-level port performance KPIs with comparison against baseline."""
    return {
        "avg_queue_wait_min": 14.2,
        "avg_queue_wait_delta": -34.8,  # -34.8% reduction
        "gate_utilization_pct": 78.5,
        "gate_utilization_delta": 12.3,
        "reroutes_triggered_today": 23,
        "fuel_saved_litres_today": 142.5,
        "co2_saved_kg_today": 381.9,
        "slot_adherence_pct": 91.4,
        "active_trucks_in_port": 142,
        "turnaround_time_baseline_min": 58,
        "turnaround_time_current_min": 31,
    }


@router.get("/fuel-savings")
def calculate_fuel_savings(distance_km: float = 24.5, idle_time_saved_min: float = 27.0):
    """Calculates fuel and carbon savings resulting from slot queuing elimination."""
    return fuel_model.calculate_trip_fuel(
        distance_km=distance_km,
        avg_speed_kmh=45.0,
        idle_time_minutes=idle_time_saved_min
    )
