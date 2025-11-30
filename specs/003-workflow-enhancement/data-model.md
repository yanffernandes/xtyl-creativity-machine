# Data Model: Complete Workflow System

**Feature**: 003-workflow-enhancement
**Date**: 2025-11-25
**Status**: Phase 1 Design

## Overview

This document defines the PostgreSQL database schema for the complete workflow system. The design extends the existing workflow tables (from migration `008_create_workflow_tables.sql`) to support all node types, variable passing, loop execution, conditional branching, and execution state management.

## Entity Relationship Diagram

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│   Workspaces    │       │  Workflow        │       │   Projects      │
│                 │◄──────│  Templates       │──────►│                 │
└─────────────────┘       └──────────────────┘       └─────────────────┘
                                   │                           │
                                   │ 1:N                       │
                                   ▼                           │
                          ┌──────────────────┐                │
                          │  Workflow        │◄───────────────┘
                          │  Executions      │
                          └──────────────────┘
                                   │ 1:N
                                   ▼
                          ┌──────────────────┐
                          │  Node Outputs    │
                          └──────────────────┘
                                   │ 1:N
                                   ▼
                          ┌──────────────────┐
                          │  Agent Jobs      │
                          └──────────────────┘
```

## Core Entities

### 1. Workflow Templates

**Purpose**: Stores reusable workflow definitions that can be instantiated for specific projects.

**Schema**:

```sql
CREATE TABLE workflow_templates (
    -- Primary Key
    id VARCHAR PRIMARY KEY,

    -- Relationships
    workspace_id VARCHAR NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,

    -- Basic Information
    name VARCHAR NOT NULL,
    description TEXT,
    category VARCHAR,  -- 'content_generation', 'image_creation', 'analysis', 'custom'

    -- Workflow Definition (ReactFlow JSON format)
    nodes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    edges_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    default_params_json JSONB DEFAULT '{}'::jsonb,

    -- Template Metadata
    is_system BOOLEAN DEFAULT FALSE,  -- System templates vs user-created
    is_recommended BOOLEAN DEFAULT FALSE,  -- Featured in template library
    usage_count INTEGER DEFAULT 0,  -- Track template popularity
    version VARCHAR DEFAULT '1.0',  -- Workflow schema version

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_workflow_templates_workspace ON workflow_templates(workspace_id);
CREATE INDEX idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX idx_workflow_templates_is_system ON workflow_templates(is_system);
CREATE INDEX idx_workflow_templates_is_recommended ON workflow_templates(is_recommended);
```

**Fields Explained**:

- `id`: UUID string, primary identifier
- `workspace_id`: Workspace that owns this template (for access control)
- `created_by`: User who created this template (nullable if system template)
- `name`: Display name for the template (e.g., "Social Media Ad Campaign")
- `description`: Detailed explanation of what the workflow does
- `category`: Categorization for filtering in UI (content_generation, image_creation, etc.)
- `nodes_json`: Array of node definitions in ReactFlow format (see Node JSON Schema below)
- `edges_json`: Array of edge connections in ReactFlow format
- `default_params_json`: Default configuration values for template instantiation
- `is_system`: True for built-in templates, false for user-created
- `is_recommended`: True for featured templates shown first in library
- `usage_count`: Incremented each time template is instantiated
- `version`: Schema version for workflow definition format (enables migration)

**Node JSON Schema** (stored in `nodes_json`):

```json
[
  {
    "id": "start-1",
    "type": "start",
    "position": {"x": 100, "y": 100},
    "data": {
      "label": "Start",
      "inputVariables": [
        {"name": "campaign_theme", "type": "text", "required": true},
        {"name": "target_audience", "type": "text", "required": false}
      ]
    }
  },
  {
    "id": "textgen-2",
    "type": "text_generation",
    "position": {"x": 300, "y": 100},
    "data": {
      "label": "Generate Headline",
      "prompt": "Create a headline for {{start.campaign_theme}} targeting {{start.target_audience}}",
      "model": "openai/gpt-4-turbo",
      "maxTokens": 100,
      "temperature": 0.7
    }
  },
  {
    "id": "imagegen-3",
    "type": "image_generation",
    "position": {"x": 500, "y": 100},
    "data": {
      "label": "Generate Hero Image",
      "prompt": "Create a hero image for: {{textgen-2.content}}",
      "model": "openai/dall-e-3",
      "size": "1024x1024",
      "style": "vivid"
    }
  },
  {
    "id": "conditional-4",
    "type": "conditional",
    "position": {"x": 700, "y": 100},
    "data": {
      "label": "Check Word Count",
      "condition": "{{textgen-2.word_count}} > 10"
    }
  },
  {
    "id": "loop-5",
    "type": "loop",
    "position": {"x": 900, "y": 100},
    "data": {
      "label": "Generate 5 Variations",
      "iterations": 5,
      "condition": "{{quality_score}} < 8",
      "maxIterations": 10
    }
  },
  {
    "id": "context-6",
    "type": "context_retrieval",
    "position": {"x": 1100, "y": 100},
    "data": {
      "label": "Fetch Brand Guidelines",
      "filters": {
        "status": "approved",
        "asset_type": "logo",
        "tags": ["brand"]
      },
      "maxResults": 10
    }
  },
  {
    "id": "processing-7",
    "type": "processing",
    "position": {"x": 1300, "y": 100},
    "data": {
      "label": "Extract Brand Colors",
      "prompt": "Extract hex color codes from: {{context-6.documents}}",
      "model": "openai/gpt-4-turbo",
      "outputFormat": "json"
    }
  },
  {
    "id": "finish-8",
    "type": "finish",
    "position": {"x": 1500, "y": 100},
    "data": {
      "label": "Save to Project",
      "saveToProject": true,
      "documentTitle": "{{textgen-2.content}}",
      "notifyUser": true
    }
  }
]
```

**Edge JSON Schema** (stored in `edges_json`):

```json
[
  {
    "id": "e1",
    "source": "start-1",
    "target": "textgen-2",
    "sourceHandle": "output",
    "targetHandle": "input",
    "type": "smoothstep"
  },
  {
    "id": "e2",
    "source": "textgen-2",
    "target": "conditional-4",
    "sourceHandle": "output",
    "targetHandle": "input"
  },
  {
    "id": "e3",
    "source": "conditional-4",
    "target": "finish-8",
    "sourceHandle": "true",
    "targetHandle": "input",
    "label": "Valid"
  },
  {
    "id": "e4",
    "source": "conditional-4",
    "target": "textgen-2",
    "sourceHandle": "false",
    "targetHandle": "input",
    "label": "Retry"
  }
]
```

---

### 2. Workflow Executions

**Purpose**: Tracks individual workflow runs, including status, progress, and execution state for resume capability.

**Schema**:

```sql
CREATE TABLE workflow_executions (
    -- Primary Key
    id VARCHAR PRIMARY KEY,

    -- Relationships
    template_id VARCHAR NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
    project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    workspace_id VARCHAR NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Execution State
    status VARCHAR NOT NULL DEFAULT 'pending',  -- 'pending', 'running', 'paused', 'completed', 'failed', 'cancelled'
    config_json JSONB DEFAULT '{}'::jsonb,  -- User-provided input variables from Start node
    execution_context JSONB DEFAULT '{}'::jsonb,  -- Current variable values, loop state
    current_node_id VARCHAR,  -- Node currently executing (for resume)
    progress_percent INTEGER DEFAULT 0,  -- 0-100

    -- Celery Integration
    celery_task_id VARCHAR,  -- Celery task ID for pause/resume/cancel

    -- Results and Metrics
    error_message TEXT,
    total_cost NUMERIC(10, 6) DEFAULT 0.0,  -- Sum of all AI API costs
    total_tokens_used INTEGER DEFAULT 0,
    generated_document_ids JSONB DEFAULT '[]'::jsonb,  -- Array of Document IDs created

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workflow_executions_template ON workflow_executions(template_id);
CREATE INDEX idx_workflow_executions_project ON workflow_executions(project_id);
CREATE INDEX idx_workflow_executions_workspace ON workflow_executions(workspace_id);
CREATE INDEX idx_workflow_executions_user ON workflow_executions(user_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_celery_task ON workflow_executions(celery_task_id);
CREATE INDEX idx_workflow_executions_created_at ON workflow_executions(created_at DESC);
```

**Fields Explained**:

- `id`: UUID string, primary identifier
- `template_id`: Workflow template being executed
- `project_id`: Project where outputs are saved
- `workspace_id`: Workspace for access control
- `user_id`: User who triggered execution
- `status`: Current execution state (pending/running/paused/completed/failed/cancelled)
- `config_json`: User inputs provided at execution start (Start node variables)
- `execution_context`: Runtime state including variable values and loop stack (see Context JSON below)
- `current_node_id`: Node ID currently executing (used to resume from checkpoint)
- `progress_percent`: 0-100 estimate based on nodes completed
- `celery_task_id`: Celery task identifier for async control (pause/cancel)
- `error_message`: Error details if status is 'failed'
- `total_cost`: Cumulative cost from all AI API calls
- `total_tokens_used`: Cumulative token usage
- `generated_document_ids`: Array of Document IDs created during execution

**Execution Context JSON Schema** (stored in `execution_context`):

```json
{
  "variables": {
    "start-1": {
      "campaign_theme": "Summer Sale 2025",
      "target_audience": "millennials"
    },
    "textgen-2": {
      "content": "Sizzling Summer Deals Are Here!",
      "word_count": 5,
      "model_used": "openai/gpt-4-turbo",
      "tokens_used": 87,
      "cost": 0.00435
    },
    "imagegen-3": {
      "image_url": "https://minio.example.com/images/abc123.png",
      "model_used": "openai/dall-e-3",
      "cost": 0.04
    }
  },
  "loop_stack": [
    {
      "node_id": "loop-5",
      "current_iteration": 3,
      "max_iterations": 5,
      "condition": "{{quality_score}} < 8",
      "iteration_outputs": [
        {"iteration": 1, "node_outputs": {...}},
        {"iteration": 2, "node_outputs": {...}}
      ]
    }
  ],
  "execution_order": ["start-1", "textgen-2", "imagegen-3"],
  "conditional_paths_taken": {
    "conditional-4": "true"
  }
}
```

---

### 3. Node Outputs

**Purpose**: Stores outputs from each node execution for variable resolution and execution history.

**Schema**:

```sql
CREATE TABLE node_outputs (
    -- Primary Key
    id VARCHAR PRIMARY KEY,

    -- Relationships
    execution_id VARCHAR NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,

    -- Node Identification
    node_id VARCHAR NOT NULL,  -- Node ID from workflow definition
    node_name VARCHAR NOT NULL,  -- Human-readable node name for debugging
    node_type VARCHAR NOT NULL,  -- 'start', 'text_generation', 'image_generation', etc.

    -- Output Data
    outputs JSONB NOT NULL,  -- Structured output data (see Output JSON Schema below)

    -- Metadata
    execution_order INTEGER NOT NULL,  -- Sequence number in execution (for topological sort)
    iteration_number INTEGER DEFAULT 0,  -- Loop iteration (0 if not in loop)

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_node_outputs_execution ON node_outputs(execution_id);
CREATE INDEX idx_node_outputs_node_id ON node_outputs(node_id);
CREATE INDEX idx_node_outputs_execution_order ON node_outputs(execution_id, execution_order);
CREATE INDEX idx_node_outputs_iteration ON node_outputs(execution_id, iteration_number);
```

**Fields Explained**:

- `id`: UUID string, primary identifier
- `execution_id`: Workflow execution this output belongs to
- `node_id`: Node ID from workflow definition (e.g., "textgen-2")
- `node_name`: Display name for debugging (e.g., "Generate Headline")
- `node_type`: Node type identifier (start, text_generation, image_generation, etc.)
- `outputs`: Structured output data specific to node type (see Output JSON Schema)
- `execution_order`: Sequential number indicating execution order (1, 2, 3, ...)
- `iteration_number`: Loop iteration number (0 if not in loop, 1-N for loop iterations)
- `started_at`: When node execution started
- `completed_at`: When node execution finished

**Output JSON Schema** (stored in `outputs`):

**Start Node Output**:
```json
{
  "campaign_theme": "Summer Sale 2025",
  "target_audience": "millennials"
}
```

**Text Generation Node Output**:
```json
{
  "content": "Sizzling Summer Deals Are Here!",
  "word_count": 5,
  "character_count": 33,
  "model_used": "openai/gpt-4-turbo",
  "tokens_used": 87,
  "cost": 0.00435,
  "timestamp": "2025-11-25T18:45:23Z"
}
```

**Image Generation Node Output**:
```json
{
  "image_url": "https://minio.example.com/images/abc123.png",
  "thumbnail_url": "https://minio.example.com/images/abc123_thumb.png",
  "prompt_used": "Create a hero image for: Sizzling Summer Deals",
  "model_used": "openai/dall-e-3",
  "image_size": "1024x1024",
  "cost": 0.04,
  "timestamp": "2025-11-25T18:45:35Z"
}
```

**Context Retrieval Node Output**:
```json
{
  "documents": [
    {
      "id": "doc-123",
      "title": "Brand Guidelines 2025",
      "content": "Our brand colors are...",
      "metadata": {"status": "approved", "tags": ["brand"]}
    },
    {
      "id": "doc-456",
      "title": "Logo Files",
      "file_url": "https://minio.example.com/logos/main.png"
    }
  ],
  "document_count": 2,
  "filters_applied": {"status": "approved", "asset_type": "logo"}
}
```

**Processing Node Output**:

Processing nodes use **flexible JSONB** with automatic field extraction via **OutputParser** (structured outputs solution). This allows custom output structures without rigid schema enforcement.

```json
{
  "result": {
    "colors": ["#FF5733", "#C70039", "#900C3F"],
    "fonts": ["Helvetica Neue", "Arial"],
    "tone": "energetic"
  },
  "model_used": "openai/gpt-4-turbo",
  "tokens_used": 234,
  "cost": 0.01234,
  "timestamp": "2025-11-25T18:46:00Z"
}
```

**OutputParser Mechanism**:

The Processing node uses AI structured outputs (e.g., OpenAI's JSON mode or function calling) to return data in a flexible format defined by the user's prompt. The `result` field can contain any JSON structure:

- **Flexible Schema**: User defines expected output in prompt (e.g., "Return JSON with fields: colors, fonts, tone")
- **Auto-Extraction**: OutputParser automatically extracts fields from AI response and stores in JSONB
- **Downstream Access**: Variables like `{{processing-7.result.colors}}` or `{{processing-7.result.tone}}` work automatically
- **No Rigid Schema**: Each processing node can have different output structure without database migrations

**Example Prompt for Processing Node**:
```
Analyze the brand guidelines and return JSON with this structure:
{
  "colors": ["array of hex codes"],
  "fonts": ["array of font names"],
  "tone": "string describing brand tone"
}
```

The AI response is parsed, validated as JSON, and stored in the `result` field. Downstream nodes can reference any nested field using dot notation.

**Conditional Node Output**:
```json
{
  "condition": "{{textgen-2.word_count}} > 10",
  "evaluated_condition": "5 > 10",
  "result": false,
  "path_taken": "false"
}
```

**Loop Node Output**:
```json
{
  "iterations_completed": 5,
  "condition": "{{quality_score}} < 8",
  "stopped_early": false,
  "total_outputs": 5
}
```

---

### 4. Agent Jobs

**Purpose**: Tracks individual AI API calls within a workflow execution for cost tracking and debugging.

**Schema**:

```sql
CREATE TABLE agent_jobs (
    -- Primary Key
    id VARCHAR PRIMARY KEY,

    -- Relationships
    execution_id VARCHAR NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    node_id VARCHAR NOT NULL,  -- Node that triggered this job

    -- Job Configuration
    job_type VARCHAR NOT NULL,  -- 'text_generation', 'image_generation', 'processing', 'context_retrieval'
    model VARCHAR,  -- AI model used (e.g., 'openai/gpt-4-turbo')

    -- Job State
    status VARCHAR NOT NULL DEFAULT 'pending',  -- 'pending', 'running', 'completed', 'failed'
    input_data_json JSONB,  -- Input prompt/parameters
    output_data_json JSONB,  -- AI response data
    error_message TEXT,

    -- Usage Tracking
    tokens_used INTEGER DEFAULT 0,
    cost NUMERIC(10, 6) DEFAULT 0.0,

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agent_jobs_execution ON agent_jobs(execution_id);
CREATE INDEX idx_agent_jobs_node ON agent_jobs(node_id);
CREATE INDEX idx_agent_jobs_status ON agent_jobs(status);
CREATE INDEX idx_agent_jobs_created_at ON agent_jobs(created_at DESC);
```

**Fields Explained**:

- `id`: UUID string, primary identifier
- `execution_id`: Workflow execution this job belongs to
- `node_id`: Node that triggered this AI job
- `job_type`: Type of AI operation (text_generation, image_generation, etc.)
- `model`: AI model identifier (e.g., 'openai/gpt-4-turbo')
- `status`: Job execution state (pending/running/completed/failed)
- `input_data_json`: Input prompt and parameters sent to AI API
- `output_data_json`: Raw response from AI API
- `error_message`: Error details if status is 'failed'
- `tokens_used`: Number of tokens consumed (for text models)
- `cost`: API cost in USD
- `started_at`: When API call started
- `completed_at`: When API call finished

---

## Supporting Entities

### 5. Document Attachments

**Purpose**: Links images to documents created by workflows (e.g., hero image attached to blog post).

**Schema**:

```sql
CREATE TABLE document_attachments (
    -- Primary Key
    id VARCHAR PRIMARY KEY,

    -- Relationships
    document_id VARCHAR NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    image_id VARCHAR NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    created_by_workflow_id VARCHAR REFERENCES workflow_executions(id) ON DELETE SET NULL,

    -- Attachment Metadata
    is_primary BOOLEAN DEFAULT FALSE,  -- Primary/hero image
    attachment_order INTEGER DEFAULT 0,  -- Display order

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_document_attachments_document ON document_attachments(document_id);
CREATE INDEX idx_document_attachments_image ON document_attachments(image_id);
CREATE UNIQUE INDEX idx_document_attachments_unique ON document_attachments(document_id, image_id);
```

**Fields Explained**:

- `id`: UUID string, primary identifier
- `document_id`: Text document to attach image to
- `image_id`: Image document to attach
- `created_by_workflow_id`: Workflow execution that created this attachment (nullable)
- `is_primary`: True if this is the primary/hero image
- `attachment_order`: Order for displaying multiple images (0, 1, 2, ...)

---

## Data Flow Examples

### Example 1: Simple Linear Workflow Execution

**Workflow**: Start → Text Generation → Image Generation → Finish

**Data Flow**:

1. **User initiates execution**:
   - Creates `workflow_executions` record with status='pending'
   - Stores user inputs in `config_json`: `{"campaign_theme": "Summer Sale"}`

2. **Start node executes**:
   - Creates `node_outputs` record with `execution_order=1`
   - Outputs: `{"campaign_theme": "Summer Sale"}`
   - Updates `execution_context.variables['start-1']`

3. **Text Generation node executes**:
   - Resolves variables: `{{start.campaign_theme}}` → "Summer Sale"
   - Creates `agent_jobs` record for OpenAI API call
   - Creates `node_outputs` record with `execution_order=2`
   - Outputs: `{"content": "Amazing Summer Sale!", "word_count": 3, "cost": 0.005}`
   - Updates `execution_context.variables['textgen-2']`

4. **Image Generation node executes**:
   - Resolves variables: `{{textgen-2.content}}` → "Amazing Summer Sale!"
   - Creates `agent_jobs` record for DALL-E API call
   - Creates `node_outputs` record with `execution_order=3`
   - Outputs: `{"image_url": "https://...", "cost": 0.04}`

5. **Finish node executes**:
   - Creates `documents` record for text content
   - Creates `documents` record for image
   - Creates `document_attachments` linking them
   - Updates `workflow_executions.generated_document_ids`
   - Sets `workflow_executions.status='completed'`

---

### Example 2: Loop Workflow Execution

**Workflow**: Start → Loop (3 iterations) → Text Generation → Finish

**Data Flow**:

1. **Loop node starts**:
   - Pushes loop context to `execution_context.loop_stack`
   - `{"node_id": "loop-5", "current_iteration": 1, "max_iterations": 3}`

2. **First iteration**:
   - Text Generation creates `node_outputs` with `iteration_number=1`
   - Outputs stored in `execution_context.loop_stack[0].iteration_outputs[0]`

3. **Second iteration**:
   - Text Generation creates `node_outputs` with `iteration_number=2`
   - `execution_context.loop_stack[0].current_iteration` updated to 2

4. **Third iteration**:
   - Text Generation creates `node_outputs` with `iteration_number=3`
   - Loop completes, pops from `execution_context.loop_stack`

5. **Finish node**:
   - Creates 3 separate `documents` records (one per iteration)
   - Each tagged with iteration number in metadata

---

## Database Constraints and Business Rules

### Constraints

1. **Workflow Templates**:
   - `workspace_id` must reference valid workspace (FK constraint)
   - `nodes_json` must be valid JSON array (check constraint)
   - `edges_json` must be valid JSON array (check constraint)
   - `version` must match supported schema versions

2. **Workflow Executions**:
   - `status` must be in: pending, running, paused, completed, failed, cancelled
   - `progress_percent` must be 0-100 (check constraint)
   - If `status='completed'`, `completed_at` must not be null
   - If `status='failed'`, `error_message` must not be null

3. **Node Outputs**:
   - `execution_order` must be positive integer (check constraint)
   - `iteration_number` must be >= 0 (check constraint)
   - Unique constraint on (`execution_id`, `node_id`, `iteration_number`)

4. **Agent Jobs**:
   - `status` must be in: pending, running, completed, failed
   - If `job_type='text_generation'`, `tokens_used` should be populated
   - If `status='completed'`, `output_data_json` must not be null

### Business Rules

1. **Execution Atomicity**:
   - If workflow fails, partial results are preserved (no rollback)
   - User can retry from failed node or restart from beginning

2. **Cost Tracking**:
   - `workflow_executions.total_cost` = SUM(`agent_jobs.cost`) for that execution
   - Updated after each `agent_jobs` record is completed

3. **Progress Calculation**:
   - `progress_percent` = (nodes_completed / total_nodes) * 100
   - Updated after each node completes

4. **Variable Resolution**:
   - Variables only resolved from nodes that have already executed
   - Circular dependencies detected during workflow validation (before execution)

5. **Loop Iteration Limits**:
   - Maximum 100 iterations per loop (soft limit, configurable)
   - If loop exceeds limit, execution fails with clear error

6. **Document Generation**:
   - Each Finish node can create multiple documents (text + images)
   - All documents tagged with `workflow_execution_id` in metadata

---

## Migration Strategy

### Migration 009: Enhanced Workflow Tables

**File**: `backend/migrations/009_enhance_workflow_tables.sql`

**Changes from Migration 008**:

1. Add new columns to `workflow_templates`:
   - `is_recommended BOOLEAN DEFAULT FALSE`
   - `version VARCHAR DEFAULT '1.0'`

2. Add new columns to `workflow_executions`:
   - `execution_context JSONB DEFAULT '{}'::jsonb`
   - `celery_task_id VARCHAR`
   - `total_tokens_used INTEGER DEFAULT 0`
   - `generated_document_ids JSONB DEFAULT '[]'::jsonb`

3. Create `node_outputs` table (new)

4. Add new indexes:
   - `idx_workflow_executions_celery_task`
   - `idx_workflow_executions_user`
   - `idx_workflow_executions_created_at`
   - `idx_node_outputs_execution_order`
   - `idx_node_outputs_iteration`

**Rollback Plan**:
- Drop `node_outputs` table
- Remove new columns from existing tables
- Drop new indexes

---

## Performance Considerations

### Indexes

All foreign keys are indexed for join performance:
- `workflow_templates.workspace_id`
- `workflow_executions.template_id`
- `workflow_executions.project_id`
- `workflow_executions.user_id`
- `node_outputs.execution_id`

Query patterns optimized:
- List executions by workspace/project (indexed)
- List executions by status (indexed)
- Fetch node outputs in execution order (composite index)
- Track agent jobs by execution (indexed)

### JSONB Performance

PostgreSQL JSONB supports:
- GIN indexes on `execution_context` for fast variable lookups
- Partial indexes on `nodes_json` for specific node types
- Expression indexes on frequently queried JSON paths

Example:
```sql
CREATE INDEX idx_execution_context_variables
ON workflow_executions USING GIN (execution_context);

CREATE INDEX idx_nodes_by_type
ON workflow_templates USING GIN (nodes_json jsonb_path_ops);
```

### Query Optimization

1. **Fetch execution history**: Use `created_at DESC` index for recent executions
2. **Resume execution**: Use `celery_task_id` index for fast lookup
3. **Variable resolution**: Use `execution_order` index to fetch nodes in sequence
4. **Cost reporting**: Aggregate `agent_jobs.cost` with covering index

---

## Example Queries

### Fetch Workflow Execution with All Outputs

```sql
SELECT
    we.id,
    we.status,
    we.progress_percent,
    we.total_cost,
    json_agg(
        json_build_object(
            'node_id', no.node_id,
            'node_name', no.node_name,
            'outputs', no.outputs,
            'execution_order', no.execution_order
        ) ORDER BY no.execution_order
    ) AS node_outputs
FROM workflow_executions we
LEFT JOIN node_outputs no ON we.id = no.execution_id
WHERE we.id = $1
GROUP BY we.id;
```

### Calculate Total Cost for Workspace

```sql
SELECT
    w.id,
    w.name,
    SUM(we.total_cost) AS total_workspace_cost,
    COUNT(we.id) AS total_executions
FROM workspaces w
JOIN workflow_executions we ON w.id = we.workspace_id
WHERE w.id = $1
  AND we.created_at >= NOW() - INTERVAL '30 days'
GROUP BY w.id, w.name;
```

### Find Most Popular Templates

```sql
SELECT
    wt.id,
    wt.name,
    wt.category,
    wt.usage_count,
    COUNT(we.id) AS recent_executions
FROM workflow_templates wt
LEFT JOIN workflow_executions we
    ON wt.id = we.template_id
    AND we.created_at >= NOW() - INTERVAL '7 days'
WHERE wt.workspace_id = $1
GROUP BY wt.id, wt.name, wt.category, wt.usage_count
ORDER BY recent_executions DESC, wt.usage_count DESC
LIMIT 10;
```

### Resume Execution from Failed Node

```sql
SELECT
    we.id,
    we.current_node_id,
    we.execution_context,
    we.celery_task_id
FROM workflow_executions we
WHERE we.id = $1
  AND we.status = 'failed'
  AND we.current_node_id IS NOT NULL;
```

---

## State Transitions

### WorkflowExecution Status State Machine

```
                                ┌─────────┐
                                │ PENDING │ (Initial state after creation)
                                └────┬────┘
                                     │
                          ┌──────────▼──────────┐
                          │                     │
                     User starts              System error
                     execution                before start
                          │                     │
                          ▼                     ▼
                    ┌──────────┐          ┌─────────┐
                    │ RUNNING  │          │ FAILED  │ (Terminal)
                    └────┬─────┘          └─────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
     User pauses    Node completes   Error during
     execution      all nodes        execution
          │              │              │
          ▼              ▼              ▼
    ┌─────────┐    ┌───────────┐   ┌─────────┐
    │ PAUSED  │    │ COMPLETED │   │ FAILED  │ (Terminal)
    └────┬────┘    └───────────┘   └─────────┘
         │           (Terminal)
    User resumes
    or cancels
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌──────────┐ ┌───────────┐
│ RUNNING  │ │ CANCELLED │ (Terminal)
└──────────┘ └───────────┘
```

**State Definitions**:

- **pending**: Execution created but not yet started (queued in Celery)
- **running**: Currently executing nodes, making AI API calls
- **paused**: Execution temporarily halted by user, can be resumed
- **completed**: All nodes executed successfully, outputs saved
- **failed**: Execution encountered an error and stopped
- **cancelled**: User manually cancelled execution before completion

**Valid State Transitions**:

| From State | To State | Trigger |
|------------|----------|---------|
| pending | running | Celery worker starts execution |
| pending | failed | System error before execution starts |
| running | paused | User clicks "Pause" button |
| running | completed | Final node (Finish) completes successfully |
| running | failed | Node execution error, API failure, validation error |
| running | cancelled | User clicks "Cancel" button |
| paused | running | User clicks "Resume" button |
| paused | cancelled | User clicks "Cancel" button |

**Terminal States** (no further transitions):
- completed
- failed
- cancelled

---

## Data Retention Policy

### Automatic Execution Cleanup

**Retention Rule**: Keep only the last **5000 executions per workflow template** to prevent unbounded database growth.

**Implementation**:

1. **Celery Beat Scheduled Task**: Runs daily at 02:00 UTC
2. **Cleanup Logic**:
   ```sql
   -- Delete old executions, keeping last 5000 per template
   DELETE FROM workflow_executions
   WHERE id IN (
       SELECT we.id
       FROM workflow_executions we
       WHERE we.template_id = $template_id
       ORDER BY we.created_at DESC
       OFFSET 5000
   );
   ```
3. **Cascade Deletes**: When execution is deleted, automatically removes:
   - All `node_outputs` records (FK constraint CASCADE)
   - All `agent_jobs` records (FK constraint CASCADE)
   - Does NOT delete generated documents (user-managed)

**Storage Impact**:
- Average execution size: 10 KB (metadata) + 100 KB (node outputs) = ~110 KB
- 5000 executions per workflow = 550 MB per workflow max
- 100 workflows per workspace = 55 GB max per workspace (reasonable)

**Manual Overrides**:
- Workspace admins can configure custom retention limits (1000-10000 range)
- System templates always use 5000 limit (not configurable)

### Data Retention Policy (General)

1. **Workflow Executions**: Auto-cleanup after 5000 executions (per template)
2. **Node Outputs**: Cascade delete when execution is deleted
3. **Agent Jobs**: Cascade delete when execution is deleted
4. **Generated Documents**: Persist indefinitely (user-managed deletion, not affected by execution cleanup)
5. **Workflow Templates**: Persist indefinitely (soft delete if needed)

---

## Security Considerations

1. **Access Control**:
   - All queries filtered by `workspace_id` to prevent cross-workspace access
   - Row-level security (RLS) policies on all tables

2. **Data Privacy**:
   - Sensitive prompts in `input_data_json` encrypted at rest
   - API keys never stored in `execution_context` (fetched from environment)

3. **Audit Trail**:
   - `created_at` timestamps on all tables for audit logging
   - `created_by` fields track user actions

---

## Summary

This data model supports:
- ✅ All 8 node types (Start, Finish, Text Gen, Image Gen, Conditional, Loop, Context, Processing)
- ✅ Variable passing with `{{node_name.field}}` syntax
- ✅ Resumable execution via `execution_context` and `current_node_id`
- ✅ Loop iterations with scope isolation
- ✅ Conditional branching with path tracking
- ✅ Cost tracking per execution and workspace
- ✅ Real-time progress monitoring via status updates
- ✅ Complete execution history and debugging capabilities
