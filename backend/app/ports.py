"""Central registry of Indian major ports served by LogiSync.

Single source of truth for per-port geography. Frontend mirrors this file in
`frontend/src/data/ports.ts` — keep both in sync when adding ports.

Coordinates are harbor-grade (map focus + procedural geofence/truck generation),
verified against official port location publications.
"""

from typing import Dict, Any, List, Tuple

# Default zoom used when focusing a port on the map.
DEFAULT_PORT_ZOOM = 12

# ─── Explicit per-port land-side geometry ───────────────────────────────────
# Orientation guesswork put trucks (and Mumbai's gates) in the sea: Mumbai's
# docks face EAST into the harbour, Mormugao sits at a river mouth, Cochin is
# ringed by backwaters. So every port declares hand-vetted tables instead:
#   SPAWN_DELTAS: 10x (dlat, dlng) truck offsets from center — ALL on land.
#   GATE_DELTAS:  4x (dlat, dlng) gate offsets from harbor (quay-side is fine).
#   SIM_BOUNDS:   (min_lat, max_lat, min_lng, max_lng) jitter/repair clamp with
#                 a tight water-side cap. (~1deg lat ≈ 111km.)
_SPAWN_DELTAS: Dict[str, List[Tuple[float, float]]] = {
    "voc": [
        (-0.010, -0.030), (0.020, -0.020), (-0.030, -0.010), (0.040, -0.035),
        (-0.005, -0.050), (0.060, -0.010), (-0.040, -0.040), (0.010, 0.000),
        (0.030, 0.020), (-0.020, 0.030),
    ],
    "deendayal": [
        (0.020, 0.000), (0.035, 0.020), (0.015, -0.020), (0.050, 0.005),
        (0.025, -0.035), (0.040, -0.010), (0.010, 0.030), (0.055, 0.030),
        (0.030, 0.045), (0.045, -0.025),
    ],
    # Island city: land is WEST (city) + N/S along the island, water EAST.
    "mumbai": [
        (0.000, -0.020), (0.015, -0.030), (-0.015, -0.025), (0.030, -0.015),
        (-0.030, -0.010), (0.005, -0.045), (-0.020, -0.050), (0.040, -0.040),
        (-0.040, -0.030), (0.020, -0.060),
    ],
    # Mainland east of the creek: land EAST, water WEST.
    "jnpt": [
        (0.000, 0.020), (-0.015, 0.030), (-0.030, 0.015), (0.010, 0.045),
        (-0.020, 0.050), (-0.035, 0.030), (0.020, 0.025), (-0.010, 0.060),
        (0.030, 0.050), (-0.040, 0.045),
    ],
    # Zuari mouth: land SE (Vasco/Sada), river N, sea W.
    "mormugao": [
        (-0.010, 0.015), (-0.020, 0.030), (-0.005, 0.025), (-0.030, 0.010),
        (-0.015, 0.040), (-0.025, -0.005), (0.000, 0.020), (-0.035, 0.025),
        (-0.010, -0.015), (0.005, 0.035),
    ],
    "mangalore": [
        (0.010, 0.024), (-0.015, 0.030), (0.030, 0.015), (-0.030, 0.025),
        (0.000, 0.045), (0.040, 0.035), (-0.020, 0.050), (0.020, 0.016),
        (-0.040, 0.040), (0.050, 0.020),
    ],
    # Backwater maze: bias NE onto the Ernakulam mainland.
    "cochin": [
        (0.020, 0.030), (0.035, 0.020), (0.010, 0.045), (0.045, 0.035),
        (0.025, 0.050), (0.000, 0.030), (-0.010, 0.045), (0.050, 0.015),
        (0.015, 0.055), (-0.020, 0.030),
    ],
    # Hooghly west bank: land W/N, river E.
    "haldia": [
        (0.010, -0.020), (0.025, -0.030), (-0.010, -0.025), (0.040, -0.015),
        (-0.020, -0.040), (0.000, -0.050), (0.030, -0.045), (-0.030, -0.020),
        (0.050, -0.035), (-0.015, -0.055),
    ],
    # Coast runs E-W, sea SOUTH: spread inland NORTH.
    "paradip": [
        (0.020, 0.000), (0.035, -0.020), (0.015, 0.025), (0.050, 0.000),
        (0.025, -0.040), (0.040, 0.030), (0.010, -0.025), (0.055, -0.010),
        (0.030, 0.045), (0.045, -0.030),
    ],
    "vizag": [
        (0.020, -0.015), (0.035, -0.030), (0.010, -0.030), (0.050, -0.020),
        (0.025, -0.045), (0.040, -0.005), (0.000, -0.020), (0.055, -0.035),
        (-0.010, -0.025), (0.030, -0.050),
    ],
    "chennai": [
        (0.010, -0.020), (-0.015, -0.030), (0.030, -0.015), (-0.030, -0.025),
        (0.000, -0.045), (0.040, -0.035), (-0.020, -0.050), (0.020, -0.010),
        (-0.040, -0.040), (0.050, -0.025),
    ],
    "ennore": [
        (0.010, -0.020), (0.030, -0.015), (-0.010, -0.030), (0.045, -0.025),
        (-0.020, -0.040), (0.000, -0.050), (0.030, -0.040), (-0.030, -0.020),
        (0.050, -0.035), (0.015, -0.055),
    ],
}

