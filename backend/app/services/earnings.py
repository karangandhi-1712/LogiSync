"""Earnings model for broadcast schedules and locked batches.

Deterministic by design — the figure a driver sees in the feed is exactly
recomputable from the schedule's own rows, so no randomness ever enters the
decision a driver makes. The broadcast figure is a straight-line estimate; the
final figure is recomputed from real Geoapify road distance at lock time.

A stop is described by a `StopEarnings` rather than a bare tier, because tier
alone understates the work: a fragile 40 kg upright parcel takes longer to load
and carry than a 2 kg envelope at the same tier. Both the per-stop breakdown and
the batch total come out of the same pass, so the driver sees exactly where the
money goes.
"""

from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Sequence

from app.constants import (
    EARNINGS_BATCH_BONUS,
    EARNINGS_PER_KG,
    EARNINGS_PER_KM,
    EARNINGS_PER_STOP,
    EARNINGS_WEIGHT_CAP_KG,
    ESTIMATE_ROAD_FACTOR,
    HANDLING_SURCHARGE,
    TIER_STANDARD,
)
from app.ports import haversine_km, port_center
from app.services.handling import resolve as resolve_handling


@dataclass(frozen=True)
class StopEarnings:
    """One stop's contribution to a driver's batch payout."""

    reference: str
    tier: str = TIER_STANDARD
    weight_kg: Optional[float] = None
    flags: Optional[Iterable[str]] = None

    @property
    def base(self) -> float:
        return EARNINGS_PER_STOP.get(self.tier, EARNINGS_PER_STOP[TIER_STANDARD])

    @property
    def capped_weight(self) -> float:
        try:
            weight = float(self.weight_kg) if self.weight_kg not in (None, "") else 0.0
        except (TypeError, ValueError):
            weight = 0.0
        return max(0.0, min(weight, EARNINGS_WEIGHT_CAP_KG))

    @property
    def weight_pay(self) -> float:
        return self.capped_weight * EARNINGS_PER_KG

    @property
    def active_flags(self) -> List[str]:
        return sorted(resolve_handling(self.flags))

    @property
    def handling_pay(self) -> float:
        return sum(HANDLING_SURCHARGE.get(f, 0.0) for f in self.active_flags)

    @property
    def total(self) -> float:
        return self.base + self.weight_pay + self.handling_pay

    def breakdown(self) -> Dict[str, Any]:
        return {
            "reference": self.reference,
            "priority_tier": self.tier,
            "weight_kg": round(self.capped_weight, 2),
            "handling_flags": self.active_flags,
            "base_pay": round(self.base, 2),
            "weight_pay": round(self.weight_pay, 2),
            "handling_pay": round(self.handling_pay, 2),
            "stop_total": round(self.total, 2),
        }


def stop_from_request(request) -> StopEarnings:
    """Build a `StopEarnings` from a `DeliveryRequestModel` row.

    Structured `handling_flags` are preferred; the free-text note and package type
    fill in anything the customer did not express as a chip.
    """
    return StopEarnings(
        reference=getattr(request, "token_number", "") or "",
        tier=getattr(request, "priority_tier", None) or TIER_STANDARD,
        weight_kg=getattr(request, "package_weight", None),
        flags=resolve_handling(
            getattr(request, "handling_flags", None),
            getattr(request, "special_handling", None),
            getattr(request, "package_type", None),
        ),
    )


def estimate_earnings(stops: Sequence[StopEarnings], route_km: float) -> float:
    """Total payout for a schedule given its stops and total route distance.

    `stops` and `route_km` must describe the same run — callers pass every stop
    they attached, not a separate count.
    """
    if not stops:
        return 0.0
    per_stop = sum(s.total for s in stops)
    distance_pay = max(0.0, float(route_km or 0.0)) * EARNINGS_PER_KM
    batch_pay = max(0, len(stops) - 1) * EARNINGS_BATCH_BONUS
    return round(per_stop + distance_pay + batch_pay, 2)


def earnings_quote(stops: Sequence[StopEarnings], route_km: float) -> Dict[str, Any]:
    """The full payout breakdown: per stop, then distance and batch bonus.

    Returned whole so the fleet manager's estimate and the driver's final figure
    are the same computation, not two implementations that can disagree.
    """
    rows = [s.breakdown() for s in stops]
    distance_pay = round(max(0.0, float(route_km or 0.0)) * EARNINGS_PER_KM, 2)
    batch_pay = round(max(0, len(stops) - 1) * EARNINGS_BATCH_BONUS, 2)
    return {
        "stops": rows,
        "stop_count": len(rows),
        "route_km": round(max(0.0, float(route_km or 0.0)), 2),
        "stops_pay": round(sum(r["stop_total"] for r in rows), 2),
        "distance_pay": distance_pay,
        "batch_bonus": batch_pay,
        "total": estimate_earnings(stops, route_km),
    }


def estimated_route_km(port_id: str, center_lat: float, center_lng: float) -> float:
    """Straight-line depot→area distance inflated by a road factor."""
    p_lat, p_lng = port_center(port_id)
    return round(haversine_km(p_lat, p_lng, center_lat, center_lng) * ESTIMATE_ROAD_FACTOR, 2)


def schedule_stops(db, schedule_id: str) -> List[StopEarnings]:
    """Every stop currently attached to a schedule, as earnings inputs."""
    from app.models.delivery_request import DeliveryRequestModel

    rows = db.query(DeliveryRequestModel).filter(
        DeliveryRequestModel.schedule_id == schedule_id
    ).all()
    return [stop_from_request(r) for r in rows]


def broadcast_earnings(port_id: str, center_lat: float, center_lng: float,
                       stops: Iterable[Any]) -> float:
    """The `estimated_earnings` a driver sees while a schedule is broadcasting.

    `stops` may be `DeliveryRequestModel` rows or `StopEarnings` values, so the
    existing call sites that only had tiers can pass requests directly.
    """
    resolved = [
        s if isinstance(s, StopEarnings) else stop_from_request(s) for s in stops
    ]
    route_km = estimated_route_km(port_id, center_lat, center_lng)
    return estimate_earnings(resolved, route_km)


def final_earnings(stops: Iterable[Any], total_distance_km: Optional[float]) -> float:
    """The `final_earnings` recomputed once real road geometry exists."""
    resolved = [
        s if isinstance(s, StopEarnings) else stop_from_request(s) for s in stops
    ]
    return estimate_earnings(resolved, total_distance_km or 0.0)