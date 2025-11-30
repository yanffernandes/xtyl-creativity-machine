# Autonomous Workflow System - Technical Research

**Feature ID:** 002-autonomous-workflow-system
**Research Date:** 2025-11-25
**Status:** Complete

## Executive Summary

This document captures the technical research conducted for building a visual workflow editor with async task execution. The system enables users to create multi-agent AI workflows using a drag-and-drop interface, with real-time progress tracking and document-image attachment management. Key decisions include adopting ReactFlow with custom glass morphism nodes, Celery chains/groups for orchestration, 2-second polling for progress updates, and a junction table pattern for document-image relationships.

---

## 1. ReactFlow Integration Research

### Research Findings

ReactFlow is a highly extensible React library for building node-based editors and interactive diagrams. The library's architecture separates presentation (nodes, edges) from business logic (state management, validation), making it ideal for complex workflow builders. After examining the ReactFlow documentation, community examples, and performance benchmarks, several key patterns emerged for building production-grade workflow editors.

Custom node development is the cornerstone of ReactFlow extensibility. The library provides a `<Handle>` component for connection points and supports both controlled and uncontrolled node patterns. For our use case, we need custom nodes representing AI agents (Content Strategist, SEO Specialist, Creative Director, etc.) with dynamic input/output handles based on agent capabilities. The recommended approach is to create a base `WorkflowNode` component that handles common logic (connection validation, drag behavior, selection states) and specialized components for each agent type that extend this base.

State management in ReactFlow applications typically follows one of three patterns: (1) storing complete workflow state in ReactFlow's internal store using `useNodesState` and `useEdgesState` hooks, (2) lifting state to a parent component or global store (Redux/Zustand), or (3) hybrid approaches where ReactFlow manages UI state while business logic resides externally. For complex workflows with validation, versioning, and API synchronization requirements, the hybrid approach offers the best balance. We'll use ReactFlow's hooks for immediate UI responsiveness while maintaining a Zustand store for workflow metadata, validation rules, and API state.

### Alternatives Considered

**Alternative 1: Raw SVG/Canvas Implementation**
Building a custom node editor from scratch using SVG or Canvas API would provide maximum control but requires significant engineering effort for features ReactFlow provides out-of-box (zoom, pan, minimap, node selection, edge routing). Development time estimated at 4-6 weeks vs 1-2 weeks with ReactFlow. Rejected due to time constraints and maintenance burden.

**Alternative 2: Rete.js**
Rete.js is another node editor framework with a plugin architecture. While powerful, it's framework-agnostic (not React-optimized) and has a steeper learning curve. ReactFlow's React-first design integrates better with our Next.js stack and provides better TypeScript support. Rete.js documentation is also less comprehensive.

**Alternative 3: Flume**
Flume is a React-based node editor similar to ReactFlow but with a more opinionated API. It enforces specific patterns for node configuration and port types, which could simplify development but reduces flexibility. Our requirement for highly customized agent nodes with dynamic capabilities favors ReactFlow's unopinionated approach.

### Final Decision + Rationale

**Decision:** Use ReactFlow with custom nodes featuring glass morphism styling, hybrid state management (ReactFlow + Zustand), and edge validation middleware.

**Rationale:**
1. **Production-Ready:** ReactFlow is battle-tested with 20k+ GitHub stars and used by companies like Stripe and Typeform
2. **React Integration:** First-class React support with hooks, TypeScript definitions, and Next.js compatibility
3. **Extensibility:** Custom node/edge components allow full design control while leveraging core features
4. **Performance:** Built-in optimization (viewport culling, memoization) handles workflows with 100+ nodes
5. **Community:** Active community, regular updates, extensive documentation, and plugin ecosystem

### Implementation Notes

**Custom Node Architecture:**
```typescript
// Base node component with common logic
interface BaseNodeProps {
  id: string;
  data: {
    label: string;
    agentType: AgentType;
    config: Record<string, any>;
    status?: 'idle' | 'running' | 'completed' | 'error';
  };
}

// Custom nodes extend base with agent-specific UI
const ContentStrategistNode: React.FC<NodeProps<BaseNodeProps>> = ({ data }) => {
  return (
    <div className="workflow-node glass-morphism">
      <Handle type="target" position={Position.Left} />
      <div className="node-header">{data.label}</div>
      <div className="node-body">
        {/* Agent-specific configuration UI */}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};
```

**Edge Validation Pattern:**
```typescript
// Validate connections before allowing edge creation
const isValidConnection = (connection: Connection) => {
  const sourceNode = nodes.find(n => n.id === connection.source);
  const targetNode = nodes.find(n => n.id === connection.target);

  // Check agent compatibility (e.g., ContentStrategist can only output to SEOSpecialist or CreativeDirector)
  return agentRegistry[sourceNode.type].validTargets.includes(targetNode.type);
};

<ReactFlow
  nodes={nodes}
  edges={edges}
  onConnect={onConnect}
  isValidConnection={isValidConnection}
/>
```

**State Management Pattern:**
```typescript
// Zustand store for workflow business logic
const useWorkflowStore = create<WorkflowState>((set) => ({
  workflowId: null,
  metadata: {},
  validationErrors: [],
  saveStatus: 'idle',

  actions: {
    saveWorkflow: async () => {
      // Sync ReactFlow state to backend
    },
    validateWorkflow: () => {
      // Run validation rules
    }
  }
}));

// ReactFlow component uses hybrid state
const WorkflowEditor = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { saveWorkflow } = useWorkflowStore(state => state.actions);

  // Debounced auto-save
  useEffect(() => {
    const timer = setTimeout(() => saveWorkflow(), 1000);
    return () => clearTimeout(timer);
  }, [nodes, edges]);
};
```

