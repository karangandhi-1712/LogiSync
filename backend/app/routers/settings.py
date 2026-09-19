from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.db import get_db
from app.models.settings import SettingsModel
from app.dependencies import get_current_user
from app.services.audit_service import audit_service

router = APIRouter(prefix="/settings", tags=["User Preferences & Settings"])


class SettingsUpdate(BaseModel):
    theme: Optional[str] = None
    tutorial_enabled: Optional[str] = None
    notification_sms: Optional[str] = None
    notification_push: Optional[str] = None
    notification_inapp: Optional[str] = None
    default_map_mode: Optional[str] = None
    default_zoom: Optional[str] = None
    units: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None


@router.get("")
def get_user_settings(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Fetch user settings and preferences."""
    user_id = current_user.get("sub", "local-dev-user")
    setting = db.query(SettingsModel).filter(SettingsModel.user_id == user_id).first()
    if not setting:
        # Create default
        setting = SettingsModel(
            user_id=user_id,
            theme="light",
            tutorial_enabled="true",
            notification_sms="true",
            notification_push="true",
            notification_inapp="true",
            default_map_mode="roadmap",
            default_zoom="12",
            units="metric"
        )
        db.add(setting)
        db.commit()
        db.refresh(setting)

    return {
        "user_id": setting.user_id,
        "theme": setting.theme,
        "tutorial_enabled": setting.tutorial_enabled,
        "notification_sms": setting.notification_sms,
        "notification_push": setting.notification_push,
        "notification_inapp": setting.notification_inapp,
        "default_map_mode": setting.default_map_mode,
        "default_zoom": setting.default_zoom,
        "units": setting.units,
        "preferences": setting.preferences or {}
    }


@router.put("")
def update_user_settings(
    req: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Save user preferences and settings."""
    user_id = current_user.get("sub", "local-dev-user")
    setting = db.query(SettingsModel).filter(SettingsModel.user_id == user_id).first()
    if not setting:
        setting = SettingsModel(user_id=user_id)
        db.add(setting)

    if req.theme is not None:
        setting.theme = req.theme
    if req.tutorial_enabled is not None:
        setting.tutorial_enabled = req.tutorial_enabled
    if req.notification_sms is not None:
        setting.notification_sms = req.notification_sms
    if req.notification_push is not None:
        setting.notification_push = req.notification_push
    if req.notification_inapp is not None:
        setting.notification_inapp = req.notification_inapp
    if req.default_map_mode is not None:
        setting.default_map_mode = req.default_map_mode
    if req.default_zoom is not None:
        setting.default_zoom = req.default_zoom
    if req.units is not None:
        setting.units = req.units
    if req.preferences is not None:
        setting.preferences = req.preferences

    db.commit()
    db.refresh(setting)

    audit_service.log_event(
        event_type="settings_changed",
        user_id=user_id,
        details=f"Settings updated for {user_id}",
        metric_name="SettingsChangedCount",
        db=db
    )

    return {
        "status": "success",
        "settings": {
            "user_id": setting.user_id,
            "theme": setting.theme,
            "tutorial_enabled": setting.tutorial_enabled,
            "notification_sms": setting.notification_sms,
            "notification_push": setting.notification_push,
            "notification_inapp": setting.notification_inapp,
            "default_map_mode": setting.default_map_mode,
            "default_zoom": setting.default_zoom,
            "units": setting.units,
            "preferences": setting.preferences or {}
        }
    }
