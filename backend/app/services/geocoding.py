"""Geoapify geocoding with a deterministic fallback.

Delivery intake and the depot auto-suggest both need coordinates, and neither
may hard-fail when the provider is down or rate-limited. Every lookup falls back
to a stable point derived from the chosen depot, so the flow always produces a
usable coordinate pair and the UI never shows a broken map.
"""

import hashlib
import logging
from typing import Any, Dict, List, Optional, Tuple

import httpx
from cachetools import TTLCache

from app.config import get_settings
from app.ports import port_center

logger = logging.getLogger("logisync.geocoding")

BASE_URL = "https://api.geoapify.com/v1/geocode"
_CACHE: TTLCache = TTLCache(maxsize=500, ttl=3600)

#: Offsets applied to the depot centre for the deterministic fallback, so
#: different addresses around one port still land on different points.
_FALLBACK_SPREAD_DEG = 0.12


def _fallback_coords(place: str, port_id: str) -> Tuple[float, float]:
    """Stable pseudo-random point within ~12km of the depot for `place`."""
    digest = hashlib.md5(f"{port_id}:{place}".encode("utf-8")).hexdigest()
    frac_a = int(digest[0:4], 16) / 0xFFFF
    frac_b = int(digest[4:8], 16) / 0xFFFF
    lat, lng = port_center(port_id)
    return (
        round(lat + (frac_a - 0.5) * 2 * _FALLBACK_SPREAD_DEG, 6),
        round(lng + (frac_b - 0.5) * 2 * _FALLBACK_SPREAD_DEG, 6),
    )


def _key(prefix: str, *parts: Any) -> str:
    return ":".join([prefix, *(str(p) for p in parts)])


async def geocode_address(address: str, port_id: str) -> Dict[str, Any]:
    """Resolve a free-text address to coordinates near `port_id`.

    Always returns `{lat, lng, resolved, source}`. `source` is "geoapify" or
    "fallback" so callers and UIs can be honest about approximation.
    """
    address = (address or "").strip()
    if not address:
        lat, lng = port_center(port_id)
        return {"lat": lat, "lng": lng, "resolved": False, "source": "fallback"}

    cache_key = _key("geo", address.lower(), port_id)
    if cache_key in _CACHE:
        return _CACHE[cache_key]

    settings = get_settings()
    api_key = (
        settings.GEOAPIFY_API_KEY
        or settings.GEOAPIFY_API_KEY
        or getattr(settings, "VITE_GEOAPIFY_API_KEY", "")
    )
    if api_key:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(
                    f"{BASE_URL}/search",
                    params={
                        "text": address,
                        "format": "json",
                        "limit": 1,
                        "filter": f"countrycode:ind",
                        "apiKey": api_key,
                    },
                )
                if resp.status_code == 200:
                    feats = (resp.json() or {}).get("features") or []
                    if feats:
                        coords = (feats[0].get("geometry") or {}).get("coordinates")
                        if coords:
                            out = {
                                "lat": float(coords[1]),
                                "lng": float(coords[0]),
                                "resolved": True,
                                "source": "geoapify",
                            }
                            _CACHE[cache_key] = out
                            return out
                    logger.warning("geocode: no features for %r", address)
                else:
                    logger.warning("geocode: provider HTTP %s", resp.status_code)
        except Exception as exc:  # provider unreachable / timeout
            logger.warning("geocode: provider unreachable (%s)", exc)

    out = {"lat": None, "lng": None, "resolved": False, "source": "fallback"}
    out["lat"], out["lng"] = _fallback_coords(address, port_id)
    _CACHE[cache_key] = out
    return out


async def autocomplete(input_text: str, port_id: Optional[str] = None,
                       limit: int = 6) -> List[Dict[str, Any]]:
    """Address autocomplete suggestions for the consumer intake form."""
    input_text = (input_text or "").strip()
    if len(input_text) < 3:
        return []

    settings = get_settings()
    api_key = settings.GEOAPIFY_API_KEY or getattr(settings, "VITE_GEOAPIFY_API_KEY", "")
    if not api_key:
        return []

    cache_key = _key("auto", input_text.lower(), port_id or "-", limit)
    if cache_key in _CACHE:
        return _CACHE[cache_key]

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"{BASE_URL}/autocomplete",
                params={
                    "text": input_text,
                    "format": "json",
                    "limit": limit,
                    "apiKey": api_key,
                },
            )
            if resp.status_code != 200:
                return []
            data = resp.json() or {}
    except Exception as exc:
        logger.warning("autocomplete: provider unreachable (%s)", exc)
        return []

    out: List[Dict[str, Any]] = []
    for feat in (data.get("results") or [])[:limit]:
        coords = (feat.get("geometry") or {}).get("coordinates")
        if not coords:
            continue
        out.append({
            "title": feat.get("name") or input_text,
            "subtitle": feat.get("formatted") or "",
            "lat": float(coords[1]),
            "lng": float(coords[0]),
        })
    _CACHE[cache_key] = out
    return out