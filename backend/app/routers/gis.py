import json
import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Gate, Warehouse, YardZone

router = APIRouter(prefix="/api", tags=["phase1-gis"])

SEED_DIR = os.environ.get("SEED_DIR", os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "seed"))


def _seed_file(name):
    for p in [os.path.join(SEED_DIR, name),
              os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "seed", name),
              os.path.join(os.getcwd(), "data", "seed", name)]:
        if os.path.exists(p):
            with open(p) as f:
                return json.load(f)
    return None


def _fallback(collection_name, file_names):
    """Serve seed GeoJSON directly when DB is empty/unreachable."""
    if isinstance(file_names, str):
        file_names = [file_names]
    for name in file_names:
        data = _seed_file(name)
        if data and data.get("features"):
            return data
    if data:
        return data
    return {"type": "FeatureCollection", "data_source": "SIMULATED",
            "status": "SIMULATED", "features": [], "note": f"{collection_name} unavailable"}


@router.get("/gates")
def list_gates(db: Session = Depends(get_db)):
    try:
        rows = db.query(Gate).all()
    except Exception:
        return _fallback("gates", ["real_gates.geojson", "gates.geojson"])
    if not rows:
        return _fallback("gates", ["real_gates.geojson", "gates.geojson"])
    return {"type": "FeatureCollection", "data_source": "SIMULATED", "status": "SIMULATED",
            "features": [{"type": "Feature",
                          "properties": {"id": g.id, "name": g.name, "lanes": g.lanes,
                                         "has_anpr": bool(g.has_anpr), "has_rfid": bool(g.has_rfid),
                                         "has_weighbridge": bool(g.has_weighbridge),
                                         "data_source": g.data_source, "status": g.status},
                          "geometry": {"type": "Point", "coordinates": [g.longitude, g.latitude]}}
                         for g in rows]}


@router.get("/warehouses")
def list_warehouses(db: Session = Depends(get_db)):
    try:
        rows = db.query(Warehouse).all()
    except Exception:
        return _fallback("warehouses", ["real_warehouses.geojson", "warehouses.geojson"])
    if not rows:
        return _fallback("warehouses", ["real_warehouses.geojson", "warehouses.geojson"])
    return {"type": "FeatureCollection", "data_source": "SIMULATED", "status": "SIMULATED",
            "features": [{"type": "Feature",
                          "properties": {"id": w.id, "name": w.name,
                                         "capacity_pallets_estimated": w.capacity_pallets,
                                         "occupancy_pct_simulated": w.occupancy_pct,
                                         "data_source": w.data_source, "status": w.status},
                          "geometry": w.geojson} for w in rows]}


@router.get("/yards")
def list_yards(db: Session = Depends(get_db)):
    try:
        rows = db.query(YardZone).all()
    except Exception:
        return _fallback("yards", ["real_yards.geojson", "yards.geojson"])
    if not rows:
        return _fallback("yards", ["real_yards.geojson", "yards.geojson"])
    return {"type": "FeatureCollection", "data_source": "SIMULATED", "status": "SIMULATED",
            "features": [{"type": "Feature",
                          "properties": {"id": y.id, "name": y.name,
                                         "slots_total_estimated": y.slots_total,
                                         "slots_occupied_simulated": y.slots_occupied,
                                         "data_source": y.data_source, "status": y.status},
                          "geometry": y.geojson} for y in rows]}


@router.get("/roads")
def list_roads():
    return _fallback("roads", ["real_roads.geojson", "roads.geojson"])


@router.get("/mmlp/boundary")
def mmlp_boundary():
    data = _seed_file("mmlp_boundary.geojson")
    return data or _fallback("boundary", "mmlp_boundary.geojson")


@router.get("/kpis")
def kpis(db: Session = Depends(get_db)):
    """IMPLEMENTED (computed from SIMULATED seed data)."""
    try:
        gates = db.query(Gate).count()
        whs = db.query(Warehouse).all()
        yards = db.query(YardZone).all()
    except Exception:
        gates, whs, yards = 0, [], []
    return {
        "gates": gates,
        "warehouses": len(whs),
        "yard_zones": len(yards),
        "yard_occupancy_pct_simulated": round(
            sum(y.slots_occupied for y in yards) / max(1, sum(y.slots_total for y in yards)) * 100, 1
        ) if yards else 0.0,
        "data_source": "SIMULATED",
        "implementation_status": "IMPLEMENTED",
    }
