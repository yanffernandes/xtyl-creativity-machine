# Data Model: Admin Panel

**Feature**: 015-admin-panel
**Date**: 2025-11-30

## Entity Overview

```
┌─────────────┐      ┌─────────────────┐      ┌──────────────────┐
│    User     │──────│  SystemConfig   │──────│  AdminAuditLog   │
│ (extended)  │      │    (new)        │      │     (new)        │
└─────────────┘      └─────────────────┘      └──────────────────┘
      │                      │
      │ is_super_admin       │ key: 'ai_models'
      │                      │ key: 'global_limits'
      │                      │ key: 'feature_flags'
      │                      │ key: 'api_keys'
      ▼                      ▼
 Admin can manage     Admin configures
```

## Entity Definitions

### User (Extended)

**Purpose**: Existing user entity extended with super_admin flag

**Changes**:
```sql
ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;
```

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Existing - user identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Existing - user email |
| full_name | VARCHAR(255) | | Existing - display name |
| is_super_admin | BOOLEAN | DEFAULT FALSE | NEW - admin access flag |
| is_blocked | BOOLEAN | DEFAULT FALSE | NEW - account blocked status |
| blocked_at | TIMESTAMP | | NEW - when blocked |
| blocked_by | UUID | FK(users) | NEW - admin who blocked |
| created_at | TIMESTAMP | DEFAULT NOW() | Existing |
| updated_at | TIMESTAMP | | Existing |

**Indexes**:
- `idx_users_is_super_admin` on `is_super_admin` (for admin queries)
- `idx_users_is_blocked` on `is_blocked` (for blocked user filtering)

---

### SystemConfig

**Purpose**: Store system-wide configuration in flexible JSONB format

**Table**: `system_config`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Config identifier |
| key | VARCHAR(100) | UNIQUE, NOT NULL | Config category key |
| value | JSONB | NOT NULL | Configuration data |
| description | TEXT | | Human-readable description |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last modification |
| updated_by | UUID | FK(users) | Admin who made change |

**Predefined Keys**:

#### key: `ai_models`
```json
{
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
}
```

#### key: `global_limits`
```json
{
  "max_tokens_per_user_month": 1000000,
  "max_workspaces_per_user": 10,
  "max_documents_per_project": 500,
  "max_image_size_mb": 10,
  "max_concurrent_workflows": 5
}
```

#### key: `feature_flags`
```json
{
  "enable_image_generation": true,
  "enable_workflows": true,
  "enable_rag": true,
  "enable_vision": true,
  "maintenance_mode": false
}
```

#### key: `api_keys`
```json
{
  "openrouter_key_masked": "sk-or-...xxxx",
  "openrouter_key_updated_at": "2025-11-30T10:00:00Z"
}
```
*Note: Actual API key stored encrypted or in environment variable. This stores metadata only.*

**Indexes**:
- PK on `id`
- UNIQUE on `key`

---

### AdminAuditLog

**Purpose**: Track all administrative actions for compliance and debugging

**Table**: `admin_audit_log`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Log entry ID |
| admin_id | UUID | FK(users), NOT NULL | Admin who performed action |
| action | VARCHAR(100) | NOT NULL | Action type identifier |
| entity_type | VARCHAR(50) | | Target entity type |
| entity_id | VARCHAR(255) | | Target entity ID |
| old_value | JSONB | | State before change |
| new_value | JSONB | | State after change |
| metadata | JSONB | | Additional context |
| ip_address | VARCHAR(45) | | Client IP address |
| user_agent | TEXT | | Client user agent |
| created_at | TIMESTAMP | DEFAULT NOW() | When action occurred |

**Action Types**:
| Action | entity_type | Description |
|--------|-------------|-------------|
| `update_ai_models` | system_config | Changed AI model configuration |
| `update_global_limits` | system_config | Changed usage limits |
| `update_feature_flags` | system_config | Toggled feature flags |
| `update_api_keys` | system_config | Updated API credentials |
| `block_user` | user | Blocked a user account |
| `unblock_user` | user | Unblocked a user account |
| `promote_admin` | user | Granted super_admin |
| `demote_admin` | user | Revoked super_admin |
| `remove_workspace_member` | workspace | Removed member from workspace |
| `transfer_workspace_ownership` | workspace | Changed workspace owner |
| `view_user_details` | user | Accessed sensitive user info |
| `view_workspace_details` | workspace | Accessed workspace details |

**Indexes**:
- `idx_audit_created_at` on `created_at DESC` (time-based queries)
- `idx_audit_admin_id` on `admin_id` (filter by admin)
- `idx_audit_action` on `action` (filter by action type)
- `idx_audit_entity` on `(entity_type, entity_id)` (entity history)

---

## Relationships

### User ↔ SystemConfig
- One-to-many: A User (admin) can update many SystemConfig entries
- `SystemConfig.updated_by` → `User.id`

### User ↔ AdminAuditLog
- One-to-many: A User (admin) creates many AuditLog entries
- `AdminAuditLog.admin_id` → `User.id`

### User ↔ User (blocked)
- One-to-many: A User (admin) can block many Users
- `User.blocked_by` → `User.id`

---

## State Transitions

### User Blocking States
```
                     block_user()
    ┌──────────┐  ────────────────►  ┌──────────┐
    │  Active  │                     │ Blocked  │
    │is_blocked│  ◄────────────────  │is_blocked│
    │ = false  │     unblock_user()  │ = true   │
    └──────────┘                     └──────────┘
```

**Block User**:
- Set `is_blocked = true`
- Set `blocked_at = NOW()`
- Set `blocked_by = admin.id`
- Create audit log entry

**Unblock User**:
- Set `is_blocked = false`
- Set `blocked_at = NULL`
- Set `blocked_by = NULL`
- Create audit log entry

### Model Configuration States
```
    ┌─────────────────┐
    │ Current Config  │
    │ (in system_config)│
    └────────┬────────┘
             │ update_ai_models()
             ▼
    ┌─────────────────┐
    │ Validate models │◄── Fetch from OpenRouter
    └────────┬────────┘
             │
     ┌───────┴───────┐
     ▼               ▼
 [Valid]         [Invalid]
     │               │
     ▼               ▼
┌────────────┐  ┌────────────┐
│ Save config│  │ Return     │
│ + audit log│  │ error 400  │
└────────────┘  └────────────┘
```

---

## Validation Rules

### User
- `email`: Must be valid email format, unique across system
- `is_super_admin`: Only modifiable by existing super_admin
- `is_blocked`: Cannot block yourself (self-protection)

### SystemConfig
- `key`: Must be one of predefined keys
- `value.ai_models.defaults.*`: Must be valid model ID from OpenRouter
- `value.ai_models.visible_in_selector`: All must be valid model IDs
- `value.global_limits.*`: Must be positive integers
- `value.feature_flags.*`: Must be boolean

### AdminAuditLog
- `admin_id`: Must reference valid super_admin user
- `action`: Must be from predefined action list
- `created_at`: Immutable, set on creation only

---

## Migration SQL

```sql
-- 016_add_admin_tables.sql

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
```
