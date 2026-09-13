from fastapi import APIRouter, Query, Body, HTTPException
from typing import List, Optional, Dict, Any
import httpx
import os

router = APIRouter(prefix="/api", tags=["phase1-routing-traffic"])

CITIES_PRESETS = [
    {
        "id": "thoothukudi",
        "name": "Thoothukudi MMLP & VOC Port",
        "state": "Tamil Nadu",
        "country": "India",
        "center": [78.1348, 8.7642],
        "zoom": 13,
        "bbox": [78.08, 8.71, 78.20, 8.82],
        "description": "V.O. Chidambaranar Port & Multimodal Logistics Park corridor",
        "type": "mmlp",
        "defaultWaypoints": [
            {"label": "A", "name": "VOC Port Terminal Gate 1", "coordinates": [78.1750, 8.7520], "role": "origin"},
            {"label": "B", "name": "MMLP Inbound Container Yard", "coordinates": [78.1460, 8.7630], "role": "crossdock"},
            {"label": "C", "name": "Cold Storage & Agro Warehouse C3", "coordinates": [78.1320, 8.7710], "role": "checkpoint"},
            {"label": "D", "name": "Customs Clearance & Weighbridge #4", "coordinates": [78.1250, 8.7850], "role": "customs"},
            {"label": "E", "name": "NH-38 National Freight Highway Interchange", "coordinates": [78.0980, 8.7980], "role": "destination"}
        ]
    },
    {
        "id": "chennai",
        "name": "Chennai Port & Sriperumbudur MMLP",
        "state": "Tamil Nadu",
        "country": "India",
        "center": [80.2450, 13.0650],
        "zoom": 12,
        "bbox": [80.15, 12.95, 80.32, 13.15],
        "description": "Automotive & Electronics industrial multimodal freight expressway",
        "type": "mmlp",
        "defaultWaypoints": [
            {"label": "A", "name": "Chennai Port Container Terminal", "coordinates": [80.2980, 13.0920], "role": "origin"},
            {"label": "B", "name": "Ennore High Road Freight Junction", "coordinates": [80.2750, 13.1150], "role": "checkpoint"},
            {"label": "C", "name": "Sriperumbudur Auto Logistics Hub", "coordinates": [79.9450, 12.9680], "role": "crossdock"},
            {"label": "D", "name": "Oragadam Mega Industrial Park", "coordinates": [79.9120, 12.8350], "role": "destination"}
        ]
    },
    {
        "id": "mumbai",
        "name": "JNPT / Navi Mumbai Multi-Modal Hub",
        "state": "Maharashtra",
        "country": "India",
        "center": [72.9780, 18.9550],
        "zoom": 12,
        "bbox": [72.85, 18.85, 73.10, 19.10],
        "description": "India's premier container transshipment and freight corridor",
        "type": "port",
        "defaultWaypoints": [
            {"label": "A", "name": "JNPT Main Gate & Rail Yard", "coordinates": [72.9510, 18.9480], "role": "origin"},
            {"label": "B", "name": "Uran Container Freight Station", "coordinates": [72.9730, 18.9220], "role": "checkpoint"},
            {"label": "C", "name": "Dronagiri Logistics Park Zone 2", "coordinates": [72.9850, 18.9680], "role": "crossdock"},
            {"label": "D", "name": "Taloja MIDC Freight Terminal", "coordinates": [73.0950, 19.0850], "role": "destination"}
        ]
    },
    {
        "id": "bengaluru",
        "name": "Bengaluru ICD Whitefield & Logistics Park",
        "state": "Karnataka",
        "country": "India",
        "center": [77.7200, 12.9800],
        "zoom": 12,
        "bbox": [77.55, 12.85, 77.85, 13.10],
        "description": "Inland Container Depot (ICD) connecting Southern rail and highway corridors",
        "type": "icd",
        "defaultWaypoints": [
            {"label": "A", "name": "Whitefield Inland Container Depot (ICD)", "coordinates": [77.7480, 12.9890], "role": "origin"},
            {"label": "B", "name": "Hosakote Industrial Cross-Dock Hub", "coordinates": [77.7950, 13.0720], "role": "crossdock"},
            {"label": "C", "name": "Devanahalli Airport Cargo Gateway", "coordinates": [77.7120, 13.2050], "role": "destination"}
        ]
    },
    {
        "id": "delhi",
        "name": "Delhi NCR Multimodal Hub / Dadri ICD",
        "state": "Delhi NCR",
        "country": "India",
        "center": [77.5200, 28.5200],
        "zoom": 11,
        "bbox": [77.30, 28.30, 77.75, 28.75],
        "description": "Western Dedicated Freight Corridor (WDFC) nexus and mega logistics hub",
        "type": "icd",
        "defaultWaypoints": [
            {"label": "A", "name": "Dadri Integrated Logistics Hub", "coordinates": [77.5580, 28.5450], "role": "origin"},
            {"label": "B", "name": "Greater Noida Eastern Peripheral Expressway", "coordinates": [77.5020, 28.4680], "role": "checkpoint"},
            {"label": "C", "name": "Tughlakabad Inland Container Depot", "coordinates": [77.2910, 28.5120], "role": "destination"}
        ]
    },
    {
        "id": "mundra",
        "name": "Mundra Port & Special Economic Zone",
        "state": "Gujarat",
        "country": "India",
        "center": [69.7200, 22.8400],
        "zoom": 12,
        "bbox": [69.60, 22.75, 69.85, 22.95],
        "description": "Largest private commercial port & multi-product SEZ",
        "type": "port",
        "defaultWaypoints": [
            {"label": "A", "name": "Mundra Container Terminal 4", "coordinates": [69.7050, 22.8120], "role": "origin"},
            {"label": "B", "name": "Adani Logistics Park Yard B", "coordinates": [69.7350, 22.8480], "role": "crossdock"},
            {"label": "C", "name": "Mundra-Barmer Rail Freight Siding", "coordinates": [69.7620, 22.8950], "role": "destination"}
        ]
    }
]


