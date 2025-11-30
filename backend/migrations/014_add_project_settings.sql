-- Migration: 014_add_project_settings.sql
-- Description: Add settings JSONB column to projects table for project context configuration
-- Feature: 009-project-settings

-- Add settings column to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_projects_settings_gin
ON projects USING GIN (settings);

-- Add comment for documentation
COMMENT ON COLUMN projects.settings IS 'Project settings for AI context (client_name, description, target_audience, brand_voice, key_messages, competitors, custom_notes)';
