"""Full marketplace lifecycle: consumer request → broadcast → claim → deliver.

Walks the loop all four actors perform, so a regression anywhere in the chain
shows up as one failing end-to-end assertion rather than a scattered failure.
"""

from tests.conftest import (
    SessionFactory,
    attach,
    auth_headers,
    make_request,
    make_schedule,
    make_user,
)


def _request_json(**overrides):
    body = {
        "name": "Meena R",
        "mobile": "9876543210",
        "pickup_port_id": "voc",
        "delivery_address": "Bryant Nagar, Thoothukudi",
        "delivery_lat": 8.782,
        "delivery_lng": 78.152,
        "package_type": "Carton",
        "priority_tier": "express",
        "requested_window_start": "10:00",
        "requested_window_end": "18:00",
    }
    body.update(overrides)
    return body


# ── Consumer intake ──────────────────────────────────────────────────────────

def test_consumer_submit_returns_tracking_token(client, db):
    resp = client.post("/api/consumer/requests", json=_request_json())
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["token_number"].startswith("LG-")
    assert body["track_url"] == f"/track/{body['token_number']}"
    assert body["status"] == "pending"
    assert body["priority_tier"] == "express"
    assert body["tier_fee"] == 500


def test_consumer_intake_needs_no_auth(client, db):
    # No Authorization header anywhere in this test — that is the point.
    assert client.get("/api/ports").status_code == 200
    assert client.post("/api/consumer/requests", json=_request_json()).status_code == 201


def test_consumer_submit_rejects_unknown_port(client, db):
    resp = client.post("/api/consumer/requests", json=_request_json(pickup_port_id="atlantis"))
    assert resp.status_code == 400


def test_consumer_submit_rejects_bad_tier(client, db):
    resp = client.post("/api/consumer/requests", json=_request_json(priority_tier="vip"))
    assert resp.status_code == 422


def test_repeat_consumer_is_deduplicated_by_mobile(client, db):
    first = client.post("/api/consumer/requests", json=_request_json()).json()
    second = client.post("/api/consumer/requests", json=_request_json()).json()

    from app.models.consumer import ConsumerModel
    session = SessionFactory()
    consumers = session.query(ConsumerModel).all()
    assert len(consumers) == 1
    assert first["token_number"] != second["token_number"]
    session.close()


def test_manual_intake_pins_fleet_managers_port(client, db):
    fm = make_user("fleet_manager", port_id="chennai")
    headers = auth_headers(client, fm)
    # The client asks for voc; the server must override with chennai.
    resp = client.post("/api/consumer/requests/manual", headers=headers,
                       json=_request_json(pickup_port_id="voc"))
    assert resp.status_code == 201, resp.text
    assert resp.json()["pickup_port_id"] == "chennai"
    assert resp.json()["created_by"] == "fleet_manager"


def test_fleet_manager_history_is_scoped_to_their_port(client, db):
    fm_voc = make_user("fleet_manager", port_id="voc")
    headers = auth_headers(client, fm_voc)
    r = make_request("voc", 8.78, 78.15)
    other = make_request("chennai", 13.1, 80.3)
    rows = client.get("/api/deliveries", headers=headers).json()
    ids = {row["id"] for row in rows}
    assert r.id in ids
    assert other.id not in ids


# ── Fleet manager: create + broadcast ─────────────────────────────────────────