_GATE_DELTAS: Dict[str, List[Tuple[float, float]]] = {
    "deendayal": [(0.004, 0.002), (0.008, -0.002), (0.012, 0.004), (0.016, 0.000)],
    "mumbai": [(0.000, -0.003), (0.004, -0.005), (-0.004, -0.006), (0.008, -0.008)],
    "jnpt": [(0.004, 0.010), (0.008, 0.014), (0.000, 0.016), (0.010, 0.018)],
    "mormugao": [(-0.004, 0.004), (-0.008, 0.008), (-0.002, 0.010), (-0.010, 0.002)],
    "mangalore": [(0.002, 0.004), (-0.002, 0.008), (0.005, 0.006), (-0.004, 0.010)],
    "cochin": [(0.003, 0.006), (0.007, 0.010), (-0.001, 0.012), (0.009, 0.004)],
    "haldia": [(0.003, -0.004), (0.007, -0.008), (-0.001, -0.010), (0.009, -0.002)],
    "paradip": [(0.004, 0.000), (0.008, -0.003), (0.002, 0.004), (0.010, -0.001)],
    "vizag": [(0.003, -0.003), (0.007, -0.006), (0.001, -0.008), (0.009, -0.002)],
    "chennai": [(0.002, -0.003), (-0.002, -0.006), (0.004, -0.008), (-0.004, -0.004)],
    "ennore": [(0.002, -0.003), (0.006, -0.006), (-0.002, -0.008), (0.008, -0.004)],
    "voc": [(0.000, 0.000)] * 4,  # unused: VOC keeps legacy exact coords
}

# Simulation boxes per port: (min_lat, max_lat, min_lng, max_lng). A port may
# need several boxes when its coastline bends — VOC's shore curves NE past
# lat 8.80 (Van Thivu water), so the northern box caps lng at 78.162 while the
# southern box extends to 78.190 to include the quay/gates (trk-02/03/05 live
# there legitimately). Gates themselves are exempt from clamping by design.
# Bump when spawn tables/bounds change: startup reseeds procedural fleets so
# existing databases pick up corrected land-side positions automatically.
GEO_VERSION = 2

