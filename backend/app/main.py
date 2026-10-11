import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import get_settings
from app.db import Base, engine
from app.middleware import (
    LoggingMiddleware,
    SecurityHeadersMiddleware,
    limiter,
    rate_limit_exceeded_handler,
)
from app.routers import (
    admin,
    analytics,
    auth,
    consumer,
    deliveries,
    maps,
    ports,
    schedules,
)
from app.routers import settings as settings_router
from app.seed import seed_database
from app.services.events import Connection, hub, set_loop

settings = get_settings()
logger = logging.getLogger("logisync.main")

SWEEP_INTERVAL_SECONDS = 15


async def _run_migrations() -> None:
    """Apply Alembic revisions when configured, else fall back to create_all.

    AUTO_MIGRATE keeps the dev SQLite loop one command long; production runs
    `alembic upgrade head` as a deploy step and leaves this off.
    """
    if os.getenv("AUTO_MIGRATE", "true").lower() in ("1", "true", "yes"):
        try:
            from alembic import command
            from alembic.config import Config

            ini_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "alembic.ini")
            if os.path.exists(ini_path):
                cfg = Config(ini_path)
                cfg.set_main_option("script_location", os.path.join(os.path.dirname(ini_path), "alembic"))
                command.upgrade(cfg, "head")
                logger.info("alembic upgrade head applied")
                return
        except Exception as exc:
            logger.warning("alembic upgrade failed (%s); falling back to create_all", exc)
    Base.metadata.create_all(bind=engine)


async def _schedule_sweep() -> None:
    """Housekeeping tick: lock claimed batches whose departure window has closed."""
    from app.services.schedule_engine import sweep_schedules
    from app.db import SessionLocal

    while True:
        try:
            await asyncio.sleep(SWEEP_INTERVAL_SECONDS)
            db = SessionLocal()
            try:
                changed = sweep_schedules(db)
                for schedule_id in changed:
                    from app.services.events import emit
                    await emit("schedule:locked", {"schedule_id": schedule_id})
            finally:
                db.close()
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.warning("schedule sweep failed: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    import app.models  # noqa: F401  — registers every table on Base.metadata
    set_loop(asyncio.get_running_loop())

    await _run_migrations()
    seed_database()

    sweep_task = asyncio.create_task(_schedule_sweep())
    yield
    sweep_task.cancel()
    try:
        await sweep_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="LogiSync — Port Delivery Marketplace API",
    version="3.0.0",
    description="Broadcast, claim & batch delivery marketplace for port depots.",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)


# ── Middleware ───────────────────────────────────────────────────────────────
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(LoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_private_network=True,
)


# ── Routers ──────────────────────────────────────────────────────────────────
for r in (
    auth.router,
    admin.router,
    ports.router,
    consumer.router,
    consumer.account_router,
    consumer.track_router,
    schedules.router,
    schedules.drivers_router,
    deliveries.router,
    analytics.router,
    settings_router.router,
    maps.router,
):
    app.include_router(r, prefix=settings.API_PREFIX)


# ── System ───────────────────────────────────────────────────────────────────

@app.get("/healthz", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "service": "LogiSync Delivery Marketplace API",
        "version": app.version,
        "region": settings.AWS_REGION,
    }


@app.get("/", tags=["System"])
def root():
    return {"message": "LogiSync — Port Delivery Marketplace API", "docs": "/docs", "health": "/healthz"}


# ── Real-time: marketplace events ────────────────────────────────────────────

@app.websocket("/ws/events")
async def events_websocket(websocket: WebSocket):
    """Authenticated marketplace event socket.

    The JWT is read from ?token= at handshake time and the socket is registered
    with that identity, which is what lets `schedule:broadcast` reach only
    available drivers and `schedule:stop_added` reach only the claiming driver
    and the owning fleet manager. Unauthenticated sockets are rejected.
    """
    from app.services.jwt_service import decode_token

    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008, reason="Missing token")
        return
    try:
        claims = decode_token(token)
    except Exception:
        await websocket.close(code=1008, reason="Invalid token")
        return

    await websocket.accept()
    conn = Connection(
        websocket,
        user_id=str(claims.get("sub")),
        role=str(claims.get("role")),
        assigned_port_id=claims.get("assigned_port_id"),
    )
    hub.add(conn)
    await websocket.send_json({
        "type": "connection:ready",
        "data": {"user_id": conn.user_id, "role": conn.role},
    })

    try:
        while True:
            try:
                message = await websocket.receive_json()
            except WebSocketDisconnect:
                break
            except Exception:
                # Invalid JSON (or a receive failure) is not recoverable by
                # retrying immediately. Continuing here can spin forever on a
                # closed socket after refresh/login changes and starve HTTP
                # requests on the same event loop.
                try:
                    await websocket.close(code=1003, reason="Invalid JSON message")
                except Exception:
                    pass
                break
            await _handle_client_event(websocket, message)
    except WebSocketDisconnect:
        pass
    except Exception:
        try:
            await websocket.close(code=1011)
        except Exception:
            pass
    finally:
        hub.remove(websocket)


async def _handle_client_event(websocket: WebSocket, message: Any) -> None:
    """Inbound socket messages. Only the driver's own position is accepted."""
    if not isinstance(message, dict):
        await websocket.send_json({"type": "error", "message": "Payload must be a JSON object"})
        return

    conn = hub._connections.get(websocket)
    if conn is None:
        return

    kind = message.get("type")
    data = message.get("data") or {}

    if kind == "driver:position":
        schedule_id = data.get("schedule_id")
        lat, lng = data.get("latitude"), data.get("longitude")
        if not schedule_id or lat is None or lng is None:
            await websocket.send_json({"type": "error", "message": "schedule_id + lat/lng required"})
            return
        try:
            lat, lng = float(lat), float(lng)
        except (TypeError, ValueError):
            await websocket.send_json({"type": "error", "message": "Invalid coordinates"})
            return
        if not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
            await websocket.send_json({"type": "error", "message": "Coordinates out of range"})
            return

        from datetime import datetime
        from sqlalchemy import update
        from app.db import SessionLocal
        from app.models.delivery_schedule import DeliveryScheduleModel
        from app.services.events import emit_driver_position

        db = SessionLocal()
        try:
            # Scoped UPDATE: a driver may only move the batch they hold.
            changed = db.execute(
                update(DeliveryScheduleModel)
                .where(
                    DeliveryScheduleModel.id == schedule_id,
                    DeliveryScheduleModel.claimed_by_driver_id == conn.user_id,
                )
                .values(
                    driver_lat=lat, driver_lng=lng,
                    driver_heading=data.get("heading"),
                    driver_updated_at=datetime.utcnow(),
                )
                .execution_options(synchronize_session=False)
            ).rowcount
            db.commit()
            if changed:
                fm_id = db.query(DeliveryScheduleModel.fleet_manager_id).filter(
                    DeliveryScheduleModel.id == schedule_id
                ).scalar()
                # Customers with a stop on this batch watch their own delivery's
                # map live, so they ride the same position event as the depot.
                from app.routers.consumer import consumer_user_ids_for_schedule
                await emit_driver_position(schedule_id, lat, lng, data.get("heading"), fm_id,
                                           consumer_user_ids_for_schedule(db, schedule_id))
                await websocket.send_json({"type": "driver:position:ack", "data": {"schedule_id": schedule_id}})
        finally:
            db.close()
    elif kind == "ping":
        await websocket.send_json({"type": "pong", "data": {}})
    else:
        await websocket.send_json({
            "type": "error",
            "message": f"Unrecognized event type '{kind}'",
        })
