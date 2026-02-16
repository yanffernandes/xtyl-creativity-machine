# Implementation Plan: AlvoADS Google - Campanhas em Massa

**Branch**: `018-alvoads-google-bulk` | **Date**: 2025-12-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/018-alvoads-google-bulk/spec.md`

## Summary

Implementar sistema completo de criação de campanhas Google Ads em massa, incluindo:
- Integração OAuth 2.0 com Google Ads API
- Quatro modos de criação em massa (localização, produto, planilha, duplicação)
- Geração de keywords e copy por IA (GPT-4o-mini)
- Dashboard unificado com ações em lote
- Sistema de créditos integrado

A infraestrutura frontend/backend já existe (~90% pronta). O foco é implementar a integração real com Google Ads API e a lógica de operações em massa.

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend + Backend)
**Primary Dependencies**:
- Frontend: React 18.2+, TanStack Query v5, Zustand, React Hook Form + Zod
- Backend: NestJS 10.x, google-ads-api (npm), OpenAI, Passport JWT
**Storage**: Supabase PostgreSQL + Row Level Security
**Testing**: Vitest (frontend), Jest (backend)
**Target Platform**: Web (Desktop + Mobile responsive)
**Project Type**: Web application (frontend + backend)
**Performance Goals**:
- Criação de 50 campanhas em <30s
- Dashboard carrega 100 campanhas em <2s
- Publicação em massa com progresso em tempo real
**Constraints**:
- Google Ads API rate limits (15,000 operations/day standard)
- Refresh tokens expiram em 6 meses se não usados
- Limites de caracteres: headlines 30, descriptions 90
**Scale/Scope**:
- Até 50 campanhas por operação em massa
- Suporte a múltiplas contas Google Ads (MCC)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

O projeto AlvoBot não possui constitution.md configurado com regras específicas. Aplicando princípios gerais do CLAUDE.md:

| Princípio | Status | Verificação |
|-----------|--------|-------------|
| Security First | PASS | OAuth tokens armazenados com RLS, secrets no backend apenas |
| BaaS Architecture | PASS | Frontend direto ao Supabase, backend para Google API |
| Design System | PASS | Usa CSS variables existentes, componentes shared |
| Feature Module Pattern | PASS | Segue estrutura features/alvoads-google/ |

## Project Structure

### Documentation (this feature)

```text
specs/018-alvoads-google-bulk/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output - Google Ads API research
├── data-model.md        # Phase 1 output - Database schema
├── quickstart.md        # Phase 1 output - Setup guide
├── contracts/           # Phase 1 output - API contracts
│   ├── google-oauth.yaml
│   ├── bulk-campaigns.yaml
│   └── ai-generation.yaml
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
# Web application structure (existing)

backend/
├── src/
│   ├── modules/
│   │   └── google/                    # EXISTING - needs enhancement
│   │       ├── google.module.ts
│   │       ├── google.controller.ts   # Campaign endpoints
│   │       ├── google-oauth.controller.ts  # NEW - OAuth flow
│   │       ├── dto/
│   │       │   ├── save-google-template.dto.ts
│   │       │   ├── bulk-location.dto.ts      # NEW
│   │       │   ├── bulk-product.dto.ts       # NEW
│   │       │   └── spreadsheet-import.dto.ts # NEW
│   │       └── services/
│   │           ├── google-campaign.service.ts
│   │           ├── google-oauth.service.ts   # NEW - OAuth logic
│   │           ├── google-ads-api.service.ts # NEW - API client
│   │           ├── google-ai.service.ts      # EXISTING
│   │           ├── google-credits.service.ts # EXISTING
│   │           ├── bulk-location.service.ts  # NEW
│   │           ├── bulk-product.service.ts   # NEW
│   │           └── spreadsheet-parser.service.ts # NEW
│   └── common/
│       └── queues/                    # NEW - for async bulk ops
│           └── bulk-operations.processor.ts
└── tests/
    └── google/
        ├── google-oauth.e2e-spec.ts
        └── bulk-operations.e2e-spec.ts

frontend/
├── src/
│   └── features/
│       └── alvoads-google/            # EXISTING - needs enhancement
│           ├── api/
│           │   ├── useGoogleCampaigns.ts      # EXISTING
│           │   ├── useGoogleOAuth.ts          # NEW
│           │   └── useBulkOperations.ts       # NEW
│           ├── components/
│           │   ├── WizardStepper.tsx          # EXISTING
│           │   ├── CreationModeSelector.tsx   # EXISTING
│           │   ├── BulkLocationForm.tsx       # NEW
│           │   ├── BulkProductForm.tsx        # NEW
│           │   ├── SpreadsheetUploader.tsx    # NEW
│           │   ├── BulkProgressTracker.tsx    # NEW
│           │   └── steps/                     # EXISTING
│           ├── pages/
│           │   ├── AlvoAdsGooglePage.tsx      # EXISTING - enhance
│           │   ├── GoogleAdsWizardPage.tsx    # EXISTING
│           │   ├── BulkLocationPage.tsx       # EXISTING - implement
│           │   ├── BulkProductPage.tsx        # EXISTING - implement
│           │   ├── SpreadsheetImportPage.tsx  # EXISTING - implement
│           │   └── DuplicateCampaignPage.tsx  # EXISTING - implement
│           ├── stores/
│           │   ├── googleAdsWizardStore.ts    # EXISTING
│           │   └── bulkOperationsStore.ts     # NEW
│           └── types/
│               └── campaign.ts                # EXISTING - extend
└── tests/
    └── alvoads-google/
