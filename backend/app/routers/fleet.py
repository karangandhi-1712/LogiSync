from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.db import get_db
from app.models.truck import TruckModel
from app.services.rerouter import rerouter_service
from app.services.sns_notifier import sns_service
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/fleet", tags=["Fleet Management & Telematics"])


class TelemetryUpdate(BaseModel):
    lat: float
    lng: float
    speed: float
    heading: float
    fuel_level: Optional[float] = None
    reefer_temp: Optional[float] = None


@router.get("/trucks")
def list_trucks(db: Session = Depends(get_db)):
    """Returns all 24 registered port logistics fleet vehicles."""
    trucks = db.query(TruckModel).all()
    return trucks


@router.get("/trucks/{truck_id}")
def get_truck(truck_id: str, db: Session = Depends(get_db)):
    """Fetches full vehicle telematics and driver profile."""
    truck = db.query(TruckModel).filter(TruckModel.id == truck_id).first()
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")
    return truck


@router.post("/trucks/{truck_id}/telemetry")
def update_telemetry(truck_id: str, data: TelemetryUpdate, db: Session = Depends(get_db)):
    """
    Ingests live GPS ping from truck onboard GNSS unit.
    Triggers real-time geofence check and AI dynamic rerouting if bottleneck detected.
    """
    truck = db.query(TruckModel).filter(TruckModel.id == truck_id).first()
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")

    truck.lat = data.lat
    truck.lng = data.lng
    truck.speed = data.speed
    truck.heading = data.heading
    if data.fuel_level is not None:
        truck.fuel_level = data.fuel_level
    if data.reefer_temp is not None:
        truck.reefer_temp = data.reefer_temp

    db.commit()

    # Real-time Rerouting evaluation
    reroute_eval = rerouter_service.evaluate_truck_position(
        truck_id=truck_id,
        current_lat=data.lat,
        current_lng=data.lng
    )

    if reroute_eval.get("reroute_triggered"):
        # Alert fleet manager via SNS
        sns_service.publish_alert(
            topic_arn=settings.SNS_TOPIC_REROUTE,
            subject=f"AI Reroute Suggested: {truck.plate}",
            message=reroute_eval["message"]
        )

    return {
        "status": "updated",
        "truck_id": truck_id,
        "reroute_evaluation": reroute_eval
    }


@router.post("/trucks/{truck_id}/reroute")
def trigger_reroute(truck_id: str, db: Session = Depends(get_db)):
    """Dispatches reroute instruction to truck driver dashboard."""
    truck = db.query(TruckModel).filter(TruckModel.id == truck_id).first()
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")

    truck.status = "in_transit"
    db.commit()

    return {
        "truck_id": truck_id,
        "plate": truck.plate,
        "instruction": "Diverting to Harbour Bypass Rd -> Gate 4 to avoid NH 38 queue.",
        "status": "reroute_active"
    }
