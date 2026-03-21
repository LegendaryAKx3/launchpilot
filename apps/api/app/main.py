import logging
import time

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.middleware.rate_limit import RateLimitMiddleware
from app.routers import approvals, chat, connectors, execution, health, me, positioning, projects, research

configure_logging()
logger = logging.getLogger(__name__)
settings = get_settings()

if settings.auth_mode == "auth0" and (not settings.auth0_issuer or not settings.auth0_audience):
    raise RuntimeError("AUTH_MODE=auth0 requires AUTH0_ISSUER and AUTH0_AUDIENCE.")
if not settings.backboard_api_key:
    raise RuntimeError("BACKBOARD_API_KEY is required for the finalized agent pipeline.")

# Startup configuration summary
logger.info("Starting %s (env=%s, auth=%s)", settings.app_name, settings.app_env, settings.auth_mode)
logger.info("Database: %s", "configured" if settings.supabase_db_url != "postgresql+psycopg://postgres:postgres@localhost:5432/postgres" else "using default localhost")
logger.info("Resend email: %s", "configured" if settings.resend_api_key else "disabled (mock mode)")
logger.info("Web app URL: %s", settings.web_app_url)

app = FastAPI(title=settings.app_name)

# CORS - restrict methods and headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.web_app_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Request-ID"],
)

# Rate limiting
app.add_middleware(RateLimitMiddleware, requests_per_minute=60)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "%s %s %d %.1fms",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and {"code", "message"}.issubset(exc.detail.keys()):
        return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": "HTTP_ERROR", "message": str(exc.detail)}},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred."}},
    )


@app.get("/")
def root():
    return {"data": {"name": settings.app_name, "status": "ok"}, "meta": {}}


app.include_router(health.router, prefix="/v1")
app.include_router(me.router, prefix="/v1")
app.include_router(projects.router, prefix="/v1")
app.include_router(research.router, prefix="/v1")
app.include_router(positioning.router, prefix="/v1")
app.include_router(execution.router, prefix="/v1")
app.include_router(approvals.router, prefix="/v1")
app.include_router(chat.router, prefix="/v1")
app.include_router(connectors.router, prefix="/v1")
