"""Phase 1 entity + GIS layer models.

Every row carries `data_source` so SIMULATED/ESTIMATED values are never
presented as surveyed infrastructure. Honest status labels:
IMPLEMENTED = real working code, SIMULATED = demo placeholder data.
"""
from sqlalchemy import Column, Integer, String, Float, JSON
from sqlalchemy.orm import declarative_base

Base = declarative_base()

DATA_SOURCE_SIMULATED = "SIMULATED"


class Gate(Base):
    __tablename__ = "gates"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    lanes = Column(Integer, default=2)
    has_anpr = Column(Integer, default=0)
    has_rfid = Column(Integer, default=0)
    has_weighbridge = Column(Integer, default=0)
    data_source = Column(String, default=DATA_SOURCE_SIMULATED)  # SIMULATED
    status = Column(String, default="SIMULATED")


class Warehouse(Base):
    __tablename__ = "warehouses"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    capacity_pallets = Column(Integer, default=0)
    occupancy_pct = Column(Float, default=0.0)
    geojson = Column(JSON, default=dict)
    data_source = Column(String, default=DATA_SOURCE_SIMULATED)
    status = Column(String, default="SIMULATED")


class YardZone(Base):
    __tablename__ = "yard_zones"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    slots_total = Column(Integer, default=0)
    slots_occupied = Column(Integer, default=0)
    geojson = Column(JSON, default=dict)
    data_source = Column(String, default=DATA_SOURCE_SIMULATED)
    status = Column(String, default="SIMULATED")
