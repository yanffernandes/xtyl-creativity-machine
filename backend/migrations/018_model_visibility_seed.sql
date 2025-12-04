-- Migration: Admin Model Visibility Configuration (Feature 018)
-- Adds separate configuration keys for text and image model visibility

-- ============================================================================
-- 1. Insert visible_text_models configuration
-- ============================================================================

INSERT INTO system_config (id, key, value, description, updated_at)
SELECT
    gen_random_uuid(),
    'visible_text_models',
    '["anthropic/claude-sonnet-4-20250514", "anthropic/claude-3-5-sonnet-20241022", "openai/gpt-4o", "openai/gpt-4-turbo", "google/gemini-2.0-flash-001"]'::jsonb,
    'List of text/LLM models visible to users in AI assistants',
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE key = 'visible_text_models');

-- ============================================================================
-- 2. Insert visible_image_models configuration
-- ============================================================================

INSERT INTO system_config (id, key, value, description, updated_at)
SELECT
    gen_random_uuid(),
    'visible_image_models',
    '["openai/dall-e-3", "google/imagen-3"]'::jsonb,
    'List of image generation models visible to users',
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE key = 'visible_image_models');

-- ============================================================================
-- 3. Migrate existing visible_models to visible_text_models (backward compat)
-- ============================================================================

-- If visible_models exists and visible_text_models doesn't have custom values,
-- copy the visible_models list to visible_text_models
UPDATE system_config AS target
SET value = source.value,
    updated_at = NOW()
FROM system_config AS source
WHERE target.key = 'visible_text_models'
  AND source.key = 'visible_models'
  AND source.value IS NOT NULL
  AND source.value != '[]'::jsonb;

-- ============================================================================
-- 4. Comments
-- ============================================================================

COMMENT ON COLUMN system_config.value IS 'Configuration value stored as JSONB - supports arrays and objects';
