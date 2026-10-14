"""Consumer-facing intake and customer accounts.

Two surfaces live here and they are deliberately different:

* `router` — anonymous intake. Anyone can post a request and get a tracking
  token back; possession of the token is the authorisation.
* `account_router` — signed-in customers. Everything is scoped by the caller's
  JWT, never by a client-supplied identifier, so one customer can never read or
  cancel another's deliveries.
* `track_router` — public token-authorised tracking, still used for share links.
"""

import re
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.constants import (
    REQ_ASSIGNED,
    REQ_BATCHED,
    REQ_CANCELLED,
    REQ_EN_ROUTE,
    REQ_PENDING,
    REQ_PICKED_UP,
    ROLE_CONSUMER,
    TIER_FEES,
    TIER_STANDARD,
    VALID_TIERS,
)
from app.db import get_db
from app.dependencies import require_role
from app.models.consumer import ConsumerModel
from app.models.delivery_request import DeliveryRequestModel
from app.models.delivery_schedule import DeliveryScheduleModel
from app.models.port import PortModel
from app.models.status_log import StatusUpdateLogModel
from app.models.user import UserModel
from app.serializers import serialize_consumer, serialize_request, serialize_tracking
from app.services import geocoding, handling, payments
from app.services.schedule_engine import attach_request, find_attach_target

router = APIRouter(prefix="/consumer", tags=["Consumer intake"])

MOBILE_RE = re.compile(r"^\+?[0-9]{10,15}$")


def normalize_mobile(mobile: str) -> str:
    m = re.sub(r"[\s\-()]", "", mobile or "")
    if m.startswith("+91"):
        return m
    if m.startswith("91") and len(m) == 12:
        return f"+{m}"
    digits = "".join(ch for ch in m if ch.isdigit())
    if len(digits) == 10:
        return f"+91{digits}"
    return m


def generate_token() -> str:
    return f"LG-{uuid.uuid4().hex[:10].upper()}"


def _payment_fields(r: DeliveryRequestModel) -> Dict[str, Any]:
    """The payment half of an intake response.

    Present on every intake so the client never has to guess whether it needs to
    open a checkout sheet before the order exists.
    """
    return {
        "payment_status": r.payment_status,
        "payment_method": r.payment_method,
        "payment_amount": round(float(r.payment_amount or 0.0), 2),
        "payment_provider": payments.provider(),
        "requires_payment": r.payment_status != payments.PAYMENT_PAID,
    }


class ConsumerRequestIn(BaseModel):
    name: str = Field(min_length=2, max_length=128)
    mobile: str = Field(min_length=10, max_length=20)
    pickup_port_id: str
    delivery_address: str = Field(min_length=4, max_length=512)
    delivery_lat: Optional[float] = None
    delivery_lng: Optional[float] = None
    package_type: Optional[str] = None
    package_weight: Optional[float] = None
    special_handling: Optional[str] = None
    #: Structured handling chips. Falls back to parsing `special_handling` when
    #: the caller is an older client that only sends prose.
    handling_flags: Optional[List[str]] = None
    priority_tier: Optional[str] = TIER_STANDARD
    requested_window_start: Optional[str] = None
    requested_window_end: Optional[str] = None


def _resolve_port(db: Session, port_id: str) -> PortModel:
    port = db.query(PortModel).filter(PortModel.id == port_id).first()
    if not port:
        raise HTTPException(status_code=400, detail=f"Unknown pickup port '{port_id}'.")
    return port


def _upsert_consumer(db: Session, name: str, mobile: str) -> ConsumerModel:
    mobile = normalize_mobile(mobile)
    if not MOBILE_RE.match(mobile):
        raise HTTPException(status_code=422, detail="Enter a valid 10-digit mobile number.")
    existing = db.query(ConsumerModel).filter(ConsumerModel.mobile_number == mobile).first()
    if existing:
        # Keep the most recent display name the consumer gave us.
        existing.name = name.strip()
        return existing
    consumer = ConsumerModel(name=name.strip(), mobile_number=mobile)
    db.add(consumer)
    db.flush()
    return consumer


