from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth, workspaces, documents, chat, folders, activity, ai_usage, templates, image_generation, visual_assets

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="XTYL Creativity Machine API")

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
)

app.include_router(auth.router)
app.include_router(workspaces.router)
app.include_router(documents.router)
app.include_router(folders.router)
app.include_router(activity.router)
app.include_router(chat.router)
app.include_router(ai_usage.router)
app.include_router(templates.router)
app.include_router(image_generation.router)
app.include_router(visual_assets.router)

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

    # Check MinIO
    try:
        from minio_service import minio_client
        # Simple check: list buckets
        if minio_client:
            list(minio_client.list_buckets())
            health_status["services"]["minio"] = "healthy"
        else:
            health_status["services"]["minio"] = "unhealthy: client not initialized"
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["services"]["minio"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"

    return health_status
