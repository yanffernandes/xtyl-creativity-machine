# Data Model: Smart Visual Assets

**Feature**: 011-smart-visual-assets
**Date**: 2025-11-29

## Entity Relationship Diagram

```text
┌─────────────────┐       ┌──────────────────────────┐
│    Project      │       │        Document          │
├─────────────────┤       │   (is_reference_asset)   │
│ id (PK)         │──┐    ├──────────────────────────┤
│ workspace_id    │  │    │ id (PK)                  │
│ name            │  │    │ project_id (FK)          │
└─────────────────┘  │    │ is_reference_asset       │
                     │    │ asset_category (NEW)     │
                     │    │ asset_tags (NEW)         │
                     │    │ ai_description (NEW)     │
                     │    │ file_url                 │
                     │    │ thumbnail_url            │
                     │    └──────────────────────────┘
                     │              │
                     │              │
                     ▼              ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│ AssistantVisualSettings  │    │   AssetUsageHistory      │
├──────────────────────────┤    ├──────────────────────────┤
│ id (PK)                  │    │ id (PK)                  │
│ project_id (FK, UNIQUE)  │    │ asset_id (FK)            │
│ is_enabled               │    │ generation_id            │
│ mode                     │    │ used_at                  │
│ assets_per_category      │    └──────────────────────────┘
│ created_at               │
│ updated_at               │
└──────────────────────────┘
            │
            │
            ▼
┌──────────────────────────┐
│ AssistantAssetSelection  │
├──────────────────────────┤
│ id (PK)                  │
│ settings_id (FK)         │
│ asset_id (FK)            │
│ is_enabled               │
│ created_at               │
└──────────────────────────┘
```

## Entities

### 1. Document (Extended)

Existing table, extended with new columns for visual asset classification.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | gen_random_uuid() | Primary key |
| project_id | UUID | No | - | FK to projects |
| is_reference_asset | BOOLEAN | No | FALSE | Flag for visual assets |
| **asset_category** | VARCHAR(20) | Yes | NULL | NEW: Logo, Pessoa, Background, Produto, Outro |
| **asset_tags** | TEXT[] | Yes | NULL | NEW: Array of descriptive tags |
| **ai_description** | TEXT | Yes | NULL | NEW: AI-generated description |
| file_url | TEXT | Yes | NULL | R2 storage URL |
| thumbnail_url | TEXT | Yes | NULL | Thumbnail URL |
| created_at | TIMESTAMP | No | NOW() | Creation timestamp |
| updated_at | TIMESTAMP | No | NOW() | Last update timestamp |

**Constraints**:
- `asset_category` must be one of: 'Logo', 'Pessoa', 'Background', 'Produto', 'Outro'
- `asset_tags` limited to 10 tags maximum (application-level validation)
- `ai_description` limited to 500 characters

**Indexes**:
- `idx_documents_asset_category ON documents(project_id, asset_category) WHERE is_reference_asset = TRUE`

### 2. AssistantVisualSettings (New)

Per-project configuration for visual context feature.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | gen_random_uuid() | Primary key |
| project_id | UUID | No | - | FK to projects (UNIQUE) |
| is_enabled | BOOLEAN | No | FALSE | Feature toggle |
| mode | VARCHAR(10) | No | 'manual' | 'manual' or 'auto' |
| assets_per_category | INTEGER | No | 2 | For auto mode (1-5) |
| created_at | TIMESTAMP | No | NOW() | Creation timestamp |
| updated_at | TIMESTAMP | No | NOW() | Last update timestamp |

**Constraints**:
- `project_id` must be unique (one settings per project)
- `mode` CHECK: must be 'manual' or 'auto'
- `assets_per_category` CHECK: between 1 and 5

**Indexes**:
- PRIMARY KEY on id
- UNIQUE constraint on project_id

### 3. AssistantAssetSelection (New)

Manual mode: tracks which assets are selected for visual context.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | gen_random_uuid() | Primary key |
| settings_id | UUID | No | - | FK to assistant_visual_settings |
| asset_id | UUID | No | - | FK to documents |
| is_enabled | BOOLEAN | No | TRUE | Selection toggle |
| created_at | TIMESTAMP | No | NOW() | Creation timestamp |

**Constraints**:
- UNIQUE constraint on (settings_id, asset_id)
- Cascade delete when settings or asset is deleted

**Indexes**:
- `idx_asset_selection_settings ON assistant_asset_selection(settings_id) WHERE is_enabled = TRUE`

