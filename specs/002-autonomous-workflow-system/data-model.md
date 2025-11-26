# Data Model: Autonomous Workflow System

**Feature ID:** 002-autonomous-workflow-system
**Created:** 2025-11-25
**Status:** Design Complete
**Related Documents:** [spec.md](./spec.md) | [plan.md](./plan.md) | [research.md](./research.md)

---

## Overview

This document defines the complete data model for the autonomous workflow system, including all entities, relationships, state machines, database constraints, and validation rules. The model supports visual workflow creation with ReactFlow, async execution via Celery, document-image attachments, and comprehensive execution tracking.

**Key Design Principles:**
1. **State Persistence**: Every workflow execution state is persisted to enable pause/resume
2. **Granular Tracking**: Agent jobs tracked individually for parallel execution monitoring
3. **Referential Integrity**: Foreign keys enforce valid relationships between workflows/executions/nodes
4. **Flexible Configuration**: JSONB fields store dynamic node configurations and execution parameters
5. **Audit Trail**: Timestamps and user tracking for all creation/modification events

---

## Core Entities

### 1. WorkflowTemplate

Represents a reusable workflow definition with visual structure (nodes/edges), default parameters, and metadata. Templates can be system-provided or user-created.

#### Database Schema

```sql
CREATE TABLE workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    -- Metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,  -- e.g., 'social_media', 'paid_ads', 'blog_content', 'email_campaigns'

    -- Ownership
    is_system BOOLEAN NOT NULL DEFAULT false,  -- System templates vs user-created
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Versioning
    version INTEGER NOT NULL DEFAULT 1,

    -- Usage tracking
    usage_count INTEGER NOT NULL DEFAULT 0,  -- Incremented each time template is executed

    -- Visual structure (ReactFlow data)
    nodes JSONB NOT NULL,  -- Array of node definitions with positions
    edges JSONB NOT NULL,  -- Array of connections between nodes

    -- Default configuration
    default_params JSONB,  -- Default execution parameters (can be overridden at runtime)

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_category CHECK (category IN (
        'social_media', 'paid_ads', 'blog_content',
        'email_campaigns', 'seo', 'custom'
    ))
);

CREATE INDEX idx_workflow_templates_workspace ON workflow_templates(workspace_id);
CREATE INDEX idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX idx_workflow_templates_is_system ON workflow_templates(is_system);
CREATE INDEX idx_workflow_templates_usage ON workflow_templates(usage_count DESC);
```

#### Field Descriptions

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Unique template identifier | `550e8400-e29b-41d4-a716-446655440000` |
| `workspace_id` | UUID | Workspace this template belongs to | `123e4567-e89b-12d3-a456-426614174000` |
| `name` | VARCHAR(255) | Human-readable template name | "Facebook Ads Campaign" |
| `description` | TEXT | Detailed template description | "Generate 10 ad copy variations with 5 creative images optimized for Facebook feed" |
| `category` | VARCHAR(50) | Template category for filtering | "paid_ads" |
| `is_system` | BOOLEAN | True for pre-built templates | `true` |
| `created_by` | UUID | User who created template (null for system) | `789e0123-e89b-12d3-a456-426614174000` |
| `version` | INTEGER | Template version number | `2` |
| `usage_count` | INTEGER | Times this template has been executed | `234` |
| `nodes` | JSONB | ReactFlow node definitions (see below) | `[{id: "1", type: "generate_copy", ...}]` |
| `edges` | JSONB | ReactFlow edge definitions | `[{id: "e1-2", source: "1", target: "2"}]` |
| `default_params` | JSONB | Default execution parameters | `{quantity: 10, temperature: 0.7}` |

#### JSONB Field Structures

**nodes JSONB Structure:**
```json
[
  {
    "id": "node-1",
    "type": "generate_copy",
    "position": {"x": 100, "y": 100},
    "data": {
      "label": "Generate Ad Copy",
      "config": {
        "prompt_template": "Create a {{tone}} ad copy for {{product}} targeting {{audience}}",
        "model": "gpt-4",
        "temperature": 0.7,
        "quantity": 10,
        "output_status": "draft"
      }
    }
  },
  {
    "id": "node-2",
    "type": "generate_image",
    "position": {"x": 400, "y": 100},
    "data": {
      "label": "Generate Creatives",
      "config": {
        "prompt_template": "Create a {{style}} image for: {{copy_content}}",
        "model": "dall-e-3",
        "size": "1024x1024",
        "quantity": 5
      }
    }
  },
  {
    "id": "node-3",
    "type": "attach_to_document",
    "position": {"x": 700, "y": 100},
    "data": {
      "label": "Attach Images to Copies",
      "config": {
        "attachment_strategy": "one_to_one",
        "set_primary": true
      }
    }
  }
]
```

**edges JSONB Structure:**
```json
[
  {
    "id": "edge-1-2",
    "source": "node-1",
    "target": "node-2",
    "sourceHandle": "output",
    "targetHandle": "input"
  },
  {
    "id": "edge-2-3",
    "source": "node-2",
    "target": "node-3"
  }
]
```

**default_params JSONB Structure:**
```json
{
  "topic": "Summer Sale",
  "tone": "excited",
  "target_audience": "millennials",
  "brand_voice": "casual and friendly",
  "quantity": 10,
  "context_document_ids": []  // Empty array means use all project documents
}
```

