"""Role boundaries, depot registry parity, and marketplace analytics."""

from sqlalchemy import inspect

from app.ports import haversine_km, nearest_port, port_list, PORTS
from tests.conftest import (
    TEST_ENGINE,
    SessionFactory,
    auth_headers,
    make_request,
    make_schedule,
    make_user,
)


# ── Roles ────────────────────────────────────────────────────────────────────

def test_self_registration_is_driver_only(client, db):
    payload = {
        "full_name": "Kumar V", "vehicle_number": "TN04E8821",
        "vehicle_type": "container_truck", "mobile": "9876500011",
        "email": "kumar@example.com", "password": "Strong@123",
        "role": "port_admin",
    }
    resp = client.post("/api/auth/register", json=payload)
    assert resp.status_code == 403

    payload["role"] = "driver"
    ok = client.post("/api/auth/register", json=payload)
    assert ok.status_code == 201, ok.text
    assert ok.json()["role"] == "driver"


def test_registration_rejects_invalid_vehicle_and_password(client, db):
    base = {
        "full_name": "Kumar V", "mobile": "9876500012",
        "email": "kumar2@example.com", "password": "Strong@123",
    }
    bad_vehicle = client.post("/api/auth/register", json={**base, "vehicle_number": "XYZ"})
    assert bad_vehicle.status_code == 422

    weak = client.post("/api/auth/register", json={
        **base, "vehicle_number": "TN04E8822", "password": "weak",
    })
    assert weak.status_code == 422


def test_mobile_number_is_unique(client, db):
    client.post("/api/auth/register", json={
        "full_name": "One Driver", "vehicle_number": "TN04E8801",
        "mobile": "9876500020", "email": "one@example.com", "password": "Strong@123",
    })
    duplicate = client.post("/api/auth/register", json={
        "full_name": "Two Driver", "vehicle_number": "TN04E8802",
        "mobile": "9876500020", "email": "two@example.com", "password": "Strong@123",
    })
    assert duplicate.status_code == 409


def test_mobile_unique_index_exists():
    indexes = inspect(TEST_ENGINE).get_indexes("users")
    assert any(
        idx["column_names"] == ["mobile_number"] and idx["unique"]
        for idx in indexes
    ), "users.mobile_number must carry a UNIQUE index"


def test_deactivated_account_cannot_log_in(client, db):
    admin = make_user("port_admin")
    session = SessionFactory()
    row = session.get(type(admin), admin.id)
    row.is_active = False
    session.commit()
    session.close()

    resp = client.post("/api/auth/login", json={
        "identifier": admin.email, "password": "Test@1234",
    })
    assert resp.status_code == 403


def test_fleet_manager_is_locked_to_their_port(client, db):
    fm_a = make_user("fleet_manager", port_id="voc")
    fm_b = make_user("fleet_manager", port_id="chennai")
    schedule = make_schedule(fm_a.id, port_id="voc", max_batch=2)
    attach_helper(schedule.id, make_request("voc", 8.78, 78.15).id)

    resp = client.get(f"/api/schedules/{schedule.id}", headers=auth_headers(client, fm_b))
    assert resp.status_code == 403


