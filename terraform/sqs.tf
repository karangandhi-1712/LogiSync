# ─── Amazon SQS Message Queue & Dead-Letter Queue (DLQ) ─────────────────────

# Dead Letter Queue for Poison/Failed Messages
resource "aws_sqs_queue" "delivery_dlq" {
  name                      = "${var.project_name}-delivery-dlq"
  message_retention_seconds = 1209600 # 14 days retention
  sqs_managed_sse_enabled   = true

  tags = {
    Name = "${var.project_name}-delivery-dlq"
  }
}

# Main Delivery Event Queue
resource "aws_sqs_queue" "delivery_queue" {
  name                      = "${var.project_name}-delivery-events-queue"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 345600 # 4 days
  receive_wait_time_seconds = 10     # Long-polling enabled
  sqs_managed_sse_enabled   = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.delivery_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name = "${var.project_name}-delivery-queue"
  }
}