@router.get("/cities")
def list_cities():
    """Returns list of supported multi-modal logistics hub cities."""
    return CITIES_PRESETS


@router.get("/geocode")
async def geocode_query(q: str = Query(..., min_length=2), bbox: Optional[str] = None):
    """Fast geocoding proxy using Photon (OSM-based global search)."""
    url = f"https://photon.komoot.io/api/?q={q}&limit=6"
    if bbox:
        try:
            parts = [float(x) for x in bbox.split(",")]
            if len(parts) == 4:
                lon = (parts[0] + parts[2]) / 2.0
                lat = (parts[1] + parts[3]) / 2.0
                url += f"&lat={lat}&lon={lon}"
        except Exception:
            pass

    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            res = await client.get(url)
            if res.status_code == 200:
                data = res.json()
                results = []
                for f in data.get("features", []):
                    props = f.get("properties", {})
                    coords = f.get("geometry", {}).get("coordinates", [])
                    results.append({
                        "name": props.get("name") or props.get("street") or q,
                        "city": props.get("city") or props.get("state") or props.get("district") or "",
                        "country": props.get("country") or "",
                        "coordinates": coords
                    })
                return results
        except Exception as e:
            return [{"name": q, "city": "Location", "country": "", "coordinates": [78.1348, 8.7642]}]

    return []