def _coerce_tier(tier: Optional[str]) -> str:
    tier = (tier or TIER_STANDARD).lower()
    if tier not in VALID_TIERS:
        raise HTTPException(
            status_code=422, detail=f"Invalid tier. Valid: {sorted(VALID_TIERS)}"
        )
    return tier


async def _create_delivery_request(db: Session, payload: ConsumerRequestIn,
                                   created_by: str,
                                   created_by_user_id: Optional[str],
                                   force_port_id: Optional[str] = None) -> DeliveryRequestModel:
    port = _resolve_port(db, force_port_id or payload.pickup_port_id)
    tier = _coerce_tier(payload.priority_tier)
    consumer = _upsert_consumer(db, payload.name, payload.mobile)

    lat, lng = payload.delivery_lat, payload.delivery_lng
    source = "provided"
    if lat is None or lng is None:
        geo = await geocoding.geocode_address(payload.delivery_address, port.id)
        lat, lng, source = geo["lat"], geo["lng"], geo["source"]

    request = DeliveryRequestModel(
        token_number=generate_token(),
        consumer_id=consumer.id,
        created_by=created_by,
        created_by_user_id=created_by_user_id,
        pickup_port_id=port.id,
        delivery_address=payload.delivery_address.strip(),
        delivery_lat=float(lat),
        delivery_lng=float(lng),
        package_type=payload.package_type,
        package_weight=payload.package_weight,
        special_handling=(payload.special_handling or None),
        handling_flags=handling.serialize(
            handling.resolve(
                payload.handling_flags, payload.special_handling, payload.package_type
            )
        ) or None,
        priority_tier=tier,
        requested_window_start=payload.requested_window_start,
        requested_window_end=payload.requested_window_end,
        status=REQ_PENDING,
    )
    db.add(request)
    db.flush()

    # Price the parcel and decide whether it starts blocked. With a gateway
    # configured this is `unpaid`, and the request stays out of every queue until
    # /payments/verify flips it — see routers/payments.py.
    for field, value in payments.new_payment_state(request).items():
        setattr(request, field, value)

    db.commit()
    db.refresh(request)

    # Auto-attach to a batch a driver has already claimed for this area, so the
    # request rides along instead of competing for a fresh broadcast. An unpaid
    # parcel is never attached: the batch would carry freight nobody has paid for.
    if not payments.is_paid(request):
        request._geo_source = source  # type: ignore[attr-defined]
        return request

    target = find_attach_target(db, request)
    if target is not None:
        try:
            attach_request(db, target, request, actor_id=created_by_user_id)
            db.commit()
            db.refresh(request)
            from app.services.events import emit_stop_added_sync
            emit_stop_added_sync(target.id, serialize_request(request), target.claimed_by_driver_id,
                                 target.fleet_manager_id)
        except ValueError:
            db.rollback()

    request._geo_source = source  # type: ignore[attr-defined]
    return request


@router.post("/requests", status_code=201)
async def submit_request(payload: ConsumerRequestIn, db: Session = Depends(get_db)):
    """Public consumer intake. Returns a tracking token and shareable link."""
    request = await _create_delivery_request(db, payload, created_by="consumer",
                                            created_by_user_id=None)
    source = getattr(request, "_geo_source", "provided")
    return {
        "token_number": request.token_number,
        "track_url": f"/track/{request.token_number}",
        "status": request.status,
        "priority_tier": request.priority_tier,
        "tier_fee": TIER_FEES.get(request.priority_tier, 0),
        "pickup_port_id": request.pickup_port_id,
        "delivery_lat": request.delivery_lat,
        "delivery_lng": request.delivery_lng,
        "geocode_source": source,
        **_payment_fields(request),
        "created_at": request.created_at.isoformat() if request.created_at else None,
    }


@router.post("/requests/manual", status_code=201)
async def manual_request(
    payload: ConsumerRequestIn,
    user: Dict[str, Any] = Depends(require_role(["fleet_manager", "port_admin"])),
    db: Session = Depends(get_db),
):
    """Walk-in / phone order taken by a fleet manager, pinned to their own port."""
    port_id = user.get("assigned_port_id")
    if user["role"] == "fleet_manager" and not port_id:
        raise HTTPException(status_code=403, detail="No assigned port.")
    request = await _create_delivery_request(
        db, payload, created_by="fleet_manager",
        created_by_user_id=user["sub"], force_port_id=port_id or payload.pickup_port_id,
    )
    return {
        **serialize_request(request),
        "track_url": f"/track/{request.token_number}",
    }


