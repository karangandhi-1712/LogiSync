"""Schedule lifecycle: auto-attach, lock, completion.

Everything that mutates a schedule outside of the claim lives here so the rules
for "may this schedule still take a stop?" and "is this batch finished?" exist
in exactly one place.
"""

import asyncio
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.constants import (
    AVAIL_AVAILABLE,
    REQ_BATCHED,
    REQ_CANCELLED,
    REQ_DELIVERED,
    REQ_FAILED,
    SCHED_BROADCASTING,
    SCHED_CANCELLED,
    SCHED_CLAIMED,
    SCHED_COMPLETED,
    SCHED_IN_PROGRESS,
    SCHED_LOCKED,
    TIER_URGENT,
)
from app.models.delivery_request import DeliveryRequestModel
from app.models.delivery_schedule import DeliveryScheduleModel
from app.models.status_log import StatusUpdateLogModel
from app.models.user import UserModel
from app.ports import haversine_km
from app.services.earnings import broadcast_earnings, final_earnings
from app.services.route_optimizer import optimize_schedule


#: All 12 depots are in India, so departure windows are IST wall-clock even
#: though every timestamp in the database is naive UTC. Windows are compared in
#: IST — comparing them against UTC made every morning batch invisible for the
#: whole of its real operating day.
IST_OFFSET = timedelta(hours=5, minutes=30)


def ist_now() -> datetime:
    """Current depot-local (IST) wall clock, as a naive datetime."""
    return datetime.utcnow() + IST_OFFSET


def stop_count(db: Session, schedule_id: str) -> int:
    return db.query(func.count(DeliveryRequestModel.id)).filter(
        DeliveryRequestModel.schedule_id == schedule_id
    ).scalar() or 0


def _hhmm_to_min(value: Optional[str]) -> Optional[int]:
    if not value or ":" not in value:
        return None
    try:
        h, m = value.split(":")[:2]
        return int(h) * 60 + int(m)
    except (ValueError, TypeError):
        return None


def window_open(now: datetime, window_start: Optional[str], window_end: Optional[str]) -> bool:
    """True when the schedule's departure window (IST wall clock) is open.

    `now` is interpreted as depot-local time; callers pass `ist_now()`. Only the
    time-of-day is compared: a batch is relevant to a driver within its
    departure day, and the consumer picks a preferred window rather than a hard
    deadline.
    """
    now_min = now.hour * 60 + now.minute
    start = _hhmm_to_min(window_start)
    end = _hhmm_to_min(window_end)
    if start is None or end is None:
        return True
    if start <= end:
        return start <= now_min <= end
    # Window wraps past midnight.
    return now_min >= start or now_min <= end


def can_accept_stop(db: Session, schedule: DeliveryScheduleModel, now: Optional[datetime] = None) -> Tuple[bool, str]:
    """Whether a new delivery request may attach to this schedule, and why not."""
    now = now or ist_now()
    if schedule.status in (SCHED_COMPLETED, SCHED_CANCELLED):
        return False, f"Schedule is {schedule.status}."
    if schedule.status not in (SCHED_BROADCASTING, SCHED_CLAIMED):
        return False, f"Schedule is {schedule.status}; it is locked."
    if stop_count(db, schedule.id) >= schedule.max_batch_size:
        return False, "Schedule is already at its batch cap."
    if not window_open(now, schedule.departure_window_start, schedule.departure_window_end):
        return False, "The departure window has closed."
    if schedule.status == SCHED_CLAIMED and schedule.claimed_by_driver_id:
        driver = db.query(UserModel).filter(UserModel.id == schedule.claimed_by_driver_id).first()
        if driver and driver.going_offline_at and driver.going_offline_at <= now:
            return False, "The claiming driver is going offline."
    return True, ""


def find_attach_target(db: Session, request: DeliveryRequestModel,
                       now: Optional[datetime] = None) -> Optional[DeliveryScheduleModel]:
    """The claimed-but-unlocked schedule in this port whose area covers `request`.

    Auto-attach never steals from another driver: only `claimed` schedules are
    eligible, and only while they still have room and their driver is online.
    """
    now = now or ist_now()
    candidates = db.query(DeliveryScheduleModel).filter(
        DeliveryScheduleModel.port_id == request.pickup_port_id,
        DeliveryScheduleModel.status == SCHED_CLAIMED,
    ).all()
    for sched in candidates:
        distance = haversine_km(
            sched.area_center_lat, sched.area_center_lng,
            request.delivery_lat, request.delivery_lng,
        )
        if distance <= sched.radius_km:
            ok, _ = can_accept_stop(db, sched, now)
            if ok:
                return sched
    return None


def attach_request(db: Session, schedule: DeliveryScheduleModel,
                   request: DeliveryRequestModel, actor_id: Optional[str] = None) -> None:
    """Attach a single pending request to an open schedule."""
    ok, reason = can_accept_stop(db, schedule)
    if not ok:
        raise ValueError(reason)
    request.schedule_id = schedule.id
    request.status = REQ_BATCHED
    db.add(StatusUpdateLogModel(
        delivery_request_id=request.id,
        schedule_id=schedule.id,
        old_status="pending",
        new_status=REQ_BATCHED,
        updated_by=actor_id,
    ))
    schedule.estimated_earnings = _recompute_estimate(db, schedule)


def _recompute_estimate(db: Session, schedule: DeliveryScheduleModel) -> float:
    tiers = [
        r.priority_tier for r in db.query(DeliveryRequestModel).filter(
            DeliveryRequestModel.schedule_id == schedule.id
        ).all()
    ]
    if not tiers:
        return 0.0
    return broadcast_earnings(
        schedule.port_id, schedule.area_center_lat, schedule.area_center_lng, tiers
    )


