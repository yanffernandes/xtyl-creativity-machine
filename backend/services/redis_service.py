"""
Redis Service Module

Provides async Redis connection with connection pooling for batch progress tracking.
Feature: 030-performance-optimization (FR-026)

Usage:
    from services.redis_service import get_redis, create_batch, update_image_status, get_batch_status
"""

import os
import json
from datetime import datetime
from typing import Optional
import redis.asyncio as redis
from redis.asyncio.connection import ConnectionPool

# Module-level connection pool
_redis_pool: Optional[ConnectionPool] = None
_redis_client: Optional[redis.Redis] = None


def get_redis_url() -> str:
    """Get Redis URL from environment with fallback."""
    return os.getenv("REDIS_URL", "redis://localhost:6379/0")


async def get_redis() -> redis.Redis:
    """
    Get async Redis client with connection pooling.

    Returns:
        redis.Redis: Async Redis client instance
    """
    global _redis_pool, _redis_client

    if _redis_client is None:
        _redis_pool = ConnectionPool.from_url(
            get_redis_url(),
            max_connections=10,
            decode_responses=True
        )
        _redis_client = redis.Redis(connection_pool=_redis_pool)

    return _redis_client


async def close_redis() -> None:
    """Close Redis connection pool. Call on application shutdown."""
    global _redis_pool, _redis_client

    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None

    if _redis_pool:
        await _redis_pool.disconnect()
        _redis_pool = None


async def check_redis_health() -> bool:
    """
    Check Redis connection health.

    Returns:
        bool: True if Redis is healthy, False otherwise
    """
    try:
        client = await get_redis()
        response = await client.ping()
        return response is True
    except Exception:
        return False


# =============================================================================
# Batch Progress Tracking (FR-026)
# =============================================================================

BATCH_TTL = 3600  # 1 hour


async def create_batch(
    batch_id: str,
    count: int,
    project_id: str,
    user_id: str
) -> None:
    """
    Initialize a new batch in Redis.

    Args:
        batch_id: Unique batch identifier
        count: Total number of images in batch
        project_id: Project UUID
        user_id: User UUID
    """
    client = await get_redis()
    now = datetime.utcnow().isoformat()

    pipe = client.pipeline()

    # Progress hash
    pipe.hset(f"batch:{batch_id}:progress", mapping={
        "total": count,
        "completed": 0,
        "failed": 0,
        "status": "pending",
        "created_at": now,
        "updated_at": now,
        "project_id": project_id,
        "user_id": user_id,
    })
    pipe.expire(f"batch:{batch_id}:progress", BATCH_TTL)

    # Images list
    for i in range(count):
        pipe.rpush(f"batch:{batch_id}:images", json.dumps({
            "index": i,
            "status": "pending",
            "document_id": None,
            "file_url": None,
            "thumbnail_url": None,
            "error": None,
            "started_at": None,
            "completed_at": None,
        }))
    pipe.expire(f"batch:{batch_id}:images", BATCH_TTL)

    await pipe.execute()


async def update_image_status(
    batch_id: str,
    index: int,
    status: str,
    document_id: Optional[str] = None,
    file_url: Optional[str] = None,
    thumbnail_url: Optional[str] = None,
    error: Optional[str] = None
) -> None:
    """
    Update status of a single image in batch.

    Args:
        batch_id: Batch identifier
        index: Image index in batch (0-based)
        status: New status ("pending", "processing", "completed", "failed")
        document_id: Created document ID (if completed)
        file_url: Image file URL (if completed)
        thumbnail_url: Thumbnail URL (if completed)
        error: Error message (if failed)
    """
    client = await get_redis()
    now = datetime.utcnow().isoformat()

    # Build image status object
    image_status = {
        "index": index,
        "status": status,
        "document_id": document_id,
        "file_url": file_url,
        "thumbnail_url": thumbnail_url,
        "error": error,
        "started_at": now if status == "processing" else None,
        "completed_at": now if status in ("completed", "failed") else None,
    }

    # Update image in list
    await client.lset(
        f"batch:{batch_id}:images",
        index,
        json.dumps(image_status)
    )

    # Update progress counters
    if status == "completed":
        await client.hincrby(f"batch:{batch_id}:progress", "completed", 1)
    elif status == "failed":
        await client.hincrby(f"batch:{batch_id}:progress", "failed", 1)

    # Update timestamp and status
    await client.hset(f"batch:{batch_id}:progress", "updated_at", now)

    if status == "processing":
        # Set batch status to processing if first image started
        await client.hset(f"batch:{batch_id}:progress", "status", "processing")

    # Check if batch complete
    progress = await client.hgetall(f"batch:{batch_id}:progress")
    if progress:
        completed = int(progress.get("completed", 0))
        failed = int(progress.get("failed", 0))
        total = int(progress.get("total", 0))

        if completed + failed >= total:
            await client.hset(f"batch:{batch_id}:progress", "status", "completed")


async def get_batch_status(batch_id: str) -> Optional[dict]:
    """
    Get current status of a batch.

    Args:
        batch_id: Batch identifier

    Returns:
        dict with progress and images, or None if batch not found
    """
    client = await get_redis()

    progress = await client.hgetall(f"batch:{batch_id}:progress")
    if not progress:
        return None

    images_raw = await client.lrange(f"batch:{batch_id}:images", 0, -1)
    images = [json.loads(img) for img in images_raw]

    return {
        "batch_id": batch_id,
        "progress": {
            "total": int(progress.get("total", 0)),
            "completed": int(progress.get("completed", 0)),
            "failed": int(progress.get("failed", 0)),
            "status": progress.get("status", "pending"),
        },
        "images": images,
        "created_at": progress.get("created_at"),
        "updated_at": progress.get("updated_at"),
    }


async def delete_batch(batch_id: str) -> None:
    """
    Delete batch data from Redis (for cancellation).

    Args:
        batch_id: Batch identifier
    """
    client = await get_redis()
    await client.delete(f"batch:{batch_id}:progress", f"batch:{batch_id}:images")
