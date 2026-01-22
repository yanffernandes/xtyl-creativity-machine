-- Migration: Add soft delete support to projects and related tables
-- Feature: 020-project-delete
-- Date: 2025-12-05

-- Add deleted_at to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add deleted_at to workflow_templates table
ALTER TABLE workflow_templates
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add deleted_at to workflow_executions table
ALTER TABLE workflow_executions
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for efficient filtering of active records
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_deleted_at ON workflow_templates(deleted_at);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_deleted_at ON workflow_executions(deleted_at);

-- Note: Documents and Folders already have deleted_at columns
-- The soft_delete_project() function in crud.py will cascade updates to all related entities
