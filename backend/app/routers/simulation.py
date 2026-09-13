"""Phase 5: Discrete-Event Simulation API Endpoints.

Provides:
- `/api/sim/batch-run`: Run fast SimPy discrete-event terminal simulations (24h/7d) and returns KPI distributions and charts.
- `/api/sim/presets`: Preset operational scenarios (Normal Day, Monsoon Storm Congestion, Peak Vessel Discharge, Strike / Gate Outage).
"""
from typing import Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel
from ..core.sim_engine import run_batch_simulation

router = APIRouter(prefix="/api/sim", tags=["phase5-simulation"])

class SimBatchRequest(BaseModel):
    duration_hours: float = 24.0
    arrival_rate_per_hour: float = 22.0
    inbound_gate_lanes: int = 3
    weighbridges: int = 2
    yard_cranes: int = 4
    warehouse_docks: int = 6
    random_seed: Optional[int] = 42


@router.post("/batch-run")
def trigger_batch_simulation(req: SimBatchRequest):
    """Executes a discrete-event SimPy simulation run with the given operational parameters."""
    result = run_batch_simulation(
        duration_hours=req.duration_hours,
        arrival_rate_per_hour=req.arrival_rate_per_hour,
        inbound_gate_lanes=req.inbound_gate_lanes,
        weighbridges=req.weighbridges,
        yard_cranes=req.yard_cranes,
        warehouse_docks=req.warehouse_docks,
        random_seed=req.random_seed
    )
    return result


@router.get("/presets")
def list_simulation_presets():
    """Provides pre-configured logistics stress-test and baseline scenarios."""
    return [
        {
            "id": "scenario_baseline",
            "name": "Standard 24h Baseline",
            "description": "Normal terminal operations with 3 gate lanes and 4 RTG cranes.",
            "params": {
                "duration_hours": 24.0,
                "arrival_rate_per_hour": 22.0,
                "inbound_gate_lanes": 3,
                "weighbridges": 2,
                "yard_cranes": 4,
                "warehouse_docks": 6
            }
        },
        {
            "id": "scenario_vessel_surge",
            "name": "VOC Port Mega-Vessel Discharge Surge",
            "description": "High-volume container train & truck dispatch with 38 arrivals/hr.",
            "params": {
                "duration_hours": 24.0,
                "arrival_rate_per_hour": 38.0,
                "inbound_gate_lanes": 4,
                "weighbridges": 3,
                "yard_cranes": 6,
                "warehouse_docks": 8
            }
        },
        {
            "id": "scenario_gate_bottleneck",
            "name": "Gate Degraded (1 Lane Out of Service)",
            "description": "Simulates gate OCR system maintenance bottleneck.",
            "params": {
                "duration_hours": 24.0,
                "arrival_rate_per_hour": 24.0,
                "inbound_gate_lanes": 1,
                "weighbridges": 2,
                "yard_cranes": 4,
                "warehouse_docks": 6
            }
        }
    ]
