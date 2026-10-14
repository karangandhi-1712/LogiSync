import re
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.constants import AVAIL_OFFLINE, AVAILABILITY_STATES, ROLE_CONSUMER
from app.db import get_db
from app.models.consumer import ConsumerModel
from app.models.user import UserModel
from app.services import otp_service
from app.services.password import hash_password, verify_password, validate_password_constraints
from app.services.jwt_service import create_access_token
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth: driver signup + local JWT"])

VEHICLE_RE = re.compile(r"^[A-Z]{2}[0-9]{2}[A-Z]{1,3}[0-9]{4}$")


class CheckMobileResp(BaseModel):
    available: bool


class SendOtpReq(BaseModel):
    target_type: str  # mobile | email
    target_value: str
    purpose: Optional[str] = "signup"


class VerifyOtpReq(BaseModel):
    target_type: str
    target_value: str
    code: str


class RegisterReq(BaseModel):
    full_name: str
    vehicle_number: str
    vehicle_type: Optional[str] = None
    photo_url: Optional[str] = None
    mobile: str
    email: EmailStr
    password: str
    role: Optional[str] = "driver"


class ConsumerRegisterReq(BaseModel):
    """Customer signup. Deliberately a separate schema from RegisterReq so the
    driver-only lock on that endpoint (and its vehicle validation) stays intact."""

    full_name: str = Field(min_length=2, max_length=128)
    mobile: str
    email: EmailStr
    password: str
    photo_url: Optional[str] = None


class LoginReq(BaseModel):
    identifier: str  # email or mobile
    password: str


class ChangePasswordReq(BaseModel):
    current_password: str
    new_password: str


@router.get("/check-mobile")
def check_mobile(mobile: str, db: Session = Depends(get_db)):
    exists = db.query(UserModel).filter(UserModel.mobile_number == mobile).first()
    if exists:
        raise HTTPException(status_code=409, detail="This mobile number is already registered. Each number can only be linked to one account.")
    return {"available": True}


@router.post("/send-otp")
def send_otp(req: SendOtpReq, db: Session = Depends(get_db)):
    if req.target_type == "mobile":
        conflict = db.query(UserModel).filter(UserModel.mobile_number == req.target_value).first()
        if conflict:
            raise HTTPException(status_code=409, detail="This mobile number is already registered. Each number can only be linked to one account.")
    res = otp_service.send_otp(db, req.target_type, req.target_value, req.purpose or "signup")
    if "error" in res:
        raise HTTPException(status_code=res.get("status", 400), detail=res["error"])
    return res


@router.post("/verify-otp")
def verify_otp(req: VerifyOtpReq, db: Session = Depends(get_db)):
    res = otp_service.verify_otp(db, req.target_type, req.target_value, req.code)
    if not res.get("ok"):
        raise HTTPException(status_code=400, detail=res["error"])
    return {"verified": True}


VEHICLE_TYPES = {"trailer", "container_truck", "reefer_truck", "flatbed", "tanker"}
# Legacy categories from before the gate-service taxonomy switch — accepted so
# existing driver accounts keep working, but never offered at signup.
LEGACY_VEHICLE_TYPES = {"container_reefer", "bulk", "cargo", "express_mail"}


def _normalize_mobile(mobile: str) -> str:
    m = (mobile or "").strip().replace(" ", "").replace("-", "")
    if m.startswith("+91"):
        return m
    if m.startswith("91") and len(m) == 12:
        return f"+{m}"
    digits = "".join(c for c in m if c.isdigit())
    if len(digits) == 10:
        return f"+91{digits}"
    return m if m.startswith("+") else f"+91{digits}"


@router.post("/register", status_code=201)
def register(req: RegisterReq, db: Session = Depends(get_db)):
    # Server-side role lock: only driver may self-register
    if (req.role or "driver") != "driver":
        raise HTTPException(status_code=403, detail="Self-registration is driver-only.")
    if not VEHICLE_RE.match((req.vehicle_number or "").replace(" ", "").upper()):
        raise HTTPException(status_code=422, detail="Invalid vehicle number format.")
    if req.vehicle_type and req.vehicle_type not in VEHICLE_TYPES and req.vehicle_type not in LEGACY_VEHICLE_TYPES:
        raise HTTPException(status_code=422, detail=f"Invalid vehicle_type. Choose {sorted(VEHICLE_TYPES)}")
    mobile = _normalize_mobile(req.mobile)
    if db.query(UserModel).filter(or_(UserModel.email == req.email, UserModel.mobile_number == mobile)).first():
        raise HTTPException(status_code=409, detail="Email or mobile already registered.")
    # OTP verification removed per product decision — direct creation.
    errs = validate_password_constraints(req.password)
    if errs:
        raise HTTPException(status_code=422, detail={"password_errors": errs})
    user = UserModel(
        role="driver", full_name=req.full_name, email=str(req.email),
        email_verified=False, mobile_number=mobile, mobile_verified=False,
        password_hash=hash_password(req.password),
        photo_url=req.photo_url, vehicle_number=req.vehicle_number.replace(" ", "").upper(),
        vehicle_type=req.vehicle_type,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id, user.role, user.assigned_port_id)
    return {"access_token": token, "token_type": "Bearer", "role": user.role, "user_id": user.id}