_SIM_BOXES: Dict[str, List[Tuple[float, float, float, float]]] = {
    "voc": [
        (8.66, 8.80, 78.03, 78.190),
        (8.80, 8.87, 78.03, 78.162),
    ],
    "deendayal": [(23.00, 23.11, 70.15, 70.30)],
    "mumbai": [(18.875, 18.97, 72.81, 72.934)],
    "jnpt": [(18.90, 18.99, 72.952, 73.02)],
    "mormugao": [(15.36, 15.428, 73.782, 73.86)],
    "mangalore": [(12.872, 12.98, 74.796, 74.87)],
    "cochin": [(9.93, 10.03, 76.245, 76.31)],
    "haldia": [(21.98, 22.10, 87.99, 88.060)],
    "paradip": [(20.265, 20.34, 86.62, 86.74)],
    "vizag": [(17.66, 17.76, 83.21, 83.286)],
    "chennai": [(13.04, 13.17, 80.22, 80.288)],
    "ennore": [(13.20, 13.32, 80.24, 80.315)],
}

PORTS: Dict[str, Dict[str, Any]] = {
    "voc": {
        "id": "voc",
        "name": "V.O. Chidambaranar Port",
        "short": "VOC Port",
        "city": "Thoothukudi",
        "state": "Tamil Nadu",
        "orientation": "east",
        # Kept as the legacy app center (city-side) to preserve current UX.
        "center": {"lat": 8.7642, "lng": 78.1348},
        "harbor": {"lat": 8.7525, "lng": 78.1820},
        "zoom": 12,
        "corridor": "Madurai–Thoothukudi Hwy (NH 38)",
        "gates": ["Gate 1 (Bulk)", "Gate 2 (General)", "Gate 3 (Container/Reefer)", "Gate 4 (Express Rail)"],
    },
    "deendayal": {
        "id": "deendayal",
        "name": "Deendayal Port (Kandla)",
        "short": "Deendayal",
        "city": "Kandla",
        "state": "Gujarat",
        "orientation": "creek",
        "center": {"lat": 23.000, "lng": 70.221},
        "harbor": {"lat": 23.000, "lng": 70.221},
        "zoom": 12,
        "corridor": "Kandla–Ahmedabad Hwy (NH 41)",
        "gates": ["Gate 1 (Dry Bulk)", "Gate 2 (General)", "Gate 3 (Container)", "Gate 4 (Liquid/Express)"],
    },
    "mumbai": {
        "id": "mumbai",
        "name": "Mumbai Port",
        "short": "Mumbai",
        "city": "Mumbai",
        "state": "Maharashtra",
        "orientation": "west",
        "center": {"lat": 18.918, "lng": 72.935},
        "harbor": {"lat": 18.918, "lng": 72.935},
        "zoom": 12,
        "corridor": "Eastern Freeway / Harbour Link",
        "gates": ["Gate 1 (Green Gate)", "Gate 2 (General)", "Gate 3 (Container)", "Gate 4 (Coastal/Express)"],
    },
    "jnpt": {
        "id": "jnpt",
        "name": "Jawaharlal Nehru Port (Nhava Sheva)",
        "short": "JNPT",
        "city": "Navi Mumbai",
        "state": "Maharashtra",
        "orientation": "west",
        "center": {"lat": 18.945, "lng": 72.940},
        "harbor": {"lat": 18.945, "lng": 72.940},
        "zoom": 12,
        "corridor": "JNPT–Panvel Hwy (NH 348)",
        "gates": ["Gate 1 (Main Entry)", "Gate 2 (General)", "Gate 3 (Container/Reefer)", "Gate 4 (Rail/Express)"],
    },
    "mormugao": {
        "id": "mormugao",
        "name": "Mormugao Port",
        "short": "Mormugao",
        "city": "Vasco da Gama",
        "state": "Goa",
        "orientation": "west",
        "center": {"lat": 15.419, "lng": 73.800},
        "harbor": {"lat": 15.419, "lng": 73.800},
        "zoom": 12,
        "corridor": "Vasco–Panaji Hwy (NH 66)",
        "gates": ["Gate 1 (Iron Ore/Bulk)", "Gate 2 (General)", "Gate 3 (Container)", "Gate 4 (Coastal/Express)"],
    },
    "mangalore": {
        "id": "mangalore",
        "name": "New Mangalore Port",
        "short": "N. Mangalore",
        "city": "Mangaluru",
        "state": "Karnataka",
        "orientation": "west",
        "center": {"lat": 12.915, "lng": 74.796},
        "harbor": {"lat": 12.915, "lng": 74.796},
        "zoom": 12,
        "corridor": "Mangaluru–Bengaluru Hwy (NH 75)",
        "gates": ["Gate 1 (POL/Bulk)", "Gate 2 (General)", "Gate 3 (Container/Reefer)", "Gate 4 (Rail/Express)"],
    },
    "cochin": {
        "id": "cochin",
        "name": "Cochin Port",
        "short": "Cochin",
        "city": "Kochi",
        "state": "Kerala",
        "orientation": "west",
        "center": {"lat": 9.967, "lng": 76.240},
        "harbor": {"lat": 9.967, "lng": 76.240},
        "zoom": 12,
        "corridor": "Kochi–Salem Hwy (NH 544)",
        "gates": ["Gate 1 (Main Entry)", "Gate 2 (General)", "Gate 3 (Container ICTT)", "Gate 4 (Coastal/Express)"],
    },
    "haldia": {
        "id": "haldia",
        "name": "Syama Prasad Mookerjee Port (Haldia Dock)",
        "short": "Haldia",
        "city": "Haldia",
        "state": "West Bengal",
        "orientation": "river",
        "center": {"lat": 22.030, "lng": 88.065},
        "harbor": {"lat": 22.030, "lng": 88.065},
        "zoom": 12,
        "corridor": "Haldia–Kolkata Hwy (NH 116)",
        "gates": ["Gate 1 (Bulk)", "Gate 2 (General)", "Gate 3 (Container)", "Gate 4 (Rail/Express)"],
    },
    "paradip": {
        "id": "paradip",
        "name": "Paradip Port",
        "short": "Paradip",
        "city": "Paradip",
        "state": "Odisha",
        "orientation": "east",
        "center": {"lat": 20.262, "lng": 86.682},
        "harbor": {"lat": 20.262, "lng": 86.682},
        "zoom": 12,
        "corridor": "Paradip–Cuttack Hwy (NH 53)",
        "gates": ["Gate 1 (Iron Ore/Bulk)", "Gate 2 (General)", "Gate 3 (Container)", "Gate 4 (POL/Express)"],
    },
    "vizag": {
        "id": "vizag",
        "name": "Visakhapatnam Port",
        "short": "Vizag",
        "city": "Visakhapatnam",
        "state": "Andhra Pradesh",
        "orientation": "east",
        "center": {"lat": 17.686, "lng": 83.283},
        "harbor": {"lat": 17.686, "lng": 83.283},
        "zoom": 12,
        "corridor": "Vizag–Raipur Hwy (NH 26)",
        "gates": ["Gate 1 (Ore/Bulk)", "Gate 2 (General)", "Gate 3 (Container)", "Gate 4 (Rail/Express)"],
    },
    "chennai": {
        "id": "chennai",
        "name": "Chennai Port",
        "short": "Chennai",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "orientation": "east",
        "center": {"lat": 13.100, "lng": 80.293},
        "harbor": {"lat": 13.100, "lng": 80.293},
        "zoom": 12,
        "corridor": "Chennai–Bengaluru Hwy (NH 48)",
        "gates": ["Gate 1 (Main Entry)", "Gate 2 (General)", "Gate 3 (Container)", "Gate 4 (Coastal/Express)"],
    },
    "ennore": {
        "id": "ennore",
        "name": "Kamarajar Port (Ennore)",
        "short": "Ennore",
        "city": "Ennore",
        "state": "Tamil Nadu",
        "orientation": "east",
        "center": {"lat": 13.250, "lng": 80.320},
        "harbor": {"lat": 13.250, "lng": 80.320},
        "zoom": 12,
        "corridor": "Ennore–Chennai Port Corridor",
        "gates": ["Gate 1 (Coal/Bulk)", "Gate 2 (General)", "Gate 3 (Container/LNG)", "Gate 4 (Rail/Express)"],
    },
}

