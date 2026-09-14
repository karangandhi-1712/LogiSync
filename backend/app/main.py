import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.db import Base, engine
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
    analytics_router
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables and seed initial data
    Base.metadata.create_all(bind=engine)
    seed_database()
    yield
    # Shutdown


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
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass


ws_manager = ConnectionManager()


@app.websocket("/ws/telemetry")
async def telemetry_websocket(websocket: WebSocket):
    """
    Live bidirectional WebSocket connection for driver telematics
    and command center dispatch broadcasts.
    """
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # Broadcast incoming updates to all connected command center terminals
            await ws_manager.broadcast({"type": "telemetry_ping", "payload": data})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
