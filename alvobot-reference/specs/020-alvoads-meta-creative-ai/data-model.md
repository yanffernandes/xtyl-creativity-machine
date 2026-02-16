# Data Model: AlvoADS Meta - Geracao Automatizada de Criativos por IA

**Date**: 2026-01-02
**Feature**: [spec.md](./spec.md)

## Entity Relationship Diagram

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│  system_prompts │       │  creative_library │       │     articles    │
│  (existente)    │       │      (NOVA)       │       │   (existente)   │
├─────────────────┤       ├──────────────────┤       ├─────────────────┤
│ key             │       │ id (PK)          │◄──────│ id              │
│ system_prompt   │       │ user_id (FK)     │       │ title           │
│ user_prompt_    │       │ article_id (FK)  │───────│ keyword         │
│   template      │       │ image_url        │       │ excerpt         │
│ model           │       │ storage_path     │       └─────────────────┘
│ temperature     │       │ model_used       │
│ max_tokens      │       │ style_used       │       ┌─────────────────┐
│ variables       │       │ prompt_used      │       │ meta_campaigns  │
│ is_active       │       │ format           │       │   (existente)   │
└─────────────────┘       │ status           │       ├─────────────────┤
                          │ created_at       │       │ id              │
                          │ updated_at       │       │ user_id         │
                          └──────────────────┘       │ ...             │
                                  │                  └─────────────────┘
                                  │
                          ┌───────▼────────┐
                          │campaign_creatives│
                          │    (NOVA)       │
                          ├─────────────────┤
                          │ id (PK)         │
                          │ campaign_id (FK)│──────► meta_campaigns
                          │ library_id (FK) │──────► creative_library
                          │ primary_text    │
                          │ headline        │
                          │ description     │
                          │ cta             │
                          │ status          │
                          │ adset_index     │
                          │ created_at      │
                          └─────────────────┘
```

## Entities

### 1. creative_library (NOVA)

Armazena todas as imagens geradas e aprovadas para reutilização.

| Campo | Tipo | Nullable | Default | Descrição |
|-------|------|----------|---------|-----------|
| id | uuid | NO | gen_random_uuid() | Identificador único |
| user_id | uuid | NO | - | FK para auth.users |
| article_id | bigint | YES | NULL | FK para articles (origem) |
| image_url | text | NO | - | URL pública da imagem |
| storage_path | text | NO | - | Caminho no Supabase Storage |
| model_used | text | NO | - | 'dall-e-3' ou 'imagen-3' |
| style_used | text | YES | NULL | Estilo aplicado (photorealistic, etc.) |
| prompt_used | text | NO | - | Prompt completo usado na geração |
| format | text | NO | '1:1' | Aspect ratio (1:1, 9:16, 16:9) |
| status | text | NO | 'approved' | approved, deleted |
| metadata | jsonb | YES | NULL | Dados extras (revised_prompt, etc.) |
| created_at | timestamptz | NO | now() | Data de criação |
| updated_at | timestamptz | NO | now() | Data de atualização |

**Indexes**:
- `idx_creative_library_user_id` ON (user_id)
- `idx_creative_library_article_id` ON (article_id)
- `idx_creative_library_status` ON (status)
- `idx_creative_library_created_at` ON (created_at DESC)

**RLS Policies**:
```sql
-- Users can only access their own creatives
CREATE POLICY "Users can view own creatives"
  ON creative_library FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own creatives"
  ON creative_library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own creatives"
  ON creative_library FOR UPDATE
  USING (auth.uid() = user_id);
```

---

### 2. campaign_creatives (NOVA)

Vincula criativos da biblioteca a campanhas específicas com textos de anúncio.

| Campo | Tipo | Nullable | Default | Descrição |
|-------|------|----------|---------|-----------|
| id | uuid | NO | gen_random_uuid() | Identificador único |
| campaign_id | uuid | NO | - | FK para meta_campaigns |
| library_id | uuid | NO | - | FK para creative_library |
| primary_text | text | NO | - | Texto principal (max 125) |
| headline | text | NO | - | Headline (max 27) |
| description | text | YES | NULL | Descrição (max 27) |
| cta | text | NO | 'LEARN_MORE' | Call-to-action |
| status | text | NO | 'pending' | pending, approved, published |
| adset_index | integer | NO | 0 | Índice do AdSet associado |
| metadata | jsonb | YES | NULL | Dados extras |
| created_at | timestamptz | NO | now() | Data de criação |
| updated_at | timestamptz | NO | now() | Data de atualização |

**Indexes**:
- `idx_campaign_creatives_campaign_id` ON (campaign_id)
- `idx_campaign_creatives_library_id` ON (library_id)
- `idx_campaign_creatives_status` ON (status)

**RLS Policies**:
```sql
-- Users can access creatives for their own campaigns
CREATE POLICY "Users can view campaign creatives"
  ON campaign_creatives FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM meta_campaigns WHERE user_id = auth.uid()
    )
  );
