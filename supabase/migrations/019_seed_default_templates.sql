-- Migration: 019 - Seed Default System Templates
-- Feature: Default marketing templates for AI assistant and workflows
-- Date: 2025-12-04
-- Purpose: Execute Python script to seed 51 AI templates + 18 workflow templates

-- This migration delegates to a Python script for maintainability
-- Run: python backend/migrations/seed_default_templates.py

-- Verification queries:
-- SELECT category, COUNT(*) FROM templates WHERE is_system = true GROUP BY category;
-- SELECT category, COUNT(*) FROM workflow_templates WHERE is_system = true GROUP BY category;

-- Note: This is a placeholder SQL file. The actual migration is performed by
-- the Python script seed_default_templates.py which provides better maintainability
-- for large data migrations.

-- If you need to run this via SQL only, contact the development team.
