# ─── Terraform Outputs (AWS Architecture Endpoints) ──────────────────────────

output "cloudfront_url" {
  description = "Global CloudFront CDN URL for the LogiSync Frontend Web Application"
  value       = "https://${aws_cloudfront_distribution.cdn.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront Distribution ID (used for CI/CD cache invalidation)"
  value       = aws_cloudfront_distribution.cdn.id
}

output "alb_dns_name" {
  description = "Application Load Balancer Public DNS (API & WebSocket Origin)"
  value       = aws_lb.main.dns_name
}

output "rds_postgresql_endpoint" {
  description = "Amazon RDS PostgreSQL Database Endpoint (Private Subnet)"
  value       = aws_db_instance.postgres.endpoint
  sensitive   = false
}

output "ecr_repository_url" {
  description = "Amazon ECR Repository URL for FastAPI Backend Docker Images"
  value       = aws_ecr_repository.backend.repository_url
}

output "cognito_user_pool_id" {
  description = "Amazon Cognito User Pool ID for Role-Based Access Control"
  value       = aws_cognito_user_pool.pool.id
}

output "cognito_app_client_id" {
  description = "Amazon Cognito Web App Client ID"
  value       = aws_cognito_user_pool_client.client.id
}

output "s3_frontend_bucket" {
  description = "Amazon S3 Bucket name for Frontend Static Hosting"
  value       = aws_s3_bucket.frontend.id
}

output "s3_audit_bucket" {
  description = "Amazon S3 Bucket name for Audit Trails and Regulatory Logs"
  value       = aws_s3_bucket.audit_logs.id
}

output "sns_topic_alerts_arn" {
  description = "SNS Topic ARN for System and Dispatch Alerts"
  value       = aws_sns_topic.alerts.arn
}

output "sns_topic_reroute_arn" {
  description = "SNS Topic ARN for Dynamic Corridor Rerouting"
  value       = aws_sns_topic.reroute.arn
}

output "cloudwatch_dashboard_url" {
  description = "Direct AWS Console URL to the LogiSync Operational Dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.command_center.dashboard_name}"
}

output "ec2_autoscaling_group_name" {
  description = "Amazon EC2 Auto Scaling Group Name for Backend Compute Fleet"
  value       = aws_autoscaling_group.backend.name
}

output "s3_documents_bucket" {
  description = "Amazon S3 Bucket for Proof-of-Delivery (POD) and Cargo Waybill documents"
  value       = aws_s3_bucket.documents.id
}

output "sqs_delivery_events_queue_url" {
  description = "Amazon SQS Queue URL for Asynchronous Delivery and Telematics Events"
  value       = aws_sqs_queue.delivery_queue.url
}

output "sqs_delivery_dlq_arn" {
  description = "Amazon SQS Dead Letter Queue ARN for Poison/Failed Events"
  value       = aws_sqs_queue.delivery_dlq.arn
}