@router.post("/register/consumer", status_code=201)
def register_consumer(req: ConsumerRegisterReq, db: Session = Depends(get_db)):
    """Customer self-signup.

    Creates the `users` row and, in the same transaction, claims any pre-existing
    guest `consumers` row for this mobile so the customer's earlier guest orders
    become visible in their account.
    """
    mobile = _normalize_mobile(req.mobile)
    if not re.match(r"^\+?[0-9]{10,15}$", mobile):
        raise HTTPException(status_code=422, detail="Enter a valid 10-digit mobile number.")

    # A mobile can only belong to one account. If it already has one, adopt it
    # as the consumer's account instead of failing the signup outright.
    existing_user = db.query(UserModel).filter(UserModel.mobile_number == mobile).first()
    if existing_user:
        if existing_user.role == ROLE_CONSUMER:
            _claim_guest_consumer(db, existing_user, req.full_name)
            db.commit()
            token = create_access_token(existing_user.id, existing_user.role,
                                        existing_user.assigned_port_id)
            return {"access_token": token, "token_type": "Bearer",
                    "role": existing_user.role, "user_id": existing_user.id,
                    "returning_customer": True}
        raise HTTPException(
            status_code=409,
            detail="This mobile number is already registered to an operational account.",
        )

    if db.query(UserModel).filter(UserModel.email == str(req.email)).first():
        raise HTTPException(status_code=409, detail="Email already registered.")

    errs = validate_password_constraints(req.password)
    if errs:
        raise HTTPException(status_code=422, detail={"password_errors": errs})

    user = UserModel(
        role=ROLE_CONSUMER,
        full_name=req.full_name.strip(),
        email=str(req.email),
        email_verified=True,
        mobile_number=mobile,
        mobile_verified=True,
        password_hash=hash_password(req.password),
        photo_url=req.photo_url,
        availability_status=AVAIL_OFFLINE,
        consumer_at=datetime.utcnow(),
    )
    db.add(user)
    db.flush()  # assign user.id before linking the consumer row

    _claim_guest_consumer(db, user, user.full_name)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.role, user.assigned_port_id)
    return {"access_token": token, "token_type": "Bearer", "role": user.role,
            "user_id": user.id, "returning_customer": False}


def _claim_guest_consumer(db: Session, user: UserModel, display_name: str) -> None:
    """Point this account at its `consumers` row, creating one if needed.

    This is what turns anonymous guest orders into account history: any
    `consumers` row with a matching mobile is linked to `user.id`, so every
    `delivery_requests` row pointing at it surfaces in the account's orders.
    """
    mobile = user.mobile_number
    consumer = db.query(ConsumerModel).filter(ConsumerModel.mobile_number == mobile).first()
    if consumer:
        consumer.user_id = user.id
        # Keep the freshest name the customer typed at signup.
        if display_name:
            consumer.name = display_name.strip()
        return
    db.add(ConsumerModel(name=(display_name or user.full_name).strip(),
                         mobile_number=mobile, user_id=user.id))


@router.post("/login")
def login(req: LoginReq, db: Session = Depends(get_db)):
    # Email addresses are case-insensitive, and users often paste identifiers
    # with surrounding whitespace. Keep phone matching exact after trimming.
    identifier = req.identifier.strip()
    user = db.query(UserModel).filter(or_(
        func.lower(UserModel.email) == identifier.lower(),
        UserModel.mobile_number == identifier,
    )).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated.")
    token = create_access_token(user.id, user.role, user.assigned_port_id)
    return {"access_token": token, "token_type": "Bearer", "role": user.role,
            "assigned_port_id": user.assigned_port_id,
            "availability_status": getattr(user, "availability_status", "available"),
            "must_change_password": user.must_change_password, "user_id": user.id}


@router.get("/me")
def me(user: Dict[str, Any] = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(UserModel).filter(UserModel.id == user["sub"]).first()
    return {"id": row.id, "role": row.role, "full_name": row.full_name, "email": row.email,
            "mobile_number": row.mobile_number, "photo_url": row.photo_url,
            "vehicle_number": row.vehicle_number, "vehicle_type": getattr(row, "vehicle_type", None),
            "assigned_port_id": row.assigned_port_id,
            "availability_status": getattr(row, "availability_status", "available"),
            "is_active": row.is_active,
            "must_change_password": row.must_change_password}


class AvailabilityReq(BaseModel):
    availability_status: str
    going_offline_at: Optional[str] = None  # ISO-8601 datetime


@router.patch("/availability")
def set_availability(
    req: AvailabilityReq,
    user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Driver broadcast state: available | busy | offline.

    `going_offline_at` is the optional shift cutoff used when deciding whether a
    claimed batch may still auto-attach stops.
    """
    status = (req.availability_status or "").strip().lower()
    if status not in AVAILABILITY_STATES:
        raise HTTPException(
            status_code=422, detail=f"Invalid status. Valid: {sorted(AVAILABILITY_STATES)}"
        )
    row = db.query(UserModel).filter(UserModel.id == user["sub"]).first()
    if not row:
        raise HTTPException(status_code=404, detail="Account not found.")
    row.availability_status = status
    row.going_offline_at = None
    if req.going_offline_at:
        try:
            parsed = datetime.fromisoformat(req.going_offline_at.replace("Z", "+00:00"))
            row.going_offline_at = parsed.replace(tzinfo=None) if parsed.tzinfo else parsed
        except ValueError:
            raise HTTPException(status_code=422, detail="going_offline_at must be ISO-8601.")
    db.commit()
    return {
        "availability_status": row.availability_status,
        "going_offline_at": row.going_offline_at.isoformat() if row.going_offline_at else None,
    }


@router.post("/change-password")
def change_password(req: ChangePasswordReq, user: Dict[str, Any] = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(UserModel).filter(UserModel.id == user["sub"]).first()
    if not verify_password(req.current_password, row.password_hash):
        raise HTTPException(status_code=401, detail="Current password incorrect.")
    errs = validate_password_constraints(req.new_password)
    if errs:
        raise HTTPException(status_code=422, detail={"password_errors": errs})
    row.password_hash = hash_password(req.new_password)
    row.must_change_password = False
    db.commit()
    return {"changed": True}
