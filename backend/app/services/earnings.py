"""Earnings model for broadcast schedules and locked batches.

Deterministic by design — the figure a driver sees in the feed is exactly
recomputable from the schedule's own rows, so no randomness ever enters the
decision a driver makes. The broadcast figure is a straight-line estimate; the
final figure is recomputed from real Geoapify road distance at lock time.
"""

from typing import Iterable, Optional

from app.constants import (
    EARNINGS_BATCH_BONUS,
    EARNINGS_PER_KM,
    EARNINGS_PER_STOP,
    ESTIMATE_ROAD_FACTOR,
    TIER_STANDARD,
)
from app.ports import haversine_km, port_center


def _stop_tier(request) -> str:
    return getattr(request, "priority_tier", None) or TIER_STANDARD


def estimate_earnings(stop_count: int, tiers: Iterable[str], route_km: float) -> float:
    """Earnings for a schedule given its stop tiers and total route distance.

    stop_count / tiers / route_km must describe the same set of stops; callers
    pass `len(stops)` for the count.
    """
    tier_list = list(tiers)
    n = len(tier_list)
    per_stop = sum(EARNINGS_PER_STOP.get(t, EARNINGS_PER_STOP[TIER_STANDARD]) for t in tier_list)
    distance_pay = max(0.0, route_km) * EARNINGS_PER_KM
    batch_pay = max(0, n - 1) * EARNINGS_BATCH_BONUS
    return round(per_stop + distance_pay + batch_pay, 2)


def estimated_route_km(port_id: str, center_lat: float, center_lng: float) -> float:
    """Straight-line depot→area distance inflated by a road factor."""
    p_lat, p_lng = port_center(port_id)
    return round(haversine_km(p_lat, p_lng, center_lat, center_lng) * ESTIMATE_ROAD_FACTOR, 2)


def broadcast_earnings(port_id: str, center_lat: float, center_lng: float,
                       tiers: Iterable[str]) -> float:
    """The `estimated_earnings` a driver sees while a schedule is broadcasting."""
    route_km = estimated_route_km(port_id, center_lat, center_lng)
    return estimate_earnings(len(list(tiers)), tiers, route_km)


def final_earnings(tiers: Iterable[str], total_distance_km: Optional[float]) -> float:
    """The `final_earnings` recomputed once real road geometry exists."""
    return estimate_earnings(len(list(tiers)), tiers, total_distance_km or 0.0)