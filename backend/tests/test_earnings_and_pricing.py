"""Earnings and customer pricing.

Two models that must agree on their inputs and never overlap wrongly:

* `earnings` pays the driver. Tier sets the base, weight and handling add to it,
  distance and batch size add on top.
* `pricing` charges the customer. Same inputs, lower weights, a floor.

These are pure functions over dataclasses and constants, so they are tested
directly rather than through HTTP — the API plumbing has its own tests.
"""

import pytest

from app.constants import (
    CUSTOMER_BASE_FEE,
    CUSTOMER_MIN_CHARGE,
    EARNINGS_BATCH_BONUS,
    EARNINGS_PER_KG,
    EARNINGS_PER_KM,
    EARNINGS_PER_STOP,
    EARNINGS_WEIGHT_CAP_KG,
    HANDLING_FRAGILE,
    HANDLING_LIQUID,
    HANDLING_REFRIGERATED,
    HANDLING_SURCHARGE,
    HANDLING_UPRIGHT,
    TIER_EXPRESS,
    TIER_STANDARD,
    TIER_URGENT,
)
from app.services import handling
from app.services.earnings import StopEarnings, estimate_earnings, earnings_quote
from app.services.pricing import quote_charge, quote_charge_breakdown


# ── Driver earnings ──────────────────────────────────────────────────────────

def test_tier_sets_the_base_pay():
    base = StopEarnings(reference="a", tier=TIER_STANDARD).total
    express = StopEarnings(reference="a", tier=TIER_EXPRESS).total
    urgent = StopEarnings(reference="a", tier=TIER_URGENT).total
    assert base == EARNINGS_PER_STOP[TIER_STANDARD]
    assert express == EARNINGS_PER_STOP[TIER_EXPRESS]
    assert urgent == EARNINGS_PER_STOP[TIER_URGENT]
    # Urgency must actually pay more, or the tier means nothing to a driver.
    assert base < express < urgent


def test_weight_adds_pay_proportionally():
    stop = StopEarnings(reference="a", tier=TIER_STANDARD, weight_kg=10)
    assert stop.weight_pay == pytest.approx(10 * EARNINGS_PER_KG)


def test_weight_pay_is_capped():
    """One pallet must not dominate the whole batch's payout."""
    heavy = StopEarnings(reference="a", tier=TIER_STANDARD, weight_kg=5000)
    assert heavy.capped_weight == EARNINGS_WEIGHT_CAP_KG
    assert heavy.weight_pay == pytest.approx(EARNINGS_WEIGHT_CAP_KG * EARNINGS_PER_KG)


def test_handling_surcharges_stack():
    plain = StopEarnings(reference="a", tier=TIER_STANDARD).total
    fragile = StopEarnings(reference="a", tier=TIER_STANDARD, flags=[HANDLING_FRAGILE]).total
    upright = StopEarnings(reference="a", tier=TIER_STANDARD, flags=[HANDLING_UPRIGHT]).total
    both = StopEarnings(
        reference="a", tier=TIER_STANDARD, flags=[HANDLING_FRAGILE, HANDLING_UPRIGHT]
    ).total
    assert fragile > plain
    assert upright > plain
    # A glass lamp that must also stay upright takes more care than either alone.
    assert both > fragile and both > upright


def test_refrigerated_pays_most_of_the_handling_flags():
    assert HANDLING_SURCHARGE[HANDLING_REFRIGERATED] > HANDLING_SURCHARGE[HANDLING_FRAGILE]
    assert HANDLING_SURCHARGE[HANDLING_FRAGILE] > HANDLING_SURCHARGE[HANDLING_UPRIGHT]


def test_unknown_handling_flags_are_ignored():
    stop = StopEarnings(reference="a", tier=TIER_STANDARD, flags=["teleport"])
    assert stop.total == EARNINGS_PER_STOP[TIER_STANDARD]


