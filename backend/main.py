# Load environment variables FIRST before any other imports
# This ensures env vars are available when modules like llm_service are imported
import os
import logging
from pathlib import Path
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Configure logging (Feature 025 - Security Hardening)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from database import engine, Base
# Note: folders, preferences routers removed - CRUD via Supabase Client (feature 007)
from routers import documents, chat, activity, ai_usage, templates, image_generation, visual_assets, workflows, executions, validation, models, project_workflows, conversations, projects, auth, admin, prompts, workspaces, system, memories
import io

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="XTYL Creativity Machine API")

# Validate required environment variables on startup
@app.on_event("startup")
async def validate_environment():
    """Validate required environment variables are set."""
    required_vars = ["DATABASE_URL", "SUPABASE_JWT_SECRET"]

    missing = []
    for var in required_vars:
        if not os.getenv(var):
            missing.append(var)

    if missing:
        print(f"WARNING: Missing required environment variables: {', '.join(missing)}")
        print("Authentication and database features may not work correctly.")

# CORS Configuration (Feature 025 - Security Hardening)
# Use explicit origin whitelist instead of wildcard for security
# Configure ALLOWED_ORIGINS env var with comma-separated domains
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

# Add development origins if in dev mode
if os.getenv("ENVIRONMENT", "development") == "development":
    dev_origins = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000"]
    ALLOWED_ORIGINS = list(set(ALLOWED_ORIGINS + dev_origins))

# Clean up empty strings and whitespace
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()]

logger.info(f"CORS allowed origins: {ALLOWED_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    expose_headers=["Content-Type", "Content-Length"],
)

# Feature 025: Security Headers Middleware
from middleware.security import SecurityHeadersMiddleware, limiter, RateLimitExceeded, _rate_limit_exceeded_handler
app.add_middleware(SecurityHeadersMiddleware)

# Feature 025: Rate limiting support
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Global exception handler (Feature 025 - Security Hardening)
# Returns generic error message to client, logs details internally
from fastapi.responses import JSONResponse
from fastapi import Request

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler that:
    1. Logs the actual error for debugging
    2. Returns generic message to client (no stack traces exposed)
    """
    # Log the actual error with details for debugging
    logger.exception(f"Unhandled exception for {request.method} {request.url}")

    # Return generic message to client - don't expose internal details
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

# Core routers (AI, documents, workflows)
app.include_router(documents.router)  # Keeps upload/export, CRUD via Supabase
app.include_router(chat.router)
app.include_router(image_generation.router)
app.include_router(workflows.router)
app.include_router(executions.router)
app.include_router(project_workflows.router)

# Supporting routers
app.include_router(activity.router)
app.include_router(ai_usage.router)
app.include_router(templates.router)  # Only init endpoint, CRUD via Supabase
app.include_router(visual_assets.router)
app.include_router(validation.router)
app.include_router(models.router)
app.include_router(conversations.router)  # Only messages/add-document, CRUD via Supabase
app.include_router(projects.router)  # Project settings endpoints
app.include_router(auth.router)  # User profile endpoints
app.include_router(admin.router)  # Admin panel endpoints (Feature 015)
app.include_router(prompts.router)  # Prompt enrichment endpoints (Feature 016)
app.include_router(workspaces.router)  # Workspace invitations endpoints
app.include_router(system.router)  # Public system endpoints (messages, status)
app.include_router(memories.router)  # User memory system (Feature 024)

@app.get("/")
async def root():
    return {"message": "Welcome to XTYL Creativity Machine API"}

@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring and load balancers.
    Verifies connectivity to critical services.
    """
    health_status = {
        "status": "healthy",
        "services": {}
    }

    # Check Database
    try:
        from database import SessionLocal
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        health_status["services"]["database"] = "healthy"
    except Exception as e:
        health_status["services"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"

    # Check Redis
    try:
        import redis
        import os
        redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
        r = redis.from_url(redis_url)
        r.ping()
        health_status["services"]["redis"] = "healthy"
    except Exception as e:
        health_status["services"]["redis"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"

    # Check R2 Storage
    try:
        from storage_service import check_connection
        if check_connection():
            health_status["services"]["storage"] = "healthy"
        else:
            health_status["services"]["storage"] = "unhealthy: connection failed"
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["services"]["storage"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"

    # Check Supabase Auth configuration
    supabase_jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
    if supabase_jwt_secret:
        health_status["services"]["auth"] = "configured"
    else:
        health_status["services"]["auth"] = "not configured: SUPABASE_JWT_SECRET missing"
        health_status["status"] = "degraded"

    return health_status


@app.get("/storage/{file_path:path}")
async def serve_file(file_path: str):
    """
    Serve files from R2 storage through the backend.
    This endpoint is kept for backwards compatibility but in production
    files should be served directly from R2 public URLs.

    Example: /storage/projects/xxx/images/file.png
    """
    try:
        from storage_service import download_file
        from services.security_service import validate_file_path

        # Feature 025: Validate file path to prevent path traversal attacks
        validated_path = validate_file_path(file_path)

        # Get the file from R2
        file_data = download_file(validated_path)

        if file_data is None:
            raise HTTPException(status_code=404, detail="File not found")

        # Determine content type from file extension
        content_type = "application/octet-stream"
        if file_path.endswith('.png'):
            content_type = "image/png"
        elif file_path.endswith('.jpg') or file_path.endswith('.jpeg'):
            content_type = "image/jpeg"
        elif file_path.endswith('.gif'):
            content_type = "image/gif"
        elif file_path.endswith('.webp'):
            content_type = "image/webp"
        elif file_path.endswith('.pdf'):
            content_type = "application/pdf"

        # Return the file as a streaming response
        return StreamingResponse(
            io.BytesIO(file_data),
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=31536000",  # Cache for 1 year
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error serving file {file_path}: {str(e)}")
        raise HTTPException(status_code=404, detail=f"File not found: {str(e)}")
