# ─── Amazon EC2 Auto Scaling Group & Launch Template Tier ────────────────────

# IAM Instance Profile for EC2 Instances
resource "aws_iam_role" "ec2_instance_role" {
  name = "${var.project_name}-ec2-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  role       = aws_iam_role.ec2_instance_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "ec2_cloudwatch" {
  role       = aws_iam_role.ec2_instance_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_role_policy_attachment" "ec2_app_permissions" {
  role       = aws_iam_role.ec2_instance_role.name
  policy_arn = aws_iam_policy.ecs_task_app_policy.arn
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.project_name}-ec2-instance-profile"
  role = aws_iam_role.ec2_instance_role.name
}

# EC2 Launch Template with Automated Bootstrap User-Data
resource "aws_launch_template" "backend" {
  name_prefix   = "${var.project_name}-ec2-template-"
  image_id      = "ami-0dee22c13ea7a9a67" # Ubuntu Server 22.04 LTS (ap-south-1 Mumbai)
  instance_type = "t3.medium"              # 2 vCPU, 4 GB RAM

  iam_instance_profile {
    name = aws_iam_instance_profile.ec2_profile.name
  }

  network_interfaces {
    associate_public_ip_address = false
    security_groups             = [aws_security_group.ecs.id]
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    set -e
    apt-get update -y
    apt-get install -y docker.io docker-compose curl unzip jq
    systemctl enable --now docker

    # Install AWS CLI v2
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip -q awscliv2.zip
    ./aws/install

    # Prepare LogiSync App Directory
    mkdir -p /opt/logisync
    cd /opt/logisync

    # Write Environment file dynamically from Terraform
    cat <<EOT > .env
    APP_NAME=LogiSync v2.0 - Port Logistics Command Center
    APP_VERSION=2.0.0
    DEBUG=false
    DATABASE_URL=postgresql+psycopg://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/${var.db_name}
    AWS_REGION=${var.aws_region}
    COGNITO_USER_POOL_ID=${aws_cognito_user_pool.pool.id}
    COGNITO_APP_CLIENT_ID=${aws_cognito_user_pool_client.client.id}
    SNS_TOPIC_ALERTS=${aws_sns_topic.alerts.arn}
    SNS_TOPIC_REROUTE=${aws_sns_topic.reroute.arn}
    SNS_TOPIC_CONGESTION=${aws_sns_topic.congestion.arn}
    S3_AUDIT_BUCKET=${aws_s3_bucket.audit_logs.id}
    S3_DOCS_BUCKET=${aws_s3_bucket.documents.id}
    SQS_DELIVERY_QUEUE_URL=${aws_sqs_queue.delivery_queue.url}
    DEMO_MODE=true
    EOT

    echo "EC2 Instance successfully bootstrapped."
  EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "${var.project_name}-ec2-node"
      Role = "Backend-App"
    }
  }

  tags = {
    Name = "${var.project_name}-launch-template"
  }
}

# EC2 Auto Scaling Group spanning Private App Subnets across 2 AZs
resource "aws_autoscaling_group" "backend" {
  name_prefix         = "${var.project_name}-asg-"
  vpc_zone_identifier = aws_subnet.private_app[*].id
  target_group_arns   = [aws_lb_target_group.backend.arn]

  min_size         = 1
  max_size         = 4
  desired_capacity = 2

  health_check_type         = "ELB"
  health_check_grace_period = 300

  launch_template {
    id      = aws_launch_template.backend.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "${var.project_name}-backend-asg-node"
    propagate_at_launch = true
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Target Tracking Auto-Scaling Policy for EC2 ASG (CPU 70%)
resource "aws_autoscaling_policy" "ec2_cpu_policy" {
  name                   = "${var.project_name}-ec2-cpu-scaling"
  autoscaling_group_name = aws_autoscaling_group.backend.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
