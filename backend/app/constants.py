"""Shared vocabulary for the delivery marketplace.

Centralising the enums keeps the routers, the schedule engine and the WebSocket
hub from drifting apart on what a legal status transition is.
"""

from typing import Dict, List, Set

# ── Roles ────────────────────────────────────────────────────────────────────
ROLE_PORT_ADMIN = "port_admin"
ROLE_FLEET_MANAGER = "fleet_manager"
ROLE_DRIVER = "driver"
ROLE_CONSUMER = "consumer"

#: Every role that may authenticate against /api/auth/login.
ALL_ROLES: Set[str] = {
    ROLE_PORT_ADMIN, ROLE_FLEET_MANAGER, ROLE_DRIVER, ROLE_CONSUMER,
}

#: Roles that may self-register. Admins provision fleet managers; consumers and
#: drivers sign themselves up.
SELF_REGISTERABLE_ROLES: Set[str] = {ROLE_DRIVER, ROLE_CONSUMER}

# ── Delivery request status ──────────────────────────────────────────────────
REQ_PENDING = "pending"
REQ_BATCHED = "batched"
REQ_ASSIGNED = "assigned"
REQ_PICKED_UP = "picked_up"
REQ_EN_ROUTE = "en_route"
REQ_DELIVERED = "delivered"
REQ_FAILED = "failed"
REQ_CANCELLED = "cancelled"

REQUEST_STATUSES: Set[str] = {
    REQ_PENDING, REQ_BATCHED, REQ_ASSIGNED, REQ_PICKED_UP,
    REQ_EN_ROUTE, REQ_DELIVERED, REQ_FAILED, REQ_CANCELLED,
}

#: Statuses that close a stop out. A schedule completes when every attached
#: request reaches one of these.
REQUEST_TERMINAL: Set[str] = {REQ_DELIVERED, REQ_FAILED, REQ_CANCELLED}

#: Legal per-stop transitions driven by the driver (and the FM cancelling).
REQUEST_TRANSITIONS: Dict[str, Set[str]] = {
    REQ_PENDING: {REQ_BATCHED, REQ_CANCELLED},
    REQ_BATCHED: {REQ_ASSIGNED, REQ_CANCELLED},
    REQ_ASSIGNED: {REQ_PICKED_UP, REQ_CANCELLED},
    REQ_PICKED_UP: {REQ_EN_ROUTE, REQ_CANCELLED},
    REQ_EN_ROUTE: {REQ_DELIVERED, REQ_FAILED, REQ_CANCELLED},
    REQ_DELIVERED: set(),
    REQ_FAILED: set(),
    REQ_CANCELLED: set(),
}

#: Consumer-facing stepper labels, in order.
REQUEST_STEPPER: List[Dict[str, str]] = [
    {"status": REQ_PENDING, "label": "Pending"},
    {"status": REQ_BATCHED, "label": "Batched"},
    {"status": REQ_ASSIGNED, "label": "Driver Assigned"},
    {"status": REQ_PICKED_UP, "label": "Picked Up"},
    {"status": REQ_EN_ROUTE, "label": "Out for Delivery"},
    {"status": REQ_DELIVERED, "label": "Delivered"},
]

# ── Schedule status ──────────────────────────────────────────────────────────
SCHED_BROADCASTING = "broadcasting"
SCHED_CLAIMED = "claimed"
SCHED_LOCKED = "locked"
SCHED_IN_PROGRESS = "in_progress"
SCHED_COMPLETED = "completed"
SCHED_CANCELLED = "cancelled"

SCHEDULE_STATUSES: Set[str] = {
    SCHED_BROADCASTING, SCHED_CLAIMED, SCHED_LOCKED,
    SCHED_IN_PROGRESS, SCHED_COMPLETED, SCHED_CANCELLED,
}

#: A schedule in one of these is still open to new stops.
SCHEDULE_ACCEPTS_STOPS: Set[str] = {SCHED_BROADCASTING, SCHED_CLAIMED, SCHED_LOCKED}

#: A schedule in one of these no longer moves.
SCHEDULE_TERMINAL: Set[str] = {SCHED_COMPLETED, SCHED_CANCELLED}

