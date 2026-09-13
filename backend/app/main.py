import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import init_db, SessionLocal
from .seed import seed
from .routers import gis, routing, operations

app = FastAPI(title="LogiSync AI Logistics Digital Twin API",
              version="0.3.0-phase3",
              description="Phase 1-3: Dynamic Multi-City GIS, Real-Time Routing, Telemetry & Operational Entities.")

app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(gis.router)
app.include_router(routing.router)
app.include_router(operations.router)
app.include_router(operations.ws_router)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "phase": 3,
        "implementation_status": "IMPLEMENTED",
        "features": [
            "Multi-City GIS Footprints (OSM Authentic)",
            "Multi-Stop Routing (A, B, C, D, E) & Real-Time Roadblocks",
            "Operational Entities CRUD (Trucks, Containers, Shipments)",
            "Real-Time MQTT Telemetry Ingestion & WebSocket Broadcast"
        ]
    }


@app.on_event("startup")
def on_startup():
    if os.environ.get("SEED_ON_STARTUP", "true").lower() == "true":
        try:
            init_db()
            db = SessionLocal()
            try:
                seed(db)
            finally:
                db.close()
        except Exception as e:
            print(f"DB init/seed skipped (fallback to file mode): {e}")
