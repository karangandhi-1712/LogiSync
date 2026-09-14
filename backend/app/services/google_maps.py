import httpx
from typing import Dict, Any, List, Optional
from cachetools import TTLCache
from app.config import get_settings

settings = get_settings()

# Cache directions and geocoding responses for 5 minutes
_CACHE = TTLCache(maxsize=1000, ttl=300)


class GoogleMapsService:
    BASE_URL = "https://maps.googleapis.com/maps/api"

    def __init__(self):
        self.api_key = settings.GOOGLE_MAPS_SERVER_API_KEY

    async def get_directions(
        self,
        origin: str,
        destination: str,
        waypoints: Optional[List[str]] = None,
        mode: str = "driving",
        departure_time: str = "now"
    ) -> Dict[str, Any]:
        """Fetch real-time traffic-aware multi-waypoint directions from Google Directions API."""
        cache_key = f"dir_{origin}_{destination}_{str(waypoints)}_{mode}"
        if cache_key in _CACHE:
            return _CACHE[cache_key]

        if not self.api_key:
            # High-fidelity Thoothukudi corridor fallback
            return {
                "status": "OK",
                "routes": [{
                    "summary": "Madurai - Thoothukudi Hwy (NH 38)",
                    "legs": [{
                        "distance": {"text": "14.2 km", "value": 14200},
                        "duration": {"text": "22 mins", "value": 1320},
                        "duration_in_traffic": {"text": "24 mins", "value": 1440},
                        "start_address": origin,
                        "end_address": destination,
                        "start_location": {"lat": 8.7642, "lng": 78.1348},
                        "end_location": {"lat": 8.7495, "lng": 78.1812},
                    }],
                    "overview_polyline": {
                        "points": "yvycAuq_lNFw@r@eCt@_Dr@_Dh@_Dn@oDr@uDr@sDp@oDt@oD"
                    },
                    "warnings": []
                }]
            }

        params = {
            "origin": origin,
            "destination": destination,
            "mode": mode,
            "departure_time": departure_time,
            "key": self.api_key
        }
        if waypoints:
            params["waypoints"] = "|".join(waypoints)

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{self.BASE_URL}/directions/json", params=params)
            data = resp.json()
            _CACHE[cache_key] = data
            return data

    async def geocode(self, address: str) -> Dict[str, Any]:
        """Convert address or port terminal name to lat/lng."""
        cache_key = f"geo_{address}"
        if cache_key in _CACHE:
            return _CACHE[cache_key]

        if not self.api_key:
            return {
                "results": [{
                    "formatted_address": f"{address}, Thoothukudi, Tamil Nadu, India",
                    "geometry": {
                        "location": {"lat": 8.7642, "lng": 78.1348}
                    }
                }],
                "status": "OK"
            }

        params = {"address": address, "key": self.api_key}
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(f"{self.BASE_URL}/geocode/json", params=params)
            data = resp.json()
            _CACHE[cache_key] = data
            return data

    async def autocomplete_places(self, input_text: str) -> Dict[str, Any]:
        """Search places / port terminals / warehouses with autocomplete."""
        if not self.api_key:
            return {
                "predictions": [
                    {"description": f"{input_text} - VOC Port Container Terminal", "place_id": "voc_pct_1"},
                    {"description": f"{input_text} - Madurai Inland Container Depot", "place_id": "icd_madurai"},
                    {"description": f"{input_text} - SIPCOT Logistics Yard Thoothukudi", "place_id": "sipcot_thoo"}
                ],
                "status": "OK"
            }

        params = {
            "input": input_text,
            "components": "country:in",
            "key": self.api_key
        }
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(f"{self.BASE_URL}/place/autocomplete/json", params=params)
            return resp.json()

    async def distance_matrix(self, origins: List[str], destinations: List[str]) -> Dict[str, Any]:
        """Compute distance and ETA matrix across multiple origins and gates."""
        if not self.api_key:
            return {
                "origin_addresses": origins,
                "destination_addresses": destinations,
                "rows": [{
                    "elements": [{
                        "status": "OK",
                        "duration": {"value": 1200, "text": "20 mins"},
                        "distance": {"value": 11500, "text": "11.5 km"}
                    } for _ in destinations]
                } for _ in origins],
                "status": "OK"
            }

        params = {
            "origins": "|".join(origins),
            "destinations": "|".join(destinations),
            "departure_time": "now",
            "key": self.api_key
        }
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(f"{self.BASE_URL}/distancematrix/json", params=params)
            return resp.json()


google_maps_service = GoogleMapsService()
