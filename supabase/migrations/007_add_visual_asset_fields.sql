-- Migration: Add visual asset fields to documents table
-- Description: Adds fields to support visual assets library (logos, backgrounds, references)
-- Date: 2025-01-23

-- Add visual asset fields to documents table
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS is_reference_asset BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS asset_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS asset_metadata JSONB;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_is_reference_asset ON documents(is_reference_asset) WHERE is_reference_asset = TRUE;
CREATE INDEX IF NOT EXISTS idx_documents_asset_type ON documents(asset_type) WHERE asset_type IS NOT NULL;

-- Create GIN index for JSONB asset_metadata for fast JSON queries
CREATE INDEX IF NOT EXISTS idx_documents_asset_metadata ON documents USING GIN (asset_metadata) WHERE asset_metadata IS NOT NULL;

-- Add comments
COMMENT ON COLUMN documents.is_reference_asset IS 'Flag indicating if this is a visual asset (logo, background, etc.) for reference library';
COMMENT ON COLUMN documents.asset_type IS 'Type of visual asset: logo, background, person, reference, other';
COMMENT ON COLUMN documents.asset_metadata IS 'JSONB containing asset metadata: {tags: [], dimensions: "1920x1080", file_size: "2.5MB", format: "PNG", color_mode: "RGB"}';
