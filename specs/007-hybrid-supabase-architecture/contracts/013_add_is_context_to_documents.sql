-- =============================================================================
-- Migration 013: Add is_context field to documents table
-- Feature: 007-hybrid-supabase-architecture
-- Purpose: Distinguish context files (RAG) from regular creations
--
-- IMPORTANT: Run this script in the Supabase SQL Editor
-- =============================================================================

-- Step 1: Add is_context column to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_context BOOLEAN DEFAULT FALSE;

-- Step 2: Create index for filtering context files (partial index for performance)
CREATE INDEX IF NOT EXISTS idx_documents_is_context
  ON documents(is_context)
  WHERE is_context = TRUE;

-- Step 3: Composite index for project + context queries
CREATE INDEX IF NOT EXISTS idx_documents_project_context
  ON documents(project_id, is_context)
  WHERE is_context = TRUE AND deleted_at IS NULL;

-- Step 4: Add comment for documentation
COMMENT ON COLUMN documents.is_context IS 'Flag to mark document as context file for RAG (reference material, not a creation)';

-- =============================================================================
-- Verification query (optional - run to verify migration)
-- =============================================================================
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'documents' AND column_name = 'is_context';
