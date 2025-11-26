# Celery + Redis Implementation Quick Start Guide

**For the XTYL Creativity Machine Workflow System**

---

## 1. Current State Inventory

### What's Already Implemented

```
✅ Celery 5.3.4 configured with Redis
   Location: backend/celery_app.py
   - Separate broker (Redis 0) and result backend (Redis 1)
   - Task serialization: JSON (not pickle - secure)
   - Acknowledgment: Late (task_acks_late=True)
   - Rate limiting: 10 tasks/minute default

✅ Task definitions with database session management
   Location: backend/tasks/workflow_tasks.py
   - DatabaseTask base class (proper connection pooling)
   - execute_workflow task
   - pause_workflow, resume_workflow, stop_workflow tasks

✅ Workflow execution engine
   Location: backend/services/workflow_engine.py
   - State transitions (pending → running → completed/failed)
   - Progress tracking (progress_percent)
   - Node execution sequencing
   - Current node tracking (current_node_id)

✅ Workflow validation with cycle detection
   Location: backend/services/workflow_validator.py
   - DFS-based cycle detection
   - Edge/node validation
   - Connectivity validation

✅ Node execution dispatcher
   Location: backend/services/node_executor.py
   - Handlers for: generate_copy, generate_image, attach, review, parallel, conditional
   - AgentJob tracking (execution log per node)

✅ Docker setup
   Location: docker-compose.yml
   - Celery worker service
   - Redis service
   - PostgreSQL service
   - Backend service (FastAPI)
```

### What Needs Implementation

```
[ ] SSE streaming for real-time progress updates
    → Implementation: /api/workflows/{execution_id}/stream

[ ] State persistence layer (Redis + PostgreSQL hybrid)
    → Implementation: WorkflowStateManager service

[ ] Resumable execution with node-level checkpointing
    → Implementation: ResumableWorkflowEngine service

[ ] Topological sort for DAG node ordering
    → Implementation: TopologicalSorter service

[ ] Error classification and exponential backoff retry
    → Implementation: Error classification + decorator

[ ] Flower monitoring dashboard
    → Add to docker-compose.yml

[ ] Production-grade logging with structured context
    → Integration with existing backend
```

---

## 2. Implementation Roadmap

### Phase 1: Foundation (Week 1)

#### Task 1.1: Create TopologicalSorter Service
**File:** `backend/services/topological_sort.py`
```python
from typing import List, Dict, Any
from collections import deque

class TopologicalSorter:
    @staticmethod
    def kahn_sort(nodes: List[Dict], edges: List[Dict]) -> List[Dict]:
        """Kahn's algorithm - O(V+E)"""
        # Build graph
        graph = {node["id"]: [] for node in nodes}
        in_degree = {node["id"]: 0 for node in nodes}

        for edge in edges:
            graph[edge["source"]].append(edge["target"])
            in_degree[edge["target"]] += 1

        # BFS from nodes with no dependencies
        queue = deque([n for n in nodes if in_degree[n["id"]] == 0])
        sorted_nodes = []

        while queue:
            node = queue.popleft()
            sorted_nodes.append(node)

            for neighbor_id in graph[node["id"]]:
                in_degree[neighbor_id] -= 1
                if in_degree[neighbor_id] == 0:
                    neighbor = next((n for n in nodes if n["id"] == neighbor_id))
                    queue.append(neighbor)

        if len(sorted_nodes) != len(nodes):
            raise ValueError("Cycle detected")

        return sorted_nodes

    @staticmethod
    def get_execution_levels(nodes: List[Dict], edges: List[Dict]) -> Dict[str, int]:
        """Map each node to execution level (for parallelization)"""
        levels = {node["id"]: 0 for node in nodes}
        in_degree = {node["id"]: 0 for node in nodes}
        graph = {node["id"]: [] for node in nodes}

        for edge in edges:
            graph[edge["source"]].append(edge["target"])
            in_degree[edge["target"]] += 1

        queue = deque([n["id"] for n in nodes if in_degree[n["id"]] == 0])

        while queue:
            node_id = queue.popleft()
            for neighbor_id in graph[node_id]:
                levels[neighbor_id] = max(levels[neighbor_id], levels[node_id] + 1)
                in_degree[neighbor_id] -= 1
                if in_degree[neighbor_id] == 0:
                    queue.append(neighbor_id)

        return levels
```

