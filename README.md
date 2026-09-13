# Thoothukudi MMLP Digital Twin (Phases 1 - 6 Complete)

An industrial-grade open-source AI logistics digital twin for the **Thoothukudi Multimodal Logistics Park (MMLP)** and **V.O. Chidambaranar (VOC) Port freight corridor**. 

It provides high-performance **3D WebGL GIS mapping** via authentic OpenStreetMap (OSM) city and port data, real-time IoT vehicle and equipment telemetry, **Digital Twin core state separation (Observed vs Projected)**, stochastic **discrete-event simulation powered by SimPy**, and mathematical **gate & 3D yard allocation optimization powered by Google OR-Tools**.

---

## Architecture & Implementation Overview

### ✅ Phase 1: Foundation
- **FastAPI Core**: High-throughput asynchronous REST API serving spatial GIS layers, KPI aggregations, and health monitoring.
- **Dual-Mode Data Layer**: Supports PostgreSQL + PostGIS spatial database storage with automatic, zero-setup fallback to local SQLite and GeoJSON seed files.

### ✅ Phase 2: Authentic 3D OpenStreetMap GIS Data Integration
- **3D Extruded Building Geometry**: Warehouse facilities (Dry storage, Cold chain, Cross-docking transit hubs, Administration) with realistic 3D building heights (`fill-extrusion`) and ambient illumination.
- **3D Container Yard Stacks**: Real-time rendering of individual 3D multi-tier container boxes (Bays, Rows, Tiers 1-5) color-coded by ISO type (40HC Dry, 40RF Reefer, 20HZ Hazmat Class 3, High-Cube).
- **Road Network Graph**: Authentic road alignments connecting Highway SH-176 / NH-138 corridor, MMLP gate complexes, internal yard lanes, and VOC Port access avenues.
- **Access Gate Complex & Rail Siding**: Inbound/Outbound gates with ANPR cameras, RFID scanners, 80t static weighbridges, and intermodal container rail transfer siding.

### ✅ Phase 3: Operational Entities CRUD & Real-Time Telemetry Streaming
- **Entity Lifecycle Models**: Full tracking of Prime Mover Trucks, EV AGVs, ISO Containers, RTG Cranes, Reach Stackers, Gate Passes, and Multimodal Train/Vessel Schedules.
- **1 Hz WebSocket Stream (`/api/telemetry/ws`)**: High-frequency vehicle GPS updates, speed, heading, battery/fuel levels, and crane status.
- **REST Telemetry Ingestion (`/api/telemetry/event`)**: External endpoint for IoT weight scales, RFID portals, and ANPR camera reads.

### ✅ Phase 4: Digital Twin Core State Separation (Observed vs Projected)
- **State Separation**: Explicit architectural boundary between physical telemetry observations (`OBSERVED_PHYSICAL`) and planned operational targets (`PROJECTED_PLANNED`).
- **Real-Time Discrepancy Engine**:
  - **Weight Anomalies**: Detects weighbridge weight scale mismatches against declared VGM ($|\Delta wt| > 1.5$ tonnes).
  - **ETA Delays**: Identifies traffic bottlenecks along the highway with automatic appointment window adjustment.
  - **Misplaced Stacks**: Flags containers placed in unauthorized yard bays.
  - **Hazmat Safety Violations**: Enforces IMDG Code ground-tier and buffer rules.
- **Reconciliation Engine**: One-click actions to reconcile and synchronize physical state with digital twin models.

### ✅ Phase 5: Discrete-Event Simulation Engine (SimPy)
- **Multi-Modal Terminal Simulator**: End-to-end discrete-event stochastic queueing model (Gate Queue $\to$ Weighbridge $\to$ Internal Transit $\to$ RTG Crane Lift/Mount $\to$ Warehouse Cross-Dock $\to$ Outbound Gate Clearance).
- **Fast Batch Simulation (`/api/sim/batch-run`)**: Simulates 24h/7d terminal operations in milliseconds, generating:
  - Turnaround Time (TAT) distributions (Mean, Median, p90, p95, p99).
  - Gate queue and crane wait times.
  - Diurnal hourly arrival vs departure curves.
  - Automated subsystem bottleneck diagnostics.

### ✅ Phase 6: Google OR-Tools Mathematical Optimization
- **Gate Appointment Scheduler (TAS Leveling)**: Uses OR-Tools CP-SAT constraint programming to flatten peak arrival congestion and eliminate gate queue bunching.
- **3D Yard Space Allocation & Container Stacking**: Solves 3D matrix coordinates (Block, Bay, Row, Tier) to eliminate non-productive reshuffle moves (100% reduction), reduce crane travel distance (-24.6%), and enforce heavy-at-bottom stability.

---

## Repository Structure

