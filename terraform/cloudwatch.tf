# ─── Amazon CloudWatch Observability & Operational Dashboard ──────────────────

# 1. Metric Alarm: ECS High CPU Utilization
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  alarm_name          = "${var.project_name}-ecs-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Triggered when ECS Backend service CPU utilization exceeds 80%"

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.backend.name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# 2. Metric Alarm: ALB 5XX Server Error Spike
resource "aws_cloudwatch_metric_alarm" "alb_5xx_spike" {
  alarm_name          = "${var.project_name}-alb-high-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Triggered when ALB reports more than 10 5XX errors in 1 minute"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# 3. Custom Business Metric Alarm: VOC Port Gate Congestion Spike
resource "aws_cloudwatch_metric_alarm" "gate_congestion" {
  alarm_name          = "${var.project_name}-voc-gate-congestion-spike"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "GateCongestionScore"
  namespace           = "LogiSync/PortLogistics"
  period              = 120
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "Triggered when port AI allocator detects queue wave congestion index > 85"

  alarm_actions = [aws_sns_topic.congestion.arn]
}

# 4. CloudWatch Central Executive Dashboard
resource "aws_cloudwatch_dashboard" "command_center" {
  dashboard_name = "${var.project_name}-command-center"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ServiceName", aws_ecs_service.backend.name, "ClusterName", aws_ecs_cluster.main.name],
            [".", "MemoryUtilization", ".", ".", ".", "."]
          ]
          period = 60
          stat   = "Average"
          region = var.aws_region
          title  = "ECS Backend Container Performance (CPU & Memory %)"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.main.arn_suffix],
            [".", "TargetResponseTime", ".", "."]
          ]
          period = 60
          stat   = "Sum"
          region = var.aws_region
          title  = "ALB Request Volume & Latency"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 24
        height = 6
        properties = {
          metrics = [
            ["LogiSync/PortLogistics", "GateCongestionScore"],
            [".", "ActiveSlotsBooked"],
            [".", "DynamicReroutesTriggered"]
          ]
          period = 60
          stat   = "Average"
          region = var.aws_region
          title  = "VOC Port Operations & AI Telematics Custom Metrics"
        }
      }
    ]
  })
}