**Integration in workflow_engine.py:**
```python
from services.topological_sort import TopologicalSorter

async def execute_workflow(...):
    # Replace current _build_execution_order with:
    node_order = TopologicalSorter.kahn_sort(
        nodes=[n for n in template.nodes_json if n.get("type") not in ["start", "end"]],
        edges=template.edges_json
    )
```

**Tests:**
```python
def test_topological_sort():
    nodes = [
        {"id": "node1", "type": "start"},
        {"id": "node2", "type": "generate_copy"},
        {"id": "node3", "type": "generate_image"},
        {"id": "node4", "type": "attach"},
    ]
    edges = [
        {"source": "node1", "target": "node2"},
        {"source": "node1", "target": "node3"},
        {"source": "node2", "target": "node4"},
        {"source": "node3", "target": "node4"},
    ]

    order = TopologicalSorter.kahn_sort(nodes, edges)
    assert order[0]["id"] == "node1"
    assert order[-1]["id"] == "node4"
```

---

#### Task 1.2: Create Error Classification System
**File:** `backend/services/error_handler.py`
```python
from enum import Enum
from typing import Optional, Callable
from functools import wraps
import asyncio
import logging

logger = logging.getLogger(__name__)

class ErrorClass(Enum):
    TRANSIENT = "transient"    # Retry (network, timeout, rate limit)
    PERMANENT = "permanent"    # No retry (validation, auth, 404)
    PARTIAL = "partial"        # Pause workflow (review needed)

class WorkflowException(Exception):
    def __init__(
        self,
        message: str,
        error_class: ErrorClass,
        retryable: bool = False,
        node_id: Optional[str] = None
    ):
        self.message = message
        self.error_class = error_class
        self.retryable = retryable
        self.node_id = node_id
        super().__init__(message)

def exponential_backoff(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    jitter: bool = True
):
    """Exponential backoff with jitter"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except WorkflowException as e:
                    if not e.retryable or attempt == max_retries:
                        raise

                    delay = min(base_delay * (2 ** attempt), max_delay)
                    if jitter:
                        import random
                        delay *= (0.5 + random.random())

                    logger.warning(f"Retry {func.__name__} in {delay:.1f}s: {e.message}")
                    await asyncio.sleep(delay)

        return wrapper
    return decorator

class TransientError(WorkflowException):
    def __init__(self, message: str, node_id: Optional[str] = None):
        super().__init__(message, ErrorClass.TRANSIENT, retryable=True, node_id=node_id)

class PermanentError(WorkflowException):
    def __init__(self, message: str, node_id: Optional[str] = None):
        super().__init__(message, ErrorClass.PERMANENT, retryable=False, node_id=node_id)

class PartialFailureError(WorkflowException):
    def __init__(self, message: str, node_id: Optional[str] = None):
        super().__init__(message, ErrorClass.PARTIAL, retryable=False, node_id=node_id)
```

**Usage Example:**
```python
from services.error_handler import exponential_backoff, TransientError, PermanentError

@exponential_backoff(max_retries=3, base_delay=1.0)
async def call_external_api(prompt: str):
    # If timeout → TransientError → retry
    # If 404 → PermanentError → fail immediately
    # If rate limit → TransientError → retry with backoff
    pass
```

---

#### Task 1.3: Update workflow_engine.py to use TopologicalSorter
**File modifications:** `backend/services/workflow_engine.py`

```python
# Add import
from services.topological_sort import TopologicalSorter

# Replace _build_execution_order function
def _build_execution_order(nodes: list, edges: list) -> list:
    """Build node execution order using topological sort"""
    executable_nodes = [n for n in nodes if n.get("type") not in ["start", "end"]]
    if not executable_nodes:
        return []
    return TopologicalSorter.kahn_sort(executable_nodes, edges)
```

---

### Phase 2: State Management (Week 2)

