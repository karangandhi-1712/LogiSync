"""On-time rate by tier.

The metric was pinned at 0% for every tier and the user-facing symptom was
"why isn't this updating". Two distinct causes, both covered here:

1. **Timezone.** `requested_window_end` is depot-local IST wall-clock, because
   the customer read it off their own phone. Every stored timestamp is naive UTC.
   Comparing the UTC clock against an IST deadline scored every evening delivery
   late by construction - 23:36 IST is stored as 18:06 and fails an 18:00 window.

2. **Which timestamp.** `updated_at` is `onupdate=datetime.utcnow`, so it moves
   on *every* write to the row - attaching, reassigning, resequencing - and is not
   the delivery time at all. `delivered_at` is stamped once by the delivered
   transition.

`_within_window` is exercised directly with synthetic rows so the clock arithmetic
is pinned independently of any delivery flow, and the API is exercised separately
to confirm the null-vs-zero reporting contract.
"""

from datetime import datetime, timedelta

import pytest

from app.constants import TIER_EXPRESS, TIER_STANDARD, TIER_URGENT
from app.routers.analytics import _is_measurable, _within_window
from tests.conftest import auth_headers, make_request, make_schedule, make_user, SessionFactory


class _Row:
    """Minimal stand-in for a DeliveryRequestModel."""

    def __init__(self, window_start, window_end, delivered_at, updated_at=None):
        self.requested_window_start = window_start
        self.requested_window_end = window_end
        self.delivered_at = delivered_at
        self.updated_at = updated_at or delivered_at


def utc_for_ist(hour: int, minute: int, day: int = 10) -> datetime:
    """The UTC timestamp we store for a delivery that happened at this IST time.

    Every `requested_window_*` the customer picks is IST wall-clock; every
    timestamp we store is naive UTC. This builds the stored value, so a test can
    state the business fact ("delivered at 23:36 IST") and get the thing that
    actually lands in the column.
    """
    return datetime(2026, 10, day, hour, minute) - timedelta(hours=5, minutes=30)


# ── The clock arithmetic ─────────────────────────────────────────────────────

def test_evening_delivery_is_on_time_for_an_evening_window():
    """The exact case that produced the stuck 0%.

    Delivered 16:20 IST. Stored as 10:50 UTC. Against a 10:00-18:00 window this
    must read as on time - the old code compared 10:50 against 18:00 and only
    passed by luck, while its sibling 18:13 IST delivery was scored late purely
    because UTC had not been converted.
    """
    assert _within_window(_Row("10:00", "18:00", utc_for_ist(16, 20))) is True


def test_delivery_after_the_window_is_late():
    # 19:00 IST stored as 13:30 UTC - fails an 18:00 IST deadline.
    assert _within_window(_Row("10:00", "18:00", utc_for_ist(19, 0))) is False


def test_late_evening_delivery_is_late_even_though_utc_looks_early():
    """23:36 IST is 18:06 UTC. Read naively it looks just past 18:00; read
    correctly it is five and a half hours late."""
    row = _Row("10:00", "18:00", utc_for_ist(23, 36))
    assert row.delivered_at.hour == 18  # the trap
    assert _within_window(row) is False


def test_early_morning_delivery_looks_late_in_utc_but_is_on_time():
    """06:30 IST is 01:00 UTC. A naive comparison would still pass here, which is
    why the bug only ever showed up on evening deliveries."""
    assert _within_window(_Row("06:00", "09:00", utc_for_ist(6, 30))) is True


def test_window_wrapping_past_midnight():
    # 00:30 IST on the 9th, stored as 19:00 UTC on the 9th.
    assert _within_window(_Row("22:00", "02:00", utc_for_ist(0, 30, day=9))) is True
    # 03:00 IST is genuinely outside a 22:00-02:00 window.
    assert _within_window(_Row("22:00", "02:00", utc_for_ist(3, 0, day=9))) is False


def test_delivery_before_the_window_opens_is_not_on_time():
    # 08:00 IST against a window that opens at 10:00.
    assert _within_window(_Row("10:00", "18:00", utc_for_ist(8, 0))) is False


def test_no_window_means_not_a_miss():
    row = _Row(None, None, utc_for_ist(23, 0))
    assert _within_window(row) is True
    # ...but it is also not evidence, so it stays out of the denominator.
    assert _is_measurable(row) is False


