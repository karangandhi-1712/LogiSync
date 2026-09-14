from sqlalchemy import Column, String, DateTime
from datetime import datetime
from app.db import Base


class ShipmentModel(Base):
    __tablename__ = "shipments"

    id = Column(String(32), primary_key=True, index=True)
    tracking_number = Column(String(64), unique=True, index=True, nullable=False)
    origin = Column(String(128), default="Madurai Inland Depot")
    destination = Column(String(128), default="VOC Port Berth 4")
    status = Column(String(32), default="in_transit")  # pending, in_transit, customs_clearance, delivered
    carrier = Column(String(64), default="Southern Logistics Express")
    assigned_truck_id = Column(String(32), nullable=True)
    eta = Column(String(32), default="16:30")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
