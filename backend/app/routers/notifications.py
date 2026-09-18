from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.dependencies import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"], dependencies=[Depends(get_current_user)])

# In-memory realistic notifications store
NOTIFICATIONS_STORE = [
    {
        "id": "notif-01",
        "title": "Corridor Bottleneck Alert",
        "message": "NH 38 Bypass bottleneck detected. 3 trucks recommended for dynamic diversion to Gate 4.",
        "type": "warning",
        "timestamp": "10 mins ago",
        "read": False,
        "actionUrl": "/fleet"
    },
    {
        "id": "notif-02",
        "title": "Gate 3 Reefer Priority Cleared",
        "message": "TRK-8821 (Scania R500) successfully docked at Cold Storage Alpha.",
        "type": "success",
        "timestamp": "25 mins ago",
        "read": False,
        "actionUrl": "/dashboard"
    },
    {
        "id": "notif-03",
        "title": "AIS Vessel Arrival Scheduled",
        "message": "Container carrier MV Chennai Star docking at Berth 2 at 16:30 IST.",
        "type": "info",
        "timestamp": "1 hour ago",
        "read": True,
        "actionUrl": "/dashboard"
    },
    {
        "id": "notif-04",
        "title": "Slot Rescheduled Automatically",
        "message": "TRK-1102 delayed on highway. Slot rescheduled to 15:30 with no dwell penalty.",
        "type": "info",
        "timestamp": "2 hours ago",
        "read": True,
        "actionUrl": "/slots"
    }
]


@router.get("")
def list_notifications():
    """List all notifications for the current user."""
    return NOTIFICATIONS_STORE


@router.post("/{notification_id}/read")
def mark_notification_read(notification_id: str):
    """Mark a notification as read."""
    for n in NOTIFICATIONS_STORE:
        if n["id"] == notification_id:
            n["read"] = True
            return {"status": "success", "notification": n}
    raise HTTPException(status_code=404, detail="Notification not found")


@router.post("/read-all")
def mark_all_read():
    """Mark all notifications as read."""
    for n in NOTIFICATIONS_STORE:
        n["read"] = True
    return {"status": "success", "count": len(NOTIFICATIONS_STORE)}
