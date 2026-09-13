import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import init_db, SessionLocal
from .seed import seed
from .routers import gis, routing, operations, optimizer

app = FastAPI(title="LogiSync AI Logistics Digital Twin API",
              version="0.6.0-phase6",
              description="Phase 1-6: Dynamic Multi-City GIS, Real-Time Routing, Telemetry, "
                          "ML Route Optimization, Truck/Payload Configurator & Simulation.")

app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(gis.router)
app.include_router(routing.router)
app.include_router(operations.router)
app.include_router(operations.ws_router)
app.include_router(optimizer.router)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "phase": 6,
        "implementation_status": "IMPLEMENTED",
        "features": [
            "Multi-City GIS Footprints (OSM Authentic)",
            "Multi-Stop Routing (A, B, C, D, E) & Real-Time Roadblocks",
            "Operational Entities CRUD (Trucks, Containers, Shipments)",
            "Real-Time MQTT Telemetry Ingestion & WebSocket Broadcast",
            "ML-Powered Route Optimization (Genetic Algorithm TSP)",
            "Physics-Based Fuel Consumption Model",
            "Truck Profile Database & Payload Configurator",
            "Dark/Light Theme Toggle"
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
            print("[LogiSync] Connected to PostgreSQL & seeded successfully.")
        except Exception:
            print("[LogiSync] PostgreSQL offline (localhost:5432). Running in standalone In-Memory & ML Simulation mode.")
