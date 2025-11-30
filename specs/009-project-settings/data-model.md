# Data Model: Project Settings & Context Information

**Feature**: 009-project-settings
**Date**: 2025-11-28

## Entity Changes

### Project (Extended)

The existing Project model is extended with settings fields stored as JSONB.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key (existing) |
| name | String | Yes | Project name (existing) |
| workspace_id | UUID | Yes | Parent workspace (existing) |
| **settings** | JSONB | No | Project settings object (NEW) |

### Settings Object Structure

```json
{
  "client_name": "string (required)",
  "description": "string | null",
  "target_audience": "string | null",
  "brand_voice": "string | null",
  "brand_voice_custom": "string | null",
  "key_messages": ["string"] | null,
  "competitors": ["string"] | null,
  "custom_notes": "string | null"
}
```

### Field Details

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| client_name | string | Required, max 200 chars | Client/company name |
| description | string | Optional, max 2000 chars | Project description |
| target_audience | string | Optional, max 1000 chars | Target audience characteristics |
| brand_voice | string | Optional, enum | Predefined brand voice option |
| brand_voice_custom | string | Optional, max 500 chars | Custom brand voice (if brand_voice = "custom") |
| key_messages | array[string] | Optional, max 10 items | Key messages/talking points |
| competitors | array[string] | Optional, max 10 items | Competitor names |
| custom_notes | string | Optional, max 5000 chars | Additional notes for AI context |

### Brand Voice Enum

```
professional_formal
casual_friendly
technical_precise
creative_playful
authoritative_expert
custom
```

## Database Migration

```sql
-- Migration: 014_add_project_settings.sql

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Index for querying settings
CREATE INDEX IF NOT EXISTS idx_projects_settings_gin
ON projects USING GIN (settings);

COMMENT ON COLUMN projects.settings IS 'Project settings for AI context (client name, audience, brand voice, etc.)';
```

## Relationships

```
Workspace (1) ──────< Project (1) ─── settings (embedded JSONB)
                         │
                         └──────< Document
                         └──────< Conversation
```

- Settings are embedded in Project (no separate table)
- Settings inherit Project permissions (RLS via project ownership)
- No cascade concerns (embedded field)

## Validation Rules

1. **client_name**: Required when saving settings
2. **brand_voice_custom**: Only validated if brand_voice = "custom"
3. **key_messages**: Max 10 items, each max 500 chars
4. **competitors**: Max 10 items, each max 200 chars
5. **Settings object**: Can be null/empty (project works without settings)

## State Transitions

Settings have no lifecycle states - they are simply present or absent:

```
[No Settings] ──save──> [Settings Configured] ──update──> [Settings Configured]
                                    │
                                    └──clear client_name──> (validation error)
```
