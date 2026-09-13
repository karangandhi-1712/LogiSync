# LogiSync — AI Multimodal Logistics Digital Twin

LogiSync is an enterprise-grade AI logistics digital twin. It provides interactive GIS mapping, authentic geographical layout visualization via OpenStreetMap, operational KPI monitoring, dynamic multi-city selection, multi-point freight dispatching (A, B, C, D, E stops), real-time traffic congestion tracking, and live roadblock/hazard avoidance.

---

## Architecture & Phased Implementation

### Phase 1: Foundation, Dynamic Multi-City & Real-Time Traffic Routing (IMPLEMENTED)

- **Framer Motion Dynamic Frontend**: State-of-the-art glassmorphic user interface powered by React 19, MapLibre GL, and Framer Motion.
  - **Dynamic Multi-City Selection**: Instant fly-to capability between preset freight corridors (Thoothukudi MMLP & VOC Port, Chennai Port & Sriperumbudur MMLP, JNPT Navi Mumbai, Bengaluru ICD Whitefield, Delhi NCR Multimodal Hub Dadri, Mundra Port) plus global search-as-you-type geocoding for *any* city worldwide.
  - **Multi-Point Waypoints (A, B, C, D, E)**: Interactive multi-stop routing planner supporting origin, cross-dock checkpoints, and destination terminals with address autocomplete and direct click-on-map coordinate picking.
  - **Real-Time Traffic & Roadblocks Engine**: Live incident stream detecting construction closures, accidents, and heavy freight congestion, with a single-click "Smart Detour" rerouting mechanism.
  - **Autonomous Fleet Simulator**: Interactive trip timeline scrubber animating heavy freight vehicles along the calculated polyline with live coordinates and speedometer telemetry.
- **FastAPI Backend Services**:
  - `/api/cities`: Pre-configured logistics corridors and bounding boxes.
  - `/api/geocode`: Fast global geocoding proxy using Photon & Nominatim.
  - `/api/route`: Multi-waypoint driving route calculation via OSRM with distance, duration, and turn-by-turn navigation instructions.
  - `/api/traffic/incidents`: Real-time traffic slowdowns, road closures, and construction hazards.
  - Spatial GIS endpoints (`/api/warehouses`, `/api/yards`, `/api/gates`, `/api/roads`, `/api/mmlp/boundary`, `/api/kpis`).
- **Dual-Mode Data Layer**: Supports local PostgreSQL + PostGIS spatial database storage with zero-setup automatic fallback to local GeoJSON seed files.

### Phase 2: Real GIS Data Integration & Facility Inspector (IMPLEMENTED)

- **Multi-City Authentic OSM Extraction**: Extracted authentic geographical boundaries for warehouses, container yards, and connecting road networks across all major corridors (Thoothukudi, Chennai, Mumbai JNPT, Bengaluru, Delhi Dadri, Mundra) via OpenStreetMap Overpass engine.
- **Data Honesty & Capacity Simulation Engine**: Accurate polygon ground area calculation using the Shoelace formula on real latitude/longitude coordinates to derive realistic pallet capacities (`area_sqm * 1.4`) and container TEU slots (`area_sqm / 38`), paired with explicit `"data_source": "OpenStreetMap Authentic Footprint"` and `"operational_metrics": "SIMULATED"` transparency tagging.
- **Interactive Facility Inspector Card**: Click on any emerald warehouse polygon, blue container yard, or magenta access gate to inspect live footprint dimensions, capacity metrics, and occupancy gauges.
- **Direct Waypoint Integration**: Single-click "Add as Waypoint Stop in Route" button inside the Facility Inspector automatically routes freight vehicles directly into the facility!
- **Consolidated GIS Endpoint**: `/api/gis/layers?city={city}` serving dynamically filtered and styled spatial collections for the active city.

---
...............+.
## Repository Structure

```text
LogiSync/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   │   └── gis.py            # GIS and KPI API routes
│   │   ├── scripts/
│   │   │   └── fetch_osm.py      # Overpass API data extraction script
│   │   ├── config.py             # Pydantic environment configuration
│   │   ├── db.py                 # SQLAlchemy engine and session management
│   │   ├── main.py               # FastAPI application entrypoint
│   │   ├── models.py             # SQLAlchemy ORM models (Gate, Warehouse, YardZone)
│   │   └── seed.py               # Database seeder from GeoJSON
│   └── requirements.txt          # Python dependencies
├── data/
│   ├── seed/                     # GeoJSON spatial datasets (warehouses, roads, yards, gates)
│   └── SOURCES.md                # Data sources and attribution documentation
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Main digital twin dashboard and MapLibre canvas
│   │   ├── main.tsx              # React DOM initialization
│   │   └── index.css             # Tailwind CSS styles
│   ├── package.json              # Frontend dependencies and scripts
│   └── vite.config.ts            # Vite configuration
└── README.md
```

