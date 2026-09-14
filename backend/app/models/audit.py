from sqlalchemy import Column, String, DateTime, Text
from datetime import datetime
from app.db import Base


class AuditModel(Base):
    __tablename__ = "audit_trail"

    id = Column(String(32), primary_key=True, index=True)
    event_type = Column(String(64), nullable=False)  # slot_booked, slot_rescheduled, reroute_triggered, gate_checkin
    user_id = Column(String(64), default="system")
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
