# LogiSync v2.0 — Port Logistics Command Center

> **AI-powered logistics optimization platform for V.O. Chidambaranar (VOC) Port, Thoothukudi.**
> Unifying real-time fleet telematics, dynamic slot allocation, and predictive rerouting across port, highway, rail, and inland container depots.

---

## 🌟 Core Novelties

1. **AI-Based Dynamic Gate Slot Allocation**
   - Eliminates multi-hour truck queues at VOC Port gates (Gates 1–4).
   - Dynamically analyzes live arrival rates, vessel schedules, and terminal dwell times to smooth vehicle arrival waves.
   - Saves up to 40% in gate dwell and waiting times.

2. **Live-Location-Triggered Corridor Rerouting**
   - Continuously monitors heavy freight vehicles across the Madurai–Thoothukudi Highway (NH 38) and Harbour Expressway corridors.
   - Automatically detects congestion bottlenecks and dynamically issues bypass instructions before trucks join physical queues.
   - Reduces fuel consumption and carbon emissions (modeled with physics-based aerodynamic and rolling resistance equations).

---

## 🏗️ Technology Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend (React 19 + TypeScript + Vite)"]
        UI[Command Center Dashboard]
        GMAP[Google Maps JavaScript Canvas]
        SLOT[Dynamic Slot Matrix & Timeline]
        FLEET[Live Fleet Tracker (24 Vehicles)]
        ANALYTICS[Predictive Analytics & Heatmaps]
    end

    subgraph AWS_EC2["AWS EC2 — FastAPI Application Tier"]
        API[FastAPI Server]
        PROXY[Google Maps API Proxy (Secure Key Vault)]
        AI_SLOT[AI Dynamic Slot Allocator]
        REROUTE[Live-Location Triggered Rerouter]
        FUEL[Physics Fuel & Emissions Engine]
        WS[Bidirectional Telemetry WebSocket Hub]
    end

    subgraph AWS_Cloud["AWS Managed Cloud Services"]
        COGNITO[Amazon Cognito (RBAC & JWT Auth)]
        SNS[Amazon SNS (Driver SMS & Push Alerts)]
        CW[Amazon CloudWatch (Logs & Custom Metrics)]
        S3[Amazon S3 (Audit Trails & Static Hosting)]
    end

    Client <-->|HTTPS REST & WS| AWS_EC2
    Client -->|Auth Tokens| COGNITO
    AWS_EC2 -->|SMS Alerts| SNS
    AWS_EC2 -->|Metrics & Logs| CW
    AWS_EC2 -->|Audit Trails| S3
```

---

## 🛡️ Security Hardening

- **Amazon Cognito RBAC**: Role-based access control (`port_admin`, `fleet_manager`, `dispatcher`, `driver`) with enforced JWT validation and JWKS key rotation.
- **Server-Side Google Maps Proxy**: Directions, Geocoding, Places, and Distance Matrix API keys remain securely on the server; never exposed to browser client networks.
- **OWASP HTTP Security Headers**: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and strict `Content-Security-Policy`.
- **API Rate Limiting**: Powered by `slowapi` with sliding window throttling (100 req/min general, 20 req/min AI algorithms).
- **Non-Root Execution**: FastAPI server runs under dedicated unprivileged `logisync` user with systemd isolation.
- **Auditing & Tracing**: Structured JSON audit logs with correlation IDs for end-to-end trace visibility in CloudWatch.

---

## 🚀 Quickstart (Local Development)

### 1. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(The system comes with high-fidelity simulated fallback data so you can run and test immediately even before entering live API keys).*

### 2. Run Backend (FastAPI)
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```
- API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/healthz`

### 3. Run Frontend (React 19 + Vite)
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```
- Open `http://localhost:5173` in your browser.
- Instant dual theme toggle between Light (Default) and Dark Command Center modes.

---

## ☁️ AWS Production Deployment

Complete step-by-step instructions for provisioning EC2, Cognito User Pools, SNS Topics, S3 Buckets, and Nginx with Let's Encrypt TLS 1.3 are documented in [`deploy/README.md`](deploy/README.md).

---

## 📂 Project Structure

```
LogiSync/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app & WebSocket hub
│   │   ├── config.py            # Environment settings
│   │   ├── db.py                # Database connection & sessions
│   │   ├── seed.py              # 24 trucks & slots seeder
│   │   ├── dependencies.py      # Cognito JWT & RBAC guards
│   │   ├── middleware/          # Security headers, rate limiting, audit logging
│   │   ├── models/              # Trucks, Slots, Containers, Shipments, Audit
│   │   ├── routers/             # Auth, Maps, Slots, Fleet, Operations, GIS, Analytics
│   │   └── services/            # Google Maps proxy, AI Allocator, Rerouter, Fuel Model, AWS SDKs
│   ├── tests/                   # Pytest suite
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/               # Login, Dashboard, SlotBooking, FleetTracker, Analytics
│   │   ├── components/          # TopBar, Sidebar, MapCanvas, TelemetryInspector, etc.
│   │   ├── context/             # AuthContext (Cognito), ThemeContext (Light/Dark)
│   │   ├── services/            # API client with JWT interceptor, Cognito auth
│   │   └── types/               # TypeScript interfaces
│   ├── index.html
│   └── package.json
├── deploy/                      # EC2 setup script, Nginx config, systemd, CloudWatch agent
├── .env.example
└── README.md
```
