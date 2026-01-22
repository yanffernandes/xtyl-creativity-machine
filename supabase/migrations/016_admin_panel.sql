-- Migration: Admin Panel (Feature 015)
-- This migration adds tables and columns needed for the admin panel

-- ============================================================================
-- 1. Add admin-related columns to users table
-- ============================================================================

-- Add is_super_admin column (controls admin panel access)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- Add is_blocked column (blocked users cannot login)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

-- Add blocked_at timestamp
ALTER TABLE users
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;

-- Add blocked_by reference (which admin blocked this user)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES users(id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_is_super_admin ON users(is_super_admin);
CREATE INDEX IF NOT EXISTS idx_users_is_blocked ON users(is_blocked);

-- ============================================================================
-- 2. Create system_config table for storing configuration in JSONB
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Create index on key for fast lookups
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);

-- Add trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_system_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_system_config_updated_at ON system_config;
CREATE TRIGGER trigger_system_config_updated_at
    BEFORE UPDATE ON system_config
    FOR EACH ROW
    EXECUTE FUNCTION update_system_config_updated_at();

-- ============================================================================
-- 3. Create admin_audit_log table for tracking admin actions
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    old_value JSONB,
    new_value JSONB,
    metadata JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);

-- ============================================================================
-- 4. Insert default AI model configuration
-- ============================================================================

INSERT INTO system_config (key, value, description)
VALUES (
    'ai_models',
    '{
        "defaults": {
            "chat": "anthropic/claude-sonnet-4",
            "embedding": "openai/text-embedding-3-small",
            "vision": "anthropic/claude-sonnet-4",
            "document": "anthropic/claude-sonnet-4",
            "image_generation": "openai/dall-e-3",
            "image_naming": "anthropic/claude-haiku"
        },
        "fallbacks": {
            "chat": "openai/gpt-4o",
            "vision": "openai/gpt-4o",
            "document": "openai/gpt-4o"
        }
    }',
    'Default and fallback AI models for different functions'
)
ON CONFLICT (key) DO NOTHING;

-- Insert default visible models for user selection
INSERT INTO system_config (key, value, description)
VALUES (
    'visible_models',
    '["anthropic/claude-sonnet-4", "anthropic/claude-haiku", "openai/gpt-4o", "openai/gpt-4o-mini", "google/gemini-2.0-flash-001"]',
    'Models visible to users in the chat interface'
)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 5. Grant appropriate permissions (for Supabase RLS)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Only super_admins can read/write system_config
CREATE POLICY "Super admins can manage system_config" ON system_config
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_super_admin = true
        )
    );

-- Policy: Only super_admins can read audit logs
CREATE POLICY "Super admins can read audit_logs" ON admin_audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_super_admin = true
        )
    );

-- Policy: Backend can insert audit logs (service role)
CREATE POLICY "Service role can insert audit_logs" ON admin_audit_log
    FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- 6. Promote first user to admin (optional - uncomment if needed)
-- ============================================================================

-- Uncomment and modify the email to make yourself an admin:
-- UPDATE users SET is_super_admin = true WHERE email = 'your-email@example.com';

-- Or promote by user ID:
-- UPDATE users SET is_super_admin = true WHERE id = 'your-user-uuid-here';

COMMENT ON TABLE system_config IS 'Stores system-wide configuration in JSONB format';
COMMENT ON TABLE admin_audit_log IS 'Tracks all administrative actions for compliance';