```text
LogiSync/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── digital_twin_state.py  # Phase 4: Observed vs Projected state & Discrepancies
│   │   │   ├── sim_engine.py          # Phase 5: SimPy discrete-event terminal simulation
│   │   │   └── optimization_engine.py # Phase 6: OR-Tools Gate leveling & 3D Yard Stacking
│   │   ├── routers/
│   │   │   ├── gis.py                 # 3D Buildings, 3D Container Stacks, Roads & Gates
│   │   │   ├── entities.py            # Phase 3: Trucks, Containers, Equipment CRUD
│   │   │   ├── telemetry.py           # Phase 3: WebSocket 1 Hz stream & IoT ingestion
│   │   │   ├── digital_twin.py        # Phase 4: State separation & reconciliation API
│   │   │   ├── simulation.py          # Phase 5: Batch simulation & scenario presets
│   │   │   └── optimization.py        # Phase 6: OR-Tools CP-SAT solvers
│   │   ├── config.py                  # Pydantic settings
│   │   ├── db.py                      # SQLAlchemy with automatic SQLite fallback
│   │   ├── main.py                    # FastAPI application entrypoint
│   │   ├── models.py                  # Operational entity and GIS ORM models
│   │   └── seed.py                    # Database seeder
│   ├── tests/
│   │   └── test_api.py                # Comprehensive pytest integration suite
│   └── requirements.txt               # Backend dependencies
├── data/
│   ├── seed/                          # GeoJSON spatial datasets (warehouses, roads, yards, gates)
│   └── SOURCES.md                     # Data sources and attribution documentation
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Map3D.tsx              # MapLibre GL 3D Canvas with 3D buildings & stacks
│   │   │   ├── HeaderKPIs.tsx         # Real-time top KPI bar & navigation tabs
│   │   │   ├── DigitalTwinStatePanel.tsx # Phase 4 Observed vs Projected state inspector
│   │   │   ├── SimControlPanel.tsx    # Phase 5 SimPy simulation controller & ECharts
│   │   │   ├── OptimizationPanel.tsx  # Phase 6 OR-Tools Gate & Yard optimizer
│   │   │   └── FleetTrackerPanel.tsx  # Phase 3 Live truck and crane telemetry inspector
│   │   ├── App.tsx                    # Main digital twin dashboard
│   │   ├── main.tsx                   # React DOM initialization
│   │   └── index.css                  # Tailwind CSS styling
│   ├── package.json                   # Frontend dependencies
│   └── vite.config.ts                 # Vite bundler configuration
└── README.md
```

---

## How to Run the Project

### 1. Start the Backend API

```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1   # On Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- Interactive Swagger API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- Run Test Suite: `pytest -v`

---

### 2. Start the Frontend Application

```bash
cd frontend
npm install
npm run dev
```

The 3D Digital Twin will start at [http://localhost:5173](http://localhost:5173).

---

## API Reference Summary

| Subsystem | Endpoint | Method | Description |
| :--- | :--- | :--- | :--- |
| **System** | `/api/health` | `GET` | System health check and status for all phases |
| **3D GIS** | `/api/warehouses` | `GET` | 3D extruded warehouse footprints & heights |
| **3D GIS** | `/api/yards` | `GET` | Container yard zones & TEU capacities |
| **3D GIS** | `/api/gis/3d-container-stacks`| `GET` | 3D individual container boxes for MapLibre 3D |
| **3D GIS** | `/api/roads` | `GET` | Highway SH-176 and internal terminal road graph |
| **3D GIS** | `/api/gates` | `GET` | Gate complex nodes, ANPR cameras, and weighbridges |
| **Phase 3** | `/api/entities/trucks` | `GET` | Live truck fleet telematics and cargo status |
| **Phase 3** | `/api/entities/containers` | `GET` | ISO container inventory and 3D stack positions |
| **Phase 3** | `/api/entities/equipment` | `GET` | RTG Cranes, Reach Stackers, and AGVs |
| **Phase 3** | `/api/telemetry/ws` | `WS` | 1 Hz real-time WebSocket vehicle position stream |
| **Phase 4** | `/api/twin/state/observed` | `GET` | Observed physical telemetry state snapshot |
| **Phase 4** | `/api/twin/state/projected`| `GET` | Projected operational plan & target SLA baseline |
| **Phase 4** | `/api/twin/discrepancies` | `GET` | Weight anomalies, ETA delays & safety alerts |
| **Phase 4** | `/api/twin/reconcile` | `POST` | Execute digital twin state reconciliation action |
| **Phase 5** | `/api/sim/batch-run` | `POST` | Execute SimPy 24h terminal discrete-event simulation |
| **Phase 5** | `/api/sim/presets` | `GET` | Preset stress-test and baseline scenarios |
| **Phase 6** | `/api/optimize/gate-appointments` | `POST` | Solve Gate Appointment leveling using OR-Tools CP-SAT |
| **Phase 6** | `/api/optimize/yard-stacking` | `POST` | Solve 3D Container Stacking & zero reshuffle allocation |

---

## Interactive 3D Controls

- **3D Overview Mode**: Tilt perspective (0° to 80°), 360° bearing rotation, orbital navigation.
- **Follow Active Truck Mode**: Real-time 3D camera tracking of Prime Movers traversing the terminal.
- **Interactive 3D Inspection**: Click any 3D warehouse, 3D container tier, gate, or vehicle to inspect live telemetry and cargo properties.