# ── Public tracking ──────────────────────────────────────────────────────────

track_router = APIRouter(tags=["Public tracking"])


@track_router.get("/track/{token_number}")
def track_delivery(token_number: str, db: Session = Depends(get_db)):
    """Token-authorised delivery status. No login required."""
    request = db.query(DeliveryRequestModel).filter(
        DeliveryRequestModel.token_number == token_number.strip().upper()
    ).first()
    if not request:
        raise HTTPException(status_code=404, detail="No delivery found for that tracking code.")

    schedule = None
    driver = None
    if request.schedule_id:
        schedule = db.query(DeliveryScheduleModel).filter(
            DeliveryScheduleModel.id == request.schedule_id
        ).first()
        if schedule and schedule.claimed_by_driver_id:
            driver = db.query(UserModel).filter(
                UserModel.id == schedule.claimed_by_driver_id
            ).first()

    port = db.query(PortModel).filter(PortModel.id == request.pickup_port_id).first()
    return serialize_tracking(request, schedule, driver, port)


@track_router.get("/consumer/urgent-alerts")
def urgent_alerts(port: Optional[str] = None, db: Session = Depends(get_db)):
    """How many urgent requests currently have no open batch for their depot."""
    from app.services.schedule_engine import find_urgent_without_batch
    port_ids = [port] if port else [p.id for p in db.query(PortModel).all()]
    total = 0
    by_port: List[Dict[str, Any]] = []
    for pid in port_ids:
        count = len(find_urgent_without_batch(db, pid))
        if count:
            by_port.append({"port_id": pid, "count": count})
        total += count
    return {"total": total, "by_port": by_port}


# ── Customer accounts ────────────────────────────────────────────────────────
#
# Every route below is scoped by the caller's JWT, never by a client-supplied
# identifier. The previous `GET /consumer/requests/mine?mobile=` lookup is gone:
# it handed full delivery addresses to anyone who knew a mobile number.

account_router = APIRouter(prefix="/consumer/account", tags=["Consumer account"])

#: Statuses after which a customer can no longer self-cancel — a driver or the
#: depot owns the stop from this point on.
CANCELLABLE_STATUSES = {REQ_PENDING, REQ_BATCHED}


class AccountOrderIn(BaseModel):
    """Customer booking. Identity is never read from the body — the account's own
    name and mobile are used, so nobody can file an order under another number."""

    pickup_port_id: str
    delivery_address: str = Field(min_length=4, max_length=512)
    delivery_lat: Optional[float] = None
    delivery_lng: Optional[float] = None
    package_type: Optional[str] = None
    package_weight: Optional[float] = None
    special_handling: Optional[str] = None
    handling_flags: Optional[List[str]] = None
    priority_tier: Optional[str] = TIER_STANDARD
    requested_window_start: Optional[str] = None
    requested_window_end: Optional[str] = None


class CancelReq(BaseModel):
    reason: Optional[str] = None


def _my_consumer(db: Session, user: Dict[str, Any]) -> ConsumerModel:
    """The `consumers` row for this account, or a 404 if it never registered.

    Accounts created through /auth/register/consumer always have one; the guard
    exists so a hand-made `users` row can't blow up with an opaque 500.
    """
    consumer = db.query(ConsumerModel).filter(ConsumerModel.user_id == user["sub"]).first()
    if not consumer:
        raise HTTPException(status_code=404, detail="No consumer profile for this account.")
    return consumer


def _owned_request(db: Session, consumer: ConsumerModel,
                   token_number: str) -> DeliveryRequestModel:
    """Fetch a request, but only if it belongs to this consumer.

    Anything else is a 404 rather than a 403 — a 403 would confirm that someone
    else's token exists.
    """
    row = db.query(DeliveryRequestModel).filter(
        DeliveryRequestModel.token_number == token_number.strip().upper(),
        DeliveryRequestModel.consumer_id == consumer.id,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="No delivery found for that tracking code.")
    return row