**Styling Approach:**
Use Tailwind CSS with custom utilities for glass morphism effect:
```css
.workflow-node {
  @apply backdrop-blur-md bg-white/10 border border-white/20 rounded-lg shadow-lg;
  @apply transition-all duration-200 hover:bg-white/15 hover:shadow-xl;
}

.workflow-node.running {
  @apply border-blue-400/50 shadow-blue-500/20;
  animation: pulse-glow 2s ease-in-out infinite;
}
```

**Performance Optimization:**
- Use `memo` for custom node components to prevent unnecessary re-renders
- Implement viewport culling for workflows with 50+ nodes
- Lazy load node configuration panels (only render when node is selected)
- Debounce auto-save to avoid excessive API calls

---

## 2. Celery Workflow Orchestration Research

### Research Findings

Celery is a distributed task queue that excels at orchestrating complex async workflows. The library provides several primitives for composing tasks: `chain` (sequential execution), `group` (parallel execution), `chord` (parallel tasks followed by callback), and `map` (task applied to multiple inputs). For multi-agent AI workflows, the challenge is modeling dependencies between agents while handling failures gracefully and persisting intermediate results.

The most robust pattern for AI agent orchestration is the "saga pattern" adapted for Celery. Each agent execution is a task that receives input, performs work (calls LLM API), and produces output. These tasks are composed into a workflow DAG using chains and groups. The critical insight is that workflow state must be stored externally (database, not just Celery result backend) because: (1) workflows may span hours/days as users review intermediate outputs, (2) we need queryable history for debugging, and (3) Celery's result backend has limited retention and query capabilities.

Error handling in Celery workflows requires a multi-layered approach. At the task level, use `autoretry_for` and `retry_kwargs` to handle transient failures (API rate limits, network errors). At the workflow level, implement a "compensating transaction" pattern where each task's failure triggers cleanup logic. For example, if the SEO Specialist agent fails, we mark the workflow as "failed" in the database, notify the user, and preserve partial results (Content Strategist output) for recovery. Celery's `on_failure` callback hooks enable this pattern.

### Alternatives Considered

**Alternative 1: Temporal.io**
Temporal is a modern workflow orchestration platform with strong consistency guarantees and a powerful DSL. It excels at long-running workflows with complex state management. However, it requires running separate infrastructure (Temporal server) and has a steeper learning curve. For our MVP, Celery + Redis provides sufficient capabilities with less operational overhead. We may migrate to Temporal if workflow complexity grows significantly.

**Alternative 2: Airflow**
Apache Airflow is designed for data pipeline orchestration with a DAG-based model. While conceptually similar to our workflow needs, Airflow is heavyweight (requires PostgreSQL, scheduler, webserver) and optimized for batch ETL, not interactive user-driven workflows. Airflow's scheduling model assumes workflows run on a cron, whereas our workflows are triggered by user actions. Celery's lightweight task queue model is a better fit.

**Alternative 3: AWS Step Functions**
AWS Step Functions provides managed workflow orchestration with visual editing and robust state machines. It's a strong option for cloud-native architectures but introduces vendor lock-in and increases cost (charged per state transition). Our self-hosted approach with Celery offers more flexibility and lower operational costs for startups.

**Alternative 4: Custom Queue + Worker**
Building a custom task queue using Redis lists and worker processes would give complete control but requires implementing retry logic, result storage, monitoring, and failure recovery from scratch. Celery provides these as battle-tested primitives, reducing development risk.

### Final Decision + Rationale

**Decision:** Use Celery with chains for sequential agent execution, groups for parallel tasks, and external database state persistence. Implement saga pattern with compensating transactions for error handling.

**Rationale:**
1. **Lightweight Infrastructure:** Celery + Redis are already common in Python stacks, minimal ops burden
2. **Flexible Composition:** Chain/group primitives map naturally to workflow DAG structure
3. **Proven at Scale:** Celery powers workflows at Instagram, Mozilla, and other high-scale systems
4. **Python Ecosystem:** Seamless integration with LangChain, OpenAI SDK, and other AI libraries
5. **Developer Experience:** Extensive documentation, debugging tools (Flower), and community support

### Implementation Notes

**Task Definition Pattern:**
```python
from celery import Task, chain, group
from typing import Dict, Any

class AgentTask(Task):
    """Base task class for AI agent execution."""

    autoretry_for = (RateLimitError, NetworkError)
    retry_kwargs = {'max_retries': 3, 'countdown': 5}

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Handle task failure with compensating transaction."""
        workflow_id = kwargs.get('workflow_id')

        # Update workflow status in database
        db.session.query(Workflow).filter_by(id=workflow_id).update({
            'status': 'failed',
            'error_message': str(exc),
            'failed_at': datetime.utcnow()
        })

        # Notify user via websocket or email
        notify_workflow_failure(workflow_id, str(exc))

        db.session.commit()

@celery.task(base=AgentTask, bind=True)
def execute_content_strategist(self, workflow_id: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
    """Execute Content Strategist agent."""

    # Update task status
    self.update_state(state='PROGRESS', meta={'step': 'initializing'})

    # Fetch workflow configuration
    workflow = db.session.query(Workflow).get(workflow_id)
    agent_config = workflow.get_agent_config('content_strategist')

    # Execute LLM call
    self.update_state(state='PROGRESS', meta={'step': 'executing'})
    result = call_openai_api(
        prompt=agent_config['prompt_template'].format(**input_data),
        model=agent_config['model'],
        temperature=agent_config['temperature']
    )

    # Store result in database (not just Celery result backend)
    workflow_result = WorkflowResult(
        workflow_id=workflow_id,
        agent_type='content_strategist',
        output=result['content'],
        tokens_used=result['usage']['total_tokens'],
        completed_at=datetime.utcnow()
    )
    db.session.add(workflow_result)
    db.session.commit()

    self.update_state(state='PROGRESS', meta={'step': 'completed'})

    return {
        'agent': 'content_strategist',
        'output': result['content'],
        'result_id': workflow_result.id
    }
```

