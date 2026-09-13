"""Phase 4: Digital Twin Core State Separation & Discrepancy Endpoints.
"""
from fastapi import APIRouter, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any
from ..core.digital_twin_state import twin_state_engine
from .entities import trucks_store, containers_store, equipment_store
from .gis import _seed_file

router = APIRouter(prefix="/api/twin", tags=["phase4-digital-twin"])


def _get_yard_and_gates_raw():
    yards_geo = _seed_file("real_yards.geojson") or _seed_file("yards.geojson") or {"features": []}
    gates_geo = _seed_file("real_gates.geojson") or _seed_file("gates.geojson") or {"features": []}
    
    yard_zones = [
        {"id": f.get("properties", {}).get("id", f"yard_{i}"), 
         "name": f"Yard Zone {i+1}", 
         "slots_total": 1200, 
         "slots_occupied": 740 + i * 50}
        for i, f in enumerate(yards_geo.get("features", []))
    ] or [{"id": "yard_a", "name": "Main Container Yard", "slots_total": 4800, "slots_occupied": 2960}]

    gates = [
        {"id": f.get("properties", {}).get("id", f"gate_{i}"),
         "name": f.get("properties", {}).get("name", f"Gate {i+1}"),
         "current_queue_count": 1 if i == 0 else 0}
        for i, f in enumerate(gates_geo.get("features", []))
    ] or [{"id": "gate_01", "name": "Main Inbound Gate Complex", "current_queue_count": 2}]

    return yard_zones, gates


@router.get("/state/observed")
def get_observed_state():
    """Returns the live physical state as captured by sensors and cameras."""
    yard_zones, gates = _get_yard_and_gates_raw()
    return twin_state_engine.get_observed_state(
        trucks_store, containers_store, equipment_store, yard_zones, gates
    )


@router.get("/state/projected")
def get_projected_state():
    """Returns the planned / scheduled operational target state."""
    yard_zones, gates = _get_yard_and_gates_raw()
    return twin_state_engine.get_projected_state(
        trucks_store, containers_store, yard_zones, gates
    )


@router.get("/discrepancies")
def list_discrepancies():
    """Computes and lists discrepancies between Observed and Projected states."""
    yard_zones, gates = _get_yard_and_gates_raw()
    obs = twin_state_engine.get_observed_state(trucks_store, containers_store, equipment_store, yard_zones, gates)
    proj = twin_state_engine.get_projected_state(trucks_store, containers_store, yard_zones, gates)
    discrepancies = twin_state_engine.compute_discrepancies(obs, proj)
    return {
        "count": len(discrepancies),
        "discrepancies": discrepancies,
        "last_analyzed_at": obs["timestamp"]
    }


class ReconcileRequest(BaseModel):
    action_type: str # ACCEPT_VARIANCE, OVERRIDE_SLOT, EXTEND_APPOINTMENT, RESTACK_HAZMAT
    target_item_id: str
    note: Optional[str] = None


@router.post("/reconcile")
def reconcile_state(req: ReconcileRequest):
    """Applies reconciliation between observed variance and digital twin model."""
    result = twin_state_engine.reconcile(req.action_type, req.target_item_id, req.note or "")
    return result
