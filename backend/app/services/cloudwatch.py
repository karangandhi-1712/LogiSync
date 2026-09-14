import boto3
import structlog
from botocore.exceptions import ClientError
from typing import Dict, Any, List
from app.config import get_settings

settings = get_settings()
logger = structlog.get_logger("logisync.cloudwatch")


class CloudWatchMetricsService:
    def __init__(self):
        self.namespace = settings.CLOUDWATCH_NAMESPACE
        self.region = settings.AWS_REGION

        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            self.client = boto3.client(
                "cloudwatch",
                region_name=self.region,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
            )
        else:
            self.client = None

    def put_metric(
        self,
        metric_name: str,
        value: float,
        unit: str = "Count",
        dimensions: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Publishes custom telemetry metric to AWS CloudWatch."""
        logger.info("cloudwatch_metric", metric=metric_name, value=value, unit=unit)

        if not self.client:
            return {"status": "logged_locally", "metric": metric_name, "value": value}

        try:
            metric_data = {
                "MetricName": metric_name,
                "Value": value,
                "Unit": unit
            }
            if dimensions:
                metric_data["Dimensions"] = dimensions

            self.client.put_metric_data(
                Namespace=self.namespace,
                MetricData=[metric_data]
            )
            return {"status": "published_to_cloudwatch"}
        except ClientError as e:
            logger.error("cloudwatch_put_error", error=str(e))
            return {"status": "error", "error": e.response["Error"]["Message"]}


cloudwatch_service = CloudWatchMetricsService()
