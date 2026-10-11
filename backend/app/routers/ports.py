"""Depot directory.

Public by design: the consumer intake form loads the depot list before anyone
has logged in, and the "nearest depot to me" suggestion needs no identity.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import require_role
from app.models.port import PortModel
from app.ports import COASTAL_PORTS, haversine_km, nearest_port
from app.serializers import serialize_port

router = APIRouter(prefix="/ports", tags=["Ports"])


@router.get("")
def list_ports(db: Session = Depends(get_db)):
    rows = db.query(PortModel).order_by(PortModel.name).all()
    return [serialize_port(p) for p in rows]


@router.get("/nearest")
def nearest(lat: float, lng: float, db: Session = Depends(get_db)):
    """Closest depot to a coordinate — powers the consumer's auto-suggest."""
    port_id = nearest_port(lat, lng)
    port = db.query(PortModel).filter(PortModel.id == port_id).first() if port_id else None
    if not port:
        raise HTTPException(status_code=404, detail="No depots configured.")
    return {
        **serialize_port(port),
        "distance_km": round(haversine_km(lat, lng, port.lat, port.lng), 2),
    }


@router.get("/coastal")
def coastal(db: Session = Depends(get_db)):
    """Depots that serve consumer-facing last-mile delivery."""
    rows = db.query(PortModel).filter(PortModel.id.in_(COASTAL_PORTS)).order_by(PortModel.name).all()
    return [serialize_port(p) for p in rows]


@router.get("/{port_id}")
def get_port(port_id: str, db: Session = Depends(get_db)):
    port = db.query(PortModel).filter(PortModel.id == port_id).first()
    if not port:
        raise HTTPException(status_code=404, detail="Port not found.")
    return serialize_port(port)