```

**Structure Decision**: Aproveitar estrutura existente em `frontend/src/features/alvoads-google/` e `backend/src/modules/google/`. Novos arquivos focados em OAuth, operações em massa, e parser de planilha.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Job Queue (Bull) | Operações em massa com 50+ campanhas precisam processamento async | Sync processing timeout em operações longas |
| Google Ads API Client | Necessário para publicação real de campanhas | Mock/stub não atende requisitos de produção |

---

## Phase 0: Research Items

Os seguintes itens precisam de pesquisa antes da implementação:

### R1: Google Ads API Authentication
- Como implementar OAuth 2.0 flow completo com Google Ads
- Escopos necessários para criar/gerenciar campanhas
- Handling de refresh tokens e re-autenticação
- Suporte a contas MCC (Manager Account)

### R2: Google Ads API Campaign Creation
- Estrutura da API para criar Campaign, AdGroup, Keywords, Ads
- Limites de rate limiting e quotas
- Mapeamento de campos internos para API format
- Handling de erros e rollback parcial

### R3: Bulk Operations Best Practices
- Batch API do Google Ads (mutate operations)
- Estratégias para processamento de 50+ campanhas
- Retry logic e idempotência
- Progress tracking e notification

### R4: Spreadsheet Parsing
- Libraries para parse de CSV e Excel em Node.js
- Detecção automática de encoding
- Validação de dados em massa
- Mapeamento flexível de colunas

---

## Phase 1: Design Artifacts

### 1.1 Data Model
Ver `data-model.md` para schema completo de:
- `google_connections` - OAuth tokens
- `google_campaign_templates` - Templates de campanha (existente, estender)
- `bulk_operation_jobs` - Jobs de operações em massa
- `bulk_operation_items` - Items individuais de cada job

### 1.2 API Contracts
Ver `contracts/` para:
- `google-oauth.yaml` - Endpoints de OAuth
- `bulk-campaigns.yaml` - Endpoints de criação em massa
- `ai-generation.yaml` - Endpoints de geração com IA

### 1.3 Quickstart
Ver `quickstart.md` para:
- Setup de Google Ads API credentials
- Configuração de environment variables
- Primeiro fluxo de conexão OAuth
- Criação de campanha de teste

---

## Implementation Phases Overview

### Phase A: Google OAuth Integration (P1)
1. Backend: GoogleOAuthService com flow completo
2. Frontend: Fluxo de conexão e listagem de contas
3. Database: Tabela google_connections
4. Testes: OAuth flow e2e

### Phase B: Single Campaign Publishing (P1)
1. Backend: GoogleAdsApiService com publicação real
2. Frontend: Botão "Publicar" no wizard
3. Mapeamento de dados internos → Google Ads API
4. Testes: Publicação de campanha unitária

### Phase C: Bulk Location Creation (P1)
1. Backend: BulkLocationService
2. Frontend: BulkLocationPage implementation
3. Template interpolation ({{cidade}}, {{estado}})
4. Progress tracking

### Phase D: Bulk Product Creation (P1)
1. Backend: BulkProductService com IA
2. Frontend: BulkProductPage implementation
3. Geração de keywords/copy em lote
4. Credit consumption tracking

### Phase E: Spreadsheet Import (P2)
1. Backend: SpreadsheetParserService
2. Frontend: SpreadsheetImportPage implementation
3. Validação e error reporting
4. Template de planilha para download

### Phase F: Duplication (P2)
1. Backend: Duplicação com variações
2. Frontend: DuplicateCampaignPage implementation
3. Ajustes em lote (orçamento, nomes)

### Phase G: Dashboard & Batch Actions (P1)
1. Frontend: Enhance AlvoAdsGooglePage
2. Filtros, seleção múltipla, ações em lote
3. Métricas sync do Google Ads (básico)
4. Status em tempo real

---

## Dependencies & Prerequisites

### External
- [ ] Google Cloud Project com Google Ads API habilitada
- [ ] Developer Token (aplicar via Google Ads)
- [ ] OAuth 2.0 Client ID e Secret
- [ ] Conta Google Ads para testes (sandbox não disponível para Google Ads)

### Internal
- [x] Supabase configurado com RLS
- [x] Sistema de créditos implementado
- [x] OpenAI API key configurada
- [x] Frontend pages e components estruturados
- [x] Backend module e services estruturados

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Google Ads API approval delay | High | Iniciar processo de Developer Token antecipadamente |
| Rate limiting em operações em massa | Medium | Implementar batch API e throttling |
| Token refresh failures | Medium | Monitoramento proativo, alertas, re-auth UX |
| Custos de API em desenvolvimento | Low | Usar conta de testes com orçamento limitado |
