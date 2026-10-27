# LogiSync v2.0 — Teacher / Examiner Demonstration Guide

> **Official Step-by-Step Presentation Script and Architecture Defense Plan**
> Keep this document open on your screen during the project evaluation.

---

## 1. Quick Summary of What Is Deployed

Your architecture runs **35 resources across 15 AWS services** provisioned cleanly via **Infrastructure as Code (CloudFormation)**:

1. **VPC** — Multi-AZ isolated virtual cloud network (CIDR `10.0.0.0/16`).
2. **Subnets (6 Total)** — 2 Public Subnets, 2 Private Application Subnets, 2 Private Database Subnets across 2 Availability Zones.
3. **Internet Gateway & Route Tables** — Controlled public internet routing.
4. **Security Groups (3 Layers)** — Defense-in-depth zero-trust chain (ALB -> ECS -> RDS).
5. **Application Load Balancer (ALB)** — Layer-7 internet-facing ingress with target group health monitoring (`/healthz`).
6. **Amazon RDS PostgreSQL** — Managed database running in isolated private subnets.
7. **Amazon Cognito** — Identity user pool with email verification, custom RBAC role attributes (`port_admin`, `dispatcher`, `driver`), and web client.
8. **Amazon SNS (3 Topics)** — Decoupled pub/sub messaging (`alerts`, `reroute`, `congestion`).
9. **Amazon SQS (Queue + DLQ)** — Asynchronous delivery events buffering queue with automated Dead Letter Queue redrive policy (3 retries).
10. **Amazon S3 (3 Buckets)** — (a) Audit compliance logs with versioning enabled, (b) Documents/POD storage, (c) Frontend web assets.
11. **Amazon ECS** — Container orchestration cluster with Container Insights telemetry enabled.
12. **Amazon ECR** — Docker container image repository for the FastAPI backend.
13. **Amazon CloudWatch (Logs & Alarms)** — Centralized log group and automated CPU utilization threshold alarm wired to SNS.
14. **AWS IAM & Least Privilege** — Granular role-based execution boundaries.
15. **AWS CloudFormation** — 100% declarative Infrastructure as Code (IaC).

---

## 2. The 4-Stage Presentation Plan (10-15 Minutes)

### Stage 1: The "Wow" Opening (2 Minutes)
**What to say:**
> *"Instead of deploying a simple single-server monolithic app, LogiSync is deployed using an enterprise-grade, Multi-AZ 3-Tier Cloud Architecture on AWS following the Well-Architected Framework. Everything was provisioned through Infrastructure as Code using CloudFormation, generating 35 connected resources across 15 AWS services without any manual point-and-click configuration drift."*

**What to show:**
1. Open **AWS Console → CloudFormation → Stacks → LogiSync-Production**.
2. Click the **Resources** tab: Show all **35 provisioned resources** with green checkmarks.
3. Click the **Outputs** tab: Show all **15 structured outputs** (ALB DNS, RDS endpoint, Cognito Pool ID, S3 Buckets, SQS Queues, SNS Topics).
4. Click the **Template** tab: Highlight that the entire infrastructure is version-controlled and reproducible.

---

### Stage 2: Walking the Evaluator Through the AWS Console (6-8 Minutes)
Open each of these services in separate browser tabs to demonstrate live in the AWS Console:

#### A. Networking Tier (VPC & Subnets)
- Go to **VPC → Your VPCs** → Click `prod-logisync-vpc`.
- Go to **VPC → Subnets** → Filter by `prod`. Show the 6 subnets distributed across 2 Availability Zones (`ap-south-1a` and `ap-south-1b`).
- **Explanation:** *"We strictly separate public ingress from private application logic and private databases. The database has zero route to the internet."*

#### B. Ingress & Traffic Management (ALB)
- Go to **EC2 → Load Balancers** → Click `prod-logisync-alb`.
- Show the DNS name and dual-AZ public subnet attachment.
- Show **Target Groups** (`prod-backend-tg`) configured for port 8000 with health checks on `/healthz`.
- **Explanation:** *"The Application Load Balancer distributes incoming HTTP and WebSocket traffic, offloading connection management and automatically steering traffic only to healthy compute nodes."*

#### C. Database Tier (Amazon RDS PostgreSQL)
- Go to **RDS → Databases** → Click `prod-logisync-db`.
- Show that it runs inside `prod-db-subnet-group` across private subnets.
- Point out **Publicly Accessible: No**.
- **Explanation:** *"The PostgreSQL database is fully managed with automated maintenance, daily snapshots, and resides in private subnets, accessible only through the ECS backend security group."*

