import uuid
import structlog
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models.audit import AuditModel
from app.services.cloudwatch import cloudwatch_service

logger = structlog.get_logger("logisync.audit")

class AuditService:
    @staticmethod
    def log_event(
        event_type: str,
        user_id: str = "system",
        details: Optional[str] = None,
        ip_address: Optional[str] = None,
        metric_name: Optional[str] = None,
        metric_val: float = 1.0,
        unit: str = "Count",
        db: Optional[Session] = None
    ):
        """Records event to database audit trail and sends metric to CloudWatch.

        Always uses an independent session so a caller-provided session's
        uncommitted work is never committed or rolled back by auditing.
        The optional `db` arg is accepted for backwards compatibility and ignored.
        """
        _ = db  # intentionally unused: keep signature stable for callers
        audit_db = SessionLocal()
        try:
            audit = AuditModel(
                id=f"aud-{uuid.uuid4().hex[:10]}",
                event_type=event_type,
                user_id=user_id or "system",
                details=details,
                ip_address=ip_address
            )
            audit_db.add(audit)
            audit_db.commit()
            logger.info("audit_event_logged", event_type=event_type, user_id=user_id)
        except Exception as e:
            logger.error("audit_log_failed", error=str(e))
            audit_db.rollback()
        finally:
            audit_db.close()

        # CloudWatch metric emission
        if metric_name:
            cloudwatch_service.put_metric(
                metric_name=metric_name,
                value=metric_val,
                unit=unit
            )

audit_service = AuditService()
