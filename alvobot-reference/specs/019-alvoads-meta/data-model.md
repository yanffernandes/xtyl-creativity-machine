# Data Model: AlvoADS Meta

**Feature**: 019-alvoads-meta
**Date**: 2025-12-25

## Overview

Este documento define as entidades, interfaces TypeScript e relacionamentos para o AlvoADS Meta.

---

## 1. Core Entities

### 1.1 MetaAdAccount

Representa uma conta de anúncios do Meta/Facebook.

```typescript
interface MetaAdAccount {
  id: string                    // ID da conta (act_XXXXXXXXX)
  name: string                  // Nome da conta
  accountId: string             // ID numérico
  connectionId: string          // ID da conexão OAuth
  currency: string              // Moeda (BRL, USD, etc)
  timezone: string              // Timezone (America/Sao_Paulo)
  status: MetaAccountStatus     // Status da conta
  businessName?: string         // Nome do negócio
  amountSpent?: number          // Valor gasto total
}

type MetaAccountStatus =
  | 'ACTIVE'
  | 'DISABLED'
  | 'PENDING_REVIEW'
  | 'IN_GRACE_PERIOD'
  | 'UNSETTLED'
```

### 1.2 MetaPage

Representa uma página do Facebook.

```typescript
interface MetaPage {
  id: string                    // ID da página
  name: string                  // Nome da página
  accessToken: string           // Page access token
  category?: string             // Categoria da página
  pictureUrl?: string           // URL da foto de perfil
  instagramBusinessAccount?: MetaInstagramAccount
}
```

### 1.3 MetaInstagramAccount

Representa uma conta do Instagram vinculada à página.

```typescript
interface MetaInstagramAccount {
  id: string                    // ID da conta Instagram
  username: string              // @username
  name?: string                 // Nome de exibição
  profilePictureUrl?: string    // URL da foto de perfil
  followersCount?: number       // Número de seguidores
}
```

### 1.4 MetaPixel

Representa um pixel do Facebook.

```typescript
interface MetaPixel {
  id: string                    // ID do pixel
  name: string                  // Nome do pixel
  lastFiredTime?: string        // Último disparo
  isActive: boolean             // Se está ativo
}
```

---

## 2. Campaign Entities

### 2.1 MetaCampaignTemplate

Template salvo de campanha (armazenado em `campaign_templates`).

```typescript
interface MetaCampaignTemplate {
  id: string
  userId: string
  workspaceId?: string
  platform: 'meta_ads'
  name: string
  status: CampaignTemplateStatus
  campaignData: MetaCampaignData
  platformIds?: MetaPlatformIds
  creditsConsumed: number
  errorMessage?: string
  createdAt: string
  updatedAt: string
  publishedAt?: string
  deletedAt?: string
}

type CampaignTemplateStatus =
  | 'draft'
  | 'ready'
  | 'publishing'
  | 'published'
  | 'failed'

interface MetaPlatformIds {
  campaignId?: string
  adSetId?: string
  creativeId?: string
  adId?: string
}
```

### 2.2 MetaCampaignData

Dados completos da campanha (armazenados como JSON).

```typescript
interface MetaCampaignData {
  // Account & Page
  adAccountId: string
  pageId: string
  instagramAccountId?: string

  // Campaign Config
  name: string
  objective: MetaObjective
  specialAdCategories: string[]
  status: 'ACTIVE' | 'PAUSED'

  // Targeting
  targeting: MetaTargeting

  // Budget
  budget: MetaBudget

  // Schedule
  schedule: MetaSchedule

  // Creative
  creative: MetaCreative

  // Ad Copy
  adCopy: MetaAdCopy

  // Messenger (optional)
  messenger?: MetaMessengerConfig
}
```

### 2.3 MetaObjective

Objetivo da campanha.

```typescript
type MetaObjective =
  | 'TRAFFIC'    // Cliques no Link
  | 'MESSAGES'   // Conversas Messenger
  | 'LEADS'      // Conversões / Leads
  | 'SALES'      // Vendas

// Mapeamento para API Meta
const META_OBJECTIVE_MAP = {
  TRAFFIC: { objective: 'OUTCOME_TRAFFIC', optimization: 'LINK_CLICKS' },
  MESSAGES: { objective: 'OUTCOME_ENGAGEMENT', optimization: 'CONVERSATIONS' },
  LEADS: { objective: 'OUTCOME_LEADS', optimization: 'LEAD_GENERATION' },
  SALES: { objective: 'OUTCOME_SALES', optimization: 'OFFSITE_CONVERSIONS' },
}
```

