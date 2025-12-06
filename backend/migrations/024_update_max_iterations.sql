-- Migration: 024_update_max_iterations
-- Feature: 023-assistant-image-tools
-- Description: Update max_iterations default from 15 to 25 for all users
-- Date: 2025-12-05

-- Update default for new records (PostgreSQL)
ALTER TABLE user_preferences
ALTER COLUMN max_iterations SET DEFAULT 25;

-- Update existing users who have the old default value
-- Only update users who still have the original default (15)
-- This preserves any custom values that users may have set
UPDATE user_preferences
SET max_iterations = 25
WHERE max_iterations = 15;

-- Verify the update
-- SELECT COUNT(*) as updated_count FROM user_preferences WHERE max_iterations = 25;
