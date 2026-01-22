-- Migration 021: Remove deprecated available_models column from workspaces
-- Feature 018: Admin Model Visibility - Cleanup
--
-- This column is no longer used since model visibility is now controlled
-- globally via the system_config table (visible_text_models, visible_image_models).
-- The per-workspace "Modelos Recomendados" feature has been removed.
--
-- Run this in Supabase SQL Editor

-- Step 1: Drop the column (data will be lost - ensure this is intentional)
ALTER TABLE workspaces DROP COLUMN IF EXISTS available_models;

-- Verify the column was removed
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'workspaces' AND column_name = 'available_models';
-- Should return 0 rows