**Workflow Composition Pattern:**
```python
def execute_workflow(workflow_id: str, input_data: Dict[str, Any]):
    """
    Compose and execute a multi-agent workflow.

    Example workflow DAG:

    Content Strategist
           |
           v
    +------+------+
    |             |
    v             v
    SEO      Creative
    Specialist  Director
    |             |
    +------+------+
           |
           v
    Final Review Agent
    """

    # Sequential: Content Strategist first
    content_strategy_task = execute_content_strategist.si(
        workflow_id=workflow_id,
        input_data=input_data
    )

    # Parallel: SEO and Creative Director run simultaneously
    parallel_tasks = group(
        execute_seo_specialist.s(workflow_id=workflow_id),
        execute_creative_director.s(workflow_id=workflow_id)
    )

    # Sequential: Final review after parallel tasks complete
    final_review_task = execute_final_review.s(workflow_id=workflow_id)

    # Compose workflow using chain and chord
    workflow = chain(
        content_strategy_task,
        parallel_tasks,
        final_review_task
    )

    # Execute asynchronously
    result = workflow.apply_async()

    # Store Celery task ID for status tracking
    db.session.query(Workflow).filter_by(id=workflow_id).update({
        'celery_task_id': result.id,
        'status': 'running',
        'started_at': datetime.utcnow()
    })
    db.session.commit()

    return result.id
```

**State Persistence Strategy:**
```python
# Database models for workflow state
class Workflow(Base):
    __tablename__ = 'workflows'

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey('users.id'))
    name = Column(String)
    definition = Column(JSON)  # ReactFlow nodes/edges
    status = Column(Enum('draft', 'running', 'paused', 'completed', 'failed'))
    celery_task_id = Column(String, index=True)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    error_message = Column(Text)

class WorkflowResult(Base):
    __tablename__ = 'workflow_results'

    id = Column(String, primary_key=True)
    workflow_id = Column(String, ForeignKey('workflows.id'))
    agent_type = Column(String)
    input = Column(JSON)
    output = Column(JSON)
    tokens_used = Column(Integer)
    execution_time_ms = Column(Integer)
    completed_at = Column(DateTime)
```

**Error Recovery Pattern:**
```python
@celery.task(base=AgentTask, bind=True)
def execute_agent_with_recovery(self, workflow_id: str, agent_type: str, input_data: Dict):
    """Execute agent with checkpoint-based recovery."""

    try:
        # Check if this agent already completed (recovery scenario)
        existing_result = db.session.query(WorkflowResult).filter_by(
            workflow_id=workflow_id,
            agent_type=agent_type
        ).first()

        if existing_result:
            logger.info(f"Agent {agent_type} already completed, returning cached result")
            return existing_result.output

        # Execute agent logic
        result = execute_agent_logic(agent_type, input_data)

        # Checkpoint result
        save_workflow_result(workflow_id, agent_type, result)

        return result

    except Exception as exc:
        # Log failure for debugging
        logger.exception(f"Agent {agent_type} failed in workflow {workflow_id}")

        # Re-raise to trigger Celery retry logic
        raise self.retry(exc=exc)
```

**Configuration Best Practices:**
```python
# celeryconfig.py
broker_url = 'redis://localhost:6379/0'
result_backend = 'redis://localhost:6379/1'

# Task routing: separate queues for different agent types
task_routes = {
    'tasks.execute_content_strategist': {'queue': 'content_agents'},
    'tasks.execute_seo_specialist': {'queue': 'seo_agents'},
    'tasks.execute_creative_director': {'queue': 'creative_agents'},
}

# Rate limiting: prevent API abuse
task_annotations = {
    'tasks.execute_*': {'rate_limit': '10/m'}  # 10 tasks per minute per agent
}

# Result expiration: clean up old results
result_expires = 3600  # 1 hour (long-term storage in database)

# Worker configuration
worker_prefetch_multiplier = 1  # One task at a time for long-running agents
worker_max_tasks_per_child = 50  # Restart workers to prevent memory leaks
```

---

## 3. Real-time Progress Tracking Research

### Research Findings

Real-time progress tracking is critical for user experience in long-running workflows. Users need visibility into which agents are executing, what stage each task is in, and estimated completion times. The two primary approaches are polling (client periodically requests status) and WebSockets (server pushes updates). Each has distinct trade-offs for our use case.

Polling is simpler to implement and more compatible with serverless architectures. The client makes GET requests at regular intervals (e.g., every 2 seconds) to a status endpoint that queries the database for workflow state. The key challenge is balancing polling frequency with server load. Too frequent polling wastes resources; too infrequent polling creates a sluggish UX. Research from Nielsen Norman Group suggests that users perceive systems as "instant" with <100ms latency, "responsive" at 100ms-1s, and "acceptable" at 1-10s. For workflow progress, 2-second polling provides a good balance: users see updates quickly enough to feel informed without overwhelming the server.

