from sqlalchemy import Column, String, Float, DateTime
from datetime import datetime
from app.db import Base


class ContainerModel(Base):
    __tablename__ = "containers"

    id = Column(String(32), primary_key=True, index=True)
    container_number = Column(String(32), unique=True, index=True, nullable=False)
    iso_code = Column(String(16), default="40HC")
    status = Column(String(32), default="in_yard")  # in_yard, at_sea, dispatched, delivered
    location = Column(String(64), default="Yard Block B-12")
    weight_tons = Column(Float, default=24.5)
    cargo_type = Column(String(64), default="General Freight")
    seal_number = Column(String(32), default="SEAL-90812")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
