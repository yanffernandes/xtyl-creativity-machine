-- Migration: 015_add_visual_asset_fields.sql
-- Feature: 011-smart-visual-assets
-- Date: 2025-11-29
-- Description: Add AI classification fields to documents and create visual settings tables

-- ============================================================================
-- 1. EXTEND DOCUMENTS TABLE
-- ============================================================================

-- Add new columns for AI classification
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS asset_category VARCHAR(20),
ADD COLUMN IF NOT EXISTS asset_tags TEXT[],
ADD COLUMN IF NOT EXISTS ai_description TEXT;

-- Add constraint for category values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_asset_category'
    ) THEN
        ALTER TABLE documents
        ADD CONSTRAINT chk_asset_category
        CHECK (asset_category IS NULL OR asset_category IN ('Logo', 'Pessoa', 'Background', 'Produto', 'Outro'));
    END IF;
END $$;

-- Add index for category queries
CREATE INDEX IF NOT EXISTS idx_documents_asset_category
ON documents(project_id, asset_category)
WHERE is_reference_asset = TRUE;

-- ============================================================================
-- 2. CREATE ASSISTANT_VISUAL_SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS assistant_visual_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mode VARCHAR(10) NOT NULL DEFAULT 'manual',
    assets_per_category INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_visual_settings_project UNIQUE (project_id),
    CONSTRAINT chk_visual_mode CHECK (mode IN ('manual', 'auto')),
    CONSTRAINT chk_assets_per_category CHECK (assets_per_category BETWEEN 1 AND 5)
);

-- ============================================================================
-- 3. CREATE ASSISTANT_ASSET_SELECTION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS assistant_asset_selection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settings_id UUID NOT NULL REFERENCES assistant_visual_settings(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_asset_selection UNIQUE (settings_id, asset_id)
);

-- Index for fetching enabled selections
CREATE INDEX IF NOT EXISTS idx_asset_selection_settings
ON assistant_asset_selection(settings_id)
WHERE is_enabled = TRUE;

-- ============================================================================
-- 4. CREATE ASSET_USAGE_HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS asset_usage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL,
    generation_id UUID,
    used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for rotation queries (find least recently used)
CREATE INDEX IF NOT EXISTS idx_usage_history_asset
ON asset_usage_history(asset_id, used_at DESC);

-- ============================================================================
-- 5. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN documents.asset_category IS 'Visual asset category: Logo, Pessoa, Background, Produto, Outro';
COMMENT ON COLUMN documents.asset_tags IS 'Array of descriptive tags for the visual asset (AI-generated or manual)';
COMMENT ON COLUMN documents.ai_description IS 'AI-generated description of the image content (max 500 chars)';

COMMENT ON TABLE assistant_visual_settings IS 'Per-project visual context settings for AI assistant (feature 011)';
COMMENT ON COLUMN assistant_visual_settings.is_enabled IS 'Whether visual context is enabled for this project';
COMMENT ON COLUMN assistant_visual_settings.mode IS 'Selection mode: manual (user picks) or auto (rotation-based)';
COMMENT ON COLUMN assistant_visual_settings.assets_per_category IS 'In auto mode, how many assets per category to include (1-5)';

COMMENT ON TABLE assistant_asset_selection IS 'Manual mode: tracks which assets are selected for visual context';
COMMENT ON TABLE asset_usage_history IS 'Tracks asset usage for rotation algorithm (30-day retention recommended)';
