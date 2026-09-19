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


@router.post("/refresh")
def refresh_token(req: RefreshRequest):
    """Refreshes expired or near-expiry access tokens."""
    if not cognito_service.client:
        return {
            "access_token": "demo-jwt-access-token-vocport-refreshed",
            "id_token": "demo-jwt-id-token-refreshed",
            "expires_in": 3600,
            "token_type": "Bearer"
        }

    try:
        resp = cognito_service.client.initiate_auth(
            ClientId=cognito_service.client_id,
            AuthFlow="REFRESH_TOKEN_AUTH",
            AuthParameters={"REFRESH_TOKEN": req.refresh_token}
        )
        auth_res = resp["AuthenticationResult"]
        return {
            "access_token": auth_res["AccessToken"],
            "id_token": auth_res["IdToken"],
            "expires_in": auth_res["ExpiresIn"],
            "token_type": auth_res["TokenType"]
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token refresh failed: {str(e)}")


@router.get("/me")
def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Returns claims and roles of the authenticated session."""
    return current_user

