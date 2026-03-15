-- Migration: Drop user_memories table and all related objects
-- Feature 024 (user-memory) has been removed from the system.

-- Drop indexes
DROP INDEX IF EXISTS idx_user_memories_user_project;
DROP INDEX IF EXISTS idx_user_memories_category;
DROP INDEX IF EXISTS idx_user_memories_updated_at;
DROP INDEX IF EXISTS idx_user_memories_content_hash;
DROP INDEX IF EXISTS idx_user_memories_embedding;

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can view their own memories" ON user_memories;
DROP POLICY IF EXISTS "Users can create their own memories" ON user_memories;
DROP POLICY IF EXISTS "Users can update their own memories" ON user_memories;
DROP POLICY IF EXISTS "Users can delete their own memories" ON user_memories;

-- Drop table
DROP TABLE IF EXISTS user_memories;