### 2.4 MetaTargeting

Configurações de segmentação.

```typescript
interface MetaTargeting {
  ageMin: number              // 18-65
  ageMax: number              // 18-65
  genders: MetaGender[]       // [0] = all, [1] = male, [2] = female
  countries: string[]         // Códigos de país (BR, US, PT)
  languages: MetaLanguage[]   // Idiomas selecionados
  customAudiences?: string[]  // IDs de públicos personalizados
}

type MetaGender = 0 | 1 | 2   // 0=all, 1=male, 2=female

interface MetaLanguage {
  key: string                 // Código do idioma (pt, en, es)
  name: string                // Nome de exibição
}
```

### 2.5 MetaBudget

Configurações de orçamento.

```typescript
interface MetaBudget {
  type: 'daily' | 'lifetime'
  amount: number              // Valor em centavos (600 = R$6)
  bidStrategy: MetaBidStrategy
  costPerResult?: number      // Custo desejado por resultado
}

type MetaBidStrategy =
  | 'LOWEST_COST_WITHOUT_CAP'
  | 'LOWEST_COST_WITH_BID_CAP'
  | 'COST_CAP'
```

### 2.6 MetaSchedule

Configurações de agendamento.

```typescript
interface MetaSchedule {
  type: 'continuous' | 'scheduled'
  startTime?: string          // ISO 8601 datetime
  endTime?: string            // ISO 8601 datetime
  timezone: string            // America/Sao_Paulo
}
```

---

## 3. Creative Entities

### 3.1 MetaCreative

Configurações do criativo.

```typescript
interface MetaCreative {
  sourceType: CreativeSourceType
  images: MetaCreativeImage[]
}

type CreativeSourceType =
  | 'google_drive'
  | 'ai_generated'
  | 'upload'

interface MetaCreativeImage {
  id: string
  url: string                 // URL da imagem
  thumbnailUrl?: string       // Thumbnail para preview
  hash?: string               // Image hash (após upload ao Meta)
  source: CreativeSourceType
  prompt?: string             // Prompt usado (se AI)
  width?: number
  height?: number
}
```

### 3.2 DriveFile

Arquivo do Google Drive.

```typescript
interface DriveFile {
  id: string
  name: string
  mimeType: string            // image/jpeg, image/png
  thumbnailLink: string
  webContentLink: string
  size: number
  createdTime?: string
}
```

### 3.3 AiGeneratedImage

Imagem gerada por IA.

```typescript
interface AiGeneratedImage {
  id: string
  url: string
  prompt: string
  revisedPrompt?: string      // Prompt revisado pela IA
  createdAt: string
  approved: boolean
}
```

---

## 4. Ad Copy Entity

### 4.1 MetaAdCopy

Textos do anúncio.

```typescript
interface MetaAdCopy {
  primaryText: string         // Texto principal (max 125 chars)
  headline: string            // Título (max 27 chars)
  description: string         // Descrição (max 27 chars)
  callToAction: MetaCTA       // CTA selecionado
  destinationUrl: string      // URL de destino
  displayUrl?: string         // URL de exibição (opcional)
}

type MetaCTA =
  | 'LEARN_MORE'
  | 'SHOP_NOW'
  | 'SIGN_UP'
  | 'SUBSCRIBE'
  | 'CONTACT_US'
  | 'GET_OFFER'
  | 'GET_QUOTE'
  | 'BOOK_NOW'
  | 'APPLY_NOW'
  | 'DOWNLOAD'
  | 'SEND_MESSAGE'
  | 'WHATSAPP_MESSAGE'
```

---

## 5. Messenger Entity

### 5.1 MetaMessengerConfig

Configurações para campanhas de Messenger.

```typescript
interface MetaMessengerConfig {
  welcomeMessage: string      // Mensagem de boas-vindas
  quickReplies: MetaQuickReply[]
  iceBreakers?: MetaIceBreaker[]
}

interface MetaQuickReply {
  id: string
  title: string               // Texto do botão (max 20 chars)
  payload?: string            // Payload para bot
}

interface MetaIceBreaker {
  id: string
  question: string            // Pergunta exibida
  payload: string             // Payload quando clicado
}
```

