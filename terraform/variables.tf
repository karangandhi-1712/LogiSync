variable "aws_region" {
  description = "Target AWS Region for deployment (Mumbai default for VOC Port Thoothukudi)"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name identifier"
  type        = string
  default     = "logisync"
}

variable "vpc_cidr" {
  description = "CIDR block for the main VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones to span for High Availability"
  type        = list(string)
  default     = ["ap-south-1a", "ap-south-1b"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets (ALB & NAT Gateway)"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_app_subnet_cidrs" {
  description = "CIDR blocks for private application subnets (ECS Fargate)"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "private_db_subnet_cidrs" {
  description = "CIDR blocks for private database subnets (Amazon RDS)"
  type        = list(string)
  default     = ["10.0.20.0/24", "10.0.21.0/24"]
}

variable "db_instance_class" {
  description = "RDS PostgreSQL instance type (e.g. db.t4g.micro for Free Tier / Academic evaluation)"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_name" {
  description = "PostgreSQL initial database name"
  type        = string
  default     = "logisync_prod"
}

variable "db_username" {
  description = "Master username for PostgreSQL"
  type        = string
  default     = "logisync_admin"
}

variable "db_password" {
  description = "Master password for PostgreSQL database"
  type        = string
  sensitive   = true
  default     = "LogiSync_Secure_2026!PortAdmin"
}

variable "ecs_backend_cpu" {
  description = "CPU units for ECS Fargate backend task (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "ecs_backend_memory" {
  description = "Memory (MB) for ECS Fargate backend task (512 = 0.5 GB)"
  type        = number
  default     = 512
}

variable "ecs_desired_count" {
  description = "Minimum number of backend Fargate containers to run"
  type        = number
  default     = 2
}

variable "ecs_max_count" {
  description = "Maximum number of backend Fargate containers for auto-scaling"
  type        = number
  default     = 6
}
