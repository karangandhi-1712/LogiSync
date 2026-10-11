from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.port import PortModel
from app.models.user import UserModel
from app.services.password import hash_password, validate_password_constraints
from app.dependencies import require_role
from app.ports import is_valid_port

router = APIRouter(prefix="/admin", tags=["Admin: users & fleet managers"])


class CreateFMReq(BaseModel):
    full_name: str
    email: EmailStr
    mobile: str
    temp_password: str
    assigned_port_id: str


@router.post("/fleet-managers", status_code=201, dependencies=[Depends(require_role(["port_admin"]))])
def create_fleet_manager(req: CreateFMReq, db: Session = Depends(get_db)):
    if not is_valid_port(req.assigned_port_id):
        raise HTTPException(status_code=400, detail=f"Unknown port {req.assigned_port_id}")
    # assigned_port_id is now a real FK, so the depot row must exist.
    if not db.query(PortModel).filter(PortModel.id == req.assigned_port_id).first():
        raise HTTPException(
            status_code=400,
            detail=f"Depot {req.assigned_port_id} is not in the ports table. Run the seeder first.",
        )
    errs = validate_password_constraints(req.temp_password)
    if errs:
        raise HTTPException(status_code=422, detail={"password_errors": errs})
    if db.query(UserModel).filter((UserModel.email == req.email) | (UserModel.mobile_number == req.mobile)).first():
        raise HTTPException(status_code=409, detail="Email or mobile already registered.")
    fm = UserModel(role="fleet_manager", full_name=req.full_name, email=str(req.email),
                   email_verified=True, mobile_number=req.mobile, mobile_verified=True,
                   password_hash=hash_password(req.temp_password),
                   assigned_port_id=req.assigned_port_id, must_change_password=True)
    db.add(fm)
    db.commit()
    db.refresh(fm)
    return {"id": fm.id, "email": fm.email, "assigned_port_id": fm.assigned_port_id, "temp_password": req.temp_password}


@router.get("/users", dependencies=[Depends(require_role(["port_admin"]))])
def list_users(role: Optional[str] = None, port: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(UserModel)
    if role:
        q = q.filter(UserModel.role == role)
    if port:
        q = q.filter(UserModel.assigned_port_id == port)
    return [{"id": u.id, "role": u.role, "full_name": u.full_name, "email": u.email,
             "mobile_number": u.mobile_number, "assigned_port_id": u.assigned_port_id,
             "availability_status": getattr(u, "availability_status", None),
             "going_offline_at": (u.going_offline_at.isoformat()
                                  if getattr(u, "going_offline_at", None) else None),
             "is_active": u.is_active} for u in q.limit(500).all()]


@router.patch("/users/{user_id}/deactivate", dependencies=[Depends(require_role(["port_admin"]))])
def deactivate(user_id: str, db: Session = Depends(get_db)):
    u = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")
    u.is_active = False
    db.commit()
    return {"deactivated": True}


@router.patch("/users/{user_id}/activate", dependencies=[Depends(require_role(["port_admin"]))])
def activate(user_id: str, db: Session = Depends(get_db)):
    u = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")
    u.is_active = True
    db.commit()
    return {"activated": True}


@router.delete("/users/{user_id}", dependencies=[Depends(require_role(["port_admin"]))])
def delete_user(user_id: str, db: Session = Depends(get_db)):
    u = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")
    if u.role == "port_admin":
        raise HTTPException(status_code=403, detail="Cannot delete a port admin account.")
    db.delete(u)
    db.commit()
    return {"deleted": True}

