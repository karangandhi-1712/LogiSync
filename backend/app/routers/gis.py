from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Any, List, Optional
from app.dependencies import get_current_user
from app.ports import (
    PORTS, DEFAULT_PORT_ID, is_valid_port,
    port_gate_coords, port_gate_status, port_geofence, port_zones,
)

router = APIRouter(prefix="/gis", tags=["GIS & Terminal Polygons"], dependencies=[Depends(get_current_user)])

VOC_PORT_BOUNDARIES = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {"name": "VOC Port Main Outer Geofence", "type": "boundary"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [78.1812, 8.7495], [78.1895, 8.7420], [78.1960, 8.7480],
                    [78.1930, 8.7620], [78.1820, 8.7660], [78.1740, 8.7580],
                    [78.1812, 8.7495]
                ]]
            }
        },
        {
            "type": "Feature",
            "properties": {"name": "Container Terminal Zone (DBT)", "type": "yard"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [78.1830, 8.7510], [78.1870, 8.7480], [78.1910, 8.7520],
                    [78.1870, 8.7550], [78.1830, 8.7510]
                ]]
            }
        },
        {
            "type": "Feature",
            "properties": {"name": "Coal & Bulk Cargo Berth", "type": "yard"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [78.1870, 8.7560], [78.1920, 8.7540], [78.1940, 8.7590],
                    [78.1890, 8.7610], [78.1870, 8.7560]
                ]]
            }
        },
        {
            "type": "Feature",
            "properties": {"name": "Gate 1 - Bulk Cargo Entry", "type": "gate"},
            "geometry": {"type": "Point", "coordinates": [78.1795, 8.7525]}
        },
        {
            "type": "Feature",
            "properties": {"name": "Gate 2 - General Freight Entry", "type": "gate"},
            "geometry": {"type": "Point", "coordinates": [78.1815, 8.7540]}
        },
        {
            "type": "Feature",
            "properties": {"name": "Gate 3 - Container Terminal (Smart Gate)", "type": "gate"},
            "geometry": {"type": "Point", "coordinates": [78.1835, 8.7558]}
        },
        {
            "type": "Feature",
            "properties": {"name": "Gate 4 - Express Green Corridor / Rail", "type": "gate"},
            "geometry": {"type": "Point", "coordinates": [78.1850, 8.7575]}
        }
    ]
}


VOC_PORT_GATES = [
    {
        "id": "G-01",
        "gate_id": "Gate 1 (Bulk)",
        "name": "Gate 1 - Bulk Cargo Entry",
        "type": "bulk",
        "status": "HOLD",
        "queue_count": 8,
        "avg_wait_min": 24,
        "coordinates": [78.1795, 8.7525],
        "lat": 8.7525,
        "lng": 78.1795
    },
    {
        "id": "G-02",
        "gate_id": "Gate 2 (General)",
        "name": "Gate 2 - General Freight Entry",
        "type": "general",
        "status": "NORMAL",
        "queue_count": 6,
        "avg_wait_min": 14,
        "coordinates": [78.1815, 8.7540],
        "lat": 8.7540,
        "lng": 78.1815
    },
    {
        "id": "G-03",
        "gate_id": "Gate 3 (Container/Reefer)",
        "name": "Gate 3 - Container Terminal (Smart Gate)",
        "type": "container",
        "status": "FAST-PASS",
        "queue_count": 2,
        "avg_wait_min": 5,
        "coordinates": [78.1835, 8.7558],
        "lat": 8.7558,
        "lng": 78.1835
    },
    {
        "id": "G-04",
        "gate_id": "Gate 4 (Express Rail)",
        "name": "Gate 4 - Express Green Corridor / Rail",
        "type": "express",
        "status": "MODERATE",
        "queue_count": 9,
        "avg_wait_min": 18,
        "coordinates": [78.1850, 8.7575],
        "lat": 8.7575,
        "lng": 78.1850
    }
]


def _require_port(port: Optional[str]) -> str:
    port_id = port or DEFAULT_PORT_ID
    if not is_valid_port(port_id):
        raise HTTPException(status_code=400, detail=f"Unknown port '{port_id}'")
    return port_id


def build_port_layers(port_id: str) -> Dict[str, Any]:
    """GeoJSON layers for any port. VOC returns the legacy hand-mapped payload."""
    if port_id == DEFAULT_PORT_ID:
        return VOC_PORT_BOUNDARIES
    p = PORTS[port_id]
    fence = port_geofence(port_id)
    zones = port_zones(port_id)
    gates = port_gate_coords(port_id)
    features: List[Dict[str, Any]] = [
        {
            "type": "Feature",
            "properties": {"name": f"{p['short']} Main Outer Geofence", "type": "boundary"},
            "geometry": {"type": "Polygon", "coordinates": [[[lng, lat] for lat, lng in fence] + [[fence[0][1], fence[0][0]]]]},
        }
    ]
    for z in zones:
        coords = z["coords"]
        features.append({
            "type": "Feature",
            "properties": {"name": z["label"], "type": "yard"},
            "geometry": {"type": "Polygon", "coordinates": [[[lng, lat] for lat, lng in coords] + [[coords[0][1], coords[0][0]]]]},
        })
    for i, (lat, lng) in enumerate(gates):
        features.append({
            "type": "Feature",
            "properties": {"name": f"Gate {i + 1} - {p['gates'][i]}", "type": "gate"},
            "geometry": {"type": "Point", "coordinates": [lng, lat]},
        })
    return {"type": "FeatureCollection", "features": features}


def build_port_gates(port_id: str) -> List[Dict[str, Any]]:
    """Gate list for any port. VOC returns the legacy hand-mapped payload."""
    if port_id == DEFAULT_PORT_ID:
        return VOC_PORT_GATES
    p = PORTS[port_id]
    result = []
    for i, (lat, lng) in enumerate(port_gate_coords(port_id)):
        st = port_gate_status(port_id, i)
        result.append({
            "id": f"G-0{i + 1}",
            "gate_id": p["gates"][i],
            "name": f"Gate {i + 1} - {p['gates'][i]}",
            "type": ["bulk", "general", "container", "express"][i],
            "status": st["status"],
            "queue_count": st["queue_count"],
            "avg_wait_min": st["avg_wait_min"],
            "coordinates": [lng, lat],
            "lat": lat,
            "lng": lng,
        })
    return result


@router.get("/layers")
def get_gis_layers(port: Optional[str] = Query(None, description="Port id (e.g. voc, vizag)")):
    """Returns terminal boundaries, gates, and operational zones for a port."""
    return build_port_layers(_require_port(port))


@router.get("/gates")
def get_gis_gates(port: Optional[str] = Query(None, description="Port id (e.g. voc, vizag)")):
    """List all four gates with current queue count, status, wait time, and coordinates."""
    return build_port_gates(_require_port(port))