def test_port_admin_can_read_any_schedule(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    admin = make_user("port_admin")
    schedule = make_schedule(fm.id, port_id="voc", max_batch=2)
    attach_helper(schedule.id, make_request("voc", 8.78, 78.15).id)
    assert client.get(
        f"/api/schedules/{schedule.id}", headers=auth_headers(client, admin)
    ).status_code == 200


def attach_helper(schedule_id, request_id):
    from tests.conftest import attach
    session = SessionFactory()
    attach(session, schedule_id, request_id)
    session.close()


# ── Depot registry parity ────────────────────────────────────────────────────

def test_ports_table_matches_the_registry(client, db):
    rows = client.get("/api/ports").json()
    assert len(rows) == len(port_list()) == 12
    assert {r["id"] for r in rows} == set(PORTS)


def test_nearest_port_for_thoothukudi_is_voc():
    assert nearest_port(8.7642, 78.1348) == "voc"


def test_nearest_port_for_mumbai_harbour_is_mumbai():
    # Mumbai Port's own harbour approach — not Bhiwandi, which really is
    # nearer JNPT and should resolve to jnpt.
    assert nearest_port(18.9200, 72.8400) == "mumbai"


def test_nearest_port_for_nhava_sheva_is_jnpt():
    assert nearest_port(18.9450, 72.9400) == "jnpt"


def test_haversine_zero_for_same_point():
    assert haversine_km(8.76, 78.13, 8.76, 78.13) == 0.0


def test_haversine_known_distance():
    # Thoothukudi → Chennai is ~525 km great-circle.
    km = haversine_km(8.7642, 78.1348, 13.1000, 80.2930)
    assert 500 < km < 560


def test_coastal_endpoint(client, db):
    rows = client.get("/api/ports/coastal").json()
    assert rows and all(r["state"] in (
        "Tamil Nadu", "Andhra Pradesh", "Odisha", "West Bengal"
    ) for r in rows)


def test_unknown_port_detail_is_404(client, db):
    assert client.get("/api/ports/atlantis").status_code == 404


# ── Legacy surface is gone ───────────────────────────────────────────────────

def test_removed_routes_return_404(client, db):
    """The slot/gate/fleet world must not linger as half-wired routes."""
    gone = [
        "/api/slots", "/api/slots/congestion", "/api/slots/book",
        "/api/fleet/trucks", "/api/gis/gates", "/api/gis/layers",
        "/api/operations/containers", "/api/operations/shipments",
        "/api/notifications", "/api/bookings", "/api/bookings/mine",
        "/api/analytics/kpis", "/api/analytics/telemetry-stats",
        "/api/analytics/charts/congestion-heatmap", "/api/maps/directions",
        "/api/maps/places/autocomplete",
    ]
    for path in gone:
        resp = client.get(path)
        assert resp.status_code == 404, f"{path} returned {resp.status_code}, expected 404"


def test_healthz_reports_the_marketplace(client, db):
    body = client.get("/healthz").json()
    assert body["status"] == "healthy"
    assert "Marketplace" in body["service"]


# ── Analytics ────────────────────────────────────────────────────────────────

def test_analytics_kpis_are_real_aggregates(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    driver = make_user("driver")
    schedule = make_schedule(fm.id, port_id="voc", max_batch=4)
    attach_helper(schedule.id, make_request("voc", 8.78, 78.15).id)
    attach_helper(schedule.id, make_request("voc", 8.79, 78.16, tier="express").id)

    client.post(f"/api/schedules/{schedule.id}/claim", headers=auth_headers(client, driver))

    body = client.get("/api/analytics/delivery/kpis?period=7d",
                      headers=auth_headers(client, fm)).json()
    assert body["port_id"] == "voc"
    assert body["total_requests"] == 2
    assert body["total_schedules"] == 1
    assert body["avg_time_to_claim_min"] >= 0
    assert body["avg_batch_fill_pct"] == 50.0
    assert "standard" in body["on_time_rate_by_tier"]
    assert body["drivers_total"] == 1
    assert body["driver_utilisation_pct"] == 100.0


def test_fleet_manager_cannot_read_other_port_analytics(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    resp = client.get("/api/analytics/delivery/kpis?port=chennai",
                      headers=auth_headers(client, fm))
    assert resp.status_code == 403


def test_analytics_ports_overview_is_admin_only(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    admin = make_user("port_admin")
    assert client.get("/api/analytics/delivery/ports",
                      headers=auth_headers(client, fm)).status_code == 403
    assert client.get("/api/analytics/delivery/ports",
                      headers=auth_headers(client, admin)).status_code == 200


def test_analytics_volume_series(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    make_request("voc", 8.78, 78.15)
    body = client.get("/api/analytics/delivery/volume?period=7d",
                      headers=auth_headers(client, fm)).json()
    assert len(body["dates"]) == 7
    assert sum(body["submitted"]) == 1


def test_analytics_areas_ranks_clusters(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    schedule = make_schedule(fm.id, port_id="voc", max_batch=3)
    session = SessionFactory()
    session.get(type(schedule), schedule.id).area_label = "Bryant Nagar belt"
    session.commit()
    session.close()
    attach_helper(schedule.id, make_request("voc", 8.78, 78.15).id)

    body = client.get("/api/analytics/delivery/areas",
                      headers=auth_headers(client, fm)).json()
    assert body["areas"][0]["area_label"] == "Bryant Nagar belt"
    assert body["areas"][0]["stop_total"] == 1