---

## 6. Database Schema

### 6.1 Existing Tables (Reused)

```sql
-- campaign_templates (já existe)
-- Adicionar suporte para platform = 'meta_ads'

-- Estrutura atual mantida:
campaign_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('google_ads', 'meta_ads')),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  campaign_data JSONB NOT NULL,
  platform_ids JSONB,
  credits_consumed INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- RLS policies já existentes aplicam-se automaticamente
```

### 6.2 New Tables (If Needed)

```sql
-- Opcional: Cache de países/idiomas do Meta
-- (Pode usar apenas em memória se preferir)

CREATE TABLE IF NOT EXISTS meta_geo_targets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'country', 'region', 'city'
  country_code TEXT,
  supports_city BOOLEAN DEFAULT false,
  supports_region BOOLEAN DEFAULT false,
  cached_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meta_languages (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Entity Relationships

```
┌─────────────────┐     ┌─────────────────┐
│  connections    │────▶│  MetaAdAccount  │
│  (OAuth)        │     │                 │
└─────────────────┘     └────────┬────────┘
                                 │
                                 │ has many
                                 ▼
                        ┌─────────────────┐
                        │    MetaPage     │
                        │                 │
                        └────────┬────────┘
                                 │
                                 │ has one (optional)
                                 ▼
                        ┌─────────────────┐
                        │ MetaInstagram   │
                        │    Account      │
                        └─────────────────┘

┌─────────────────┐
│ campaign_       │────┐
│ templates       │    │
│ (platform=meta) │    │
└─────────────────┘    │
                       │ contains
                       ▼
                ┌──────────────────┐
                │ MetaCampaignData │
                │                  │
                │ ├─ targeting     │
                │ ├─ budget        │
                │ ├─ schedule      │
                │ ├─ creative      │
                │ ├─ adCopy        │
                │ └─ messenger     │
                └──────────────────┘
```

---

## 8. Validation Rules

### 8.1 Targeting Validation

```typescript
const targetingSchema = {
  ageMin: { min: 18, max: 65 },
  ageMax: { min: 18, max: 65 },
  genders: { enum: [0, 1, 2] },
  countries: { required: true, minLength: 1 },
  languages: { required: true, minLength: 1 },
}

// Custom validation
function validateTargeting(targeting: MetaTargeting): boolean {
  return targeting.ageMin <= targeting.ageMax
}
```

### 8.2 Ad Copy Validation

```typescript
const adCopySchema = {
  primaryText: { maxLength: 125, required: true },
  headline: { maxLength: 27, required: true },
  description: { maxLength: 27, required: true },
  callToAction: { enum: META_CTA_VALUES, required: true },
  destinationUrl: { pattern: URL_REGEX, required: true },
}
```

### 8.3 Budget Validation

```typescript
const budgetSchema = {
  amount: { min: 600, required: true }, // R$6 em centavos
  type: { enum: ['daily', 'lifetime'], required: true },
  bidStrategy: { enum: BID_STRATEGIES, required: true },
}
```

---

## 9. State Transitions

### 9.1 Campaign Template Status

```
draft ──────────▶ ready ──────────▶ publishing ──────────▶ published
  │                 │                    │                     │
  │                 │                    │                     │
  ▼                 ▼                    ▼                     ▼
(edit)           (edit)              (wait)              (view only)
                                        │
                                        │ error
                                        ▼
                                     failed ──────────▶ ready (retry)
```

### 9.2 Valid Transitions

| From | To | Trigger |
|------|----|----|
| draft | ready | All required fields filled |
| ready | publishing | User clicks "Publish" |
| publishing | published | Meta API returns success |
| publishing | failed | Meta API returns error |
| failed | ready | User clicks "Retry" |
| published | (none) | Final state |

---

## 10. Index Recommendations

```sql
-- Índices para queries comuns
CREATE INDEX IF NOT EXISTS idx_campaign_templates_user_platform
  ON campaign_templates(user_id, platform)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_templates_workspace_platform
  ON campaign_templates(workspace_id, platform)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_templates_status
  ON campaign_templates(status)
  WHERE deleted_at IS NULL;
```
