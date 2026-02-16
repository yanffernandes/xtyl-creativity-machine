# Modelo de Dados - Sistema de Criativos Alvo Bot

## Diagrama de Entidades

```
┌─────────────────────┐       ┌──────────────────────┐       ┌─────────────────┐
│   system_prompts    │       │   creative_library   │       │    articles     │
│   (existente)       │       │       (NOVA)         │       │  (existente)    │
├─────────────────────┤       ├──────────────────────┤       ├─────────────────┤
│ key (PK)            │       │ id (UUID, PK)        │◄──────│ id (BIGINT)     │
│ system_prompt       │       │ user_id (FK)         │       │ title           │
│ user_prompt_template│       │ workspace_id (FK)    │       │ keyword_used    │
│ provider            │       │ article_id (FK)      │───────│ excerpt         │
│ provider_model      │       │ image_url            │       │ language        │
│ model               │       │ storage_path         │       │ keyword_snapshot│
│ temperature         │       │ model_used           │       └─────────────────┘
│ max_tokens          │       │ style_used           │
│ variables           │       │ prompt_used          │       ┌─────────────────┐
│ is_active           │       │ format               │       │platform_settings│
└─────────────────────┘       │ status               │       ├─────────────────┤
                              │ concept_id (FK)      │       │ key (PK)        │
                              │ background_used      │       │ value (JSONB)   │
                              │ visual_group_code    │       └─────────────────┘
                              │ session_id           │
                              │ diversity_metadata   │
                              │ created_at           │
                              │ updated_at           │
                              └──────────┬───────────┘
                                         │
                                         │ 1:N
                              ┌──────────▼───────────┐
                              │ campaign_creatives   │
                              │      (NOVA)          │
                              ├──────────────────────┤
                              │ id (UUID, PK)        │
                              │ campaign_id (FK)     │──────► campaign_templates
                              │ library_id (FK)      │──────► creative_library
                              │ primary_text         │
                              │ headline             │
                              │ description          │
                              │ cta                  │
                              │ status               │
                              │ adset_index          │
                              │ metadata (JSONB)     │
                              │ created_at           │
                              │ updated_at           │
                              └──────────────────────┘
```

---

## Tabela: `creative_library`

Armazena todas as imagens geradas e aprovadas. E o nucleo do sistema de criativos.

| Campo | Tipo | Nullable | Default | Descricao |
|-------|------|----------|---------|-----------|
| `id` | UUID | NO | `gen_random_uuid()` | Identificador unico |
| `user_id` | UUID | NO | - | FK para `auth.users` |
| `workspace_id` | UUID | YES | NULL | FK para `workspaces` (isolamento por workspace) |
| `article_id` | BIGINT | YES | NULL | FK para `articles` (artigo de origem) |
| `image_url` | TEXT | NO | - | URL publica da imagem (Supabase Storage) |
| `storage_path` | TEXT | NO | - | Caminho no bucket `meta-creatives` |
| `model_used` | TEXT | NO | - | Identificador completo do modelo (ex: `openrouter/google/gemini-3-pro-image-preview`) |
| `style_used` | TEXT | YES | NULL | Estilo visual aplicado (`photorealistic`, `illustration`, `minimalist`, `cinematic`, `watercolor`, `concept-based`) |
| `prompt_used` | TEXT | NO | - | Prompt completo usado na geracao (pode ser JSON do PromptComposer) |
| `format` | TEXT | NO | `'1:1'` | Aspect ratio: `1:1`, `9:16`, `16:9` |
| `status` | TEXT | NO | `'approved'` | `approved` ou `deleted` (soft delete) |
| `concept_id` | UUID | YES | NULL | FK para conceito criativo do Andromeda |
| `background_used` | TEXT | YES | NULL | Slug do background usado |
| `visual_group_code` | TEXT | YES | NULL | Codigo do visual group (A-H) |
| `session_id` | UUID | YES | NULL | ID da sessao de geracao |
| `diversity_metadata` | JSONB | YES | NULL | Metricas de diversidade da sessao |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Data de criacao |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Data de atualizacao |

### Indices
```sql
CREATE INDEX idx_creative_library_user_id ON creative_library(user_id);
CREATE INDEX idx_creative_library_article_id ON creative_library(article_id);
CREATE INDEX idx_creative_library_status ON creative_library(status);
CREATE INDEX idx_creative_library_created_at ON creative_library(created_at DESC);
```

### RLS (Row Level Security)
```sql
-- Usuarios so veem seus proprios criativos
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
```

---

