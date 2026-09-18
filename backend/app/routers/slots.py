from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

from app.db import get_db
from app.models.slot import SlotModel
from app.services.slot_allocator import slot_allocator_service
from app.services.sns_notifier import sns_service
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/slots", tags=["AI Dynamic Slot Allocation"])

GATE_ALIASES = {
    "G-01": "Gate 1 (Bulk)",
    "G-02": "Gate 2 (General)",
    "G-03": "Gate 3 (Container/Reefer)",
    "G-04": "Gate 4 (Express Rail)",
}


def canonical_gate_id(gate_id: str) -> str:
    return GATE_ALIASES.get(gate_id, gate_id)


from app.middleware.rate_limiter import limiter
from starlette.requests import Request
from app.services.audit_service import audit_service
from app.dependencies import get_current_user, require_role
from app.ports import is_valid_port


class BookSlotRequest(BaseModel):
    gateId: str
    date: str
    slotTime: str
    truckPlate: str
    driverName: str
    driverPhone: Optional[str] = "+91 98400 12345"
    cargoType: str
    containerNo: Optional[str] = None
    dwellEstimateMin: Optional[int] = 25
    tier: Optional[str] = "standard"
    port: Optional[str] = "voc"


class AISuggestRequest(BaseModel):
    gateId: str
    date: str
    preferredTime: str
    cargoType: Optional[str] = "Container"
    port: Optional[str] = "voc"


class RescheduleRequest(BaseModel):
    new_time: Optional[str] = None
    newTime: Optional[str] = None
    slotTime: Optional[str] = None


VALID_TIERS = {"standard", "express", "critical"}


@router.get("")
def get_slots(
    gate_id: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    port: Optional[str] = Query(None, description="Filter by port id (e.g. voc, vizag)"),
    db: Session = Depends(get_db),
    _user=Depends(get_current_user)
):
    """Lists time slots for gates on a specified date, optionally for one port."""
    query = db.query(SlotModel)
    if port:
        if not is_valid_port(port):
            raise HTTPException(status_code=400, detail=f"Unknown port '{port}'")
        query = query.filter(SlotModel.port_id == port)
    if gate_id:
        query = query.filter(SlotModel.gate_id == canonical_gate_id(gate_id))
    if date:
        query = query.filter(SlotModel.date == date)
    return query.order_by(SlotModel.date, SlotModel.slot_time).limit(500).all()


@router.get("/congestion")
def get_congestion_matrix(
    port: Optional[str] = Query(None, description="Port id (e.g. voc, vizag)"),
    _user=Depends(get_current_user),
):
    """Returns real-time congestion scores and queue wait times for a port's gates."""
    from app.ports import DEFAULT_PORT_ID
    port_id = port or DEFAULT_PORT_ID
    if not is_valid_port(port_id):
        raise HTTPException(status_code=400, detail=f"Unknown port '{port_id}'")
    return slot_allocator_service.get_all_gate_status(port_id)


@router.post("/ai-suggest")
@limiter.limit("20/minute")
def ai_suggest_slot(req: AISuggestRequest, request: Request, _user = Depends(get_current_user)):
    """
    Core Novelty: AI recommends the optimal arrival slot to avoid peak terminal queues.
    """
    port_id = req.port or "voc"
    if not is_valid_port(port_id):
        raise HTTPException(status_code=400, detail=f"Unknown port '{port_id}'")
    return slot_allocator_service.suggest_optimal_slot(
        gate_id=canonical_gate_id(req.gateId),
        preferred_time=req.preferredTime,
        date_str=req.date,
        cargo_type=req.cargoType or "Container",
        port_id=port_id,
    )