WebSockets enable true real-time updates with server-push architecture. When a Celery task updates its state, the worker can emit an event over a WebSocket connection, and the client receives the update immediately. This provides the best UX but introduces complexity: (1) maintaining long-lived WebSocket connections requires sticky sessions or Redis pub/sub for distributed systems, (2) WebSocket libraries (Socket.io, Django Channels) add dependencies, (3) error handling is more complex (reconnection logic, message ordering guarantees). For our MVP, the added complexity is not justified by UX gains over well-implemented polling.

Database query optimization is crucial for polling performance. A naive implementation queries the entire workflow state on each poll, including JSON aggregation of all task results. With 50 concurrent users polling every 2 seconds, this creates 1,500 queries/minute. Optimizations include: (1) adding database indexes on workflow_id and status columns, (2) using partial indexes to query only "running" workflows, (3) implementing query result caching with Redis (cache workflow state for 1-2 seconds), and (4) using database connection pooling to amortize connection overhead.

### Alternatives Considered

**Alternative 1: WebSockets (Socket.io)**
WebSockets provide instant updates with server-push. Best for highly interactive applications (collaborative editing, multiplayer games). However, our workflows are long-running (minutes to hours) rather than highly interactive (sub-second updates). The added infrastructure complexity (sticky sessions, Socket.io server, reconnection logic) is not justified for workflows where 2-second latency is acceptable. We may adopt WebSockets in future if we add real-time collaboration features.

**Alternative 2: Server-Sent Events (SSE)**
SSE is a lighter-weight alternative to WebSockets for server-to-client streaming. Simpler than WebSockets (built on HTTP, easier to proxy) but still requires long-lived connections and similar infrastructure considerations. SSE is a good middle ground but shares many of WebSocket's deployment challenges (sticky sessions, connection limits). For our use case, polling is simpler with similar UX outcomes.

**Alternative 3: Long Polling**
Long polling is a hybrid where the client makes a request and the server holds the connection open until new data is available or a timeout occurs. This reduces request overhead compared to regular polling while avoiding WebSocket complexity. However, it still requires connection management, and timeouts can be tricky to tune. Modern polling with short intervals (2s) is more predictable and easier to debug.

**Alternative 4: GraphQL Subscriptions**
If we were already using GraphQL, subscriptions would provide a standardized way to handle real-time updates. However, our REST API architecture makes GraphQL subscriptions overkill. Subscriptions also require WebSocket infrastructure under the hood, so they share WebSocket's deployment challenges.

### Final Decision + Rationale

**Decision:** Implement 2-second polling with aggressive database query optimization (indexes, caching, connection pooling). Use Redis caching for workflow status to reduce database load.

**Rationale:**
1. **Simplicity:** Polling requires no persistent connections, works with any HTTP infrastructure
2. **Scalability:** Horizontal scaling is trivial (stateless API servers), no sticky session requirements
3. **Reliability:** HTTP retry logic is well-understood, no WebSocket reconnection edge cases
4. **Adequate UX:** 2-second latency is imperceptible for workflows that run minutes/hours
5. **Cost-Effective:** No additional infrastructure (WebSocket servers, Redis pub/sub) needed

### Implementation Notes

**Client-Side Polling Pattern:**
```typescript
// Custom React hook for workflow progress polling
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface WorkflowStatus {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  currentAgent: string | null;
  progress: number; // 0-100
  results: Record<string, any>;
  error?: string;
}

export const useWorkflowProgress = (workflowId: string) => {
  const { data, error, refetch } = useQuery<WorkflowStatus>({
    queryKey: ['workflow-progress', workflowId],
    queryFn: () => fetch(`/api/workflows/${workflowId}/status`).then(r => r.json()),
    refetchInterval: (data) => {
      // Stop polling when workflow completes
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      return 2000; // 2 second polling
    },
    refetchIntervalInBackground: true, // Continue polling even when tab is inactive
    staleTime: 1000, // Consider data stale after 1s
  });

  return {
    status: data,
    isLoading: !data && !error,
    error,
    refetch
  };
};

// Usage in component
const WorkflowProgressView = ({ workflowId }: { workflowId: string }) => {
  const { status, isLoading, error } = useWorkflowProgress(workflowId);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorView error={error} />;

  return (
    <div className="workflow-progress">
      <ProgressBar value={status.progress} />
      <div className="current-agent">
        {status.currentAgent && (
          <AgentIndicator agent={status.currentAgent} status="running" />
        )}
      </div>
      <ResultsPanel results={status.results} />
    </div>
  );
};
```

