# Load environment variables FIRST before any other imports
# This ensures env vars are available when modules like llm_service are imported
import os
from pathlib import Path
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from database import engine, Base
# Note: workspaces, folders, preferences routers removed - CRUD via Supabase Client (feature 007)
from routers import documents, chat, activity, ai_usage, templates, image_generation, visual_assets, workflows, executions, validation, models, project_workflows, conversations, projects, auth
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

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Global exception handler to ensure CORS headers on errors
from fastapi.responses import JSONResponse
from fastapi import Request

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Ensure all exceptions return proper CORS headers"""
    import traceback
    traceback.print_exc()  # Log the error
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true",
        }
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

        # Get the file from R2
        file_data = download_file(file_path)

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
