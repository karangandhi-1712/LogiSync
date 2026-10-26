# ─── Amazon ECS Fargate Container Orchestration Tier ──────────────────────────

resource "aws_ecr_repository" "backend" {
  name                 = "${var.project_name}-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "${var.project_name}-ecr-repo"
  }
}

resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.project_name}-ecs-cluster"
  }
}

resource "aws_cloudwatch_log_group" "ecs_backend" {
  name              = "/ecs/${var.project_name}-backend"
  retention_in_days = 30

  tags = {
    Name = "${var.project_name}-ecs-logs"
  }
}

# ECS Fargate Task Definition
resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project_name}-backend-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = tostring(var.ecs_backend_cpu)
  memory                   = tostring(var.ecs_backend_memory)
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "${aws_ecr_repository.backend.repository_url}:latest"
      essential = true

      portMappings = [
        {
          containerPort = 8000
          hostPort      = 8000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "APP_NAME"
          value = "LogiSync v2.0 - Port Logistics Command Center"
        },
        {
          name  = "APP_VERSION"
          value = "2.0.0"
        },
        {
          name  = "DEBUG"
          value = "false"
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "DATABASE_URL"
          value = "postgresql+psycopg://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/${var.db_name}"
        },
        {
          name  = "COGNITO_USER_POOL_ID"
          value = aws_cognito_user_pool.pool.id
        },
        {
          name  = "COGNITO_APP_CLIENT_ID"
          value = aws_cognito_user_pool_client.client.id
        },
        {
          name  = "COGNITO_REGION"
          value = var.aws_region
        },
        {
          name  = "DEMO_MODE"
          value = "true"
        },
        {
          name  = "SNS_TOPIC_ALERTS"
          value = aws_sns_topic.alerts.arn
        },
        {
          name  = "SNS_TOPIC_REROUTE"
          value = aws_sns_topic.reroute.arn
        },
        {
          name  = "SNS_TOPIC_CONGESTION"
          value = aws_sns_topic.congestion.arn
        },
        {
          name  = "S3_AUDIT_BUCKET"
          value = aws_s3_bucket.audit_logs.id
        },
        {
          name  = "CLOUDWATCH_NAMESPACE"
          value = "LogiSync/PortLogistics"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backend"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8000/healthz || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 15
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-backend-task"
  }
}

# ECS Fargate Service
resource "aws_ecs_service" "backend" {
  name            = "${var.project_name}-backend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.ecs_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private_app[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 8000
  }

  deployment_controller {
    type = "ECS"
  }

  depends_on = [
    aws_lb_listener.http,
    aws_db_instance.postgres
  ]

  tags = {
    Name = "${var.project_name}-backend-service"
  }
}

# ─── Application Auto Scaling (Horizontal Pod / Container Autoscaling) ────────

resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = var.ecs_max_count
  min_capacity       = var.ecs_desired_count
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Scale Out / In based on Average CPU Utilization > 70%
resource "aws_appautoscaling_policy" "ecs_cpu" {
  name               = "${var.project_name}-cpu-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
