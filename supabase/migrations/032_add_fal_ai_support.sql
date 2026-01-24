-- Migration: 032_add_fal_ai_support.sql
-- Feature: 029-fal-ai-migration
-- Description: Add tables for fal.ai image operations and model configuration

-- ============================================================================
-- 1. Create image_operations table
-- ============================================================================
CREATE TABLE IF NOT EXISTS image_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Operation details
    operation_type VARCHAR(50) NOT NULL,

    -- Input
    input_image_url TEXT NOT NULL,
    mask_url TEXT, -- Only for inpaint operations
    prompt TEXT, -- For inpaint and edit operations

    -- Output
    output_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    output_image_url TEXT,

    -- Model info
    provider VARCHAR(50) NOT NULL DEFAULT 'fal.ai',
    model_id VARCHAR(255) NOT NULL,
    model_params JSONB DEFAULT '{}',

    -- Cost tracking
    cost_cents INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT valid_operation_type CHECK (
        operation_type IN ('inpaint', 'edit', 'remove_bg', 'upscale', 'enhance', 'generate')
    ),
    CONSTRAINT valid_status CHECK (
        status IN ('pending', 'processing', 'completed', 'failed')
    )
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_image_operations_document ON image_operations(document_id);
CREATE INDEX IF NOT EXISTS idx_image_operations_project ON image_operations(project_id);
CREATE INDEX IF NOT EXISTS idx_image_operations_user ON image_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_image_operations_status ON image_operations(status);
CREATE INDEX IF NOT EXISTS idx_image_operations_created ON image_operations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_operations_type ON image_operations(operation_type);

-- ============================================================================
-- 2. Create fal_model_configs table
-- ============================================================================
CREATE TABLE IF NOT EXISTS fal_model_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Model identification
    model_id VARCHAR(255) NOT NULL UNIQUE,
    provider VARCHAR(50) NOT NULL DEFAULT 'fal.ai',

    -- Display info
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,

    -- Capabilities
    supports_mask BOOLEAN DEFAULT FALSE,
    supports_reference BOOLEAN DEFAULT FALSE,
    supports_prompt BOOLEAN DEFAULT TRUE,
    max_resolution INTEGER DEFAULT 2048,
    supported_aspect_ratios TEXT[] DEFAULT ARRAY['1:1', '16:9', '9:16', '4:3', '3:4'],

    -- Pricing
    price_per_mp DECIMAL(10, 6), -- Price per megapixel
    price_per_image DECIMAL(10, 6), -- Fixed price per image
    price_per_second DECIMAL(10, 6), -- For video models

    -- Admin settings
    is_visible BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_category CHECK (
        category IN ('generation', 'editing', 'utility', 'video')
    )
);

-- Index for queries
CREATE INDEX IF NOT EXISTS idx_fal_model_configs_category ON fal_model_configs(category);
CREATE INDEX IF NOT EXISTS idx_fal_model_configs_visible ON fal_model_configs(is_visible);

-- ============================================================================
-- 3. Add columns to documents table
-- ============================================================================
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS processing_status VARCHAR(50) DEFAULT 'ready';

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS source_operation_id UUID;

