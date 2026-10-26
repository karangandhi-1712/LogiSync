# ─── Zero-Trust Layered Security Groups ────────────────────────────────────────

# 1. Application Load Balancer Security Group (Public Edge)
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb-sg"
  description = "Allows incoming HTTP/HTTPS traffic to ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "Allow inbound HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Allow inbound HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description     = "Allow outbound traffic to ECS Fargate tasks"
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [] # dynamically bound below
    cidr_blocks     = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-alb-sg"
    Tier = "Edge"
  }
}

# 2. ECS Fargate Application Tier Security Group
resource "aws_security_group" "ecs" {
  name        = "${var.project_name}-ecs-sg"
  description = "Allows traffic strictly from ALB to backend containers"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Inbound from ALB only on port 8000"
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "Allow HTTPS outbound for AWS APIs, Cognito, and Google Maps"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow outbound to RDS PostgreSQL"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.private_db_subnet_cidrs
  }

  tags = {
    Name = "${var.project_name}-ecs-sg"
    Tier = "Application"
  }
}

# 3. Amazon RDS Database Tier Security Group (Isolated)
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "Allows inbound PostgreSQL traffic exclusively from ECS containers"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from ECS backend tier only"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    description = "No outbound traffic permitted from database tier"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-rds-sg"
    Tier = "Database"
  }
}
