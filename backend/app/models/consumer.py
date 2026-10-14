import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from datetime import datetime
from app.db import Base


def _uuid():
    return str(uuid.uuid4())


class ConsumerModel(Base):
    """Consumer identity, now backed by a real `consumer` user account.

    `user_id` is the authoritative link once the consumer has signed up;
    `mobile_number` remains the dedupe key that ties repeat requests together and
    is what the signup backfill matches on. Rows created before accounts existed
    simply keep a NULL `user_id` until that consumer signs up.
    """

    __tablename__ = "consumers"

    id = Column(String(36), primary_key=True, default=_uuid)
    name = Column(String(128), nullable=False)
    mobile_number = Column(String(32), nullable=False, unique=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)