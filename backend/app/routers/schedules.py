"""Delivery schedules: broadcast, claim, lock, execute.

Fleet-manager endpoints are pinned to `user.assigned_port_id`. Driver endpoints
are cross-port by design — a driver takes work from any depot, which is why the
broadcast reaches every available driver.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.constants import (
    AVAIL_AVAILABLE,
    DEFAULT_MAX_BATCH_SIZE,
    MAX_RADIUS_KM,
    MIN_RADIUS_KM,
    REQ_PENDING,
    SCHED_BROADCASTING,
    SCHED_CANCELLED,
    SCHED_CLAIMED,
    SCHED_COMPLETED,
    SCHED_IN_PROGRESS,
    SCHED_LOCKED,
    TIER_URGENT,
)
from app.db import get_db
from app.dependencies import get_current_user, require_role
from app.models.delivery_request import DeliveryRequestModel
from app.models.delivery_schedule import DeliveryScheduleModel
from app.models.port import PortModel
from app.models.status_log import StatusUpdateLogModel
from app.models.user import UserModel
from app.ports import haversine_km, is_valid_port
from app.serializers import (
    serialize_request,
    serialize_schedule,
    serialize_user_light,
)
from app.services import claim_service, events, payments, schedule_engine
from app.services.payments import PAYMENT_PAID
from app.services.earnings import (
    broadcast_earnings,
    earnings_quote,
    estimated_route_km,
    stop_from_request,
)

router = APIRouter(prefix="/schedules", tags=["Delivery schedules"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class CreateScheduleIn(BaseModel):
    port_id: str
    area_label: str = Field(min_length=2, max_length=160)
    area_center_lat: float = Field(ge=-90, le=90)
    area_center_lng: float = Field(ge=-180, le=180)
    radius_km: float = Field(default=6.0, ge=MIN_RADIUS_KM, le=MAX_RADIUS_KM)
    departure_window_start: str = Field(pattern=r"^\d{2}:\d{2}$")
    departure_window_end: str = Field(pattern=r"^\d{2}:\d{2}$")
    max_batch_size: int = Field(default=DEFAULT_MAX_BATCH_SIZE, ge=1, le=12)
    request_ids: List[str] = Field(default_factory=list)


class AttachStopsIn(BaseModel):
    request_ids: List[str]


class DriverPositionIn(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    heading: Optional[float] = None


# ── Helpers ──────────────────────────────────────────────────────────────────

def _fm_port(db: Session, user: Dict[str, Any]) -> str:
    port_id = user.get("assigned_port_id")
    if not port_id:
        raise HTTPException(status_code=403, detail="No assigned port.")
    if not db.query(PortModel).filter(PortModel.id == port_id).first():
        raise HTTPException(status_code=400, detail=f"Assigned port '{port_id}' is not a known depot.")
    return port_id


def _load_schedule(db: Session, schedule_id: str) -> DeliveryScheduleModel:
    s = db.query(DeliveryScheduleModel).filter(
        DeliveryScheduleModel.id == schedule_id
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Schedule not found.")
    return s


def _with_context(db: Session, s: DeliveryScheduleModel, *,
                  include_route: bool = False,
                  include_stops: bool = False) -> Dict[str, Any]:
    port = db.query(PortModel).filter(PortModel.id == s.port_id).first()
    driver = db.query(UserModel).filter(UserModel.id == s.claimed_by_driver_id).first() \
        if s.claimed_by_driver_id else None
    body = serialize_schedule(
        s, port=port, driver=driver,
        stop_count=schedule_engine.stop_count(db, s.id),
        include_route=include_route,
    )
    if include_stops:
        body["stops"] = [
            serialize_request(r) for r in _ordered_stops(db, s.id)
        ]
    return body


def _ordered_stops(db: Session, schedule_id: str) -> List[DeliveryRequestModel]:
    """Stops in delivery order; un-sequenced stops fall back to intake order."""
    return db.query(DeliveryRequestModel).filter(
        DeliveryRequestModel.schedule_id == schedule_id
    ).order_by(
        DeliveryRequestModel.stop_sequence.is_(None),
        DeliveryRequestModel.stop_sequence.asc(),
        DeliveryRequestModel.created_at.asc(),
    ).all()


def _fm_owned(db: Session, s: DeliveryScheduleModel, user: Dict[str, Any]) -> None:
    if user["role"] == "fleet_manager" and s.fleet_manager_id != user["sub"]:
        raise HTTPException(status_code=403, detail="Not your schedule.")
    if user["role"] == "fleet_manager" and s.port_id != user.get("assigned_port_id"):
        raise HTTPException(status_code=403, detail="Cross-port access denied.")


def _available_driver_ids(db: Session) -> List[str]:
    return [
        u.id for u in db.query(UserModel).filter(
            UserModel.role == "driver",
            UserModel.is_active.is_(True),
            UserModel.availability_status == AVAIL_AVAILABLE,
        ).all()
    ]


def _validate_attachable(db: Session, request_ids: List[str], port_id: str) -> List[DeliveryRequestModel]:
    if not request_ids:
        raise HTTPException(status_code=422, detail="Select at least one delivery request.")
    rows = db.query(DeliveryRequestModel).filter(
        DeliveryRequestModel.id.in_(request_ids)
    ).all()
    found = {r.id for r in rows}
    missing = set(request_ids) - found
    if missing:
        raise HTTPException(status_code=404, detail=f"Unknown request(s): {sorted(missing)}")
    for r in rows:
        if r.status != REQ_PENDING:
            raise HTTPException(
                status_code=409,
                detail=f"Request {r.token_number} is {r.status}, not pending.",
            )
        if r.pickup_port_id != port_id:
            raise HTTPException(
                status_code=409,
                detail=f"Request {r.token_number} belongs to a different depot.",
            )
        # 402 rather than 409: this is a money problem, not a state conflict, and
        # the client distinguishes the two to decide whether to re-offer checkout
        # or just refresh.
        if not payments.is_paid(r):
            raise HTTPException(
                status_code=402,
                detail=f"Request {r.token_number} is awaiting payment and cannot be batched yet.",
            )
    return rows


# ── Fleet manager: pending queue ─────────────────────────────────────────────

@router.get("/pending")
def pending_requests(
    user: Dict[str, Any] = Depends(require_role(["fleet_manager", "port_admin"])),
    db: Session = Depends(get_db),
):
    """Pending delivery requests for the FM's depot, for map plotting.

    Unpaid parcels are withheld entirely rather than shown-and-disabled: a fleet
    manager should not be able to plan a run around freight that has not been
    paid for, and the customer is not waiting on the depot anyway.
    """
    port_id = _fm_port(db, user) if user["role"] == "fleet_manager" else None
    q = db.query(DeliveryRequestModel).filter(
        DeliveryRequestModel.status == REQ_PENDING,
        DeliveryRequestModel.payment_status == PAYMENT_PAID,
    )
    if port_id:
        q = q.filter(DeliveryRequestModel.pickup_port_id == port_id)
    rows = q.order_by(DeliveryRequestModel.created_at.asc()).limit(500).all()

    urgent_alerts = schedule_engine.find_urgent_without_batch(db, port_id) if port_id else []
    return {
        "requests": [serialize_request(r) for r in rows],
        "urgent_without_batch": [serialize_request(r) for r in urgent_alerts],
    }


class QuoteStopsIn(BaseModel):
    """A prospective batch, priced for the fleet manager before it exists."""

    request_ids: List[str] = Field(default_factory=list)
    area_center_lat: Optional[float] = None
    area_center_lng: Optional[float] = None


@router.post("/quote")
def quote_batch(
    payload: QuoteStopsIn,
    user: Dict[str, Any] = Depends(require_role(["fleet_manager", "port_admin"])),
    db: Session = Depends(get_db),
):
    """What a driver earns for the currently-selected stops, broken down per stop.

    Served from the same `earnings_quote` the real schedule will be created with,
    so the figure the fleet manager sees cannot disagree with the one the driver
    is offered. Replaces a client-side reimplementation of the formula that used
    to drift whenever a constant changed.
    """
    if user["role"] == "fleet_manager":
        port_id = _fm_port(db, user)
    else:
        port_id = None

    rows = db.query(DeliveryRequestModel).filter(
        DeliveryRequestModel.id.in_(payload.request_ids or [""])
    ).all()
    if not rows:
        return earnings_quote([], 0.0)

    # Price against the batch's own depot, so the distance component matches what
    # the schedule will eventually compute.
    reference_port = port_id or rows[0].pickup_port_id
    lat = payload.area_center_lat if payload.area_center_lat is not None else rows[0].delivery_lat
    lng = payload.area_center_lng if payload.area_center_lng is not None else rows[0].delivery_lng

    stops = [stop_from_request(r) for r in rows]
    route_km = estimated_route_km(reference_port, lat, lng)
    return earnings_quote(stops, route_km)


# ── Fleet manager: create / browse / intervene ───────────────────────────────

@router.post("", status_code=201)
def create_schedule(
    payload: CreateScheduleIn,
    user: Dict[str, Any] = Depends(require_role(["fleet_manager", "port_admin"])),
    db: Session = Depends(get_db),
):
    """Bundle pending requests into a broadcasting schedule and push it to drivers."""
    if user["role"] == "fleet_manager":
        port_id = _fm_port(db, user)
        if payload.port_id != port_id:
            raise HTTPException(status_code=403, detail="Cross-port schedule creation denied.")
    else:
        port_id = payload.port_id
    if not is_valid_port(port_id) or not db.query(PortModel).filter(PortModel.id == port_id).first():
        raise HTTPException(status_code=400, detail=f"Unknown depot '{port_id}'.")

    stops = _validate_attachable(db, payload.request_ids, port_id)

    schedule = DeliveryScheduleModel(
        fleet_manager_id=user["sub"],
        port_id=port_id,
        area_label=payload.area_label.strip(),
        area_center_lat=payload.area_center_lat,
        area_center_lng=payload.area_center_lng,
        radius_km=payload.radius_km,
        departure_window_start=payload.departure_window_start,
        departure_window_end=payload.departure_window_end,
        # The cap is what the FM asked for, NOT clamped down to the current stop
        # count: a batch may legitimately start with 1 of 4 and take the rest
        # via auto-attach (spec §4.2/§4.4). Clamping here would make every batch
        # permanently full the moment it was created.
        max_batch_size=payload.max_batch_size,
        status=SCHED_BROADCASTING,
        estimated_earnings=broadcast_earnings(
            port_id, payload.area_center_lat, payload.area_center_lng,
            [r.priority_tier for r in stops],
        ),
    )
    db.add(schedule)
    db.flush()

    for req in stops:
        req.schedule_id = schedule.id
        req.status = "batched"
        db.add(StatusUpdateLogModel(
            delivery_request_id=req.id, schedule_id=schedule.id,
            old_status=REQ_PENDING, new_status="batched", updated_by=user["sub"],
        ))
    db.add(StatusUpdateLogModel(
        schedule_id=schedule.id, old_status=None,
        new_status=SCHED_BROADCASTING, updated_by=user["sub"],
    ))
    db.commit()
    db.refresh(schedule)

    body = _with_context(db, schedule)
    events.emit_schedule_broadcast_sync(body, _available_driver_ids(db))
    return body


@router.get("")
def list_schedules(
    status: Optional[str] = None,
    user: Dict[str, Any] = Depends(require_role(["fleet_manager", "port_admin"])),
    db: Session = Depends(get_db),
):
    """Active batches for the FM's depot — the oversight view."""
    port_id = _fm_port(db, user) if user["role"] == "fleet_manager" else None
    q = db.query(DeliveryScheduleModel)
    if port_id:
        q = q.filter(DeliveryScheduleModel.port_id == port_id)
    if status:
        q = q.filter(DeliveryScheduleModel.status == status)
    else:
        q = q.filter(DeliveryScheduleModel.status.notin_(["completed", "cancelled"]))
    rows = q.order_by(DeliveryScheduleModel.created_at.desc()).limit(200).all()
    return [_with_context(db, s) for s in rows]


