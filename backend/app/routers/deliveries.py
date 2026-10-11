"""Per-stop delivery execution.

The driver drives one stop at a time; every transition is validated against the
status chain in app/constants.py, audited, and pushed to the consumer-facing and
fleet-manager-facing surfaces. When the last stop closes, the parent batch
completes and the driver becomes broadcastable again.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.constants import (
    REQUEST_TRANSITIONS,
    REQ_CANCELLED,
    REQ_FAILED,
    REQ_PENDING,
    SCHED_CANCELLED,
    SCHED_COMPLETED,
)
from app.db import get_db
from app.dependencies import require_role
from app.models.delivery_request import DeliveryRequestModel
from app.models.delivery_schedule import DeliveryScheduleModel
from app.models.status_log import StatusUpdateLogModel
from app.serializers import serialize_request
from app.services import events, schedule_engine

router = APIRouter(prefix="/deliveries", tags=["Delivery execution"])


class StopStatusIn(BaseModel):
    status: str
    reason: Optional[str] = None


@router.get("")
def list_deliveries(
    port: Optional[str] = None,
    status: Optional[str] = None,
    schedule_id: Optional[str] = None,
    user: Dict[str, Any] = Depends(require_role(["fleet_manager", "port_admin"])),
    db: Session = Depends(get_db),
):
    """Delivery requests for oversight, scoped to the FM's depot."""
    q = db.query(DeliveryRequestModel)
    if user["role"] == "fleet_manager":
        port = user.get("assigned_port_id")
        if not port:
            raise HTTPException(status_code=403, detail="No assigned port.")
    if port:
        q = q.filter(DeliveryRequestModel.pickup_port_id == port)
    if status:
        q = q.filter(DeliveryRequestModel.status == status)
    if schedule_id:
        q = q.filter(DeliveryRequestModel.schedule_id == schedule_id)
    rows = q.order_by(DeliveryRequestModel.created_at.desc()).limit(500).all()
    return [serialize_request(r) for r in rows]


