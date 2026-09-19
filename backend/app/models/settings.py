from sqlalchemy import Column, String, DateTime, Text, JSON
from datetime import datetime
from app.db import Base

class SettingsModel(Base):
    __tablename__ = "user_settings"

    user_id = Column(String(64), primary_key=True, index=True)
    theme = Column(String(32), default="light")
    tutorial_enabled = Column(String(16), default="true")
    notification_sms = Column(String(16), default="true")
    notification_push = Column(String(16), default="true")
    notification_inapp = Column(String(16), default="true")
    default_map_mode = Column(String(32), default="roadmap")
    default_zoom = Column(String(16), default="12")
    units = Column(String(16), default="metric")
    preferences = Column(JSON, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
