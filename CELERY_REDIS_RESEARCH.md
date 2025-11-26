# Celery + Redis for Async Workflow Execution with FastAPI

**Research Document** | Production-Ready Patterns for Multi-Step Workflows | Python 3.11+

---

## Table of Contents

1. [Celery Setup](#celery-setup)
2. [State Management](#state-management)
3. [Resumable Execution](#resumable-execution)
4. [Real-time Updates](#real-time-updates)
5. [Topological Sort](#topological-sort)
6. [Error Handling](#error-handling)
7. [Production Deployment](#production-deployment)

---

## 1. Celery Setup

### Decision: Celery 5.3.4 with Redis Broker

**Rationale:**
- **Celery 5.3.4**: Latest stable version with Python 3.11+ support, improved type hints, and async context support
- **Redis**: Fast, in-memory broker ideal for high-throughput async tasks, with native list data structures for queue management
- **FastAPI Integration**: Celery runs independently from FastAPI, allowing horizontal scaling of workers
- **Existing Setup**: Project already uses Celery 5.3.4 with Redis (see `requirements.txt` and `docker-compose.yml`)

### Current Implementation Analysis

**Location:** `/backend/celery_app.py`

**Strengths:**
- Separate broker (Redis 0) and result backend (Redis 1) prevent queue pollution
- Proper worker settings (prefetch=1, max_tasks_per_child=100) prevent memory leaks
- Task routing enables multi-queue support for priority/scaling
- Late acknowledgment pattern ensures task durability (won't be lost if worker crashes)

**Current Configuration:**
```python
celery_app = Celery(
    "xtyl_workflows",
    broker=REDIS_URL,           # redis://redis:6379/0
    backend=REDIS_URL,          # redis://redis:6379/1
    include=["tasks.workflow_tasks"]
)

celery_app.conf.update(
    task_serializer="json",     # Avoid pickle security issues
    task_acks_late=True,        # Acknowledge after task completion
    worker_prefetch_multiplier=1,  # Don't prefetch (prevents memory build-up)
    worker_max_tasks_per_child=100,  # Restart worker periodically
    task_default_rate_limit="10/m"  # Default rate limiting
)
```

### Implementation Notes

#### Task Definition Pattern

**Location:** `/backend/tasks/workflow_tasks.py`

**Key Pattern - Database Task Base Class:**
```python
class DatabaseTask(Task):
    """Base task class that provides database session management"""
    _db = None

    @property
    def db(self) -> Session:
        if self._db is None:
            self._db = SessionLocal()
        return self._db

    def after_return(self, *args, **kwargs):
        """Close database session after task completes"""
        if self._db is not None:
            self._db.close()
            self._db = None
```

**Why This Matters:**
- Each Celery worker process gets its own database connection pool
- `_db` property ensures consistent session usage across task lifecycle
- `after_return` hook guarantees cleanup (prevents connection leaks)
- Without this, long-running workflows exhaust PostgreSQL connection pool

#### Task Definition Example

```python
@celery_app.task(bind=True, base=DatabaseTask, name="tasks.workflow_tasks.execute_workflow")
def execute_workflow(self, execution_id: str):
    """Execute a workflow asynchronously"""
    db = self.db  # Get database session

    execution = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id
    ).first()

    # Long-running async operations here
    result = asyncio.run(execute_workflow_engine(execution_id, db))

    return {
        "execution_id": execution_id,
        "status": result.status,
        "progress": result.progress_percent
    }
```

#### Worker Startup Configuration

**Location:** `docker-compose.yml` (celery-worker service)

```yaml
celery-worker:
    command: celery -A celery_app worker --loglevel=info --concurrency=4
    healthcheck:
      test: ["CMD-SHELL", "celery -A celery_app inspect ping"]
      interval: 30s
      timeout: 10s
```

**Recommended Worker Startup:**
- Use `--concurrency=4` (or match CPU cores) for multi-step workflows
- Use `--prefetch-multiplier=1` explicitly (prevents task hoarding)
- Enable `--max-tasks-per-child=100` for memory leak prevention
- Add `--time-limit=3600` (1 hour max per task) to prevent hung tasks
- Use `--soft-time-limit=3300` (55 min) to allow graceful shutdown

**Full Recommended Command:**
```bash
celery -A celery_app worker \
  --loglevel=info \
  --concurrency=4 \
  --prefetch-multiplier=1 \
  --max-tasks-per-child=100 \
  --time-limit=3600 \
  --soft-time-limit=3300 \
  --hostname=worker1@%h
```

### Gotchas & Solutions

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| **Tasks mysteriously disappear** | Default result backend expires results after 1hr | Set `result_expires=86400` (24hrs) or higher |
| **Database connection exhaustion** | Each task holds open connection | Use DatabaseTask base class with proper cleanup |
| **Worker memory grows unbounded** | Accumulation of data structures in worker process | Use `max_tasks_per_child=100` to restart periodically |
| **Tasks execute multiple times** | Acknowledgment happens before completion | Set `task_acks_late=True` |
| **Long workflows timeout** | Default task time limit (3hrs) exceeded | Set appropriate `time_limit` for your use case |

---

## 2. State Management

### Decision: Redis for Speed + PostgreSQL for Durability

**Rationale:**
- **Redis Cache (DB 0)**: Fast access to execution state, progress, current node during active workflows
- **PostgreSQL**: Permanent record of all executions for audit/analytics/retry
- **Result Backend (DB 1)**: Stores Celery task results temporarily
- **Best of Both Worlds**: Low-latency reads + guaranteed durability

### Architecture

```
┌─────────────┐
│   FastAPI   │
│  (HTTP API) │
└──────┬──────┘
       │ {execution_id}
       ▼
┌─────────────────────────────────────────────────┐
│            State Management Layer                │
├─────────────────────────────────────────────────┤
│ Redis Cache Layer (DB 0)                        │
│  - Current execution state                      │
│  - Progress (% complete)                        │
│  - Current node ID                              │
│  - Node outputs (for variable interpolation)    │
│  - TTL: 24 hours (auto-cleanup)                 │
└──────────┬──────────────────────────────────────┘
           │ (periodic sync, on completion)
           ▼
┌─────────────────────────────────────────────────┐
│      PostgreSQL (Permanent Record)              │
├─────────────────────────────────────────────────┤
│ workflow_executions table:                      │
│  - status (pending/running/paused/completed)    │
│  - progress_percent                             │
│  - current_node_id                              │
│  - started_at, completed_at                     │
│  - error_message                                │
│  - total_cost                                   │
└─────────────────────────────────────────────────┘
           ▲
           │ (task result sync)
           └──────────────────┐
                              │
                    ┌─────────┴──────┐
                    │ Celery Results │
                    │ (Redis DB 1)   │
                    └────────────────┘
```

### Implementation Pattern: Hybrid State Sync

**Problem:** Workflows can take hours. We need:
1. Fast read access to progress (SSE clients polling frequently)
2. Guaranteed persistence if Redis crashes
3. Ability to resume from exact checkpoint

**Solution: Write-Through Cache with Periodic Batch Sync**

```python
import redis
import json
from typing import Optional
from sqlalchemy.orm import Session
from models import WorkflowExecution

class WorkflowStateManager:
    """Manages workflow execution state across Redis + PostgreSQL"""

    def __init__(self, redis_client: redis.Redis, db_session: Session):
        self.redis = redis_client
        self.db = db_session
        self.CACHE_PREFIX = "workflow:"
        self.CACHE_TTL = 86400  # 24 hours

    def get_execution_state(self, execution_id: str) -> Optional[dict]:
        """Get execution state from cache, fallback to DB"""
        # Try cache first (fast path)
        cache_key = f"{self.CACHE_PREFIX}{execution_id}"
        cached = self.redis.get(cache_key)

        if cached:
            return json.loads(cached)

        # Fallback to database
        execution = self.db.query(WorkflowExecution).filter(
            WorkflowExecution.id == execution_id
        ).first()

        if execution:
            state = self._execution_to_state(execution)
            # Repopulate cache
            self.redis.setex(
                cache_key,
                self.CACHE_TTL,
                json.dumps(state)
            )
            return state

        return None

    def update_execution_state(
        self,
        execution_id: str,
        status: str,
        progress_percent: int,
        current_node_id: Optional[str] = None,
        node_outputs: Optional[dict] = None
    ):
        """Update execution state in both cache and database"""
        cache_key = f"{self.CACHE_PREFIX}{execution_id}"

        # Update cache immediately (fast)
        state = {
            "execution_id": execution_id,
            "status": status,
            "progress_percent": progress_percent,
            "current_node_id": current_node_id,
            "node_outputs": node_outputs or {},
            "updated_at": datetime.utcnow().isoformat()
        }

        self.redis.setex(cache_key, self.CACHE_TTL, json.dumps(state))

        # Update database (durable, slower)
        execution = self.db.query(WorkflowExecution).filter(
            WorkflowExecution.id == execution_id
        ).first()

        if execution:
            execution.status = status
            execution.progress_percent = progress_percent
            execution.current_node_id = current_node_id
            self.db.commit()

    def get_node_outputs(self, execution_id: str) -> dict:
        """Get outputs from previously executed nodes for variable interpolation"""
        cache_key = f"{self.CACHE_PREFIX}{execution_id}:outputs"
        cached = self.redis.get(cache_key)

        if cached:
            return json.loads(cached)

        return {}

    def save_node_output(
        self,
        execution_id: str,
        node_id: str,
        output_data: dict
    ):
        """Save individual node output for use in subsequent nodes"""
        cache_key = f"{self.CACHE_PREFIX}{execution_id}:outputs"

        # Get current outputs
        outputs = self.get_node_outputs(execution_id)

        # Add new output
        outputs[node_id] = {
            "data": output_data,
            "completed_at": datetime.utcnow().isoformat()
        }

        # Save back to cache with long TTL
        self.redis.setex(
            cache_key,
            self.CACHE_TTL,
            json.dumps(outputs)
        )

    def _execution_to_state(self, execution: WorkflowExecution) -> dict:
        """Convert WorkflowExecution model to state dict"""
        return {
            "execution_id": execution.id,
            "status": execution.status,
            "progress_percent": execution.progress_percent,
            "current_node_id": execution.current_node_id,
            "node_outputs": {},
            "updated_at": execution.updated_at.isoformat() if execution.updated_at else None
        }
```

### Redis Key Schema

```
workflow:{execution_id}                    # Current state
  ├─ status
  ├─ progress_percent
  ├─ current_node_id
  ├─ updated_at
  └─ TTL: 24 hours

workflow:{execution_id}:outputs            # Node outputs for variable refs
  ├─ {node_id}.data
  ├─ {node_id}.completed_at
  └─ TTL: 24 hours

celery-task-meta-{task_id}                 # Celery result backend
  ├─ status (Celery internal)
  ├─ result
  └─ TTL: 1 hour (configurable)
```

### Gotchas & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| **Stale cache data after DB failure** | Cache not synced to DB | Implement periodic batch sync every 30sec |
| **Lost node outputs if Redis crashes** | Outputs only in Redis | Save outputs to PostgreSQL `agent_jobs.output_data_json` |
| **Cache miss for long-running workflows** | Default TTL (1hr) expired | Set `CACHE_TTL` to at least 24 hours |
| **Memory exhaustion in Redis** | Unbounded keys | Use TTL on all keys, monitor with `MEMORY DOCTOR` |

---

## 3. Resumable Execution

### Decision: Node-Level Checkpointing with Resumption Stack

**Rationale:**
- **Pause/Resume without Restart**: Save execution state between node boundaries
- **No Partial Node Re-execution**: Once a node completes, skip it on resume (idempotent)
- **Error Recovery**: Failed nodes can retry without affecting upstream nodes
- **Scalability**: Easy to scale workflows across multiple workers

### Architecture

```
Execution States:
  pending     → running → [paused ⟷ running] → completed
                         ↘ failed (with retry) ↗

Node Checkpoints:
  [Node 1] ✓ Complete
  [Node 2] ✓ Complete
  [Node 3] ⏸ Paused (human review)
  [Node 4] ⏳ Pending
  [Node 5] ⏳ Pending

On Resume:
  - Query completed nodes from AgentJob table
  - Skip to next pending node
  - Continue execution from Node 4
```

### Implementation Pattern: Resumable Workflow Engine

```python
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from models import WorkflowExecution, AgentJob
from services.node_executor import execute_node
import logging

logger = logging.getLogger(__name__)

class ResumableWorkflowEngine:
    """Orchestrates resumable workflow execution with checkpointing"""

    async def execute_workflow(
        self,
        execution_id: str,
        db: Session,
        resume_from_node: Optional[str] = None
    ) -> WorkflowExecution:
        """
        Execute or resume a workflow

        Args:
            execution_id: Workflow execution ID
            db: Database session
            resume_from_node: Resume from specific node (None = auto-detect)

        Returns:
            Updated WorkflowExecution
        """
        execution = db.query(WorkflowExecution).filter(
            WorkflowExecution.id == execution_id
        ).first()

        if not execution:
            raise ValueError(f"Execution {execution_id} not found")

        template = execution.template

        # Build execution order (topological sort)
        node_order = self._build_execution_order(template.nodes_json, template.edges_json)

        # Determine resume point
        if resume_from_node is None:
            resume_from_node = self._find_next_pending_node(execution, node_order)

        # Find start index
        try:
            start_idx = next(i for i, n in enumerate(node_order) if n["id"] == resume_from_node)
        except StopIteration:
            raise ValueError(f"Node {resume_from_node} not found in execution order")

        # Update status
        execution.status = "running"
        execution.started_at = execution.started_at or datetime.utcnow()
        db.commit()

        logger.info(f"Resuming execution {execution_id} from node {resume_from_node} (index {start_idx})")

        try:
            # Get previously completed node outputs
            node_outputs = self._load_node_outputs(execution, db)

            # Execute remaining nodes
            for idx in range(start_idx, len(node_order)):
                node = node_order[idx]

                # Update progress
                progress = int((idx / len(node_order)) * 100)
                execution.progress_percent = progress
                execution.current_node_id = node["id"]
                db.commit()

                logger.info(f"Executing node {node['id']} ({idx+1}/{len(node_order)})")

                try:
                    # Execute node (idempotent - check for existing job first)
                    result = await self._execute_node_once(
                        node,
                        execution,
                        db,
                        node_outputs
                    )

                    # Save output for later reference
                    node_outputs[node["id"]] = result

                except Exception as e:
                    logger.error(f"Node {node['id']} failed: {e}")
                    execution.error_message = str(e)
                    execution.status = "failed"
                    db.commit()
                    raise

            # Mark as completed
            execution.status = "completed"
            execution.progress_percent = 100
            execution.completed_at = datetime.utcnow()
            db.commit()

            logger.info(f"Workflow {execution_id} completed successfully")
            return execution

        except Exception as e:
            logger.error(f"Workflow {execution_id} failed: {e}")
            if execution.status != "paused":  # Don't overwrite paused status
                execution.status = "failed"
            db.commit()
            raise

    async def _execute_node_once(
        self,
        node: Dict[str, Any],
        execution: WorkflowExecution,
        db: Session,
        node_outputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute a node, checking if it was already completed.
        Returns existing result if already done.
        """
        # Check if node already completed
        existing_job = db.query(AgentJob).filter(
            AgentJob.execution_id == execution.id,
            AgentJob.node_id == node["id"],
            AgentJob.status == "completed"
        ).first()

        if existing_job and existing_job.output_data_json:
            logger.info(f"Node {node['id']} already completed, skipping")
            return existing_job.output_data_json

        # Execute node
        result = await execute_node(node, execution, db, node_outputs)

        return result

    def _find_next_pending_node(
        self,
        execution: WorkflowExecution,
        node_order: List[Dict[str, Any]]
    ) -> str:
        """Find first node that hasn't been completed yet"""
        completed_nodes = db.query(AgentJob).filter(
            AgentJob.execution_id == execution.id,
            AgentJob.status == "completed"
        ).all()

        completed_ids = {job.node_id for job in completed_nodes}

        for node in node_order:
            if node["id"] not in completed_ids:
                return node["id"]

        # All nodes completed
        return node_order[-1]["id"] if node_order else None

    def _load_node_outputs(
        self,
        execution: WorkflowExecution,
        db: Session
    ) -> Dict[str, Any]:
        """Load outputs from completed nodes for variable interpolation"""
        jobs = db.query(AgentJob).filter(
            AgentJob.execution_id == execution.id,
            AgentJob.status == "completed"
        ).all()

        outputs = {}
        for job in jobs:
            if job.output_data_json:
                outputs[job.node_id] = job.output_data_json

        return outputs

    def _build_execution_order(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Build topologically sorted node execution order"""
        # Implementation in Topological Sort section
        pass
```

### Pause/Resume API Endpoints

```python
from fastapi import APIRouter, Depends, HTTPException
from celery_app import celery_app

router = APIRouter(prefix="/workflows/executions", tags=["workflows"])

@router.post("/{execution_id}/pause")
async def pause_execution(
    execution_id: str,
    db: Session = Depends(get_db)
):
    """Pause a running workflow"""
    execution = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id
    ).first()

    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    if execution.status != "running":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot pause workflow in {execution.status} state"
        )

    # Revoke active Celery task
    celery_app.control.revoke(execution.celery_task_id, terminate=False)

    execution.status = "paused"
    db.commit()

    return {
        "message": "Workflow paused",
        "execution_id": execution_id,
        "current_node": execution.current_node_id
    }

@router.post("/{execution_id}/resume")
async def resume_execution(
    execution_id: str,
    db: Session = Depends(get_db)
):
    """Resume a paused workflow from last checkpoint"""
    execution = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id
    ).first()

    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    if execution.status != "paused":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot resume workflow in {execution.status} state"
        )

    # Find next pending node
    completed_jobs = db.query(AgentJob).filter(
        AgentJob.execution_id == execution_id,
        AgentJob.status == "completed"
    ).all()

    # Re-queue execution task with resume point
    task = celery_app.send_task(
        "tasks.workflow_tasks.execute_workflow",
        args=[execution_id],
        kwargs={"resume": True}
    )

    execution.status = "running"
    execution.celery_task_id = task.id
    db.commit()

    return {
        "message": "Workflow resumed",
        "execution_id": execution_id,
        "task_id": task.id
    }
```

### Gotchas & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| **Duplicate execution of same node** | No idempotency check | Query AgentJob table before executing |
| **Resume creates new jobs for old nodes** | Not skipping completed nodes | Use `_execute_node_once` pattern |
| **Lost node outputs during pause** | Outputs only in memory | Persist to `AgentJob.output_data_json` |
| **Race condition on pause** | Task still executing when paused | Use Celery task revocation with grace period |

---

## 4. Real-time Updates

### Decision: Server-Sent Events (SSE) with Polling Fallback

**Rationale:**
- **Low Overhead**: SSE uses single persistent connection vs polling
- **Browser Native**: Works in all modern browsers, no WebSocket library needed
- **Bidirectional Light**: Can combine SSE (server→client) + REST (client→server)
- **Fallback**: Polling works if SSE not available
- **Fire-and-Forget**: No guarantee delivery (workflows persist to DB anyway)

### Architecture

```
Workflow Execution Timeline:

┌──────────────────────────────────────────────────────────┐
│  Client Browser (React)                                  │
│  ┌──────────────────────────────────────────────────────┐│
│  │ useEffect(() => {                                    ││
│  │   const sse = new EventSource(                       ││
│  │     `/api/workflows/{id}/stream`                     ││
│  │   )                                                  ││
│  │   sse.onmessage = (e) => {                          ││
│  │     setProgress(e.data.progress_percent)            ││
│  │     setStatus(e.data.status)                         ││
│  │   }                                                  ││
│  │ })                                                   ││
│  └──────────────────────────────────────────────────────┘│
└─────────────────────┬──────────────────────────────────┘
                      │ SSE stream (GET /api/workflows/{id}/stream)
                      ▼
┌──────────────────────────────────────────────────────────┐
│  FastAPI Server                                          │
│  ┌──────────────────────────────────────────────────────┐│
│  │ @router.get("/stream")                               ││
│  │ async def stream_execution(execution_id):             ││
│  │   async for event in watch_execution(execution_id):  ││
│  │     yield f"data: {json.dumps(event)}\n\n"           ││
│  └──────────────────────────────────────────────────────┘│
└─────────────────────┬──────────────────────────────────┘
                      │ (polls Redis cache every 500ms)
                      ▼
┌──────────────────────────────────────────────────────────┐
│  Redis Cache (workflow:{execution_id})                   │
│  {                                                        │
│    "status": "running",                                  │
│    "progress_percent": 45,                               │
│    "current_node_id": "node-3",                          │
│    "updated_at": "2025-11-25T12:34:56Z"                 │
│  }                                                        │
└─────────────────────┬──────────────────────────────────┘
                      │ (writes state on node completion)
                      ▼
┌──────────────────────────────────────────────────────────┐
│  Celery Worker Process                                   │
│  ┌──────────────────────────────────────────────────────┐│
│  │ celery_app.send_task(...)                             ││
│  │ → execute_workflow_engine()                           ││
│  │ → updates Redis cache per node                        ││
│  └──────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

### Implementation Pattern: SSE Stream with Redis Polling

```python
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
import json
import asyncio
import redis.asyncio as redis
from typing import AsyncGenerator

router = APIRouter(prefix="/workflows/executions", tags=["workflows"])

@router.get("/{execution_id}/stream")
async def stream_execution(
    execution_id: str,
    db: Session = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis)
) -> StreamingResponse:
    """
    Stream real-time workflow execution updates via Server-Sent Events

    Client Usage:
    ```javascript
    const sse = new EventSource(`/api/workflows/${id}/stream`);
    sse.onmessage = (e) => {
      const data = JSON.parse(e.data);
      console.log('Progress:', data.progress_percent, 'Status:', data.status);
    };
    sse.onerror = () => sse.close();
    ```
    """
    # Verify execution exists
    execution = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id
    ).first()

    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    async def event_generator() -> AsyncGenerator[str, None]:
        """Generate SSE events from Redis cache"""
        last_seen = None
        check_interval = 0.5  # Poll every 500ms

        while True:
            try:
                # Get current state from cache
                cache_key = f"workflow:{execution_id}"
                cached = await redis_client.get(cache_key)

                if cached:
                    state = json.loads(cached)

                    # Only emit if state changed
                    if state != last_seen:
                        # Format as SSE
                        yield f"data: {json.dumps(state)}\n\n"
                        last_seen = state

                        # Stop streaming if completed/failed
                        if state["status"] in ["completed", "failed", "stopped"]:
                            yield f"event: done\ndata: {json.dumps(state)}\n\n"
                            break
                else:
                    # Cache miss - get from DB
                    execution = db.query(WorkflowExecution).filter(
                        WorkflowExecution.id == execution_id
                    ).first()

                    if execution:
                        state = {
                            "execution_id": execution.id,
                            "status": execution.status,
                            "progress_percent": execution.progress_percent,
                            "current_node_id": execution.current_node_id,
                            "updated_at": execution.updated_at.isoformat() if execution.updated_at else None
                        }

                        if state != last_seen:
                            yield f"data: {json.dumps(state)}\n\n"
                            last_seen = state

                # Wait before next poll
                await asyncio.sleep(check_interval)

            except Exception as e:
                logger.error(f"Error in SSE stream: {e}")
                yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
                break

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )
```

### Frontend React Hook for SSE

```typescript
// hooks/useWorkflowStream.ts

import { useEffect, useState, useCallback } from 'react';

interface WorkflowState {
  execution_id: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'stopped';
  progress_percent: number;
  current_node_id?: string;
  updated_at?: string;
}

export function useWorkflowStream(executionId: string) {
  const [state, setState] = useState<WorkflowState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    try {
      const sse = new EventSource(`/api/workflows/${executionId}/stream`);

      sse.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      sse.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setState(data);
      };

      sse.addEventListener('done', (event) => {
        const data = JSON.parse(event.data);
        setState(data);
        sse.close();
        setIsConnected(false);
      });

      sse.addEventListener('error', () => {
        setError('Connection lost, attempting to reconnect...');
        sse.close();
        setIsConnected(false);
        // Reconnect after 3 seconds
        setTimeout(connect, 3000);
      });

      return () => {
        sse.close();
        setIsConnected(false);
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    }
  }, [executionId]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  return { state, error, isConnected };
}

// Usage in component:
function WorkflowProgressDisplay({ executionId }: { executionId: string }) {
  const { state, error, isConnected } = useWorkflowStream(executionId);

  return (
    <div>
      <div className="connection-status">
        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>
      {error && <div className="error">{error}</div>}
      {state && (
        <div>
          <p>Status: {state.status}</p>
          <progress value={state.progress_percent} max={100} />
          {state.current_node_id && <p>Executing: {state.current_node_id}</p>}
        </div>
      )}
    </div>
  );
}
```

### Polling Fallback (if SSE not available)

```python
@router.get("/{execution_id}/status")
async def get_execution_status(
    execution_id: str,
    db: Session = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis)
):
    """
    Get current execution status (polling endpoint)

    Fallback if SSE not available.
    Client polls every 500ms to 2s.
    """
    cache_key = f"workflow:{execution_id}"
    cached = await redis_client.get(cache_key)

    if cached:
        return json.loads(cached)

    # Fallback to database
    execution = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id
    ).first()

    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    return {
        "execution_id": execution.id,
        "status": execution.status,
        "progress_percent": execution.progress_percent,
        "current_node_id": execution.current_node_id,
        "updated_at": execution.updated_at.isoformat() if execution.updated_at else None
    }
```

### Gotchas & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| **Buffered responses** | Nginx/reverse proxy buffering SSE | Add `X-Accel-Buffering: no` header |
| **No heartbeat, connection drops** | Client detects silence as dead connection | Send keepalive every 30sec if no events |
| **Client misses state changes** | Gaps between polls | Always include state in response, not deltas |
| **High CPU from polling** | Polling interval too short | Use 500ms minimum, SSE for sub-second updates |

---

## 5. Topological Sort

### Decision: Kahn's Algorithm with Cycle Detection

**Rationale:**
- **Linear Time**: O(V + E) complexity, suitable for large workflows
- **Deterministic**: Produces consistent ordering for reproducible execution
- **Cycle-Free Guarantee**: Works with validation layer that prevents cycles
- **Dependency Tracking**: Identifies which nodes must execute before others

### Problem Solved

**Why Topological Sort?**

```
Workflow DAG:
    ┌─────────┐
    │  Start  │
    └────┬────┘
         │
    ┌────▼─────┐
    │ Gen Copy │ (Node A)
    └────┬─────┘
         │
    ┌────┴────────┬──────────┐
    │             │          │
 ┌──▼──┐     ┌───▼────┐  ┌──▼───┐
 │Gen   │     │Review  │  │Parallel
 │Image │     │        │  │(B, C)
 └──┬───┘     └───┬────┘  └──┬───┘
    │             │          │
    └─────┬──────┴──────────┘
          │
      ┌───▼────┐
      │Attach  │ (Node D)
      └───┬────┘
          │
      ┌───▼───┐
      │ End   │
      └───────┘

Correct Execution Order:
  1. Gen Copy (must finish first)
  2. Gen Image, Review, Parallel (can run in any order)
  3. Attach (depends on all above)
  4. End (terminal node)
```

### Implementation Pattern: Kahn's Algorithm

```python
from typing import List, Dict, Any
from collections import deque

class TopologicalSorter:
    """Topologically sorts workflow nodes respecting dependency constraints"""

    @staticmethod
    def kahn_sort(
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Sort nodes using Kahn's algorithm (BFS-based topological sort)

        Args:
            nodes: List of workflow nodes
            edges: List of workflow edges (directed)

        Returns:
            Nodes in topological order (dependencies first)

        Raises:
            ValueError: If cycle detected (shouldn't happen with validation)
        """
        # Build adjacency structures
        graph = {node["id"]: [] for node in nodes}
        in_degree = {node["id"]: 0 for node in nodes}

        for edge in edges:
            graph[edge["source"]].append(edge["target"])
            in_degree[edge["target"]] += 1

        # Start with nodes that have no dependencies
        queue = deque([
            node for node in nodes
            if in_degree[node["id"]] == 0
        ])

        sorted_nodes = []

        while queue:
            # Process node with no remaining dependencies
            node = queue.popleft()
            sorted_nodes.append(node)

            # Reduce in-degree of neighbors
            for neighbor_id in graph[node["id"]]:
                in_degree[neighbor_id] -= 1

                # If neighbor now has no dependencies, add to queue
                if in_degree[neighbor_id] == 0:
                    neighbor = next(
                        (n for n in nodes if n["id"] == neighbor_id),
                        None
                    )
                    if neighbor:
                        queue.append(neighbor)

        # Check if all nodes processed (would indicate cycle)
        if len(sorted_nodes) != len(nodes):
            raise ValueError(
                "Cycle detected in workflow graph. "
                "This should have been caught by validation."
            )

        return sorted_nodes

    @staticmethod
    def build_execution_order(
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        exclude_types: List[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Build execution order, optionally excluding certain node types

        Args:
            nodes: All nodes
            edges: All edges
            exclude_types: Node types to skip (e.g., ['start', 'end'])

        Returns:
            Ordered executable nodes
        """
        if exclude_types is None:
            exclude_types = ["start", "end"]

        # Filter nodes
        executable = [
            n for n in nodes
            if n.get("type") not in exclude_types
        ]

        if not executable:
            return []

        # If only one node, no need to sort
        if len(executable) == 1:
            return executable

        # Sort with Kahn's algorithm
        return TopologicalSorter.kahn_sort(executable, edges)

    @staticmethod
    def get_execution_levels(
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> Dict[str, int]:
        """
        Calculate execution "level" for each node (0 = can run immediately, etc.)

        Useful for parallel execution planning.

        Args:
            nodes: All nodes
            edges: All edges

        Returns:
            Dict mapping node_id -> execution_level (min hops from start)
        """
        levels = {node["id"]: 0 for node in nodes}

        # BFS from nodes with no dependencies
        in_degree = {node["id"]: 0 for node in nodes}
        graph = {node["id"]: [] for node in nodes}

        for edge in edges:
            graph[edge["source"]].append(edge["target"])
            in_degree[edge["target"]] += 1

        # Start with roots (in_degree = 0)
        queue = deque([
            node["id"] for node in nodes
            if in_degree[node["id"]] == 0
        ])

        while queue:
            node_id = queue.popleft()

            # Update level of all neighbors
            for neighbor_id in graph[node_id]:
                levels[neighbor_id] = max(
                    levels[neighbor_id],
                    levels[node_id] + 1
                )
                in_degree[neighbor_id] -= 1

                if in_degree[neighbor_id] == 0:
                    queue.append(neighbor_id)

        return levels
```

### Usage in Workflow Engine

```python
from services.topological_sort import TopologicalSorter

async def execute_workflow(
    execution_id: str,
    db: Session
) -> WorkflowExecution:
    """Execute workflow with proper node ordering"""
    execution = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id
    ).first()

    template = execution.template

    # Get execution order
    node_order = TopologicalSorter.build_execution_order(
        template.nodes_json,
        template.edges_json,
        exclude_types=["start", "end"]
    )

    logger.info(f"Execution order: {[n['id'] for n in node_order]}")

    # ... rest of execution logic
```

### Parallel Execution with Levels

```python
from services.topological_sort import TopologicalSorter
import asyncio

async def execute_workflow_parallel(
    execution_id: str,
    db: Session
) -> WorkflowExecution:
    """Execute workflow with parallel nodes at same level"""
    execution = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id
    ).first()

    template = execution.template

    # Get execution levels
    levels = TopologicalSorter.get_execution_levels(
        template.nodes_json,
        template.edges_json
    )

    # Group nodes by level
    nodes_by_level = {}
    for node in template.nodes_json:
        level = levels[node["id"]]
        if level not in nodes_by_level:
            nodes_by_level[level] = []
        nodes_by_level[level].append(node)

    # Execute each level
    for level in sorted(nodes_by_level.keys()):
        nodes = nodes_by_level[level]

        # Execute all nodes at this level in parallel
        tasks = [
            execute_node(node, execution, db)
            for node in nodes
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Check for failures
        for result in results:
            if isinstance(result, Exception):
                raise result
```

### Gotchas & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| **Different order on each execution** | Using set iteration | Use deterministic algorithm (Kahn's) |
| **Parallel nodes marked as sequential** | Not computing execution levels | Use `get_execution_levels` for parallel plan |
| **Nodes execute before dependencies ready** | Topological sort not enforced | Always use sorted order, validate on template creation |

---

## 6. Error Handling

### Decision: Multi-Layer Error Strategy with Exponential Backoff

**Rationale:**
- **Transient Errors**: Network timeouts, rate limits → exponential backoff retry
- **Permanent Errors**: Validation failures, auth errors → fail immediately
- **Partial Failures**: One node fails → pause, allow human intervention
- **Observability**: Log all errors with context for debugging

### Implementation Pattern: Error Classification and Retry Strategy

```python
from enum import Enum
from typing import Callable, Optional, Type
from functools import wraps
import time
import logging

logger = logging.getLogger(__name__)

class ErrorClass(Enum):
    """Classification of errors for retry strategy"""
    TRANSIENT = "transient"      # Retry (network, rate limit, timeout)
    PERMANENT = "permanent"       # No retry (validation, auth, not found)
    PARTIAL = "partial"           # Pause workflow (human review needed)

class WorkflowException(Exception):
    """Base exception for workflow errors"""

    def __init__(
        self,
        message: str,
        error_class: ErrorClass,
        retryable: bool = False,
        retry_count: int = 0,
        node_id: Optional[str] = None
    ):
        self.message = message
        self.error_class = error_class
        self.retryable = retryable
        self.retry_count = retry_count
        self.node_id = node_id
        super().__init__(message)

# Specific error types
class TransientError(WorkflowException):
    """Network, timeout, rate limit errors - safe to retry"""
    def __init__(self, message: str, node_id: Optional[str] = None):
        super().__init__(
            message,
            error_class=ErrorClass.TRANSIENT,
            retryable=True,
            node_id=node_id
        )

class PermanentError(WorkflowException):
    """Validation, auth, not found - don't retry"""
    def __init__(self, message: str, node_id: Optional[str] = None):
        super().__init__(
            message,
            error_class=ErrorClass.PERMANENT,
            retryable=False,
            node_id=node_id
        )

class PartialFailureError(WorkflowException):
    """Human review needed - pause workflow"""
    def __init__(
        self,
        message: str,
        pause_for_review: bool = True,
        node_id: Optional[str] = None
    ):
        super().__init__(
            message,
            error_class=ErrorClass.PARTIAL,
            retryable=False,
            node_id=node_id
        )

def exponential_backoff(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    jitter: bool = True
):
    """
    Decorator for exponential backoff retry logic

    Usage:
    @exponential_backoff(max_retries=3, base_delay=1.0)
    async def call_external_api():
        pass
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None

            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)

                except WorkflowException as e:
                    if not e.retryable:
                        # Permanent error - don't retry
                        logger.error(
                            f"Permanent error in {func.__name__}: {e.message}",
                            extra={"node_id": e.node_id}
                        )
                        raise

                    if attempt == max_retries:
                        logger.error(
                            f"Max retries ({max_retries}) exceeded for {func.__name__}",
                            extra={"error": str(e)}
                        )
                        raise

                    # Calculate delay with exponential backoff
                    delay = min(base_delay * (2 ** attempt), max_delay)

                    # Add jitter to prevent thundering herd
                    if jitter:
                        import random
                        delay *= (0.5 + random.random())

                    logger.warning(
                        f"Retrying {func.__name__} (attempt {attempt + 1}/{max_retries + 1}) "
                        f"after {delay:.1f}s: {e.message}"
                    )

                    await asyncio.sleep(delay)
                    last_exception = e

                except Exception as e:
                    # Classify unknown exception
                    logger.exception(f"Unexpected error in {func.__name__}")

                    # Assume transient and retry
                    if attempt == max_retries:
                        raise PermanentError(str(e))

                    delay = min(base_delay * (2 ** attempt), max_delay)
                    logger.warning(f"Retrying after {delay:.1f}s due to: {e}")
                    await asyncio.sleep(delay)

            raise last_exception or PermanentError(f"Failed after {max_retries} retries")

        return wrapper
    return decorator

# Example usage with LLM API calls
@exponential_backoff(max_retries=3, base_delay=2.0)
async def call_llm_with_retry(prompt: str, model: str):
    """Call LLM with exponential backoff"""
    try:
        response = await chat_completion(
            messages=[{"role": "user", "content": prompt}],
            model=model,
            timeout=30
        )
        return response

    except TimeoutError as e:
        raise TransientError(f"LLM timeout after 30s: {e}")

    except RateLimitError as e:
        raise TransientError(f"Rate limited: {e}")

    except ValidationError as e:
        raise PermanentError(f"Invalid prompt: {e}")
```

### Error Recovery in Workflow Engine

```python
async def execute_workflow(
    execution_id: str,
    db: Session
) -> WorkflowExecution:
    """Execute workflow with comprehensive error handling"""
    execution = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id
    ).first()

    template = execution.template
    node_order = TopologicalSorter.build_execution_order(
        template.nodes_json,
        template.edges_json
    )

    try:
        # Transition to running
        execution.status = "running"
        execution.started_at = datetime.utcnow()
        db.commit()

        # Execute nodes
        for idx, node in enumerate(node_order):
            try:
                # Update progress
                progress = int((idx / len(node_order)) * 100)
                execution.progress_percent = progress
                execution.current_node_id = node["id"]
                db.commit()

                # Execute node with retry
                result = await execute_node_with_error_handling(
                    node,
                    execution,
                    db
                )

                logger.info(f"Node {node['id']} completed successfully")

            except PartialFailureError as e:
                # Pause workflow for human review
                logger.warning(
                    f"Pausing workflow {execution_id} for review: {e.message}"
                )
                execution.status = "paused"
                execution.error_message = e.message
                execution.current_node_id = node["id"]
                db.commit()

                # Send notification to user
                await notify_user_for_review(execution_id, node["id"], e.message)

                return execution

            except PermanentError as e:
                # Fail workflow immediately
                logger.error(f"Permanent error in node {node['id']}: {e.message}")
                execution.status = "failed"
                execution.error_message = e.message
                execution.current_node_id = node["id"]
                db.commit()

                raise

            except TransientError as e:
                # Already retried by decorator, still failing
                logger.error(f"Transient error persisted in node {node['id']}: {e.message}")
                execution.status = "failed"
                execution.error_message = f"{e.message} (after {e.retry_count} retries)"
                execution.current_node_id = node["id"]
                db.commit()

                raise

        # Mark as completed
        execution.status = "completed"
        execution.progress_percent = 100
        execution.completed_at = datetime.utcnow()
        execution.error_message = None
        db.commit()

        return execution

    except Exception as e:
        logger.exception(f"Workflow {execution_id} failed with exception")

        if execution.status != "paused":
            execution.status = "failed"
            execution.error_message = str(e)
            execution.completed_at = datetime.utcnow()

        db.commit()
        raise

async def execute_node_with_error_handling(
    node: Dict[str, Any],
    execution: WorkflowExecution,
    db: Session
) -> Dict[str, Any]:
    """Execute single node with error classification"""

    try:
        result = await execute_node(node, execution, db)
        return result

    except Exception as e:
        # Classify error
        error_class = _classify_error(e, node)

        if error_class == ErrorClass.TRANSIENT:
            raise TransientError(str(e), node_id=node["id"])

        elif error_class == ErrorClass.PERMANENT:
            raise PermanentError(str(e), node_id=node["id"])

        elif error_class == ErrorClass.PARTIAL:
            raise PartialFailureError(
                str(e),
                pause_for_review=True,
                node_id=node["id"]
            )

        else:
            # Unknown - treat as transient
            raise TransientError(str(e), node_id=node["id"])

def _classify_error(error: Exception, node: Dict[str, Any]) -> ErrorClass:
    """Classify error type for retry strategy"""
    error_str = str(error).lower()

    # Transient patterns
    transient_patterns = [
        "timeout",
        "connection",
        "temporarily unavailable",
        "rate limit",
        "500",
        "502",
        "503",
        "504"
    ]

    if any(pattern in error_str for pattern in transient_patterns):
        return ErrorClass.TRANSIENT

    # Permanent patterns
    permanent_patterns = [
        "invalid",
        "validation",
        "unauthorized",
        "403",
        "404",
        "not found",
        "malformed"
    ]

    if any(pattern in error_str for pattern in permanent_patterns):
        return ErrorClass.PERMANENT

    # Partial failure (content review needed)
    if node.get("type") == "review":
        return ErrorClass.PARTIAL

    # Default to transient (safe to retry)
    return ErrorClass.TRANSIENT
```

### Error Logging with Context

```python
import structlog
from typing import Dict, Any

logger = structlog.get_logger()

def log_workflow_error(
    execution_id: str,
    node_id: Optional[str],
    error: Exception,
    error_class: ErrorClass,
    context: Optional[Dict[str, Any]] = None
):
    """Log workflow error with structured context"""
    logger.error(
        "workflow_error",
        execution_id=execution_id,
        node_id=node_id,
        error_class=error_class.value,
        error_type=type(error).__name__,
        error_message=str(error),
        context=context or {},
        traceback=traceback.format_exc()
    )

# Usage
try:
    result = await call_llm_with_retry(prompt)
except WorkflowException as e:
    log_workflow_error(
        execution_id=execution_id,
        node_id=node["id"],
        error=e,
        error_class=e.error_class,
        context={
            "prompt_length": len(prompt),
            "model": node.get("data", {}).get("model"),
            "attempt": e.retry_count
        }
    )
    raise
```

### Gotchas & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| **Infinite retries** | No max retry limit | Always set `max_retries` parameter |
| **Cascading failures** | Retrying permanent errors | Classify errors properly, fail fast on permanent |
| **No retry information in logs** | Missing retry context | Include `retry_count` in error logging |
| **Worker unresponsive during retries** | Long sleep blocks worker | Use `asyncio.sleep` instead of `time.sleep` |

---

## 7. Production Deployment

### Docker Compose Setup (Current)

**Location:** `/docker-compose.yml`

The project already has production-ready setup with:
- Separate backend, frontend, database, Redis, MinIO
- Celery worker with proper configuration
- Health checks for all services
- Resource limits (CPU, memory)

### Scaling Considerations

#### Horizontal Scaling: Multiple Workers

```yaml
# docker-compose.yml - Add multiple workers

celery-worker-1:
  build:
    context: ./backend
    dockerfile: Dockerfile.prod
  command: celery -A celery_app worker --hostname=worker1@%h --loglevel=info
  depends_on:
    - redis
    - db

celery-worker-2:
  build:
    context: ./backend
    dockerfile: Dockerfile.prod
  command: celery -A celery_app worker --hostname=worker2@%h --loglevel=info
  depends_on:
    - redis
    - db

celery-worker-3:
  build:
    context: ./backend
    dockerfile: Dockerfile.prod
  command: celery -A celery_app worker --hostname=worker3@%h --loglevel=info
  depends_on:
    - redis
    - db

# Or use Kubernetes for true horizontal scaling
```

#### Queue Prioritization

```python
# celery_app.py - Route different task types to different workers

celery_app.conf.task_routes = {
    'tasks.workflow_tasks.execute_workflow': {'queue': 'workflows'},
    'tasks.llm_tasks.generate_copy': {'queue': 'high_priority'},
    'tasks.image_tasks.generate_image': {'queue': 'gpu_jobs'},
}

# Start workers for each queue
# Worker 1: celery -A celery_app worker -Q workflows
# Worker 2: celery -A celery_app worker -Q high_priority --concurrency=8
# Worker 3: celery -A celery_app worker -Q gpu_jobs --concurrency=2 (with GPU)
```

#### Monitoring with Celery Flower

```yaml
# Add to docker-compose.yml

flower:
  image: mher/flower
  command: celery -A celery_app flower --port=5555
  ports:
    - "5555:5555"
  depends_on:
    - redis
    - celery-worker
  environment:
    CELERY_BROKER_URL: redis://redis:6379/0
    CELERY_RESULT_BACKEND: redis://redis:6379/1
```

Visit `http://localhost:5555` for real-time task monitoring, worker stats, and task history.

### Performance Tuning

**Worker Concurrency:**
```bash
# CPU-bound workflows (topological sort, DAG processing)
celery -A celery_app worker --concurrency=<num_cpu_cores>

# I/O-bound workflows (API calls, waiting for responses)
celery -A celery_app worker --concurrency=<4_to_8_per_core> --pool=prefork
```

**Redis Performance:**
```bash
# In docker-compose.yml or redis config file
redis-server --maxmemory 2gb --maxmemory-policy allkeys-lru

# Monitor with
redis-cli --latency
redis-cli --stat
redis-cli MEMORY DOCTOR
```

**PostgreSQL Tuning:**
```sql
-- Connection pooling (recommended)
-- Use PgBouncer or connection pooling in ORM

-- For workflow queries with many JOINs
CREATE INDEX idx_workflow_execution_status
ON workflow_executions(status, created_at DESC);

CREATE INDEX idx_agent_job_execution
ON agent_jobs(execution_id, status);

-- Analyze query plans
EXPLAIN ANALYZE
SELECT * FROM workflow_executions
WHERE status = 'running' AND created_at > NOW() - INTERVAL '24 hours';
```

### Example Production Deployment (Kubernetes)

```yaml
# k8s/celery-worker-deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: celery-worker
spec:
  replicas: 3
  selector:
    matchLabels:
      app: celery-worker
  template:
    metadata:
      labels:
        app: celery-worker
    spec:
      containers:
      - name: celery
        image: xtyl/backend:latest
        command:
        - celery
        - -A
        - celery_app
        - worker
        - --loglevel=info
        - --concurrency=4
        env:
        - name: CELERY_BROKER_URL
          valueFrom:
            configMapKeyRef:
              name: celery-config
              key: broker_url
        - name: CELERY_RESULT_BACKEND
          valueFrom:
            configMapKeyRef:
              name: celery-config
              key: result_backend
        resources:
          limits:
            cpu: 2
            memory: 2Gi
          requests:
            cpu: 1
            memory: 1Gi
        livenessProbe:
          exec:
            command:
            - celery
            - -A
            - celery_app
            - inspect
            - ping
          initialDelaySeconds: 30
          periodSeconds: 30
```

### Monitoring Metrics

**Key Metrics to Track:**

```python
# Use Prometheus + Grafana

from prometheus_client import Counter, Histogram, Gauge
import time

# Task execution metrics
task_execution_time = Histogram(
    'celery_task_execution_seconds',
    'Task execution time in seconds',
    ['task_name']
)

task_failures = Counter(
    'celery_task_failures_total',
    'Total task failures',
    ['task_name', 'error_type']
)

workflow_progress = Gauge(
    'workflow_execution_progress_percent',
    'Workflow execution progress',
    ['execution_id']
)

# Use in workflow execution
with task_execution_time.labels(task_name='execute_workflow').time():
    result = await execute_workflow(execution_id, db)
```

### Health Checks

**Celery Worker Health:**
```bash
# Check if worker is alive
celery -A celery_app inspect ping

# Check active tasks
celery -A celery_app inspect active

# Check scheduled tasks
celery -A celery_app inspect scheduled
```

**API Health Endpoint:**
```python
from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health_check(db: Session = Depends(get_db), redis_client = Depends(get_redis)):
    """Check API and dependency health"""

    try:
        # Check database
        db.execute("SELECT 1")

        # Check Redis
        await redis_client.ping()

        # Check Celery
        celery_app.control.inspect().ping()

        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }, 503
```

---

## Summary: Quick Reference

### Core Technologies
- **Celery 5.3.4**: Async task queue
- **Redis**: Fast broker + result backend
- **PostgreSQL**: Permanent state storage
- **FastAPI**: REST API + SSE streaming
- **Python 3.11+**: Async/await support

### Design Patterns
1. **DatabaseTask**: Base class for DB session management
2. **WorkflowStateManager**: Hybrid Redis + PostgreSQL caching
3. **ResumableWorkflowEngine**: Checkpoint-based resumption
4. **TopologicalSorter**: Kahn's algorithm for DAG ordering
5. **Error Classification**: Transient/Permanent/Partial framework
6. **exponential_backoff**: Retry decorator with jitter

### File Locations
- `/backend/celery_app.py` - Celery configuration
- `/backend/tasks/workflow_tasks.py` - Task definitions
- `/backend/services/workflow_engine.py` - Execution engine
- `/backend/services/workflow_validator.py` - Cycle detection
- `/docker-compose.yml` - Production setup

### Production Readiness Checklist

- [x] Celery 5.3.4 with Redis broker/backend
- [x] Task acknowledgment after completion (prevents data loss)
- [x] Worker settings (max_tasks_per_child, prefetch_multiplier)
- [x] Database connection pooling via DatabaseTask
- [x] Workflow validation (cycle detection)
- [x] Topological sort for node ordering
- [ ] SSE streaming for real-time updates (ready to implement)
- [ ] State persistence (Redis + PostgreSQL)
- [ ] Pause/resume with checkpointing (ready to implement)
- [ ] Exponential backoff retry logic (ready to implement)
- [ ] Monitoring (Flower, metrics, health checks)
- [ ] Horizontal scaling (multi-worker setup)
- [ ] Error classification and logging

---

## References

**Celery Documentation:**
- https://docs.celeryproject.io/en/stable/
- https://docs.celeryproject.io/en/stable/userguide/tasks.html
- https://docs.celeryproject.io/en/stable/userguide/workers.html

**FastAPI + Celery:**
- https://fastapi.tiangolo.com/advanced/background-tasks/
- Pattern: Use Celery for long-running, not FastAPI background tasks

**Redis Best Practices:**
- https://redis.io/commands/
- Use Redis for cache layer, PostgreSQL for durability
- Set TTL on all keys to prevent memory exhaustion

**Topological Sort:**
- Kahn's Algorithm (BFS-based): O(V + E) time, stable
- DFS-based: Also O(V + E), can detect cycles during sort

**SSE:**
- MDN: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- Polling fallback for older browsers or firewalls

**Error Handling:**
- Classification pattern prevents retry of permanent errors
- Exponential backoff with jitter prevents thundering herd
- Partial failures pause workflow for human review