---

## Prerequisites

- **Python**: 3.10 or higher
- **Node.js**: 18.0 or higher (with `npm`)
- **PostgreSQL / PostGIS** *(Optional)*: If you want database persistence. The application automatically runs in standalone file-fallback mode if PostgreSQL is not running.

---

## How to Run the Project

### 1. Start the Backend API

Open a terminal in the project root:

```bash
cd backend
```

#### Create and Activate a Virtual Environment

- **On Windows (PowerShell)**:

  ```powershell
  python -m venv .venv
  .venv\Scripts\Activate.ps1
  ```

- **On Linux / macOS**:

  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```

#### Install Dependencies and Run

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The backend server will start at [http://localhost:8000](http://localhost:8000).

- Interactive Swagger API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/api/health](http://localhost:8000/api/health)

*(Optional: Set `DATABASE_URL=postgresql+psycopg2://user:pass@localhost:5432/mmlp` in a `backend/.env` file if using a local PostgreSQL database).*

---

### 2. Start the Frontend Application

Open a second terminal in the project root:

```bash
cd frontend
npm install
npm run dev
```

The frontend will start at [http://localhost:5173](http://localhost:5173).

---

### 3. (Optional) Refresh Real OSM GIS Data

To fetch the latest spatial geometry directly from OpenStreetMap's Overpass API for the Thoothukudi industrial area:

```bash
cd backend
python app/scripts/fetch_osm.py
```

This updates the GeoJSON files located in `data/seed/`:
- `real_warehouses.geojson`
- `real_yards.geojson`
- `real_roads.geojson`
- `real_gates.geojson`

---

## API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Service status and current implementation phase |
| `/api/cities` | `GET` | Supported freight hubs, bounding boxes, and initial waypoints |
| `/api/geocode` | `GET` | Fast global geocoding proxy for cities, terminals, and addresses |
| `/api/route` | `POST` | Multi-point OSRM routing engine (supports A, B, C, D, E waypoints) |
| `/api/traffic/incidents` | `GET` | Real-time roadblocks, construction zones, and traffic slowdowns |
| `/api/gis/layers` | `GET` | Consolidated authentic OSM layers (warehouses, yards, gates, roads) |
| `/api/kpis` | `GET` | Aggregated counts for gates, warehouses, and simulated yard occupancy |
| `/api/mmlp/boundary` | `GET` | GeoJSON polygon for the Thoothukudi MMLP boundary |
| `/api/roads` | `GET` | GeoJSON LineStrings representing regional road networks |
| `/api/warehouses` | `GET` | GeoJSON polygons for industrial warehouses and capacities |
| `/api/yards` | `GET` | GeoJSON polygons for container yard zones |
| `/api/gates` | `GET` | GeoJSON points for access gates, weighbridges, ANPR, and RFID lanes |

---

## Interactive Map Controls & Legend

When viewing the dashboard at [http://localhost:5173](http://localhost:5173):

- **Green Polygons**: Real industrial warehouse footprints.
- **Blue Polygons**: Container yard storage zones.
- **Gray Lines**: Primary, secondary, and tertiary road networks.
- **Magenta Circles**: Gate access points.
- **Red Dashed Line**: MMLP perimeter boundary.
- **KPI Card**: Displays active building counts and live simulation status indicators.

---

## Future Phases (PLANNED)

- **Phase 3**: Operational entities CRUD & real-time MQTT telemetry ingestion.
- **Phase 4**: Digital twin core state separation (observed vs. projected state).
- **Phase 5**: Discrete-event simulation powered by SimPy.
- **Phase 6**: Gate appointment scheduling and yard allocation optimization using Google OR-Tools.
- **Phase 7**: Machine learning-based turnaround time and dwell forecasting.
- **Phase 8**: Logistics AI Copilot assistant.
- **Phase 9**: High-resolution satellite and drone imagery integration.
