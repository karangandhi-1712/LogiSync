import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import init_db, SessionLocal
from .seed import seed
from .routers import gis, entities, telemetry, digital_twin, simulation, optimization, sensors, scenarios

app = FastAPI(
    title="Thoothukudi MMLP Industrial Logistics & Digital Twin API",
    version="1.2.0-phase6",
    description="Full Industrial Logistics App + 3D OpenStreetMap Digital Twin with IoT Sensors, SimPy Discrete-Event Simulation, and Google OR-Tools Mathematical Optimization."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Mount all core subsystem routers
app.include_router(gis.router)
app.include_router(entities.router)
app.include_router(telemetry.router)
app.include_router(digital_twin.router)
app.include_router(simulation.router)
app.include_router(optimization.router)
app.include_router(sensors.router)
app.include_router(scenarios.router)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "system": "Thoothukudi MMLP Logistics & Digital Twin Core",
        "active_phases": {
            "phase_1_foundation": "IMPLEMENTED",
            "phase_2_real_gis_osm": "IMPLEMENTED",
            "phase_3_entities_crud_telemetry": "IMPLEMENTED",
            "phase_4_digital_twin_state_separation": "IMPLEMENTED",
            "phase_5_simpy_discrete_event_simulation": "IMPLEMENTED",
            "phase_6_ortools_optimization": "IMPLEMENTED"
        },
        "logistics_subsystems": {
            "iot_sensor_network": "ACTIVE",
            "port_gate_anpr_weighbridge": "ACTIVE",
            "warehouse_dock_management": "ACTIVE",
            "scenario_benchmarking_engine": "ACTIVE"
        },
        "gis_engine": "OpenStreetMap + MapLibre GL 3D",
        "simulation_engine": "SimPy Discrete-Event Core",
        "optimization_engine": "Google OR-Tools CP-SAT & Linear Solver"
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
