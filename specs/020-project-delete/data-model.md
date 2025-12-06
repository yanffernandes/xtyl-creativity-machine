# Data Model: Project Deletion with Soft Delete

**Feature**: 020-project-delete
**Date**: 2025-12-05

## Entity Changes

### Project (Modified)

**Table**: `projects`

| Field | Type | Nullable | Default | Notes |
|-------|------|----------|---------|-------|
| id | UUID/String | No | uuid_generate_v4() | Primary key |
| name | String | No | - | Project name |
| description | Text | Yes | NULL | Project description |
| workspace_id | UUID/String | No | - | FK to workspaces.id |
| settings | JSONB | Yes | {} | Project settings for AI context |
| created_at | Timestamp(tz) | No | now() | Creation timestamp |
| **deleted_at** | **Timestamp(tz)** | **Yes** | **NULL** | **NEW: Soft delete timestamp** |

**Indexes**:
- `idx_projects_workspace_id` on `workspace_id` (existing)
- `idx_projects_deleted_at` on `deleted_at` (new - for filtering active projects)

**Constraints**:
- FK `workspace_id` → `workspaces.id`

### WorkflowTemplate (Modified)

**Table**: `workflow_templates`

| Field | Type | Nullable | Default | Notes |
|-------|------|----------|---------|-------|
| id | UUID/String | No | uuid_generate_v4() | Primary key |
| name | String | No | - | Template name |
| description | Text | Yes | NULL | Description |
| project_id | UUID/String | Yes | NULL | FK to projects.id |
| nodes_json | JSONB | Yes | NULL | ReactFlow nodes |
| edges_json | JSONB | Yes | NULL | ReactFlow edges |
| config_json | JSONB | Yes | {} | Template configuration |
| is_published | Boolean | No | false | Published status |
| created_at | Timestamp(tz) | No | now() | Creation timestamp |
| updated_at | Timestamp(tz) | Yes | NULL | Last update timestamp |
| **deleted_at** | **Timestamp(tz)** | **Yes** | **NULL** | **NEW: Soft delete timestamp** |

**Indexes**:
- `idx_workflow_templates_project_id` on `project_id` (existing)
- `idx_workflow_templates_deleted_at` on `deleted_at` (new)

### WorkflowExecution (Modified)

**Table**: `workflow_executions`

| Field | Type | Nullable | Default | Notes |
|-------|------|----------|---------|-------|
| id | UUID/String | No | uuid_generate_v4() | Primary key |
| workflow_template_id | UUID/String | No | - | FK to workflow_templates.id |
| project_id | UUID/String | No | - | FK to projects.id |
| status | String | No | 'pending' | Execution status |
| config_json | JSONB | Yes | {} | Execution configuration |
| execution_context | JSONB | Yes | {} | Runtime context |
| error_message | Text | Yes | NULL | Error details |
| started_at | Timestamp(tz) | Yes | NULL | Start timestamp |
| completed_at | Timestamp(tz) | Yes | NULL | Completion timestamp |
| created_at | Timestamp(tz) | No | now() | Creation timestamp |
| **deleted_at** | **Timestamp(tz)** | **Yes** | **NULL** | **NEW: Soft delete timestamp** |

**Indexes**:
- `idx_workflow_executions_project_id` on `project_id` (existing)
- `idx_workflow_executions_deleted_at` on `deleted_at` (new)

## Unchanged Entities (Already Have deleted_at)

### Document

Already has `deleted_at` column. Will be cascade-updated when project is soft-deleted.

### Folder

Already has `deleted_at` column. Will be cascade-updated when project is soft-deleted.

## State Transitions

### Project Lifecycle

```
┌─────────────┐                    ┌─────────────┐
│   Active    │ ── soft delete ──▶ │   Deleted   │
│ deleted_at  │                    │ deleted_at  │
│   = NULL    │                    │ = timestamp │
└─────────────┘                    └─────────────┘
       ▲                                  │
       │                                  │
       └────────── restore ───────────────┘
                (future feature)
```

### Cascade Behavior

When a project is soft-deleted:

```
Project (deleted_at set)
    │
    ├── Documents (all deleted_at set)
    │
    ├── Folders (all deleted_at set)
    │
    ├── WorkflowTemplates (all deleted_at set)
    │       │
    │       └── WorkflowExecutions (all deleted_at set)
    │
    └── (VisualAssets - NOT deleted, only DB references affected)
```

## Query Patterns

### List Active Projects

```sql
SELECT * FROM projects
WHERE workspace_id = :workspace_id
  AND deleted_at IS NULL
ORDER BY created_at DESC;
```

### Get Project (Including Deleted Check)

```sql
SELECT * FROM projects
WHERE id = :project_id
  AND deleted_at IS NULL;
```

### Soft Delete Project (Transaction)

```sql
BEGIN;

-- Set timestamp
SET @now = NOW();

-- Cascade to documents
UPDATE documents SET deleted_at = @now WHERE project_id = :project_id;

-- Cascade to folders
UPDATE folders SET deleted_at = @now WHERE project_id = :project_id;

-- Cascade to workflow templates
UPDATE workflow_templates SET deleted_at = @now WHERE project_id = :project_id;

-- Cascade to workflow executions (via template)
UPDATE workflow_executions
SET deleted_at = @now
WHERE workflow_template_id IN (
    SELECT id FROM workflow_templates WHERE project_id = :project_id
);

-- Finally, delete the project
UPDATE projects SET deleted_at = @now WHERE id = :project_id;

COMMIT;
```

## Migration

### SQL Migration (023_add_project_soft_delete.sql)

```sql
-- Add deleted_at to projects
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add deleted_at to workflow_templates
ALTER TABLE workflow_templates
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add deleted_at to workflow_executions
ALTER TABLE workflow_executions
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_deleted_at ON workflow_templates(deleted_at);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_deleted_at ON workflow_executions(deleted_at);

-- Update RLS policies if needed (Supabase)
-- Note: Existing SELECT policies may need AND deleted_at IS NULL condition
```

## Validation Rules

| Rule | Entity | Condition |
|------|--------|-----------|
| Cannot delete already-deleted project | Project | `deleted_at IS NULL` |
| Only owner/admin can delete | Project | User role in ['owner', 'admin'] |
| Cascade must be atomic | All | Single transaction |
