-- Migration 011: Add user_preferences table
-- Feature: 004-agent-tools-enhancement
-- Date: 2025-11-26

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    autonomous_mode BOOLEAN NOT NULL DEFAULT false,
    max_iterations INTEGER NOT NULL DEFAULT 15 CHECK (max_iterations >= 1 AND max_iterations <= 50),
    default_model VARCHAR(100),
    use_rag_by_default BOOLEAN NOT NULL DEFAULT true,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_preferences_user_id UNIQUE (user_id)
);

-- Index for fast lookup by user_id
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first if exists to avoid errors on re-run)
DROP TRIGGER IF EXISTS tr_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER tr_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_updated_at();

-- Add comment for documentation
COMMENT ON TABLE user_preferences IS 'Stores AI assistant preferences per user (autonomous mode, iteration limits, etc.)';
COMMENT ON COLUMN user_preferences.autonomous_mode IS 'When true, execute all tools without approval';
COMMENT ON COLUMN user_preferences.max_iterations IS 'Maximum tool call iterations per conversation (1-50, default 15)';
COMMENT ON COLUMN user_preferences.settings IS 'Additional extensible settings as JSON';
