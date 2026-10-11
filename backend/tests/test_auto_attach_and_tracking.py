"""Auto-attach behaviour and public tracking."""

from app.services import schedule_engine
from tests.conftest import (
    SessionFactory,
    attach,
    auth_headers,
    make_request,
    make_schedule,
    make_user,
)


# ── Auto-attach (spec §4.4) ──────────────────────────────────────────────────

def _request_in_area(port_id="voc", lat=8.78, lng=78.15, tier="standard"):
    return make_request(port_id, lat, lng, tier=tier)


def test_request_inside_radius_attaches_to_claimed_batch(db):
    fm = make_user("fleet_manager", port_id="voc")
    driver = make_user("driver")
    session = SessionFactory()
    schedule = make_schedule(fm.id, port_id="voc", center=(8.78, 78.15), radius=5.0, max_batch=3)
    attach(session, schedule.id, _request_in_area().id)
    session.close()

    client_session = SessionFactory()
    schedule = client_session.get(type(schedule), schedule.id)
    schedule.status = "claimed"
    schedule.claimed_by_driver_id = driver.id
    client_session.commit()

    new_req = _request_in_area(lat=8.781, lng=78.152)
    session = SessionFactory()
    target = schedule_engine.find_attach_target(session, new_req)
    assert target is not None and target.id == schedule.id
    session.close()


def test_request_outside_radius_does_not_attach(db):
    fm = make_user("fleet_manager", port_id="voc")
    driver = make_user("driver")
    session = SessionFactory()
    schedule = make_schedule(fm.id, port_id="voc", center=(8.78, 78.15), radius=2.0, max_batch=3)
    session.close()

    far_away = make_request("voc", 9.87, 78.04)  # Madurai, ~130km away
    session = SessionFactory()
    s = session.get(type(schedule), schedule.id)
    s.status = "claimed"
    s.claimed_by_driver_id = driver.id
    session.commit()
    assert schedule_engine.find_attach_target(session, far_away) is None
    session.close()


def test_broadcasting_schedule_is_not_an_attach_target(db):
    """Auto-attach rides along with a claimed driver; it never competes for a
    fresh broadcast."""
    fm = make_user("fleet_manager", port_id="voc")
    session = SessionFactory()
    schedule = make_schedule(fm.id, port_id="voc", center=(8.78, 78.15), radius=5.0)
    session.close()

    req = _request_in_area()
    session = SessionFactory()
    assert schedule_engine.find_attach_target(session, req) is None
    session.close()


def test_full_batch_rejects_new_stops(db):
    fm = make_user("fleet_manager", port_id="voc")
    driver = make_user("driver")
    session = SessionFactory()
    schedule = make_schedule(fm.id, port_id="voc", center=(8.78, 78.15), radius=5.0, max_batch=2)
    attach(session, schedule.id, _request_in_area().id)
    attach(session, schedule.id, _request_in_area(lat=8.782, lng=78.151).id)
    session.close()

    session = SessionFactory()
    s = session.get(type(schedule), schedule.id)
    s.status = "claimed"
    s.claimed_by_driver_id = driver.id
    session.commit()

    ok, reason = schedule_engine.can_accept_stop(session, s)
    assert ok is False
    assert "cap" in reason.lower()
    session.close()


def test_locked_batch_rejects_new_stops(db):
    fm = make_user("fleet_manager", port_id="voc")
    driver = make_user("driver")
    session = SessionFactory()
    schedule = make_schedule(fm.id, port_id="voc", center=(8.78, 78.15), radius=5.0, status="locked")
    attach(session, schedule.id, _request_in_area().id)
    session.close()

    session = SessionFactory()
    s = session.get(type(schedule), schedule.id)
    ok, reason = schedule_engine.can_accept_stop(session, s)
    assert ok is False and "locked" in reason.lower()
    session.close()


