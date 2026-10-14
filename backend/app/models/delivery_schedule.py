import uuid
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from datetime import datetime
from app.db import Base


def _uuid():
    return str(uuid.uuid4())


def _json_type():
    """JSONB on Postgres, JSON elsewhere (SQLite) — same Python-side semantics."""
    return JSONB().with_variant(JSON(), "sqlite")


class DeliveryScheduleModel(Base):
    """The broadcastable unit of work.

    A fleet manager picks an area (centre + radius) and a departure window, then
    bundles pending delivery requests into a schedule that is broadcast to
    available drivers. Exactly one driver may claim it — see
    app/services/claim_service.py for the atomic claim.
    """

    __tablename__ = "delivery_schedules"

    id = Column(String(36), primary_key=True, default=_uuid)

    fleet_manager_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    port_id = Column(String(32), ForeignKey("ports.id"), nullable=False, index=True)

    area_label = Column(String(160), nullable=False)
    area_center_lat = Column(Float, nullable=False)
    area_center_lng = Column(Float, nullable=False)
    radius_km = Column(Float, nullable=False, default=6.0)

    departure_window_start = Column(String(8), nullable=False)
    departure_window_end = Column(String(8), nullable=False)
    max_batch_size = Column(Integer, nullable=False, default=4)

    # broadcasting | claimed | locked | in_progress | completed | cancelled
    status = Column(String(32), nullable=False, default="broadcasting", index=True)

    claimed_by_driver_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    claimed_at = Column(DateTime, nullable=True)
    locked_at = Column(DateTime, nullable=True)
    departed_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)

    estimated_earnings = Column(Float, nullable=False, default=0.0)
    final_earnings = Column(Float, nullable=True)

    # Lock-time payload: {order, polyline, legs, total_distance_km,
    # total_duration_s, simulated}. See app/services/route_optimizer.py.
    optimized_route = Column(_json_type(), nullable=True)

    # Live driver position for the consumer tracking page.
    driver_lat = Column(Float, nullable=True)
    driver_lng = Column(Float, nullable=True)
    driver_heading = Column(Float, nullable=True)
    driver_updated_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)