def test_unparseable_window_is_ignored_rather_than_crashing():
    row = _Row("not-a-time", "also-not", utc_for_ist(12, 0))
    assert _within_window(row) is True
    assert _is_measurable(row) is False


def test_missing_delivery_timestamp_is_not_scored_as_on_time():
    row = _Row("10:00", "18:00", None, None)
    assert _within_window(row) is False


def test_updated_at_is_only_a_fallback():
    """A row written before `delivered_at` existed still scores, via updated_at."""
    row = _Row("10:00", "18:00", None, updated_at=utc_for_ist(16, 20))
    assert _within_window(row) is True


# ── The API contract ─────────────────────────────────────────────────────────

def _deliver(token: str, *, window=("10:00", "18:00"), tier=TIER_STANDARD, delivered_ist=None):
    """Put a request into `delivered` with a chosen `delivered_at`."""
    from app.models.delivery_request import DeliveryRequestModel
    session = SessionFactory()
    row = session.query(DeliveryRequestModel).filter(
        DeliveryRequestModel.token_number == token
    ).first()
    row.status = "delivered"
    row.requested_window_start = window[0]
    row.requested_window_end = window[1]
    row.priority_tier = tier
    row.delivered_at = delivered_ist if delivered_ist else datetime.utcnow()
    session.commit()
    session.close()


def test_tier_with_no_deliveries_reports_null_not_zero(client, db):
    """A zero and a 'no data' are very different claims; the UI renders them
    differently, so the API has to distinguish them."""
    fm = make_user("fleet_manager", port_id="voc")
    req = make_request("voc", tier=TIER_STANDARD)
    _deliver(req.token_number)

    body = client.get("/api/analytics/delivery/kpis?period=7d",
                      headers=auth_headers(client, fm)).json()
    tier = body["on_time_rate_by_tier"]

    assert tier[TIER_STANDARD]["delivered"] == 1
    assert tier[TIER_EXPRESS]["delivered"] == 0
    assert tier[TIER_URGENT]["delivered"] == 0
    # No deliveries -> no rate, explicitly null.
    assert tier[TIER_EXPRESS]["on_time_pct"] is None
    assert tier[TIER_URGENT]["on_time_pct"] is None
    assert body["on_time_rate_overall"] is not None


def test_on_time_rate_counts_a_within_window_delivery(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    req = make_request("voc", tier=TIER_STANDARD)
    # 16:20 IST on the 10th - inside a 10:00-18:00 window.
    _deliver(req.token_number, delivered_ist=utc_for_ist(16, 20))

    body = client.get("/api/analytics/delivery/kpis?period=7d",
                      headers=auth_headers(client, fm)).json()
    stat = body["on_time_rate_by_tier"][TIER_STANDARD]
    assert stat["delivered"] == 1
    assert stat["on_time"] == 1
    assert stat["on_time_pct"] == 100.0
    assert stat["measured"] == 1


def test_on_time_rate_counts_a_late_delivery(client, db):
    fm = make_user("fleet_manager", port_id="voc")
    req = make_request("voc", tier=TIER_STANDARD)
    # 19:00 IST - past the 18:00 deadline.
    _deliver(req.token_number, delivered_ist=utc_for_ist(19, 0))

    body = client.get("/api/analytics/delivery/kpis?period=7d",
                      headers=auth_headers(client, fm)).json()
    stat = body["on_time_rate_by_tier"][TIER_STANDARD]
    assert stat["on_time"] == 0
    assert stat["on_time_pct"] == 0.0


def test_unmeasurable_deliveries_are_excluded_from_the_tier_percentage(client, db):
    """A stop nobody gave a window for must not dilute the rate of the ones
    that did have a window to miss."""
    fm = make_user("fleet_manager", port_id="voc")
    scored = make_request("voc", 8.78, 78.15, tier=TIER_STANDARD)
    unscored = make_request("voc", 8.79, 78.16, tier=TIER_STANDARD)
    _deliver(scored.token_number, delivered_ist=utc_for_ist(16, 20))
    _deliver(unscored.token_number, window=(None, None), delivered_ist=utc_for_ist(17, 0))

    body = client.get("/api/analytics/delivery/kpis?period=7d",
                      headers=auth_headers(client, fm)).json()
    stat = body["on_time_rate_by_tier"][TIER_STANDARD]
    assert stat["delivered"] == 2
    assert stat["measured"] == 1
    assert stat["on_time_pct"] == 100.0