# Research: AlvoADS Meta

**Feature**: 019-alvoads-meta
**Date**: 2025-12-25

## Executive Summary

Este documento consolida as decisões técnicas para implementação do AlvoADS Meta, baseado na análise do:
- Código existente do AlvoADS Google
- Backend Meta já implementado (OAuth, Campaign Service)
- TypeBot export (fluxo legado)
- Padrões do projeto

---

## Decision 1: Estrutura de Wizard

### Decision
Utilizar estrutura de wizard idêntica ao AlvoADS Google com 9 steps customizados para Meta.

### Rationale
- O AlvoADS Google já implementa padrões robustos (WizardStepper, StepNavigation, multi-select)
- Consistência de UX entre Google e Meta
- Reutilização de componentes existentes (70%+ do código)
- Store Zustand com padrão estabelecido

### Alternatives Considered
1. **Fluxo linear sem wizard** - Rejeitado: pior UX, não permite voltar/editar
2. **Modal único multi-step** - Rejeitado: limitado para quantidade de campos
3. **Formulário único longo** - Rejeitado: overwhelm do usuário

### Implementation

```typescript
// Steps do wizard Meta (baseado no TypeBot flow)
export const META_WIZARD_STEPS = [
  'account',       // Selecionar conta de anúncios
  'page',          // Selecionar página do Facebook
  'instagram',     // Configurar Instagram (opcional)
  'objective',     // Objetivo da campanha
  'targeting',     // Segmentação (idade, gênero, país, idioma)
  'budget',        // Orçamento e custo por resultado
  'creative',      // Criativos (Drive ou IA)
  'ad_copy',       // Textos do anúncio
  'review',        // Revisão final
] as const
```

---

## Decision 2: Modo de Criativos - Google Drive

### Decision
Integrar com Google Drive API via pasta pública, listando imagens e permitindo seleção múltipla.

### Rationale
- TypeBot legado já usava Google Drive
- Não requer autenticação OAuth adicional (pasta pública)
- Usuários já possuem materiais no Drive
- Validação de formatos (JPG, PNG) no frontend

### Alternatives Considered
1. **Upload direto** - Mantido como opção futura, mas não prioritário
2. **Dropbox/OneDrive** - Rejeitado: menor adoção no Brasil
3. **Supabase Storage** - Rejeitado: requer upload prévio

### Implementation

```typescript
// Endpoint backend para listar arquivos do Drive
GET /meta/campaigns/drive-files
Query: { folderUrl: string }
Response: { files: DriveFile[], error?: string }

interface DriveFile {
  id: string
  name: string
  mimeType: string
  thumbnailLink: string
  webContentLink: string
  size: number
}
```

---

## Decision 3: Geração de Imagens por IA

### Decision
Utilizar OpenAI DALL-E 3 via backend existente (AiCreativeService).

### Rationale
- Backend já possui `AiCreativeService` implementado
- DALL-E 3 oferece qualidade superior para anúncios
- Fluxo de preview → aprovação → uso já existe no TypeBot
- Custo por crédito já calculado no `CreditsService`

### Alternatives Considered
1. **Midjourney** - Rejeitado: sem API oficial
2. **Stable Diffusion local** - Rejeitado: requer infraestrutura adicional
3. **Leonardo.ai** - Rejeitado: custo maior, menos integração

### Implementation

```typescript
// Endpoint existente
POST /meta/campaigns/ai/generate-image
Body: { prompt: string, style?: string, aspectRatio?: string }
Response: { imageUrl: string, revisedPrompt: string }
```

---

## Decision 4: Objetivos de Campanha

### Decision
Mapear 4 objetivos principais do TypeBot para API Meta v21.0.

### Rationale
- TypeBot oferecia: Cliques, Conversas, Conversões, Vendas
- API Meta v21.0 usa objetivos ODAX (Outcome-Driven Ad Experiences)
- Simplificação para usuário final

### Mapping

