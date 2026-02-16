# Data Model: OpenRouter Integration

**Feature**: 022-openrouter-integration
**Date**: 2026-01-09

## Overview

This document describes the database schema changes required to support OpenRouter as an AI provider alongside OpenAI.

## Entity Changes

### 1. system_prompts (EXTEND)

**Current Schema** (relevant fields):
```sql
CREATE TABLE public.system_prompts (
    id UUID PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT NOT NULL,
    model TEXT DEFAULT 'google/gemini-3-flash-001',      -- Default model (Gemini 3 Flash)
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2000,
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    variables JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

**New Columns**:
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `provider` | TEXT | `'openai'` | AI provider identifier: 'openai' \| 'openrouter' |
| `provider_model` | TEXT | NULL | Full model identifier for the provider (e.g., 'openai/gpt-4o') |

**Migration SQL**:
```sql
-- Add new columns
ALTER TABLE public.system_prompts
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'openai',
ADD COLUMN IF NOT EXISTS provider_model TEXT;

-- Migrate existing data: set provider_model from existing model field
UPDATE public.system_prompts
SET provider_model = model
WHERE provider = 'openai' AND provider_model IS NULL;

-- Add constraint for valid providers
ALTER TABLE public.system_prompts
ADD CONSTRAINT valid_provider CHECK (provider IN ('openai', 'openrouter'));
```

**Entity Relationships**: No new relationships

### 2. platform_settings (NEW or EXTEND)

**Purpose**: Store platform-wide configuration including default image generation model.

**Check if exists**: May already exist as `admin_settings` or similar. If not, create:

```sql
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy: Admin only
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage platform settings"
ON public.platform_settings
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);
```

**Initial Data**:
```sql
INSERT INTO public.platform_settings (key, value, description)
VALUES (
    'default_image_model',
    '{"provider": "openai", "model": "dall-e-3"}'::jsonb,
    'Default AI model for image generation in AlvoAds Meta'
)
ON CONFLICT (key) DO NOTHING;
```

### 3. creative_library (NO CHANGES)

The `creative_library` table already has a `model_used` TEXT field that can store OpenRouter model names. No schema changes needed.

**Current Relevant Fields**:
```sql
model_used TEXT,      -- Already stores model name (e.g., 'dall-e-3', 'imagen-3')
style_used TEXT,
prompt_used TEXT,
format TEXT
```

**Usage Note**: When saving OpenRouter-generated images, store the full model ID (e.g., 'google/gemini-2.5-flash-image-preview') in `model_used`.

## TypeScript Types

### Backend Types

```typescript
// backend/src/common/types/ai-provider.types.ts

export type AIProvider = 'openai' | 'openrouter'

export interface ProviderConfig {
  provider: AIProvider
  model: string
}

export interface OpenRouterModel {
  id: string                    // e.g., "openai/gpt-4o"
  name: string                  // e.g., "GPT-4o"
  description?: string
  context_length: number
  pricing: {
    prompt: string              // USD per token
    completion: string
  }
  architecture: {
    input_modalities: string[]  // ["text", "image"]
    output_modalities: string[] // ["text"] or ["text", "image"]
  }
}

export interface TextModel extends OpenRouterModel {
  // Text-only models
}

export interface ImageModel extends OpenRouterModel {
  // Image generation capable models
}
```

### Frontend Types

```typescript
// frontend/src/features/admin/types/index.ts (EXTEND)

export type AIProvider = 'openai' | 'openrouter'

export interface SystemPrompt {
  // ... existing fields
  provider: AIProvider
  provider_model: string | null
}

export interface CreateSystemPromptDto {
  // ... existing fields
  provider?: AIProvider
  provider_model?: string
}

export interface UpdateSystemPromptDto {
  // ... existing fields
  provider?: AIProvider
  provider_model?: string
}

export interface TestPromptDto {
  // ... existing fields
  provider?: AIProvider
  provider_model?: string
}

export interface PlatformSettings {
  default_image_model: {
    provider: AIProvider
    model: string
  }
}
```

## Validation Rules

### system_prompts

| Field | Rule |
|-------|------|
| `provider` | Required, must be 'openai' or 'openrouter' |
| `provider_model` | Required when provider is 'openrouter', optional for 'openai' |
| `model` | Kept for backward compatibility, populated from provider_model |

### platform_settings

| Field | Rule |
|-------|------|
| `key` | Unique, required |
| `value` | Valid JSON matching expected schema for the key |

## Migration Strategy

1. **Add columns** with defaults (no downtime)
2. **Backfill data** - set provider_model from existing model field
3. **Add constraints** after backfill
4. **Deploy backend** changes that read new columns
5. **Deploy frontend** changes that write to new columns

## State Transitions

### System Prompt Provider Selection

```
[New Prompt]
    ↓
[Select Provider] → OpenAI: Use existing model dropdown
    ↓
    → OpenRouter: Fetch models from API, show in dropdown
    ↓
[Select Model]
    ↓
[Save] → Store provider + provider_model
```

### Image Generation Model Selection (Admin)

```
[Admin Settings]
    ↓
[Image Model Config]
    ↓
[Select Provider] → OpenAI: Show DALL-E-3
    ↓              → Google: Show Imagen-3
    ↓              → OpenRouter: Show image-capable models
[Save] → Update platform_settings.default_image_model
```

## Indexes

No new indexes required. Existing indexes on `system_prompts.key` and potential future `platform_settings.key` are sufficient.

## Data Volume Estimates

- `system_prompts`: ~50-100 rows, minimal impact
- `platform_settings`: ~10-20 rows, minimal impact
- No high-volume tables affected
