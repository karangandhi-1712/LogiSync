"""Port depot registry for the delivery marketplace.

The 12 depots that delivery requests originate from. This module is the
canonical source for depot identity + coordinates; the `ports` table is seeded
from it at startup and is the FK target for delivery_requests.pickup_port_id
and delivery_schedules.port_id.

Only what the marketplace needs lives here — depot identity, map centre, and
haversine helpers for radius/route estimates. The previous gate topology,
geofence polygons, spawn offsets and simulation bounding boxes were removed when
the slot-scheduling flow was superseded.
"""

import math
from typing import Any, Dict, List, Optional, Tuple

DEFAULT_PORT_ID = "voc"

PORTS: Dict[str, Dict[str, Any]] = {
    "voc": {
        "id": "voc",
        "code": "INMUN",
        "name": "V.O. Chidambaranar Port",
        "short": "VOC Port",
        "city": "Thoothukudi",
        "state": "Tamil Nadu",
        "orientation": "east",
        "center": {"lat": 8.7642, "lng": 78.1348},
        "zoom": 12,
        "corridor": "Madurai–Thoothukudi Hwy (NH 38)",
    },
    "deendayal": {
        "id": "deendayal",
        "code": "INDEK",
        "name": "Deendayal Port (Kandla)",
        "short": "Deendayal",
        "city": "Kandla",
        "state": "Gujarat",
        "orientation": "creek",
        "center": {"lat": 23.000, "lng": 70.221},
        "zoom": 12,
        "corridor": "Kandla–Ahmedabad Hwy (NH 41)",
    },
    "mumbai": {
        "id": "mumbai",
        "code": "INBOM",
        "name": "Mumbai Port",
        "short": "Mumbai",
        "city": "Mumbai",
        "state": "Maharashtra",
        "orientation": "west",
        # Mumbai Port (Jahangir Shekhawat), NOT JNPT — the two are ~13km apart
        # and sharing a coordinate made `nearest_port` unable to tell them apart.
        "center": {"lat": 18.917, "lng": 72.833},
        "zoom": 12,
        "corridor": "Eastern Freeway / Harbour Link",
    },
    "jnpt": {
        "id": "jnpt",
        "code": "INNSA",
        "name": "Jawaharlal Nehru Port (Nhava Sheva)",
        "short": "JNPT",
        "city": "Navi Mumbai",
        "state": "Maharashtra",
        "orientation": "west",
        "center": {"lat": 18.945, "lng": 72.940},
        "zoom": 12,
        "corridor": "JNPT–Panvel Hwy (NH 348)",
    },
    "mormugao": {
        "id": "mormugao",
        "code": "INMVM",
        "name": "Mormugao Port",
        "short": "Mormugao",
        "city": "Vasco da Gama",
        "state": "Goa",
        "orientation": "west",
        "center": {"lat": 15.419, "lng": 73.800},
        "zoom": 12,
        "corridor": "Vasco–Panaji Hwy (NH 66)",
    },
    "mangalore": {
        "id": "mangalore",
        "code": "INMIX",
        "name": "New Mangalore Port",
        "short": "N. Mangalore",
        "city": "Mangaluru",
        "state": "Karnataka",
        "orientation": "west",
        "center": {"lat": 12.915, "lng": 74.796},
        "zoom": 12,
        "corridor": "Mangaluru–Bengaluru Hwy (NH 75)",
    },
    "cochin": {
        "id": "cochin",
        "code": "INCOK",
        "name": "Cochin Port",
        "short": "Cochin",
        "city": "Kochi",
        "state": "Kerala",
        "orientation": "west",
        "center": {"lat": 9.967, "lng": 76.240},
        "zoom": 12,
        "corridor": "Kochi–Salem Hwy (NH 544)",
    },
    "haldia": {
        "id": "haldia",
        "code": "INHAL",
        "name": "Syama Prasad Mookerjee Port (Haldia Dock)",
        "short": "Haldia",
        "city": "Haldia",
        "state": "West Bengal",
        "orientation": "river",
        "center": {"lat": 22.030, "lng": 88.065},
        "zoom": 12,
        "corridor": "Haldia–Kolkata Hwy (NH 116)",
    },
    "paradip": {
        "id": "paradip",
        "code": "INPNT",
        "name": "Paradip Port",
        "short": "Paradip",
        "city": "Paradip",
        "state": "Odisha",
        "orientation": "east",
        "center": {"lat": 20.262, "lng": 86.682},
        "zoom": 12,
        "corridor": "Paradip–Cuttack Hwy (NH 53)",
    },
    "vizag": {
        "id": "vizag",
        "code": "INVTZ",
        "name": "Visakhapatnam Port",
        "short": "Vizag",
        "city": "Visakhapatnam",
        "state": "Andhra Pradesh",
        "orientation": "east",
        "center": {"lat": 17.686, "lng": 83.283},
        "zoom": 12,
        "corridor": "Vizag–Raipur Hwy (NH 26)",
    },
    "chennai": {
        "id": "chennai",
        "code": "INMAA",
        "name": "Chennai Port",
        "short": "Chennai",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "orientation": "east",
        "center": {"lat": 13.100, "lng": 80.293},
        "zoom": 12,
        "corridor": "Chennai–Bengaluru Hwy (NH 48)",
    },
    "ennore": {
        "id": "ennore",
        "code": "INENR",
        "name": "Kamarajar Port (Ennore)",
        "short": "Ennore",
        "city": "Ennore",
        "state": "Tamil Nadu",
        "orientation": "east",
        "center": {"lat": 13.250, "lng": 80.320},
        "zoom": 12,
        "corridor": "Ennore–Chennai Port Corridor",
    },
}

