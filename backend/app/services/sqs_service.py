"""Amazon SQS Asynchronous Queue Service for LogiSync.

Decouples high-volume delivery events, telematics batches, and status changes
from synchronous HTTP requests, ensuring high resilience during traffic spikes.
"""

import json
import boto3
from botocore.exceptions import ClientError
from typing import Dict, Any, Optional
import structlog
from app.config import get_settings

settings = get_settings()
logger = structlog.get_logger("logisync.sqs")


class SQSService:
    def __init__(self):
        self.region = settings.AWS_REGION
        self.queue_url = getattr(settings, "SQS_DELIVERY_QUEUE_URL", "")

        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            self.client = boto3.client(
                "sqs",
                region_name=self.region,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
            )
        else:
            self.client = None

    def send_event_message(
        self,
        event_type: str,
        payload: Dict[str, Any],
        queue_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """Enqueues an asynchronous delivery event to Amazon SQS."""
        target_queue = queue_url or self.queue_url
        logger.info("sqs_message_enqueued", event_type=event_type)

        if not self.client or not target_queue:
            return {
                "status": "simulated",
                "event_type": event_type,
                "message_id": "sim-sqs-msg-12345"
            }

        try:
            resp = self.client.send_message(
                QueueUrl=target_queue,
                MessageBody=json.dumps({"event": event_type, "data": payload}),
                MessageAttributes={
                    "EventType": {
                        "DataType": "String",
                        "StringValue": event_type
                    }
                }
            )
            return {
                "status": "enqueued",
                "message_id": resp["MessageId"]
            }
        except ClientError as e:
            logger.error("sqs_send_failed", error=str(e), event_type=event_type)
            return {"status": "error", "error": e.response["Error"]["Message"]}


sqs_service = SQSService()
