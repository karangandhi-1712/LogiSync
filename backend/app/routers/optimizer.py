"""
Phase 5-6: Route Optimization API Router.
Exposes ML-powered truck-profile-aware route optimization and truck profiles.
"""

from fastapi import APIRouter, Body, HTTPException
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from ..ml.route_optimizer import optimize_route, FuelConsumptionModel
from ..ml.truck_profiles import get_all_profiles, get_truck_profile, estimate_fuel_rate

router = APIRouter(prefix="/api", tags=["phase5-optimizer"])


# ==================== SCHEMAS ====================

class OptimizeRouteRequest(BaseModel):
    coordinates: List[List[float]] = Field(
        ..., description="List of [lon, lat] coordinate pairs for each waypoint"
    )
    waypoint_names: List[str] = Field(
        ..., description="Human-readable name for each waypoint"
    )
    truck_type: str = Field(
        default="container_chassis",
        description="Truck profile ID: container_chassis, reefer, flatbed, tanker, mini_truck, heavy_trailer"
    )
    payload_tonnes: float = Field(
        default=15.0, ge=0, le=55,
        description="Cargo payload weight in metric tonnes"
    )
    optimization_mode: str = Field(
        default="balanced",
        description="Optimization objective: fuel_efficient, time_efficient, or balanced"
    )
    fix_origin: bool = Field(
        default=True,
        description="If true, first waypoint stays as origin"
    )
    fix_destination: bool = Field(
        default=True,
        description="If true, last waypoint stays as destination"
    )


class FuelEstimateRequest(BaseModel):
    truck_type: str = "container_chassis"
    payload_tonnes: float = Field(default=15.0, ge=0, le=55)
    distance_km: float = Field(default=100.0, ge=0)
    avg_speed_kmh: Optional[float] = None


# ==================== ENDPOINTS ====================

@router.post("/optimize-route")
async def api_optimize_route(req: OptimizeRouteRequest):
    """
    Run ML-powered multi-stop route optimization using Genetic Algorithm.

    Accepts waypoints, truck type, payload weight, and optimization preference.
    Returns optimized waypoint order with fuel, time, CO2, and cost estimates,
    plus comparison against the original route.
    """
    if len(req.coordinates) < 2:
        raise HTTPException(status_code=400, detail="At least 2 waypoints required")

    if len(req.coordinates) != len(req.waypoint_names):
        raise HTTPException(
            status_code=400,
            detail="coordinates and waypoint_names must have the same length"
        )

    valid_modes = {"fuel_efficient", "time_efficient", "balanced"}
    if req.optimization_mode not in valid_modes:
        raise HTTPException(
            status_code=400,
            detail=f"optimization_mode must be one of: {valid_modes}"
        )

    try:
        coords = [tuple(c) for c in req.coordinates]
        result = optimize_route(
            coordinates=coords,
            waypoint_names=req.waypoint_names,
            truck_type=req.truck_type,
            payload_tonnes=req.payload_tonnes,
            mode=req.optimization_mode,
            fix_origin=req.fix_origin,
            fix_destination=req.fix_destination,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")


@router.get("/truck-profiles")
async def api_truck_profiles():
    """
    Return all available truck profiles with full specs.
    Used by the frontend TruckConfigurator component.
    """
    return get_all_profiles()


@router.get("/truck-profiles/{truck_type}")
async def api_truck_profile_detail(truck_type: str):
    """Get detailed specs for a specific truck type."""
    profile = get_truck_profile(truck_type)
    if profile["id"] != truck_type and truck_type != "container_chassis":
        raise HTTPException(status_code=404, detail=f"Truck type '{truck_type}' not found")
    return profile


@router.post("/fuel-estimate")
async def api_fuel_estimate(req: FuelEstimateRequest):
    """
    Quick fuel estimate for a given truck type, payload, and distance.
    Does not require waypoint coordinates.
    """
    model = FuelConsumptionModel(req.truck_type, req.payload_tonnes)
    result = model.estimate_route_fuel(
        total_distance_km=req.distance_km,
        duration_minutes=(req.distance_km / max(req.avg_speed_kmh or model.profile["optimal_speed_kmh"], 1)) * 60,
    )

    return {
        "truck_type": req.truck_type,
        "truck_name": model.profile["name"],
        "payload_tonnes": req.payload_tonnes,
        "distance_km": req.distance_km,
        **result,
    }