@router.get("/{request_id}")
def get_delivery(
    request_id: str,
    user: Dict[str, Any] = Depends(require_role(["fleet_manager", "port_admin", "driver"])),
    db: Session = Depends(get_db),
):
    r = db.query(DeliveryRequestModel).filter(DeliveryRequestModel.id == request_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Delivery request not found.")
    if user["role"] == "fleet_manager" and r.pickup_port_id != user.get("assigned_port_id"):
        raise HTTPException(status_code=403, detail="Cross-port access denied.")
    if user["role"] == "driver":
        schedule = db.query(DeliveryScheduleModel).filter(
            DeliveryScheduleModel.id == r.schedule_id
        ).first() if r.schedule_id else None
        if not schedule or schedule.claimed_by_driver_id != user["sub"]:
            raise HTTPException(status_code=403, detail="Not your delivery.")
    return serialize_request(r)


@router.patch("/{request_id}/status")
def update_stop_status(
    request_id: str,
    payload: StopStatusIn,
    user: Dict[str, Any] = Depends(require_role(["driver", "fleet_manager", "port_admin"])),
    db: Session = Depends(get_db),
):
    """Advance one stop through the delivery chain.

    Driver-owned stops require the caller to hold the parent batch. Fleet
    managers and port admins may cancel, but cannot mark a stop delivered.
    """
    r = db.query(DeliveryRequestModel).filter(DeliveryRequestModel.id == request_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Delivery request not found.")

    new_status = (payload.status or "").strip().lower()
    schedule = db.query(DeliveryScheduleModel).filter(
        DeliveryScheduleModel.id == r.schedule_id
    ).first() if r.schedule_id else None

    if user["role"] == "driver":
        if not schedule or schedule.claimed_by_driver_id != user["sub"]:
            raise HTTPException(status_code=403, detail="Not your delivery.")
        if schedule.status in (SCHED_COMPLETED, SCHED_CANCELLED):
            raise HTTPException(status_code=409, detail="This batch is already closed.")
    else:
        if user["role"] == "fleet_manager" and r.pickup_port_id != user.get("assigned_port_id"):
            raise HTTPException(status_code=403, detail="Cross-port access denied.")
        if new_status != REQ_CANCELLED:
            raise HTTPException(
                status_code=403, detail="Only the assigned driver can advance a delivery."
            )

    allowed = REQUEST_TRANSITIONS.get(r.status, set())
    if new_status not in allowed:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot move a {r.status} stop to {new_status}. "
                   f"Allowed: {sorted(allowed) or 'nothing'}.",
        )

    if new_status == REQ_FAILED and not (payload.reason or "").strip():
        raise HTTPException(status_code=422, detail="A short reason is required to mark failed.")

    old = r.status
    r.status = new_status
    if new_status == REQ_FAILED:
        r.failure_reason = (payload.reason or "").strip()[:512]
    db.add(StatusUpdateLogModel(
        delivery_request_id=r.id,
        schedule_id=r.schedule_id,
        old_status=old,
        new_status=new_status,
        updated_by=user["sub"],
        reason=(payload.reason or "").strip()[:512] or None,
    ))
    db.commit()
    db.refresh(r)

    # ── Parent batch: complete it when the last stop closes out. ───────────
    schedule_completed = False
    if schedule is not None:
        schedule_completed = schedule_engine.maybe_complete(db, schedule, actor_id=user["sub"])

    audience: List[str] = []
    if schedule is not None:
        if schedule.claimed_by_driver_id:
            audience.append(schedule.claimed_by_driver_id)
        if schedule.fleet_manager_id:
            audience.append(schedule.fleet_manager_id)
    # Whoever placed this order gets told, so their portal updates without polling.
    from app.routers.consumer import consumer_user_ids_for_schedule
    audience.extend(consumer_user_ids_for_schedule(db, r.schedule_id))
    events.emit_status_changed_sync(serialize_request(r), r.schedule_id, audience)

    body = serialize_request(r)
    body["schedule_completed"] = schedule_completed
    return body


@router.post("/{request_id}/cancel")
def cancel_delivery(
    request_id: str,
    payload: Optional[StopStatusIn] = None,
    user: Dict[str, Any] = Depends(require_role(["fleet_manager", "port_admin", "driver"])),
    db: Session = Depends(get_db),
):
    """Cancel a pending/batched/assigned stop, returning its capacity to the pool."""
    reason = (payload.reason if payload else None) or "cancelled"
    return update_stop_status(
        request_id, StopStatusIn(status=REQ_CANCELLED, reason=reason), user, db
    )


@router.get("/{request_id}/history")
def stop_history(
    request_id: str,
    user: Dict[str, Any] = Depends(require_role(["fleet_manager", "port_admin", "driver"])),
    db: Session = Depends(get_db),
):
    """Full status history for one stop, from status_update_log."""
    r = db.query(DeliveryRequestModel).filter(DeliveryRequestModel.id == request_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Delivery request not found.")
    if user["role"] == "driver":
        schedule = db.query(DeliveryScheduleModel).filter(
            DeliveryScheduleModel.id == r.schedule_id
        ).first() if r.schedule_id else None
        if not schedule or schedule.claimed_by_driver_id != user["sub"]:
            raise HTTPException(status_code=403, detail="Not your delivery.")
    rows = db.query(StatusUpdateLogModel).filter(
        StatusUpdateLogModel.delivery_request_id == request_id
    ).order_by(StatusUpdateLogModel.timestamp.asc()).all()
    return [
        {
            "id": row.id,
            "old_status": row.old_status,
            "new_status": row.new_status,
            "updated_by": row.updated_by,
            "reason": row.reason,
            "timestamp": row.timestamp.isoformat() if row.timestamp else None,
        }
        for row in rows
    ]