#### Relationships

- **Belongs To**: `workspace_id` → `workspaces.id` (CASCADE DELETE)
- **Created By**: `created_by` → `users.id` (SET NULL on user deletion)
- **Has Many**: `workflow_executions` (1:N)
- **Has Many**: `workflow_nodes` (1:N via denormalized `nodes` JSONB - no separate table in v1)

---

### 2. WorkflowNode

Node definitions are stored within `WorkflowTemplate.nodes` JSONB array in v1 for simplicity. If normalization is needed in v2, here's the schema:

#### Node Types and Configurations

| Node Type | Description | Config Fields |
|-----------|-------------|---------------|
| `generate_copy` | Generate text content using LLM | `prompt_template`, `model`, `temperature`, `quantity`, `max_tokens`, `output_status` |
| `generate_image` | Generate images using DALL-E/Stable Diffusion | `prompt_template`, `model`, `size`, `quantity`, `style` |
| `attach_to_document` | Link generated images to copy documents | `attachment_strategy` (one_to_one, one_to_many, many_to_one), `set_primary` |
| `review` | Human-in-the-loop approval gate | `required_approvers`, `auto_approve_after` (hours), `approval_criteria` |
| `conditional` | Branch execution based on rules | `condition_expression`, `true_path_node_id`, `false_path_node_id` |
| `parallel` | Execute multiple sub-paths simultaneously | `branch_node_ids[]`, `wait_for_all` (boolean) |
| `merge` | Combine outputs from parallel branches | `merge_strategy` (concatenate, interleave, custom) |

#### Node Configuration Examples

**Generate Copy Node:**
```json
{
  "type": "generate_copy",
  "config": {
    "prompt_template": "Write a {{tone}} {{content_type}} about {{topic}} for {{audience}}. Brand voice: {{brand_voice}}",
    "model": "gpt-4-turbo",
    "temperature": 0.8,
    "max_tokens": 500,
    "quantity": 10,
    "output_status": "draft",  // draft | review | published
    "context_selection": "all"  // all | specific_ids | tag_filter
  }
}
```

**Generate Image Node:**
```json
{
  "type": "generate_image",
  "config": {
    "prompt_template": "Create a {{style}} image showing {{subject}}. Style: {{visual_tone}}",
    "model": "dall-e-3",
    "size": "1024x1024",  // 1024x1024 | 1792x1024 | 1024x1792
    "quality": "standard",  // standard | hd
    "quantity": 5,
    "depends_on_node": "node-1"  // Optional: use output from previous node in prompt
  }
}
```

**Attach to Document Node:**
```json
{
  "type": "attach_to_document",
  "config": {
    "copy_source_node": "node-1",  // Node ID that generated copies
    "image_source_node": "node-2",  // Node ID that generated images
    "attachment_strategy": "one_to_one",  // one_to_one | round_robin | all_to_all
    "set_primary": true,  // Set first attached image as primary
    "attachment_order": "creation_time"  // creation_time | random | alphabetical
  }
}
```

**Review Node:**
```json
{
  "type": "review",
  "config": {
    "review_message": "Please review the generated copies before creating images",
    "required_approvers": 1,
    "auto_approve_after_hours": 24,
    "pause_execution": true
  }
}
```

**Conditional Node:**
```json
{
  "type": "conditional",
  "config": {
    "condition_type": "field_comparison",  // field_comparison | custom_expression
    "field_path": "previous_node.output.word_count",
    "operator": "greater_than",
    "value": 500,
    "true_branch_node": "node-5",  // Long-form image node
    "false_branch_node": "node-6"  // Short-form image node
  }
}
```

**Parallel Node:**
```json
{
  "type": "parallel",
  "config": {
    "branch_nodes": ["node-4a", "node-4b", "node-4c"],
    "wait_for_all": true,  // Wait for all branches to complete
    "continue_on_error": false  // Stop if any branch fails
  }
}
```

---

### 3. WorkflowExecution

Represents a specific running instance of a workflow template with concrete parameters, execution state, and progress tracking.

#### Database Schema

```sql
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template reference
    template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE RESTRICT,
    template_snapshot JSONB NOT NULL,  -- Copy of template at execution time (prevents changes from affecting running workflows)

    -- Context
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

    -- Execution state
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    progress_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,  -- 0.00 to 100.00
    current_node_id VARCHAR(100),  -- ID of currently executing node

    -- Execution configuration
    execution_params JSONB NOT NULL,  -- User-provided parameters for this run

    -- Results
    execution_log JSONB,  -- Array of node execution summaries
    output_document_ids JSONB,  -- Array of generated document IDs

    -- Error handling
    error_message TEXT,
    failed_node_id VARCHAR(100),
    retry_count INTEGER NOT NULL DEFAULT 0,

    -- Resource tracking
    total_tokens_used INTEGER DEFAULT 0,
    total_cost_usd DECIMAL(10,4) DEFAULT 0.0000,

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_completion_at TIMESTAMP WITH TIME ZONE,

    -- Audit
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_status CHECK (status IN (
        'pending', 'running', 'paused', 'completed', 'failed', 'stopped'
    )),
    CONSTRAINT valid_progress CHECK (progress_percent >= 0 AND progress_percent <= 100)
);

CREATE INDEX idx_workflow_executions_template ON workflow_executions(template_id);
CREATE INDEX idx_workflow_executions_workspace ON workflow_executions(workspace_id);
CREATE INDEX idx_workflow_executions_project ON workflow_executions(project_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_created_by ON workflow_executions(created_by);
CREATE INDEX idx_workflow_executions_started_at ON workflow_executions(started_at DESC);
```