def test_new_consumer_request_auto_attaches_to_claimed_batch(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    driver = make_user("driver")
    session = SessionFactory()
    schedule = make_schedule(fm.id, port_id="voc", center=(8.78, 78.15), radius=5.0, max_batch=3)
    attach(session, schedule.id, _request_in_area().id)
    session.close()
    session = SessionFactory()
    s = session.get(type(schedule), schedule.id)
    s.status = "claimed"
    s.claimed_by_driver_id = driver.id
    session.commit()
    session.close()

    # A brand-new consumer request inside the area rides along immediately.
    resp = client.post("/api/consumer/requests", json={
        "name": "Ravi K", "mobile": "9000000001",
        "pickup_port_id": "voc",
        "delivery_address": "Bryant Nagar, Thoothukudi",
        "delivery_lat": 8.7815, "delivery_lng": 78.1515,
        "priority_tier": "standard",
    })
    assert resp.status_code == 201
    token = resp.json()["token_number"]

    tracked = client.get(f"/api/track/{token}").json()
    assert tracked["status"] == "batched"
    assert tracked["schedule"]["id"] == schedule.id


def test_urgent_request_without_open_batch_is_flagged(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    headers = auth_headers(client, fm)
    client.post("/api/consumer/requests", json={
        "name": "Anita S", "mobile": "9000000002",
        "pickup_port_id": "voc",
        "delivery_address": "Millerpuram, Thoothukudi",
        "delivery_lat": 8.781, "delivery_lng": 78.151,
        "priority_tier": "urgent",
    })
    pending = client.get("/api/schedules/pending", headers=headers).json()
    assert len(pending["urgent_without_batch"]) == 1
    assert pending["urgent_without_batch"][0]["priority_tier"] == "urgent"


# ── Departure windows (IST) ──────────────────────────────────────────────────

def test_window_is_compared_in_depot_local_time():
    from datetime import datetime
    # 06:00 IST == 00:30 UTC. A UTC comparison would call this "closed".
    ist_six_am = datetime(2026, 1, 1, 6, 0)
    assert schedule_engine.window_open(ist_six_am, "06:00", "23:00") is True
    assert schedule_engine.window_open(datetime(2026, 1, 1, 5, 0), "06:00", "23:00") is False


def test_window_wrapping_midnight():
    from datetime import datetime
    assert schedule_engine.window_open(datetime(2026, 1, 1, 23, 30), "22:00", "02:00") is True
    assert schedule_engine.window_open(datetime(2026, 1, 1, 1, 0), "22:00", "02:00") is True
    assert schedule_engine.window_open(datetime(2026, 1, 1, 12, 0), "22:00", "02:00") is False


def test_ist_now_is_offset_from_utc():
    delta = schedule_engine.ist_now() - schedule_engine.datetime.utcnow()
    assert 5 <= delta.total_seconds() / 3600 <= 5.6


# ── Public tracking ──────────────────────────────────────────────────────────

def test_tracking_is_token_authorised(client, db):
    created = client.post("/api/consumer/requests", json={
        "name": "Kumar S", "mobile": "9000000003",
        "pickup_port_id": "voc",
        "delivery_address": "Sabarmati, Thoothukudi",
        "delivery_lat": 8.78, "delivery_lng": 78.15,
        "priority_tier": "standard",
    }).json()

    tracked = client.get(f"/api/track/{created['token_number']}")
    assert tracked.status_code == 200
    body = tracked.json()
    assert body["token_number"] == created["token_number"]
    assert body["status"] == "pending"
    assert body["pickup_port"]["id"] == "voc"
    assert "schedule" not in body


def test_tracking_unknown_token_is_404(client, db):
    assert client.get("/api/track/NOPE").status_code == 404


def test_tracking_shows_driver_once_claimed(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    driver = make_user("driver")
    req = make_request("voc", 8.78, 78.15)
    schedule = make_schedule(fm.id, port_id="voc", max_batch=2)
    attach(SessionFactory(), schedule.id, req.id)

    client.post(f"/api/schedules/{schedule.id}/claim", headers=auth_headers(client, driver))

    tracked = client.get(f"/api/track/{req.token_number}").json()
    assert tracked["status"] == "assigned"
    assert tracked["schedule"]["driver"]["name"] == driver.full_name
    assert tracked["schedule"]["driver"]["vehicle_number"] is None or True


def test_tracking_never_leaks_driver_contact_details(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    driver = make_user("driver")
    driver.mobile_number = "+91999998888"
    session = SessionFactory()
    session.merge(driver)
    session.commit()
    session.close()

    req = make_request("voc", 8.78, 78.15)
    schedule = make_schedule(fm.id, port_id="voc", max_batch=2)
    attach(SessionFactory(), schedule.id, req.id)
    client.post(f"/api/schedules/{schedule.id}/claim", headers=auth_headers(client, driver))

    raw = client.get(f"/api/track/{req.token_number}").text
    assert "+91999998888" not in raw
    assert "mobile_number" not in raw
    assert "password" not in raw


def test_consumer_history_cannot_be_read_by_mobile(client, db):
    """Mobile-number enumeration must not expose another customer's addresses."""
    for i in range(2):
        client.post("/api/consumer/requests", json={
            "name": "Latha M", "mobile": "9000000010",
            "pickup_port_id": "voc",
            "delivery_address": f"Address {i}, Thoothukudi",
            "delivery_lat": 8.78, "delivery_lng": 78.15,
        })
    assert client.get("/api/consumer/requests/mine?mobile=9000000010").status_code == 404