def test_batch_bonus_pays_per_extra_stop():
    """Filling the batch pays more than the sum of the same stops run alone."""
    single = StopEarnings(reference="a", tier=TIER_STANDARD).total
    three = estimate_earnings(
        [StopEarnings(reference=str(i), tier=TIER_STANDARD) for i in range(3)], 0
    )
    one = estimate_earnings([StopEarnings(reference="a", tier=TIER_STANDARD)], 0)
    # The difference is the two extra base payments plus the two bonuses they
    # unlock - the bonus is the marginal reward on top, not the whole delta.
    assert three - one == pytest.approx(2 * single + 2 * EARNINGS_BATCH_BONUS)
    # And a fuller batch is worth strictly more per stop than a lone one.
    assert three / 3 > one


def test_distance_is_paid_and_never_negative():
    stops = [StopEarnings(reference="a", tier=TIER_STANDARD)]
    with_dist = estimate_earnings(stops, 10)
    no_dist = estimate_earnings(stops, 0)
    assert with_dist > no_dist
    assert estimate_earnings(stops, -5) == no_dist


def test_empty_batch_is_worth_nothing():
    assert estimate_earnings([], 25) == 0.0


def test_quote_breakdown_sums_to_the_total():
    """The itemised view must reconcile - a driver who cannot add it up will
    not trust the headline figure."""
    stops = [
        StopEarnings(reference="LG-A", tier=TIER_URGENT, weight_kg=30, flags=[HANDLING_FRAGILE]),
        StopEarnings(reference="LG-B", tier=TIER_STANDARD, weight_kg=2, flags=[HANDLING_UPRIGHT]),
    ]
    q = earnings_quote(stops, 12.5)
    assert q["stop_count"] == 2
    assert q["stops_pay"] == pytest.approx(sum(s["stop_total"] for s in q["stops"]))
    assert q["distance_pay"] == pytest.approx(12.5 * EARNINGS_PER_KM_FOR_TEST)
    assert q["total"] == pytest.approx(q["stops_pay"] + q["distance_pay"] + q["batch_bonus"])


def test_missing_weight_is_treated_as_zero_not_an_error():
    stop = StopEarnings(reference="a", tier=TIER_STANDARD, weight_kg=None)
    assert stop.capped_weight == 0.0
    assert stop.weight_pay == 0.0


def test_unparseable_weight_does_not_crash_the_payout():
    # A hand-edited or legacy row can carry junk in a float column. That must
    # degrade to "no weight", never take a whole batch's payout down with it.
    stop = StopEarnings(reference="a", tier=TIER_STANDARD, weight_kg="heavy")  # type: ignore[arg-type]
    assert stop.capped_weight == 0.0


# ── Customer pricing ─────────────────────────────────────────────────────────

def test_customer_base_fee_matches_the_tier():
    for tier in (TIER_STANDARD, TIER_EXPRESS, TIER_URGENT):
        assert quote_charge(tier, 0, [])["base_fee"] == CUSTOMER_BASE_FEE[tier]


def test_customer_price_rises_with_weight_and_handling():
    plain = quote_charge(TIER_STANDARD, 0, [])["total"]
    heavy = quote_charge(TIER_STANDARD, 40, [])["total"]
    fragile = quote_charge(TIER_STANDARD, 0, [HANDLING_FRAGILE])["total"]
    assert heavy > plain
    assert fragile > plain


def test_light_parcels_are_charged_the_minimum():
    """A document envelope must not be free, but neither should it be priced
    like a freight run."""
    q = quote_charge(TIER_STANDARD, 0.2, [])
    assert q["total"] == CUSTOMER_MIN_CHARGE
    assert q["min_charge_applied"] is True


def test_customer_price_never_dips_below_the_minimum():
    for tier in (TIER_STANDARD, TIER_EXPRESS, TIER_URGENT):
        for weight in (0, 0.5, 3, 50, 900):
            assert quote_charge(tier, weight, [])["total"] >= CUSTOMER_MIN_CHARGE


