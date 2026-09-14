from sqlalchemy import Column, String, Integer, DateTime, Boolean
from datetime import datetime
from app.db import Base


class SlotModel(Base):
    __tablename__ = "slots"

    id = Column(String(32), primary_key=True, index=True)
    gate_id = Column(String(32), nullable=False, index=True)
    slot_time = Column(String(32), nullable=False)  # e.g., "14:15"
    date = Column(String(16), nullable=False)       # e.g., "2026-09-15"
    status = Column(String(32), default="available")  # available, booked, ai_suggested, surge, past
    truck_id = Column(String(32), nullable=True)
    truck_plate = Column(String(32), nullable=True)
    driver_name = Column(String(128), nullable=True)
    cargo_type = Column(String(64), default="Container")
    container_no = Column(String(64), nullable=True)
    dwell_estimate_min = Column(Integer, default=25)
    is_rescheduled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
