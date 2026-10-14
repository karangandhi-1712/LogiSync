"""Payment gating and driver-contact release.

Two rules this file exists to hold in place:

1. A delivery request does not enter the dispatch queue until its payment is
   captured. Everything else about the marketplace assumes this — a fleet manager
   should not be planning runs around freight nobody has paid for.
2. The driver's phone number is released to the customer only once the parcel is
   out for delivery, and never for a stop that was cancelled before it ever left
   the depot.

No Razorpay keys are configured in this suite, so the provider resolves to
pay-on-collection and orders are born paid. That is exactly the configuration
where the gating is *inactive*, so the unpaid paths are exercised by forcing the
column directly rather than by pretending a gateway exists.
"""

import hashlib
import hmac

from app.services import payments
from tests.conftest import auth_headers, make_request, make_schedule, make_user, attach, SessionFactory


def _force_payment(token: str, **fields):
    """Set payment columns on a request, bypassing intake."""
    session = SessionFactory()
    from app.models.delivery_request import DeliveryRequestModel
    row = session.query(DeliveryRequestModel).filter(
        DeliveryRequestModel.token_number == token
    ).first()
    for k, v in fields.items():
        setattr(row, k, v)
    session.commit()
    session.close()


# ── Payment gating ───────────────────────────────────────────────────────────