#### Field Descriptions

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Unique execution identifier | `abc12345-e29b-41d4-a716-446655440000` |
| `template_id` | UUID | Reference to template used | `550e8400-e29b-41d4-a716-446655440000` |
| `template_snapshot` | JSONB | Copy of template at execution time | Full template structure |
| `workspace_id` | UUID | Workspace context | `123e4567-e89b-12d3-a456-426614174000` |
| `project_id` | UUID | Project context (optional) | `456e7890-e89b-12d3-a456-426614174000` |
| `status` | VARCHAR(20) | Current execution state | "running" |
| `progress_percent` | DECIMAL(5,2) | Completion percentage | `45.50` |
| `current_node_id` | VARCHAR(100) | Currently executing node | "node-3" |
| `execution_params` | JSONB | Runtime parameters | See below |
| `execution_log` | JSONB | Node execution history | See below |
| `output_document_ids` | JSONB | Generated document IDs | `["doc-1", "doc-2", "doc-3"]` |
| `error_message` | TEXT | Error details if failed | "API rate limit exceeded" |
| `failed_node_id` | VARCHAR(100) | Node that failed | "node-5" |
| `retry_count` | INTEGER | Number of retry attempts | `2` |
| `total_tokens_used` | INTEGER | Total LLM tokens consumed | `15423` |
| `total_cost_usd` | DECIMAL(10,4) | Total execution cost | `0.2345` |

#### JSONB Field Structures

**execution_params JSONB:**
```json
{
  "topic": "Black Friday Sale",
  "tone": "urgent",
  "target_audience": "existing customers",
  "brand_voice": "energetic and bold",
  "quantity": 15,
  "context_document_ids": [
    "doc-123",
    "doc-456"
  ],
  "uploaded_references": [
    {
      "filename": "brand-guidelines.pdf",
      "storage_path": "s3://bucket/workflows/exec-abc/brand-guidelines.pdf"
    }
  ]
}
```

**execution_log JSONB:**
```json
[
  {
    "node_id": "node-1",
    "node_type": "generate_copy",
    "status": "completed",
    "started_at": "2025-11-25T10:15:30Z",
    "completed_at": "2025-11-25T10:17:45Z",
    "duration_seconds": 135,
    "items_generated": 15,
    "tokens_used": 8234,
    "cost_usd": 0.1234,
    "output_ids": ["doc-001", "doc-002", "doc-003"]
  },
  {
    "node_id": "node-2",
    "node_type": "generate_image",
    "status": "completed",
    "started_at": "2025-11-25T10:17:50Z",
    "completed_at": "2025-11-25T10:22:30Z",
    "duration_seconds": 280,
    "items_generated": 5,
    "tokens_used": 0,
    "cost_usd": 0.4500,
    "output_ids": ["img-001", "img-002", "img-003", "img-004", "img-005"]
  },
  {
    "node_id": "node-3",
    "node_type": "attach_to_document",
    "status": "running",
    "started_at": "2025-11-25T10:22:35Z",
    "attachments_created": 3,
    "attachments_total": 5
  }
]
```

#### Relationships

- **Belongs To**: `template_id` → `workflow_templates.id` (RESTRICT DELETE - prevent template deletion if executions exist)
- **Belongs To**: `workspace_id` → `workspaces.id` (CASCADE DELETE)
- **Belongs To**: `project_id` → `projects.id` (SET NULL)
- **Created By**: `created_by` → `users.id` (SET NULL)
- **Has Many**: `agent_jobs` (1:N)

---

### 4. AgentJob

Represents an individual AI agent task within a workflow execution. Used for tracking parallel operations (e.g., generating 10 copies simultaneously results in 10 agent jobs).

#### Database Schema

```sql
CREATE TABLE agent_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Execution context
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    node_id VARCHAR(100) NOT NULL,  -- Node that spawned this job

    -- Job details
    job_type VARCHAR(50) NOT NULL,  -- generate_copy | generate_image | etc.
    job_index INTEGER,  -- For parallel jobs: 0, 1, 2, ... (null for single jobs)

    -- State
    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    -- Input/Output
    input_data JSONB,  -- Job-specific input parameters
    output_data JSONB,  -- Generated output (document ID, image URL, etc.)

    -- Resource tracking
    tokens_used INTEGER DEFAULT 0,
    cost_usd DECIMAL(10,4) DEFAULT 0.0000,

    -- Error handling
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_job_status CHECK (status IN (
        'pending', 'running', 'completed', 'failed', 'skipped'
    )),
    CONSTRAINT valid_job_type CHECK (job_type IN (
        'generate_copy', 'generate_image', 'attach_to_document',
        'review', 'conditional_check', 'merge_results'
    ))
);

CREATE INDEX idx_agent_jobs_execution ON agent_jobs(execution_id);
CREATE INDEX idx_agent_jobs_node ON agent_jobs(execution_id, node_id);
CREATE INDEX idx_agent_jobs_status ON agent_jobs(status);
CREATE INDEX idx_agent_jobs_started_at ON agent_jobs(started_at DESC);
```

