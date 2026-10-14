import uuid
from sqlalchemy import Column, String, Float, DateTime
from datetime import datetime
from app.db import Base


def _uuid():
    return str(uuid.uuid4())


class PortModel(Base):
    """A cargo depot that delivery requests originate from.

    The 12 seeded rows mirror the PORTS registry in app/ports.py. The table is
    the FK target for delivery_requests.pickup_port_id and
    delivery_schedules.port_id; app/ports.py stays the source of geometry.
    """

    __tablename__ = "ports"

    id = Column(String(32), primary_key=True, default=_uuid)
    code = Column(String(16), nullable=True, index=True)
    name = Column(String(128), nullable=False)
    short = Column(String(64), nullable=True)
    city = Column(String(64), nullable=True)
    state = Column(String(64), nullable=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    zoom = Column(Float, default=12.0)
    corridor = Column(String(128), nullable=True)
    orientation = Column(String(16), nullable=True)
    is_active = Column(String(8), nullable=False, default="true")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)