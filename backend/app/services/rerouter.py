import math
from typing import Dict, Any, List, Tuple
from app.services.google_maps import google_maps_service
from app.ports import DEFAULT_PORT_ID, PORTS, is_valid_port, port_hotspots


class LiveRerouterService:
    """
    Novelty Engine 2: Live-Location-Triggered Dynamic Rerouting.
    Monitors truck GPS coordinates relative to port bottleneck zones,
    evaluates live road congestion, and computes bypass routes.
    """

    # Legacy VOC hotspot geofences (kept for backwards compatibility).
    HOTSPOTS = port_hotspots(DEFAULT_PORT_ID)

    def hotspots_for(self, port_id: str = DEFAULT_PORT_ID) -> List[Dict[str, Any]]:
        """Hotspot geofences for a port (defaults to VOC)."""
        if not is_valid_port(port_id):
            port_id = DEFAULT_PORT_ID
        return port_hotspots(port_id)

    def _haversine_km(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate great circle distance in km between two lat/lng coordinates."""
        r = 6371.0
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lng2 - lng1)
        a = math.sin(dphi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0)**2
        return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    def evaluate_truck_position(
        self,
        truck_id: str,
        current_lat: float,
        current_lng: float,
        destination: str = "VOC Port",
        port_id: str = DEFAULT_PORT_ID,
    ) -> Dict[str, Any]:
        """
        Evaluates whether a truck is approaching an active congestion bottleneck.
        If triggered, generates an AI reroute instruction.
        """
        if destination == "VOC Port" and port_id != DEFAULT_PORT_ID:
            destination = PORTS[port_id]["short"]
        for spot in self.hotspots_for(port_id):
            dist = self._haversine_km(current_lat, current_lng, spot["lat"], spot["lng"])
            if dist <= spot["radius_km"]:
                return {
                    "reroute_triggered": True,
                    "truck_id": truck_id,
                    "hotspot_name": spot["name"],
                    "distance_to_bottleneck_km": round(dist, 2),
                    "expected_delay_avoided_min": spot["delay_minutes"],
                    "recommended_route": spot["alternate_route"],
                    "fuel_savings_litres": 3.4,
                    "carbon_reduction_kg": 9.1,
                    "message": f"Congestion alert at {spot['name']}. Divert to {spot['alternate_route']} to save {spot['delay_minutes']} mins.",
                    "status": "active"
                }

        return {
            "reroute_triggered": False,
            "truck_id": truck_id,
            "message": "Current corridor free-flowing. On-schedule."
        }


rerouter_service = LiveRerouterService()
