-- Migration: Enhance Workflow System Tables
-- Date: 2025-11-25
-- Description: Adds missing fields for complete workflow system (execution context, node outputs, structured outputs)

-- ============================================================================
-- ENHANCE WORKFLOW TEMPLATES
-- ============================================================================

-- Add is_recommended field for featured templates
ALTER TABLE workflow_templates
ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT FALSE;

-- Add version field for workflow schema versioning
ALTER TABLE workflow_templates
ADD COLUMN IF NOT EXISTS version VARCHAR DEFAULT '1.0';

-- Create index for recommended templates
CREATE INDEX IF NOT EXISTS idx_workflow_templates_is_recommended ON workflow_templates(is_recommended);

-- ============================================================================
-- ENHANCE WORKFLOW EXECUTIONS
-- ============================================================================

-- Add execution_context for variable values and loop state
ALTER TABLE workflow_executions
ADD COLUMN IF NOT EXISTS execution_context JSONB DEFAULT '{}'::jsonb;

-- Add celery_task_id for async control (pause/resume/cancel)
ALTER TABLE workflow_executions
ADD COLUMN IF NOT EXISTS celery_task_id VARCHAR;

-- Add total_tokens_used for usage tracking
ALTER TABLE workflow_executions
ADD COLUMN IF NOT EXISTS total_tokens_used INTEGER DEFAULT 0;

-- Add generated_document_ids array for tracking created documents
ALTER TABLE workflow_executions
ADD COLUMN IF NOT EXISTS generated_document_ids JSONB DEFAULT '[]'::jsonb;

-- Create index for celery task lookups
CREATE INDEX IF NOT EXISTS idx_workflow_executions_celery_task ON workflow_executions(celery_task_id);

-- Create index for created_at descending (for execution history queries)
CREATE INDEX IF NOT EXISTS idx_workflow_executions_created_at ON workflow_executions(created_at DESC);

-- Add index for user_id (for user execution history)
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user ON workflow_executions(user_id);

-- ============================================================================
-- CREATE NODE OUTPUTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS node_outputs (
    -- Primary Key
    id VARCHAR PRIMARY KEY,

    -- Relationships
    execution_id VARCHAR NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,

    -- Node Identification
    node_id VARCHAR NOT NULL,  -- Node ID from workflow definition
    node_name VARCHAR NOT NULL,  -- Human-readable node name for debugging
    node_type VARCHAR NOT NULL,  -- 'start', 'text_generation', 'image_generation', etc.

    -- Output Data (supports structured outputs via OutputParser)
    outputs JSONB NOT NULL,  -- Structured output data with parsed fields

    -- Metadata
    execution_order INTEGER NOT NULL,  -- Sequence number in execution (for topological sort)
    iteration_number INTEGER DEFAULT 0,  -- Loop iteration (0 if not in loop)

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for node_outputs
CREATE INDEX IF NOT EXISTS idx_node_outputs_execution ON node_outputs(execution_id);
CREATE INDEX IF NOT EXISTS idx_node_outputs_node_id ON node_outputs(node_id);
CREATE INDEX IF NOT EXISTS idx_node_outputs_execution_order ON node_outputs(execution_id, execution_order);
CREATE INDEX IF NOT EXISTS idx_node_outputs_iteration ON node_outputs(execution_id, iteration_number);

-- ============================================================================
-- UPGRADE COMPLETE
-- ============================================================================

-- To rollback this migration, run:
-- DROP TABLE IF EXISTS node_outputs CASCADE;
-- ALTER TABLE workflow_executions DROP COLUMN IF EXISTS generated_document_ids;
-- ALTER TABLE workflow_executions DROP COLUMN IF EXISTS total_tokens_used;
-- ALTER TABLE workflow_executions DROP COLUMN IF EXISTS celery_task_id;
-- ALTER TABLE workflow_executions DROP COLUMN IF EXISTS execution_context;
-- ALTER TABLE workflow_templates DROP COLUMN IF EXISTS version;
-- ALTER TABLE workflow_templates DROP COLUMN IF EXISTS is_recommended;
