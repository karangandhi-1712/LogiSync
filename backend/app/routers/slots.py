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


class AISuggestRequest(BaseModel):
    gateId: str
    date: str
    preferredTime: str
    cargoType: Optional[str] = "Container"


@router.get("")
def get_slots(
    gate_id: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Lists time slots for gates on a specified date."""
    query = db.query(SlotModel)
    if gate_id:
        query = query.filter(SlotModel.gate_id == gate_id)
    if date:
        query = query.filter(SlotModel.date == date)
    return query.all()


@router.get("/congestion")
def get_congestion_matrix():
    """Returns real-time congestion scores and queue wait times for all gates."""
    return slot_allocator_service.get_all_gate_status()


@router.post("/ai-suggest")
def ai_suggest_slot(req: AISuggestRequest):
    """
    Core Novelty: AI recommends the optimal arrival slot to avoid peak terminal queues.
    """
    return slot_allocator_service.suggest_optimal_slot(
        gate_id=req.gateId,
        preferred_time=req.preferredTime,
        date_str=req.date,
        cargo_type=req.cargoType or "Container"
    )


@router.post("/book")
def book_slot(req: BookSlotRequest, db: Session = Depends(get_db)):
    """
    Books an allocated gate slot. Publishes confirmation via AWS SNS to the driver.
    """
    new_slot = SlotModel(
        id=f"slot-{uuid.uuid4().hex[:8]}",
        gate_id=req.gateId,
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
    new_time: str,
    db: Session = Depends(get_db)
):
    """Reschedules an active slot dynamically when traffic delays occur."""
    slot = db.query(SlotModel).filter(SlotModel.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    slot.slot_time = new_time
    slot.is_rescheduled = True
    db.commit()
    db.refresh(slot)

    return slot


@router.delete("/{slot_id}")
def cancel_slot(slot_id: str, db: Session = Depends(get_db)):
    """Cancels a booked gate slot and frees the capacity."""
    slot = db.query(SlotModel).filter(SlotModel.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    db.delete(slot)
    db.commit()
    return {"message": "Slot cancelled successfully"}