#### Field Descriptions

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Unique job identifier | `job-12345-e29b-41d4-a716-446655440000` |
| `execution_id` | UUID | Parent workflow execution | `abc12345-e29b-41d4-a716-446655440000` |
| `node_id` | VARCHAR(100) | Node that created this job | "node-2" |
| `job_type` | VARCHAR(50) | Type of AI operation | "generate_image" |
| `job_index` | INTEGER | Index in parallel batch | `3` (4th of 10 parallel jobs) |
| `status` | VARCHAR(20) | Current job state | "completed" |
| `input_data` | JSONB | Job input parameters | See below |
| `output_data` | JSONB | Job results | See below |
| `tokens_used` | INTEGER | LLM tokens consumed | `523` |
| `cost_usd` | DECIMAL(10,4) | Job cost | `0.0089` |
| `error_message` | TEXT | Error if failed | "Content policy violation" |
| `retry_count` | INTEGER | Retry attempts | `1` |

#### JSONB Examples

**input_data for generate_copy job:**
```json
{
  "prompt": "Write an urgent ad copy about Black Friday Sale for existing customers. Brand voice: energetic and bold",
  "model": "gpt-4-turbo",
  "temperature": 0.8,
  "max_tokens": 500,
  "context_documents": ["doc-123", "doc-456"]
}
```

**output_data for generate_copy job:**
```json
{
  "document_id": "doc-789",
  "content_preview": "Don't miss out! Our biggest Black Friday sale is here...",
  "word_count": 87,
  "tokens_generated": 134
}
```

**input_data for generate_image job:**
```json
{
  "prompt": "Create a vibrant image showing a shopping cart overflowing with products. Style: energetic and bold",
  "model": "dall-e-3",
  "size": "1024x1024",
  "quality": "standard"
}
```

**output_data for generate_image job:**
```json
{
  "image_id": "img-456",
  "image_url": "https://minio.example.com/images/img-456.png",
  "revised_prompt": "A vibrant, energetic illustration of an overflowing shopping cart...",
  "width": 1024,
  "height": 1024
}
```

#### Relationships

- **Belongs To**: `execution_id` → `workflow_executions.id` (CASCADE DELETE)

---

### 5. DocumentAttachment

Represents the many-to-many relationship between text documents and image documents, with metadata for ordering and primary image designation.

#### Database Schema

```sql
CREATE TABLE document_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relationship
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    image_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- Metadata
    is_primary BOOLEAN NOT NULL DEFAULT false,
    attachment_order INTEGER NOT NULL DEFAULT 0,
    caption TEXT,

    -- Provenance
    created_by_workflow_id UUID REFERENCES workflow_executions(id) ON DELETE SET NULL,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(document_id, image_id),
    CONSTRAINT valid_attachment_order CHECK (attachment_order >= 0)
);

-- Ensure only one primary image per document
CREATE UNIQUE INDEX idx_document_attachments_primary
ON document_attachments(document_id)
WHERE is_primary = true;

CREATE INDEX idx_document_attachments_document ON document_attachments(document_id);
CREATE INDEX idx_document_attachments_image ON document_attachments(image_id);
CREATE INDEX idx_document_attachments_workflow ON document_attachments(created_by_workflow_id);
CREATE INDEX idx_document_attachments_order ON document_attachments(document_id, attachment_order);
```

#### Field Descriptions

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | UUID | Unique attachment identifier | `att-12345-e29b-41d4-a716-446655440000` |
| `document_id` | UUID | Text document (copy) | `doc-789` |
| `image_id` | UUID | Image document | `img-456` |
| `is_primary` | BOOLEAN | Primary image flag | `true` |
| `attachment_order` | INTEGER | Display order (0-indexed) | `0` (first image) |
| `caption` | TEXT | Optional image caption | "Primary creative for Facebook feed" |
| `created_by_workflow_id` | UUID | Workflow that created attachment | `exec-abc` |
| `created_by_user_id` | UUID | User who manually attached | `user-123` |
| `created_at` | TIMESTAMP | Attachment timestamp | `2025-11-25T10:22:45Z` |

#### Relationships

- **Belongs To**: `document_id` → `documents.id` (CASCADE DELETE)
- **Belongs To**: `image_id` → `documents.id` (CASCADE DELETE)
- **Created By Workflow**: `created_by_workflow_id` → `workflow_executions.id` (SET NULL)
- **Created By User**: `created_by_user_id` → `users.id` (SET NULL)

---

## Entity Relationships Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTONOMOUS WORKFLOW SYSTEM                          │
│                              Entity Relationships                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   Workspace      │
│                  │
└────────┬─────────┘
         │
         │ 1:N
         │
         ▼
┌──────────────────────────┐
│  WorkflowTemplate        │◄─────────┐
│  ────────────────        │          │
│  - id                    │          │ FK
│  - workspace_id          │          │
│  - name                  │          │
│  - category              │          │
│  - is_system             │          │
│  - nodes (JSONB)         │          │
│  - edges (JSONB)         │          │
│  - default_params        │          │
└────────┬─────────────────┘          │
         │                            │
         │ 1:N                        │
         │                            │
         ▼                            │
