# Redis Key Contracts: Performance Optimization

**Feature**: 030-performance-optimization
**Date**: 2026-01-25

## Overview

This document defines the Redis key patterns and contracts for batch progress tracking. No HTTP API changes are required for this feature.

---

## Connection

**Environment Variable**: `REDIS_URL`
**Default**: `redis://localhost:6379/0`
**Database**: 0 (default)

---

## Key Namespace

All keys for this feature use the `batch:` prefix to avoid collisions with future features.

---

## Keys

### `batch:{batch_id}:progress`

**Type**: HASH
**TTL**: 3600 seconds (1 hour, auto-set on creation)
**Purpose**: Track overall batch generation progress

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `total` | integer | Yes | Total images requested in batch |
| `completed` | integer | Yes | Successfully generated images |
| `failed` | integer | Yes | Failed generations |
| `status` | string | Yes | Batch status (see enum below) |
| `created_at` | string | Yes | ISO 8601 timestamp |
| `updated_at` | string | Yes | ISO 8601 timestamp |
| `project_id` | string | Yes | Project UUID for filtering |
| `user_id` | string | Yes | User UUID for access control |

#### Status Enum

| Value | Description |
|-------|-------------|
| `pending` | Batch created, generation not started |
| `processing` | At least one image being generated |
| `completed` | All images finished (success or failure) |
| `failed` | Batch-level failure (e.g., auth error) |
| `cancelled` | User cancelled batch |

#### Example

```
HSET batch:abc123:progress \
  total 4 \
  completed 0 \
  failed 0 \
  status "pending" \
  created_at "2026-01-25T10:30:00Z" \
  updated_at "2026-01-25T10:30:00Z" \
  project_id "proj-uuid" \
  user_id "user-uuid"

EXPIRE batch:abc123:progress 3600
```

---

### `batch:{batch_id}:images`

**Type**: LIST
**TTL**: 3600 seconds (1 hour, auto-set on creation)
**Purpose**: Track individual image status within batch

#### Item Schema (JSON)

```json
{
  "index": 0,
  "status": "pending | processing | completed | failed",
  "document_id": "uuid | null",
  "file_url": "https://... | null",
  "thumbnail_url": "https://... | null",
  "error": "error message | null",
  "started_at": "ISO 8601 | null",
  "completed_at": "ISO 8601 | null"
}
```

#### Status Flow

```
pending → processing → completed
                    → failed
```

#### Operations

**Initialize batch** (called once at batch creation):
```
RPUSH batch:abc123:images '{"index":0,"status":"pending"}'
RPUSH batch:abc123:images '{"index":1,"status":"pending"}'
RPUSH batch:abc123:images '{"index":2,"status":"pending"}'
RPUSH batch:abc123:images '{"index":3,"status":"pending"}'
EXPIRE batch:abc123:images 3600
```

**Update single image** (use LSET with index):
```
LSET batch:abc123:images 0 '{"index":0,"status":"completed","document_id":"doc-uuid",...}'
```

**Get all images**:
```
LRANGE batch:abc123:images 0 -1
```

---

## Access Patterns

### Create Batch

```python
async def create_batch(batch_id: str, count: int, project_id: str, user_id: str):
    pipe = redis.pipeline()

    # Progress hash
    pipe.hset(f"batch:{batch_id}:progress", mapping={
        "total": count,
        "completed": 0,
        "failed": 0,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "project_id": project_id,
        "user_id": user_id,
    })
    pipe.expire(f"batch:{batch_id}:progress", 3600)

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
    pipe.expire(f"batch:{batch_id}:images", 3600)

    await pipe.execute()
```

### Update Image Status

```python
async def update_image_status(batch_id: str, index: int, status: dict):
    # Update image in list
    await redis.lset(
        f"batch:{batch_id}:images",
        index,
        json.dumps(status)
    )

    # Update progress counters
    if status["status"] == "completed":
        await redis.hincrby(f"batch:{batch_id}:progress", "completed", 1)
    elif status["status"] == "failed":
        await redis.hincrby(f"batch:{batch_id}:progress", "failed", 1)

    # Update timestamp
    await redis.hset(
        f"batch:{batch_id}:progress",
        "updated_at",
        datetime.utcnow().isoformat()
    )

    # Check if batch complete
    progress = await redis.hgetall(f"batch:{batch_id}:progress")
    if int(progress["completed"]) + int(progress["failed"]) >= int(progress["total"]):
        await redis.hset(f"batch:{batch_id}:progress", "status", "completed")
```

### Get Batch Status

```python
async def get_batch_status(batch_id: str) -> dict | None:
    progress = await redis.hgetall(f"batch:{batch_id}:progress")
    if not progress:
        return None

    images_raw = await redis.lrange(f"batch:{batch_id}:images", 0, -1)
    images = [json.loads(img) for img in images_raw]

    return {
        "batch_id": batch_id,
        "progress": {
            "total": int(progress["total"]),
            "completed": int(progress["completed"]),
            "failed": int(progress["failed"]),
            "status": progress["status"],
        },
        "images": images,
    }
```

---

## SSE Integration

The existing SSE endpoint (`/image-generation/batch/{batch_id}/stream`) will be updated to read from Redis instead of in-memory dict:

```python
async def event_generator():
    last_completed = 0
    while True:
        status = await get_batch_status(batch_id)
        if not status:
            yield {"event": "error", "data": {"message": "Batch not found"}}
            break

        # Yield new completions
        for img in status["images"]:
            if img["index"] >= last_completed and img["status"] in ("completed", "failed"):
                yield {"event": "image", "data": img}
                last_completed = img["index"] + 1

        # Check if done
        if status["progress"]["status"] in ("completed", "failed", "cancelled"):
            yield {"event": "complete", "data": status["progress"]}
            break

        await asyncio.sleep(0.5)
```

---

## Cleanup

Keys auto-expire after 1 hour. No manual cleanup required.

For immediate cleanup (e.g., user cancellation):
```
DEL batch:{batch_id}:progress batch:{batch_id}:images
```
