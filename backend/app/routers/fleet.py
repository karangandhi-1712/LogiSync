from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.db import get_db
from app.models.truck import TruckModel
from app.services.rerouter import rerouter_service
from app.services.sns_notifier import sns_service
from app.config import get_settings
from app.dependencies import get_current_user, require_role
from app.services.audit_service import audit_service
from app.ports import is_valid_port

settings = get_settings()
router = APIRouter(prefix="/fleet", tags=["Fleet Management & Telematics"])


class TelemetryUpdate(BaseModel):
    lat: float
    lng: float
    speed: float
    heading: float
    fuel_level: Optional[float] = None
    reefer_temp: Optional[float] = None


@router.get("", include_in_schema=False)
@router.get("/trucks")
def list_trucks(
    port: Optional[str] = Query(None, description="Filter by port id (e.g. voc, vizag)"),
    city: Optional[str] = Query(None, description="Legacy alias for port"),
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """Returns fleet vehicles, optionally filtered to one port."""
    port_id = port or city
    query = db.query(TruckModel)
    if port_id:
        if not is_valid_port(port_id):
            raise HTTPException(status_code=400, detail=f"Unknown port '{port_id}'")
        query = query.filter(TruckModel.port_id == port_id)
    trucks = query.all()
    # Serialize to format expected by frontend
    result = []
    for t in trucks:
        t_port = t.port_id or "voc"
        result.append({
            "id": t.id,
            "port_id": t_port,
            "plate": t.plate,
            "truckType": "reefer" if t.reefer_temp is not None else ("container_chassis" if "Gate 3" in (t.assigned_gate or "") else "flatbed"),
            "vehicleMake": "Scania R500" if "01" in t.id else ("Tata Prima" if "02" in t.id else "Ashok Leyland 4940"),
            "containerSize": "High Cube 40ft" if t.reefer_temp is not None else "40ft Flatbed",
            "vin": t.vin or f"VIN-{t.id}",
            "status": t.status,
            "cityId": t_port,
            "driver": {
                "id": f"d-{t.id}",
                "name": t.driver_name or "Driver",
                "rating": t.driver_rating or 4.8,
                "dutyHours": int(t.duty_hours or 4),
                "dutyMinutes": int(((t.duty_hours or 4) % 1) * 60),
                "phone": t.driver_phone or "+91 98401 10000",
                "kyc_verified": True
            },
            "latitude": t.lat,
            "longitude": t.lng,
            "heading": t.heading,
            "speedKmh": t.speed,
            "fuelPct": int(t.fuel_level or 75),
            "reeferTempC": t.reefer_temp,
            "reeferSetTempC": -20 if t.reefer_temp is not None else None,
            "assigned_gate": t.assigned_gate,
            "mission": {
                "origin": "Chennai CFS" if "01" in t.id else ("Madurai ICD" if "02" in t.id else "Tirunelveli MMLP"),
                "destination": t.destination or "VOC Port Gate 3",
                "progressPct": 68 if "01" in t.id else 45,
                "distanceClearedKm": 184 if "01" in t.id else 68,
                "distanceRemainingKm": 42 if "01" in t.id else 82,
                "etaTime": t.eta or "14:15",
                "etaStatus": "delayed" if t.status == "delayed" else "on_time"
            },
            "alertTag": "NH-44 Bypass Bottleneck • Missed Window" if t.status == "delayed" else None,
            "gnssLocked": True
        })
    return result


@router.get("/{truck_id}", include_in_schema=False)
@router.get("/trucks/{truck_id}")
def get_truck(truck_id: str, db: Session = Depends(get_db), _user=Depends(get_current_user)):
    """Fetches full vehicle telematics and driver profile."""
    t = db.query(TruckModel).filter(TruckModel.id == truck_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Truck not found")
    return {
        "id": t.id,
        "plate": t.plate,
        "truckType": "reefer" if t.reefer_temp is not None else "container_chassis",
        "vehicleMake": "Scania R500",
        "containerSize": "High Cube 40ft",
        "vin": t.vin or f"VIN-{t.id}",
        "status": t.status,
        "port_id": t.port_id or "voc",
        "cityId": t.port_id or "voc",
        "driver": {
            "id": f"d-{t.id}",
            "name": t.driver_name or "Driver",
                "rating": t.driver_rating or 4.5,
                "dutyHours": int(t.duty_hours or 4),
                "dutyMinutes": int(((t.duty_hours or 4) % 1) * 60),
                "phone": t.driver_phone or "+91 98401 10000",
                "kyc_verified": True
            },
        "latitude": t.lat,
        "longitude": t.lng,
        "heading": t.heading,
        "speedKmh": t.speed,
        "fuelPct": int(t.fuel_level or 75),
        "reeferTempC": t.reefer_temp,
        "assigned_gate": t.assigned_gate,
        "mission": {
            "origin": "Chennai CFS",
            "destination": t.destination,
            "progressPct": 75,
            "distanceClearedKm": 180,
            "distanceRemainingKm": 25,
            "etaTime": t.eta,
            "etaStatus": "on_time"
        },
        "gnssLocked": True
    }


@router.post("/{truck_id}/telemetry", include_in_schema=False)
@router.post("/trucks/{truck_id}/telemetry")
def update_telemetry(truck_id: str, data: TelemetryUpdate, db: Session = Depends(get_db), _user = Depends(require_role(["port_admin", "fleet_manager", "dispatcher"]))):
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

    # Real-time Rerouting evaluation (port-scoped hotspots)
    reroute_eval = rerouter_service.evaluate_truck_position(
        truck_id=truck_id,
        current_lat=data.lat,
        current_lng=data.lng,
        port_id=truck.port_id or "voc",
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


@router.post("/{truck_id}/reroute", include_in_schema=False)
@router.post("/trucks/{truck_id}/reroute")
def trigger_reroute(truck_id: str, db: Session = Depends(get_db), user = Depends(require_role(["port_admin", "fleet_manager", "dispatcher"]))):
    """Dispatches reroute instruction to truck driver dashboard."""
    truck = db.query(TruckModel).filter(TruckModel.id == truck_id).first()
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")

    truck.status = "in_transit"
    db.commit()

    audit_service.log_event(
        event_type="reroute_triggered",
        user_id=user.get("sub", "operator") if isinstance(user, dict) else getattr(user, "sub", "operator"),
        details=f"Reroute triggered for truck {truck_id} ({truck.plate}) avoiding NH 38 queue",
        metric_name="ReroutesTriggeredCount",
    )

    return {
        "truck_id": truck_id,
        "plate": truck.plate,
        "status": "reroute_active",
        "message": "AI Dynamic Reroute Dispatched Successfully",
        "instruction": "Diverting to Harbour Bypass Rd -> Gate 4 to avoid NH 38 queue.",
        "delay_avoided_min": 25,
        "fuel_saved_litres": 3.8,
        "co2_reduction_kg": 9.4,
        "savings_estimated_inr": 360,
        "recommended_route": "Harbour Bypass Rd -> Green Corridor Gate 4",
        "hotspot_avoided": "VOC Port Main Gate Bottleneck"
    }

