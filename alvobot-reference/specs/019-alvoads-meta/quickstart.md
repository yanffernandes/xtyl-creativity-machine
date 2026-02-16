# Quickstart Guide: AlvoADS Meta

**Feature**: 019-alvoads-meta
**Date**: 2025-12-25

## Overview

Este guia fornece o caminho rápido para implementar o AlvoADS Meta, dividido em fases incrementais.

---

## Prerequisites

Antes de iniciar:

1. **Conexões Meta OAuth funcionando** (spec 010-conexoes)
2. **Backend Meta module existente** (`backend/src/modules/meta/`)
3. **AlvoADS Google implementado** (referência de estrutura)
4. **Supabase configurado** com tabela `campaign_templates`

---

## Phase 1: Frontend Foundation (2-3 dias)

### 1.1 Criar estrutura de feature

```bash
# Criar diretórios
mkdir -p frontend/src/features/alvoads-meta/{api,components,pages,stores,types,utils}
mkdir -p frontend/src/features/alvoads-meta/components/steps
```

### 1.2 Definir types (copy de alvoads-google, adaptar)

```typescript
// frontend/src/features/alvoads-meta/types/campaign.ts
export type MetaObjective = 'TRAFFIC' | 'MESSAGES' | 'LEADS' | 'SALES'
export type MetaWizardStep =
  | 'account' | 'page' | 'instagram' | 'objective'
  | 'targeting' | 'budget' | 'creative' | 'ad_copy' | 'review'

export const META_WIZARD_STEPS: MetaWizardStep[] = [
  'account', 'page', 'instagram', 'objective',
  'targeting', 'budget', 'creative', 'ad_copy', 'review'
]

// ... resto das interfaces (ver data-model.md)
```

### 1.3 Criar Zustand store

```typescript
// frontend/src/features/alvoads-meta/stores/metaAdsWizardStore.ts
import { create } from 'zustand'
// Copiar estrutura de googleAdsWizardStore e adaptar
```

### 1.4 Criar página principal

```typescript
// frontend/src/features/alvoads-meta/pages/AlvoAdsMetaPage.tsx
// Dashboard com listagem de templates
```

### 1.5 Adicionar rota

```typescript
// frontend/src/app/router.tsx
{
  path: '/alvoads-meta',
  element: <AlvoAdsMetaPage />,
},
{
  path: '/alvoads-meta/wizard',
  element: <MetaAdsWizardPage />,
},
```

---

## Phase 2: Wizard Steps (3-4 dias)

### 2.1 StepAccount

Seleção de conta de anúncios (multi-select).

```typescript
// components/steps/StepAccount.tsx
// Reutilizar padrão de StepAccount do Google Ads
// Chamar: GET /meta/campaigns/accounts/:connectionId
```

### 2.2 StepPage

Seleção de página do Facebook.

```typescript
// components/steps/StepPage.tsx
// Chamar: GET /meta/campaigns/pages/:connectionId
```

### 2.3 StepInstagram

Configuração de Instagram (opcional).

```typescript
// components/steps/StepInstagram.tsx
// Chamar: GET /meta/campaigns/instagram/:pageId
// Checkbox para incluir/excluir
```

### 2.4 StepObjective

Seleção de objetivo.

```typescript
// components/steps/StepObjective.tsx
// 4 cards: Cliques, Conversas, Conversões, Vendas
// Verificar Pixel se objetivo = LEADS ou SALES
```

### 2.5 StepTargeting

Segmentação de público.

```typescript
// components/steps/StepTargeting.tsx
// Campos: idade min/max, gênero, país, idioma
// Buscar países/idiomas: GET /meta/targeting/*
```

### 2.6 StepBudget

Orçamento e lances.

```typescript
// components/steps/StepBudget.tsx
// Campos: orçamento diário, custo por resultado, bid strategy
```

### 2.7 StepCreative

Criativos (Drive ou IA).

```typescript
// components/steps/StepCreative.tsx
// Tabs: Google Drive | Gerar com IA
// Google Drive: input URL + lista de imagens
// IA: input prompt + preview + approve
```

### 2.8 StepAdCopy

Textos do anúncio.

```typescript
// components/steps/StepAdCopy.tsx
// Campos: primaryText, headline, description, CTA, URL
// Contador de caracteres
// Botão "Gerar com IA" (opcional)
```

### 2.9 StepReview

Revisão final.

```typescript
// components/steps/StepReview.tsx
// Resumo de todas as configurações
// Botão "Publicar"
```

---

## Phase 3: Backend Endpoints (2-3 dias)

### 3.1 Endpoints de dados

```typescript
// backend/src/modules/meta/campaign.controller.ts

@Get('accounts/:connectionId')
async getAdAccounts(@Param('connectionId') connectionId: string)

@Get('pages/:connectionId')
async getPages(@Param('connectionId') connectionId: string)

@Get('instagram/:pageId')
async getInstagramAccount(@Param('pageId') pageId: string)

@Get('pixels/:adAccountId')
async getPixels(@Param('adAccountId') adAccountId: string)
```