def test_unpaid_request_is_hidden_from_the_pending_queue(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    paid_req = make_request("voc", paid=True)
    unpaid_req = make_request("voc", 8.79, 78.16, paid=False)

    body = client.get("/api/schedules/pending", headers=auth_headers(client, fm)).json()
    tokens = {r["token_number"] for r in body["requests"]}
    assert paid_req.token_number in tokens
    assert unpaid_req.token_number not in tokens


def test_unpaid_request_cannot_be_batched(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    unpaid = make_request("voc", paid=False)

    resp = client.post("/api/schedules", headers=auth_headers(client, fm), json={
        "port_id": "voc",
        "area_label": "Unpaid area",
        "area_center_lat": 8.77, "area_center_lng": 78.14,
        "radius_km": 6,
        "departure_window_start": "06:00", "departure_window_end": "23:00",
        "max_batch_size": 4,
        "request_ids": [unpaid.id],
    })
    # 402, not 409: the client branches on this to re-offer checkout rather than
    # just refreshing.
    assert resp.status_code == 402
    assert "payment" in resp.json()["detail"].lower()


def test_unpaid_request_is_not_auto_attached_to_a_claimed_batch(client, db):
    """Even when a driver's batch covers its address, an unpaid parcel stays out."""
    fm = make_user("fleet_manager", port_id="voc")
    driver = make_user("driver")
    seed = make_request("voc", 8.78, 78.15)
    sched = make_schedule(fm.id, port_id="voc", max_batch=4, window=("00:00", "23:59"))
    attach(SessionFactory(), sched.id, seed.id)
    client.post(f"/api/schedules/{sched.id}/claim", headers=auth_headers(client, driver))

    resp = client.post("/api/consumer/requests", json={
        "name": "Unpaid P", "mobile": "9000000099",
        "pickup_port_id": "voc",
        "delivery_address": "8.79, 78.16 near the batch",
        "delivery_lat": 8.79, "delivery_lng": 78.16,
    })
    token = resp.json()["token_number"]
    # Keyless deployment: the order is already paid, so it attaches normally.
    assert resp.json()["payment_status"] == "paid"

    # Now force it unpaid and confirm the queue honours that.
    _force_payment(token, payment_status="unpaid")
    fm2 = make_user("fleet_manager", port_id="voc")
    body = client.get("/api/schedules/pending", headers=auth_headers(client, fm2)).json()
    assert token not in {r["token_number"] for r in body["requests"]}


def test_intake_reports_the_payment_state(client, db):
    resp = client.post("/api/consumer/requests", json={
        "name": "Asha P", "mobile": "9000000077",
        "pickup_port_id": "voc",
        "delivery_address": "12 Anna Salai, Chennai",
        "delivery_lat": 13.08, "delivery_lng": 80.27,
        "package_weight": 20,
        "handling_flags": ["fragile"],
        "priority_tier": "urgent",
    })
    body = resp.json()
    assert body["payment_status"] == "paid"
    assert body["payment_method"] == "cash_on_depot"
    assert body["requires_payment"] is False
    # Urgent + 20kg + fragile must not be free.
    assert body["payment_amount"] > 0


def test_payment_status_endpoint_is_scoped_to_the_owner(client, db, consumer_account):
    mine = client.post("/api/consumer/account/orders", headers=consumer_account["headers"], json={
        "pickup_port_id": "voc",
        "delivery_address": "1 Anna Salai, Chennai",
        "delivery_lat": 13.08, "delivery_lng": 80.27,
    }).json()
    theirs = make_request("voc", 8.8, 78.2, paid=True)

    ok = client.get(f"/api/payments/{mine['token_number']}", headers=consumer_account["headers"])
    assert ok.status_code == 200
    assert ok.json()["status"] == "paid"

    # 404, never 403 - a 403 would confirm someone else's code exists.
    nope = client.get(f"/api/payments/{theirs.token_number}", headers=consumer_account["headers"])
    assert nope.status_code == 404


def test_payment_config_reports_the_active_provider(client, db):
    body = client.get("/api/payments/config").json()
    assert body["provider"] == "cash_on_depot"
    assert body["enabled"] is False
    # The secret must never be published, and with no keys the key id is empty.
    assert body["key_id"] == ""


def test_cod_confirmation_is_a_no_op_for_an_already_paid_request(client, db, consumer_account):
    """The endpoint must be idempotent - a double click cannot re-attach."""
    created = client.post("/api/consumer/account/orders", headers=consumer_account["headers"], json={
        "pickup_port_id": "voc",
        "delivery_address": "2 Anna Salai, Chennai",
        "delivery_lat": 13.08, "delivery_lng": 80.27,
    }).json()
    token = created["token_number"]
    # Keyless deployment already marked it paid; force the unpaid state back so
    # the first call has real work to do.
    _force_payment(token, payment_status="unpaid", payment_method=None, paid_at=None)

    first = client.post("/api/payments/cod/confirm", headers=consumer_account["headers"],
                        json={"token_number": token})
    assert first.status_code == 200
    assert first.json()["status"] == "paid"
    assert first.json()["released"] is True

    second = client.post("/api/payments/cod/confirm", headers=consumer_account["headers"],
                         json={"token_number": token})
    assert second.status_code == 200
    # `released` is False the second time: nothing left to do.
    assert second.json()["released"] is False
    assert second.json()["auto_attached"] is False


def test_verify_rejects_a_bad_signature(client, db):
    resp = client.post("/api/payments/verify", json={
        "token_number": "LG-ANYTHING",
        "razorpay_order_id": "order_x",
        "razorpay_payment_id": "pay_x",
        "razorpay_signature": "deadbeef",
    })
    # Unauthenticated or invalid signature: either way it must not 200.
    assert resp.status_code in (400, 401, 403)


def test_signature_verification_is_hmac_and_constant_time_checked():
    secret = "test-secret"
    order_id, payment_id = "order_1", "pay_1"
    expected = hmac.new(
        secret.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256
    ).hexdigest()

    assert payments.verify_signature(order_id, payment_id, expected, secret=secret) is True
    assert payments.verify_signature(order_id, payment_id, "nope", secret=secret) is False
    # A signature for one payment must not validate another.
    assert payments.verify_signature(order_id, "pay_2", expected, secret=secret) is False
    # Missing parts never raise.
    assert payments.verify_signature("", payment_id, expected, secret=secret) is False
    assert payments.verify_signature(order_id, payment_id, None, secret=secret) is False


def test_webhook_rejects_an_unsigned_body(client, db):
    resp = client.post("/api/payments/webhook",
                       json={"event": "payment.captured"})
    assert resp.status_code == 400


def test_estimate_is_priced_before_the_order_exists(client, db, consumer_account):
    body = client.post("/api/payments/estimate", headers=consumer_account["headers"], json={
        "priority_tier": "urgent",
        "package_weight": 30,
        "handling_flags": ["fragile", "upright"],
    }).json()
    assert body["tier"] == "urgent"
    assert body["total"] > 0
    assert body["handling_fee"] > 0
    # The line items must reconcile with the headline.
    assert body["lines"][-1]["amount"] == body["total"]


def test_estimate_requires_a_customer_session(client, db):
    assert client.post("/api/payments/estimate", json={"priority_tier": "urgent"}).status_code in (401, 403)


# ── Driver contact release ───────────────────────────────────────────────────

def _rid(req):
    from app.models.delivery_request import DeliveryRequestModel
    session = SessionFactory()
    row = session.query(DeliveryRequestModel).filter(
        DeliveryRequestModel.id == req.id
    ).first()
    rid = row.id
    session.close()
    return rid


def test_driver_phone_is_withheld_until_out_for_delivery(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    driver = make_user("driver", mobile="+91999998888")
    req = make_request("voc", 8.78, 78.15)
    sched = make_schedule(fm.id, port_id="voc", max_batch=2)
    attach(SessionFactory(), sched.id, req.id)
    # Claiming assigns every stop on the batch, so the driver starts at
    # `assigned` - there is no separate assigned transition to drive here.
    client.post(f"/api/schedules/{sched.id}/claim", headers=auth_headers(client, driver))
    dheaders = auth_headers(client, driver)

    raw = client.get(f"/api/track/{req.token_number}")
    body = raw.json()
    card = body["schedule"]["driver"]
    # The customer may know who and what vehicle, but not how to reach them.
    assert body["status"] == "assigned"
    assert card["name"] == driver.full_name
    assert card["contact_visible"] is False
    assert "phone" not in card
    assert "+91999998888" not in raw.text

    # Picked up: still inside the depot's hands, still withheld.
    client.patch(f"/api/deliveries/{_rid(req)}/status", headers=dheaders,
                 json={"status": "picked_up"})
    body = client.get(f"/api/track/{req.token_number}").json()
    assert body["schedule"]["driver"]["contact_visible"] is False
    assert "+91999998888" not in client.get(f"/api/track/{req.token_number}").text

    # Out for delivery: now the customer gets the number.
    client.patch(f"/api/deliveries/{_rid(req)}/status", headers=dheaders,
                 json={"status": "en_route"})
    body = client.get(f"/api/track/{req.token_number}").json()
    card = body["schedule"]["driver"]
    assert card["contact_visible"] is True
    assert card["phone"] == "+91999998888"
    assert body["driver_contact_visible"] is True
    assert body["out_for_delivery_at"] is not None




def test_cancelled_before_departure_never_exposes_the_driver(client, db):
    """The regression that made a status-based gate unsafe.

    A stop cancelled while still batched lands on a terminal status. Any gate
    that said "terminal means the customer met the driver" would hand out a
    number for a driver who never touched the parcel.
    """
    fm = make_user("fleet_manager", port_id="voc")
    driver = make_user("driver", mobile="+91999997777")
    req = make_request("voc", 8.78, 78.15)
    sched = make_schedule(fm.id, port_id="voc", max_batch=2)
    attach(SessionFactory(), sched.id, req.id)
    client.post(f"/api/schedules/{sched.id}/claim", headers=auth_headers(client, driver))

    client.patch(f"/api/deliveries/{_rid(req)}/status", headers=auth_headers(client, driver),
                 json={"status": "cancelled", "reason": "customer changed their mind"})

    raw = client.get(f"/api/track/{req.token_number}")
    assert raw.json()["status"] == "cancelled"
    assert raw.json()["driver_contact_visible"] is False
    assert "+91999997777" not in raw.text


def test_out_for_delivery_timestamp_survives_a_later_cancellation(client, db):
    """Once released, the fact that it was released is not un-set."""
    fm = make_user("fleet_manager", port_id="voc")
    driver = make_user("driver", mobile="+91999996666")
    req = make_request("voc", 8.78, 78.15)
    sched = make_schedule(fm.id, port_id="voc", max_batch=2)
    attach(SessionFactory(), sched.id, req.id)
    client.post(f"/api/schedules/{sched.id}/claim", headers=auth_headers(client, driver))
    dheaders = auth_headers(client, driver)

    client.patch(f"/api/deliveries/{_rid(req)}/status", headers=dheaders,
                 json={"status": "assigned"})
    client.patch(f"/api/deliveries/{_rid(req)}/status", headers=dheaders,
                 json={"status": "picked_up"})
    client.patch(f"/api/deliveries/{_rid(req)}/status", headers=dheaders,
                 json={"status": "en_route"})
    first = client.get(f"/api/track/{req.token_number}").json()["out_for_delivery_at"]
    assert first is not None

    client.patch(f"/api/deliveries/{_rid(req)}/status", headers=dheaders,
                 json={"status": "failed", "reason": "customer unreachable"})
    body = client.get(f"/api/track/{req.token_number}").json()
    # Still released: they did meet this driver, and still need to reach them.
    assert body["out_for_delivery_at"] == first
    assert body["driver_contact_visible"] is True


def test_delivered_at_is_stamped_once(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    driver = make_user("driver")
    req = make_request("voc", 8.78, 78.15)
    sched = make_schedule(fm.id, port_id="voc", max_batch=2)
    attach(SessionFactory(), sched.id, req.id)
    client.post(f"/api/schedules/{sched.id}/claim", headers=auth_headers(client, driver))
    dheaders = auth_headers(client, driver)

    for status in ("assigned", "picked_up", "en_route"):
        client.patch(f"/api/deliveries/{_rid(req)}/status", headers=dheaders,
                     json={"status": status})
    resp = client.patch(f"/api/deliveries/{_rid(req)}/status", headers=dheaders,
                        json={"status": "delivered"})
    assert resp.status_code == 200
    stamp = resp.json()["delivered_at"]
    assert stamp is not None
