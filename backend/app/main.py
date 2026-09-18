import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import get_settings
from app.db import Base, engine, ensure_port_columns
from app.seed import seed_database
from app.middleware import (
    SecurityHeadersMiddleware,
    limiter,
    rate_limit_exceeded_handler,
    LoggingMiddleware
)
from app.routers import (
    auth_router,
    maps_router,
    slots_router,
    fleet_router,
    operations_router,
    gis_router,
    analytics_router,
    settings_router,
    notifications_router,
    ports_router
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables, migrate pre-multi-port DBs, seed initial data
    Base.metadata.create_all(bind=engine)
    ensure_port_columns()
    seed_database()
    task = asyncio.create_task(periodic_telemetry_broadcast())
    yield
    # Shutdown
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered Port Logistics Command Center for VOC Port Thoothukudi",
    lifespan=lifespan
)

# ─── Rate Limiter State ──────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# ─── Security & Logging Middlewares ──────────────────────────────────────────
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(LoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Include API Routers ─────────────────────────────────────────────────────
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(maps_router, prefix=settings.API_PREFIX)
app.include_router(slots_router, prefix=settings.API_PREFIX)
app.include_router(fleet_router, prefix=settings.API_PREFIX)
app.include_router(operations_router, prefix=settings.API_PREFIX)
app.include_router(gis_router, prefix=settings.API_PREFIX)
app.include_router(analytics_router, prefix=settings.API_PREFIX)
app.include_router(settings_router, prefix=settings.API_PREFIX)
app.include_router(notifications_router, prefix=settings.API_PREFIX)
app.include_router(ports_router, prefix=settings.API_PREFIX)



# ─── Health Checks ───────────────────────────────────────────────────────────
@app.get("/healthz", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "region": settings.AWS_REGION
    }


@app.get("/", tags=["System"])
def root():
    return {
        "message": "Welcome to LogiSync v2.0 - VOC Port Command Center API",
        "docs": "/docs",
        "health": "/healthz"
    }


# ─── Real-Time Telemetry WebSocket ───────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                if connection in self.active_connections:
                    self.active_connections.remove(connection)


ws_manager = ConnectionManager()


async def periodic_telemetry_broadcast():
    """Background loop that emits typed updates (truck_update, stats) to connected UIs."""
    import random
    from app.db import SessionLocal
    from app.models.truck import TruckModel
    from app.ports import clamp_point

    step = 0
    while True:
        await asyncio.sleep(3.5)
        if not ws_manager.active_connections:
            continue

        step += 1
        db = SessionLocal()
        try:
            trucks = db.query(TruckModel).all()
            if trucks:
                # Pick 1-2 random trucks to simulate movement
                sampled = random.sample(trucks, min(2, len(trucks)))
                for trk in sampled:
                    if trk.status in ("in_transit", "queued"):
                        # Subtle realistic coordinate jitter, clamped to the
                        # truck's port bbox so simulated trucks never drift
                        # into the sea over long uptimes.
                        dlat = random.uniform(-0.0008, 0.0008)
                        dlng = random.uniform(-0.0008, 0.0008)
                        trk.lat, trk.lng = clamp_point(
                            trk.port_id or "voc", trk.lat + dlat, trk.lng + dlng
                        )
                        trk.speed = round(max(0.0, trk.speed + random.uniform(-3, 3)), 1)
                        trk.heading = (trk.heading + random.uniform(-10, 10)) % 360

                        db.commit()

                        # Broadcast typed 'truck_update'
                        payload = {
                            "id": trk.id,
                            "plate": trk.plate,
                            "latitude": trk.lat,
                            "longitude": trk.lng,
                            "speedKmh": trk.speed,
                            "heading": trk.heading,
                            "status": trk.status,
                            "fuelPct": int(trk.fuel_level or 75),
                            "reeferTempC": trk.reefer_temp
                        }
                        await ws_manager.broadcast({"type": "truck_update", "data": payload})

            # Broadcast typed 'stats' every 3 cycles
            if step % 3 == 0:
                stats_payload = {
                    "total_active_trucks": 24,
                    "gnss_locked_count": 24,
                    "avg_5g_latency_ms": round(random.uniform(3.8, 4.6), 1),
                    "fleet_avg_speed_kmh": 46.8,
                    "queue_depth": random.randint(18, 26),
                    "active_missions": 22,
                    "system_uptime_pct": 99.98
                }
                await ws_manager.broadcast({"type": "stats", "data": stats_payload})

        except Exception as e:
            import logging
            logging.getLogger("logisync.telemetry").warning("telemetry broadcast failed: %s", e)
        finally:
            db.close()


@app.websocket("/ws/telemetry")
async def telemetry_websocket(websocket: WebSocket):
    """
    Live bidirectional WebSocket connection for driver telematics
    and command center dispatch broadcasts.
    """
    await ws_manager.connect(websocket)
    from app.db import SessionLocal
    from app.models.truck import TruckModel
    from app.services.rerouter import rerouter_service

    def _to_float(value, default=0.0):
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    try:
        while True:
            try:
                data = await websocket.receive_json()
            except Exception:
                await websocket.send_json({"type": "error", "message": "Invalid JSON payload"})
                continue
            if not isinstance(data, dict):
                await websocket.send_json({"type": "error", "message": "Payload must be a JSON object"})
                continue
            # If client sends live telemetry ping, persist and evaluate rerouting
            truck_id = data.get("truckId") or data.get("truck_id") or data.get("id")
            if truck_id and ("lat" in data or "latitude" in data):
                lat = _to_float(data.get("lat", data.get("latitude")))
                lng = _to_float(data.get("lng", data.get("longitude")))
                speed = _to_float(data.get("speed", data.get("speedKmh")), 0.0)
                heading = _to_float(data.get("heading"), 0.0)
                fuel = data.get("fuel_level", data.get("fuelPct"))
                reefer = data.get("reefer_temp", data.get("reeferTempC"))
                if not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
                    await websocket.send_json({"type": "error", "message": "Invalid coordinates"})
                    continue
                speed = min(max(speed, 0.0), 200.0)
                heading = heading % 360.0

                db = SessionLocal()
                try:
                    truck = db.query(TruckModel).filter(TruckModel.id == truck_id).first()
                    if not truck:
                        await websocket.send_json({"type": "error", "message": f"Unknown truck {truck_id}"})
                        continue
                    truck.lat = lat
                    truck.lng = lng
                    truck.speed = speed
                    truck.heading = heading
                    if fuel is not None:
                        truck.fuel_level = _to_float(fuel, truck.fuel_level or 75.0)
                    if reefer is not None:
                        try:
                            truck.reefer_temp = float(reefer)
                        except (TypeError, ValueError):
                            pass
                    db.commit()

                    # Run rerouter on WS path too (port-scoped hotspots)
                    reroute_eval = rerouter_service.evaluate_truck_position(
                        truck_id=truck_id,
                        current_lat=lat,
                        current_lng=lng,
                        port_id=truck.port_id or "voc",
                    )
                    update_msg = {
                        "type": "truck_update",
                        "data": {
                            "id": truck.id,
                            "plate": truck.plate,
                            "latitude": truck.lat,
                            "longitude": truck.lng,
                            "speedKmh": truck.speed,
                            "heading": truck.heading,
                            "status": truck.status,
                            "fuelPct": int(truck.fuel_level or 75),
                            "reeferTempC": truck.reefer_temp,
                            "reroute": reroute_eval
                        }
                    }
                    await ws_manager.broadcast(update_msg)
                finally:
                    db.close()
            else:
                # Unknown shapes are rejected (never rebroadcast: prevents spoofing)
                await websocket.send_json({"type": "error", "message": "Unrecognized telemetry shape; expected truckId + lat/lng"})
    except WebSocketDisconnect:
        pass
    except Exception:
        try:
            await websocket.close(code=1011)
        except Exception:
            pass
    finally:
        ws_manager.disconnect(websocket)