DEFAULT_PORT_ID = "voc"


def get_port(port_id: str) -> Dict[str, Any]:
    """Returns the port entry or raises KeyError for unknown ids."""
    return PORTS[port_id]


def is_valid_port(port_id: str) -> bool:
    return port_id in PORTS


def spawn_offsets(port_id: str, count: int = 10) -> List[Tuple[float, float]]:
    """Hand-vetted land-side (dlat, dlng) spawn offsets (see _SPAWN_DELTAS)."""
    table = _SPAWN_DELTAS[port_id]
    return [table[i % len(table)] for i in range(count)]


def spawn_point(port_id: str, index: int) -> Tuple[float, float]:
    """Absolute (lat, lng) for the index-th procedural truck of a port."""
    c = PORTS[port_id]["center"]
    dlat, dlng = _SPAWN_DELTAS[port_id][index % len(_SPAWN_DELTAS[port_id])]
    return (round(c["lat"] + dlat, 5), round(c["lng"] + dlng, 5))


def port_bbox(port_id: str) -> Tuple[float, float, float, float]:
    """Generous (min_lat, max_lat, min_lng, max_lng) bounds around a port center."""
    return sim_bounds(port_id)


def sim_boxes(port_id: str) -> List[Tuple[float, float, float, float]]:
    """All simulation boxes for a port (unknown ids fall back to VOC)."""
    return _SIM_BOXES.get(port_id, _SIM_BOXES[DEFAULT_PORT_ID])