| UI Label | Meta API Objective | Optimization Goal |
|----------|-------------------|-------------------|
| Cliques no Link | OUTCOME_TRAFFIC | LINK_CLICKS |
| Conversas Messenger | OUTCOME_ENGAGEMENT | CONVERSATIONS |
| Conversões/Leads | OUTCOME_LEADS | LEAD_GENERATION |
| Vendas | OUTCOME_SALES | OFFSITE_CONVERSIONS |

### Implementation

```typescript
export const META_OBJECTIVES = [
  { value: 'TRAFFIC', label: 'Cliques no Link', icon: 'link', description: 'Direcionar tráfego para seu site' },
  { value: 'MESSAGES', label: 'Conversas Messenger', icon: 'message-circle', description: 'Iniciar conversas no Messenger' },
  { value: 'LEADS', label: 'Conversões / Leads', icon: 'user-plus', description: 'Gerar cadastros e leads' },
  { value: 'SALES', label: 'Vendas', icon: 'shopping-cart', description: 'Aumentar vendas online' },
] as const
```

---

## Decision 5: Segmentação Geo/Idioma

### Decision
Buscar países e idiomas dinamicamente da Meta API, não hardcoded.

### Rationale
- Regra do projeto: NUNCA usar dados hardcoded
- Meta API fornece targeting search endpoint
- Permite expansão futura para mais países
- Dados sempre atualizados

### Implementation

```typescript
// Endpoints backend
GET /meta/targeting/countries
Query: { search?: string, limit?: number }
Response: { countries: Country[] }

GET /meta/targeting/languages
Query: { search?: string }
Response: { languages: Language[] }

// Usar Meta API
// GET /search?type=adgeolocation&q={query}&location_types=["country"]
// GET /search?type=adlocale&q={query}
```

---

## Decision 6: Store Zustand - Estrutura

### Decision
Criar `metaAdsWizardStore` seguindo padrão do `googleAdsWizardStore`.

### Rationale
- Consistência com padrão existente
- Multi-select para contas/páginas
- Estado de publicação (auto/semi-auto)
- Separação clara entre wizard state e server state

### Implementation

```typescript
interface MetaAdsWizardState {
  // Meta
  templateName: string
  currentStep: MetaWizardStep
  completedSteps: Set<MetaWizardStep>

  // Selections
  accounts: MetaAdAccount[]
  pages: MetaPage[]
  instagramAccount: MetaInstagramAccount | null

  // Campaign Config
  objective: MetaObjective
  targeting: MetaTargeting
  budget: MetaBudget

  // Creatives
  creativeMode: 'google_drive' | 'ai_generated'
  driveImages: DriveFile[]
  aiGeneratedImages: AiImage[]

  // Ad Copy
  primaryText: string
  headline: string
  description: string
  callToAction: string
  destinationUrl: string

  // Messenger (when objective is MESSAGES)
  messengerWelcome?: string
  messengerQuickReply?: string

  // Actions...
}
```

---

## Decision 7: Tabela campaign_templates

### Decision
Reutilizar tabela `campaign_templates` existente com campo `platform = 'meta_ads'`.

### Rationale
- Tabela já existe e suporta Google Ads
- Campo `platform` já existe: `'google_ads' | 'meta_ads'`
- Evita duplicação de estrutura
- Mesma lógica de créditos e status

### Schema Existing

```sql
campaign_templates (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  workspace_id UUID,
  platform TEXT, -- 'google_ads' | 'meta_ads'
  name TEXT,
  status TEXT, -- 'draft' | 'ready' | 'publishing' | 'published' | 'failed'
  campaign_data JSONB, -- Configurações específicas da plataforma
  platform_ids JSONB, -- IDs retornados após publicação
  credits_consumed INT,
  error_message TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
)
```

---

## Decision 8: API Contracts Backend

### Decision
Criar endpoints em `/meta/campaigns/*` seguindo padrão RESTful.

### Rationale
- Consistência com `/google/campaigns/*`
- Separação clara por plataforma
- Reutilização de middlewares (auth, credits)

