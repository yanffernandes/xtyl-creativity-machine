-- Migration: Add chat_conversations table for persisting chat history
-- Created: 2025-11-27

CREATE TABLE IF NOT EXISTS chat_conversations (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id),
    project_id VARCHAR REFERENCES projects(id),
    workspace_id VARCHAR NOT NULL REFERENCES workspaces(id),

    -- Conversation metadata
    title VARCHAR,
    summary TEXT,
    messages_json JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Context used in conversation
    model_used VARCHAR(100),
    document_ids_context JSONB DEFAULT '[]'::jsonb,
    folder_ids_context JSONB DEFAULT '[]'::jsonb,

    -- Documents created during conversation
    created_document_ids JSONB DEFAULT '[]'::jsonb,

    -- Status
    is_archived BOOLEAN DEFAULT FALSE,
    message_count INTEGER DEFAULT 0,

    -- Timestamps
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_project_id ON chat_conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_workspace_id ON chat_conversations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message_at ON chat_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_is_archived ON chat_conversations(is_archived);
