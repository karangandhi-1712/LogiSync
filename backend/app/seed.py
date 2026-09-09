"""Seed DB from data/seed/*.geojson (all rows tagged SIMULATED)."""
import json
import os
from .models import Gate, Warehouse, YardZone

SEED_DIR = os.environ.get("SEED_DIR", os.path.join(os.path.dirname(__file__), "..", "..", "data", "seed"))


def _load(name):
    candidates = [
        os.path.join(SEED_DIR, name),
        os.path.join(os.path.dirname(__file__), "..", "..", "data", "seed", name),
        os.path.join(os.getcwd(), "data", "seed", name),
    ]
    for p in candidates:
        if os.path.exists(p):
            with open(p) as f:
                return json.load(f)
    return {"features": []}


def seed(db):
    gates = _load("real_gates.geojson")
    if not gates.get("features"):
        gates = _load("gates.geojson")
    for feat in gates.get("features", []):
        props = feat["properties"]
        lon, lat = feat["geometry"]["coordinates"]
        if not db.get(Gate, props.get("id", "g1")):
            db.add(Gate(id=props.get("id", "g1"), name=props.get("name", "Gate"), latitude=lat,
                        longitude=lon, lanes=props.get("lanes", 2),
                        has_anpr=int(bool(props.get("has_anpr"))),
                        has_rfid=int(bool(props.get("has_rfid"))),
                        has_weighbridge=int(bool(props.get("has_weighbridge"))),
                        data_source=props.get("source", "SIMULATED"), status="SIMULATED"))

    whs = _load("real_warehouses.geojson")
    if not whs.get("features"):
        whs = _load("warehouses.geojson")
    for feat in whs.get("features", []):
        props = feat["properties"]
        if not db.get(Warehouse, str(props.get("id", "w1"))):
            db.add(Warehouse(id=str(props.get("id", "w1")), name=props.get("name", "Warehouse"),
                             capacity_pallets=props.get("capacity_pallets_estimated", 0),
                             occupancy_pct=props.get("occupancy_pct_simulated", 0.0),
                             geojson=feat["geometry"],
                             data_source=props.get("source", "SIMULATED"), status="SIMULATED"))

    yards = _load("real_yards.geojson")
    if not yards.get("features"):
        yards = _load("yards.geojson")
    for feat in yards.get("features", []):
        props = feat["properties"]
        if not db.get(YardZone, str(props.get("id", "y1"))):
            db.add(YardZone(id=str(props.get("id", "y1")), name=props.get("name", "Yard"),
                            slots_total=props.get("slots_total_estimated", 0),
                            slots_occupied=props.get("slots_occupied_simulated", 0),
                            geojson=feat["geometry"],
                            data_source=props.get("source", "SIMULATED"), status="SIMULATED"))
    db.commit()
