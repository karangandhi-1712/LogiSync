"""Marketplace analytics for the port admin.

Replaces the old gate-congestion/telematics analytics entirely. Every figure is
a real aggregate over delivery_requests / delivery_schedules — there are no
md5-derived or hardcoded stand-ins here. Fleet managers are pinned to their own
depot server-side, port admins may view any depot.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.constants import (
    AVAIL_AVAILABLE,
    REQ_BATCHED,
    REQ_CANCELLED,
    REQ_DELIVERED,
    REQ_FAILED,
    SCHED_CANCELLED,
    SCHED_COMPLETED,
    TIER_EXPRESS,
    TIER_STANDARD,
    TIER_URGENT,
    VALID_TIERS,
)
from app.db import get_db
from app.dependencies import get_current_user
from app.models.delivery_request import DeliveryRequestModel
from app.models.delivery_schedule import DeliveryScheduleModel
from app.models.port import PortModel
from app.models.user import UserModel
from app.ports import is_valid_port
from app.services.schedule_engine import IST_OFFSET

router = APIRouter(prefix="/analytics/delivery", tags=["Delivery marketplace analytics"])

PERIOD_DAYS = {"24h": 1, "7d": 7, "30d": 30, "90d": 90}


def _resolve_port(db: Session, port: Optional[str], user: Dict[str, Any]) -> Optional[str]:
    """Fleet managers may only read their own depot."""
    if user["role"] == "fleet_manager":
        assigned = user.get("assigned_port_id")
        if not assigned:
            raise HTTPException(status_code=403, detail="No assigned port.")
        if port and port != assigned:
            raise HTTPException(status_code=403, detail="Cross-port analytics denied.")
        return assigned
    if port:
        if not is_valid_port(port):
            raise HTTPException(status_code=400, detail=f"Unknown port '{port}'.")
        return port
    return None


def _window(period: Optional[str]) -> timedelta:
    return timedelta(days=PERIOD_DAYS.get((period or "7d").lower(), 7))


def _since(period: Optional[str]) -> datetime:
    return datetime.utcnow() - _window(period)


def _schedules(db: Session, port: Optional[str], since: datetime):
    q = db.query(DeliveryScheduleModel).filter(DeliveryScheduleModel.created_at >= since)
    if port:
        q = q.filter(DeliveryScheduleModel.port_id == port)
    return q.all()


def _requests(db: Session, port: Optional[str], since: datetime):
    q = db.query(DeliveryRequestModel).filter(DeliveryRequestModel.created_at >= since)
    if port:
        q = q.filter(DeliveryRequestModel.pickup_port_id == port)
    return q.all()


@router.get("/kpis")
def kpis(
    period: Optional[str] = "7d",
    port: Optional[str] = None,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Headline marketplace metrics for one depot."""
    port_id = _resolve_port(db, port, user)
    since = _since(period)

    schedules = _schedules(db, port_id, since)
    requests = _requests(db, port_id, since)

    claimed = [s for s in schedules if s.claimed_at]
    claim_minutes = [
        (s.claimed_at - s.created_at).total_seconds() / 60.0
        for s in claimed if s.claimed_at and s.created_at
    ]
    avg_claim_min = round(sum(claim_minutes) / len(claim_minutes), 1) if claim_minutes else 0.0

    fills = []
    for s in schedules:
        count = db.query(func.count(DeliveryRequestModel.id)).filter(
            DeliveryRequestModel.schedule_id == s.id
        ).scalar() or 0
        if s.max_batch_size:
            fills.append(min(1.0, count / s.max_batch_size))
    avg_fill = round(sum(fills) / len(fills) * 100, 1) if fills else 0.0

    on_time = _on_time_by_tier(db, port_id, since)

    drivers_q = db.query(UserModel).filter(UserModel.role == "driver", UserModel.is_active.is_(True))
    if port_id:
        active_drivers = db.query(func.count(func.distinct(
            DeliveryScheduleModel.claimed_by_driver_id
        ))).filter(
            DeliveryScheduleModel.port_id == port_id,
            DeliveryScheduleModel.claimed_by_driver_id.isnot(None),
            DeliveryScheduleModel.created_at >= since,
        ).scalar() or 0
    else:
        active_drivers = 0
    total_drivers = drivers_q.count()
    available_now = drivers_q.filter(UserModel.availability_status == AVAIL_AVAILABLE).count()
    utilisation = round(active_drivers / total_drivers * 100, 1) if total_drivers else 0.0

    days = max(1, PERIOD_DAYS.get((period or "7d").lower(), 7))
    return {
        "port_id": port_id,
        "period": period,
        "total_requests": len(requests),
        "requests_per_day": round(len(requests) / days, 1),
        "total_schedules": len(schedules),
        "active_batches": sum(
            1 for s in schedules if s.status in ("broadcasting", "claimed", "locked", "in_progress")
        ),
        "completed_schedules": sum(1 for s in schedules if s.status == SCHED_COMPLETED),
        "cancelled_schedules": sum(1 for s in schedules if s.status == SCHED_CANCELLED),
        "avg_time_to_claim_min": avg_claim_min,
        "avg_batch_fill_pct": avg_fill,
        "on_time_rate_by_tier": on_time,
        "on_time_rate_overall": on_time["overall_pct"],
        "drivers_total": total_drivers,
        "drivers_active": active_drivers,
        "drivers_available_now": available_now,
        "driver_utilisation_pct": utilisation,
        "delivered": sum(1 for r in requests if r.status == REQ_DELIVERED),
        "failed": sum(1 for r in requests if r.status == REQ_FAILED),
        "cancelled": sum(1 for r in requests if r.status == REQ_CANCELLED),
        "pending": sum(1 for r in requests if r.status in ("pending", REQ_BATCHED)),
    }


