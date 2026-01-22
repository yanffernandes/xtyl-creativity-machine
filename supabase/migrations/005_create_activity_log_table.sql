-- Migration 005: Create activity log table for tracking changes
-- Date: 2025-11-22
-- Description: Tracks all document and folder changes with human/AI attribution and restore capability

-- Create activity_log table
CREATE TABLE IF NOT EXISTS activity_log (
    id VARCHAR PRIMARY KEY,
    entity_type VARCHAR NOT NULL,  -- 'document', 'folder'
    entity_id VARCHAR NOT NULL,
    action VARCHAR NOT NULL,  -- 'create', 'update', 'delete', 'restore', 'move'
    actor_type VARCHAR NOT NULL,  -- 'human', 'ai'
    user_id VARCHAR REFERENCES users(id),
    changes JSONB,  -- Stores before/after state: {before: {...}, after: {...}}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_actor_type ON activity_log(actor_type);

-- Add comments for documentation
COMMENT ON TABLE activity_log IS 'Audit trail of all document and folder changes';
COMMENT ON COLUMN activity_log.id IS 'Unique activity identifier (UUID)';
COMMENT ON COLUMN activity_log.entity_type IS 'Type of entity changed (document or folder)';
COMMENT ON COLUMN activity_log.entity_id IS 'ID of the changed entity';
COMMENT ON COLUMN activity_log.action IS 'Type of action performed';
COMMENT ON COLUMN activity_log.actor_type IS 'Whether change was made by human or AI';
COMMENT ON COLUMN activity_log.user_id IS 'User who initiated the action (even for AI actions)';
COMMENT ON COLUMN activity_log.changes IS 'JSON object containing before/after snapshots for restore capability';