#### Task 2.1: Create WorkflowStateManager
**File:** `backend/services/state_manager.py`
```python
import redis
import json
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from models import WorkflowExecution
from datetime import datetime

class WorkflowStateManager:
    """Hybrid Redis + PostgreSQL state management"""

    CACHE_PREFIX = "workflow:"
    CACHE_TTL = 86400  # 24 hours

    def __init__(self, redis_client: redis.Redis, db: Session):
        self.redis = redis_client
        self.db = db

    def get_state(self, execution_id: str) -> Optional[dict]:
        """Get state from cache, fallback to DB"""
        cache_key = f"{self.CACHE_PREFIX}{execution_id}"
        cached = self.redis.get(cache_key)

        if cached:
            return json.loads(cached)

        execution = self.db.query(WorkflowExecution).filter(
            WorkflowExecution.id == execution_id
        ).first()

        if execution:
            state = self._execution_to_state(execution)
            self.redis.setex(cache_key, self.CACHE_TTL, json.dumps(state))
            return state

        return None

    def update_state(
        self,
        execution_id: str,
        status: str,
        progress_percent: int,
        current_node_id: Optional[str] = None
    ):
        """Update state in cache and DB"""
        cache_key = f"{self.CACHE_PREFIX}{execution_id}"
        state = {
            "execution_id": execution_id,
            "status": status,
            "progress_percent": progress_percent,
            "current_node_id": current_node_id,
            "updated_at": datetime.utcnow().isoformat()
        }

        # Update cache
        self.redis.setex(cache_key, self.CACHE_TTL, json.dumps(state))

        # Update DB
        execution = self.db.query(WorkflowExecution).filter(
            WorkflowExecution.id == execution_id
        ).first()

        if execution:
            execution.status = status
            execution.progress_percent = progress_percent
            execution.current_node_id = current_node_id
            self.db.commit()

    def save_node_output(self, execution_id: str, node_id: str, output: dict):
        """Save node output for variable interpolation"""
        cache_key = f"{self.CACHE_PREFIX}{execution_id}:outputs"
        outputs = self.redis.get(cache_key) or {}

        if isinstance(outputs, bytes):
            outputs = json.loads(outputs)

        outputs[node_id] = {
            "data": output,
            "completed_at": datetime.utcnow().isoformat()
        }

        self.redis.setex(cache_key, self.CACHE_TTL, json.dumps(outputs))

    def get_node_outputs(self, execution_id: str) -> dict:
        """Get all completed node outputs"""
        cache_key = f"{self.CACHE_PREFIX}{execution_id}:outputs"
        cached = self.redis.get(cache_key)
        return json.loads(cached) if cached else {}

    @staticmethod
    def _execution_to_state(execution: WorkflowExecution) -> dict:
        return {
            "execution_id": execution.id,
            "status": execution.status,
            "progress_percent": execution.progress_percent,
            "current_node_id": execution.current_node_id,
            "updated_at": execution.updated_at.isoformat() if execution.updated_at else None
        }
```

**Integration:** Update `workflow_engine.py` to use StateManager for persistence.

---

#### Task 2.2: Add SSE Streaming Endpoint
**File:** `backend/routers/executions.py` (new file)
```python
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
import json
import asyncio
from typing import AsyncGenerator
from services.state_manager import WorkflowStateManager
from database import get_db, get_redis

router = APIRouter(prefix="/workflows/executions", tags=["workflows"])

@router.get("/{execution_id}/stream")
async def stream_execution(
    execution_id: str,
    db = Depends(get_db),
    redis_client = Depends(get_redis)
) -> StreamingResponse:
    """Stream execution progress via SSE"""

    async def event_generator() -> AsyncGenerator[str, None]:
        state_manager = WorkflowStateManager(redis_client, db)
        last_seen = None

        while True:
            try:
                state = state_manager.get_state(execution_id)

                if not state:
                    raise HTTPException(404, "Execution not found")

                if state != last_seen:
                    yield f"data: {json.dumps(state)}\n\n"
                    last_seen = state

                    if state["status"] in ["completed", "failed", "stopped"]:
                        yield f"event: done\ndata: {json.dumps(state)}\n\n"
                        break

                await asyncio.sleep(0.5)

            except Exception as e:
                yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
                break

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
```

**Add to main.py:**
```python
from routers.executions import router as executions_router

app.include_router(executions_router)
```

---

### Phase 3: Resumable Execution (Week 3)

