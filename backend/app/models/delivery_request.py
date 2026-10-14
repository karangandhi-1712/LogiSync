import uuid
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey
from datetime import datetime
from app.db import Base


def _uuid():
    return str(uuid.uuid4())


class DeliveryRequestModel(Base):
    """One consumer parcel/delivery, and eventually one stop in a schedule.

    Supersedes the old `bookings` table: there is no gate, no service type and
    no dwell slider any more. `token_number` is the shareable tracking code.
    """

    __tablename__ = "delivery_requests"

    id = Column(String(36), primary_key=True, default=_uuid)
    token_number = Column(String(32), unique=True, nullable=False, index=True)

    consumer_id = Column(String(36), ForeignKey("consumers.id"), nullable=False, index=True)
    # consumer | fleet_manager — who actually submitted this row
    created_by = Column(String(16), nullable=False, default="consumer")
    # the fleet manager's user id when created_by == 'fleet_manager'
    created_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)

    pickup_port_id = Column(String(32), ForeignKey("ports.id"), nullable=False, index=True)
    delivery_address = Column(String(512), nullable=False)
    delivery_lat = Column(Float, nullable=False)
    delivery_lng = Column(Float, nullable=False)

    package_type = Column(String(64), nullable=True)
    package_weight = Column(Float, nullable=True)
    special_handling = Column(String(512), nullable=True)
    #: Comma-joined structured handling flags (fragile / upright / refrigerated /
    #: liquid). Drives the earnings and pricing models; `special_handling` stays
    #: the customer-visible note. See app/services/handling.py.
    handling_flags = Column(String(128), nullable=True)

    # standard | express | urgent — reused from the old dispatch-tier picker
    priority_tier = Column(String(16), nullable=False, default="standard")

    requested_window_start = Column(String(8), nullable=True)
    requested_window_end = Column(String(8), nullable=True)

    # unpaid | paid | failed | refunded
    payment_status = Column(String(16), nullable=False, default="unpaid", index=True)
    payment_amount = Column(Float, nullable=False, default=0.0)
    #: razorpay | cash_on_depot
    payment_method = Column(String(32), nullable=True)
    #: Provider order/payment id, used to make webhook handling idempotent.
    payment_ref = Column(String(64), nullable=True, index=True)
    paid_at = Column(DateTime, nullable=True)

    # pending | batched | assigned | picked_up | en_route | delivered | failed | cancelled
    status = Column(String(32), nullable=False, default="pending", index=True)
    failure_reason = Column(String(512), nullable=True)

    #: UTC. Stamped once, when the stop reaches en_route. Monotonic by design:
    #: it is the authorisation for exposing driver contact details to the
    #: customer, so it must never be un-set by a later status change — hence not
    #: derived from `status`, which can move backwards via cancellation.
    out_for_delivery_at = Column(DateTime, nullable=True)
    #: UTC. Stamped once when the stop reaches delivered. Preferred over
    #: `updated_at` for on-time analytics, which any other write would bump.
    delivered_at = Column(DateTime, nullable=True)

    schedule_id = Column(String(36), ForeignKey("delivery_schedules.id"), nullable=True, index=True)
    stop_sequence = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)