def sim_bounds(port_id: str) -> Tuple[float, float, float, float]:
    """Primary box (first). Prefer sim_boxes()/in_sim_bounds()/clamp_point()."""
    return sim_boxes(port_id)[0]


def in_sim_bounds(port_id: str, lat: float, lng: float) -> bool:
    """True when a point lies inside ANY of the port's simulation boxes."""
    return any(
        min_lat <= lat <= max_lat and min_lng <= lng <= max_lng
        for min_lat, max_lat, min_lng, max_lng in sim_boxes(port_id)
    )


def clamp_point(port_id: str, lat: float, lng: float) -> Tuple[float, float]:
    """Snap a point into the best of the port's simulation boxes.

    Boxes split along latitude where coasts bend (VOC), so latitude
    containment wins over raw distance: a point north of the bend belongs in
    the northern (tighter) box even if the southern box edge is nearer.
    """
    best = None
    best_key = None
    for min_lat, max_lat, min_lng, max_lng in sim_boxes(port_id):
        clat = min(max_lat, max(min_lat, lat))
        clng = min(max_lng, max(min_lng, lng))
        lat_out = 0.0 if min_lat <= lat <= max_lat else min(abs(lat - min_lat), abs(lat - max_lat))
        key = (lat_out, (clat - lat) ** 2 + (clng - lng) ** 2)
        if best_key is None or key < best_key:
            best_key = key
            best = (round(clat, 5), round(clng, 5))
    assert best is not None
    return best


def port_list() -> List[Dict[str, Any]]:
    """Ordered lightweight list for the /api/ports endpoint + selector."""
    return [
        {
            "id": p["id"],
            "name": p["name"],
            "short": p["short"],
            "city": p["city"],
            "state": p["state"],
            "lat": p["center"]["lat"],
            "lng": p["center"]["lng"],
            "zoom": p["zoom"],
        }
        for p in PORTS.values()
    ]


# ─── Procedural per-port geography ──────────────────────────────────────────
# VOC keeps its hand-mapped geometry (byte-identical responses); other ports
# derive boundary/zones/gates/hotspots as fixed offsets from their harbor.

import hashlib as _hashlib

_GATE_TYPES = ["bulk", "general", "container", "express"]

# Exact VOC gate coordinates (must match gis.py VOC_PORT_GATES).
_VOC_GATE_COORDS: List[Tuple[float, float]] = [
    (8.7525, 78.1795),
    (8.7540, 78.1815),
    (8.7558, 78.1835),
    (8.7575, 78.1850),
]

