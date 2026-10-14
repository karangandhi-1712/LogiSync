"""Response shaping for marketplace entities.

Kept in one module so the snake_case wire format is defined once and the
frontend's camelCase expectations have a single documented counterpart.
"""

from typing import Any, Dict, List, Optional

from app.constants import TIER_FEES
from app.models.consumer import ConsumerModel
from app.models.delivery_request import DeliveryRequestModel
from app.models.delivery_schedule import DeliveryScheduleModel
from app.models.port import PortModel
from app.models.user import UserModel
from app.services import handling
from app.services.route_optimizer import route_payload


def serialize_port(p: PortModel) -> Dict[str, Any]:
    return {
        "id": p.id,
        "code": p.code,
        "name": p.name,
        "short": p.short,
        "city": p.city,
        "state": p.state,
        "lat": p.lat,
        "lng": p.lng,
        "zoom": p.zoom,
        "corridor": p.corridor,
    }


def serialize_user_light(u: Optional[UserModel]) -> Optional[Dict[str, Any]]:
    if not u:
        return None
    return {
        "id": u.id,
        "full_name": u.full_name,
        "role": u.role,
        "vehicle_number": u.vehicle_number,
        "vehicle_type": u.vehicle_type,
        "mobile_number": u.mobile_number,
        "photo_url": u.photo_url,
        "availability_status": getattr(u, "availability_status", None),
    }


