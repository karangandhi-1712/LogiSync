"""Customer payment capture.

The flow this router enforces is the point of the exercise: **a delivery request
does not enter the fleet manager's queue until its payment is captured.**

    POST /payments/order     → provider order for the server-quoted amount
    POST /payments/verify    → signature check → mark paid → release the parcel
    POST /payments/webhook   → the same, driven by the provider instead of the browser

`verify` and `webhook` converge on `payments.mark_paid`, which is idempotent, so
whichever arrives second is a no-op rather than a second batch attachment.

With no Razorpay keys configured the provider is `cash_on_depot`: orders are born
paid and `/payments/order` just confirms it. Every other flow behaves identically.
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import get_settings
from app.constants import ROLE_CONSUMER, TIER_STANDARD, VALID_TIERS
from app.db import get_db
from app.dependencies import get_current_user, require_role
from app.models.consumer import ConsumerModel
from app.models.delivery_request import DeliveryRequestModel
from app.services import events, payments
from app.services.pricing import quote_charge, quote_charge_breakdown

logger = logging.getLogger("logisync.payments.router")

router = APIRouter(prefix="/payments", tags=["Payments"])


class OrderIn(BaseModel):
    token_number: str = Field(min_length=4, max_length=32)


class VerifyIn(BaseModel):
    token_number: str = Field(min_length=4, max_length=32)
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class CodConfirmIn(BaseModel):
    token_number: str = Field(min_length=4, max_length=32)


def _owned_request(db: Session, user: Dict[str, Any], token_number: str) -> DeliveryRequestModel:
    """A request belonging to the caller's own account, or 404.

    Scoped by JWT, never by a client-supplied id — same rule as every other
    account route. A miss is a 404 rather than a 403 so we never confirm that
    someone else's tracking code exists.
    """
    consumer = db.query(ConsumerModel).filter(ConsumerModel.user_id == user["sub"]).first()
    if not consumer:
        raise HTTPException(status_code=404, detail="No consumer profile for this account.")
    row = db.query(DeliveryRequestModel).filter(
        DeliveryRequestModel.token_number == token_number.strip().upper(),
        DeliveryRequestModel.consumer_id == consumer.id,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="No delivery found for that tracking code.")
    return row


def _release_to_queue(db: Session, r: DeliveryRequestModel) -> bool:
    """Run the post-payment side effects: auto-attach to an open batch if one covers it.

    This is the "then the request proceeds" half. It only runs when *this* call
    is what flipped the row to paid, so a duplicate webhook cannot attach the
    parcel to a second batch.
    """
    from app.serializers import serialize_request
    from app.services.schedule_engine import attach_request, find_attach_target

    target = find_attach_target(db, r)
    if target is None:
        return False
    try:
        attach_request(db, target, r, actor_id=r.created_by_user_id)
        db.commit()
        db.refresh(r)
    except ValueError:
        db.rollback()
        return False

    try:
        events.emit_stop_added_sync(
            target.id, serialize_request(r),
            target.claimed_by_driver_id, target.fleet_manager_id,
        )
    except Exception:  # pragma: no cover - the socket hub is best-effort
        logger.debug("stop_added emit failed for %s", r.token_number, exc_info=True)
    return True


def _payment_state(r: DeliveryRequestModel) -> Dict[str, Any]:
    from app.services import handling

    quote = payments.quote_for_request(r)
    return {
        "token_number": r.token_number,
        "status": r.payment_status,
        "amount": round(float(r.payment_amount or 0.0), 2),
        "method": r.payment_method,
        "ref": r.payment_ref,
        "paid_at": r.paid_at.isoformat() if r.paid_at else None,
        "provider": payments.provider(),
        # Recomputed from the stored row so the breakdown can never drift from
        # what was actually charged.
        "breakdown": quote_charge_breakdown(
            r.priority_tier, r.package_weight,
            handling.resolve(r.handling_flags, r.special_handling, r.package_type),
        ),
        "releaseable": r.payment_status == payments.PAYMENT_PAID
        and r.status == "pending"
        and r.schedule_id is None,
    }


@router.get("/config")
def payment_config():
    """What the browser needs to decide how to collect.

    Only the publishable key id leaves the server; the secret never does.
    """
    settings = get_settings()
    name = payments.provider(settings)
    return {
        "provider": name,
        "enabled": name != payments.PAYMENT_COD,
        "key_id": settings.RAZORPAY_KEY_ID if name != payments.PAYMENT_COD else "",
        "currency": "INR",
        "cod_enabled": True,
    }


@router.get("/{token_number}")
def payment_status(
    token_number: str,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    r = _owned_request(db, user, token_number)
    return _payment_state(r)


@router.post("/quote")
def quote(token_number: str, user: Dict[str, Any] = Depends(get_current_user),
          db: Session = Depends(get_db)):
    """Price a pending order without attempting to collect it."""
    r = _owned_request(db, user, token_number)
    return _payment_state(r)


class EstimateIn(BaseModel):
    """Price a parcel before it exists, for the checkout review step."""

    priority_tier: Optional[str] = TIER_STANDARD
    package_weight: Optional[float] = None
    package_type: Optional[str] = None
    handling_flags: Optional[List[str]] = None
    special_handling: Optional[str] = None


@router.post("/estimate")
def estimate(payload: EstimateIn,
             user: Dict[str, Any] = Depends(require_role([ROLE_CONSUMER])),
             ):
    """What this parcel will cost, before an order is created.

    Served rather than computed in the browser so the review step and the
    eventual charge cannot disagree — the same failure mode the fleet manager's
    earnings panel had, one audience over.
    """
    from app.services import handling

    flags = handling.resolve(
        payload.handling_flags, payload.special_handling, payload.package_type
    )
    tier = (payload.priority_tier or TIER_STANDARD).lower()
    if tier not in VALID_TIERS:
        tier = TIER_STANDARD
    quote = quote_charge(tier, payload.package_weight, flags)
    return {
        **quote,
        "provider": payments.provider(),
        "lines": quote_charge_breakdown(tier, payload.package_weight, flags),
    }


@router.post("/order")
def create_order(payload: OrderIn,
                 user: Dict[str, Any] = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    """Start collection for one of the caller's own requests."""
    r = _owned_request(db, user, payload.token_number)

    if payments.is_paid(r):
        return {**_payment_state(r), "already_paid": True}

    name = payments.provider()
    if name == payments.PAYMENT_COD:
        # Pay-on-collection: nothing to open. The order is already `paid`
        # because the depot collects on handover.
        return {**_payment_state(r), "provider": payments.PAYMENT_COD}

    try:
        order = payments.create_razorpay_order(r, receipt=r.token_number)
    except Exception as exc:
        logger.exception("razorpay order create failed for %s", r.token_number)
        raise HTTPException(
            status_code=502,
            detail="Could not start the payment. Please try again in a moment.",
        ) from exc

    consumer = db.query(ConsumerModel).filter(
        ConsumerModel.id == r.consumer_id
    ).first()

    return {
        "provider": name,
        "order_id": order.get("id"),
        "key_id": get_settings().RAZORPAY_KEY_ID,
        "amount": round(float(r.payment_amount or 0.0), 2),
        "amount_paise": order.get("amount"),
        "currency": order.get("currency", "INR"),
        "token_number": r.token_number,
        "prefill": {
            "name": consumer.name if consumer else "",
            "contact": (consumer.mobile_number if consumer else "") or "",
        },
        "notes": {"token_number": r.token_number},
    }