@router.get("/{schedule_id}")
def get_schedule(
    schedule_id: str,
    include_route: bool = True,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = _load_schedule(db, schedule_id)
    if user["role"] == "fleet_manager":
        _fm_owned(db, s, user)
    if user["role"] == "driver" and s.claimed_by_driver_id != user["sub"]:
        raise HTTPException(status_code=403, detail="Not your schedule.")
    return _with_context(db, s, include_route=include_route, include_stops=True)


@router.post("/{schedule_id}/attach")
def attach_stops(
    schedule_id: str,
    payload: AttachStopsIn,
    user: Dict[str, Any] = Depends(require_role(["fleet_manager", "port_admin"])),
    db: Session = Depends(get_db),
):
    """Manually add more pending requests to an open batch (spec §4.4)."""
    s = _load_schedule(db, schedule_id)
    _fm_owned(db, s, user)
    ok, reason = schedule_engine.can_accept_stop(db, s)
    if not ok:
        raise HTTPException(status_code=409, detail=reason)
    rows = _validate_attachable(db, payload.request_ids, s.port_id)
    attached = []
    for req in rows:
        try:
            schedule_engine.attach_request(db, s, req, actor_id=user["sub"])
            attached.append(req)
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc))
    db.commit()
    for req in attached:
        events.emit_stop_added_sync(s.id, serialize_request(req),
                                    s.claimed_by_driver_id, s.fleet_manager_id)
    db.refresh(s)
    return _with_context(db, s)


