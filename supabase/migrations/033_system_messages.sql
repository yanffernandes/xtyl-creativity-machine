-- Migration: 033_system_messages.sql
-- Description: Create system_messages table for system-wide announcements and alerts

-- ============================================================================
-- 1. Create system_messages table
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    dismissible BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_message_type CHECK (
        type IN ('maintenance', 'announcement', 'warning', 'info')
    )
);

-- Index for active messages query
CREATE INDEX IF NOT EXISTS idx_system_messages_active
    ON system_messages(priority DESC, starts_at, ends_at);

-- ============================================================================
-- 2. Enable RLS
-- ============================================================================
ALTER TABLE system_messages ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view system messages
CREATE POLICY "Anyone can view system messages"
    ON system_messages FOR SELECT
    USING (TRUE);

-- Policy: Only service role can manage system messages
CREATE POLICY "Service role can manage system messages"
    ON system_messages FOR ALL
    USING (auth.role() = 'service_role');

COMMENT ON TABLE system_messages IS 'System-wide messages for maintenance notices, announcements, and alerts';
