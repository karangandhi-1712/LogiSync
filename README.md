# Thoothukudi MMLP Digital Twin

An open-source AI logistics digital twin for the Thoothukudi Multimodal Logistics Park (MMLP). It provides interactive GIS mapping, authentic geographical layout visualization via OpenStreetMap, operational KPI monitoring, and an extensible architecture for logistics optimization and simulation.

---

## Architecture & Current Implementation

### Phase 1: Foundation (IMPLEMENTED)

- **FastAPI Backend**: Asynchronous REST API serving spatial GIS layers, KPI aggregations, and health monitoring.
- **React + MapLibre GL Frontend**: High-performance vector map interface styled with Tailwind CSS, utilizing Carto Dark Matter base tiles and custom GeoJSON vector layers.
- **Dual-Mode Data Layer**: Supports local PostgreSQL + PostGIS spatial database storage with automatic, zero-setup fallback to local GeoJSON seed files.

### Phase 2: Real GIS Data Integration (IMPLEMENTED)

- **Authentic OSM Boundaries**: Extracted real geographical footprints for Thoothukudi industrial warehouses, container yards, and connecting road networks using the Overpass API.
- **Data Honesty & Simulation Tagging**: Real geographical geometry is paired with explicitly marked `SIMULATED` operational metrics (capacities, occupancies) to ensure strict transparency for unmeasured parameters.
- **Automated Data Fetching**: Integrated script to query and regenerate fresh Thoothukudi GIS seed datasets from OpenStreetMap.

---

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
