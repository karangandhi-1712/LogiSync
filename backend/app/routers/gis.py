from fastapi import APIRouter
from typing import Dict, Any, List

router = APIRouter(prefix="/gis", tags=["GIS & Terminal Polygons"])

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


@router.get("/layers")
def get_gis_layers():
    """Returns VOC Port terminal boundaries, gates, and operational zones."""
    return VOC_PORT_BOUNDARIES