@router.post("/{schedule_id}/force-lock")
async def force_lock(
    schedule_id: str,
    user: Dict[str, Any] = Depends(require_role(["fleet_manager", "port_admin"])),
    db: Session = Depends(get_db),
):
    """FM override: close the batch early and compute the route now."""
    s = _load_schedule(db, schedule_id)
    _fm_owned(db, s, user)
    if s.status in (SCHED_IN_PROGRESS, SCHED_COMPLETED, SCHED_CANCELLED):
        raise HTTPException(status_code=409, detail=f"Schedule is already {s.status}.")
    s = await schedule_engine.lock_schedule(db, s, actor_id=user["sub"])
    return _with_context(db, s, include_route=True)


@router.post("/{schedule_id}/reassign")
def reassign_schedule(
    schedule_id: str,
    user: Dict[str, Any] = Depends(require_role(["fleet_manager", "port_admin"])),
    db: Session = Depends(get_db),
):
    """FM override: release an unresponsive driver's batch back to the feed."""
    s = _load_schedule(db, schedule_id)
    _fm_owned(db, s, user)
    if s.status not in (SCHED_CLAIMED, SCHED_LOCKED):
        raise HTTPException(status_code=409, detail=f"Only claimed/locked batches can be reassigned.")

    old_status = s.status
    if s.claimed_by_driver_id:
        driver = db.query(UserModel).filter(UserModel.id == s.claimed_by_driver_id).first()
        if driver:
            driver.availability_status = AVAIL_AVAILABLE
    s.status = SCHED_BROADCASTING
    s.claimed_by_driver_id = None
    s.claimed_at = None
    s.locked_at = None
    s.optimized_route = None
    s.final_earnings = None
    db.add(StatusUpdateLogModel(
        schedule_id=s.id, old_status=old_status,
        new_status=SCHED_BROADCASTING, updated_by=user["sub"], reason="reassigned",
    ))
    for req in db.query(DeliveryRequestModel).filter(
        DeliveryRequestModel.schedule_id == s.id
    ).all():
        req.status = "batched"
        req.stop_sequence = None
    db.commit()
    db.refresh(s)
    events.emit_schedule_broadcast_sync(_with_context(db, s), _available_driver_ids(db))
    return _with_context(db, s)