```

---

### 3. system_prompts (EXISTENTE - nova entrada)

Nova entrada para geração de prompts de imagem.

| Key | Descrição |
|-----|-----------|
| `meta-ads.image-prompt-generator` | Gera descrição de imagem para DALL-E/Imagen |

**Variables disponíveis**:
- `{{article_title}}` - Título do artigo
- `{{keyword}}` - Palavra-chave principal
- `{{article_excerpt}}` - Resumo do artigo
- `{{style}}` - Estilo visual (photorealistic, illustration, etc.)
- `{{format}}` - Aspect ratio (1:1, 9:16, 16:9)
- `{{user_directions}}` - Direcionamentos opcionais do usuário

---

## Enums/Constants

### ImageModel
```typescript
type ImageModel = 'dall-e-3' | 'imagen-3';
```

### ImageFormat
```typescript
type ImageFormat = '1:1' | '9:16' | '16:9';
```

### CreativeStatus
```typescript
type CreativeStatus = 'pending' | 'generating' | 'completed' | 'failed' | 'approved' | 'rejected';
```

### CampaignCreativeStatus
```typescript
type CampaignCreativeStatus = 'pending' | 'approved' | 'published';
```

### ImageStyle
```typescript
type ImageStyle =
  | 'photorealistic'
  | 'illustration'
  | 'minimalist'
  | 'cinematic'
  | 'watercolor';
```

### MetaCTA
```typescript
type MetaCTA =
  | 'LEARN_MORE'
  | 'SHOP_NOW'
  | 'SIGN_UP'
  | 'CONTACT_US'
  | 'GET_OFFER'
  | 'DOWNLOAD';
```

---

## State Transitions

### Creative Generation Flow
```
┌─────────┐     generate      ┌────────────┐     success     ┌───────────┐
│ pending │ ─────────────────► │ generating │ ───────────────► │ completed │
└─────────┘                    └────────────┘                  └───────────┘
                                     │                              │
                                     │ failure                      │ approve
                                     ▼                              ▼
                               ┌──────────┐                   ┌──────────┐
                               │  failed  │                   │ approved │
                               └──────────┘                   └──────────┘
                                     │                              │
                                     │ retry                        │ reject
                                     ▼                              ▼
                               ┌────────────┐                 ┌──────────┐
                               │ generating │                 │ rejected │
                               └────────────┘                 └──────────┘
```

### Campaign Creative Flow
```
┌─────────┐     generate_text     ┌──────────┐     publish     ┌───────────┐
│ pending │ ─────────────────────► │ approved │ ───────────────► │ published │
└─────────┘                        └──────────┘                  └───────────┘
```

---

## Migration Script

```sql
-- Migration: 20260102_creative_library.sql

-- 1. Create creative_library table
CREATE TABLE IF NOT EXISTS creative_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id BIGINT REFERENCES articles(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  model_used TEXT NOT NULL CHECK (model_used IN ('dall-e-3', 'imagen-3')),
  style_used TEXT,
  prompt_used TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT '1:1' CHECK (format IN ('1:1', '9:16', '16:9')),
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'deleted')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create indexes
CREATE INDEX idx_creative_library_user_id ON creative_library(user_id);
CREATE INDEX idx_creative_library_article_id ON creative_library(article_id);
CREATE INDEX idx_creative_library_status ON creative_library(status);
CREATE INDEX idx_creative_library_created_at ON creative_library(created_at DESC);

-- 3. Enable RLS
ALTER TABLE creative_library ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "Users can view own creatives"
  ON creative_library FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own creatives"
  ON creative_library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own creatives"
  ON creative_library FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own creatives"
  ON creative_library FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Create campaign_creatives table
CREATE TABLE IF NOT EXISTS campaign_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL, -- FK added after meta_campaigns exists
  library_id UUID NOT NULL REFERENCES creative_library(id) ON DELETE CASCADE,
  primary_text TEXT NOT NULL CHECK (char_length(primary_text) <= 125),
  headline TEXT NOT NULL CHECK (char_length(headline) <= 27),
  description TEXT CHECK (char_length(description) <= 27),
  cta TEXT NOT NULL DEFAULT 'LEARN_MORE',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'published')),
  adset_index INTEGER NOT NULL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create indexes for campaign_creatives
CREATE INDEX idx_campaign_creatives_campaign_id ON campaign_creatives(campaign_id);
CREATE INDEX idx_campaign_creatives_library_id ON campaign_creatives(library_id);
CREATE INDEX idx_campaign_creatives_status ON campaign_creatives(status);

-- 7. Enable RLS for campaign_creatives
ALTER TABLE campaign_creatives ENABLE ROW LEVEL SECURITY;

-- 8. Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Add triggers
CREATE TRIGGER update_creative_library_updated_at
  BEFORE UPDATE ON creative_library
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_creatives_updated_at
  BEFORE UPDATE ON campaign_creatives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Create storage bucket (via Supabase Dashboard or API)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('meta-creatives', 'meta-creatives', true);
```
