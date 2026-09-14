from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request
from starlette.responses import JSONResponse

# Global rate limiter keying by remote IP
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])


def rate_limit_exceeded_handler(request: Request, exc: Exception) -> JSONResponse:
    """Custom 429 handler with security audit context."""
    return JSONResponse(
        status_code=429,
        content={
            "error": "Too Many Requests",
            "message": "Rate limit exceeded. Please throttle requests and retry.",
            "retry_after_seconds": 60,
        },
        headers={"Retry-After": "60"}
    )