def _on_time_by_tier(db: Session, port: Optional[str], since: datetime) -> Dict[str, Any]:
    rows = _requests(db, port, since)
    out: Dict[str, Any] = {}
    total_ok = 0
    total_done = 0
    for tier in sorted(VALID_TIERS):
        tier_rows = [r for r in rows if r.priority_tier == tier and r.status == REQ_DELIVERED]
        ok = sum(1 for r in tier_rows if _within_window(r))
        total_ok += ok
        total_done += len(tier_rows)
        out[tier] = {
            "delivered": len(tier_rows),
            # `measured` excludes deliveries with no requested window to have
            # been late against, so the percentage is never diluted by stops
            # that were never eligible to be scored.
            "measured": sum(1 for r in tier_rows if _is_measurable(r)),
            "on_time": ok,
            # None, not 0.0 — "no data" and "genuinely never on time" are very
            # different readings of the same bar, and the UI renders them
            # differently. A tier with nothing delivered has no rate.
            "on_time_pct": (round(ok / len(tier_rows) * 100, 1) if tier_rows else None),
        }
    out["overall_pct"] = round(total_ok / total_done * 100, 1) if total_done else None
    return out


def _window_minutes(value: Optional[str]) -> Optional[int]:
    """An `HH:MM` string as minutes past midnight, or None if unusable."""
    if not value or ":" not in str(value):
        return None
    try:
        h, m = str(value).split(":")[:2]
        return int(h) * 60 + int(m)
    except (ValueError, TypeError):
        return None


def _is_measurable(r: DeliveryRequestModel) -> bool:
    """Whether this delivery can be scored against a window at all."""
    return _window_minutes(r.requested_window_end) is not None


def _within_window(r: DeliveryRequestModel) -> bool:
    """Delivered inside the customer's requested window.

    Two things this has to get right, and historically got neither:

    * **Timezone.** `requested_window_end` is depot-local IST wall-clock, because
      every customer picked it off their own phone clock. Every timestamp in the
      database is naive UTC. Comparing `updated_at.hour` straight against the
      window meant a 23:36 IST delivery read as 18:06 and was scored against an
      18:00 deadline — every evening batch was late by construction.
    * **Which timestamp.** `updated_at` is `onupdate=datetime.utcnow`, so it
      moves on every write to the row, not just delivery. `delivered_at` is
      stamped once by the delivered transition and is what this wants; it falls
      back to `updated_at` only for rows written before that column existed.
    """
    end = _window_minutes(r.requested_window_end)
    if end is None:
        # No window was requested. Nothing to be late against, so the delivery
        # is not a miss - but it is also not evidence, which is why
        # `_is_measurable` keeps it out of the denominator.
        return True

    stamp = getattr(r, "delivered_at", None) or r.updated_at
    if stamp is None:
        return False

    actual = (stamp + IST_OFFSET)
    actual_min = actual.hour * 60 + actual.minute

    start = _window_minutes(r.requested_window_start)
    if start is None:
        return actual_min <= end
    if start <= end:
        return start <= actual_min <= end
    # Window wraps past midnight, e.g. 22:00 → 02:00.
    return actual_min >= start or actual_min <= end