# ── Priority tier (repurposed from the old dispatch-tier picker) ─────────────
TIER_STANDARD = "standard"
TIER_EXPRESS = "express"
TIER_URGENT = "urgent"

VALID_TIERS: Set[str] = {TIER_STANDARD, TIER_EXPRESS, TIER_URGENT}

#: Fee the consumer pays per tier.
TIER_FEES: Dict[str, int] = {TIER_STANDARD: 0, TIER_EXPRESS: 500, TIER_URGENT: 1000}

# ── Driver availability ──────────────────────────────────────────────────────
AVAIL_AVAILABLE = "available"
AVAIL_BUSY = "busy"
AVAIL_OFFLINE = "offline"

AVAILABILITY_STATES: Set[str] = {AVAIL_AVAILABLE, AVAIL_BUSY, AVAIL_OFFLINE}

# ── Special handling flags ───────────────────────────────────────────────────
# A parcel's handling requirements drive both the driver's pay and the customer's
# charge. They are captured as structured flags at intake (the customer picks
# chips) rather than left to be re-parsed out of a free-text note.

HANDLING_FRAGILE = "fragile"
HANDLING_UPRIGHT = "upright"
HANDLING_REFRIGERATED = "refrigerated"
HANDLING_LIQUID = "liquid"

VALID_HANDLING: Set[str] = {
    HANDLING_FRAGILE, HANDLING_UPRIGHT, HANDLING_REFRIGERATED, HANDLING_LIQUID,
}

#: Storage for `delivery_requests.handling_flags` is a comma-joined string.
HANDLING_FLAG_SEPARATOR = ","

# ── Driver earnings model ────────────────────────────────────────────────────
#: Flat pay per stop, by the tier the consumer paid for.
EARNINGS_PER_STOP: Dict[str, float] = {
    TIER_STANDARD: 120.0,
    TIER_EXPRESS: 220.0,
    TIER_URGENT: 350.0,
}

#: ₹ per km. `ESTIMATE_ROAD_FACTOR` inflates straight-line distance at broadcast
#: time, before real road geometry exists.
EARNINGS_PER_KM: float = 12.0
ESTIMATE_ROAD_FACTOR: float = 1.3

#: Batch bonus per stop beyond the first — rewards fuller batches.
EARNINGS_BATCH_BONUS: float = 75.0

#: ₹ per kg above the first kilogram, capped so one pallet cannot dominate a
#: batch's payout. The weight a customer actually declares is the weight that pays.
EARNINGS_PER_KG: float = 6.0
EARNINGS_WEIGHT_CAP_KG: float = 50.0

#: Extra pay per stop for handling the parcel carefully. Fragile and upright stack:
#: a glass lamp that must also stay upright takes more than either alone.
HANDLING_SURCHARGE: Dict[str, float] = {
    HANDLING_FRAGILE: 40.0,
    HANDLING_UPRIGHT: 25.0,
    HANDLING_REFRIGERATED: 90.0,
    HANDLING_LIQUID: 60.0,
}

# ── Customer pricing model ───────────────────────────────────────────────────
# What the customer is quoted at intake. Deliberately derived from the same
# weights as the earnings model so the two can never drift apart, but the driver
# base pay is strictly higher than the customer base fee — the difference is the
# platform's cut and the depot's contribution.
CUSTOMER_BASE_FEE: Dict[str, float] = {
    TIER_STANDARD: 0.0,
    TIER_EXPRESS: 500.0,
    TIER_URGENT: 1000.0,
}
CUSTOMER_PER_KG: float = 4.0
CUSTOMER_WEIGHT_CAP_KG: float = 50.0
CUSTOMER_HANDLING_FEE: Dict[str, float] = {
    HANDLING_FRAGILE: 60.0,
    HANDLING_UPRIGHT: 40.0,
    HANDLING_REFRIGERATED: 150.0,
    HANDLING_LIQUID: 90.0,
}
#: Smallest chargeable amount, so a 200g document envelope is never free.
CUSTOMER_MIN_CHARGE: float = 49.0

DEFAULT_MAX_BATCH_SIZE = 4
MIN_RADIUS_KM = 1.0
MAX_RADIUS_KM = 25.0