-- Add foreign key constraint (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_documents_source_operation'
    ) THEN
        ALTER TABLE documents
        ADD CONSTRAINT fk_documents_source_operation
        FOREIGN KEY (source_operation_id)
        REFERENCES image_operations(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- 4. Seed initial fal.ai models
-- ============================================================================
INSERT INTO fal_model_configs (model_id, display_name, description, category, supports_mask, supports_reference, price_per_image, price_per_mp, is_default, sort_order) VALUES
    -- Generation models
    ('fal-ai/gpt-image-1.5', 'GPT Image 1.5', 'OpenAI latest with excellent text rendering', 'generation', FALSE, TRUE, 0.04, NULL, TRUE, 1),
    ('fal-ai/flux-pro', 'FLUX Pro', 'High quality photorealistic generation', 'generation', FALSE, TRUE, NULL, 0.05, FALSE, 2),
    ('fal-ai/flux/dev', 'FLUX Dev', 'Fast and affordable generation', 'generation', FALSE, TRUE, NULL, 0.025, FALSE, 3),
    ('fal-ai/gemini-3-pro-image-preview', 'Gemini 3 Pro', 'Google conversational image generation', 'generation', FALSE, TRUE, 0.039, NULL, FALSE, 4),
    ('fal-ai/recraft-v3', 'Recraft V3', 'Vectors and branding focused', 'generation', FALSE, TRUE, NULL, NULL, FALSE, 5),

    -- Editing models
    ('fal-ai/flux-pro/v1/fill', 'FLUX Fill Pro', 'Precision inpainting with mask', 'editing', TRUE, FALSE, NULL, 0.05, FALSE, 10),
    ('fal-ai/flux-pro/kontext', 'FLUX Kontext', 'Natural language image editing', 'editing', FALSE, TRUE, 0.04, NULL, FALSE, 11),
    ('fal-ai/flux-kontext/max', 'FLUX Kontext Max', 'Maximum quality editing', 'editing', FALSE, TRUE, NULL, 0.11, FALSE, 12),
    ('fal-ai/gpt-image-1.5/edit', 'GPT Image 1.5 Edit', 'Instruction-based editing', 'editing', TRUE, TRUE, 0.04, NULL, FALSE, 13),
    ('fal-ai/qwen-image-edit/inpaint', 'Qwen Image Edit', 'Budget inpainting option', 'editing', TRUE, FALSE, NULL, 0.03, FALSE, 14),

    -- Utility models
    ('fal-ai/bria/background/remove', 'Remove Background', 'Professional background removal (Bria RMBG 2.0)', 'utility', FALSE, FALSE, 0.018, NULL, FALSE, 20),
    ('fal-ai/clarity-upscaler', 'Clarity Upscaler', 'AI-powered image upscaling with enhancement', 'utility', FALSE, FALSE, 0.02, NULL, FALSE, 21),
    ('fal-ai/esrgan', 'ESRGAN', 'Classic fast upscaling algorithm', 'utility', FALSE, FALSE, 0.01, NULL, FALSE, 22),
    ('fal-ai/topaz/upscale/image', 'Topaz Upscale', 'Professional quality upscaling', 'utility', FALSE, FALSE, 0.05, NULL, FALSE, 23),

    -- Video models (future)
    ('fal-ai/veo-3', 'Veo 3.1', 'Google DeepMind video generation', 'video', FALSE, TRUE, NULL, NULL, FALSE, 30),
    ('fal-ai/kling-video/v2.6', 'Kling 2.6', 'Motion control video generation', 'video', FALSE, TRUE, NULL, NULL, FALSE, 31),
    ('fal-ai/ltx-2', 'LTX-2', 'Text/Image to video generation', 'video', FALSE, TRUE, NULL, NULL, FALSE, 32)
ON CONFLICT (model_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    supports_mask = EXCLUDED.supports_mask,
    supports_reference = EXCLUDED.supports_reference,
    price_per_image = EXCLUDED.price_per_image,
    price_per_mp = EXCLUDED.price_per_mp,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- ============================================================================
-- 5. Enable RLS for new tables
-- ============================================================================
ALTER TABLE image_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fal_model_configs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own operations
CREATE POLICY "Users can view their own image operations"
    ON image_operations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own image operations"
    ON image_operations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own image operations"
    ON image_operations FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: All users can view visible model configs
CREATE POLICY "Anyone can view visible model configs"
    ON fal_model_configs FOR SELECT
    USING (is_visible = TRUE);

-- Policy: Only admins can modify model configs (via service role)
CREATE POLICY "Service role can manage model configs"
    ON fal_model_configs FOR ALL
    USING (auth.role() = 'service_role');

COMMENT ON TABLE image_operations IS 'Tracks all fal.ai image edit/utility operations';
COMMENT ON TABLE fal_model_configs IS 'Configuration and pricing for fal.ai models';
