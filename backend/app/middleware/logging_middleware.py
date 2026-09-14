import time
import uuid
import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = structlog.get_logger("logisync.audit")


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Structured JSON audit logging for all HTTP API requests.
    Enables zero-leakage tracing compatible with AWS CloudWatch Logs.
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        req_id = str(uuid.uuid4())
        start_time = time.perf_counter()

        response: Response = await call_next(request)
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        client_ip = request.client.host if request.client else "unknown"
        user_id = getattr(request.state, "user_id", "anonymous")

        # Mask sensitive paths from logging bodies
        logger.info(
            "http_access",
            request_id=req_id,
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
            client_ip=client_ip,
            user_id=user_id,
        )

        response.headers["X-Request-ID"] = req_id
        return response
