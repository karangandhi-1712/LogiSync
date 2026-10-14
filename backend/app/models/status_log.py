import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from datetime import datetime
from app.db import Base


def _uuid():
    return str(uuid.uuid4())


class StatusUpdateLogModel(Base):
    """Audit trail for both schedule-level and per-stop status changes.

    Replaces the old booking-scoped log: `delivery_request_id` covers stop-level
    transitions, `schedule_id` covers the parent batch's own lifecycle.
    """

    __tablename__ = "status_update_log"

    id = Column(String(36), primary_key=True, default=_uuid)
    delivery_request_id = Column(String(36), ForeignKey("delivery_requests.id"), nullable=True, index=True)
    schedule_id = Column(String(36), ForeignKey("delivery_schedules.id"), nullable=True, index=True)
    old_status = Column(String(32), nullable=True)
    new_status = Column(String(32), nullable=False)
    updated_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    reason = Column(String(512), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)