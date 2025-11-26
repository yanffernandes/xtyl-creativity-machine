# Celery + Workflow Database Schema

**Database Design for Production Workflow Execution**

---

## Current Schema Analysis

### Existing Tables (Already Implemented)

```sql
-- Workflow template definitions
CREATE TABLE workflow_templates (
    id VARCHAR PRIMARY KEY,
    workspace_id VARCHAR REFERENCES workspaces(id),
    name VARCHAR NOT NULL,
    description TEXT,
    category VARCHAR,

    -- ReactFlow format
    nodes_json JSONB NOT NULL DEFAULT '[]',
    edges_json JSONB NOT NULL DEFAULT '[]',
    default_params_json JSONB,

    -- Metadata
    is_system BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    created_by VARCHAR REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Workflow execution instances
CREATE TABLE workflow_executions (
    id VARCHAR PRIMARY KEY,
    template_id VARCHAR REFERENCES workflow_templates(id) NOT NULL,
    project_id VARCHAR REFERENCES projects(id) NOT NULL,
    workspace_id VARCHAR REFERENCES workspaces(id) NOT NULL,
    user_id VARCHAR REFERENCES users(id) NOT NULL,

    -- Execution state
    status VARCHAR DEFAULT 'pending',
    config_json JSONB DEFAULT '{}',
    progress_percent INTEGER DEFAULT 0,
    current_node_id VARCHAR,

    -- Results
    error_message TEXT,
    total_cost NUMERIC(10, 6) DEFAULT 0.0,

    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual node execution log
CREATE TABLE agent_jobs (
    id VARCHAR PRIMARY KEY,
    execution_id VARCHAR REFERENCES workflow_executions(id) NOT NULL,
    node_id VARCHAR NOT NULL,
    job_type VARCHAR NOT NULL,

    -- Job state
    status VARCHAR DEFAULT 'pending',
    input_data_json JSONB,
    output_data_json JSONB,
    error_message TEXT,

    -- Usage tracking
    tokens_used INTEGER DEFAULT 0,

    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document attachments (for workflow-generated content)
CREATE TABLE document_attachments (
    id VARCHAR PRIMARY KEY,
    document_id VARCHAR REFERENCES documents(id) NOT NULL,
    image_id VARCHAR REFERENCES documents(id) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    attachment_order INTEGER DEFAULT 0,
    created_by_workflow_id VARCHAR REFERENCES workflow_executions(id)
);
```

---

## Recommended Schema Additions

### 1. Workflow Execution Events Log

**Why:** Audit trail, debugging, analytics
**TTL:** 90 days (archive older records)

```sql
CREATE TABLE workflow_execution_events (
    id BIGSERIAL PRIMARY KEY,
    execution_id VARCHAR NOT NULL REFERENCES workflow_executions(id),

    -- Event details
    event_type VARCHAR NOT NULL,  -- 'started', 'node_started', 'node_completed', 'paused', 'resumed', 'failed', 'completed'
    node_id VARCHAR,               -- Which node (null for execution-level events)

    -- Event data
    event_data JSONB,              -- Flexible for different event types
    severity VARCHAR DEFAULT 'info',  -- 'info', 'warning', 'error'
    message TEXT,

    -- Metadata
    created_by VARCHAR,            -- 'system', 'user', 'worker-1'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_workflow_events_execution ON workflow_execution_events(execution_id, created_at DESC);
CREATE INDEX idx_workflow_events_node ON workflow_execution_events(execution_id, node_id, created_at DESC);
CREATE INDEX idx_workflow_events_time ON workflow_execution_events(created_at DESC);

-- Example events
-- {
--   "execution_id": "exec-123",
--   "event_type": "node_started",
--   "node_id": "node-2",
--   "message": "Started generating copy",
--   "created_at": "2025-11-25T12:00:00Z"
-- }
--
-- {
--   "execution_id": "exec-123",
--   "event_type": "node_completed",
--   "node_id": "node-2",
--   "event_data": {
--     "duration_seconds": 45,
--     "tokens_used": 150,
--     "output_length": 2000
--   }
-- }
```

### 2. Workflow Execution Checkpoints

**Why:** Resume from exact point if crash/interruption
**Feature:** Node-level snapshots for full resumability

