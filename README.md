# LogiSync v2.0 — Port Logistics Command Center

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.115+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/Frontend-React%2019%20%2B%20TypeScript-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![AWS Multi-AZ](https://img.shields.io/badge/Cloud-AWS%20Multi--AZ-232F3E?style=flat&logo=amazonwebservices&logoColor=white)](https://aws.amazon.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-336791?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Containers-Docker%20Compose-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)

> **Next-generation digital logistics optimization and gate scheduling platform for V.O. Chidambaranar (VOC) Port, Thoothukudi.**  
> Unifying real-time freight telematics, dynamic gate slot allocation, automated corridor bypass recommendations, and multi-tenant freight operations across maritime terminal and highway corridors.

---

## 📌 Executive Overview

Heavy container congestion and bottlenecked entry gates at major maritime terminals introduce severe delays, fuel waste, and logistical uncertainty. **LogiSync v2.0** provides an end-to-end command center that coordinates freight movements between **VOC Port terminal gates (Gates 1–4)**, inland container depots (ICDs), and regional arterial freight corridors (including NH 38 and the Harbour Expressway).

### Core Operational Capabilities

1. **AI-Assisted Dynamic Gate Slot Allocation**
   - Automatically levels vehicle arrival waves to avoid truck queuing at terminal gates.
   - Dynamically correlates vessel berthing schedules, crane throughput rates, and real-time gate dwell indices.
   - Smooths entry surges and reduces gate dwell times by up to **40%**.

2. **Live-Location Corridor Rerouting & Congestion Relief**
   - Ingests high-frequency GPS telematics from freight trucks along the Madurai–Thoothukudi Highway and Harbour Expressway.
   - Proactively detects bottlenecks and issues corridor bypass recommendations via SMS and in-app alerts before vehicles enter congested zones.
   - Computes fuel savings and emissions reduction using physics-based aerodynamic and rolling resistance models.

3. **Multi-Role Role-Based Access Control (RBAC)**
   - **Port Authority & Admin**: Global traffic oversight, gate throughput analytics, and system-wide audit logging.
   - **Fleet Managers**: Batch truck scheduling, driver roster assignment, and freight rate calculations.
   - **Truck Drivers**: Real-time job manifests, turn-by-turn navigation, digital gate e-passes, and electronic Proof of Delivery (POD).
   - **Consumers & Shippers**: End-to-end container shipment booking, real-time live map tracking, and automated status updates.

4. **Multi-Channel Event Bus & Asynchronous Decoupling**
   - Point-to-point **Amazon SQS** buffering handles high-frequency truck telematics without database contention, backed by an automated **Dead Letter Queue (DLQ)**.
   - Publish/Subscribe **Amazon SNS** topics broadcast urgent corridor reroutes and gate alerts simultaneously to dispatchers and drivers.

---

## 🏗️ System Architecture

LogiSync is engineered as a **Cloud-Native, Multi-AZ 3-Tier Enterprise Architecture** compliant with the **AWS Well-Architected Framework**:

```
                         [ Global Ingress & Clients ]
                 Browser / Mobile Clients (React 19 SPA)
                                   │
                                   ▼
          ┌──────────────────────────────────────────────────┐
          │      Application Load Balancer (Dual-AZ ALB)     │
          │    Port 80/443 Ingress · Health Check: /healthz  │
          └────────────────────────┬─────────────────────────┘
                                   │
          ┌────────────────────────┴─────────────────────────┐
          │           VPC Public Subnets (ap-south-1)        │
          └────────────────────────┬─────────────────────────┘
                                   │ Forward (:8000)
                                   ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │         Private Application Subnet Tier (Zero-Trust)             │
  │                                                                  │
  │   ┌──────────────────────────┐     ┌──────────────────────────┐  │
  │   │  FastAPI Backend (AZ-a)  │     │  FastAPI Backend (AZ-b)  │  │
  │   │   Containerized (Port 8000)│    │   Containerized (Port 8000)│ │
  │   └─────────────┬────────────┘     └────────────┬─────────────┘  │
  └─────────────────┼───────────────────────────────┼────────────────┘
                    │                               │
                    ▼                               ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │         Private Database Subnet Tier (No Public Route)           │
  │                                                                  │
  │           Amazon RDS PostgreSQL Database (Multi-AZ)              │
  │               Port 5432 · Encrypted Storage · Auto-Backups       │
  └──────────────────────────────────────────────────────────────────┘
            │                                      │
            ▼                                      ▼
  ┌───────────────────────┐              ┌───────────────────────┐
  │   Amazon S3 Buckets   │              │  Amazon SNS & SQS     │
  │  · Web Assets Bucket  │              │  · Delivery Queue     │
  │  · POD Documents      │              │  · Dead Letter Queue  │
  │  · Audit Trail Logs   │              │  · SMS Alert Topics   │
  └───────────────────────┘              └───────────────────────┘
```

---

## ☁️ AWS Cloud Deployment (Production Infrastructure)

The entire production stack is provisioned declaratively via **Infrastructure as Code (IaC)** using AWS CloudFormation and Terraform:

| Layer | AWS Service | Purpose in LogiSync |
| :--- | :--- | :--- |
| **Network** | **Amazon VPC** | Dual-AZ isolated network with 6 subnets (Public, Private App, Private DB). |
| **Ingress** | **Application Load Balancer (ALB)** | Layer-7 load balancer with automatic health probing on `/healthz`. |
| **Database** | **Amazon RDS PostgreSQL** | Relational data persistence isolated in private subnets with daily snapshots. |
| **Identity** | **Amazon Cognito** | Secure user directory with RS256 JWT tokens and custom RBAC claims. |
| **Queuing** | **Amazon SQS** | High-throughput telematics buffer with Dead Letter Queue redrive policy. |
| **Push Alerts** | **Amazon SNS** | Real-time driver SMS and dispatcher notification fanout. |
| **Storage** | **Amazon S3** | Three dedicated buckets for static hosting, POD document photos, and audit logs. |
| **Containers** | **Amazon ECS & ECR** | Container cluster with Container Insights and backend image repository. |
| **Monitoring** | **Amazon CloudWatch** | Structured JSON logs and automated CPU threshold alarms wired to SNS. |

- 📄 **Architecture & Defense Dossier**: [`docs/AWS_ARCHITECTURE.md`](docs/AWS_ARCHITECTURE.md)
- 🎓 **Examiner / Teacher Demonstration Guide**: [`docs/TEACHER_DEMO_GUIDE.md`](docs/TEACHER_DEMO_GUIDE.md)
- 🛠️ **CloudFormation Template**: [`deploy/cloudformation-template.yaml`](deploy/cloudformation-template.yaml)
- 🏗️ **Terraform Modules**: [`terraform/`](terraform/)

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- **Python 3.11+**
- **Node.js 18+ & npm**
- **Docker & Docker Compose** (optional for containerized run)

### Method 1: Running with Docker Compose (Recommended)
Spin up the complete stack (PostgreSQL, FastAPI backend, React frontend) with a single command:

```bash
# Clone the repository
git clone https://github.com/karangandhi-1712/LogiSync.git
cd LogiSync

# Start all services
docker-compose up --build
```
- **Frontend Command Center**: `http://localhost:5173`
- **FastAPI OpenAPI Swagger**: `http://localhost:8000/docs`
- **Health Endpoint**: `http://localhost:8000/healthz`

---

### Method 2: Manual Local Development

#### 1. Backend Setup
```bash
cd backend
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux / macOS:
source venv/bin/activate

# Install dependencies & run database seeds
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser. The interface includes an instant dual-theme switcher between **Light Theme (Default)** and **Dark Command Center Theme**.

---

## 📂 Project Organization

```
LogiSync/
├── backend/
│   ├── app/
│   │   ├── main.py              # Application entrypoint & WebSocket gateway
│   │   ├── config.py            # Environment & AWS configuration loader
│   │   ├── db.py                # Database connection pool & session manager
│   │   ├── seed.py              # Database seeding for ports, terminals & slots
│   │   ├── dependencies.py      # JWT authentication & RBAC guards
│   │   ├── middleware/          # Security headers, rate limiting & request tracing
│   │   ├── models/              # Relational models (Trucks, Bookings, Telematics)
│   │   ├── routers/             # API routes (Auth, Fleet, Operations, GIS, Analytics)
│   │   └── services/            # Core engines (Slot Allocator, Rerouting, AWS SDKs)
│   ├── tests/                   # Pytest test suite
│   ├── requirements.txt         # Python dependencies
│   └── Dockerfile               # Backend production container
│
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI primitives, maps, and command widgets
│   │   ├── context/             # React Contexts (Auth, Theme, Port, Notifications)
│   │   ├── data/                # Reference ports and GIS waypoint datasets
│   │   ├── pages/               # Role-specific portals (Admin, Fleet, Driver, Consumer)
│   │   ├── services/            # Axios API client with JWT interceptors
│   │   ├── types/               # TypeScript interfaces & domain models
│   │   ├── App.tsx              # Application routing & layout shell
│   │   └── main.tsx             # React DOM root
│   ├── package.json             # Frontend dependencies & scripts
│   ├── Dockerfile               # Multi-stage production container
│   └── nginx.conf               # Nginx reverse proxy configuration
│
├── deploy/                      # Turnkey cloud deployment scripts
│   ├── cloudformation-template.yaml # Complete AWS CloudFormation IaC (35 resources)
│   ├── ec2-setup.sh             # Automated Ubuntu host provisioner
│   └── logisync.service         # systemd daemon configuration
│
├── docs/                        # Engineering & evaluation documentation
│   ├── AWS_ARCHITECTURE.md      # Detailed cloud architecture & Well-Architected analysis
│   └── TEACHER_DEMO_GUIDE.md    # Step-by-step examiner presentation script
│
├── terraform/                   # Alternative multi-AZ Terraform IaC modules
├── data/seed/                   # Real GIS GeoJSON boundaries & infrastructure data
├── docker-compose.yml           # Unified multi-container orchestration
├── .gitignore                   # Enterprise gitignore configuration
└── README.md                    # Project documentation
```

---

## 🔒 Security & Reliability Controls

- **Zero-Trust Network Isolation**: Database and application compute tiers reside in private subnets with strictly bounded security groups.
- **Stateless RS256 JWT Authentication**: Cryptographically signed access tokens verified using public key sets without per-request database lookups.
- **OWASP HTTP Security Hardening**: Enforces `HSTS`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and Content Security Policies.
- **Automated Rate Limiting**: Built-in sliding-window throttling to safeguard API endpoints against abuse and DoS attacks.
- **Audit Compliance**: Immutable, versioned audit logging stored in S3 for forensic auditing and regulatory compliance.

---

## 📜 License & Academic Integrity

This project was developed for academic and engineering demonstration purposes. All architectural specifications, infrastructure templates, and simulation datasets are licensed under the [MIT License](LICENSE).
