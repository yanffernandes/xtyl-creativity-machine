-- Migration: Add project_id to Workflow Templates
-- Date: 2025-11-26
-- Description: Adds project_id to workflow_templates to support project-specific workflows

ALTER TABLE workflow_templates
ADD COLUMN IF NOT EXISTS project_id VARCHAR REFERENCES projects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_workflow_templates_project ON workflow_templates(project_id);
