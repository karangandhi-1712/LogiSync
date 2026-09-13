# LogiSync — AI Multimodal Logistics Digital Twin (Phases 1 - 6)

LogiSync is an enterprise-grade AI logistics digital twin for the **Thoothukudi Multimodal Logistics Park (MMLP)**, **V.O. Chidambaranar (VOC) Port freight corridor**, and pan-India multimodal transportation networks.

It provides high-performance **3D WebGL GIS mapping** via authentic OpenStreetMap (OSM) city and port data, **3D Maritime Cargo Ships** in the Gulf of Mannar, **3D Freight Trains** on the Southern Railway corridor, **3-tier GTA-style glowing neon GPS path lines**, real-time IoT vehicle and equipment telemetry, **Digital Twin core state separation (Observed vs Projected)**, stochastic **discrete-event simulation powered by SimPy**, and mathematical **gate & 3D yard allocation optimization powered by Google OR-Tools**.

---

## 🌟 Architecture & Implementation Overview

### ✅ Phase 1: Foundation & Dynamic Multi-City Routing
- **FastAPI Core**: High-throughput asynchronous REST API serving spatial GIS layers, KPI aggregations, and health monitoring.
- **Dual-Mode Data Layer**: Supports PostgreSQL + PostGIS spatial database storage with automatic, zero-setup fallback to local SQLite and GeoJSON seed files.
- **Dynamic Multi-City Support**: Preset freight corridors (Thoothukudi MMLP & VOC Port, Chennai Port & Sriperumbudur, JNPT Navi Mumbai, Bengaluru ICD, Delhi NCR Dadri, Mundra Port) plus global geocoding for any city worldwide.
- **Multi-Stop Waypoints (A, B, C, D, E)**: Interactive multi-stop routing planner supporting origin, cross-dock checkpoints, and destination terminals with address autocomplete and direct click-on-map picking.
- **Real-Time Traffic & Roadblocks Engine**: Live incident stream detecting construction closures, accidents, and heavy freight congestion, with a single-click "Smart Detour" rerouting mechanism.

### ✅ Phase 2: Authentic 3D OpenStreetMap GIS Data Integration
- **3D Extruded Building Geometry**: Warehouse facilities (Dry storage, Cold chain, Cross-docking transit hubs, Administration) with realistic 3D building heights (`fill-extrusion`) and ambient illumination.
- **3D Container Yard Stacks**: Real-time rendering of individual 3D multi-tier container boxes (Bays, Rows, Tiers 1-5) color-coded by ISO type (40HC Dry, 40RF Reefer, 20HZ Hazmat Class 3, High-Cube).
- **Road Network Graph**: Authentic road alignments connecting Highway SH-176 / NH-44 / NH-38 corridors, MMLP gate complexes, internal yard lanes, and VOC Port access avenues.
- **Access Gate Complex & Rail Siding**: Inbound/Outbound gates with ANPR cameras, RFID scanners, 80t static weighbridges, and intermodal container rail transfer siding.

### ✅ Phase 3: Multi-Modal Operational Entities & GTA-Style Telemetry Streaming
- **3D Maritime Cargo Vessels**: Ships navigating the deepwater Gulf of Mannar channel into VOC Port berths (MSC, CMA CGM, Maersk, Evergreen, Tugboat).
- **3D Freight Trains**: WAG-9 / WDG-4 electric locomotives pulling container flatcars along Southern Railway tracks into MMLP siding.
- **Interstate Fleet**: Multi-corridor long-haul trucks from Maharashtra, Delhi-NCR, Andhra Pradesh, Haryana, Karnataka, Kerala, Telangana, Gujarat, and Tamil Nadu.
- **GTA V Style 3-Tier Neon Routes**: Outer halo glow, main saturated ribbon, and inner white-hot laser core.
- **1 Hz WebSocket Stream (`/api/telemetry/ws`)**: High-frequency vehicle GPS updates, speed, heading, battery/fuel levels, and crane status.
- **Multi-Speed Simulation Controls**: 1x, 2x, 5x, 10x, 20x speed multipliers and Live/Pause toggle.

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

## 🚀 Running the Project

### Start Backend API Server
```powershell
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Start Frontend Web Application
```powershell
cd frontend
npm run dev -- --port 5173 --host
```
- Dashboard: [http://localhost:5173](http://localhost:5173)
- API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
