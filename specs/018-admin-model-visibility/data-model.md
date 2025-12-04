# Data Model: Admin Model Visibility Configuration

**Feature**: 018-admin-model-visibility
**Date**: 2025-12-03

## Entity Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         system_config                           │
│                    (existing table - no changes)                │
├─────────────────────────────────────────────────────────────────┤
│  key: "visible_text_models"    → List[model_id]                │
│  key: "visible_image_models"   → List[model_id]                │
│  key: "ai_models"              → {defaults, fallbacks}         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Model Selection Flow                         │
├─────────────────────────────────────────────────────────────────┤
│  Admin Panel → OpenRouter API → Select Models → Save to DB     │
│  User Selector → Read from DB (cached) → Display filtered list │
└─────────────────────────────────────────────────────────────────┘
```

## Entities

### SystemConfig (Existing - No Migration Required)

Utiliza a tabela existente `system_config` com novas chaves de configuração.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| key | VARCHAR(100) | Unique config key |
| value | JSONB | Configuration value |
| description | TEXT | Human-readable description |
| updated_at | TIMESTAMPTZ | Last modification time |
| updated_by | UUID | Admin who made the change |

**New Configuration Keys:**

#### visible_text_models
```json
{
  "key": "visible_text_models",
  "value": [
    "anthropic/claude-sonnet-4-20250514",
    "anthropic/claude-3-5-sonnet-20241022",
    "anthropic/claude-3-opus-20240229",
    "openai/gpt-4o",
    "openai/gpt-4-turbo",
    "google/gemini-pro-1.5"
  ],
  "description": "List of text/LLM models visible to users in AI assistants"
}
```

#### visible_image_models
```json
{
  "key": "visible_image_models",
  "value": [
    "openai/dall-e-3",
    "stability/stable-diffusion-xl",
    "google/imagen-3"
  ],
  "description": "List of image generation models visible to users"
}
```

### AvailableModel (DTO - No Persistence)

Modelo retornado pelo OpenRouter, usado apenas em memória para exibição no admin.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| id | string | OpenRouter | Unique model identifier (e.g., "anthropic/claude-3") |
| name | string | OpenRouter | Display name |
| description | string? | OpenRouter | Model description |
| context_length | int? | OpenRouter | Max context window |
| pricing_prompt | string? | OpenRouter | Cost per input token |
| pricing_completion | string? | OpenRouter | Cost per output token |
| output_modalities | string[]? | OpenRouter | ["text"], ["image"], ["embeddings"] |
| top_provider | string? | OpenRouter | Provider name |

### VisibleModel (DTO - Response to Users)

Modelo simplificado retornado para os seletores de usuário.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Model identifier |
| name | string | Display name |

## Data Relationships

```
┌──────────────────┐         ┌──────────────────┐
│   Admin Panel    │         │   User Selectors │
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         ▼                            ▼
┌──────────────────┐         ┌──────────────────┐
│ GET /admin/      │         │ GET /chat/models │
│ models/available │         │ GET /image-gen/  │
│                  │         │     models       │
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         ▼                            ▼
┌──────────────────┐         ┌──────────────────┐
│   OpenRouter     │         │   system_config  │
│      API         │         │     (cached)     │
└──────────────────┘         └──────────────────┘
```

## State Transitions

### Model Visibility State Machine

```
                    ┌─────────────────┐
                    │   UNAVAILABLE   │
                    │ (not in config) │
                    └────────┬────────┘
                             │
                    Admin selects model
                             │
                             ▼
                    ┌─────────────────┐
                    │    VISIBLE      │
                    │ (in config)     │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
     Admin deselects model      Model removed from OpenRouter
              │                             │
              ▼                             ▼
     ┌─────────────────┐           ┌─────────────────┐
     │   UNAVAILABLE   │           │    STALE        │
     │ (not in config) │           │ (in config but  │
     └─────────────────┘           │  invalid)       │
                                   └────────┬────────┘
                                            │
                                   System auto-filters
                                            │
                                            ▼
                                   ┌─────────────────┐
                                   │   UNAVAILABLE   │
                                   └─────────────────┘
```

## Validation Rules

### visible_text_models
- MUST contain at least 1 model ID
- Each ID MUST be a valid OpenRouter model identifier
- Each model MUST have `output_modalities` containing "text"

### visible_image_models
- MUST contain at least 1 model ID
- Each ID MUST be a valid OpenRouter model identifier
- Each model MUST have `output_modalities` containing "image"

### Model ID Format
- Format: `provider/model-name` (e.g., "anthropic/claude-sonnet-4-20250514")
- MUST match OpenRouter's model registry

## Cache Strategy

### Backend Cache (ModelConfigService)

| Cache Key | TTL | Invalidation |
|-----------|-----|--------------|
| visible_text_models | 60s | On update |
| visible_image_models | 60s | On update |

### Frontend Cache

| Storage | TTL | Invalidation |
|---------|-----|--------------|
| React Query | 5min | On admin update |
| localStorage | None | Manual refresh |

## Migration Strategy

**No database migration required** - uses existing `system_config` table.

### Seed Data (SQL)

```sql
-- Insert visible_text_models (only if not exists)
INSERT INTO system_config (id, key, value, description, updated_at)
SELECT
    gen_random_uuid(),
    'visible_text_models',
    '["anthropic/claude-sonnet-4-20250514", "anthropic/claude-3-5-sonnet-20241022", "openai/gpt-4o", "openai/gpt-4-turbo", "google/gemini-pro-1.5"]'::jsonb,
    'List of text/LLM models visible to users',
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE key = 'visible_text_models');

-- Insert visible_image_models (only if not exists)
INSERT INTO system_config (id, key, value, description, updated_at)
SELECT
    gen_random_uuid(),
    'visible_image_models',
    '["openai/dall-e-3", "stability/stable-diffusion-xl"]'::jsonb,
    'List of image generation models visible to users',
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE key = 'visible_image_models');

-- Migrate existing visible_models to visible_text_models if present
-- (one-time migration, preserves backward compatibility)
UPDATE system_config
SET key = 'visible_text_models'
WHERE key = 'visible_models'
  AND NOT EXISTS (SELECT 1 FROM system_config WHERE key = 'visible_text_models');
```

## Indexes

Existing indexes are sufficient:
- `system_config.key` - Already has unique index

## Backward Compatibility

| Scenario | Handling |
|----------|----------|
| Old `visible_models` key exists | Auto-migrate to `visible_text_models` |
| No config exists | Use default fallback models |
| Invalid model ID in list | Filter out silently, log warning |