**Server-Side Status Endpoint with Caching:**
```python
from flask import Blueprint, jsonify
from flask_caching import Cache
from sqlalchemy import and_

workflow_bp = Blueprint('workflows', __name__)
cache = Cache(config={'CACHE_TYPE': 'redis', 'CACHE_REDIS_URL': 'redis://localhost:6379/2'})

@workflow_bp.route('/api/workflows/<workflow_id>/status')
@cache.cached(timeout=2, key_prefix=lambda: f"workflow_status:{workflow_id}")
def get_workflow_status(workflow_id: str):
    """
    Get current workflow status with aggressive caching.

    Cache key: workflow_status:{workflow_id}
    TTL: 2 seconds (matches polling interval)
    """

    # Optimized query: only fetch necessary columns
    workflow = db.session.query(
        Workflow.id,
        Workflow.status,
        Workflow.started_at,
        Workflow.celery_task_id
    ).filter(Workflow.id == workflow_id).first()

    if not workflow:
        return jsonify({'error': 'Workflow not found'}), 404

    # Calculate progress based on completed agents
    total_agents = get_agent_count(workflow_id)
    completed_agents = db.session.query(WorkflowResult).filter(
        WorkflowResult.workflow_id == workflow_id
    ).count()
    progress = int((completed_agents / total_agents) * 100) if total_agents > 0 else 0

    # Get current agent from Celery task state
    current_agent = None
    if workflow.status == 'running' and workflow.celery_task_id:
        task_result = celery.AsyncResult(workflow.celery_task_id)
        if task_result.state == 'PROGRESS':
            current_agent = task_result.info.get('agent_type')

    # Fetch completed results (cached in Redis)
    results = get_workflow_results_cached(workflow_id)

    return jsonify({
        'id': workflow.id,
        'status': workflow.status,
        'currentAgent': current_agent,
        'progress': progress,
        'results': results,
        'startedAt': workflow.started_at.isoformat() if workflow.started_at else None
    })

@cache.memoize(timeout=5)
def get_workflow_results_cached(workflow_id: str) -> Dict[str, Any]:
    """Cache workflow results for 5 seconds."""
    results = db.session.query(WorkflowResult).filter(
        WorkflowResult.workflow_id == workflow_id
    ).all()

    return {
        result.agent_type: {
            'output': result.output,
            'tokensUsed': result.tokens_used,
            'completedAt': result.completed_at.isoformat()
        }
        for result in results
    }
```

**Database Index Strategy:**
```sql
-- Index for workflow status queries
CREATE INDEX idx_workflow_status_lookup
ON workflows(id, status)
WHERE status IN ('running', 'paused');

-- Index for workflow results lookup
CREATE INDEX idx_workflow_results_lookup
ON workflow_results(workflow_id, completed_at DESC);

-- Index for Celery task tracking
CREATE INDEX idx_workflow_celery_task
ON workflows(celery_task_id)
WHERE celery_task_id IS NOT NULL;

-- Partial index for active workflows (most queried)
CREATE INDEX idx_active_workflows
ON workflows(updated_at DESC)
WHERE status IN ('running', 'paused');
```

**Connection Pooling Configuration:**
```python
# config.py
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,          # Base connection pool size
    max_overflow=40,       # Additional connections under load
    pool_timeout=30,       # Wait up to 30s for connection
    pool_recycle=3600,     # Recycle connections every hour
    pool_pre_ping=True     # Verify connection health before use
)
```

**Polling Optimization: Batch Status Queries**
```typescript
// For dashboard showing multiple workflows, batch status queries
export const useMultipleWorkflowProgress = (workflowIds: string[]) => {
  const { data, error } = useQuery({
    queryKey: ['workflow-progress-batch', workflowIds],
    queryFn: () =>
      fetch('/api/workflows/status/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_ids: workflowIds })
      }).then(r => r.json()),
    refetchInterval: 2000,
    enabled: workflowIds.length > 0
  });

  return { statuses: data, error };
};
```

```python
@workflow_bp.route('/api/workflows/status/batch', methods=['POST'])
def get_batch_workflow_status():
    """Batch endpoint to reduce query overhead for dashboard views."""
    workflow_ids = request.json.get('workflow_ids', [])

    if len(workflow_ids) > 50:
        return jsonify({'error': 'Maximum 50 workflows per batch'}), 400

    # Single query for all workflows
    workflows = db.session.query(Workflow).filter(
        Workflow.id.in_(workflow_ids)
    ).all()

    # Batch fetch results
    results_query = db.session.query(WorkflowResult).filter(
        WorkflowResult.workflow_id.in_(workflow_ids)
    ).all()

    # Group results by workflow_id
    results_by_workflow = {}
    for result in results_query:
        if result.workflow_id not in results_by_workflow:
            results_by_workflow[result.workflow_id] = []
        results_by_workflow[result.workflow_id].append(result)

    # Build response
    return jsonify({
        workflow.id: {
            'status': workflow.status,
            'progress': calculate_progress(workflow.id, results_by_workflow.get(workflow.id, [])),
            'currentAgent': get_current_agent(workflow)
        }
        for workflow in workflows
    })
```

**Graceful Degradation Pattern:**
```typescript
// Handle polling errors gracefully (e.g., server temporarily unavailable)
export const useWorkflowProgress = (workflowId: string) => {
  const [retryCount, setRetryCount] = useState(0);

  const { data, error } = useQuery({
    queryKey: ['workflow-progress', workflowId],
    queryFn: () => fetch(`/api/workflows/${workflowId}/status`).then(r => r.json()),
    refetchInterval: (data) => {
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      // Exponential backoff on errors: 2s -> 4s -> 8s -> max 30s
      return error ? Math.min(2000 * Math.pow(2, retryCount), 30000) : 2000;
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 10000),
    onError: () => setRetryCount(prev => prev + 1),
    onSuccess: () => setRetryCount(0)
  });

  return { status: data, error };
};
```

---

## 4. Document-Image Attachment Model Research

### Research Findings

Document-image attachments enable users to associate multiple images with a single document (e.g., a blog post with multiple illustrations, social media graphics, thumbnails). The core modeling challenge is representing a many-to-many relationship between documents and images while supporting metadata like primary image designation, display order, and attachment context (e.g., "hero image", "thumbnail", "inline figure").