```sql
CREATE TABLE workflow_checkpoints (
    id VARCHAR PRIMARY KEY,
    execution_id VARCHAR NOT NULL REFERENCES workflow_executions(id),

    -- Checkpoint metadata
    checkpoint_type VARCHAR NOT NULL,  -- 'auto', 'manual', 'pause'
    node_id VARCHAR NOT NULL,

    -- State snapshot
    execution_state JSONB NOT NULL,   -- Full state at checkpoint
    completed_node_ids TEXT[],         -- Array of completed node IDs
    pending_node_ids TEXT[],           -- Array of pending node IDs
    node_outputs JSONB,                -- Outputs from all completed nodes (for variable interpolation)

    -- Metadata
    reason TEXT,                       -- Why checkpoint was created
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Retention
    is_latest BOOLEAN DEFAULT TRUE,
    created_by VARCHAR DEFAULT 'system'
);

-- Index for quick checkpoint lookup
CREATE INDEX idx_checkpoints_execution_latest ON workflow_checkpoints(execution_id, is_latest);

-- Example checkpoint on pause
-- {
--   "execution_id": "exec-123",
--   "checkpoint_type": "pause",
--   "node_id": "node-3",
--   "completed_node_ids": ["node-1", "node-2"],
--   "pending_node_ids": ["node-3", "node-4", "node-5"],
--   "node_outputs": {
--     "node-1": {"document_ids": ["doc-123"]},
--     "node-2": {"image_ids": ["img-456"]}
--   }
-- }
```

### 3. Workflow Execution Metrics

**Why:** Analytics, cost tracking, performance monitoring
**TTL:** 12 months (archive older records)

```sql
CREATE TABLE workflow_execution_metrics (
    id VARCHAR PRIMARY KEY,
    execution_id VARCHAR NOT NULL REFERENCES workflow_executions(id),

    -- Performance metrics
    total_duration_seconds INTEGER,
    execution_stage VARCHAR,  -- 'queued', 'running', 'post-processing'

    -- Resource usage
    total_tokens_used INTEGER DEFAULT 0,
    total_api_calls INTEGER DEFAULT 0,
    max_memory_mb INTEGER,

    -- Cost breakdown
    total_cost_usd NUMERIC(10, 6) DEFAULT 0.0,
    cost_breakdown JSONB,  -- {'llm': 0.50, 'images': 0.30, 'api': 0.10}

    -- Node-level stats
    node_stats JSONB,  -- {'node-1': {'duration': 30, 'tokens': 100}, ...}

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX idx_metrics_execution ON workflow_execution_metrics(execution_id);
CREATE INDEX idx_metrics_created ON workflow_execution_metrics(created_at DESC);

-- Example metrics
-- {
--   "execution_id": "exec-123",
--   "total_duration_seconds": 120,
--   "total_tokens_used": 5000,
--   "total_cost_usd": 0.95,
--   "cost_breakdown": {
--     "generate_copy": 0.50,
--     "generate_image": 0.40,
--     "api_calls": 0.05
--   },
--   "node_stats": {
--     "node-1": {"duration": 30, "tokens": 1000},
--     "node-2": {"duration": 45, "tokens": 3000},
--     "node-3": {"duration": 20, "tokens": 1000}
--   }
-- }
```

### 4. Celery Task Tracking (Optional)

**Why:** Better integration between Celery and workflow tracking
**Note:** Can be replaced by Redis result backend for most use cases

```sql
CREATE TABLE celery_tasks (
    task_id VARCHAR PRIMARY KEY,
    execution_id VARCHAR REFERENCES workflow_executions(id),

    -- Task details
    task_name VARCHAR NOT NULL,  -- 'tasks.workflow_tasks.execute_workflow'
    task_args JSONB,
    task_kwargs JSONB,

    -- Status tracking
    status VARCHAR NOT NULL,  -- 'pending', 'started', 'success', 'failure', 'retry'
    result JSONB,
    exception_message TEXT,
    traceback TEXT,

    -- Retry info
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for task lookup
CREATE INDEX idx_celery_tasks_execution ON celery_tasks(execution_id);
CREATE INDEX idx_celery_tasks_status ON celery_tasks(status);
```

---

## Schema Design Patterns

### 1. JSONB for Flexible Node Data

**Why use JSONB:**
- Workflow nodes have varying data structures (generate_copy vs generate_image)
- Store node parameters, outputs, and configuration without schema migration

**Best practices:**
```sql
-- Always add indexes for frequently queried JSONB fields
CREATE INDEX idx_agent_jobs_input_type ON agent_jobs USING GIN(input_data_json);
CREATE INDEX idx_executions_config_model ON workflow_executions USING GIN(config_json);

-- Query examples
SELECT * FROM agent_jobs
WHERE input_data_json->>'job_type' = 'generate_copy'
  AND input_data_json->>'model' = 'gpt-4';

-- Check if key exists
WHERE input_data_json ? 'prompt'

-- Query nested values
WHERE input_data_json->'settings'->>'temperature'::float > 0.5
```

