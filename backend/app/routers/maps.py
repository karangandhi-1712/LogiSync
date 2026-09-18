from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Tuple
from app.services.google_maps import google_maps_service
from app.services.routing import routing_service
from app.dependencies import get_current_user

router = APIRouter(prefix="/maps", tags=["Maps Proxy (Geoapify/Leaflet + server fallback)"], dependencies=[Depends(get_current_user)])


class DirectionsRequest(BaseModel):
    waypoints: List[List[float]]  # List of [lat, lng]
    travelMode: Optional[str] = "DRIVING"


class DistanceMatrixRequest(BaseModel):
    origins: List[str] = Field(..., min_length=1)
    destinations: List[str] = Field(..., min_length=1)


@router.post("/directions")
async def get_directions(req: DirectionsRequest):
    """
    Server-side directions proxy with static Thoothukudi fallback when no key.
    Frontend map itself is Leaflet + Geoapify (free tier).
    """
    if len(req.waypoints) < 2:
        raise HTTPException(status_code=400, detail="At least 2 waypoints required")

    origin = f"{req.waypoints[0][0]},{req.waypoints[0][1]}"
    destination = f"{req.waypoints[-1][0]},{req.waypoints[-1][1]}"
    via = [f"{pt[0]},{pt[1]}" for pt in req.waypoints[1:-1]]

    data = await google_maps_service.get_directions(
        origin=origin,
        destination=destination,
        waypoints=via if via else None,
        mode=req.travelMode.lower() if req.travelMode else "driving"
    )
    return data


@router.get("/geocode")
async def geocode(address: str = Query(..., description="Location name or address")):
    """Proxies Google Geocoding API to resolve coordinates."""
    data = await google_maps_service.geocode(address)
    return data


@router.get("/places/autocomplete")
async def autocomplete(input: str = Query(..., description="Query string for place search")):
    """Proxies Google Places Autocomplete for port terminals and addresses."""
    data = await google_maps_service.autocomplete_places(input)
    return data


@router.get("/places/{place_id}")
async def get_place_details(place_id: str):
    """Place detail lookup with simulated fallback when no API key."""
    # Lookup simulated places
    place_mock_data = {
        "voc_pct_1": {
            "place_id": "voc_pct_1",
            "name": "VOC Port Container Terminal (DBT)",
            "address": "Harbour Estate, Thoothukudi, Tamil Nadu 628004",
            "lat": 8.7510,
            "lng": 78.1830
        },
        "icd_madurai": {
            "place_id": "icd_madurai",
            "name": "Madurai Inland Container Depot (CONCOR)",
            "address": "Kappalur Industrial Area, Madurai, Tamil Nadu 625008",
            "lat": 9.8720,
            "lng": 78.0410
        },
        "sipcot_thoo": {
            "place_id": "sipcot_thoo",
            "name": "SIPCOT Logistics Yard Thoothukudi",
            "address": "Madurai-Thoothukudi Highway, Thoothukudi 628008",
            "lat": 8.8050,
            "lng": 78.1250
        }
    }

    if place_id in place_mock_data:
        return place_mock_data[place_id]

    return {
        "place_id": place_id,
        "name": f"Terminal Location ({place_id})",
        "address": "VOC Port Maritime Logistics Zone, Thoothukudi",
        "lat": 8.7642,
        "lng": 78.1348
    }


@router.post("/distance-matrix")
async def distance_matrix(req: DistanceMatrixRequest):
    """Distance/ETA matrix for multi-gate comparison. Accepts JSON body {origins, destinations}."""
    data = await google_maps_service.distance_matrix(req.origins, req.destinations)
    return data


@router.get("/route")
async def get_route(
    from_lat: float = Query(..., ge=-90, le=90),
    from_lng: float = Query(..., ge=-180, le=180),
    to_lat: float = Query(..., ge=-90, le=90),
    to_lng: float = Query(..., ge=-180, le=180),
    mode: str = Query("drive"),
):
    """True road geometry (GeoJSON) for one leg, e.g. truck → destination gate.

    Falls back to a straight connector flagged `"simulated": true` when the
    routing provider is unavailable — the UI renders that dashed + labeled.
    """
    if mode not in ("drive", "truck", "walk"):
        raise HTTPException(status_code=422, detail="mode must be drive, truck, or walk")
    return await routing_service.get_route(from_lat, from_lng, to_lat, to_lng, mode)
