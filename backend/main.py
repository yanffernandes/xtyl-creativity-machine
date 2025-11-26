from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from database import engine, Base
from routers import auth, workspaces, documents, chat, folders, activity, ai_usage, templates, image_generation, visual_assets, workflows, executions, validation, models, project_workflows
import io

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
app.include_router(workflows.router)
app.include_router(executions.router)
app.include_router(validation.router)
app.include_router(models.router)
app.include_router(project_workflows.router)

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


@app.get("/storage/{file_path:path}")
async def serve_file(file_path: str):
    """
    Serve files from MinIO storage through the backend.
    This allows files to be accessed even if MinIO port is not exposed publicly.

    Example: /storage/xtyl-storage/projects/xxx/images/file.png
    """
    try:
        from minio_service import minio_client, MINIO_BUCKET

        # Parse the path - format is: bucket/path/to/file
        parts = file_path.split('/', 1)
        if len(parts) != 2:
            raise HTTPException(status_code=400, detail="Invalid file path format")

        bucket_name = parts[0]
        object_name = parts[1]

        # Get the file from MinIO
        response = minio_client.get_object(bucket_name=bucket_name, object_name=object_name)

        # Read the data
        file_data = response.read()
        response.close()
        response.release_conn()

        # Determine content type from file extension
        content_type = "application/octet-stream"
        if object_name.endswith('.png'):
            content_type = "image/png"
        elif object_name.endswith('.jpg') or object_name.endswith('.jpeg'):
            content_type = "image/jpeg"
        elif object_name.endswith('.gif'):
            content_type = "image/gif"
        elif object_name.endswith('.webp'):
            content_type = "image/webp"
        elif object_name.endswith('.pdf'):
            content_type = "application/pdf"

        # Return the file as a streaming response
        return StreamingResponse(
            io.BytesIO(file_data),
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=31536000",  # Cache for 1 year
            }
        )

    except Exception as e:
        print(f"Error serving file {file_path}: {str(e)}")
        raise HTTPException(status_code=404, detail=f"File not found: {str(e)}")