┌──────────────────────────┐          │
│  WorkflowExecution       │──────────┘
│  ────────────────        │
│  - id                    │
│  - template_id           │
│  - workspace_id          │
│  - project_id            │
│  - status                │
│  - progress_percent      │
│  - current_node_id       │
│  - execution_params      │
│  - execution_log         │
│  - output_document_ids   │
└────────┬─────────────────┘
         │
         │ 1:N
         │
         ▼
┌──────────────────────────┐
│  AgentJob                │
│  ────────                │
│  - id                    │
│  - execution_id          │
│  - node_id               │
│  - job_type              │
│  - status                │
│  - input_data            │
│  - output_data           │
│  - tokens_used           │
│  - cost_usd              │
└──────────────────────────┘


┌──────────────────┐                  ┌──────────────────┐
│  Document        │                  │  Document        │
│  (Copy)          │                  │  (Image)         │
│  ────────        │                  │  ────────        │
│  - id            │                  │  - id            │
│  - content       │                  │  - image_url     │
│  - workspace_id  │                  │  - workspace_id  │
└────────┬─────────┘                  └────────┬─────────┘
         │                                     │
         │ M:N                                 │ M:N
         │                                     │
         │      ┌──────────────────────────┐  │
         └─────►│  DocumentAttachment      │◄─┘
                │  ──────────────────      │
                │  - id                    │
                │  - document_id           │
                │  - image_id              │
                │  - is_primary            │
                │  - attachment_order      │
                │  - caption               │
                │  - created_by_workflow_id│
                │  - created_by_user_id    │
                └────────┬─────────────────┘
                         │
                         │ FK (optional)
                         │
                         ▼
                ┌──────────────────────┐
                │ WorkflowExecution    │
                │ (provenance tracking)│
                └──────────────────────┘


┌──────────────────┐
│   User           │
│                  │
└────────┬─────────┘
         │
         │ 1:N (created_by)
         │
         ├─────────────► WorkflowTemplate
         │
         ├─────────────► WorkflowExecution
         │
         └─────────────► DocumentAttachment


┌──────────────────┐
│   Project        │
│                  │
└────────┬─────────┘
         │
         │ 1:N (optional)
         │
         └─────────────► WorkflowExecution
```

---

## State Machines

### Workflow Execution State Machine

```
                           ┌─────────────────────────────────┐
                           │                                 │
                           │      START: User launches       │
                           │         workflow                │
                           │                                 │
                           └────────────┬────────────────────┘
                                        │
                                        ▼
                           ┌─────────────────────┐
                           │                     │
                           │      PENDING        │
                           │                     │
                           │  - Validating       │
                           │  - Queuing tasks    │
                           │                     │
                           └────────┬────────────┘
                                    │
                                    │ Celery task starts
                                    │
                                    ▼
                           ┌─────────────────────┐
                           │                     │
            ┌──────────────►      RUNNING        │
            │              │                     │
            │              │  - Executing nodes  │
            │              │  - Progress updates │
            │  Resume      │                     │
            │              └─────┬───────┬───────┘
            │                    │       │
            │                    │       │ Error in node
            │                    │       │
            │    User pauses     │       ▼
            │              ┌─────▼──────────────┐
            │              │                    │
            └──────────────┤      PAUSED        │
                           │                    │
                           │  - State preserved │
                           │  - Can adjust      │
                           │    parameters      │
                           │                    │
                           └──────┬─────────────┘
                                  │
                                  │ User stops
                                  │
                  ┌───────────────┼───────────────┐
                  │               │               │
                  │ All nodes     │               │ User stops
                  │ complete      │               │ or timeout
                  │               │               │
                  ▼               ▼               ▼
         ┌────────────────┐ ┌──────────┐ ┌───────────────┐
         │                │ │          │ │               │
         │   COMPLETED    │ │  FAILED  │ │    STOPPED    │
         │                │ │          │ │               │
         │ - All outputs  │ │ - Error  │ │ - Partial     │
         │   generated    │ │ - Partial│ │   results     │
         │ - Cost tracked │ │   results│ │ - User action │
         │                │ │ - Retry  │ │               │
         │                │ │   option │ │               │
         │                │ │          │ │               │
         └────────────────┘ └────┬─────┘ └───────────────┘
                                 │
                                 │ Retry failed node
                                 │
                                 ▼
                           ┌─────────────┐
                           │   RUNNING   │
                           │   (resumed) │
                           └─────────────┘


State Transition Rules:
━━━━━━━━━━━━━━━━━━━━━━━━━

PENDING → RUNNING
  - Trigger: First Celery task starts executing
  - Condition: All validations passed

RUNNING → PAUSED
  - Trigger: User clicks "Pause"
  - Condition: Current node completes (no mid-node pause)
  - Effect: Set status=paused, save current_node_id

PAUSED → RUNNING
  - Trigger: User clicks "Resume"
  - Condition: None (can always resume)
  - Effect: Continue from current_node_id

RUNNING → COMPLETED
  - Trigger: All nodes executed successfully
  - Condition: progress_percent = 100
  - Effect: Set completed_at timestamp