### 3.2 Endpoints de targeting

```typescript
@Get('targeting/countries')
async searchCountries(@Query('search') search: string)

@Get('targeting/languages')
async searchLanguages(@Query('search') search: string)
```

### 3.3 Endpoints de Google Drive

```typescript
@Get('drive-files')
async listDriveFiles(@Query('folderUrl') folderUrl: string)
// Parsear URL, listar arquivos públicos
```

---

## Phase 4: Publishing Flow (2-3 dias)

### 4.1 Endpoint de publicação

```typescript
// backend/src/modules/meta/services/campaign.service.ts

async publishCampaign(templateId: string, userId: string) {
  // 1. Carregar template
  // 2. Validar conexão Meta
  // 3. Criar Campaign no Meta
  // 4. Criar AdSet
  // 5. Upload de imagens (se necessário)
  // 6. Criar AdCreative
  // 7. Criar Ad
  // 8. Atualizar template com platform_ids
  // 9. Consumir créditos
}
```

### 4.2 Progress feedback

```typescript
// Frontend: componente de progresso
// Similar a AutoPublishProgress do Google Ads
type MetaPublishStep =
  | 'validating'
  | 'creating_campaign'
  | 'creating_adset'
  | 'uploading_images'
  | 'creating_creative'
  | 'creating_ad'
  | 'done'
```

---

## Phase 5: Polish & Testing (1-2 dias)

### 5.1 Estilos CSS

```css
/* Reutilizar variáveis do design system */
/* Criar: AlvoAdsMetaPage.module.css */
/* Criar: MetaAdsWizardPage.module.css */
/* Criar: Step*.module.css para cada step */
```

### 5.2 Error handling

- Token expirado → redirect para reconexão
- Falha de publicação → mostrar mensagem clara
- Validações inline

### 5.3 Testes manuais

1. Criar campanha com Google Drive
2. Criar campanha com IA
3. Publicar com cada objetivo
4. Verificar no Meta Ads Manager

---

## File Checklist

### Frontend (criar)

- [ ] `types/campaign.ts` - Interfaces TypeScript
- [ ] `types/index.ts` - Barrel exports
- [ ] `stores/metaAdsWizardStore.ts` - Zustand store
- [ ] `api/queries.ts` - TanStack Query hooks
- [ ] `api/mutations.ts` - Mutations
- [ ] `api/index.ts` - Barrel exports
- [ ] `pages/AlvoAdsMetaPage.tsx` - Dashboard
- [ ] `pages/MetaAdsWizardPage.tsx` - Wizard
- [ ] `pages/AlvoAdsMetaPage.module.css`
- [ ] `pages/MetaAdsWizardPage.module.css`
- [ ] `components/WizardStepper.tsx` - (ou reutilizar)
- [ ] `components/StepNavigation.tsx` - (ou reutilizar)
- [ ] `components/steps/StepAccount.tsx`
- [ ] `components/steps/StepPage.tsx`
- [ ] `components/steps/StepInstagram.tsx`
- [ ] `components/steps/StepObjective.tsx`
- [ ] `components/steps/StepTargeting.tsx`
- [ ] `components/steps/StepBudget.tsx`
- [ ] `components/steps/StepCreative.tsx`
- [ ] `components/steps/StepAdCopy.tsx`
- [ ] `components/steps/StepReview.tsx`
- [ ] `components/steps/index.ts`
- [ ] `components/PublishProgress.tsx`
- [ ] `components/index.ts`
- [ ] `utils/validation.ts`
- [ ] `index.ts` - Feature barrel exports

### Backend (modificar/criar)

- [ ] `modules/meta/campaign.controller.ts` - Adicionar endpoints
- [ ] `modules/meta/services/campaign.service.ts` - Publicação
- [ ] `modules/meta/services/drive.service.ts` - Google Drive
- [ ] `modules/meta/services/targeting.service.ts` - Países/idiomas
- [ ] `modules/meta/dto/meta-campaign.dto.ts` - DTOs específicos

### Router (modificar)

- [ ] `frontend/src/app/router.tsx` - Adicionar rotas

---

## Commands

```bash
# Desenvolvimento
cd frontend && npm run dev
cd backend && npm run start:dev

# Build
cd frontend && npm run build
cd backend && npm run build

# Lint
cd frontend && npm run lint
```

---

## Estimated Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| 1. Foundation | 2-3 dias | Types, store, páginas base |
| 2. Wizard Steps | 3-4 dias | 9 steps completos |
| 3. Backend | 2-3 dias | Endpoints REST |
| 4. Publishing | 2-3 dias | Fluxo de publicação |
| 5. Polish | 1-2 dias | CSS, errors, testes |
| **Total** | **10-15 dias** | Feature completa |

---

## Success Metrics

- [ ] Usuário consegue criar campanha em < 10 minutos
- [ ] Taxa de publicação > 95%
- [ ] Wizard funciona em desktop e mobile
- [ ] Integração com Google Drive funcional
- [ ] Geração de imagens por IA funcional