@router.post("/{schedule_id}/cancel")
def cancel_schedule(
    schedule_id: str,
    user: Dict[str, Any] = Depends(require_role(["fleet_manager", "port_admin"])),
    db: Session = Depends(get_db),
):
    s = _load_schedule(db, schedule_id)
    _fm_owned(db, s, user)
    if s.status == SCHED_COMPLETED:
        raise HTTPException(status_code=409, detail="Cannot cancel a completed batch.")
    old = s.status
    s.status = SCHED_CANCELLED
    s.cancelled_at = datetime.utcnow()
    db.add(StatusUpdateLogModel(
        schedule_id=s.id, old_status=old, new_status=SCHED_CANCELLED, updated_by=user["sub"],
    ))
    # Unattached stops go back into the pending queue for someone else to batch.
    for req in db.query(DeliveryRequestModel).filter(
        DeliveryRequestModel.schedule_id == s.id
    ).all():
        req.status = REQ_PENDING
        req.schedule_id = None
        req.stop_sequence = None
    if s.claimed_by_driver_id:
        driver = db.query(UserModel).filter(UserModel.id == s.claimed_by_driver_id).first()
        if driver:
            driver.availability_status = AVAIL_AVAILABLE
    db.commit()
    db.refresh(s)
    events.emit_schedule_claimed_sync(s.id, s.claimed_by_driver_id or "", _with_context(db, s))
    return _with_context(db, s)


# ── Driver: jobs feed + claim ────────────────────────────────────────────────

