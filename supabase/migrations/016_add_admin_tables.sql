-- 016_add_admin_tables.sql
-- Admin Panel feature: System configuration, user management, audit logging

-- Extend users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_users_is_super_admin ON users(is_super_admin);
CREATE INDEX IF NOT EXISTS idx_users_is_blocked ON users(is_blocked);

-- Create system_config table
CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Create admin_audit_log table
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
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON admin_audit_log(entity_type, entity_id);

-- Seed default configurations
INSERT INTO system_config (key, value, description) VALUES
('ai_models', '{
  "defaults": {
    "chat": "openai/gpt-4-turbo",
    "embedding": "openai/text-embedding-3-small",
    "vision": "openai/gpt-4-turbo",
    "document_analysis": "openai/gpt-4-turbo",
    "image_generation": "openai/dall-e-3",
    "image_naming": "openai/gpt-3.5-turbo"
  },
  "fallbacks": {
    "chat": "openai/gpt-3.5-turbo",
    "embedding": "openai/text-embedding-ada-002",
    "vision": "anthropic/claude-3-sonnet",
    "document_analysis": "anthropic/claude-3-sonnet",
    "image_generation": "stabilityai/stable-diffusion-xl",
    "image_naming": "openai/gpt-3.5-turbo"
  },
  "visible_in_selector": [
    "openai/gpt-4-turbo",
    "openai/gpt-3.5-turbo",
    "anthropic/claude-3-opus",
    "anthropic/claude-3-sonnet",
    "anthropic/claude-3-haiku"
  ]
}', 'AI model configuration for all system functions'),

('global_limits', '{
  "max_tokens_per_user_month": 1000000,
  "max_workspaces_per_user": 10,
  "max_documents_per_project": 500,
  "max_image_size_mb": 10,
  "max_concurrent_workflows": 5
}', 'Global usage limits'),

('feature_flags', '{
  "enable_image_generation": true,
  "enable_workflows": true,
  "enable_rag": true,
  "enable_vision": true,
  "maintenance_mode": false
}', 'Feature toggles'),

('api_keys', '{
  "openrouter_key_masked": null,
  "openrouter_key_updated_at": null
}', 'API key metadata (actual keys in env vars)')
ON CONFLICT (key) DO NOTHING;