#### Task 3.1: Create ResumableWorkflowEngine
**File:** `backend/services/resumable_workflow.py`
```python
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from models import WorkflowExecution, AgentJob
from services.workflow_engine import execute_workflow, handle_workflow_state_transition
from services.node_executor import execute_node
from services.topological_sort import TopologicalSorter
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ResumableWorkflowEngine:
    """Handles pause/resume with node-level checkpointing"""

    async def execute_or_resume(
        self,
        execution_id: str,
        db: Session,
        resume: bool = False
    ) -> WorkflowExecution:
        """Execute or resume a workflow"""
        execution = db.query(WorkflowExecution).filter(
            WorkflowExecution.id == execution_id
        ).first()

        if not execution:
            raise ValueError(f"Execution {execution_id} not found")

        template = execution.template
        node_order = TopologicalSorter.kahn_sort(
            [n for n in template.nodes_json if n.get("type") not in ["start", "end"]],
            template.edges_json
        )

        # Determine start point
        if resume:
            start_idx = self._find_next_pending_node_index(execution, node_order, db)
        else:
            start_idx = 0
            await handle_workflow_state_transition(execution, "running", db)

        # Load previous outputs
        node_outputs = self._load_node_outputs(execution, db)

        # Execute nodes
        for idx in range(start_idx, len(node_order)):
            node = node_order[idx]
            execution.current_node_id = node["id"]
            execution.progress_percent = int((idx / len(node_order)) * 100)
            db.commit()

            try:
                result = await self._execute_node_once(node, execution, db, node_outputs)
                node_outputs[node["id"]] = result

            except Exception as e:
                logger.error(f"Node {node['id']} failed: {e}")
                execution.status = "failed"
                execution.error_message = str(e)
                db.commit()
                raise

        # Mark complete
        execution.status = "completed"
        execution.progress_percent = 100
        execution.completed_at = datetime.utcnow()
        db.commit()

        return execution

    async def _execute_node_once(
        self,
        node: Dict[str, Any],
        execution: WorkflowExecution,
        db: Session,
        node_outputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute node if not already done (idempotent)"""
        existing = db.query(AgentJob).filter(
            AgentJob.execution_id == execution.id,
            AgentJob.node_id == node["id"],
            AgentJob.status == "completed"
        ).first()

        if existing and existing.output_data_json:
            logger.info(f"Node {node['id']} already completed, skipping")
            return existing.output_data_json

        return await execute_node(node, execution, db)

    def _find_next_pending_node_index(
        self,
        execution: WorkflowExecution,
        node_order: List[Dict[str, Any]],
        db: Session
    ) -> int:
        """Find first incomplete node"""
        completed = db.query(AgentJob).filter(
            AgentJob.execution_id == execution.id,
            AgentJob.status == "completed"
        ).all()

        completed_ids = {job.node_id for job in completed}

        for idx, node in enumerate(node_order):
            if node["id"] not in completed_ids:
                return idx

        return len(node_order)

    @staticmethod
    def _load_node_outputs(execution: WorkflowExecution, db: Session) -> Dict[str, Any]:
        """Load outputs from completed nodes"""
        jobs = db.query(AgentJob).filter(
            AgentJob.execution_id == execution.id,
            AgentJob.status == "completed"
        ).all()

        return {job.node_id: job.output_data_json for job in jobs if job.output_data_json}
```

**Pause/Resume API endpoints:**
```python
# In routers/executions.py

@router.post("/{execution_id}/pause")
async def pause_execution(execution_id: str, db: Session = Depends(get_db)):
    execution = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id
    ).first()

    if not execution or execution.status != "running":
        raise HTTPException(400, "Cannot pause this execution")

    execution.status = "paused"
    db.commit()

    return {"message": "Paused", "execution_id": execution_id}

@router.post("/{execution_id}/resume")
async def resume_execution(execution_id: str, db: Session = Depends(get_db)):
    execution = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id
    ).first()

    if not execution or execution.status != "paused":
        raise HTTPException(400, "Cannot resume this execution")

    # Re-queue with resume flag
    from celery_app import celery_app
    task = celery_app.send_task(
        "tasks.workflow_tasks.execute_workflow",
        args=[execution_id],
        kwargs={"resume": True}
    )

    execution.status = "running"
    execution.celery_task_id = task.id
    db.commit()

    return {"message": "Resumed", "execution_id": execution_id, "task_id": task.id}
```