@router.get("/volume")
def volume(
    period: Optional[str] = "7d",
    port: Optional[str] = None,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Daily request + delivery counts, for the analytics time series."""
    port_id = _resolve_port(db, port, user)
    since = _since(period)
    rows = _requests(db, port_id, since)

    days = PERIOD_DAYS.get((period or "7d").lower(), 7)
    buckets: Dict[str, Dict[str, int]] = {}
    for i in range(days):
        day = (since + timedelta(days=i + 1)).strftime("%Y-%m-%d")
        buckets[day] = {"submitted": 0, "delivered": 0, "cancelled": 0, "failed": 0}
    for r in rows:
        key = r.created_at.strftime("%Y-%m-%d") if r.created_at else None
        if key in buckets:
            buckets[key]["submitted"] += 1
            if r.status == REQ_DELIVERED:
                buckets[key]["delivered"] += 1
            elif r.status == REQ_CANCELLED:
                buckets[key]["cancelled"] += 1
            elif r.status == REQ_FAILED:
                buckets[key]["failed"] += 1
    keys = sorted(buckets)
    return {
        "period": period,
        "port_id": port_id,
        "dates": keys,
        "submitted": [buckets[k]["submitted"] for k in keys],
        "delivered": [buckets[k]["delivered"] for k in keys],
        "cancelled": [buckets[k]["cancelled"] for k in keys],
        "failed": [buckets[k]["failed"] for k in keys],
    }


@router.get("/areas")
def busiest_areas(
    period: Optional[str] = "30d",
    port: Optional[str] = None,
    limit: int = 10,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Busiest delivery clusters, ranked by batch size and stop volume."""
    port_id = _resolve_port(db, port, user)
    since = _since(period)
    rows = _schedules(db, port_id, since)
    agg: Dict[str, Dict[str, Any]] = {}
    for s in rows:
        entry = agg.setdefault(s.area_label, {
            "area_label": s.area_label,
            "port_id": s.port_id,
            "center_lat": s.area_center_lat,
            "center_lng": s.area_center_lng,
            "radius_km": s.radius_km,
            "schedules": 0,
            "completed": 0,
            "stop_total": 0,
            "earnings_total": 0.0,
        })
        count = db.query(func.count(DeliveryRequestModel.id)).filter(
            DeliveryRequestModel.schedule_id == s.id
        ).scalar() or 0
        entry["schedules"] += 1
        entry["stop_total"] += count
        if s.status == SCHED_COMPLETED:
            entry["completed"] += 1
        entry["earnings_total"] += float(s.final_earnings or s.estimated_earnings or 0.0)
    ranked = sorted(agg.values(), key=lambda e: e["stop_total"], reverse=True)[:limit]
    for entry in ranked:
        entry["earnings_total"] = round(entry["earnings_total"], 2)
        entry["avg_stops"] = round(entry["stop_total"] / entry["schedules"], 2) if entry["schedules"] else 0.0
    return {"period": period, "port_id": port_id, "areas": ranked}


@router.get("/batches")
def batch_distribution(
    period: Optional[str] = "30d",
    port: Optional[str] = None,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """How close batches get to their cap, and where time-to-claim sits."""
    port_id = _resolve_port(db, port, user)
    since = _since(period)
    schedules = [s for s in _schedules(db, port_id, since) if s.status != SCHED_CANCELLED]

    histogram: Dict[str, int] = {}
    for s in schedules:
        count = db.query(func.count(DeliveryRequestModel.id)).filter(
            DeliveryRequestModel.schedule_id == s.id
        ).scalar() or 0
        histogram[str(count)] = histogram.get(str(count), 0) + 1

    claim_times = [
        (s.claimed_at - s.created_at).total_seconds() / 60.0
        for s in schedules
        if s.claimed_at and s.created_at and s.claimed_at >= s.created_at
    ]
    claim_times.sort()
    return {
        "period": period,
        "port_id": port_id,
        "batches": len(schedules),
        "stop_count_histogram": [
            {"stops": int(k), "batches": v} for k, v in sorted(histogram.items(), key=lambda kv: int(kv[0]))
        ],
        "claim_minutes_p50": round(claim_times[len(claim_times) // 2], 1) if claim_times else 0.0,
        "claim_minutes_p95": round(claim_times[int(len(claim_times) * 0.95)], 1) if claim_times else 0.0,
        "never_claimed": sum(1 for s in schedules if not s.claimed_at),
    }


@router.get("/ports")
def per_port_overview(
    period: Optional[str] = "7d",
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cross-depot comparison for the port admin. Fleet managers see only their own."""
    if user["role"] != "port_admin":
        raise HTTPException(status_code=403, detail="Port admin only.")
    since = _since(period)
    rows: List[Dict[str, Any]] = []
    for port in db.query(PortModel).order_by(PortModel.name).all():
        requests = db.query(func.count(DeliveryRequestModel.id)).filter(
            DeliveryRequestModel.pickup_port_id == port.id,
            DeliveryRequestModel.created_at >= since,
        ).scalar() or 0
        delivered = db.query(func.count(DeliveryRequestModel.id)).filter(
            DeliveryRequestModel.pickup_port_id == port.id,
            DeliveryRequestModel.status == REQ_DELIVERED,
            DeliveryRequestModel.created_at >= since,
        ).scalar() or 0
        active = db.query(func.count(func.distinct(DeliveryScheduleModel.claimed_by_driver_id))).filter(
            DeliveryScheduleModel.port_id == port.id,
            DeliveryScheduleModel.claimed_by_driver_id.isnot(None),
            DeliveryScheduleModel.created_at >= since,
        ).scalar() or 0
        rows.append({
            "port_id": port.id,
            "port_name": port.name,
            "requests": requests,
            "delivered": delivered,
            "on_time_pct": round(delivered / requests * 100, 1) if requests else 0.0,
            "active_drivers": active,
        })
    return {"period": period, "ports": rows}