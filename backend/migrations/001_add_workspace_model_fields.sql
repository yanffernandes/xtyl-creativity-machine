-- Migration: Add default_text_model and default_vision_model fields to workspaces table
-- Date: 2025-11-22
-- Description: Allows workspaces to configure default AI models for text and vision tasks

-- Add the new columns to the workspaces table
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS default_text_model VARCHAR,
ADD COLUMN IF NOT EXISTS default_vision_model VARCHAR;

-- Add comments to document the columns
COMMENT ON COLUMN workspaces.default_text_model IS 'Default text model ID for AI chat and text generation (e.g., x-ai/grok-beta)';
COMMENT ON COLUMN workspaces.default_vision_model IS 'Default vision model ID for image analysis (e.g., claude-3-haiku-20240307)';
