import boto3
import structlog
from botocore.exceptions import ClientError
from typing import Dict, Any, Optional
from app.config import get_settings

settings = get_settings()
logger = structlog.get_logger("logisync.sns")


class SNSNotifierService:
    def __init__(self):
        self.region = settings.AWS_REGION
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            self.client = boto3.client(
                "sns",
                region_name=self.region,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
            )
        else:
            self.client = None

    def publish_alert(
        self,
        topic_arn: str,
        subject: str,
        message: str,
        phone_number: Optional[str] = None
    ) -> Dict[str, Any]:
        """Publishes an alert notification to an AWS SNS Topic or direct SMS."""
        logger.info("sns_dispatch", subject=subject, message=message, phone=phone_number)

        if not self.client:
            return {
                "dispatched": True,
                "mode": "simulated",
                "message_id": "sim-sns-98401",
                "subject": subject
            }

        try:
            if phone_number:
                # Direct SMS
                resp = self.client.publish(
                    PhoneNumber=phone_number,
                    Message=f"[LogiSync VOC Port] {subject}: {message}"
                )
                return {"dispatched": True, "message_id": resp["MessageId"]}
            elif topic_arn:
                resp = self.client.publish(
                    TopicArn=topic_arn,
                    Subject=f"LogiSync Alert: {subject}",
                    Message=message
                )
                return {"dispatched": True, "message_id": resp["MessageId"]}
            return {"dispatched": False, "error": "No topic ARN or phone number provided"}
        except ClientError as e:
            logger.error("sns_publish_error", error=str(e))
            return {"dispatched": False, "error": e.response["Error"]["Message"]}


sns_service = SNSNotifierService()