@router.get("/feed/broadcasting")
def broadcasting_feed(
    user: Dict[str, Any] = Depends(require_role(["driver"])),
    db: Session = Depends(get_db),
):
    """Schedules this driver could claim right now.

    Cross-port by design: a driver is not pinned to a depot. Broadcasts the FM
    sent to all available drivers surface here.
    """
    mine = {
        s.id for s in db.query(DeliveryScheduleModel).filter(
            DeliveryScheduleModel.claimed_by_driver_id == user["sub"],
            DeliveryScheduleModel.status.notin_(["completed", "cancelled"]),
        ).all()
    }
    rows = db.query(DeliveryScheduleModel).filter(
        DeliveryScheduleModel.status == SCHED_BROADCASTING
    ).order_by(DeliveryScheduleModel.created_at.desc()).limit(100).all()
    out = []
    for s in rows:
        if s.id in mine:
            continue
        out.append(_with_context(db, s))
    return out


@router.post("/{schedule_id}/claim")
def claim(
    schedule_id: str,
    user: Dict[str, Any] = Depends(require_role(["driver"])),
    db: Session = Depends(get_db),
):
    """Atomically claim a batch. 409 when another driver won the race."""
    try:
        schedule = claim_service.claim_schedule(db, schedule_id, user["sub"])
    except claim_service.ScheduleNotFound:
        raise HTTPException(status_code=404, detail="Schedule not found.")
    except claim_service.DriverNotAvailable as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except claim_service.ScheduleUnavailable as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    driver = db.query(UserModel).filter(UserModel.id == user["sub"]).first()
    if driver:
        driver.availability_status = "busy"
        db.commit()

    body = _with_context(db, schedule, include_stops=True)
    events.emit_schedule_claimed_sync(schedule.id, user["sub"], body)
    return body


@router.get("/feed/mine")
def my_schedules(
    user: Dict[str, Any] = Depends(require_role(["driver"])),
    db: Session = Depends(get_db),
):
    """The driver's batches: currently claimed plus recent history."""
    rows = db.query(DeliveryScheduleModel).filter(
        DeliveryScheduleModel.claimed_by_driver_id == user["sub"]
    ).order_by(DeliveryScheduleModel.created_at.desc()).limit(100).all()
    out = []
    for s in rows:
        out.append(_with_context(
            db, s,
            include_route=s.status in (SCHED_LOCKED, SCHED_IN_PROGRESS),
            include_stops=True,
        ))
    return out


@router.post("/{schedule_id}/depart")
async def depart_depot(
    schedule_id: str,
    user: Dict[str, Any] = Depends(require_role(["driver"])),
    db: Session = Depends(get_db),
):
    """Driver loaded up and left the depot. Locks the batch and optimises the route."""
    s = _load_schedule(db, schedule_id)
    if s.claimed_by_driver_id != user["sub"]:
        raise HTTPException(status_code=403, detail="Not your schedule.")
    try:
        s = await schedule_engine.lock_schedule(db, s, actor_id=user["sub"])
        s = schedule_engine.mark_departed(db, s, user["sub"])
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    return _with_context(db, s, include_route=True, include_stops=True)


@router.post("/{schedule_id}/position")
def update_position(
    schedule_id: str,
    payload: DriverPositionIn,
    user: Dict[str, Any] = Depends(require_role(["driver"])),
    db: Session = Depends(get_db),
):
    """REST fallback for driver position (the WebSocket carries the same payload)."""
    s = _load_schedule(db, schedule_id)
    if s.claimed_by_driver_id != user["sub"]:
        raise HTTPException(status_code=403, detail="Not your schedule.")
    s.driver_lat = payload.latitude
    s.driver_lng = payload.longitude
    s.driver_heading = payload.heading
    s.driver_updated_at = datetime.utcnow()
    db.commit()
    events.emit_driver_position_sync(s.id, payload.latitude, payload.longitude,
                                     payload.heading, s.fleet_manager_id)
    return {"ok": True}


# ── Drivers in the marketplace ───────────────────────────────────────────────

drivers_router = APIRouter(tags=["Driver directory"])


@drivers_router.get("/drivers")
def list_drivers(
    port: Optional[str] = None,
    user: Dict[str, Any] = Depends(require_role(["port_admin", "fleet_manager"])),
    db: Session = Depends(get_db),
):
    q = db.query(UserModel).filter(UserModel.role == "driver")
    rows = q.order_by(UserModel.created_at.desc()).limit(500).all()
    return [serialize_user_light(u) for u in rows]
