-- Migration 024: Create User Memories Table
-- Feature: User Memory System - Persistent memory for AI assistant
-- Created: 2025-12-06

-- Enable pgvector if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create user_memories table
CREATE TABLE IF NOT EXISTS user_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    embedding vector(1536),
    category VARCHAR(50) DEFAULT 'other',
    source_conversation_id VARCHAR REFERENCES chat_conversations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_project_memory_hash UNIQUE (user_id, project_id, content_hash),
    CONSTRAINT valid_category CHECK (category IN ('personal', 'professional', 'preference', 'plan', 'health', 'other'))
);

-- Add table comment
COMMENT ON TABLE user_memories IS 'Stores extracted facts about users from chat conversations';
COMMENT ON COLUMN user_memories.content_hash IS 'SHA-256 hash of content for deduplication';
COMMENT ON COLUMN user_memories.embedding IS 'Vector embedding for semantic search (1536 dims)';
COMMENT ON COLUMN user_memories.category IS 'Category of memory for filtering';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_memories_user_project ON user_memories(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_category ON user_memories(category);
CREATE INDEX IF NOT EXISTS idx_user_memories_updated_at ON user_memories(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_memories_hash ON user_memories(content_hash);

-- Create vector index (IVFFlat for efficient similarity search)
-- Note: IVFFlat requires the table to have some data for optimal performance
-- Using lists = 100 as a reasonable default for moderate datasets
CREATE INDEX IF NOT EXISTS idx_user_memories_embedding
    ON user_memories USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Enable Row Level Security
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Users can only access their own memories
DROP POLICY IF EXISTS user_memories_user_access ON user_memories;
CREATE POLICY user_memories_user_access ON user_memories
    FOR ALL
    USING (user_id = auth.uid());

-- Policy: Service role can access all (for admin operations)
DROP POLICY IF EXISTS user_memories_service_access ON user_memories;
CREATE POLICY user_memories_service_access ON user_memories
    FOR ALL
    USING (auth.role() = 'service_role');

-- Add system config entries for memory system
INSERT INTO system_config (key, value, description, category)
VALUES
    ('memory_extraction_model', '"openai/gpt-4.1-nano"', 'LLM model used for extracting and managing user memories', 'ai_models'),
    ('memory_system_enabled', 'true', 'Enable/disable the user memory system globally', 'features'),
    ('memory_max_per_user_project', '100', 'Maximum number of memories per user per project', 'limits')
ON CONFLICT (key) DO NOTHING;

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_memories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_memories_updated_at ON user_memories;
CREATE TRIGGER trigger_update_user_memories_updated_at
    BEFORE UPDATE ON user_memories
    FOR EACH ROW
    EXECUTE FUNCTION update_user_memories_updated_at();