@router.post("/book")
def book_slot(req: BookSlotRequest, db: Session = Depends(get_db), user = Depends(require_role(["port_admin", "dispatcher"]))):
    """
    Books an allocated gate slot. Publishes confirmation via AWS SNS to the driver.
    """
    tier = (req.tier or "standard").lower()
    if tier not in VALID_TIERS:
        raise HTTPException(status_code=422, detail=f"Invalid tier '{req.tier}'. Valid: standard, express, critical")
    port_id = req.port or "voc"
    if not is_valid_port(port_id):
        raise HTTPException(status_code=400, detail=f"Unknown port '{port_id}'")
    # Conflict check: same port + gate + date + time + truck already booked
    existing = db.query(SlotModel).filter(
        SlotModel.port_id == port_id,
        SlotModel.gate_id == canonical_gate_id(req.gateId),
        SlotModel.date == req.date,
        SlotModel.slot_time == req.slotTime,
        SlotModel.truck_plate == req.truckPlate,
        SlotModel.status == "booked",
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Slot already booked for this truck at this gate/time")
    new_slot = SlotModel(
        id=f"slot-{uuid.uuid4().hex[:8]}",
        port_id=port_id,
        gate_id=canonical_gate_id(req.gateId),
        slot_time=req.slotTime,
        date=req.date,
        status="booked",
        truck_plate=req.truckPlate,
        driver_name=req.driverName,
        cargo_type=req.cargoType,
        container_no=req.containerNo,
        dwell_estimate_min=req.dwellEstimateMin or 25,
        is_rescheduled=False
    )
    db.add(new_slot)
    db.commit()
    db.refresh(new_slot)

    audit_service.log_event(
        event_type="slot_booked",
        user_id=user.get("sub", "operator"),
        details=f"Booked {req.gateId} at {req.slotTime} for truck {req.truckPlate} ({req.cargoType})",
        metric_name="BookingsCount",
        db=db
    )

    # Publish SMS/Alert via AWS SNS
    sns_service.publish_alert(
        topic_arn=settings.SNS_TOPIC_ALERTS,
        subject="Slot Booking Confirmed",
        message=f"VOC Port Slot Confirmed: {req.gateId} at {req.slotTime} for truck {req.truckPlate}.",
        phone_number=req.driverPhone
    )

    return new_slot


@router.put("/{slot_id}/reschedule")
def reschedule_slot(
    slot_id: str,
    new_time: Optional[str] = Query(None),
    body: Optional[RescheduleRequest] = None,
    db: Session = Depends(get_db),
    user=Depends(require_role(["port_admin", "dispatcher"]))
):
    """Reschedules an active slot dynamically when traffic delays occur.
    Accepts new time via JSON body {new_time} or ?new_time= query param (legacy)."""
    resolved = (body.new_time or body.newTime or body.slotTime) if body else None
    resolved = resolved or new_time
    if not resolved:
        raise HTTPException(status_code=422, detail="New time required: send JSON body {new_time: 'HH:MM'} or ?new_time= query param")
    new_time = resolved
    slot = db.query(SlotModel).filter(SlotModel.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    old_time = slot.slot_time
    slot.slot_time = new_time
    slot.is_rescheduled = True
    db.commit()
    db.refresh(slot)

    audit_service.log_event(
        event_type="slot_rescheduled",
        user_id=user.get("sub", "operator"),
        details=f"Rescheduled slot {slot_id} from {old_time} to {new_time}",
        metric_name="SlotRescheduledCount",
        db=db
    )

    return slot


@router.delete("/{slot_id}")
def cancel_slot(
    slot_id: str,
    db: Session = Depends(get_db),
    user = Depends(require_role(["port_admin", "dispatcher"]))
):
    """Cancels a booked gate slot and frees the capacity. Restricted from fleet_manager."""
    slot = db.query(SlotModel).filter(SlotModel.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    gate = slot.gate_id
    time_str = slot.slot_time
    db.delete(slot)
    db.commit()

    audit_service.log_event(
        event_type="slot_cancelled",
        user_id=user.get("sub", "operator"),
        details=f"Cancelled slot {slot_id} at {gate} {time_str}",
        metric_name="SlotCancelledCount",
        db=db
    )

    return {"message": "Slot cancelled successfully"}