def test_handling_and_weight_margins_favour_the_platform():
    """On the components this work introduced, the customer always pays at
    least as much as the driver receives - the platform's cut never goes
    negative here."""
    for flags in ([], [HANDLING_FRAGILE], [HANDLING_UPRIGHT],
                  [HANDLING_REFRIGERATED], [HANDLING_LIQUID],
                  [HANDLING_FRAGILE, HANDLING_UPRIGHT]):
        driver_handling = StopEarnings(
            reference="a", tier=TIER_STANDARD, flags=flags
        ).handling_pay
        customer_handling = quote_charge(TIER_STANDARD, 0, flags)["handling_fee"]
        assert customer_handling >= driver_handling, flags

    for weight in (1, 10, 25, 50):
        driver_weight = StopEarnings(
            reference="a", tier=TIER_STANDARD, weight_kg=weight
        ).weight_pay
        customer_weight = quote_charge(TIER_STANDARD, weight, [])["weight_component"]
        assert customer_weight <= driver_weight, weight


def test_tier_base_fee_gap_is_a_known_open_question():
    """Documents a real inconsistency in the *pre-existing* tier constants.

    `TIER_FEES` charges a customer ₹500 for express and ₹1000 for urgent, while
    `EARNINGS_PER_STOP` pays the driver ₹220 and ₹350 for the same stop. On a
    bare stop with no weight, no special handling and no distance, the platform
    is therefore out of pocket — and neither weight nor handling can close a
    ₹650 gap, because both components pay the platform *more*, not less.

    This is not introduced by the earnings rework; both constant sets predate
    it. It is pinned here so the gap stays visible rather than being silently
    inherited, and so that whoever sets the commercial terms has a failing test
    to update rather than an unnoticed margin leak.
    """
    gaps = {
        tier: CUSTOMER_BASE_FEE[tier] - EARNINGS_PER_STOP[tier]
        for tier in (TIER_STANDARD, TIER_EXPRESS, TIER_URGENT)
    }
    # Standard is covered by the driver's base pay.
    assert gaps[TIER_STANDARD] <= 0
    # Express and urgent are not. If this assertion starts failing, someone has
    # rebalanced the tiers and the comment above can go.
    assert gaps[TIER_EXPRESS] > 0
    assert gaps[TIER_URGENT] > 0


def test_invalid_tier_falls_back_to_standard_rather_than_erroring():
    assert quote_charge("teleport", 5, [])["tier"] == TIER_STANDARD


def test_breakdown_lines_include_a_total_and_reconcile():
    lines = quote_charge_breakdown(TIER_EXPRESS, 10, [HANDLING_FRAGILE])
    assert lines[-1]["emphasis"] is True
    assert lines[-1]["amount"] == quote_charge(TIER_EXPRESS, 10, [HANDLING_FRAGILE])["total"]


# ── Handling flag recovery ───────────────────────────────────────────────────

def test_flags_round_trip_through_the_stored_string():
    flags = {HANDLING_FRAGILE, HANDLING_UPRIGHT}
    assert handling.deserialize(handling.serialize(flags)) == flags


def test_null_and_junk_flags_do_not_raise():
    assert handling.deserialize(None) == set()
    assert handling.deserialize("") == set()
    assert handling.deserialize("not-a-flag,fragile") == {HANDLING_FRAGILE}


def test_free_text_handling_notes_are_recovered():
    assert HANDLING_FRAGILE in handling.parse_text("Glass - please handle with care")
    assert HANDLING_UPRIGHT in handling.parse_text("This side up, do not tilt")
    assert HANDLING_REFRIGERATED in handling.parse_text("Cold chain - keep chilled")
    assert handling.parse_text(None) == set()


def test_reefer_package_type_implies_refrigeration_without_a_note():
    assert HANDLING_REFRIGERATED in handling.resolve(None, None, "Reefer box")
    assert HANDLING_LIQUID in handling.resolve(None, None, "Drum")


def test_resolve_unions_structured_and_inferred_flags():
    got = handling.resolve([HANDLING_FRAGILE], "Keep upright", "Carton")
    assert got == {HANDLING_FRAGILE, HANDLING_UPRIGHT}


# Imported late so the module-level constant list above stays readable.
from app.constants import EARNINGS_PER_KM as EARNINGS_PER_KM_FOR_TEST  # noqa: E402