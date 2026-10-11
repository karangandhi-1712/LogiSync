"""The atomic-claim guarantee.

This is the correctness-critical test of the whole marketplace: two drivers
racing for the same broadcast batch must never both end up assigned to it.

The race is exercised through the service layer (not the HTTP layer) so both
threads hit the database concurrently without a TestClient serialising them.
"""

import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

import pytest
from sqlalchemy import create_engine, select

from app.models.delivery_request import DeliveryRequestModel
from app.models.delivery_schedule import DeliveryScheduleModel
from app.services import claim_service
from tests.conftest import (TEST_ENGINE, SessionFactory, attach, make_request, make_schedule, make_user)


def _race(db_factory, schedule_id: str, driver_ids):
    """Fire every claim at once and collect the outcomes."""
    barrier = threading.Barrier(len(driver_ids))

    def attempt(driver_id):
        db = db_factory()
        try:
            # Line everyone up so the writes genuinely overlap.
            barrier.wait(timeout=10)
            try:
                claim_service.claim_schedule(db, schedule_id, driver_id)
                return (driver_id, "claimed")
            except claim_service.ScheduleUnavailable as exc:
                return (driver_id, f"unavailable: {exc}")
            except claim_service.DriverNotAvailable as exc:
                return (driver_id, f"driver-blocked: {exc}")
        finally:
            db.close()

    with ThreadPoolExecutor(max_workers=len(driver_ids)) as pool:
        futures = [pool.submit(attempt, d) for d in driver_ids]
        return [f.result() for f in as_completed(futures)]


@pytest.fixture()
def db_factory():
    return SessionFactory


def test_two_drivers_race_only_one_wins(db_factory):
    fm = make_user("fleet_manager", port_id="voc")
    d1 = make_user("driver")
    d2 = make_user("driver")
    schedule = make_schedule(fm.id, max_batch=2)
    r1 = make_request()
    r2 = make_request(tier="express")
    session = db_factory()
    attach(session, schedule.id, r1.id)
    attach(session, schedule.id, r2.id)
    session.close()

    outcomes = _race(db_factory, schedule.id, [d1.id, d2.id])
    statuses = sorted(status for _, status in outcomes)

    assert statuses.count("claimed") == 1, f"expected exactly one winner, got {outcomes}"
    assert len([s for s in statuses if s.startswith("unavailable")]) == 1

    # The database agrees: one owner, and it is one of the two racers.
    check = db_factory()
    row = check.execute(
        select(DeliveryScheduleModel).where(DeliveryScheduleModel.id == schedule.id)
    ).scalar_one()
    assert row.status == "claimed"
    assert row.claimed_by_driver_id in (d1.id, d2.id)
    assert row.claimed_at is not None

    # Exactly one driver's stops were promoted; no stop was double-assigned.
    stops = check.query(DeliveryRequestModel).filter(
        DeliveryRequestModel.schedule_id == schedule.id
    ).all()
    assert len(stops) == 2
    assert all(s.status == "assigned" for s in stops)
    assert len({s.id for s in stops}) == 2
    check.close()


def test_many_drivers_race_still_one_winner(db_factory):
    fm = make_user("fleet_manager", port_id="voc")
    drivers = [make_user("driver") for _ in range(8)]
    schedule = make_schedule(fm.id, max_batch=1)
    req = make_request()
    session = db_factory()
    attach(session, schedule.id, req.id)
    session.close()

    outcomes = _race(db_factory, schedule.id, [d.id for d in drivers])
    winners = [d for d, status in outcomes if status == "claimed"]
    assert len(winners) == 1, f"expected 1 winner across 8 racers, got {len(winners)}"


def test_claim_twice_by_same_driver_is_rejected(db_factory):
    fm = make_user("fleet_manager", port_id="voc")
    d = make_user("driver")
    schedule = make_schedule(fm.id)
    req = make_request()
    session = db_factory()
    attach(session, schedule.id, req.id)
    session.close()

    first = claim_service.claim_schedule(db_factory(), schedule.id, d.id)
    assert first.status == "claimed"

    with pytest.raises(claim_service.ScheduleUnavailable):
        claim_service.claim_schedule(db_factory(), schedule.id, d.id)


def test_driver_cannot_hold_two_batches(db_factory):
    fm = make_user("fleet_manager", port_id="voc")
    d = make_user("driver")

    s1 = make_schedule(fm.id)
    s2 = make_schedule(fm.id)
    session = db_factory()
    attach(session, s1.id, make_request().id)
    attach(session, s2.id, make_request().id)
    session.close()

    claim_service.claim_schedule(db_factory(), s1.id, d.id)
    with pytest.raises(claim_service.DriverNotAvailable):
        claim_service.claim_schedule(db_factory(), s2.id, d.id)


def test_unknown_schedule_raises_not_found(db_factory):
    d = make_user("driver")
    with pytest.raises(claim_service.ScheduleNotFound):
        claim_service.claim_schedule(db_factory(), "does-not-exist", d.id)


def test_schedule_with_no_stops_cannot_be_claimed(db_factory):
    fm = make_user("fleet_manager", port_id="voc")
    d = make_user("driver")
    schedule = make_schedule(fm.id)
    with pytest.raises(claim_service.ScheduleUnavailable):
        claim_service.claim_schedule(db_factory(), schedule.id, d.id)


def test_claim_endpoint_returns_409_to_the_loser(client, db, driver, driver2):
    fm = make_user("fleet_manager", port_id="voc")
    schedule = make_schedule(fm.id, max_batch=2)
    session = SessionFactory()
    attach(session, schedule.id, make_request().id)
    attach(session, schedule.id, make_request().id)
    session.close()

    h1 = _login(client, driver)
    h2 = _login(client, driver2)

    first = client.post(f"/api/schedules/{schedule.id}/claim", headers=h1)
    assert first.status_code == 200, first.text

    second = client.post(f"/api/schedules/{schedule.id}/claim", headers=h2)
    assert second.status_code == 409, second.text
    assert "claim" in second.json()["detail"].lower()


def _login(client, user):
    resp = client.post("/api/auth/login", json={
        "identifier": user.email, "password": "Test@1234",
    })
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}