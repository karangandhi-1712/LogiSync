"""Atomic schedule claiming.

Two drivers must never both end up assigned to the same schedule. That is
guaranteed here by a single conditional UPDATE rather than a read-then-write:
the `status = 'broadcasting'` predicate is part of the write itself, so the
database serialises competing claims and exactly one of them can match a row.

    UPDATE delivery_schedules
       SET status='claimed', claimed_by_driver_id=:driver_id, claimed_at=now()
     WHERE id=:schedule_id AND status='broadcasting'

`rowcount == 0` therefore means "someone beat us to it", never "we raced". The
row lock taken by the UPDATE is held until the transaction commits, so the
losing driver's request cannot interleave before the winner's own cascade.
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.constants import (
    REQ_ASSIGNED,
    REQ_BATCHED,
    SCHED_BROADCASTING,
    SCHED_CLAIMED,
)
from app.models.delivery_request import DeliveryRequestModel
from app.models.delivery_schedule import DeliveryScheduleModel
from app.models.status_log import StatusUpdateLogModel
from app.services.earnings import broadcast_earnings


class ClaimError(Exception):
    """Base for claim failures."""


class ScheduleNotFound(ClaimError):
    pass


class ScheduleUnavailable(ClaimError):
    """Not in `broadcasting` — already claimed, locked, running or finished."""


class DriverNotAvailable(ClaimError):
    """Driver is offline/busy, or already holds another un-finished batch."""


def attach_stops(db: Session, schedule: DeliveryScheduleModel,
                 requests: List[DeliveryRequestModel], actor_id: Optional[str] = None) -> None:
    """Flip the given requests to `batched` and point them at this schedule.

    Caller is responsible for having already validated port ownership and that
    each request is still `pending`.
    """
    for req in requests:
        req.schedule_id = schedule.id
        req.status = REQ_ASSIGNED if schedule.status == SCHED_CLAIMED else REQ_BATCHED
        db.add(StatusUpdateLogModel(
            delivery_request_id=req.id,
            schedule_id=schedule.id,
            old_status="pending",
            new_status=req.status,
            updated_by=actor_id,
        ))
    db.add(StatusUpdateLogModel(
        schedule_id=schedule.id,
        old_status=None,
        new_status=SCHED_BROADCASTING,
        updated_by=actor_id,
    ))


def claim_schedule(db: Session, schedule_id: str, driver_id: str) -> DeliveryScheduleModel:
    """Claim `schedule_id` for `driver_id`.

    Raises ScheduleNotFound / ScheduleUnavailable / DriverNotAvailable. On
    success the schedule is claimed AND its stops are promoted to `assigned` in
    the same transaction — the caller commits.
    """
    schedule = db.query(DeliveryScheduleModel).filter(
        DeliveryScheduleModel.id == schedule_id
    ).first()
    if not schedule:
        raise ScheduleNotFound(schedule_id)

    # ── Pre-checks that produce a better error message than a bare 409. None of
    #    these replace the guarded UPDATE below; they only avoid the cascade.
    if schedule.status in (SCHED_CLAIMED,) or schedule.claimed_by_driver_id:
        raise ScheduleUnavailable("Schedule is already claimed.")
    if schedule.status != SCHED_BROADCASTING:
        raise ScheduleUnavailable(f"Schedule is {schedule.status}, not open for claiming.")

    open_batch = db.query(DeliveryScheduleModel).filter(
        DeliveryScheduleModel.claimed_by_driver_id == driver_id,
        DeliveryScheduleModel.status.in_(["claimed", "locked", "in_progress"]),
    ).first()
    if open_batch:
        raise DriverNotAvailable("You already have an active batch. Finish it first.")

    stops = _stops_for(db, schedule.id)
    if not stops:
        raise ScheduleUnavailable("Schedule has no stops to deliver.")

    # ── THE ATOMIC CLAIM ────────────────────────────────────────────────────
    result = db.execute(
        update(DeliveryScheduleModel)
        .where(
            DeliveryScheduleModel.id == schedule_id,
            DeliveryScheduleModel.status == SCHED_BROADCASTING,
        )
        .values(
            status=SCHED_CLAIMED,
            claimed_by_driver_id=driver_id,
            claimed_at=datetime.utcnow(),
            estimated_earnings=broadcast_earnings(
                schedule.port_id, schedule.area_center_lat,
                schedule.area_center_lng, [r.priority_tier for r in stops],
            ),
        )
        .execution_options(synchronize_session=False)
    )
    if result.rowcount == 0:
        # Lost the race. Roll back any partial work and surface a 409.
        db.rollback()
        raise ScheduleUnavailable("Schedule was just claimed by another driver.")

    # ── Cascade: promote stops to `assigned`, in the same transaction. ──────
    for req in stops:
        req.status = REQ_ASSIGNED
        db.add(StatusUpdateLogModel(
            delivery_request_id=req.id,
            schedule_id=schedule.id,
            old_status="batched",
            new_status=REQ_ASSIGNED,
            updated_by=driver_id,
        ))
    db.add(StatusUpdateLogModel(
        schedule_id=schedule.id,
        old_status=SCHED_BROADCASTING,
        new_status=SCHED_CLAIMED,
        updated_by=driver_id,
    ))

    db.commit()
    db.refresh(schedule)
    return schedule


def _stops_for(db: Session, schedule_id: str) -> List[DeliveryRequestModel]:
    return (
        db.query(DeliveryRequestModel)
        .filter(DeliveryRequestModel.schedule_id == schedule_id)
        .order_by(DeliveryRequestModel.created_at.asc())
        .all()
    )