def serialize_consumer(c: Optional[ConsumerModel]) -> Optional[Dict[str, Any]]:
    if not c:
        return None
    return {
        "id": c.id,
        "name": c.name,
        "mobile_number": c.mobile_number,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


def serialize_request(r: DeliveryRequestModel, port: Optional[PortModel] = None,
                      consumer: Optional[ConsumerModel] = None,
                      include_consumer: bool = False) -> Dict[str, Any]:
    """A delivery request / stop.

    Consumer mobile numbers are deliberately omitted — a fleet manager needs the
    address and tier, not the customer's phone number.
    """
    out: Dict[str, Any] = {
        "id": r.id,
        "token_number": r.token_number,
        "consumer_id": r.consumer_id,
        "created_by": r.created_by,
        "created_by_user_id": r.created_by_user_id,
        "pickup_port_id": r.pickup_port_id,
        "delivery_address": r.delivery_address,
        "delivery_lat": r.delivery_lat,
        "delivery_lng": r.delivery_lng,
        "package_type": r.package_type,
        "package_weight": r.package_weight,
        "special_handling": r.special_handling,
        "handling_flags": sorted(handling.deserialize(r.handling_flags)),
        "priority_tier": r.priority_tier,
        "tier_fee": TIER_FEES.get(r.priority_tier, 0),
        "requested_window_start": r.requested_window_start,
        "requested_window_end": r.requested_window_end,
        "status": r.status,
        "failure_reason": r.failure_reason,
        "payment_status": r.payment_status,
        "payment_method": r.payment_method,
        "payment_amount": round(float(r.payment_amount or 0.0), 2),
        "paid_at": r.paid_at.isoformat() if r.paid_at else None,
        "schedule_id": r.schedule_id,
        "stop_sequence": r.stop_sequence,
        "out_for_delivery_at": (
            r.out_for_delivery_at.isoformat() if r.out_for_delivery_at else None
        ),
        "delivered_at": r.delivered_at.isoformat() if r.delivered_at else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }
    if port is not None:
        out["pickup_port"] = {"id": port.id, "name": port.name, "short": port.short}
    if include_consumer and consumer is not None:
        out["consumer"] = serialize_consumer(consumer)
    return out


def serialize_schedule(s: DeliveryScheduleModel, port: Optional[PortModel] = None,
                       driver: Optional[UserModel] = None,
                       stop_count: Optional[int] = None,
                       include_route: bool = False,
                       include_fm: bool = False) -> Dict[str, Any]:
    out: Dict[str, Any] = {
        "id": s.id,
        "fleet_manager_id": s.fleet_manager_id,
        "port_id": s.port_id,
        "area_label": s.area_label,
        "area_center_lat": s.area_center_lat,
        "area_center_lng": s.area_center_lng,
        "radius_km": s.radius_km,
        "departure_window_start": s.departure_window_start,
        "departure_window_end": s.departure_window_end,
        "max_batch_size": s.max_batch_size,
        "status": s.status,
        "claimed_by_driver_id": s.claimed_by_driver_id,
        "claimed_at": s.claimed_at.isoformat() if s.claimed_at else None,
        "locked_at": s.locked_at.isoformat() if s.locked_at else None,
        "departed_at": s.departed_at.isoformat() if s.departed_at else None,
        "completed_at": s.completed_at.isoformat() if s.completed_at else None,
        "estimated_earnings": s.estimated_earnings,
        "final_earnings": s.final_earnings,
        "stop_count": stop_count,
        "driver": serialize_user_light(driver),
        "driver_lat": s.driver_lat,
        "driver_lng": s.driver_lng,
        "driver_heading": s.driver_heading,
        "driver_updated_at": s.driver_updated_at.isoformat() if s.driver_updated_at else None,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }
    if port is not None:
        out["port"] = {"id": port.id, "name": port.name, "short": port.short,
                       "lat": port.lat, "lng": port.lng}
    if include_fm:
        out["has_route"] = route_payload(s) is not None
    if include_route:
        out["optimized_route"] = route_payload(s)
    return out


def driver_contact_visible(r: DeliveryRequestModel) -> bool:
    """Whether this parcel has reached the customer-visible "out for delivery" stage.

    Gated on `out_for_delivery_at`, which is stamped once when the stop reaches
    en_route and is never cleared. Deriving this from `r.status` instead would
    leak: a stop cancelled while still `batched` lands on `cancelled`, which any
    "terminal status" check would read as "the customer already met the driver".
    The timestamp cannot be un-set by a later transition, so it cannot be.
    """
    return getattr(r, "out_for_delivery_at", None) is not None


def serialize_driver_for_consumer(
    driver: Optional[UserModel],
    r: DeliveryRequestModel,
) -> Optional[Dict[str, Any]]:
    """The driver card a customer is entitled to see.

    Name and vehicle are always shown — the customer can see a truck assigned to
    their parcel without knowing who is driving it. The phone number is the
    sensitive field, and it is withheld until the parcel is genuinely out for
    delivery, at which point the customer has a reason to call and the driver has
    agreed to be reachable.
    """
    if driver is None:
        return None
    visible = driver_contact_visible(r)
    card: Dict[str, Any] = {
        "name": driver.full_name,
        "vehicle_number": driver.vehicle_number,
        "vehicle_type": driver.vehicle_type,
        "contact_visible": visible,
    }
    if visible:
        card["phone"] = driver.mobile_number
    return card


def serialize_tracking(r: DeliveryRequestModel, schedule: Optional[DeliveryScheduleModel],
                       driver: Optional[UserModel], port: Optional[PortModel]) -> Dict[str, Any]:
    """Public, token-authorised tracking payload.

    Driver phone number appears only once the stop is out for delivery — see
    `driver_contact_visible`. Everything else the consumer sees is already their
    own parcel.
    """
    payload: Dict[str, Any] = {
        "token_number": r.token_number,
        "status": r.status,
        "priority_tier": r.priority_tier,
        "tier_fee": TIER_FEES.get(r.priority_tier, 0),
        "delivery_address": r.delivery_address,
        "delivery_lat": r.delivery_lat,
        "delivery_lng": r.delivery_lng,
        "requested_window_start": r.requested_window_start,
        "requested_window_end": r.requested_window_end,
        "package_type": r.package_type,
        "package_weight": r.package_weight,
        "special_handling": r.special_handling,
        "handling_flags": sorted(handling.deserialize(r.handling_flags)),
        "stop_sequence": r.stop_sequence,
        "payment_status": r.payment_status,
        "payment_method": r.payment_method,
        "payment_amount": round(float(r.payment_amount or 0.0), 2),
        "paid_at": r.paid_at.isoformat() if r.paid_at else None,
        "out_for_delivery_at": (
            r.out_for_delivery_at.isoformat() if r.out_for_delivery_at else None
        ),
        "delivered_at": r.delivered_at.isoformat() if r.delivered_at else None,
        "driver_contact_visible": driver_contact_visible(r),
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        "failure_reason": r.failure_reason,
    }
    if port is not None:
        payload["pickup_port"] = {"id": port.id, "name": port.name, "short": port.short,
                                  "lat": port.lat, "lng": port.lng}
    if schedule is not None:
        payload["schedule"] = {
            "id": schedule.id,
            "area_label": schedule.area_label,
            "status": schedule.status,
            "departure_window_start": schedule.departure_window_start,
            "departure_window_end": schedule.departure_window_end,
            "driver_lat": schedule.driver_lat,
            "driver_lng": schedule.driver_lng,
            "driver_updated_at": (
                schedule.driver_updated_at.isoformat() if schedule.driver_updated_at else None
            ),
        }
        card = serialize_driver_for_consumer(driver, r)
        if card is not None:
            payload["schedule"]["driver"] = card
        route = route_payload(schedule)
        if route:
            payload["schedule"]["route"] = {
                "polyline": route.get("polyline", []),
                "simulated": route.get("simulated", False),
            }
    return payload