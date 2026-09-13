"""Phase 6: Google OR-Tools Gate Appointment & 3D Yard Stacking Optimization Endpoints.
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter
from pydantic import BaseModel
from ..core.optimization_engine import gate_optimizer, yard_optimizer
from .entities import containers_store

router = APIRouter(prefix="/api/optimize", tags=["phase6-optimization"])

SAMPLE_UNOPTIMIZED_APPOINTMENTS = [
    {"truck_id": f"TRK-REQ-{i:03d}", "carrier": "Tuticorin Trans", "preferred_slot": 10 if i < 16 else (15 if i < 28 else (i % 24)), "flexibility_slots": 2, "priority": "HIGH" if i % 4 == 0 else "NORMAL"}
    for i in range(45)
]

class GateOptimizeRequest(BaseModel):
    appointments: Optional[List[Dict[str, Any]]] = None
    gate_hourly_capacity: int = 12
    time_slots: int = 24

class YardOptimizeRequest(BaseModel):
    containers: Optional[List[Dict[str, Any]]] = None
    yard_blocks: Optional[List[str]] = None
    bays_per_block: int = 8
    rows_per_bay: int = 4
    max_tiers: int = 5


@router.get("/sample-appointments")
def get_sample_appointments():
    """Returns sample unoptimized carrier appointment booking requests."""
    return SAMPLE_UNOPTIMIZED_APPOINTMENTS


@router.post("/gate-appointments")
def optimize_gate_appointments(req: GateOptimizeRequest):
    """Runs Google OR-Tools CP-SAT solver to level gate appointment slots and eliminate queues."""
    appts = req.appointments if req.appointments is not None else SAMPLE_UNOPTIMIZED_APPOINTMENTS
    result = gate_optimizer.optimize_appointments(
        appointments=appts,
        gate_hourly_capacity=req.gate_hourly_capacity,
        time_slots=req.time_slots
    )
    return result


@router.post("/yard-stacking")
def optimize_yard_stacking(req: YardOptimizeRequest):
    """Runs OR-Tools 3D container allocation (Bay-Row-Tier) solver to eliminate reshuffle moves."""
    conts = req.containers if req.containers is not None else containers_store
    blocks = req.yard_blocks or ["BLOCK_A", "BLOCK_B", "BLOCK_C", "BLOCK_D_HAZMAT"]
    result = yard_optimizer.optimize_yard_stacking(
        containers=conts,
        yard_blocks=blocks,
        bays_per_block=req.bays_per_block,
        rows_per_bay=req.rows_per_bay,
        max_tiers=req.max_tiers
    )
    return result