RUNNING → FAILED
  - Trigger: Node execution error with no retry
  - Condition: error_message is set
  - Effect: Save failed_node_id, error details

RUNNING → STOPPED
  - Trigger: User clicks "Stop" OR timeout (30 min)
  - Condition: None (can stop anytime)
  - Effect: Cancel pending Celery tasks

PAUSED → STOPPED
  - Trigger: User clicks "Stop"
  - Condition: None

FAILED → RUNNING
  - Trigger: User clicks "Retry Node"
  - Condition: Failed node is retryable
  - Effect: Reset failed_node_id, increment retry_count
```

### Agent Job State Machine

```
                    ┌─────────────┐
                    │             │
                    │   PENDING   │
                    │             │
                    └──────┬──────┘
                           │
                           │ Celery picks up task
                           │
                           ▼
                    ┌─────────────┐
                    │             │
                    │   RUNNING   │
                    │             │
                    │  - API call │
                    │  - Generate │
                    │             │
                    └──┬───────┬──┘
                       │       │
         Success       │       │ Error (no more retries)
                       │       │
                       │       │
                       ▼       ▼
              ┌──────────┐  ┌─────────┐
              │          │  │         │
              │COMPLETED │  │ FAILED  │
              │          │  │         │
              │- Output  │  │- Error  │
              │  saved   │  │  logged │
              │          │  │         │
              └──────────┘  └─────────┘
                       │
                       │ User skips node
                       │
                       ▼
                  ┌─────────┐
                  │         │
                  │ SKIPPED │
                  │         │
                  └─────────┘

State Transition Rules:
━━━━━━━━━━━━━━━━━━━━━━━━━

PENDING → RUNNING
  - Trigger: Celery worker starts processing
  - Effect: Set started_at timestamp

RUNNING → COMPLETED
  - Trigger: AI API returns success
  - Condition: output_data is valid
  - Effect: Set completed_at, save output_data

RUNNING → FAILED
  - Trigger: Error with no retries left
  - Condition: retry_count >= max_retries
  - Effect: Set error_message, update parent execution

RUNNING → PENDING (implicit retry)
  - Trigger: Transient error (rate limit, network)
  - Condition: retry_count < max_retries
  - Effect: Increment retry_count, requeue task

PENDING → SKIPPED
  - Trigger: User chooses "Skip Node" after parent node failure
  - Condition: Parent execution in failed state
  - Effect: No output generated, execution continues
```

### Node Execution States (within execution_log)

```
Each node in execution_log JSONB tracks:

  not_started → running → completed
                    │
                    └────► failed
                    │
                    └────► skipped
```

---

## Database Indexes

### Performance Optimization Indexes

```sql
-- WorkflowTemplate indexes
CREATE INDEX idx_workflow_templates_workspace ON workflow_templates(workspace_id);
CREATE INDEX idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX idx_workflow_templates_is_system ON workflow_templates(is_system);
CREATE INDEX idx_workflow_templates_usage ON workflow_templates(usage_count DESC);
CREATE INDEX idx_workflow_templates_created_at ON workflow_templates(created_at DESC);

