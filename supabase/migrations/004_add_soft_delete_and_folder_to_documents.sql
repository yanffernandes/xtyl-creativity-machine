-- Migration 004: Add soft delete and folder relationship to documents
-- Date: 2025-11-22
-- Description: Enables soft deletion of documents and folder organization

-- Add folder relationship and soft delete timestamp
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS folder_id VARCHAR REFERENCES folders(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index for folder relationship queries
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_id);

-- Create index for filtering deleted documents
CREATE INDEX IF NOT EXISTS idx_documents_deleted ON documents(deleted_at);

-- Add comments for documentation
COMMENT ON COLUMN documents.folder_id IS 'Parent folder ID (NULL for root-level documents)';
COMMENT ON COLUMN documents.deleted_at IS 'Soft delete timestamp (NULL if not deleted)';
