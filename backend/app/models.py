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


class Truck(Base):
    __tablename__ = "trucks"
    id = Column(String, primary_key=True)
    plate_number = Column(String, nullable=False)
    city_id = Column(String, default="thoothukudi")
    carrier = Column(String, default="MMLP Express Logistics")
    truck_type = Column(String, default="container_chassis") # container_chassis, reefer, flatbed, hazmat
    status = Column(String, default="inbound") # inbound, at_gate, in_yard, loading, outbound, in_transit
    driver_name = Column(String, default="Rajesh Kumar")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed_kmh = Column(Float, default=0.0)
    heading = Column(Float, default=0.0)
    fuel_pct = Column(Float, default=85.0)
    temperature_c = Column(Float, default=4.0) # for reefer cold-chain
    assigned_mission = Column(String, default="Terminal Container Transfer")
    data_source = Column(String, default=DATA_SOURCE_SIMULATED)


class Container(Base):
    __tablename__ = "containers"
    id = Column(String, primary_key=True)
    container_number = Column(String, nullable=False)
    city_id = Column(String, default="thoothukudi")
    iso_size = Column(String, default="40ft_HC") # 20ft, 40ft, 40ft_HC, reefer
    gross_weight_tonnes = Column(Float, default=24.5)
    contents = Column(String, default="Automotive Assemblies & Precision Parts")
    yard_zone_id = Column(String, default="YD-01")
    tier = Column(Integer, default=2) # 1 to 4
    dwell_hours = Column(Float, default=14.5)
    customs_status = Column(String, default="cleared") # cleared, inspection_required, hold
    data_source = Column(String, default=DATA_SOURCE_SIMULATED)


class Shipment(Base):
    __tablename__ = "shipments"
    id = Column(String, primary_key=True)
    tracking_code = Column(String, nullable=False)
    city_id = Column(String, default="thoothukudi")
    origin_name = Column(String, default="VOC Port Terminal Gate 1")
    destination_name = Column(String, default="NH-38 National Freight Highway Interchange")
    status = Column(String, default="in_transit") # scheduled, in_transit, customs_hold, delivered
    eta_minutes = Column(Integer, default=25)
    priority = Column(String, default="standard") # standard, express, critical
    weight_tonnes = Column(Float, default=18.2)
    assigned_truck_id = Column(String, nullable=True)
    data_source = Column(String, default=DATA_SOURCE_SIMULATED)

