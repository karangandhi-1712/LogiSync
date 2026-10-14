"""Map + routing endpoints.

Google Maps is gone: the frontend has always rendered with Leaflet + Geoapify,
and `google_maps.py` only ever fed proxy endpoints nothing called. What remains
is the single-leg road geometry helper the UI uses when a batch has no locked
route yet, plus geocoding/autocomplete backed by the same Geoapify key.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.dependencies import get_current_user
from app.services import geocoding
from app.services.routing import routing_service

router = APIRouter(
    prefix="/maps",
    tags=["Maps (Geoapify)"],
    dependencies=[Depends(get_current_user)],
)


class DirectionsRequest(BaseModel):
    waypoints: List[List[float]]  # [lat, lng] pairs
    mode: Optional[str] = "drive"


@router.get("/route")
async def get_route(
    from_lat: float = Query(..., ge=-90, le=90),
    from_lng: float = Query(..., ge=-180, le=180),
    to_lat: float = Query(..., ge=-90, le=90),
    to_lng: float = Query(..., ge=-180, le=180),
    mode: str = Query("drive"),
):
    """GeoJSON LineString for one road leg.

    Used by the UI when rendering a batch whose route has not been optimised at
    lock time. Falls back to a straight connector flagged `simulated: true`.
    """
    if mode not in ("drive", "truck", "walk"):
        raise HTTPException(status_code=422, detail="mode must be drive, truck, or walk")
    return await routing_service.get_route(from_lat, from_lng, to_lat, to_lng, mode)


@router.get("/geocode")
async def geocode(
    address: str = Query(..., description="Free-text address"),
    port_id: Optional[str] = Query(None, description="Depot used for the fallback point"),
):
    """Resolve an address to coordinates near a depot. Never 500s."""
    return await geocoding.geocode_address(address, port_id or "voc")


@router.get("/autocomplete")
async def autocomplete(
    input: str = Query(..., description="Query string"),
    port_id: Optional[str] = Query(None),
    limit: int = Query(6, ge=1, le=10),
):
    """Geoapify address autocomplete for the delivery-address field."""
    return {"predictions": await geocoding.autocomplete(input, port_id, limit)}