---

### Phase 4: Monitoring & Production (Week 4)

#### Task 4.1: Add Flower Monitoring
**Add to docker-compose.yml:**
```yaml
flower:
  image: mher/flower
  command: celery -A celery_app flower --port=5555
  ports:
    - "5555:5555"
  depends_on:
    - redis
    - celery-worker
  environment:
    CELERY_BROKER_URL: ${CELERY_BROKER_URL}
    CELERY_RESULT_BACKEND: ${CELERY_RESULT_BACKEND}
```

Access at `http://localhost:5555` for real-time monitoring.

---

#### Task 4.2: Add Structured Logging
**File:** `backend/logging_config.py`
```python
import structlog
import logging

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

# Use in code:
logger = structlog.get_logger()
logger.info("workflow_started", execution_id="...", template_id="...")
logger.error("node_failed", execution_id="...", node_id="...", error="...")
```

---

## 3. Testing Checklist

```bash
# Unit tests
pytest backend/tests/test_topological_sort.py
pytest backend/tests/test_state_manager.py
pytest backend/tests/test_resumable_workflow.py

# Integration tests
pytest backend/tests/test_workflow_execution.py
pytest backend/tests/test_error_handling.py

# Manual testing
# 1. Start all services
docker-compose up

# 2. Create workflow execution
curl -X POST http://localhost:8000/api/workflows/executions \
  -H "Content-Type: application/json" \
  -d '{"template_id": "...", "project_id": "...", "config_json": {}}'

# 3. Stream progress
curl http://localhost:8000/api/workflows/executions/{id}/stream

# 4. Pause
curl -X POST http://localhost:8000/api/workflows/executions/{id}/pause

# 5. Resume
curl -X POST http://localhost:8000/api/workflows/executions/{id}/resume

# 6. Monitor in Flower
open http://localhost:5555
```

---

## 4. Key Code Locations

```
├── backend/
│   ├── celery_app.py                      ← Celery configuration
│   ├── main.py                             ← FastAPI app (add executions_router)
│   ├── tasks/
│   │   └── workflow_tasks.py               ← Task definitions
│   ├── routers/
│   │   ├── workflows.py                    ← Template management
│   │   └── executions.py                   ← NEW: Execution endpoints
│   ├── services/
│   │   ├── workflow_engine.py              ← Execution orchestration
│   │   ├── workflow_validator.py           ← Cycle detection
│   │   ├── node_executor.py                ← Node handlers
│   │   ├── topological_sort.py             ← NEW: Kahn's algorithm
│   │   ├── state_manager.py                ← NEW: Redis + PostgreSQL
│   │   ├── error_handler.py                ← NEW: Retry logic
│   │   └── resumable_workflow.py           ← NEW: Pause/resume
│   └── models.py
│       ├── WorkflowExecution
│       ├── WorkflowTemplate
│       └── AgentJob
└── docker-compose.yml                      ← Add Flower service
```

---

## 5. Production Deployment Checklist

```
Before going live:

[ ] All tests passing (unit + integration)
[ ] Celery worker healthcheck working
[ ] Redis TTL configured to prevent memory exhaustion
[ ] PostgreSQL indexes created for workflow queries
[ ] Monitoring (Flower) accessible
[ ] Logging configured with structured JSON output
[ ] Error alerts configured (Sentry or CloudWatch)
[ ] Database backups automated
[ ] Rate limiting tuned for expected load
[ ] Worker concurrency tuned (CPU cores)
[ ] Load testing completed (concurrent workflows)
[ ] Rollback plan documented
[ ] On-call runbook prepared
```

---

## 6. Performance Targets

**Execution benchmarks (single workflow):**
- Node execution: <100ms average
- Progress update: <50ms (Redis + SSE)
- Pause/resume: <500ms
- 1000 nodes: <5 minutes total

**Scalability targets:**
- 100 concurrent workflows
- 10 workers (each with 4 concurrency = 40 parallel tasks)
- <50ms p99 SSE latency
- <1GB Redis memory (24h TTL, reasonable state size)

**Cost targets:**
- Worker CPU: 80-90% utilization
- Redis memory: <80% capacity
- PostgreSQL: <50% connections used