The standard relational database pattern for many-to-many relationships is a junction (join) table. In our case, we need a `document_images` table with foreign keys to both `documents` and `images`, plus additional columns for metadata. The key design decision is whether to store images directly in the junction table (embedding image data like URL, alt text) or maintain a separate `images` table and reference it. The latter approach enables image reuse across documents (e.g., a brand logo used in multiple posts) and centralizes image metadata management (storage paths, CDN URLs, dimensions, file size).

Primary image selection is a common requirement: designating one image as the "primary" or "featured" image for display in previews, social sharing, etc. Two approaches exist: (1) a boolean `is_primary` column in the junction table with a unique constraint ensuring only one primary per document, or (2) a `primary_image_id` foreign key column in the `documents` table. Option 1 is more flexible (allows querying "all primary images" efficiently) and avoids denormalization, so it's preferred.

Ordering images within a document (e.g., "first figure appears before second figure") requires a sequence number. An `attachment_order` integer column in the junction table provides explicit ordering. Using auto-increment or array indices is fragile when images are reordered. Instead, use explicit user-controlled ordering (e.g., user drags image to new position, which updates `attachment_order` to values like 10, 20, 30, allowing easy reordering without updating all rows).

### Alternatives Considered

**Alternative 1: Embedded Array (PostgreSQL JSONB)**
Store an array of image metadata directly in the `documents` table using JSONB. For example:
```json
{
  "images": [
    {"url": "...", "alt": "...", "is_primary": true, "order": 1},
    {"url": "...", "alt": "...", "is_primary": false, "order": 2}
  ]
}
```
Pros: Simpler schema, fewer joins, easier to fetch all images with document.
Cons: No referential integrity, difficult to query "all documents using image X", complex updates, no image reuse across documents.
Rejected because we need image reuse and queryability.

**Alternative 2: Single Table with Nullable Columns**
Instead of separate `documents`, `images`, and `document_images` tables, use a single wide table with optional image columns like `primary_image_url`, `secondary_image_url`, etc.
Pros: No joins needed.
Cons: Fixed image count, sparse columns waste space, schema changes required to add more images, violates normalization principles.
Rejected for poor flexibility and scalability.

**Alternative 3: Document-Owned Images (No Reuse)**
Each image belongs to exactly one document (one-to-many rather than many-to-many). Simpler schema with no junction table.
Pros: Simpler queries, no many-to-many complexity.
Cons: Cannot reuse images across documents (e.g., brand assets), leads to duplicate image uploads, wastes storage.
Rejected because image reuse is a common use case (templates, brand assets, user uploads).

