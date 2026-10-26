# ─── Amazon SNS Decoupled Event Topics ───────────────────────────────────────

resource "aws_sns_topic" "alerts" {
  name         = "${var.project_name}-alerts"
  display_name = "LogiSync Dispatch & System Alerts"

  kms_master_key_id = "alias/aws/sns"
}

resource "aws_sns_topic" "reroute" {
  name         = "${var.project_name}-reroute"
  display_name = "LogiSync Corridor Dynamic Reroute Notifications"

  kms_master_key_id = "alias/aws/sns"
}

resource "aws_sns_topic" "congestion" {
  name         = "${var.project_name}-congestion"
  display_name = "VOC Port Gate Congestion Wave Alarms"

  kms_master_key_id = "alias/aws/sns"
}
