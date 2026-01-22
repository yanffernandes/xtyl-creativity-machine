-- Migration: 022 - Add Enhanced Fields to Templates Table
-- Feature: 019-default-templates
-- Date: 2025-12-05
-- Description: Adds new columns for dynamic forms, expert info, and featured templates

-- Add new columns to templates table
-- Using IF NOT EXISTS pattern for idempotency

-- Variables: JSONB array for dynamic form fields
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'templates' AND column_name = 'variables'
    ) THEN
        ALTER TABLE templates ADD COLUMN variables JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Initial message: Optional first user message
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'templates' AND column_name = 'initial_message'
    ) THEN
        ALTER TABLE templates ADD COLUMN initial_message TEXT;
    END IF;
END $$;

-- Expert name: Attribution (e.g., "Framework AIDA", "Alex Hormozi")
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'templates' AND column_name = 'expert_name'
    ) THEN
        ALTER TABLE templates ADD COLUMN expert_name VARCHAR(255);
    END IF;
END $$;

-- Estimated outputs: What user can expect (e.g., "5 headlines + 3 textos")
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'templates' AND column_name = 'estimated_outputs'
    ) THEN
        ALTER TABLE templates ADD COLUMN estimated_outputs VARCHAR(255);
    END IF;
END $$;

-- Is featured: Highlight certain templates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'templates' AND column_name = 'is_featured'
    ) THEN
        ALTER TABLE templates ADD COLUMN is_featured BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Tags: Array of searchable tags
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'templates' AND column_name = 'tags'
    ) THEN
        ALTER TABLE templates ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Verification
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'templates'
ORDER BY ordinal_position;