### Endpoints

```
# Templates
POST   /meta/campaigns/templates          # Salvar template
GET    /meta/campaigns/templates          # Listar templates
GET    /meta/campaigns/templates/:id      # Buscar template
DELETE /meta/campaigns/templates/:id      # Deletar template

# Publishing
POST   /meta/campaigns/:id/publish        # Publicar campanha
POST   /meta/campaigns/:id/pause          # Pausar campanha
POST   /meta/campaigns/:id/resume         # Retomar campanha

# Data Fetching
GET    /meta/campaigns/accounts/:connectionId     # Listar Ad Accounts
GET    /meta/campaigns/pages/:connectionId        # Listar Pages
GET    /meta/campaigns/instagram/:pageId          # Listar Instagram accounts
GET    /meta/campaigns/pixels/:adAccountId        # Listar Pixels

# AI Generation
POST   /meta/campaigns/ai/ad-copy         # Gerar textos
POST   /meta/campaigns/ai/image           # Gerar imagem

# Google Drive
GET    /meta/campaigns/drive-files        # Listar arquivos do Drive
```

---

## Decision 9: Validações Frontend

### Decision
Implementar validações no frontend antes de permitir avanço de step.

### Rationale
- UX imediata sem round-trip ao servidor
- Limites do Meta bem documentados
- Consistência com AlvoADS Google

### Validation Rules

```typescript
// Limites de caracteres Meta Ads
export const META_AD_LIMITS = {
  primaryText: 125,        // Texto principal
  headline: 27,            // Título
  description: 27,         // Descrição
  linkDescription: 30,     // Link description
  callToAction: 'SELECT',  // Dropdown fixo
}

// Validações de targeting
export const META_TARGETING_RULES = {
  ageMin: 18,
  ageMax: 65,
  genders: ['all', 'male', 'female'],
  budgetMin: 600, // R$6 em centavos
}
```

---

## Decision 10: Fluxo de Publicação

### Decision
Implementar fluxo de publicação sequencial: Campaign → AdSet → Ad Creative → Ad.

### Rationale
- Meta API requer criação em sequência
- Cada entidade depende do ID da anterior
- Permite retry granular em caso de falha

### Flow

```
1. Criar Campaign
   POST /{ad_account_id}/campaigns
   → campaign_id

2. Criar AdSet
   POST /{ad_account_id}/adsets
   → adset_id

3. Upload Creative (se necessário)
   POST /{ad_account_id}/adimages (para imagens)
   → image_hash

4. Criar AdCreative
   POST /{ad_account_id}/adcreatives
   → creative_id

5. Criar Ad
   POST /{ad_account_id}/ads
   → ad_id

6. Atualizar template
   status: 'published'
   platform_ids: { campaign_id, adset_id, creative_id, ad_id }
```

---

## Technology Stack Summary

| Component | Technology | Justification |
|-----------|------------|---------------|
| Frontend Framework | React 18 + TypeScript | Padrão do projeto |
| State Management | Zustand | Padrão estabelecido |
| API Calls | TanStack Query v5 | Caching, invalidation |
| Styling | CSS Modules + Variables | Design system existente |
| Backend Framework | NestJS 10 | Padrão do projeto |
| External API | Meta Marketing API v21.0 | Versão estável atual |
| Image Generation | OpenAI DALL-E 3 | Já implementado |
| Database | Supabase PostgreSQL | Padrão do projeto |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Meta API rate limits | Medium | Medium | Implement exponential backoff |
| Token expiration mid-publish | Low | High | Validate token before publish |
| DALL-E generation failure | Low | Low | Retry + fallback to Drive |
| Google Drive API changes | Low | Medium | Version lock, error handling |
| Large image files | Medium | Low | Client-side compression |

---

## Next Steps

1. Generate `data-model.md` with entity definitions
2. Generate API contracts in `contracts/` directory
3. Generate `quickstart.md` with implementation steps
4. Update agent context with new technologies
