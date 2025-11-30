-- Migration: Create Workflow System Tables
-- Date: 2025-11-25
-- Description: Creates tables for autonomous workflow system (US1-US3)

-- ============================================================================
-- WORKFLOW TEMPLATES
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflow_templates (
    id VARCHAR PRIMARY KEY,
    workspace_id VARCHAR NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    description TEXT,
    category VARCHAR,

    -- Workflow definition (ReactFlow format)
    nodes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    edges_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    default_params_json JSONB DEFAULT '{}'::jsonb,

    -- Template metadata
    is_system BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_workspace ON workflow_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_is_system ON workflow_templates(is_system);

-- ============================================================================
-- WORKFLOW EXECUTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflow_executions (
    id VARCHAR PRIMARY KEY,
    template_id VARCHAR NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
    project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    workspace_id VARCHAR NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Execution state
    status VARCHAR NOT NULL DEFAULT 'pending',
    config_json JSONB DEFAULT '{}'::jsonb,
    progress_percent INTEGER DEFAULT 0,
    current_node_id VARCHAR,

    -- Results and errors
    error_message TEXT,
    total_cost NUMERIC(10, 6) DEFAULT 0.0,

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_template ON workflow_executions(template_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_project ON workflow_executions(project_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workspace ON workflow_executions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);

-- ============================================================================
-- AGENT JOBS
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_jobs (
    id VARCHAR PRIMARY KEY,
    execution_id VARCHAR NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    node_id VARCHAR NOT NULL,
    job_type VARCHAR NOT NULL,

    -- Job state
    status VARCHAR NOT NULL DEFAULT 'pending',
    input_data_json JSONB,
    output_data_json JSONB,
    error_message TEXT,

    -- Usage tracking
    tokens_used INTEGER DEFAULT 0,

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_jobs_execution ON agent_jobs(execution_id);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_status ON agent_jobs(status);

-- ============================================================================
-- DOCUMENT ATTACHMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_attachments (
    id VARCHAR PRIMARY KEY,
    document_id VARCHAR NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    image_id VARCHAR NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- Attachment metadata
    is_primary BOOLEAN DEFAULT FALSE,
    attachment_order INTEGER DEFAULT 0,
    created_by_workflow_id VARCHAR REFERENCES workflow_executions(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_attachments_document ON document_attachments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_attachments_image ON document_attachments(image_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_document_attachments_unique ON document_attachments(document_id, image_id);

-- ============================================================================
-- UPGRADE COMPLETE
-- ============================================================================

-- To rollback this migration, run:
-- DROP TABLE IF EXISTS document_attachments CASCADE;
-- DROP TABLE IF EXISTS agent_jobs CASCADE;
-- DROP TABLE IF EXISTS workflow_executions CASCADE;
-- DROP TABLE IF EXISTS workflow_templates CASCADE;
