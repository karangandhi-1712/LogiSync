from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import List, Optional, Tuple
from app.services.google_maps import google_maps_service
from app.dependencies import get_current_user

router = APIRouter(prefix="/maps", tags=["Google Maps Proxy"])


class DirectionsRequest(BaseModel):
    waypoints: List[List[float]]  # List of [lat, lng]
    travelMode: Optional[str] = "DRIVING"


@router.post("/directions")
async def get_directions(req: DirectionsRequest):
    """
    Proxies Google Directions API with server-side key protection.
    Calculates traffic-aware paths through Thoothukudi logistics corridors.
    """
    if len(req.waypoints) < 2:
        return {"error": "At least 2 waypoints required"}

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


@router.post("/distance-matrix")
async def distance_matrix(origins: List[str], destinations: List[str]):
    """Proxies Google Distance Matrix API for multi-gate ETA comparison."""
    data = await google_maps_service.distance_matrix(origins, destinations)
    return data
