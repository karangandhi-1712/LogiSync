from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from app.services.cognito import cognito_service
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication & Cognito"])


class SignUpRequest(BaseModel):
    email: str
    password: str
    role: Optional[str] = "dispatcher"


class LoginRequest(BaseModel):
    email: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/signup")
def signup(req: SignUpRequest):
    """Registers a new user into AWS Cognito."""
    res = cognito_service.sign_up(req.email, req.password, req.role)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@router.post("/login")
def login(req: LoginRequest):
    """Authenticates credentials against AWS Cognito and issues JWT bearer tokens."""
    res = cognito_service.initiate_auth(req.email, req.password)
    if "error" in res:
        raise HTTPException(status_code=401, detail=res["error"])
    return res


@router.get("/me")
def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Returns claims and roles of the authenticated session."""
    return current_user
