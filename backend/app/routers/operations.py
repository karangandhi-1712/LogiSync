from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db import get_db
from app.models.container import ContainerModel
from app.models.shipment import ShipmentModel

router = APIRouter(prefix="/operations", tags=["Container & Shipment Operations"])


@router.get("/containers")
def list_containers(db: Session = Depends(get_db)):
    """Lists port yard container inventory."""
    return db.query(ContainerModel).all()


@router.get("/shipments")
def list_shipments(db: Session = Depends(get_db)):
    """Lists multimodal freight shipments."""
    return db.query(ShipmentModel).all()
