"""Customer account ownership, booking, tracking, and cancellation contracts."""

import uuid

from tests.conftest import auth_headers


def _order(**overrides):
    data = {
        "pickup_port_id": "voc",
        "delivery_address": "Bryant Nagar, Thoothukudi",
        "delivery_lat": 8.782,
        "delivery_lng": 78.152,
        "package_type": "Carton",
        "package_weight": 4.5,
        "priority_tier": "express",
    }
    data.update(overrides)
    return data


def test_consumer_account_profile_and_order_flow(client, consumer_account):
    headers = consumer_account["headers"]

    profile = client.get("/api/consumer/account/profile", headers=headers)
    assert profile.status_code == 200, profile.text
    assert profile.json()["full_name"] == "Asha Consumer"
    assert profile.json()["consumer"]["mobile_number"] == "+919876543210"

    placed = client.post("/api/consumer/account/orders", headers=headers,
                         json=_order(name="spoofed", mobile="+919000000000"))
    assert placed.status_code == 201, placed.text
    token = placed.json()["token_number"]
    assert placed.json()["priority_tier"] == "express"
    assert placed.json()["tier_fee"] == 500

    orders = client.get("/api/consumer/account/orders", headers=headers)
    assert orders.status_code == 200, orders.text
    assert [row["token_number"] for row in orders.json()] == [token]
    assert orders.json()[0]["is_cancellable"] is True

    tracked = client.get(f"/api/consumer/account/orders/{token}", headers=headers)
    assert tracked.status_code == 200, tracked.text
    assert tracked.json()["delivery_address"] == "Bryant Nagar, Thoothukudi"
    assert tracked.json()["is_cancellable"] is True


def test_customer_cannot_read_or_cancel_another_customers_order(client, consumer_account):
    other = client.post("/api/auth/register/consumer", json={
        "full_name": "Other Customer",
        "mobile": "+919123456789",
        "email": f"other.{uuid.uuid4().hex[:8]}@example.com",
        "password": "Test@1234",
    })
    assert other.status_code == 201, other.text
    other_headers = {"Authorization": f"Bearer {other.json()['access_token']}"}
    created = client.post("/api/consumer/account/orders", headers=other_headers, json=_order())
    assert created.status_code == 201, created.text
    token = created.json()["token_number"]

    headers = consumer_account["headers"]
    assert client.get(f"/api/consumer/account/orders/{token}", headers=headers).status_code == 404
    assert client.post(f"/api/consumer/account/orders/{token}/cancel", headers=headers).status_code == 404


def test_customer_can_cancel_pending_order_and_read_its_history(client, consumer_account):
    headers = consumer_account["headers"]
    created = client.post("/api/consumer/account/orders", headers=headers, json=_order())
    token = created.json()["token_number"]

    cancelled = client.post(f"/api/consumer/account/orders/{token}/cancel", headers=headers,
                            json={"reason": "Booked by mistake"})
    assert cancelled.status_code == 200, cancelled.text
    assert cancelled.json()["status"] == "cancelled"

    history = client.get(f"/api/consumer/account/orders/{token}/history", headers=headers)
    assert history.status_code == 200, history.text
    assert history.json()[-1]["new_status"] == "cancelled"
    assert history.json()[-1]["reason"] == "Booked by mistake"


def test_customer_signup_claims_guest_orders_by_mobile(client, db):
    guest = client.post("/api/consumer/requests", json={
        "name": "Guest Name", "mobile": "9876543210", "pickup_port_id": "voc",
        "delivery_address": "Bryant Nagar, Thoothukudi", "delivery_lat": 8.782,
        "delivery_lng": 78.152,
    })
    assert guest.status_code == 201, guest.text
    token = guest.json()["token_number"]

    signup = client.post("/api/auth/register/consumer", json={
        "full_name": "Returning Customer", "mobile": "+919876543210",
        "email": f"returning.{uuid.uuid4().hex[:8]}@example.com", "password": "Test@1234",
    })
    assert signup.status_code == 201, signup.text
    headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}
    rows = client.get("/api/consumer/account/orders", headers=headers)
    assert rows.status_code == 200, rows.text
    assert [row["token_number"] for row in rows.json()] == [token]


def test_non_customer_cannot_use_customer_account_routes(client, driver):
    headers = auth_headers(client, driver)
    assert client.get("/api/consumer/account/orders", headers=headers).status_code == 403

