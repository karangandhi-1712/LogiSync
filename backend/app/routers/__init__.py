from app.routers.auth import router as auth_router
from app.routers.admin import router as admin_router
from app.routers.maps import router as maps_router
from app.routers.analytics import router as analytics_router
from app.routers.settings import router as settings_router
from app.routers.ports import router as ports_router
from app.routers.consumer import router as consumer_router, track_router
from app.routers.schedules import router as schedules_router, drivers_router
from app.routers.deliveries import router as deliveries_router

__all__ = [
    "auth_router",
    "admin_router",
    "maps_router",
    "analytics_router",
    "settings_router",
    "ports_router",
    "consumer_router",
    "track_router",
    "schedules_router",
    "drivers_router",
    "deliveries_router",
]