def test_fm_creates_broadcasting_schedule(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    headers = auth_headers(client, fm)
    r1 = make_request("voc", 8.78, 78.15)
    r2 = make_request("voc", 8.79, 78.16, tier="urgent")

    resp = client.post("/api/schedules", headers=headers, json={
        "port_id": "voc",
        "area_label": "Thoothukudi North — Bryant Nagar belt",
        "area_center_lat": 8.78, "area_center_lng": 78.15,
        "radius_km": 6.0,
        "departure_window_start": "09:00", "departure_window_end": "18:00",
        "max_batch_size": 4,
        "request_ids": [r1.id, r2.id],
    })
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "broadcasting"
    assert body["stop_count"] == 2
    assert body["estimated_earnings"] > 0

    session = SessionFactory()
    for req_id in (r1.id, r2.id):
        assert session.get(type(r1), req_id).status == "batched"
    session.close()


def test_fm_cannot_create_schedule_for_another_port(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    headers = auth_headers(client, fm)
    resp = client.post("/api/schedules", headers=headers, json={
        "port_id": "chennai",
        "area_label": "Elsewhere",
        "area_center_lat": 13.1, "area_center_lng": 80.3,
        "radius_km": 5.0,
        "departure_window_start": "09:00", "departure_window_end": "18:00",
        "request_ids": [make_request("chennai", 13.1, 80.3).id],
    })
    assert resp.status_code == 403


def test_schedule_rejects_non_pending_request(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    headers = auth_headers(client, fm)
    first = make_request("voc", 8.78, 78.15)
    client.post("/api/schedules", headers=headers, json={
        "port_id": "voc", "area_label": "Area A",
        "area_center_lat": 8.78, "area_center_lng": 78.15, "radius_km": 5.0,
        "departure_window_start": "09:00", "departure_window_end": "18:00",
        "request_ids": [first.id],
    })
    # Same request again — it is no longer pending.
    resp = client.post("/api/schedules", headers=headers, json={
        "port_id": "voc", "area_label": "Area B",
        "area_center_lat": 8.78, "area_center_lng": 78.15, "radius_km": 5.0,
        "departure_window_start": "09:00", "departure_window_end": "18:00",
        "request_ids": [first.id],
    })
    assert resp.status_code == 409


def test_batch_cap_is_not_clamped_to_current_stop_count(client, db):
    """A batch may start below its cap so later requests can auto-attach."""
    fm = make_user("fleet_manager", port_id="voc")
    headers = auth_headers(client, fm)
    only_one = make_request("voc", 8.78, 78.15)
    resp = client.post("/api/schedules", headers=headers, json={
        "port_id": "voc", "area_label": "Solo run",
        "area_center_lat": 8.78, "area_center_lng": 78.15, "radius_km": 5.0,
        "departure_window_start": "00:00", "departure_window_end": "23:59",
        "max_batch_size": 4,
        "request_ids": [only_one.id],
    })
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["stop_count"] == 1
    # Cap stays at 4 so the remaining 3 slots are fillable by auto-attach.
    assert body["max_batch_size"] == 4
    assert body["estimated_earnings"] > 0


# ── Driver: feed → claim → execute ───────────────────────────────────────────

def test_driver_feed_shows_broadcasting_batches(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    schedule = make_schedule(fm.id, max_batch=2)
    attach(SessionFactory(), schedule.id, make_request("voc", 8.78, 78.15).id)
    driver = make_user("driver")
    headers = auth_headers(client, driver)

    feed = client.get("/api/schedules/feed/broadcasting", headers=headers).json()
    assert [s["id"] for s in feed] == [schedule.id]


def test_driver_feed_hides_a_batch_they_already_claimed(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    schedule = make_schedule(fm.id, max_batch=2)
    attach(SessionFactory(), schedule.id, make_request("voc", 8.78, 78.15).id)
    driver = make_user("driver")
    headers = auth_headers(client, driver)

    assert len(client.get("/api/schedules/feed/broadcasting", headers=headers).json()) == 1
    assert client.post(f"/api/schedules/{schedule.id}/claim", headers=headers).status_code == 200
    assert client.get("/api/schedules/feed/broadcasting", headers=headers).json() == []


def test_fleet_manager_cannot_claim(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    headers = auth_headers(client, fm)
    schedule = make_schedule(fm.id, max_batch=2)
    attach(SessionFactory(), schedule.id, make_request("voc", 8.78, 78.15).id)
    assert client.post(f"/api/schedules/{schedule.id}/claim", headers=headers).status_code == 403


def test_full_delivery_loop(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    driver = make_user("driver")
    fm_h = auth_headers(client, fm)
    drv_h = auth_headers(client, driver)

    stops = [make_request("voc", 8.780 + i * 0.002, 78.150, tier=t)
             for i, t in enumerate(["standard", "express", "urgent"])]

    created = client.post("/api/schedules", headers=fm_h, json={
        "port_id": "voc", "area_label": "North belt",
        "area_center_lat": 8.782, "area_center_lng": 78.150, "radius_km": 6.0,
        "departure_window_start": "00:00", "departure_window_end": "23:59",
        "max_batch_size": 4,
        "request_ids": [s.id for s in stops],
    }).json()
    schedule_id = created["id"]
    assert created["stop_count"] == 3

    # Claim
    claimed = client.post(f"/api/schedules/{schedule_id}/claim", headers=drv_h).json()
    assert claimed["status"] == "claimed"
    assert claimed["driver"]["id"] == driver.id
    assert all(s["status"] == "assigned" for s in claimed["stops"])

    # Depart → locks, assigns stop_sequence, computes a route
    departed = client.post(f"/api/schedules/{schedule_id}/depart", headers=drv_h).json()
    assert departed["status"] == "in_progress"
    sequences = sorted(s["stop_sequence"] for s in departed["stops"])
    assert sequences == [1, 2, 3]
    assert departed["optimized_route"]["polyline"], "expected route geometry"
    assert departed["final_earnings"] > 0

    # Walk each stop through the chain in sequence order.
    ordered = sorted(departed["stops"], key=lambda s: s["stop_sequence"])
    for stop in ordered:
        step = client.patch(f"/api/deliveries/{stop['id']}/status", headers=drv_h,
                            json={"status": "picked_up"})
        assert step.status_code == 200, step.text
        step = client.patch(f"/api/deliveries/{stop['id']}/status", headers=drv_h,
                            json={"status": "en_route"})
        assert step.status_code == 200, step.text
        step = client.patch(f"/api/deliveries/{stop['id']}/status", headers=drv_h,
                            json={"status": "delivered"})
        assert step.status_code == 200, step.text
        assert step.json()["status"] == "delivered"

    # Last stop closing completes the batch and frees the driver.
    mine = client.get("/api/schedules/feed/mine", headers=drv_h).json()
    assert mine[0]["status"] == "completed"
    assert all(s["status"] == "delivered" for s in mine[0]["stops"])

    me = client.get("/api/auth/me", headers=drv_h).json()
    assert me["availability_status"] == "available"


def test_failed_stop_requires_a_reason(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    driver = make_user("driver")
    schedule = make_schedule(fm.id, max_batch=2)
    stop = make_request("voc", 8.78, 78.15)
    attach(SessionFactory(), schedule.id, stop.id)
    drv_h = auth_headers(client, driver)
    client.post(f"/api/schedules/{schedule.id}/claim", headers=drv_h)
    client.post(f"/api/schedules/{schedule.id}/depart", headers=drv_h)

    for status in ("picked_up", "en_route"):
        client.patch(f"/api/deliveries/{stop.id}/status", headers=drv_h, json={"status": status})

    no_reason = client.patch(f"/api/deliveries/{stop.id}/status", headers=drv_h,
                             json={"status": "failed"})
    assert no_reason.status_code == 422

    with_reason = client.patch(f"/api/deliveries/{stop.id}/status", headers=drv_h,
                               json={"status": "failed", "reason": "Customer not reachable"})
    assert with_reason.status_code == 200
    assert with_reason.json()["failure_reason"] == "Customer not reachable"
    # A failed stop is terminal, so the batch completes too.
    assert with_reason.json()["schedule_completed"] is True


def test_illegal_status_jump_is_rejected(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    driver = make_user("driver")
    schedule = make_schedule(fm.id, max_batch=2)
    stop = make_request("voc", 8.78, 78.15)
    attach(SessionFactory(), schedule.id, stop.id)
    drv_h = auth_headers(client, driver)
    client.post(f"/api/schedules/{schedule.id}/claim", headers=drv_h)

    # assigned → delivered skips two steps
    resp = client.patch(f"/api/deliveries/{stop.id}/status", headers=drv_h,
                        json={"status": "delivered"})
    assert resp.status_code == 409
    assert "assigned" in resp.json()["detail"]


def test_driver_cannot_touch_another_drivers_batch(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    d1 = make_user("driver")
    d2 = make_user("driver")
    schedule = make_schedule(fm.id, max_batch=2)
    stop = make_request("voc", 8.78, 78.15)
    attach(SessionFactory(), schedule.id, stop.id)

    h1 = auth_headers(client, d1)
    h2 = auth_headers(client, d2)
    client.post(f"/api/schedules/{schedule.id}/claim", headers=h1)

    resp = client.patch(f"/api/deliveries/{stop.id}/status", headers=h2, json={"status": "picked_up"})
    assert resp.status_code == 403


def test_only_driver_can_deliver_but_fm_can_cancel(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    driver = make_user("driver")
    schedule = make_schedule(fm.id, max_batch=2)
    stop = make_request("voc", 8.78, 78.15)
    attach(SessionFactory(), schedule.id, stop.id)
    h_drv = auth_headers(client, driver)
    h_fm = auth_headers(client, fm)
    client.post(f"/api/schedules/{schedule.id}/claim", headers=h_drv)

    assert client.patch(f"/api/deliveries/{stop.id}/status", headers=h_fm,
                        json={"status": "delivered"}).status_code == 403
    assert client.post(f"/api/deliveries/{stop.id}/cancel", headers=h_fm).status_code == 200


# ── Fleet manager intervention ───────────────────────────────────────────────

def test_reassign_returns_batch_to_the_feed(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    d1 = make_user("driver")
    d2 = make_user("driver")
    schedule = make_schedule(fm.id, max_batch=2)
    attach(SessionFactory(), schedule.id, make_request("voc", 8.78, 78.15).id)

    client.post(f"/api/schedules/{schedule.id}/claim", headers=auth_headers(client, d1))
    h_fm = auth_headers(client, fm)
    resp = client.post(f"/api/schedules/{schedule.id}/reassign", headers=h_fm)
    assert resp.status_code == 200
    assert resp.json()["status"] == "broadcasting"
    assert resp.json()["claimed_by_driver_id"] is None

    # The other driver can now take it.
    h2 = auth_headers(client, d2)
    assert client.post(f"/api/schedules/{schedule.id}/claim", headers=h2).status_code == 200


def test_cancel_releases_stops_back_to_pending(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    schedule = make_schedule(fm.id, max_batch=2)
    stop = make_request("voc", 8.78, 78.15)
    attach(SessionFactory(), schedule.id, stop.id)

    h_fm = auth_headers(client, fm)
    resp = client.post(f"/api/schedules/{schedule.id}/cancel", headers=h_fm)
    assert resp.status_code == 200
    assert resp.json()["status"] == "cancelled"

    session = SessionFactory()
    assert session.get(type(stop), stop.id).status == "pending"
    session.close()


def test_force_lock_computes_route(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    driver = make_user("driver")
    schedule = make_schedule(fm.id, max_batch=3)
    attach(SessionFactory(), schedule.id, make_request("voc", 8.78, 78.15).id)
    attach(SessionFactory(), schedule.id, make_request("voc", 8.79, 78.16).id)

    client.post(f"/api/schedules/{schedule.id}/claim", headers=auth_headers(client, driver))
    resp = client.post(f"/api/schedules/{schedule.id}/force-lock", headers=auth_headers(client, fm))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "locked"
    assert body["locked_at"] is not None
    assert body["optimized_route"]["order"]


# ── Driver availability ──────────────────────────────────────────────────────

def test_driver_availability_roundtrip(client, db):
    driver = make_user("driver")
    headers = auth_headers(client, driver)

    assert client.get("/api/auth/me", headers=headers).json()["availability_status"] == "available"

    resp = client.patch("/api/auth/availability", headers=headers,
                        json={"availability_status": "offline"})
    assert resp.status_code == 200
    assert resp.json()["availability_status"] == "offline"

    bad = client.patch("/api/auth/availability", headers=headers,
                       json={"availability_status": "asleep"})
    assert bad.status_code == 422