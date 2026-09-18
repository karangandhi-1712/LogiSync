"""True road-geometry routing via Geoapify (free tier), with honest fallback.

`GET /api/maps/route` returns GeoJSON LineString geometry for truck->gate
legs. When no key is configured or the provider is unreachable, the response
is a straight connector flagged `"simulated": true` so the UI renders it
dashed + labeled "indicative" instead of pretending it is road geometry.
"""

import logging
from typing import Dict, Any, List, Optional

import httpx
from cachetools import TTLCache

from app.config import get_settings

logger = logging.getLogger("logisync.routing")

_CACHE = TTLCache(maxsize=500, ttl=300)


def _straight_line(from_lat: float, from_lng: float, to_lat: float, to_lng: float, steps: int = 16) -> List[List[float]]:
    return [
        [round(from_lng + (to_lng - from_lng) * i / steps, 5),
         round(from_lat + (to_lat - from_lat) * i / steps, 5)]
        for i in range(steps + 1)
    ]


class RoutingService:
    BASE_URL = "https://api.geoapify.com/v1/routing"

    async def get_route(
        self,
        from_lat: float,
        from_lng: float,
        to_lat: float,
        to_lng: float,
        mode: str = "drive",
    ) -> Dict[str, Any]:
        cache_key = f"route_{from_lat:.4f}_{from_lng:.4f}_{to_lat:.4f}_{to_lng:.4f}_{mode}"
        if cache_key in _CACHE:
            return _CACHE[cache_key]

        settings = get_settings()
        if settings.GEOAPIFY_API_KEY:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(
                        self.BASE_URL,
                        params={
                            "waypoints": f"{from_lat},{from_lng}|{to_lat},{to_lng}",
                            "mode": mode,
                            "format": "geojson",
                            "apiKey": settings.GEOAPIFY_API_KEY,
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        feats = data.get("features") or []
                        geom = (feats[0].get("geometry") if feats else None) or {}
                        coords = geom.get("coordinates") or []
                        if coords:
                            # Contract: always a flat LineString. Geoapify
                            # answers MultiLineString — concatenate the parts.
                            if geom.get("type") == "MultiLineString":
                                flat: List[Any] = []
                                for part in coords:
                                    flat.extend(part)
                                coords = flat
                            props = feats[0].get("properties", {})
                            out = {
                                "type": "Feature",
                                "geometry": {"type": "LineString", "coordinates": coords},
                                "properties": {
                                    "distance_m": props.get("distance"),
                                    "duration_s": props.get("time"),
                                    "mode": mode,
                                },
                                "simulated": False,
                            }
                            _CACHE[cache_key] = out
                            return out
                        logger.warning("routing: empty GeoJSON features, using fallback")
                    else:
                        logger.warning("routing: provider HTTP %s, using fallback", resp.status_code)
            except Exception as e:
                logger.warning("routing: provider unreachable (%s), using fallback", e)

        out = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": _straight_line(from_lat, from_lng, to_lat, to_lng),
            },
            "properties": {"distance_m": None, "duration_s": None, "mode": mode},
            "simulated": True,
        }
        _CACHE[cache_key] = out
        return out


routing_service = RoutingService()
