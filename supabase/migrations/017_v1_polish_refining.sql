-- Migration: 017_v1_polish_refining.sql
-- Feature: 016-v1-polish
-- Purpose: Add fields for image refinement quality preservation and prompt enrichment

-- ============================================================================
-- 1. Add refinement tracking fields to documents table
-- ============================================================================

-- Add original_image_id to track the original image for refinements
-- Note: Using VARCHAR to match documents.id type (not UUID)
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS original_image_id VARCHAR REFERENCES documents(id);

-- Add refinement_history to store accumulated refinement instructions
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS refinement_history JSONB DEFAULT '[]'::jsonb;

-- ============================================================================
-- 2. Create index for refinement queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_documents_original_image_id
ON documents(original_image_id)
WHERE original_image_id IS NOT NULL;

-- ============================================================================
-- 3. Add prompt_enrichment model to ai_models configuration
-- ============================================================================

UPDATE system_config
SET value = jsonb_set(
    jsonb_set(
        value,
        '{defaults,prompt_enrichment}',
        '"anthropic/claude-4-haiku"'
    ),
    '{fallbacks,prompt_enrichment}',
    '"openai/gpt-5-mini"'
)
WHERE key = 'ai_models'
AND NOT (value->'defaults' ? 'prompt_enrichment');

-- ============================================================================
-- 4. Add column comments for documentation
-- ============================================================================

COMMENT ON COLUMN documents.original_image_id IS
    'For refined images, reference to the original image to preserve quality during iterative refinements';

COMMENT ON COLUMN documents.refinement_history IS
    'JSONB array of refinement prompts applied: [{prompt: string, applied_at: timestamp}]';
