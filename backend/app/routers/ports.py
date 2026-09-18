from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.ports import port_list, get_port, is_valid_port
from fastapi import HTTPException

router = APIRouter(prefix="/ports", tags=["Ports"], dependencies=[Depends(get_current_user)])


@router.get("")
def list_ports():
    """Ordered list of all served ports for the dashboard port selector."""
    return port_list()


@router.get("/{port_id}")
def get_port_detail(port_id: str):
    """Full registry entry (center, zoom, gates, corridor) for one port."""
    if not is_valid_port(port_id):
        raise HTTPException(status_code=400, detail=f"Unknown port '{port_id}'")
    p = get_port(port_id)
    return {
        "id": p["id"],
        "name": p["name"],
        "short": p["short"],
        "city": p["city"],
        "state": p["state"],
        "lat": p["center"]["lat"],
        "lng": p["center"]["lng"],
        "zoom": p["zoom"],
        "corridor": p["corridor"],
        "gates": p["gates"],
    }