def consumer_user_ids_for_schedule(db: Session, schedule_id: Optional[str]) -> List[str]:
    """Account ids of the customers who have a stop on this batch.

    Used to target live driver positions at exactly the people watching them,
    instead of broadcasting every vehicle position to every signed-in customer.

    Deliberately scoped to `en_route`: a customer whose parcel has not left the
    depot has no reason to watch a truck, and positions are the first half of the
    same disclosure that `out_for_delivery_at` authorises.
    """
    if not schedule_id:
        return []
    rows = db.query(ConsumerModel.user_id).join(
        DeliveryRequestModel,
        DeliveryRequestModel.consumer_id == ConsumerModel.id,
    ).filter(
        DeliveryRequestModel.schedule_id == schedule_id,
        DeliveryRequestModel.status == REQ_EN_ROUTE,
        ConsumerModel.user_id.isnot(None),
    ).distinct().all()
    return [r[0] for r in rows if r[0]]


def consumer_user_id_for_request(db: Session, request_id: str) -> Optional[str]:
    """The account id of the customer who owns exactly this parcel.

    `consumer_user_ids_for_schedule` is the right audience for a batch-wide push
    like a position update, but "your parcel is out for delivery, here is your
    driver" is specific to one parcel and must not be sent to every customer
    riding the same batch.
    """
    row = db.query(ConsumerModel.user_id).join(
        DeliveryRequestModel,
        DeliveryRequestModel.consumer_id == ConsumerModel.id,
    ).filter(
        DeliveryRequestModel.id == request_id,
        ConsumerModel.user_id.isnot(None),
    ).first()
    return row[0] if row else None


@account_router.get("/profile")
def account_profile(user: Dict[str, Any] = Depends(require_role([ROLE_CONSUMER])),
                    db: Session = Depends(get_db)):
    """The account's own identity, for pre-filling the booking form."""
    consumer = _my_consumer(db, user)
    row = db.query(UserModel).filter(UserModel.id == user["sub"]).first()
    return {
        "user_id": row.id,
        "full_name": row.full_name,
        "email": row.email,
        "mobile_number": row.mobile_number,
        "photo_url": row.photo_url,
        "customer_since": row.consumer_at.isoformat() if row.consumer_at else None,
        "consumer": serialize_consumer(consumer),
    }


@account_router.get("/orders")
def my_orders(user: Dict[str, Any] = Depends(require_role([ROLE_CONSUMER])),
              db: Session = Depends(get_db)):
    """Every request this account has placed, newest first."""
    consumer = _my_consumer(db, user)
    rows = db.query(DeliveryRequestModel).filter(
        DeliveryRequestModel.consumer_id == consumer.id
    ).order_by(DeliveryRequestModel.created_at.desc()).limit(200).all()

    out = []
    for r in rows:
        port = db.query(PortModel).filter(PortModel.id == r.pickup_port_id).first()
        item = serialize_request(r, port=port)
        item["is_live"] = r.status in (REQ_ASSIGNED, REQ_PICKED_UP, REQ_EN_ROUTE)
        item["is_cancellable"] = r.status in CANCELLABLE_STATUSES
        out.append(item)
    return out


@account_router.get("/orders/{token_number}")
def my_order(token_number: str,
             user: Dict[str, Any] = Depends(require_role([ROLE_CONSUMER])),
             db: Session = Depends(get_db)):
    """Live tracking payload for one of this account's own deliveries."""
    consumer = _my_consumer(db, user)
    request = _owned_request(db, consumer, token_number)

    schedule = None
    driver = None
    if request.schedule_id:
        schedule = db.query(DeliveryScheduleModel).filter(
            DeliveryScheduleModel.id == request.schedule_id
        ).first()
        if schedule and schedule.claimed_by_driver_id:
            driver = db.query(UserModel).filter(
                UserModel.id == schedule.claimed_by_driver_id
            ).first()

    port = db.query(PortModel).filter(PortModel.id == request.pickup_port_id).first()
    payload = serialize_tracking(request, schedule, driver, port)
    payload["is_cancellable"] = request.status in CANCELLABLE_STATUSES
    return payload


