-- Migration 013: Add is_context field to documents table
-- Feature: 007-hybrid-supabase-architecture
-- Purpose: Distinguish context files (RAG) from regular creations

-- Add is_context column
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_context BOOLEAN DEFAULT FALSE;

-- Index for filtering context files
CREATE INDEX IF NOT EXISTS idx_documents_is_context ON documents(is_context) WHERE is_context = TRUE;

-- Composite index for project + context queries
CREATE INDEX IF NOT EXISTS idx_documents_project_context ON documents(project_id, is_context) WHERE is_context = TRUE AND deleted_at IS NULL;

-- Comment for documentation
COMMENT ON COLUMN documents.is_context IS 'Flag to mark document as context file for RAG (reference material, not a creation)';
