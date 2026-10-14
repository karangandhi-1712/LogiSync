"""Payment capture.

Two responsibilities, kept apart from the HTTP layer so they can be exercised
without a gateway:

* `quote_for_request` — the amount a parcel owes, from the customer's own
  inputs (tier, weight, handling). The amount is computed server-side and the
  client is never asked to price anything.
* `capture` — turning a verified provider payment into `payment_status='paid'`.

Razorpay is optional. When its keys are absent the provider degrades to
`cash_on_depot`: orders are born paid and nothing is gated, which is what keeps
a keyless checkout and the test suite working.
"""

import hashlib
import hmac
import logging
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.delivery_request import DeliveryRequestModel
from app.services import handling
from app.services.pricing import quote_charge

logger = logging.getLogger("logisync.payments")

PAYMENT_UNPAID = "unpaid"
PAYMENT_PAID = "paid"
PAYMENT_FAILED = "failed"
PAYMENT_REFUNDED = "refunded"

PAYMENT_COD = "cash_on_depot"
PAYMENT_RAZORPAY = "razorpay"


def provider(settings=None) -> str:
    """`razorpay` when capture is configured, else the pay-on-depot fallback."""
    settings = settings or get_settings()
    return PAYMENT_RAZORPAY if settings.payments_enabled else PAYMENT_COD


def quote_for_request(r: DeliveryRequestModel) -> Dict[str, Any]:
    """The amount owed for one parcel, from its own stored inputs."""
    return quote_charge(
        r.priority_tier,
        r.package_weight,
        handling.resolve(r.handling_flags, r.special_handling, r.package_type),
    )


def new_payment_state(r: DeliveryRequestModel) -> Dict[str, Any]:
    """The payment columns a freshly-created request should start with.

    Called at intake so the quote and the stored amount can never disagree.
    """
    settings = get_settings()
    name = provider(settings)
    if name == PAYMENT_COD:
        return {
            "payment_status": PAYMENT_PAID,
            "payment_amount": quote_for_request(r)["total"],
            "payment_method": PAYMENT_COD,
        }
    return {
        "payment_status": PAYMENT_UNPAID,
        "payment_amount": quote_for_request(r)["total"],
        "payment_method": None,
    }


def is_paid(r: DeliveryRequestModel) -> bool:
    return getattr(r, "payment_status", None) == PAYMENT_PAID


def verify_signature(order_id: str, payment_id: str, signature: str,
                     secret: Optional[str] = None) -> bool:
    """Razorpay's checkout signature: HMAC-SHA256(order_id|payment_id)."""
    if not order_id or not payment_id or not signature:
        return False
    settings = get_settings()
    key = secret if secret is not None else settings.RAZORPAY_KEY_SECRET
    if not key:
        return False
    expected = hmac.new(
        key.encode("utf-8"),
        f"{order_id}|{payment_id}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    # Constant-time: a naive == on an HMAC comparison leaks the signature a byte
    # at a time to anyone who can time the response.
    return hmac.compare_digest(expected, str(signature))


def verify_webhook_signature(body: bytes, signature: Optional[str]) -> bool:
    """Webhook bodies are signed with the webhook secret, not the API secret."""
    settings = get_settings()
    if not signature or not settings.RAZORPAY_WEBHOOK_SECRET:
        return False
    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
        body or b"",
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, str(signature))


def create_razorpay_order(r: DeliveryRequestModel, receipt: str) -> Dict[str, Any]:
    """Create the provider-side order for a request. Raises when unconfigured."""
    settings = get_settings()
    client = settings.razorpay_client
    if client is None:
        raise RuntimeError("Razorpay is not configured.")
    # Razorpay works in the smallest currency unit.
    order = client.order.create({
        "amount": int(round(float(r.payment_amount or 0.0) * 100)),
        "currency": "INR",
        "receipt": receipt,
        "notes": {
            "token_number": r.token_number,
            "delivery_request_id": r.id,
            "priority_tier": r.priority_tier,
        },
    })
    return order


def mark_paid(db: Session, r: DeliveryRequestModel, *, method: str,
              ref: Optional[str] = None) -> bool:
    """Flip a request to paid. Idempotent.

    Returns True when this call is what performed the transition, so the caller
    knows whether it still needs to run the post-payment side effects. A webhook
    arriving after the browser already verified must not attach the parcel to a
    second batch.
    """
    from datetime import datetime

    if is_paid(r):
        return False
    r.payment_status = PAYMENT_PAID
    r.payment_method = method
    if ref:
        r.payment_ref = ref
    r.paid_at = datetime.utcnow()
    if not r.payment_amount:
        r.payment_amount = quote_for_request(r)["total"]
    db.add(r)
    db.commit()
    db.refresh(r)
    return True