## Tabela: `campaign_creatives`

Vincula criativos da biblioteca a campanhas com textos de anuncio.

| Campo | Tipo | Nullable | Default | Descricao |
|-------|------|----------|---------|-----------|
| `id` | UUID | NO | `gen_random_uuid()` | Identificador unico |
| `campaign_id` | UUID | NO | - | FK para `campaign_templates` |
| `library_id` | UUID | NO | - | FK para `creative_library` |
| `primary_text` | TEXT | NO | - | Texto principal (max 125 chars) |
| `headline` | TEXT | NO | - | Titulo (max 27 chars) |
| `description` | TEXT | YES | NULL | Descricao (max 27 chars) |
| `cta` | TEXT | NO | `'LEARN_MORE'` | Call-to-action do Meta |
| `status` | TEXT | NO | `'pending'` | `pending`, `approved`, `published` |
| `adset_index` | INTEGER | NO | `0` | Indice do AdSet associado |
| `metadata` | JSONB | YES | NULL | Dados extras |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Data de criacao |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Data de atualizacao |

### Constraints
```sql
CHECK (char_length(primary_text) <= 125)
CHECK (char_length(headline) <= 27)
CHECK (char_length(description) <= 27)
CHECK (status IN ('pending', 'approved', 'published'))
```

---

## Tabela: `system_prompts` (Existente - Novas Entradas)

Prompts configuraveis pelo admin para geracao de conteudo.

### Chaves Relevantes para Criativos

| Key | Descricao | Variaveis Disponiveis |
|-----|-----------|----------------------|
| `meta-ads.image-prompt-generator` | Gera descricao textual para o modelo de imagem | `{{article_title}}`, `{{keyword}}`, `{{article_excerpt}}`, `{{style}}`, `{{format}}`, `{{user_directions}}` |
| `meta-ads.primary-text` | Gera texto principal do anuncio | `{{article_title}}`, `{{keyword}}`, `{{article_excerpt}}`, `{{destination_url}}`, `{{objective}}`, `{{language}}` |
| `meta-ads.headline` | Gera headline do anuncio | Mesmas variaveis |
| `meta-ads.description` | Gera descricao do anuncio | Mesmas variaveis |
| `meta-ads.complete-copy` | Gera copy completo (primary_text + headline + description + CTA) | Mesmas + `{{valid_ctas}}` |

### Estrutura da Tabela
```sql
system_prompts (
  key TEXT PRIMARY KEY,
  system_prompt TEXT,           -- Prompt de sistema (instrucoes ao modelo)
  user_prompt_template TEXT,    -- Template com variaveis {{...}}
  provider TEXT,                -- 'openrouter' | 'openai' | NULL
  provider_model TEXT,          -- Modelo especifico do provider
  model TEXT,                   -- Modelo fallback
  temperature FLOAT,
  max_tokens INTEGER,
  variables JSONB,              -- Lista de variaveis suportadas
  is_active BOOLEAN DEFAULT true
);
```

---

## Tabela: `platform_settings`

Configuracoes globais da plataforma.

| Key | Tipo Valor | Descricao |
|-----|-----------|-----------|
| `default_image_model` | `{ provider: string, model: string }` | Modelo padrao de geracao de imagens |

---

## Tabela: `campaign_templates` (Existente - Estendida)

Templates de campanha que armazenam toda a configuracao como JSON.

```sql
campaign_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  workspace_id UUID,
  platform TEXT CHECK (platform IN ('google_ads', 'meta_ads')),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft',  -- draft → ready → publishing → published/failed
  campaign_data JSONB NOT NULL, -- JSON completo com toda config da campanha
  platform_ids JSONB,           -- IDs do Meta apos publicacao
  credits_consumed INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
```

### Estrutura do `campaign_data` (JSONB)
```typescript
{
  adAccountId: string,          // act_XXXXXXX
  pageId: string,               // ID da pagina Facebook
  instagramAccountId?: string,  // Instagram (opcional)
  name: string,                 // Nome da campanha
  objective: 'TRAFFIC' | 'MESSAGES' | 'LEADS' | 'SALES',
  targeting: {
    ageMin: number,             // 18-65
    ageMax: number,
    genders: [0|1|2],           // 0=all, 1=male, 2=female
    countries: string[],        // ['BR', 'US']
    languages: [{ key: string, name: string }]
  },
  budget: {
    type: 'daily' | 'lifetime',
    amount: number,             // Em centavos (600 = R$6)
    bidStrategy: string,
    costPerResult?: number
  },
  schedule: {
    type: 'continuous' | 'scheduled',
    startTime?: string,
    endTime?: string,
    timezone: string
  },
  creative: {
    sourceType: 'google_drive' | 'ai_generated' | 'upload',
    images: [{ id, url, hash, source, prompt }]
  },
  adCopy: {
    primaryText: string,        // max 125
    headline: string,           // max 27
    description: string,        // max 27
    callToAction: string,       // CTA do Meta
    destinationUrl: string
  },
  messenger?: {
    welcomeMessage: string,
    quickReplies: [{ title, payload }],
    iceBreakers?: [{ question, payload }]
  }
}
```