_VOC_HOTSPOTS: List[Dict[str, Any]] = [
    {
        "name": "VOC Port Main Gate Bottleneck",
        "lat": 8.7520, "lng": 78.1830, "radius_km": 1.5,
        "delay_minutes": 25,
        "alternate_route": "Harbour Bypass Rd -> Green Gate 4",
    },
    {
        "name": "Madurai Hwy - Spic Nagar Junction",
        "lat": 8.8050, "lng": 78.1250, "radius_km": 1.2,
        "delay_minutes": 18,
        "alternate_route": "East Coast Expressway (NH 32) Corridor",
    },
]


def _stable_int(key: str) -> int:
    return int(_hashlib.md5(key.encode("utf-8")).hexdigest(), 16)


def port_gate_coords(port_id: str) -> List[Tuple[float, float]]:
    """4 gate (lat, lng) positions for a port (see _GATE_DELTAS)."""
    if port_id == DEFAULT_PORT_ID:
        return list(_VOC_GATE_COORDS)
    p = PORTS[port_id]
    h = p["harbor"]
    return [(round(h["lat"] + dlat, 5), round(h["lng"] + dlng, 5)) for dlat, dlng in _GATE_DELTAS[port_id]]


def port_gate_status(port_id: str, gate_index: int) -> Dict[str, Any]:
    """Deterministic queue/wait/status for a procedural gate."""
    h = _stable_int(f"{port_id}-gate-{gate_index}")
    queue = 2 + (h % 13)
    wait = 5 + (h % 41)
    status = "HOLD" if wait >= 30 else ("MODERATE" if wait >= 18 else ("NORMAL" if wait >= 10 else "FAST-PASS"))
    return {"queue_count": queue, "avg_wait_min": wait, "status": status}


# Inland direction per port as a (dlat, dlng) vector. Coasts bend and rivers
# cut across, so a single east/west sign is wrong (Paradip's sea is SOUTH,
# Cochin's land is NE, Mumbai's land is WEST of its east-facing docks).
_INLAND_VEC: Dict[str, Tuple[float, float]] = {
    "voc": (0.0, -1.0),
    "deendayal": (1.0, 0.2),
    "mumbai": (0.0, -1.0),
    "jnpt": (0.0, 1.0),
    "mormugao": (-0.7, 0.7),
    "mangalore": (0.0, 1.0),
    "cochin": (0.7, 0.7),
    "haldia": (0.3, -1.0),
    "paradip": (1.0, 0.0),
    "vizag": (0.7, -0.7),
    "chennai": (0.0, -1.0),
    "ennore": (0.0, -1.0),
}


def _inland_lng_sign(port_id: str) -> float:
    """+1 if land lies east of the harbor, -1 if west (from inland vector)."""
    return 1.0 if _INLAND_VEC[port_id][1] >= 0 else -1.0


def _inland_vec(port_id: str) -> Tuple[float, float]:
    """Normalized inland (dlat, dlng) unit vector for a port."""
    import math as _math
    dlat, dlng = _INLAND_VEC[port_id]
    n = _math.hypot(dlat, dlng) or 1.0
    return (dlat / n, dlng / n)


def port_hotspots(port_id: str) -> List[Dict[str, Any]]:
    """Congestion hotspots for the rerouter (VOC keeps hand-mapped ones)."""
    if port_id == DEFAULT_PORT_ID:
        return [dict(h) for h in _VOC_HOTSPOTS]
    p = PORTS[port_id]
    gates = port_gate_coords(port_id)
    vlat, vlng = _inland_vec(port_id)
    corridor_lat = round(p["center"]["lat"] + vlat * 0.035, 4)
    corridor_lng = round(p["center"]["lng"] + vlng * 0.035, 4)
    return [
        {
            "name": f"{p['short']} Gate 3 Bottleneck",
            "lat": gates[2][0], "lng": gates[2][1], "radius_km": 1.5,
            "delay_minutes": 20 + (_stable_int(port_id) % 11),
            "alternate_route": f"{p['corridor']} Bypass -> Gate 4",
        },
        {
            "name": f"{p['corridor']} Junction",
            "lat": corridor_lat, "lng": corridor_lng, "radius_km": 1.2,
            "delay_minutes": 14 + (_stable_int(port_id + "c") % 9),
            "alternate_route": f"{p['corridor']} Service Corridor",
        },
    ]


