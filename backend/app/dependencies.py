import httpx
from typing import Optional, Dict, Any, List
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.config import get_settings

settings = get_settings()
security = HTTPBearer(auto_error=False)

# Cached JWKS keys from Cognito
_JWKS_CACHE: Optional[Dict[str, Any]] = None


async def get_cognito_jwks() -> Dict[str, Any]:
    global _JWKS_CACHE
    if _JWKS_CACHE is not None:
        return _JWKS_CACHE

    if not settings.COGNITO_USER_POOL_ID or not settings.COGNITO_REGION:
        return {}

    jwks_url = f"https://cognito-idp.{settings.COGNITO_REGION}.amazonaws.com/{settings.COGNITO_USER_POOL_ID}/.well-known/jwks.json"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(jwks_url)
            if resp.status_code == 200:
                _JWKS_CACHE = resp.json()
                return _JWKS_CACHE
    except Exception:
        pass
    return {}


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Dict[str, Any]:
    """
    Validates the bearer token against Amazon Cognito JWKS.
    In development mode or when Cognito is unconfigured, accepts mock dev tokens.
    """
    # Development fallback
    if not settings.COGNITO_USER_POOL_ID:
        # If token is provided, decode or grant demo user
        token = credentials.credentials if credentials else None
        if token and token.startswith("demo-"):
            user = {
                "sub": "demo-user-123",
                "email": "ops@vocport.gov.in",
                "cognito:groups": ["port_admin", "fleet_manager"],
                "role": "port_admin"
            }
            request.state.user_id = user["sub"]
            return user
        # Default mock admin user for local development
        user = {
            "sub": "local-dev-user",
            "email": "admin@vocport.gov.in",
            "cognito:groups": ["port_admin"],
            "role": "port_admin"
        }
        request.state.user_id = user["sub"]
        return user

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    try:
        # Get kid from header
        unverified_headers = jwt.get_unverified_header(token)
        kid = unverified_headers.get("kid")
        jwks = await get_cognito_jwks()

        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if not key:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token key ID")

        # Verify signature, expiration, and audience
        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=settings.COGNITO_APP_CLIENT_ID or None,
            issuer=f"https://cognito-idp.{settings.COGNITO_REGION}.amazonaws.com/{settings.COGNITO_USER_POOL_ID}"
        )
        request.state.user_id = claims.get("sub", "unknown")
        return claims

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_role(allowed_roles: List[str]):
    """RBAC Guard decorator helper."""
    async def role_checker(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        groups = user.get("cognito:groups", [])
        user_role = user.get("role", "")
        if any(r in groups for r in allowed_roles) or user_role in allowed_roles or "port_admin" in groups:
            return user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role requirement not met. Allowed roles: {allowed_roles}"
        )
    return role_checker