#### D. Identity & RBAC (Amazon Cognito)
- Go to **Amazon Cognito → User Pools** → Click `prod-logisync-users`.
- Show **User Pool Attributes** (Email sign-in, custom `role` attribute).
- Show **App Integration → App Client** (`prod-logisync-web`).
- **Explanation:** *"We use Amazon Cognito for identity management and JWT issuance. User passwords are not stored in the database. Custom claims carry the role for port administrators, dispatchers, and fleet drivers."*

#### E. Decoupled Messaging (SNS & SQS)
- Go to **Amazon SNS → Topics** → Show `prod-logisync-alerts`, `prod-logisync-reroute`, `prod-logisync-congestion`.
- Go to **Amazon SQS → Queues** → Show `prod-logisync-events` and `prod-logisync-dlq`. Click into `prod-logisync-events` and show the Redrive Policy (DLQ).
- **Explanation:** *"We combine Pub/Sub (SNS) for 1-to-many driver notifications and Queue-based buffering (SQS) for high-frequency IoT truck tracking events. If a telematics event fails processing 3 times, it enters the Dead Letter Queue instead of being dropped."*

#### F. Storage & Governance (Amazon S3)
- Go to **Amazon S3 → Buckets** → Filter by `logisync`.
- Show the 3 dedicated buckets:
  1. `prod-logisync-audit-*` (Compliance & audit trail, Versioning: Enabled, SSE-AES256).
  2. `prod-logisync-docs-*` (Proof-of-Delivery photos and e-gate waybills).
  3. `prod-logisync-web-*` (Frontend static assets, Public access: Blocked).
- **Explanation:** *"S3 provides 11 9's durability. Object versioning protects audit records against tampering or accidental deletion."*

#### G. Observability (Amazon CloudWatch & ECS)
- Go to **CloudWatch → Log Groups** → Show `/ecs/prod-logisync-backend`.
- Go to **CloudWatch → Alarms** → Show `prod-logisync-high-cpu` (triggers SNS alerts if CPU exceeds 80%).
- Go to **ECS → Clusters** → Show `prod-logisync-cluster` with Container Insights.
- **Explanation:** *"Observability is built-in with automated alarming. If backend utilization spikes, CloudWatch automatically triggers SNS notifications to operators."*

---

### Stage 3: Showing Code Integration in VS Code (2-3 Minutes)
Open these application source files in your editor to show your teacher how the backend connects directly to AWS SDK (`boto3`):

1. **`backend/app/services/s3_service.py`** — Handles pre-signed URLs and document/POD uploads to S3.
2. **`backend/app/services/sqs_service.py`** — Buffers telematics and shipment lifecycle messages into SQS.
3. **`backend/app/services/sns_notifier.py`** — Broadcasts emergency corridor bypasses and congestion alerts to drivers via SNS.
4. **`backend/app/services/cloudwatch.py`** — Emits custom telemetry metrics (`GateCongestionScore`, `TurnaroundTime`) to CloudWatch.
5. **`backend/Dockerfile`** & **`frontend/Dockerfile`** — Multi-stage production container builds.
6. **`deploy/cloudformation-template.yaml`** — The complete IaC blueprint.

---

### Stage 4: Answering Viva & Architecture Questions

#### Q1: "Why did you use CloudFormation instead of manual console setup?"
> **Answer:** *"Manual setup leads to configuration drift, security gaps, and cannot be audited or replicated. CloudFormation provides Infrastructure as Code (IaC), making our entire 35-resource environment version-controlled, reproducible, and compliant with CI/CD automation."*

#### Q2: "How is security handled across your network tiers?"
> **Answer:** *"We use a layered Zero-Trust model. Public subnets only hold the Application Load Balancer. The compute tier only accepts traffic from the ALB on port 8000. The PostgreSQL database only accepts incoming traffic from the ECS security group on port 5432 and is physically isolated from the internet."*

#### Q3: "What is the difference in role between SNS and SQS here?"
> **Answer:** *"SNS is a push-based Publish/Subscribe service for broadcasting notifications (like congestion or route changes) to multiple subscribers simultaneously. SQS is a pull-based queuing service for asynchronous load-leveling, ensuring high-frequency telematics data can be processed reliably with a Dead Letter Queue for error isolation."*

#### Q4: "How does this stay within your $101 AWS credit budget?"
> **Answer:** *"We optimized every component for educational cost-efficiency: `db.t3.micro` single-AZ PostgreSQL, S3 standard tier with lifecycle management, SQS and SNS well within the 1-million free monthly request tier, and CloudWatch retention capped at 14 days. Total projected run cost is approximately $30–$35/month, comfortably within our $101 budget for the semester."*
