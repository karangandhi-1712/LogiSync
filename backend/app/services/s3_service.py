"""Amazon S3 Document & Audit Storage Service for LogiSync.

Handles secure upload, retrieval, and pre-signed URL generation for:
- Proof-of-Delivery (POD) photos and driver signatures
- E-Gate Passes and Cargo Waybills
- Regulatory Audit Trail archives
"""

import boto3
from botocore.exceptions import ClientError
from typing import Dict, Any, Optional
import structlog
from app.config import get_settings

settings = get_settings()
logger = structlog.get_logger("logisync.s3")


class S3StorageService:
    def __init__(self):
        self.region = settings.AWS_REGION
        self.audit_bucket = settings.S3_AUDIT_BUCKET
        self.docs_bucket = getattr(settings, "S3_DOCS_BUCKET", "logisync-documents")

        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            self.client = boto3.client(
                "s3",
                region_name=self.region,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
            )
        else:
            self.client = None

    def upload_file_bytes(
        self,
        file_bytes: bytes,
        object_key: str,
        content_type: str = "application/octet-stream",
        bucket_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Uploads raw byte payload to Amazon S3."""
        target_bucket = bucket_name or self.docs_bucket
        logger.info("s3_upload_initiated", key=object_key, bucket=target_bucket)

        if not self.client:
            return {
                "status": "simulated",
                "bucket": target_bucket,
                "key": object_key,
                "url": f"https://{target_bucket}.s3.{self.region}.amazonaws.com/{object_key}"
            }

        try:
            self.client.put_object(
                Bucket=target_bucket,
                Key=object_key,
                Body=file_bytes,
                ContentType=content_type,
                ServerSideEncryption="AES256"
            )
            return {
                "status": "uploaded",
                "bucket": target_bucket,
                "key": object_key,
                "url": f"https://{target_bucket}.s3.{self.region}.amazonaws.com/{object_key}"
            }
        except ClientError as e:
            logger.error("s3_upload_failed", error=str(e), key=object_key)
            return {"status": "error", "error": e.response["Error"]["Message"]}

    def generate_presigned_url(
        self,
        object_key: str,
        bucket_name: Optional[str] = None,
        expiration: int = 3600
    ) -> str:
        """Generates a secure temporary pre-signed S3 URL for client viewing."""
        target_bucket = bucket_name or self.docs_bucket
        if not self.client:
            return f"https://{target_bucket}.s3.{self.region}.amazonaws.com/{object_key}?simulated=true"

        try:
            url = self.client.generate_presigned_url(
                "get_object",
                Params={"Bucket": target_bucket, "Key": object_key},
                ExpiresIn=expiration
            )
            return url
        except ClientError as e:
            logger.error("s3_presigned_url_failed", error=str(e))
            return ""


s3_service = S3StorageService()
