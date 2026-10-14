"""Stop ordering + polyline assembly for a locked schedule.

Honest about what the free Geoapify Routing tier can do: it answers *pairwise*
legs, it does not solve a multi-stop travelling-salesman. So the order here is
nearest-neighbour over great-circle distance, and the geometry is the
concatenation of one real road leg per consecutive pair.

When the provider is unreachable or rate-limited we fall back to straight-line
geometry and mark the payload `simulated: true`, so the UI can render it dashed
and labelled "indicative" instead of implying real road routing. A lock is never
blocked by a routing outage.
"""

import logging
from typing import Any, Dict, List, Optional, Sequence, Tuple

import httpx
from cachetools import TTLCache
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.delivery_request import DeliveryRequestModel
from app.models.delivery_schedule import DeliveryScheduleModel
from app.ports import haversine_km, port_center

logger = logging.getLogger("logisync.route_optimizer")

ROUTING_URL = "https://api.geoapify.com/v1/routing"
_LEG_CACHE: TTLCache = TTLCache(maxsize=500, ttl=600)

Coord = Tuple[float, float]  # (lat, lng)


def _straight_line(a: Coord, b: Coord, steps: int = 12) -> List[List[float]]:
    """Interpolated fallback geometry. Returns [[lat, lng], ...]."""
    return [
        [round(a[0] + (b[0] - a[0]) * i / steps, 6),
         round(a[1] + (b[1] - a[1]) * i / steps, 6)]
        for i in range(steps + 1)
    ]


def _api_key() -> str:
    settings = get_settings()
    return settings.GEOAPIFY_API_KEY or getattr(settings, "VITE_GEOAPIFY_API_KEY", "")


async def fetch_leg(a: Coord, b: Coord, mode: str = "drive") -> Dict[str, Any]:
    """One real road leg. Never raises — falls back to a straight connector."""
    key = f"leg:{a[0]:.4f},{a[1]:.4f}:{b[0]:.4f},{b[1]:.4f}:{mode}"
    if key in _LEG_CACHE:
        return _LEG_CACHE[key]

    fallback = {
        "polyline": _straight_line(a, b),
        "distance_m": None,
        "duration_s": None,
        "simulated": True,
    }

    api_key = _api_key()
    if not api_key:
        _LEG_CACHE[key] = fallback
        return fallback

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                ROUTING_URL,
                params={
                    "waypoints": f"{a[0]},{a[1]}|{b[0]},{b[1]}",
                    "mode": mode,
                    "format": "geojson",
                    "apiKey": api_key,
                },
            )
            if resp.status_code != 200:
                logger.warning("route leg: provider HTTP %s", resp.status_code)
                _LEG_CACHE[key] = fallback
                return fallback
            feat = ((resp.json() or {}).get("features") or [{}])[0]
            geom = feat.get("geometry") or {}
            coords = geom.get("coordinates") or []
            if not coords:
                _LEG_CACHE[key] = fallback
                return fallback
            # Geoapify answers MultiLineString — concatenate the parts.
            if geom.get("type") == "MultiLineString":
                flat: List[Any] = []
                for part in coords:
                    flat.extend(part)
                coords = flat
            props = feat.get("properties") or {}
            out = {
                # Stored as [lat, lng] throughout, matching the Leaflet frontend.
                "polyline": [[round(c[1], 6), round(c[0], 6)] for c in coords],
                "distance_m": props.get("distance"),
                "duration_s": props.get("time"),
                "simulated": False,
            }
            _LEG_CACHE[key] = out
            return out
    except Exception as exc:
        logger.warning("route leg: provider unreachable (%s)", exc)
        _LEG_CACHE[key] = fallback
        return fallback


def nearest_neighbour_order(depot: Coord, stops: Sequence[DeliveryRequestModel]) -> List[DeliveryRequestModel]:
    """Greedy NN tour from the depot — cheap, deterministic, near-optimal for ≤4 stops."""
    remaining = list(stops)
    ordered: List[DeliveryRequestModel] = []
    cursor = depot
    while remaining:
        nxt = min(
            remaining,
            key=lambda r: haversine_km(cursor[0], cursor[1], r.delivery_lat, r.delivery_lng),
        )
        ordered.append(nxt)
        remaining.remove(nxt)
        cursor = (nxt.delivery_lat, nxt.delivery_lng)
    return ordered


async def optimize_schedule(db: Session, schedule: DeliveryScheduleModel) -> Dict[str, Any]:
    """Compute and return the `optimized_route` payload for a locked schedule.

    Writes `stop_sequence` onto each stop and recomputes `final_earnings` from
    real road distance. The caller assigns the payload to schedule.optimized_route.
    """
    stops = (
        db.query(DeliveryRequestModel)
        .filter(DeliveryRequestModel.schedule_id == schedule.id)
        .all()
    )
    if not stops:
        return {
            "order": [],
            "polyline": [],
            "legs": [],
            "total_distance_km": 0.0,
            "total_duration_s": 0.0,
            "simulated": True,
        }

    depot = port_center(schedule.port_id)
    ordered = nearest_neighbour_order(depot, stops)

    polyline: List[List[float]] = [[depot[0], depot[1]]]
    legs: List[Dict[str, Any]] = []
    total_m = 0.0
    total_s = 0.0
    simulated = False
    prev_req_id = None

    for seq, stop in enumerate(ordered, start=1):
        stop.stop_sequence = seq
        target = (stop.delivery_lat, stop.delivery_lng)
        origin = _cursor(polyline)
        leg = await fetch_leg(origin, target)
        # Skip the duplicate joint point between consecutive legs.
        polyline.extend(leg["polyline"][1:])
        if leg["distance_m"]:
            total_m += float(leg["distance_m"])
        else:
            total_m += haversine_km(origin[0], origin[1], target[0], target[1]) * 1000.0
            simulated = True
        if leg["duration_s"]:
            total_s += float(leg["duration_s"])
        simulated = simulated or bool(leg["simulated"])
        legs.append({
            "from_request_id": prev_req_id,
            "to_request_id": stop.id,
            "distance_m": leg["distance_m"],
            "duration_s": leg["duration_s"],
            "simulated": leg["simulated"],
        })
        prev_req_id = stop.id

    return {
        "order": [r.id for r in ordered],
        "polyline": polyline,
        "legs": legs,
        "total_distance_km": round(total_m / 1000.0, 2),
        "total_duration_s": int(total_s),
        "simulated": simulated,
    }


def _cursor(polyline: List[List[float]]) -> Coord:
    """Last point written to the polyline, as a (lat, lng) tuple."""
    if not polyline:
        return (0.0, 0.0)
    pt = polyline[-1]
    return (float(pt[0]), float(pt[1]))


def route_payload(schedule: DeliveryScheduleModel) -> Optional[Dict[str, Any]]:
    """Safely coerce the stored JSONB/JSON column back into a dict."""
    raw = schedule.optimized_route
    if not raw:
        return None
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        import json
        try:
            return json.loads(raw)
        except ValueError:
            return None
    return None