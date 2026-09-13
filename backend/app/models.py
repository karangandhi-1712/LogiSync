"""Thoothukudi MMLP Digital Twin Models (Phases 1 - 6).

Covers spatial GIS assets, operational entities (Trucks, Containers, Equipment, Gate Passes),
Digital Twin state tracking, discrete event simulation logs, and optimization schedules.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, JSON, Boolean, DateTime
from sqlalchemy.orm import declarative_base

Base = declarative_base()

DATA_SOURCE_REAL_OSM = "REAL_OSM"
DATA_SOURCE_SIMULATED = "SIMULATED"
DATA_SOURCE_TELEMETRY = "LIVE_TELEMETRY"


# ---------------------------------------------------------------------------
# Phase 1 & 2: GIS Spatial Infrastructure Models (with 3D Attributes)
# ---------------------------------------------------------------------------

class Gate(Base):
    __tablename__ = "gates"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    gate_type = Column(String, default="MAIN_INBOUND") # MAIN_INBOUND, MAIN_OUTBOUND, RAIL_GATE, PORT_GATE
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    lanes = Column(Integer, default=2)
    has_anpr = Column(Integer, default=1)
    has_rfid = Column(Integer, default=1)
    has_weighbridge = Column(Integer, default=1)
    weighbridge_capacity_tonnes = Column(Float, default=80.0)
    current_queue_count = Column(Integer, default=0)
    data_source = Column(String, default=DATA_SOURCE_REAL_OSM)
    status = Column(String, default="OPERATIONAL")


class Warehouse(Base):
    __tablename__ = "warehouses"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    category = Column(String, default="DRY_STORAGE") # DRY_STORAGE, COLD_CHAIN, CROSS_DOCK, HAZMAT_BONDED
    height_m = Column(Float, default=14.0) # 3D building extrusion height
    capacity_pallets = Column(Integer, default=15000)
    occupancy_pct = Column(Float, default=68.5)
    dock_doors = Column(Integer, default=12)
    active_dock_doors = Column(Integer, default=5)
    geojson = Column(JSON, default=dict)
    data_source = Column(String, default=DATA_SOURCE_REAL_OSM)
    status = Column(String, default="OPERATIONAL")


class YardZone(Base):
    __tablename__ = "yard_zones"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    zone_type = Column(String, default="CONTAINER_DRY") # CONTAINER_DRY, REEFER_REEF, HAZMAT_ISOLATION, RAIL_INTERMODAL
    height_m = Column(Float, default=12.5) # Max stacking height in meters (approx 4-5 tiers)
    slots_total = Column(Integer, default=1200) # Total TEU capacity
    slots_occupied = Column(Integer, default=740)
    bays = Column(Integer, default=12)
    rows = Column(Integer, default=6)
    max_tiers = Column(Integer, default=5)
    geojson = Column(JSON, default=dict)
    data_source = Column(String, default=DATA_SOURCE_REAL_OSM)
    status = Column(String, default="OPERATIONAL")


# ---------------------------------------------------------------------------
# Phase 3: Operational Fleet, Cargo & Equipment Entities
# ---------------------------------------------------------------------------

class Truck(Base):
    __tablename__ = "trucks"
    id = Column(String, primary_key=True)
    license_plate = Column(String, nullable=False)
    carrier = Column(String, default="MMLP Logistics Express")
    driver_name = Column(String, default="K. Ramanathan")
    driver_phone = Column(String, default="+91 98401 23456")
    truck_type = Column(String, default="PRIME_MOVER_40FT") # PRIME_MOVER_20FT, PRIME_MOVER_40FT, MULTI_AXLE, EV_TERMINAL_AGV
    status = Column(String, default="INBOUND_TRANSIT") 
    # Status lifecycle: INBOUND_TRANSIT -> GATE_QUEUED -> WEIGHBRIDGE_MEASURING -> MOVING_TO_YARD -> YARD_STACKING -> WAREHOUSE_DOCK -> OUTBOUND_QUEUED -> DEPARTED
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    heading = Column(Float, default=0.0)
    speed_kmh = Column(Float, default=0.0)
    fuel_or_battery_pct = Column(Float, default=85.0)
    assigned_task = Column(String, default="CONTAINER_UNLOAD_YARD_A")
    current_container_id = Column(String, nullable=True)
    destination_node = Column(String, default="YARD_BLOCK_A")
    eta_minutes = Column(Float, default=12.0)
    scheduled_appointment = Column(DateTime, default=datetime.utcnow)
    data_source = Column(String, default=DATA_SOURCE_TELEMETRY)


class Container(Base):
    __tablename__ = "containers"
    id = Column(String, primary_key=True)
    container_no = Column(String, nullable=False) # e.g. MSKU-749210-4
    iso_type = Column(String, default="40HC") # 20GP, 40HC, 40RF (Reefer), 20HZ (Hazmat), 45HC
    cargo_type = Column(String, default="GENERAL_CARGO") # GENERAL_CARGO, AUTO_PARTS, SEAFOOD_COLD_CHAIN, CHEMICALS_HAZMAT, TEXTILES
    gross_weight_tonnes = Column(Float, default=24.5)
    tare_weight_tonnes = Column(Float, default=3.8)
    seal_number = Column(String, default="SL-998234")
    status = Column(String, default="AT_YARD_STACK") # IN_TRANSIT, AT_YARD_STACK, LOADED_ON_TRUCK, IN_WAREHOUSE, LOADED_ON_RAIL, GATE_INSPECTED
    yard_block_id = Column(String, default="YARD_BLOCK_A")
    bay = Column(Integer, default=3)
    row = Column(Integer, default=2)
    tier = Column(Integer, default=1) # 1 (bottom) to 5 (top)
    assigned_truck_id = Column(String, nullable=True)
    assigned_equipment_id = Column(String, nullable=True)
    dwell_hours = Column(Float, default=18.4)
    export_cutoff_time = Column(DateTime, default=datetime.utcnow)
    hazmat_class = Column(String, nullable=True) # None or "CLASS_3_FLAMMABLE", "CLASS_8_CORROSIVE"
    temperature_celsius = Column(Float, nullable=True) # for Reefer
    data_source = Column(String, default=DATA_SOURCE_SIMULATED)


class Equipment(Base):
    __tablename__ = "equipment"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    equipment_type = Column(String, default="RTG_CRANE") # RTG_CRANE, REACH_STACKER, RMG_RAIL_CRANE, TERMINAL_AGV, FORKLIFT
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    heading = Column(Float, default=90.0)
    status = Column(String, default="IDLE") # IDLE, LIFTING, MOVING, MAINTENANCE, CHARGING
    current_job_id = Column(String, nullable=True)
    moves_completed_today = Column(Integer, default=42)
    fuel_efficiency_teu_per_hr = Column(Float, default=26.4)
    data_source = Column(String, default=DATA_SOURCE_TELEMETRY)


class GatePass(Base):
    __tablename__ = "gate_passes"
    id = Column(String, primary_key=True)
    pass_number = Column(String, nullable=False) # e.g. GP-2026-09-0012
    truck_id = Column(String, nullable=False)
    container_id = Column(String, nullable=True)
    driver_name = Column(String, nullable=False)
    pass_type = Column(String, default="INBOUND_IMPORT") # INBOUND_IMPORT, OUTBOUND_EXPORT, EMPTY_RETURN, INTERMODAL_RAIL
    appointment_window_start = Column(DateTime, default=datetime.utcnow)
    appointment_window_end = Column(DateTime, default=datetime.utcnow)
    gate_lane_id = Column(String, default="GATE_LANE_01")
    status = Column(String, default="SCHEDULED") # SCHEDULED, CHECKED_IN, WEIGHBRIDGE_VERIFIED, OCR_CLEARED, COMPLETED, REJECTED
    booked_weight_tonnes = Column(Float, default=24.5)
    measured_weight_tonnes = Column(Float, nullable=True)
    weighbridge_discrepancy_flag = Column(Boolean, default=False)
    data_source = Column(String, default=DATA_SOURCE_SIMULATED)


class MultimodalSchedule(Base):
    __tablename__ = "multimodal_schedules"
    id = Column(String, primary_key=True)
    manifest_no = Column(String, nullable=False)
    mode_type = Column(String, default="CONTAINER_TRAIN_RAKE") # VESSEL_VOC_PORT, CONTAINER_TRAIN_RAKE
    carrier_name = Column(String, default="CONCOR Southern Express / Port Line")
    terminal_location = Column(String, default="MMLP_RAIL_SIDING_01")
    scheduled_arrival = Column(DateTime, default=datetime.utcnow)
    scheduled_departure = Column(DateTime, default=datetime.utcnow)
    total_teu = Column(Integer, default=90)
    teu_handled = Column(Integer, default=35)
    status = Column(String, default="IN_OPERATION") # SCHEDULED, BERTHED, IN_OPERATION, COMPLETED
    data_source = Column(String, default=DATA_SOURCE_SIMULATED)
