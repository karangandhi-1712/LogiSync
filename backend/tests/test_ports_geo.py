"""Land-side guarantees for the multi-port rollout.

Every procedurally generated truck position (and the VOC legacy box) must lie
inside its port's sim bounds. If this test fails, someone edited a spawn table
or bound without checking the coastline — trucks would render in the sea.
"""

from app.ports import PORTS, sim_bounds, spawn_point, in_sim_bounds, port_gate_coords
from app.seed import build_port_trucks, voc_legacy_position


def test_all_spawn_points_inside_bounds():
    bad = []
    for port_id, port in PORTS.items():
        if port_id == "voc":
            continue
        c = port["center"]
        for i in range(10):
            lat, lng = spawn_point(port_id, i)
            # Sanity: deltas stay near the port (wide spread, not drifted).
            assert abs(lat - c["lat"]) < 0.08, f"{port_id} spawn {i} lat too far"
            assert abs(lng - c["lng"]) < 0.08, f"{port_id} spawn {i} lng too far"
            if not in_sim_bounds(port_id, lat, lng):
                bad.append(f"{port_id}-trk-{i + 1:02d} at ({lat},{lng})")
    assert not bad, f"trucks outside sim bounds (would render in water): {bad}"


def test_voc_legacy_box_inside_bounds():
    bad = []
    for i in range(7, 25):
        lat, lng = voc_legacy_position(i)
        if not in_sim_bounds("voc", lat, lng):
            bad.append(f"trk-{i:02d} at ({lat},{lng})")
    assert not bad, f"VOC legacy trucks outside bounds: {bad}"


def test_build_port_trucks_match_spawn_points():
    for port_id in PORTS:
        if port_id == "voc":
            continue
        for i, trk in enumerate(build_port_trucks(port_id)):
            lat, lng = spawn_point(port_id, i)
            assert trk["lat"] == lat and trk["lng"] == lng, f"{trk['id']} diverges from spawn table"
            assert trk["port_id"] == port_id


def test_water_side_caps_are_tight():
    # Water-side caps must sit at/inside the harbor edge, not kilometers out.
    from app.ports import sim_boxes, clamp_point
    voc_boxes = sim_boxes("voc")
    assert len(voc_boxes) == 2, "VOC needs a split box: quay box + northern box"
    assert voc_boxes[0][3] <= 78.190, "VOC south box must include the quay, nothing more"
    assert voc_boxes[1][3] <= 78.162, "VOC north box must stay west of the Van Thivu shoreline"
    mumbai = sim_bounds("mumbai")
    assert mumbai[3] <= 72.934, "Mumbai max_lng must stay west of Thane Creek water"
    assert mumbai[0] >= 18.875, "Mumbai min_lat must stay north of the Colaba sea tip"
    jnpt = sim_bounds("jnpt")
    assert jnpt[2] >= 72.952, "JNPT min_lng must stay east of the creek fingers"
    assert jnpt[0] >= 18.90, "JNPT min_lat must stay north of Dharamtar creek"
    mangalore = sim_bounds("mangalore")
    assert mangalore[2] >= 74.796, "Mangalore min_lng must stay east of the surf line"
    haldia = sim_bounds("haldia")
    assert haldia[3] <= 88.060, "Haldia max_lng must stay west of the Hooghly channel"
    chennai = sim_bounds("chennai")
    assert chennai[3] <= 80.288, "Chennai max_lng must stay west of the surf line"
    ennore = sim_bounds("ennore")
    assert ennore[3] <= 80.315, "Ennore max_lng must stay west of the surf line"


def test_quay_trucks_are_inside_bounds():
    # Hand-placed VOC quay trucks (gates area) must NOT be "repaired" away.
    assert in_sim_bounds("voc", 8.7518, 78.1815), "trk-02 quay position"
    assert in_sim_bounds("voc", 8.7558, 78.1835), "trk-03 Gate 3 position"
    assert in_sim_bounds("voc", 8.7510, 78.1870), "trk-05 terminal position"


def test_clamp_point_snaps_to_nearest_box():
    from app.ports import clamp_point
    # Open sea NE of VOC snaps into the northern (tighter) box.
    lat, lng = clamp_point("voc", 8.830, 78.210)
    assert in_sim_bounds("voc", lat, lng)
    assert lng <= 78.162
    # In-bounds points pass through untouched.
    assert clamp_point("voc", 8.7642, 78.1348) == (8.7642, 78.1348)


def test_each_port_has_four_gates():
    for port_id in PORTS:
        assert len(port_gate_coords(port_id)) == 4, port_id


def _deg_dist(a, b):
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5


def test_overlays_hug_the_terminal():
    # Zones are facilities: every corner must sit inside the port's sim boxes
    # (land). The geofence rings the terminal and may only graze quay water,
    # so it is checked for tightness around the gates centroid instead.
    from app.ports import port_geofence, port_zones, in_sim_bounds
    for port_id in PORTS:
        if port_id == "voc":
            continue
        gates = port_gate_coords(port_id)
        clat = sum(g[0] for g in gates) / len(gates)
        clng = sum(g[1] for g in gates) / len(gates)
        for pt in port_geofence(port_id):
            assert _deg_dist(pt, (clat, clng)) < 0.016, f"{port_id} fence sprawls offshore: {pt}"
        for z in port_zones(port_id):
            for pt in z["coords"]:
                assert in_sim_bounds(port_id, pt[0], pt[1]), \
                    f"{port_id} zone {z['id']} in water: {pt}"
