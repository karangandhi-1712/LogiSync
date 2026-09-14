from app.routers.auth import router as auth_router
from app.routers.maps import router as maps_router
from app.routers.slots import router as slots_router
from app.routers.fleet import router as fleet_router
from app.routers.operations import router as operations_router
from app.routers.gis import router as gis_router
from app.routers.analytics import router as analytics_router

__all__ = [
    "auth_router",
    "maps_router",
    "slots_router",
    "fleet_router",
    "operations_router",
    "gis_router",
    "analytics_router"
]