@router.post("/route")
async def calculate_route(payload: Dict[str, Any] = Body(...)):
    """
    Computes optimal multi-waypoint driving route (A, B, C, D, E points) using OSRM.
    Payload:
      coordinates: [[lon1, lat1], [lon2, lat2], ...]
      avoidRoadblocks: [[lon, lat], ...] (optional)
    """
    coords = payload.get("coordinates", [])
    if len(coords) < 2:
        raise HTTPException(status_code=400, detail="At least 2 points required")

    coords_str = ";".join([f"{c[0]:.6f},{c[1]:.6f}" for c in coords])
    osrm_url = f"https://router.project-osrm.org/route/v1/driving/{coords_str}?overview=full&geometries=geojson&steps=true&annotations=distance,duration"

    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            res = await client.get(osrm_url)
            if res.status_code == 200:
                data = res.json()
                if data.get("routes"):
                    r = data["routes"][0]
                    legs_out = []
                    for i, leg in enumerate(r.get("legs", [])):
                        steps_out = []
                        for s in leg.get("steps", []):
                            steps_out.append({
                                "instruction": s.get("name", "Proceed"),
                                "distance": s.get("distance", 0),
                                "duration": s.get("duration", 0),
                                "name": s.get("name", "Road")
                            })
                        legs_out.append({
                            "distance": leg.get("distance", 0),
                            "duration": leg.get("duration", 0),
                            "summary": leg.get("summary", f"Leg {i+1}"),
                            "steps": steps_out
                        })

                    return {
                        "coordinates": r["geometry"]["coordinates"],
                        "distanceMeters": r["distance"],
                        "durationSeconds": r["duration"],
                        "legs": legs_out
                    }
        except Exception as e:
            print(f"OSRM router error: {e}")

    # Fallback to straight-line interpolation
    straight_coords = []
    total_dist = 0
    for i in range(len(coords) - 1):
        p1 = coords[i]
        p2 = coords[i + 1]
        for step in range(21):
            straight_coords.append([
                p1[0] + (p2[0] - p1[0]) * (step / 20.0),
                p1[1] + (p2[1] - p1[1]) * (step / 20.0)
            ])
        dx = (p2[0] - p1[0]) * 111.32
        dy = (p2[1] - p1[1]) * 110.57
        total_dist += ((dx**2 + dy**2) ** 0.5) * 1000

    return {
        "coordinates": straight_coords,
        "distanceMeters": total_dist,
        "durationSeconds": (total_dist / 12) * 1.5,
        "legs": []
    }


@router.get("/traffic/incidents")
def get_traffic_incidents(city: str = Query("thoothukudi")):
    """Returns active road closures, construction zones, and traffic hotspots for a given city."""
    city_data = next((c for c in CITIES_PRESETS if c["id"] == city), CITIES_PRESETS[0])
    lon, lat = city_data["center"]

    incidents = [
        {
            "id": f"{city}-rb-1",
            "title": "Major Culvert & Flyover Road Construction",
            "type": "roadblock",
            "severity": "critical",
            "coordinates": [lon + 0.012, lat - 0.006],
            "roadName": "Port Access Arterial Road / Freight Bypass",
            "description": "Full lane closure due to crane installation and stormwater culvert overhaul. Detour recommended.",
            "delayMins": 24,
            "isBlockingRoute": True
        },
        {
            "id": f"{city}-cg-2",
            "title": "Heavy Peak Container Truck Congestion",
            "type": "congestion",
            "severity": "moderate",
            "coordinates": [lon - 0.015, lat + 0.014],
            "roadName": "Inbound Freight Corridor Express",
            "description": "Slow-moving queue approaching customs gate. Average speed reduced to 12 km/h.",
            "delayMins": 14,
            "isBlockingRoute": False
        },
        {
            "id": f"{city}-cs-3",
            "title": "Road Pavement Resurfacing & Barrier Works",
            "type": "construction",
            "severity": "moderate",
            "coordinates": [lon + 0.022, lat + 0.018],
            "roadName": "Logistics Park Ring Road North",
            "description": "Single lane open with flaggers. Expect minor queuing during heavy truck dispatch hours.",
            "delayMins": 8,
            "isBlockingRoute": False
        },
        {
            "id": f"{city}-ac-4",
            "title": "Disabled Heavy Trailer Incident",
            "type": "accident",
            "severity": "critical",
            "coordinates": [lon - 0.008, lat - 0.012],
            "roadName": "National Highway Freight Link #38",
            "description": "Mechanical breakdown blocking right lane. Heavy recovery vehicle on site.",
            "delayMins": 18,
            "isBlockingRoute": False
        }
    ]
    return {"city": city, "incidents": incidents, "count": len(incidents)}
