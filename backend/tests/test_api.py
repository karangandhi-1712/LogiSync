"""Comprehensive Integration & Unit Tests for Phases 1 to 6."""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["active_phases"]["phase_1_foundation"] == "IMPLEMENTED"
    assert data["active_phases"]["phase_5_simpy_discrete_event_simulation"] == "IMPLEMENTED"
    assert data["active_phases"]["phase_6_ortools_optimization"] == "IMPLEMENTED"


def test_gis_layers():
    for endpoint in ["/api/warehouses", "/api/yards", "/api/roads", "/api/gates", "/api/kpis", "/api/gis/3d-container-stacks"]:
        response = client.get(endpoint)
        assert response.status_code == 200
        data = response.json()
        if "features" in data:
            assert len(data["features"]) > 0


def test_entities_crud():
    # Trucks
    res_trucks = client.get("/api/entities/trucks")
    assert res_trucks.status_code == 200
    assert len(res_trucks.json()) >= 4

    # Containers
    res_conts = client.get("/api/entities/containers")
    assert res_conts.status_code == 200
    assert len(res_conts.json()) >= 4

    # Equipment
    res_eq = client.get("/api/entities/equipment")
    assert res_eq.status_code == 200
    assert len(res_eq.json()) >= 3


def test_digital_twin_state_and_discrepancies():
    # Observed State
    res_obs = client.get("/api/twin/state/observed")
    assert res_obs.status_code == 200
    assert res_obs.json()["state_mode"] == "OBSERVED_PHYSICAL"

    # Projected State
    res_proj = client.get("/api/twin/state/projected")
    assert res_proj.status_code == 200
    assert res_proj.json()["state_mode"] == "PROJECTED_PLANNED"

    # Discrepancies
    res_disc = client.get("/api/twin/discrepancies")
    assert res_disc.status_code == 200
    disc_data = res_disc.json()
    assert disc_data["count"] > 0

    # Reconcile Action
    res_rec = client.post("/api/twin/reconcile", json={
        "action_type": "ACCEPT_VARIANCE",
        "target_item_id": "CONT-TN-02",
        "note": "Authorized +3.8t surcharge"
    })
    assert res_rec.status_code == 200
    assert res_rec.json()["status"] == "APPLIED_SYNCED"


def test_simpy_simulation():
    # Batch run
    res_sim = client.post("/api/sim/batch-run", json={
        "duration_hours": 12.0,
        "arrival_rate_per_hour": 20.0,
        "inbound_gate_lanes": 3,
        "weighbridges": 2,
        "yard_cranes": 4,
        "warehouse_docks": 6,
        "random_seed": 42
    })
    assert res_sim.status_code == 200
    sim_data = res_sim.json()
    assert sim_data["kpis"]["total_trucks_serviced"] > 0
    assert sim_data["kpis"]["avg_turnaround_time_mins"] > 0
    assert "hourly_chart_data" in sim_data
    assert "bottleneck_analysis" in sim_data


def test_ortools_optimization():
    # Gate appointment leveling
    res_gate = client.post("/api/optimize/gate-appointments", json={
        "gate_hourly_capacity": 12,
        "time_slots": 24
    })
    assert res_gate.status_code == 200
    gate_opt = res_gate.json()
    assert gate_opt["solver_status"] in ["OPTIMAL", "FEASIBLE"]
    assert gate_opt["peak_hourly_trucks_after"] <= gate_opt["peak_hourly_trucks_before"]

    # 3D Yard Stacking optimization
    res_yard = client.post("/api/optimize/yard-stacking", json={
        "bays_per_block": 8,
        "rows_per_bay": 4,
        "max_tiers": 5
    })
    assert res_yard.status_code == 200
    yard_opt = res_yard.json()
    assert yard_opt["solver_status"] == "OPTIMAL"
    assert yard_opt["reshuffle_reduction_pct"] == 100.0
