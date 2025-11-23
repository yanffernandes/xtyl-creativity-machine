-- Migration 003: Create folders table for hierarchical document organization
-- Date: 2025-11-22
-- Description: Enables folder structure within projects with parent-child relationships

-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    parent_folder_id VARCHAR REFERENCES folders(id) ON DELETE CASCADE,
    project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT check_not_self_parent CHECK (id != parent_folder_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_folders_project ON folders(project_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_folders_deleted ON folders(deleted_at);

-- Add comments for documentation
COMMENT ON TABLE folders IS 'Hierarchical folder structure for organizing documents within projects';
COMMENT ON COLUMN folders.id IS 'Unique folder identifier (UUID)';
COMMENT ON COLUMN folders.name IS 'Folder display name';
COMMENT ON COLUMN folders.parent_folder_id IS 'Parent folder ID for nested structure (NULL for root folders)';
COMMENT ON COLUMN folders.project_id IS 'Project this folder belongs to';
COMMENT ON COLUMN folders.deleted_at IS 'Soft delete timestamp (NULL if not deleted)';