@account_router.post("/orders", status_code=201)
async def place_order(payload: AccountOrderIn,
                      user: Dict[str, Any] = Depends(require_role([ROLE_CONSUMER])),
                      db: Session = Depends(get_db)):
    """Place a delivery request on the signed-in customer's behalf."""
    consumer = _my_consumer(db, user)
    row = db.query(UserModel).filter(UserModel.id == user["sub"]).first()

    request = await _create_delivery_request(
        db,
        ConsumerRequestIn(
            name=row.full_name,
            mobile=consumer.mobile_number,
            pickup_port_id=payload.pickup_port_id,
            delivery_address=payload.delivery_address,
            delivery_lat=payload.delivery_lat,
            delivery_lng=payload.delivery_lng,
            package_type=payload.package_type,
            package_weight=payload.package_weight,
            special_handling=payload.special_handling,
            handling_flags=payload.handling_flags,
            priority_tier=payload.priority_tier,
            requested_window_start=payload.requested_window_start,
            requested_window_end=payload.requested_window_end,
        ),
        created_by="consumer",
        created_by_user_id=user["sub"],
    )

    source = getattr(request, "_geo_source", "provided")
    return {
        "token_number": request.token_number,
        "track_url": f"/consumer/orders/{request.token_number}",
        "status": request.status,
        "priority_tier": request.priority_tier,
        "tier_fee": TIER_FEES.get(request.priority_tier, 0),
        "pickup_port_id": request.pickup_port_id,
        "delivery_lat": request.delivery_lat,
        "delivery_lng": request.delivery_lng,
        "geocode_source": source,
        **_payment_fields(request),
        "created_at": request.created_at.isoformat() if request.created_at else None,
    }


@account_router.post("/orders/{token_number}/cancel")
def cancel_order(token_number: str, payload: Optional[CancelReq] = None,
                 user: Dict[str, Any] = Depends(require_role([ROLE_CONSUMER])),
                 db: Session = Depends(get_db)):
    """Cancel a request that has not been picked up yet.

    Once a driver owns the stop the customer is out of their hands — the depot
    or the assigned driver has to close it out, so this returns 409.
    """
    consumer = _my_consumer(db, user)
    request = _owned_request(db, consumer, token_number)

    if request.status not in CANCELLABLE_STATUSES:
        raise HTTPException(
            status_code=409,
            detail=f"A {request.status.replace('_', ' ')} delivery can no longer be cancelled "
                   "from your account. Please contact the depot.",
        )

    old = request.status
    request.status = REQ_CANCELLED
    db.add(StatusUpdateLogModel(
        delivery_request_id=request.id,
        schedule_id=request.schedule_id,
        old_status=old,
        new_status=REQ_CANCELLED,
        updated_by=user["sub"],
        reason=(payload.reason if payload else None) or "cancelled by customer",
    ))
    db.commit()
    db.refresh(request)

    if request.schedule_id:
        from app.services import events, schedule_engine
        schedule = db.query(DeliveryScheduleModel).filter(
            DeliveryScheduleModel.id == request.schedule_id
        ).first()
        if schedule is not None:
            schedule_engine.maybe_complete(db, schedule, actor_id=user["sub"])
            audience: List[str] = [i for i in (
                schedule.claimed_by_driver_id, schedule.fleet_manager_id, user["sub"]
            ) if i]
            events.emit_status_changed_sync(serialize_request(request), request.schedule_id, audience)

    return serialize_request(request)


@account_router.get("/orders/{token_number}/history")
def order_history(token_number: str,
                  user: Dict[str, Any] = Depends(require_role([ROLE_CONSUMER])),
                  db: Session = Depends(get_db)):
    """Status timeline for one of this account's own deliveries."""
    consumer = _my_consumer(db, user)
    request = _owned_request(db, consumer, token_number)
    rows = db.query(StatusUpdateLogModel).filter(
        StatusUpdateLogModel.delivery_request_id == request.id
    ).order_by(StatusUpdateLogModel.timestamp.asc()).all()
    return [
        {
            "id": row.id,
            "old_status": row.old_status,
            "new_status": row.new_status,
            "reason": row.reason,
            "timestamp": row.timestamp.isoformat() if row.timestamp else None,
        }
        for row in rows
    ]
