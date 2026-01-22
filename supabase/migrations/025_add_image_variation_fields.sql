-- Migration 025: Add Image Variation Fields
-- Feature: Smart Image Generation - Multiple variations per request
-- Created: 2025-12-12

-- Add variation fields to document table
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS variation_set_id UUID,
ADD COLUMN IF NOT EXISTS variation_index INTEGER,
ADD COLUMN IF NOT EXISTS variation_modifier TEXT;

-- Add comments for documentation
COMMENT ON COLUMN documents.variation_set_id IS 'UUID that groups variations from the same generation request';
COMMENT ON COLUMN documents.variation_index IS 'Index of this variation within the set (0, 1, 2)';
COMMENT ON COLUMN documents.variation_modifier IS 'Style modifier applied to this variation';

-- Create index for efficient grouping queries
CREATE INDEX IF NOT EXISTS idx_document_variation_set_id ON documents(variation_set_id) WHERE variation_set_id IS NOT NULL;

-- Insert default system config for image generation variations
INSERT INTO system_config (key, value, description)
VALUES (
    'image_generation_default_variations',
    '{"count": 2, "modifiers": ["versão minimalista e clean, com espaço em branco, tipografia elegante", "versão vibrante e impactante, cores saturadas, elementos dinâmicos", "versão sofisticada e premium, tons neutros, composição equilibrada"], "enabled": true}',
    'Configuração padrão de variações para geração de imagens'
)
ON CONFLICT (key) DO NOTHING;