PORT_IDS: List[str] = list(PORTS.keys())

# Coastal ports get a "use nearest depot" hint in the consumer intake flow.
COASTAL_PORTS = [p for p in PORT_IDS if PORTS[p]["state"] in (
    "Tamil Nadu", "Andhra Pradesh", "Odisha", "West Bengal",
)]

EARTH_RADIUS_KM = 6371.0088


def get_port(port_id: str) -> Dict[str, Any]:
    """Registry lookup. Raises KeyError for an unknown id."""
    return PORTS[port_id]


def is_valid_port(port_id: str) -> bool:
    return port_id in PORTS


def port_list() -> List[Dict[str, Any]]:
    """Flat list for the /api/ports endpoint and the seeder."""
    return [
        {
            "id": p["id"],
            "code": p["code"],
            "name": p["name"],
            "short": p["short"],
            "city": p["city"],
            "state": p["state"],
            "lat": p["center"]["lat"],
            "lng": p["center"]["lng"],
            "zoom": p["zoom"],
            "corridor": p["corridor"],
        }
        for p in PORTS.values()
    ]


def port_center(port_id: str) -> Tuple[float, float]:
    """(lat, lng) of a depot, falling back to the default depot."""
    p = PORTS.get(port_id) or PORTS[DEFAULT_PORT_ID]
    return p["center"]["lat"], p["center"]["lng"]


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in kilometres."""
    to_rad = math.radians
    d_lat = to_rad(lat2 - lat1)
    d_lng = to_rad(lng2 - lng1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(to_rad(lat1)) * math.cos(to_rad(lat2)) * math.sin(d_lng / 2) ** 2
    )
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(min(1.0, a)))


def within_radius(port_or_center: Any, lat: float, lng: float, radius_km: float) -> bool:
    """True when (lat, lng) falls inside radius_km of a depot or a centre point."""
    if isinstance(port_or_center, str):
        c_lat, c_lng = port_center(port_or_center)
    elif isinstance(port_or_center, dict) and "center" in port_or_center:
        c_lat, c_lng = port_or_center["center"]["lat"], port_or_center["center"]["lng"]
    else:
        c_lat, c_lng = port_or_center
    return haversine_km(c_lat, c_lng, lat, lng) <= radius_km


def nearest_port(lat: float, lng: float) -> Optional[str]:
    """Closest depot to a coordinate — drives the consumer's auto-suggest."""
    if not PORTS:
        return None
    return min(
        PORT_IDS,
        key=lambda pid: haversine_km(lat, lng, *port_center(pid)),
    )