@router.post("/verify")
def verify(payload: VerifyIn,
           user: Dict[str, Any] = Depends(get_current_user),
           db: Session = Depends(get_db)):
    """Confirm a checkout and release the parcel into the queue."""
    if not payments.verify_signature(
        payload.razorpay_order_id, payload.razorpay_payment_id,
        payload.razorpay_signature,
    ):
        raise HTTPException(status_code=400, detail="Payment signature did not verify.")

    r = _owned_request(db, user, payload.token_number)
    changed = payments.mark_paid(
        db, r, method=payments.PAYMENT_RAZORPAY, ref=payload.razorpay_payment_id
    )
    attached = _release_to_queue(db, r) if changed else False
    return {**_payment_state(r), "released": changed, "auto_attached": attached}


@router.post("/cod/confirm")
def confirm_pay_on_depot(payload: CodConfirmIn,
                         user: Dict[str, Any] = Depends(get_current_user),
                         db: Session = Depends(get_db)):
    """Explicit acknowledgement for the pay-on-depot flow.

    Only meaningful when no gateway is configured; with Razorpay live a request
    that is somehow unpaid is left alone rather than waved through unpaid.
    """
    if payments.provider() != payments.PAYMENT_COD:
        raise HTTPException(
            status_code=409,
            detail="Online payment is enabled for this depot - complete checkout instead.",
        )
    r = _owned_request(db, user, payload.token_number)
    changed = payments.mark_paid(db, r, method=payments.PAYMENT_COD)
    attached = _release_to_queue(db, r) if changed else False
    return {**_payment_state(r), "released": changed, "auto_attached": attached}


# ── Provider webhook ─────────────────────────────────────────────────────────
# Reached by Razorpay, not by our own frontend, so there is no JWT here. The
# signature is the entire authorisation.

@router.post("/webhook")
async def webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    signature = request.headers.get("x-razorpay-signature")
    if not payments.verify_webhook_signature(body, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature.")

    try:
        import json
        event = json.loads(body or b"{}")
    except ValueError:
        raise HTTPException(status_code=400, detail="Malformed webhook payload.")

    kind = event.get("event")
    if kind not in ("payment.captured", "order.paid"):
        return {"ignored": kind}

    payload = event.get("payload") or {}
    payment_entity = payload.get("payment") or {}
    entity = payment_entity.get("entity") or payload.get("order", {}).get("entity") or {}
    ref = entity.get("id")
    if not ref:
        return {"ignored": "no payment id"}

    notes = entity.get("notes") or {}
    token_number = notes.get("token_number")
    if not token_number:
        logger.warning("webhook %s carried no token_number", ref)
        return {"ignored": "no token_number"}

    r = db.query(DeliveryRequestModel).filter(
        DeliveryRequestModel.token_number == str(token_number).upper()
    ).first()
    if not r:
        logger.warning("webhook referenced unknown request %s", token_number)
        return {"ignored": "unknown request"}

    changed = payments.mark_paid(db, r, method=payments.PAYMENT_RAZORPAY, ref=str(ref))
    attached = _release_to_queue(db, r) if changed else False
    return {"ok": True, "released": changed, "auto_attached": attached}