### 2. Partitioning for Large Tables

**For high-volume workflows (millions of executions):**

```sql
-- Partition workflow_executions by workspace for faster queries
CREATE TABLE workflow_executions (
    id VARCHAR,
    template_id VARCHAR,
    project_id VARCHAR,
    workspace_id VARCHAR,
    user_id VARCHAR,
    status VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ...
) PARTITION BY LIST (workspace_id);

-- Create partitions for major workspaces
CREATE TABLE workflow_executions_ws_abc PARTITION OF workflow_executions
    FOR VALUES IN ('workspace-abc');

CREATE TABLE workflow_executions_ws_def PARTITION OF workflow_executions
    FOR VALUES IN ('workspace-def');

-- Partition by date for other tables
CREATE TABLE workflow_execution_events (...)
    PARTITION BY RANGE (created_at);

CREATE TABLE workflow_execution_events_2025_q4 PARTITION OF workflow_execution_events
    FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');
```

### 3. Materialized Views for Analytics

**For reporting and dashboards:**

```sql
CREATE MATERIALIZED VIEW workflow_execution_summary AS
SELECT
    workspace_id,
    DATE(created_at) as execution_date,
    status,
    COUNT(*) as total_executions,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds,
    SUM((total_cost)::numeric) as total_cost,
    MAX(progress_percent) as avg_progress
FROM workflow_executions
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY workspace_id, DATE(created_at), status;

-- Refresh periodically
CREATE INDEX idx_summary_workspace_date ON workflow_execution_summary(workspace_id, execution_date);

-- Refresh in background
REFRESH MATERIALIZED VIEW CONCURRENTLY workflow_execution_summary;
```

---

## Index Strategy

### Critical Indexes (Must Have)

```sql
-- Workflow execution lookup
CREATE INDEX idx_executions_id_status
    ON workflow_executions(id, status);
CREATE INDEX idx_executions_user_workspace
    ON workflow_executions(user_id, workspace_id, created_at DESC);

-- Agent job lookup (heavily queried during execution)
CREATE INDEX idx_agent_jobs_execution_status
    ON agent_jobs(execution_id, status);
CREATE INDEX idx_agent_jobs_execution_node
    ON agent_jobs(execution_id, node_id);

-- Template lookup
CREATE INDEX idx_templates_workspace_system
    ON workflow_templates(workspace_id, is_system, created_at DESC);
```

### Optional Indexes (Based on Query Patterns)

```sql
-- If querying by status frequently
CREATE INDEX idx_executions_status_created
    ON workflow_executions(status, created_at DESC);

-- If filtering by cost
CREATE INDEX idx_executions_cost
    ON workflow_executions(total_cost DESC)
    WHERE total_cost > 0;

-- For JSON queries
CREATE INDEX idx_agent_jobs_input_gin
    ON agent_jobs USING GIN(input_data_json);
```

### Index Monitoring

```sql
-- Check unused indexes (bloat)
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Check index size
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## Queries for Common Operations

### 1. Get Execution with All Node Jobs

```sql
SELECT
    e.*,
    json_agg(json_build_object(
        'job_id', j.id,
        'node_id', j.node_id,
        'status', j.status,
        'duration', EXTRACT(EPOCH FROM (j.completed_at - j.started_at)),
        'output', j.output_data_json
    )) as jobs
FROM workflow_executions e
LEFT JOIN agent_jobs j ON e.id = j.execution_id
WHERE e.id = $1
GROUP BY e.id;
```

### 2. Get Execution Progress with Current Node

```sql
SELECT
    e.id,
    e.status,
    e.progress_percent,
    e.current_node_id,
    j.job_type as current_node_type,
    EXTRACT(EPOCH FROM (NOW() - j.started_at)) as current_node_duration_seconds
FROM workflow_executions e
LEFT JOIN agent_jobs j ON e.current_node_id = j.node_id AND j.execution_id = e.id
WHERE e.id = $1;
```

### 3. Get Resumable State (All Completed Nodes)

```sql
SELECT
    e.id as execution_id,
    array_agg(j.node_id ORDER BY j.completed_at ASC) as completed_node_ids,
    json_object_agg(j.node_id, j.output_data_json) as node_outputs
FROM workflow_executions e
LEFT JOIN agent_jobs j ON e.id = j.execution_id AND j.status = 'completed'
WHERE e.id = $1
GROUP BY e.id;
```

### 4. Cost and Token Summary by Node Type

```sql
SELECT
    e.id as execution_id,
    j.job_type,
    COUNT(*) as node_count,
    SUM(j.tokens_used) as total_tokens,
    AVG(j.tokens_used) as avg_tokens,
    EXTRACT(EPOCH FROM AVG(j.completed_at - j.started_at)) as avg_duration_seconds