async def lock_schedule(db: Session, schedule: DeliveryScheduleModel,
                        actor_id: Optional[str] = None) -> DeliveryScheduleModel:
    """Freeze the batch: assign stop_sequence + optimized_route, stop accepting stops."""
    old = schedule.status
    schedule.status = SCHED_LOCKED
    schedule.locked_at = datetime.utcnow()
    db.add(StatusUpdateLogModel(
        schedule_id=schedule.id, old_status=old, new_status=SCHED_LOCKED, updated_by=actor_id,
    ))
    db.flush()  # make the status visible to the optimizer's own query

    payload = await optimize_schedule(db, schedule)
    schedule.optimized_route = payload
    schedule.final_earnings = final_earnings(
        [r.priority_tier for r in db.query(DeliveryRequestModel).filter(
            DeliveryRequestModel.schedule_id == schedule.id
        ).all()],
        payload.get("total_distance_km"),
    )
    db.commit()
    db.refresh(schedule)
    return schedule


def mark_departed(db: Session, schedule: DeliveryScheduleModel, driver_id: str) -> DeliveryScheduleModel:
    """Driver loaded up and left the depot: locked → in_progress."""
    if schedule.status not in (SCHED_LOCKED, SCHED_CLAIMED):
        raise ValueError(f"Cannot depart a {schedule.status} schedule.")
    old = schedule.status
    schedule.status = SCHED_IN_PROGRESS
    schedule.departed_at = datetime.utcnow()
    db.add(StatusUpdateLogModel(
        schedule_id=schedule.id, old_status=old, new_status=SCHED_IN_PROGRESS, updated_by=driver_id,
    ))
    db.commit()
    db.refresh(schedule)
    return schedule


def maybe_complete(db: Session, schedule: DeliveryScheduleModel, actor_id: Optional[str] = None) -> bool:
    """Complete the batch once every stop is terminal; free the driver to be broadcast to again.

    Returns True when this call is what closed the schedule out.
    """
    if schedule.status in (SCHED_COMPLETED, SCHED_CANCELLED):
        return False
    stops = db.query(DeliveryRequestModel).filter(
        DeliveryRequestModel.schedule_id == schedule.id
    ).all()
    if not stops:
        return False
    if not all(s.status in (REQ_DELIVERED, REQ_FAILED, REQ_CANCELLED) for s in stops):
        return False

    old = schedule.status
    schedule.status = SCHED_COMPLETED
    schedule.completed_at = datetime.utcnow()
    db.add(StatusUpdateLogModel(
        schedule_id=schedule.id, old_status=old, new_status=SCHED_COMPLETED, updated_by=actor_id,
    ))
    if schedule.claimed_by_driver_id:
        driver = db.query(UserModel).filter(UserModel.id == schedule.claimed_by_driver_id).first()
        if driver:
            driver.availability_status = AVAIL_AVAILABLE
            driver.going_offline_at = None
    db.commit()
    return True


def find_urgent_without_batch(db: Session, port_id: str) -> List[DeliveryRequestModel]:
    """Urgent pending requests with no open schedule covering their address.

    Drives the fleet manager's "create an immediate schedule?" prompt.
    """
    pending = db.query(DeliveryRequestModel).filter(
        DeliveryRequestModel.pickup_port_id == port_id,
        DeliveryRequestModel.status == "pending",
        DeliveryRequestModel.priority_tier == TIER_URGENT,
    ).all()
    out: List[DeliveryRequestModel] = []
    for req in pending:
        target = find_attach_target(db, req)
        if target is None:
            # Also treat "no broadcasting schedule nearby" as uncovered.
            nearby = db.query(DeliveryScheduleModel).filter(
                DeliveryScheduleModel.port_id == port_id,
                DeliveryScheduleModel.status.in_([SCHED_BROADCASTING, SCHED_CLAIMED]),
            ).all()
            covered = any(
                haversine_km(s.area_center_lat, s.area_center_lng,
                             req.delivery_lat, req.delivery_lng) <= s.radius_km
                for s in nearby
            )
            if not covered:
                out.append(req)
    return out


def sweep_schedules(db: Session) -> List[str]:
    """Background housekeeping: lock batches whose departure window has closed.

    Returns the ids of schedules that changed, so the caller can emit events.
    """
    now = ist_now()
    changed: List[str] = []
    due = db.query(DeliveryScheduleModel).filter(
        DeliveryScheduleModel.status == SCHED_CLAIMED,
    ).all()
    for sched in due:
        if not window_open(now, sched.departure_window_start, sched.departure_window_end):
            # Sync path only: mark locked, geometry is filled on next departure.
            sched.status = SCHED_LOCKED
            sched.locked_at = now
            db.add(StatusUpdateLogModel(
                schedule_id=sched.id, old_status=SCHED_CLAIMED,
                new_status=SCHED_LOCKED, updated_by=None,
            ))
            changed.append(sched.id)
    if changed:
        db.commit()
    return changed


def run_sweep() -> None:
    """Async-safe entrypoint for the background task."""
    from app.db import SessionLocal
    from app.services.events import emit

    db = SessionLocal()
    try:
        changed = sweep_schedules(db)
        for schedule_id in changed:
            asyncio.run(emit("schedule:locked", {"schedule_id": schedule_id}))
    except Exception:
        db.rollback()
    finally:
        db.close()