-- WorkflowExecution indexes
CREATE INDEX idx_workflow_executions_template ON workflow_executions(template_id);
CREATE INDEX idx_workflow_executions_workspace ON workflow_executions(workspace_id);
CREATE INDEX idx_workflow_executions_project ON workflow_executions(project_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_created_by ON workflow_executions(created_by);
CREATE INDEX idx_workflow_executions_started_at ON workflow_executions(started_at DESC);

-- Composite index for active workflow queries
CREATE INDEX idx_workflow_executions_active
ON workflow_executions(workspace_id, status, updated_at DESC)
WHERE status IN ('pending', 'running', 'paused');

-- AgentJob indexes
CREATE INDEX idx_agent_jobs_execution ON agent_jobs(execution_id);
CREATE INDEX idx_agent_jobs_node ON agent_jobs(execution_id, node_id);
CREATE INDEX idx_agent_jobs_status ON agent_jobs(status);
CREATE INDEX idx_agent_jobs_started_at ON agent_jobs(started_at DESC);

-- DocumentAttachment indexes
CREATE INDEX idx_document_attachments_document ON document_attachments(document_id);
CREATE INDEX idx_document_attachments_image ON document_attachments(image_id);
CREATE INDEX idx_document_attachments_workflow ON document_attachments(created_by_workflow_id);
CREATE INDEX idx_document_attachments_order ON document_attachments(document_id, attachment_order);

-- Unique partial index for primary images
CREATE UNIQUE INDEX idx_document_attachments_primary
ON document_attachments(document_id)
WHERE is_primary = true;
```

### Index Usage Patterns

| Query Pattern | Index Used | Benefit |
|---------------|------------|---------|
| List templates by workspace | `idx_workflow_templates_workspace` | Fast workspace filtering |
| Browse templates by category | `idx_workflow_templates_category` | Category filtering |
| Sort templates by popularity | `idx_workflow_templates_usage` | Popular templates first |
| Get active workflows for workspace | `idx_workflow_executions_active` | Efficient polling queries |
| Get execution history for template | `idx_workflow_executions_template` | Template analytics |
| Get jobs for execution | `idx_agent_jobs_execution` | Execution detail view |
| Get document attachments | `idx_document_attachments_document` | Document view with images |
| Prevent duplicate primary images | `idx_document_attachments_primary` | Data integrity constraint |

---

## Validation Rules

### Workflow Template Validation

| Rule ID | Description | Enforcement |
|---------|-------------|-------------|
| **VR-T01** | Template MUST have at least 1 node | Application layer |
| **VR-T02** | Template MUST NOT have cycles in node connections | Application layer (cycle detection algorithm) |
| **VR-T03** | Node IDs MUST be unique within template | Application layer |
| **VR-T04** | Edge source and target MUST reference existing nodes | Application layer |
| **VR-T05** | System templates CANNOT be modified by users | Database (is_system check) + API layer |
| **VR-T06** | Template name MUST be unique per workspace | Database unique constraint (planned for v2) |
| **VR-T07** | Node positions MUST be valid numbers | Application layer (Pydantic validation) |
| **VR-T08** | Default params MUST match node input requirements | Application layer |

### Workflow Execution Validation

| Rule ID | Description | Enforcement |
|---------|-------------|-------------|
| **VR-E01** | Execution CANNOT be resumed if status is 'completed', 'failed', or 'stopped' | API layer |
| **VR-E02** | Execution params MUST provide all required template variables | Application layer |
| **VR-E03** | Context documents MUST belong to same workspace | API layer |
| **VR-E04** | Progress percent MUST be between 0 and 100 | Database constraint |
| **VR-E05** | Maximum execution time is 30 minutes (hard timeout) | Celery task timeout |
| **VR-E06** | Template snapshot MUST be immutable after execution starts | Application layer |
| **VR-E07** | Only one execution per user can be in 'running' state (v1 limitation) | Application layer (relaxed in v2) |

### Agent Job Validation

| Rule ID | Description | Enforcement |
|---------|-------------|-------------|
| **VR-J01** | Job MUST belong to a valid execution | Database foreign key |
| **VR-J02** | Parallel jobs MUST have unique job_index values | Application layer |
| **VR-J03** | Input data MUST match job_type requirements | Application layer (Pydantic schemas) |
| **VR-J04** | Maximum retry count is 3 | Application layer (Celery config) |
| **VR-J05** | Job tokens_used MUST be non-negative | Database constraint (planned) |

### Document Attachment Validation

| Rule ID | Description | Enforcement |
|---------|-------------|-------------|
| **VR-A01** | Only ONE primary image per document | Database unique partial index |
| **VR-A02** | Image ID MUST reference a document of type 'image' | Application layer |
| **VR-A03** | Document ID MUST reference a document of type 'copy' | Application layer |
| **VR-A04** | Maximum 20 images per document | Application layer |
| **VR-A05** | Attachment order MUST be >= 0 | Database constraint |
| **VR-A06** | Image CANNOT be attached to same document twice | Database unique constraint |
| **VR-A07** | Image size MUST be <= 10MB | Application layer (validated at upload) |
| **VR-A08** | Detaching primary image auto-promotes next image | Application layer trigger |

---

## Data Integrity Constraints

### Foreign Key Constraints

```sql
-- WorkflowTemplate
ALTER TABLE workflow_templates
  ADD CONSTRAINT fk_workflow_templates_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,

  ADD CONSTRAINT fk_workflow_templates_created_by
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- WorkflowExecution
ALTER TABLE workflow_executions
  ADD CONSTRAINT fk_workflow_executions_template
  FOREIGN KEY (template_id) REFERENCES workflow_templates(id) ON DELETE RESTRICT,

  ADD CONSTRAINT fk_workflow_executions_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,

  ADD CONSTRAINT fk_workflow_executions_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,

  ADD CONSTRAINT fk_workflow_executions_created_by
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- AgentJob
ALTER TABLE agent_jobs
  ADD CONSTRAINT fk_agent_jobs_execution
  FOREIGN KEY (execution_id) REFERENCES workflow_executions(id) ON DELETE CASCADE;

-- DocumentAttachment
ALTER TABLE document_attachments
  ADD CONSTRAINT fk_document_attachments_document
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,

  ADD CONSTRAINT fk_document_attachments_image
  FOREIGN KEY (image_id) REFERENCES documents(id) ON DELETE CASCADE,

  ADD CONSTRAINT fk_document_attachments_workflow
  FOREIGN KEY (created_by_workflow_id) REFERENCES workflow_executions(id) ON DELETE SET NULL,

  ADD CONSTRAINT fk_document_attachments_user
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL;
```

### Cascade Behaviors

| Entity Deleted | Cascade Effect |
|----------------|----------------|
| **Workspace** | CASCADE: Delete all templates, executions, attachments |
| **WorkflowTemplate** | RESTRICT: Cannot delete if executions exist (data integrity) |
| **WorkflowExecution** | CASCADE: Delete all agent jobs; SET NULL in attachments |
| **User** | SET NULL: Preserve templates/executions, lose attribution |
| **Document (copy)** | CASCADE: Delete all attachments to that document |
| **Document (image)** | CASCADE: Remove image from all documents it's attached to |
| **Project** | SET NULL: Executions remain but lose project association |

---

## Example Data Flows

### Example 1: Launching a Workflow

```sql
-- 1. User selects "Facebook Ads Campaign" template
SELECT * FROM workflow_templates
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- 2. Create execution record
INSERT INTO workflow_executions (
  template_id,
  template_snapshot,
  workspace_id,
  project_id,
  status,
  execution_params,
  created_by
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  '{"nodes": [...], "edges": [...]}',  -- Full template copy
  '123e4567-e89b-12d3-a456-426614174000',
  '456e7890-e89b-12d3-a456-426614174000',
  'pending',
  '{"topic": "Black Friday", "quantity": 10}',
  'user-abc123'
) RETURNING id;

-- 3. Create agent jobs for first parallel node (generate 10 copies)
INSERT INTO agent_jobs (execution_id, node_id, job_type, job_index, input_data)
SELECT
  'exec-abc',
  'node-1',
  'generate_copy',
  generate_series(0, 9),  -- 10 parallel jobs
  '{"prompt": "...", "model": "gpt-4-turbo"}';

-- 4. Update execution status
UPDATE workflow_executions
SET status = 'running', started_at = NOW()
WHERE id = 'exec-abc';
```

### Example 2: Attaching Images to Documents

```sql
-- 1. Workflow "Attach to Document" node executes
-- Generate attachments for one_to_one strategy (copy[i] → image[i])

INSERT INTO document_attachments (
  document_id,
  image_id,
  is_primary,
  attachment_order,
  created_by_workflow_id
)
SELECT
  copy_docs.id,
  image_docs.id,
  (row_number() OVER (PARTITION BY copy_docs.id ORDER BY image_docs.created_at) = 1) AS is_primary,
  row_number() OVER (PARTITION BY copy_docs.id ORDER BY image_docs.created_at) - 1 AS attachment_order,
  'exec-abc'
FROM
  unnest(ARRAY['doc-001', 'doc-002', 'doc-003']) AS copy_docs(id)
  CROSS JOIN LATERAL
  unnest(ARRAY['img-001', 'img-002', 'img-003']) AS image_docs(id);

-- Result:
-- doc-001 → img-001 (primary=true, order=0)
-- doc-002 → img-002 (primary=true, order=0)
-- doc-003 → img-003 (primary=true, order=0)
```

### Example 3: Querying Active Workflows

```sql
-- Get all active workflows for a workspace with progress
SELECT
  we.id,
  wt.name AS template_name,
  we.status,
  we.progress_percent,
  we.current_node_id,
  we.started_at,
  we.estimated_completion_at,
  COUNT(aj.id) FILTER (WHERE aj.status = 'completed') AS jobs_completed,
  COUNT(aj.id) AS jobs_total
FROM workflow_executions we
JOIN workflow_templates wt ON we.template_id = wt.id
LEFT JOIN agent_jobs aj ON aj.execution_id = we.id
WHERE we.workspace_id = '123e4567-e89b-12d3-a456-426614174000'
  AND we.status IN ('running', 'paused')
GROUP BY we.id, wt.name
ORDER BY we.updated_at DESC;
```

---

## Migration Strategy

### Phase 1: Core Tables (Week 1)

```python
# Alembic migration: 001_add_workflow_core_tables.py

def upgrade():
    # Create workflow_templates
    op.create_table(
        'workflow_templates',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('workspace_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        # ... all columns ...
    )

    # Create workflow_executions
    op.create_table('workflow_executions', ...)

    # Create agent_jobs
    op.create_table('agent_jobs', ...)

    # Create indexes
    op.create_index('idx_workflow_templates_workspace', ...)

def downgrade():
    op.drop_table('agent_jobs')
    op.drop_table('workflow_executions')
    op.drop_table('workflow_templates')
```

### Phase 2: Document Attachments (Week 2)

```python
# Alembic migration: 002_add_document_attachments.py

def upgrade():
    # Create document_attachments
    op.create_table('document_attachments', ...)

    # Create unique partial index for primary images
    op.execute("""
        CREATE UNIQUE INDEX idx_document_attachments_primary
        ON document_attachments(document_id)
        WHERE is_primary = true;
    """)

def downgrade():
    op.drop_table('document_attachments')
```

### Phase 3: Seed System Templates (Week 3)

```python
# Data migration: 003_seed_system_templates.py

def upgrade():
    # Insert pre-built templates
    templates = [
        {
            'name': 'Facebook Ads Campaign',
            'category': 'paid_ads',
            'is_system': True,
            'nodes': [...],
            'edges': [...]
        },
        # ... 9 more templates ...
    ]

    for template in templates:
        op.execute(
            workflow_templates.insert().values(**template)
        )
```

---

## Summary

This data model provides a robust foundation for the autonomous workflow system with:

- **6 core entities**: WorkflowTemplate, WorkflowExecution, AgentJob, DocumentAttachment (plus existing User, Workspace, Project, Document)
- **3 state machines**: Execution states (6 states), Job states (5 states), Node states (4 states)
- **15+ database indexes** for query performance
- **25+ validation rules** enforced at database + application layers
- **Clear separation of concerns**: Templates define structure, Executions track runtime, Jobs handle parallelism, Attachments link outputs

**Next Steps:**
1. Review this data model with backend team
2. Create Alembic migrations for new tables
3. Implement Pydantic schemas matching this structure
4. Build API contracts based on these entities (see [contracts/](./contracts/))
5. Proceed to implementation phase with `/speckit.tasks`