### 4. AssetUsageHistory (New)

Tracks when each asset was used for rotation algorithm.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | gen_random_uuid() | Primary key |
| asset_id | UUID | No | - | FK to documents |
| generation_id | UUID | Yes | NULL | Reference to image generation |
| used_at | TIMESTAMP | No | NOW() | Usage timestamp |

**Constraints**:
- Cascade delete when asset is deleted
- Records older than 30 days should be pruned (application-level)

**Indexes**:
- `idx_usage_history_asset ON asset_usage_history(asset_id, used_at DESC)`

## Enumerations

### AssetCategory

```python
class AssetCategory(str, Enum):
    LOGO = "Logo"
    PESSOA = "Pessoa"
    BACKGROUND = "Background"
    PRODUTO = "Produto"
    OUTRO = "Outro"
```

### VisualContextMode

```python
class VisualContextMode(str, Enum):
    MANUAL = "manual"
    AUTO = "auto"
```

## Validation Rules

### Document (Visual Asset)

1. **File size**: Maximum 10MB (validated on upload)
2. **File types**: JPEG, PNG, GIF, WebP only
3. **Tags**: Maximum 10 tags per asset
4. **Description**: Maximum 500 characters
5. **Per project**: Maximum 100 assets with `is_reference_asset=TRUE`

### AssistantVisualSettings

1. **assets_per_category**: Must be between 1 and 5
2. **mode**: Must be 'manual' or 'auto'
3. **One per project**: Only one settings record per project

### Image Generation (Visual Context)

1. **Maximum assets**: 5 total assets per generation (NFR-003)
2. **Logo priority**: In auto mode, logos are always included first
3. **Rotation**: Assets used in last 24 hours are deprioritized

## Migration Script

```sql
-- Migration: 015_add_visual_asset_fields.sql

-- 1. Extend documents table
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS asset_category VARCHAR(20),
ADD COLUMN IF NOT EXISTS asset_tags TEXT[],
ADD COLUMN IF NOT EXISTS ai_description TEXT;

-- Add constraint for category values
ALTER TABLE documents
ADD CONSTRAINT chk_asset_category
CHECK (asset_category IS NULL OR asset_category IN ('Logo', 'Pessoa', 'Background', 'Produto', 'Outro'));

-- Add index for category queries
CREATE INDEX IF NOT EXISTS idx_documents_asset_category
ON documents(project_id, asset_category)
WHERE is_reference_asset = TRUE;

-- 2. Create assistant_visual_settings table
CREATE TABLE IF NOT EXISTS assistant_visual_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mode VARCHAR(10) NOT NULL DEFAULT 'manual',
    assets_per_category INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_settings_project UNIQUE (project_id),
    CONSTRAINT chk_mode CHECK (mode IN ('manual', 'auto')),
    CONSTRAINT chk_assets_per_category CHECK (assets_per_category BETWEEN 1 AND 5)
);

-- 3. Create assistant_asset_selection table
CREATE TABLE IF NOT EXISTS assistant_asset_selection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settings_id UUID NOT NULL REFERENCES assistant_visual_settings(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_selection UNIQUE (settings_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_asset_selection_settings
ON assistant_asset_selection(settings_id)
WHERE is_enabled = TRUE;

-- 4. Create asset_usage_history table
CREATE TABLE IF NOT EXISTS asset_usage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    generation_id UUID,
    used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_history_asset
ON asset_usage_history(asset_id, used_at DESC);

-- Comments
COMMENT ON COLUMN documents.asset_category IS 'Visual asset category: Logo, Pessoa, Background, Produto, Outro';
COMMENT ON COLUMN documents.asset_tags IS 'Array of descriptive tags for the visual asset';
COMMENT ON COLUMN documents.ai_description IS 'AI-generated description of the image content';
COMMENT ON TABLE assistant_visual_settings IS 'Per-project visual context settings for AI assistant';
COMMENT ON TABLE assistant_asset_selection IS 'Manual mode selections for visual context';
COMMENT ON TABLE asset_usage_history IS 'Tracks asset usage for rotation algorithm (30-day retention)';
```

## State Transitions

### Visual Asset Lifecycle

```text
[Upload] → [Analyzing] → [Classified] → [Active] → [Selected/Deselected] → [Deleted]
                ↓
           [Manual Classification]
```

### Visual Context Mode

```text
[Disabled] ←→ [Enabled (Manual)] ←→ [Enabled (Auto)]
```