def _gates_centroid(port_id: str) -> Tuple[float, float]:
    """Land-side anchor: centroid of the port's gate coordinates."""
    gates = port_gate_coords(port_id)
    return (
        round(sum(g[0] for g in gates) / len(gates), 5),
        round(sum(g[1] for g in gates) / len(gates), 5),
    )


def port_geofence(port_id: str) -> List[Tuple[float, float]]:
    """Outer geofence polygon as (lat, lng) points (VOC: legacy frontend shape).

    Other ports center the hexagon on the gates centroid (land-side) instead
    of the harbor, so the boundary no longer sprawls across open water.
    """
    if port_id == DEFAULT_PORT_ID:
        return [
            (8.780, 78.155), (8.780, 78.195), (8.745, 78.200),
            (8.738, 78.190), (8.735, 78.165), (8.745, 78.150),
        ]
    vlat, vlng = _inland_vec(port_id)
    glat, glng = _gates_centroid(port_id)
    # Nudge the ring inland so it hugs the terminal instead of the surf.
    clat, clng = round(glat + vlat * 0.005, 5), round(glng + vlng * 0.005, 5)
    r = 0.010  # ~1.1km hexagon
    import math as _math
    pts = []
    for k in range(6):
        a = _math.radians(60 * k + 15)
        pts.append((round(clat + r * _math.sin(a), 5), round(clng + r * _math.cos(a), 5)))
    return pts


def port_zones(port_id: str) -> List[Dict[str, Any]]:
    """Terminal operational zones: [{id, label, coords, color}]."""
    if port_id == DEFAULT_PORT_ID:
        return [
            {"id": "cold_storage_alpha", "label": "Cold Storage Alpha",
             "coords": [(8.768, 78.165), (8.768, 78.172), (8.763, 78.172), (8.763, 78.165)], "color": "#00f5d4"},
            {"id": "cy_block_b", "label": "CY-Block B",
             "coords": [(8.758, 78.170), (8.758, 78.180), (8.752, 78.180), (8.752, 78.170)], "color": "#10b981"},
            {"id": "hazmat_yard", "label": "HazMat Yard 2",
             "coords": [(8.772, 78.178), (8.772, 78.184), (8.768, 78.184), (8.768, 78.178)], "color": "#ef4444"},
            {"id": "wh_east_berth", "label": "WH-East Berth 4",
             "coords": [(8.762, 78.185), (8.762, 78.193), (8.756, 78.193), (8.756, 78.185)], "color": "#f59e0b"},
        ]
    # Zones march inland from the gates centroid along the inland vector.
    vlat, vlng = _inland_vec(port_id)
    glat, glng = _gates_centroid(port_id)
    colors = ["#00f5d4", "#10b981", "#ef4444", "#f59e0b"]
    labels = ["Cold Storage Alpha", "CY-Block B", "HazMat Yard 2", "WH-East Berth 4"]
    ids = ["cold_storage_alpha", "cy_block_b", "hazmat_yard", "wh_east_berth"]
    zones = []
    for i in range(4):
        step = 0.004 * (1 + i)
        cy = glat + vlat * step
        cx = glng + vlng * step
        half = 0.0018
        zones.append({
            "id": ids[i], "label": labels[i], "color": colors[i],
            "coords": [
                (round(cy - half, 5), round(cx - half, 5)),
                (round(cy - half, 5), round(cx + half, 5)),
                (round(cy + half, 5), round(cx + half, 5)),
                (round(cy + half, 5), round(cx - half, 5)),
            ],
        })
    return zones