FROM workflow_executions e
JOIN agent_jobs j ON e.id = j.execution_id
WHERE e.id = $1 AND j.status = 'completed'
GROUP BY e.id, j.job_type;
```

### 5. Active Executions per Workspace

```sql
SELECT
    e.workspace_id,
    COUNT(*) as active_count,
    string_agg(DISTINCT e.status, ', ') as statuses,
    MAX(e.created_at) as oldest_active
FROM workflow_executions e
WHERE e.status IN ('pending', 'running', 'paused')
  AND e.created_at > NOW() - INTERVAL '7 days'
GROUP BY e.workspace_id
ORDER BY active_count DESC;
```

---

## Data Retention Policy

### Recommended TTL Strategy

```sql
-- Keep only recent executions in hot tables
-- Archive older data to separate tables or S3

-- Retention by status
- Completed: 12 months
- Failed: 6 months (longer for debugging)
- Paused: 30 days (user should resume or delete)
- Pending: 7 days (clean up stale queued tasks)

-- Archive query
SELECT * INTO workflow_executions_archive_2025_q1
FROM workflow_executions
WHERE created_at < '2025-04-01'
  AND status IN ('completed', 'failed');

-- Delete after archiving
DELETE FROM workflow_executions
WHERE created_at < '2025-04-01'
  AND status IN ('completed', 'failed');
```

### Automated Cleanup

```python
# In a scheduled Celery beat task

from celery import shared_task
from datetime import datetime, timedelta
from database import SessionLocal
from models import WorkflowExecution, AgentJob

@shared_task
def cleanup_old_executions():
    """Remove old execution records"""
    db = SessionLocal()

    # Delete old paused executions (30 days)
    db.query(WorkflowExecution).filter(
        WorkflowExecution.status == "paused",
        WorkflowExecution.updated_at < datetime.utcnow() - timedelta(days=30)
    ).delete()

    # Delete old pending executions (7 days)
    db.query(WorkflowExecution).filter(
        WorkflowExecution.status == "pending",
        WorkflowExecution.created_at < datetime.utcnow() - timedelta(days=7)
    ).delete()

    db.commit()
    db.close()

# Schedule in celery_app.py
celery_app.conf.beat_schedule = {
    'cleanup-old-executions': {
        'task': 'tasks.cleanup_old_executions',
        'schedule': crontab(hour=2, minute=0),  # 2 AM daily
    },
}
```

---

## Migration Path

### For Existing Project

```sql
-- Step 1: Add event logging table
CREATE TABLE workflow_execution_events (
    id BIGSERIAL PRIMARY KEY,
    execution_id VARCHAR NOT NULL REFERENCES workflow_executions(id),
    event_type VARCHAR NOT NULL,
    node_id VARCHAR,
    event_data JSONB,
    severity VARCHAR DEFAULT 'info',
    message TEXT,
    created_by VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_workflow_events_execution
    ON workflow_execution_events(execution_id, created_at DESC);

-- Step 2: Add checkpoint table
CREATE TABLE workflow_checkpoints (
    id VARCHAR PRIMARY KEY,
    execution_id VARCHAR NOT NULL REFERENCES workflow_executions(id),
    checkpoint_type VARCHAR NOT NULL,
    node_id VARCHAR NOT NULL,
    execution_state JSONB NOT NULL,
    completed_node_ids TEXT[],
    pending_node_ids TEXT[],
    node_outputs JSONB,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_latest BOOLEAN DEFAULT TRUE,
    created_by VARCHAR DEFAULT 'system'
);

CREATE INDEX idx_checkpoints_execution_latest
    ON workflow_checkpoints(execution_id, is_latest);

-- Step 3: Add metrics table
CREATE TABLE workflow_execution_metrics (
    id VARCHAR PRIMARY KEY,
    execution_id VARCHAR NOT NULL REFERENCES workflow_executions(id),
    total_duration_seconds INTEGER,
    total_tokens_used INTEGER DEFAULT 0,
    total_api_calls INTEGER DEFAULT 0,
    total_cost_usd NUMERIC(10, 6) DEFAULT 0.0,
    cost_breakdown JSONB,
    node_stats JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Add missing indexes
CREATE INDEX idx_executions_id_status ON workflow_executions(id, status);
CREATE INDEX idx_agent_jobs_execution_status ON agent_jobs(execution_id, status);
```

### No Breaking Changes
- All additions are optional
- Existing queries continue to work
- New features use new tables
- Gradual migration possible