**Alternative 4: Polymorphic Associations**
A single `images` table with `attachable_id` and `attachable_type` columns to support attaching images to different entity types (documents, user profiles, comments, etc.).
Pros: Maximally flexible, supports image attachments to any entity.
Cons: Violates foreign key constraints (can't enforce referential integrity across types), complex queries, harder to reason about.
Preferred approach for mature systems with diverse attachment needs, but overkill for our current scope. We may adopt this if we add image attachments to other entities beyond documents.

### Final Decision + Rationale

**Decision:** Use a junction table pattern with three tables: `documents`, `images`, and `document_images`. The junction table includes `is_primary`, `attachment_order`, and `caption` metadata columns. Enforce `UNIQUE(document_id, is_primary=true)` to ensure only one primary image per document.

**Rationale:**
1. **Normalization:** Separates document, image, and relationship concerns cleanly
2. **Reusability:** Images can be attached to multiple documents (brand assets, templates)
3. **Queryability:** Easy to query "all documents using image X" or "all images in document Y"
4. **Flexibility:** Metadata (primary, order, caption) is stored at relationship level, not embedded in image or document
5. **Integrity:** Foreign key constraints enforce referential integrity, preventing orphaned attachments

### Implementation Notes

**Database Schema:**
```sql
-- Core images table: stores image metadata and storage location
CREATE TABLE images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,  -- S3/MinIO path
    cdn_url VARCHAR(500),                -- CDN URL for optimized delivery
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    width_px INTEGER,
    height_px INTEGER,
    alt_text TEXT,                       -- Accessibility description
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Indexing for common queries
    INDEX idx_images_user (user_id, uploaded_at DESC),
    INDEX idx_images_storage_path (storage_path)
);

-- Documents table (simplified, actual schema has more columns)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT,
    workflow_id UUID REFERENCES workflows(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Junction table: represents document-image relationships
CREATE TABLE document_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,

    -- Metadata columns
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    attachment_order INTEGER NOT NULL DEFAULT 0,
    caption TEXT,                        -- Optional image caption
    attachment_type VARCHAR(50),         -- e.g., "hero", "thumbnail", "inline", "gallery"

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(document_id, image_id),       -- Prevent duplicate attachments
    CHECK (attachment_order >= 0),       -- Enforce non-negative ordering

    -- Indexes
    INDEX idx_document_images_lookup (document_id, attachment_order),
    INDEX idx_document_images_reverse (image_id, created_at DESC)
);

-- Partial unique index: ensure only one primary image per document
CREATE UNIQUE INDEX idx_document_images_primary
ON document_images(document_id)
WHERE is_primary = TRUE;
```

**SQLAlchemy ORM Models:**
```python
from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

class Image(Base):
    __tablename__ = 'images'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    filename = Column(String(255), nullable=False)
    storage_path = Column(String(500), nullable=False)
    cdn_url = Column(String(500))
    mime_type = Column(String(100), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    width_px = Column(Integer)
    height_px = Column(Integer)
    alt_text = Column(Text)
    uploaded_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    user = relationship('User', back_populates='images')
    document_attachments = relationship('DocumentImage', back_populates='image', cascade='all, delete-orphan')

class Document(Base):
    __tablename__ = 'documents'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    title = Column(String(500), nullable=False)
    content = Column(Text)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey('workflows.id'))
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship('User', back_populates='documents')
    workflow = relationship('Workflow', back_populates='documents')
    image_attachments = relationship('DocumentImage', back_populates='document', cascade='all, delete-orphan')

    @property
    def primary_image(self) -> Optional['Image']:
        """Get the primary image for this document."""
        primary_attachment = next(
            (att for att in self.image_attachments if att.is_primary),
            None
        )
        return primary_attachment.image if primary_attachment else None

    @property
    def ordered_images(self) -> List['Image']:
        """Get all images ordered by attachment_order."""
        return [
            att.image
            for att in sorted(self.image_attachments, key=lambda x: x.attachment_order)
        ]

class DocumentImage(Base):
    __tablename__ = 'document_images'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey('documents.id'), nullable=False)
    image_id = Column(UUID(as_uuid=True), ForeignKey('images.id'), nullable=False)
    is_primary = Column(Boolean, nullable=False, default=False)
    attachment_order = Column(Integer, nullable=False, default=0)
    caption = Column(Text)
    attachment_type = Column(String(50))
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    document = relationship('Document', back_populates='image_attachments')
    image = relationship('Image', back_populates='document_attachments')

    __table_args__ = (
        UniqueConstraint('document_id', 'image_id', name='uq_document_image'),
    )
```

**API Endpoints:**
```python
from flask import Blueprint, request, jsonify
from sqlalchemy.exc import IntegrityError

document_images_bp = Blueprint('document_images', __name__)

@document_images_bp.route('/api/documents/<document_id>/images', methods=['POST'])
def attach_image_to_document(document_id: str):
    """
    Attach an existing image to a document.

    Request body:
    {
      "image_id": "uuid",
      "is_primary": false,
      "attachment_order": 10,
      "caption": "Optional caption",
      "attachment_type": "inline"
    }
    """
    data = request.json
    image_id = data.get('image_id')

    # Validate document and image exist
    document = db.session.query(Document).get(document_id)
    image = db.session.query(Image).get(image_id)

    if not document or not image:
        return jsonify({'error': 'Document or image not found'}), 404

    # If is_primary=true, unset previous primary
    if data.get('is_primary'):
        db.session.query(DocumentImage).filter(
            DocumentImage.document_id == document_id,
            DocumentImage.is_primary == True
        ).update({'is_primary': False})

    # Create attachment
    attachment = DocumentImage(
        document_id=document_id,
        image_id=image_id,
        is_primary=data.get('is_primary', False),
        attachment_order=data.get('attachment_order', 0),
        caption=data.get('caption'),
        attachment_type=data.get('attachment_type')
    )

    try:
        db.session.add(attachment)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Image already attached to document'}), 409

    return jsonify({
        'id': str(attachment.id),
        'document_id': str(document_id),
        'image_id': str(image_id),
        'is_primary': attachment.is_primary,
        'attachment_order': attachment.attachment_order
    }), 201

@document_images_bp.route('/api/documents/<document_id>/images', methods=['GET'])
def get_document_images(document_id: str):
    """Get all images attached to a document, ordered by attachment_order."""

    attachments = db.session.query(DocumentImage).filter(
        DocumentImage.document_id == document_id
    ).order_by(DocumentImage.attachment_order).all()

    return jsonify({
        'document_id': document_id,
        'images': [
            {
                'id': str(att.image.id),
                'url': att.image.cdn_url or att.image.storage_path,
                'filename': att.image.filename,
                'alt_text': att.image.alt_text,
                'is_primary': att.is_primary,
                'attachment_order': att.attachment_order,
                'caption': att.caption,
                'attachment_type': att.attachment_type,
                'dimensions': {
                    'width': att.image.width_px,
                    'height': att.image.height_px
                }
            }
            for att in attachments
        ]
    })

@document_images_bp.route('/api/documents/<document_id>/images/<image_id>', methods=['DELETE'])
def detach_image_from_document(document_id: str, image_id: str):
    """Remove image attachment from document (does not delete image itself)."""

    attachment = db.session.query(DocumentImage).filter(
        DocumentImage.document_id == document_id,
        DocumentImage.image_id == image_id
    ).first()

    if not attachment:
        return jsonify({'error': 'Attachment not found'}), 404

    db.session.delete(attachment)
    db.session.commit()

    return jsonify({'message': 'Image detached successfully'}), 200

@document_images_bp.route('/api/documents/<document_id>/images/reorder', methods=['POST'])
def reorder_document_images(document_id: str):
    """
    Reorder images in a document.

    Request body:
    {
      "image_order": [
        {"image_id": "uuid1", "attachment_order": 10},
        {"image_id": "uuid2", "attachment_order": 20},
        {"image_id": "uuid3", "attachment_order": 30}
      ]
    }
    """
    image_order = request.json.get('image_order', [])

    for item in image_order:
        db.session.query(DocumentImage).filter(
            DocumentImage.document_id == document_id,
            DocumentImage.image_id == item['image_id']
        ).update({'attachment_order': item['attachment_order']})

    db.session.commit()

    return jsonify({'message': 'Images reordered successfully'}), 200

@document_images_bp.route('/api/documents/<document_id>/images/primary', methods=['PUT'])
def set_primary_image(document_id: str):
    """
    Set a specific image as primary for the document.

    Request body:
    {
      "image_id": "uuid"
    }
    """
    image_id = request.json.get('image_id')

    # Unset previous primary
    db.session.query(DocumentImage).filter(
        DocumentImage.document_id == document_id,
        DocumentImage.is_primary == True
    ).update({'is_primary': False})

    # Set new primary
    updated = db.session.query(DocumentImage).filter(
        DocumentImage.document_id == document_id,
        DocumentImage.image_id == image_id
    ).update({'is_primary': True})

    if not updated:
        return jsonify({'error': 'Image not attached to document'}), 404

    db.session.commit()

    return jsonify({'message': 'Primary image updated'}), 200
```

**Frontend React Component:**
```typescript
// Component for managing document images
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface DocumentImage {
  id: string;
  url: string;
  filename: string;
  alt_text: string;
  is_primary: boolean;
  attachment_order: number;
  caption?: string;
  dimensions: { width: number; height: number };
}

export const DocumentImageManager = ({ documentId }: { documentId: string }) => {
  const queryClient = useQueryClient();

  // Fetch images
  const { data: imagesData } = useQuery({
    queryKey: ['document-images', documentId],
    queryFn: () => fetch(`/api/documents/${documentId}/images`).then(r => r.json())
  });

  const images = imagesData?.images || [];

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: (imageOrder: Array<{ image_id: string; attachment_order: number }>) =>
      fetch(`/api/documents/${documentId}/images/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_order: imageOrder })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['document-images', documentId]);
    }
  });

  // Set primary mutation
  const setPrimaryMutation = useMutation({
    mutationFn: (imageId: string) =>
      fetch(`/api/documents/${documentId}/images/primary`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_id: imageId })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['document-images', documentId]);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (imageId: string) =>
      fetch(`/api/documents/${documentId}/images/${imageId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['document-images', documentId]);
    }
  });

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((img: DocumentImage) => img.id === active.id);
      const newIndex = images.findIndex((img: DocumentImage) => img.id === over.id);

      const reorderedImages = arrayMove(images, oldIndex, newIndex);

      // Update attachment_order values
      const imageOrder = reorderedImages.map((img, idx) => ({
        image_id: img.id,
        attachment_order: (idx + 1) * 10 // 10, 20, 30, ...
      }));

      reorderMutation.mutate(imageOrder);
    }
  };

  return (
    <div className="document-image-manager">
      <h3>Attached Images</h3>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={images.map((img: DocumentImage) => img.id)} strategy={verticalListSortingStrategy}>
          <div className="image-list">
            {images.map((image: DocumentImage) => (
              <SortableImageItem
                key={image.id}
                image={image}
                onSetPrimary={() => setPrimaryMutation.mutate(image.id)}
                onDelete={() => deleteMutation.mutate(image.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button onClick={() => {/* Open image picker */}}>
        Add Image
      </button>
    </div>
  );
};
```

**Image Reuse Query Example:**
```python
# Find all documents using a specific image
def get_documents_using_image(image_id: str) -> List[Document]:
    """Get all documents that have attached a specific image."""
    return db.session.query(Document).join(
        DocumentImage,
        Document.id == DocumentImage.document_id
    ).filter(
        DocumentImage.image_id == image_id
    ).all()

# Use case: Before deleting an image, check if it's used by any documents
@images_bp.route('/api/images/<image_id>', methods=['DELETE'])
def delete_image(image_id: str):
    """Delete an image (only if not attached to any documents)."""

    # Check for attachments
    attachment_count = db.session.query(DocumentImage).filter(
        DocumentImage.image_id == image_id
    ).count()

    if attachment_count > 0:
        return jsonify({
            'error': 'Cannot delete image: currently attached to documents',
            'attachment_count': attachment_count
        }), 409

    # Safe to delete
    image = db.session.query(Image).get(image_id)
    if image:
        # Delete from storage (S3/MinIO)
        delete_from_storage(image.storage_path)

        # Delete from database
        db.session.delete(image)
        db.session.commit()

        return jsonify({'message': 'Image deleted successfully'}), 200

    return jsonify({'error': 'Image not found'}), 404
```

---

## Conclusion

This research provides a solid technical foundation for implementing the autonomous workflow system. The decisions prioritize:

1. **Developer Experience:** ReactFlow and Celery are mature, well-documented libraries with strong community support
2. **Scalability:** Polling with caching and junction table patterns scale to thousands of users without architectural changes
3. **Maintainability:** Standard patterns (hybrid state management, saga error handling, normalized database schema) make the codebase approachable for new developers
4. **User Experience:** 2-second polling, glass morphism styling, and drag-and-drop image management create a polished interface

Next steps involve implementing these patterns in the order: (1) database schema and models, (2) Celery task orchestration, (3) ReactFlow UI components, (4) progress polling integration. Each component can be developed and tested independently, enabling parallel workstreams.

---

## References

- ReactFlow Documentation: https://reactflow.dev/docs
- Celery Best Practices: https://docs.celeryq.dev/en/stable/userguide/tasks.html
- Nielsen Norman Group - Response Times: https://www.nngroup.com/articles/response-times-3-important-limits/
- PostgreSQL Many-to-Many: https://www.postgresql.org/docs/current/tutorial-join.html
- Redis Caching Strategies: https://redis.io/docs/manual/patterns/
