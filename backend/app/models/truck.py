from sqlalchemy import Column, String, Float, Integer, DateTime
from datetime import datetime
from app.db import Base


class TruckModel(Base):
    __tablename__ = "trucks"

    id = Column(String(32), primary_key=True, index=True)
    port_id = Column(String(32), default="voc", index=True)
    plate = Column(String(32), nullable=False)
    vin = Column(String(64), nullable=True)
    status = Column(String(32), default="in_transit")  # in_transit, queued, at_gate, loading, completed, delayed
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    heading = Column(Float, default=0.0)
    speed = Column(Float, default=0.0)
    driver_name = Column(String(128), default="Driver")
    driver_phone = Column(String(32), default="+91 98400 12345")
    duty_hours = Column(Float, default=4.5)
    driver_rating = Column(Float, default=4.9)
    fuel_level = Column(Float, default=78.0)
    reefer_temp = Column(Float, nullable=True)
    destination = Column(String(128), default="VOC Port Gate 3")
    assigned_gate = Column(String(32), default="Gate 3")
    eta = Column(String(32), default="14:15")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