---

## Enums e Constantes

### Status do Criativo (Geracao)
```
pending → generating → completed → approved
                    ↘ failed → (retry) → generating
                               completed → rejected
```

### Status da Campaign Creative
```
pending → approved → published
```

### Formatos de Imagem
```typescript
type ImageFormat = '1:1' | '9:16' | '16:9';
```

### Estilos Visuais
```typescript
type ImageStyle = 'photorealistic' | 'illustration' | 'minimalist' | 'cinematic' | 'watercolor';
```

### Nichos Detectaveis
```typescript
type CreativeNiche = 'generic' | 'financial' | 'jobs' | 'health' | 'ecommerce';
```

### CTAs Validos do Meta (30+)
```typescript
const VALID_META_CTA_VALUES = [
  'LEARN_MORE', 'SHOP_NOW', 'SIGN_UP', 'CONTACT_US', 'GET_OFFER',
  'DOWNLOAD', 'BOOK_NOW', 'SUBSCRIBE', 'APPLY_NOW', 'MESSAGE_PAGE',
  'WHATSAPP_MESSAGE', 'BUY_NOW', 'ORDER_NOW', 'GET_QUOTE', 'CALL_NOW',
  'CALL', 'GET_DIRECTIONS', 'WATCH_MORE', 'WATCH_VIDEO', 'LISTEN_NOW',
  'PLAY_GAME', 'INSTALL_APP', 'USE_APP', 'GET_STARTED', 'DONATE_NOW',
  'DONATE', 'BUY_TICKETS', 'REQUEST_TIME', 'SEE_MORE', 'SEND_UPDATES',
  'GET_SHOWTIMES', 'EVENT_RSVP', 'NO_BUTTON'
];
```

---

## Migration SQL Completa

```sql
-- 1. Tabela creative_library
CREATE TABLE IF NOT EXISTS creative_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  article_id BIGINT REFERENCES articles(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  model_used TEXT NOT NULL,
  style_used TEXT,
  prompt_used TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT '1:1' CHECK (format IN ('1:1', '9:16', '16:9')),
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'deleted')),
  concept_id UUID,
  background_used TEXT,
  visual_group_code TEXT,
  session_id UUID,
  diversity_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indices
CREATE INDEX idx_creative_library_user_id ON creative_library(user_id);
CREATE INDEX idx_creative_library_article_id ON creative_library(article_id);
CREATE INDEX idx_creative_library_status ON creative_library(status);
CREATE INDEX idx_creative_library_created_at ON creative_library(created_at DESC);

-- 3. RLS
ALTER TABLE creative_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own creatives" ON creative_library
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own creatives" ON creative_library
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own creatives" ON creative_library
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own creatives" ON creative_library
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Tabela campaign_creatives
CREATE TABLE IF NOT EXISTS campaign_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL,
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

-- 5. Indices
CREATE INDEX idx_campaign_creatives_campaign_id ON campaign_creatives(campaign_id);
CREATE INDEX idx_campaign_creatives_library_id ON campaign_creatives(library_id);
CREATE INDEX idx_campaign_creatives_status ON campaign_creatives(status);

-- 6. RLS
ALTER TABLE campaign_creatives ENABLE ROW LEVEL SECURITY;

-- 7. Triggers de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER update_creative_library_updated_at
  BEFORE UPDATE ON creative_library
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_creatives_updated_at
  BEFORE UPDATE ON campaign_creatives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Estrutura do `diversity_metadata` (JSONB)

Armazenado na `creative_library` para cada imagem gerada:

```json
{
  "used_concepts": ["conceito-a-slug", "conceito-b-slug"],
  "used_backgrounds": ["gradient-blue", "solid-white"],
  "used_models": ["openrouter/google/gemini-3-pro-image-preview", "replicate/google/nano-banana-pro"],
  "diversity_score": 85.5,
  "generated_at": "2026-01-15T10:30:00Z"
}
```
