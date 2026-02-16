# Tasks: AlvoADS Google - Campanhas em Massa

**Input**: Design documents from `/specs/018-alvoads-google-bulk/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested - test tasks omitted. Add manually if needed.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Structure follows existing AlvoBot 2 architecture

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies, configure environment, database migrations

- [ ] T001 Install backend dependencies: `cd backend && npm install google-ads-api xlsx csv-parse chardet bullmq`
- [ ] T002 Install backend dev dependencies: `cd backend && npm install -D @types/chardet`
- [ ] T003 [P] Add Google Ads environment variables to `backend/.env.example`
- [ ] T004 [P] Add Redis environment variables to `backend/.env.example`
- [ ] T005 Run database migration for google_connections table in Supabase
- [ ] T006 Run database migration for bulk_operation_jobs table in Supabase
- [ ] T007 Run database migration for bulk_operation_items table in Supabase
- [ ] T008 [P] Run database migration for google_geo_targets table in Supabase
- [ ] T009 [P] Extend google_campaign_templates table with new columns in Supabase
- [ ] T010 Seed google_geo_targets with Brazilian locations data

**Checkpoint**: Dependencies installed, database ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T011 Create GoogleModule structure in `backend/src/modules/google/google.module.ts` (update existing)
- [ ] T012 [P] Create GoogleConnection entity type in `backend/src/modules/google/entities/google-connection.entity.ts`
- [ ] T013 [P] Create BulkOperationJob entity type in `backend/src/modules/google/entities/bulk-operation-job.entity.ts`
- [ ] T014 [P] Create BulkOperationItem entity type in `backend/src/modules/google/entities/bulk-operation-item.entity.ts`
- [ ] T015 Create GoogleAdsApiService base class in `backend/src/modules/google/services/google-ads-api.service.ts`
- [ ] T016 Create GoogleCreditsService (extend existing) in `backend/src/modules/google/services/google-credits.service.ts`
- [ ] T017 [P] Create BullMQ queue configuration in `backend/src/common/queues/bulk-operations.queue.ts`
- [ ] T018 [P] Update frontend GoogleConnection type in `frontend/src/features/alvoads-google/types/campaign.ts`
- [ ] T019 [P] Update frontend BulkJob types in `frontend/src/features/alvoads-google/types/campaign.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 6 - Conectar Conta Google Ads (Priority: P1) 🎯 MVP

**Goal**: Permitir que usuários conectem suas contas Google Ads via OAuth 2.0

**Independent Test**: Iniciar fluxo OAuth, autenticar com Google, verificar se conexão é salva com token válido

### Implementation for User Story 6

- [ ] T020 [P] [US6] Create InitiateOAuthDto in `backend/src/modules/google/dto/initiate-oauth.dto.ts`
- [ ] T021 [P] [US6] Create GoogleOAuthService in `backend/src/modules/google/services/google-oauth.service.ts`
- [ ] T022 [US6] Implement buildAuthorizationUrl method in GoogleOAuthService
- [ ] T023 [US6] Implement exchangeCodeForToken method in GoogleOAuthService
- [ ] T024 [US6] Implement refreshAccessToken method in GoogleOAuthService
- [ ] T025 [US6] Implement listAccessibleCustomers method in GoogleOAuthService
- [ ] T026 [US6] Create GoogleOAuthController in `backend/src/modules/google/google-oauth.controller.ts`
- [ ] T027 [US6] Implement POST /google/oauth/authorize endpoint
- [ ] T028 [US6] Implement GET /google/oauth/callback endpoint
- [ ] T029 [US6] Implement GET /google/connections endpoint
- [ ] T030 [US6] Implement DELETE /google/connections/:id endpoint
- [ ] T031 [US6] Implement POST /google/connections/:id/refresh endpoint
- [ ] T032 [US6] Implement GET /google/connections/:id/customers endpoint
- [ ] T033 [P] [US6] Create useGoogleOAuth.ts hooks in `frontend/src/features/alvoads-google/api/useGoogleOAuth.ts`
- [ ] T034 [US6] Add connection UI to AlvoAdsGooglePage in `frontend/src/features/alvoads-google/pages/AlvoAdsGooglePage.tsx`
- [ ] T035 [US6] Create GoogleConnectionCard component in `frontend/src/features/alvoads-google/components/GoogleConnectionCard.tsx`
- [ ] T036 [US6] Handle OAuth callback redirect in frontend

**Checkpoint**: Users can connect/disconnect Google Ads accounts via OAuth

---

## Phase 4: User Story 5 - Dashboard de Campanhas (Priority: P1)

**Goal**: Dashboard unificado para visualizar e gerenciar campanhas criadas em massa

**Independent Test**: Criar 10 campanhas e verificar se aparecem agrupadas no dashboard com filtros funcionais

### Implementation for User Story 5

- [ ] T037 [P] [US5] Create campaign list query hook in `frontend/src/features/alvoads-google/api/useGoogleCampaigns.ts` (enhance existing)
- [ ] T038 [P] [US5] Create CampaignFilters component in `frontend/src/features/alvoads-google/components/CampaignFilters.tsx`
- [ ] T039 [P] [US5] Create CampaignTable component in `frontend/src/features/alvoads-google/components/CampaignTable.tsx`
- [ ] T040 [P] [US5] Create CampaignStatusBadge component in `frontend/src/features/alvoads-google/components/CampaignStatusBadge.tsx`
- [ ] T041 [US5] Implement multi-select functionality in CampaignTable
- [ ] T042 [US5] Create BatchActionsToolbar component in `frontend/src/features/alvoads-google/components/BatchActionsToolbar.tsx`
- [ ] T043 [US5] Update AlvoAdsGooglePage with dashboard layout in `frontend/src/features/alvoads-google/pages/AlvoAdsGooglePage.tsx`
- [ ] T044 [P] [US5] Create bulk actions endpoints in `backend/src/modules/google/google.controller.ts`
- [ ] T045 [US5] Implement POST /google/campaigns/bulk/publish endpoint
- [ ] T046 [US5] Implement POST /google/campaigns/bulk/pause endpoint
- [ ] T047 [US5] Implement POST /google/campaigns/bulk/delete endpoint

**Checkpoint**: Dashboard displays campaigns with filters and batch actions

---

## Phase 5: User Story 1 - Criar Campanhas por Localização (Priority: P1)

**Goal**: Criar variações da mesma campanha para diferentes cidades/estados automaticamente

**Independent Test**: Criar campanha base para "Advogado" e gerar variações para 3 cidades (SP, RJ, BH)

### Implementation for User Story 1

- [ ] T048 [P] [US1] Create BulkLocationDto in `backend/src/modules/google/dto/bulk-location.dto.ts`
- [ ] T049 [P] [US1] Create LocationVariation interface in `backend/src/modules/google/interfaces/location-variation.interface.ts`
- [ ] T050 [US1] Create BulkLocationService in `backend/src/modules/google/services/bulk-location.service.ts`
- [ ] T051 [US1] Implement generateLocationVariations method in BulkLocationService
- [ ] T052 [US1] Implement template interpolation ({{cidade}}, {{estado}}) in BulkLocationService
- [ ] T053 [US1] Implement applyLocationToKeywords method in BulkLocationService
- [ ] T054 [US1] Implement applyLocationToAds method in BulkLocationService
- [ ] T055 [US1] Create BulkLocationController endpoints in `backend/src/modules/google/bulk-location.controller.ts`
- [ ] T056 [US1] Implement POST /google/campaigns/bulk/location endpoint
- [ ] T057 [US1] Implement POST /google/campaigns/bulk/location/preview endpoint
- [ ] T058 [P] [US1] Create useBulkLocation.ts hooks in `frontend/src/features/alvoads-google/api/useBulkLocation.ts`
- [ ] T059 [P] [US1] Create BulkLocationForm component in `frontend/src/features/alvoads-google/components/BulkLocationForm.tsx`
- [ ] T060 [P] [US1] Create LocationSelector component in `frontend/src/features/alvoads-google/components/LocationSelector.tsx`
- [ ] T061 [P] [US1] Create VariationPreview component in `frontend/src/features/alvoads-google/components/VariationPreview.tsx`
- [ ] T062 [US1] Implement BulkLocationPage in `frontend/src/features/alvoads-google/pages/BulkLocationPage.tsx`
- [ ] T063 [US1] Add location search with google_geo_targets lookup
- [ ] T064 [US1] Create BulkProgressTracker component in `frontend/src/features/alvoads-google/components/BulkProgressTracker.tsx`

**Checkpoint**: Users can create multiple campaigns by location with template interpolation

---

## Phase 6: User Story 2 - Criar Campanhas por Produto (Priority: P1)

**Goal**: Criar campanhas para múltiplos produtos com keywords e anúncios gerados por IA

**Independent Test**: Adicionar 3 produtos e verificar se gera campanhas com keywords específicas

### Implementation for User Story 2

- [ ] T065 [P] [US2] Create BulkProductDto in `backend/src/modules/google/dto/bulk-product.dto.ts`
- [ ] T066 [P] [US2] Create ProductContent interface in `backend/src/modules/google/interfaces/product-content.interface.ts`
- [ ] T067 [US2] Create BulkProductService in `backend/src/modules/google/services/bulk-product.service.ts`
- [ ] T068 [US2] Implement generateProductKeywords method using GoogleAiService
- [ ] T069 [US2] Implement generateProductHeadlines method using GoogleAiService
- [ ] T070 [US2] Implement generateProductDescriptions method using GoogleAiService
- [ ] T071 [US2] Implement createCampaignsFromProducts method in BulkProductService
- [ ] T072 [US2] Create BulkProductController endpoints in `backend/src/modules/google/bulk-product.controller.ts`
- [ ] T073 [US2] Implement POST /google/campaigns/bulk/product endpoint
- [ ] T074 [US2] Implement POST /google/campaigns/bulk/product/generate-content endpoint
- [ ] T075 [P] [US2] Create useBulkProduct.ts hooks in `frontend/src/features/alvoads-google/api/useBulkProduct.ts`
- [ ] T076 [P] [US2] Create BulkProductForm component in `frontend/src/features/alvoads-google/components/BulkProductForm.tsx`
- [ ] T077 [P] [US2] Create ProductInput component in `frontend/src/features/alvoads-google/components/ProductInput.tsx`
- [ ] T078 [P] [US2] Create AISettingsPanel component in `frontend/src/features/alvoads-google/components/AISettingsPanel.tsx`
- [ ] T079 [US2] Implement BulkProductPage in `frontend/src/features/alvoads-google/pages/BulkProductPage.tsx`
- [ ] T080 [US2] Add generated content preview and editing

**Checkpoint**: Users can create campaigns for multiple products with AI-generated content

---

## Phase 7: User Story 7 - Geração de Keywords com IA (Priority: P2)

**Goal**: IA sugere keywords relevantes para negócio do usuário

**Independent Test**: Fornecer "Advogado trabalhista em São Paulo" e verificar se gera keywords variadas

### Implementation for User Story 7

- [ ] T081 [US7] Enhance GoogleAiService in `backend/src/modules/google/services/google-ai.service.ts`
- [ ] T082 [US7] Implement generateKeywordsWithMatchTypes method
- [ ] T083 [US7] Add location context to keyword generation
- [ ] T084 [US7] Implement keyword relevance scoring
- [ ] T085 [US7] Create POST /google/campaigns/ai/keywords endpoint (enhance existing)
- [ ] T086 [P] [US7] Create KeywordGenerator component in `frontend/src/features/alvoads-google/components/KeywordGenerator.tsx`
- [ ] T087 [US7] Add keyword generation to StepKeywords wizard step

**Checkpoint**: Users can generate keywords with AI including match types and location context

---

## Phase 8: User Story 8 - Geração de Anúncios com IA (Priority: P2)

**Goal**: IA gera headlines e descriptions otimizados para Google Ads

**Independent Test**: Fornecer dados de produto e verificar se gera 15 headlines (≤30 chars) e 4 descriptions (≤90 chars)

### Implementation for User Story 8

- [ ] T088 [US8] Implement generateHeadlinesWithValidation method in GoogleAiService
- [ ] T089 [US8] Implement generateDescriptionsWithValidation method in GoogleAiService
- [ ] T090 [US8] Add character limit enforcement and auto-truncation
- [ ] T091 [US8] Create POST /google/campaigns/ai/ad-copy endpoint (enhance existing)
- [ ] T092 [P] [US8] Create AdCopyGenerator component in `frontend/src/features/alvoads-google/components/AdCopyGenerator.tsx`
- [ ] T093 [P] [US8] Create CharacterCounter component in `frontend/src/features/alvoads-google/components/CharacterCounter.tsx`
- [ ] T094 [US8] Add ad copy generation to StepSearchAds wizard step
- [ ] T095 [US8] Add visual validation (green/red) for character limits

**Checkpoint**: Users can generate ad copy with AI respecting Google Ads character limits

---

## Phase 9: User Story 3 - Importar via Planilha (Priority: P2)

**Goal**: Importar campanhas em massa via CSV/Excel

**Independent Test**: Upload CSV com 5 linhas e verificar se cria 5 templates de campanha

### Implementation for User Story 3

- [ ] T096 [P] [US3] Create SpreadsheetImportDto in `backend/src/modules/google/dto/spreadsheet-import.dto.ts`
- [ ] T097 [US3] Create SpreadsheetParserService in `backend/src/modules/google/services/spreadsheet-parser.service.ts`
- [ ] T098 [US3] Implement parseCSV method with encoding detection
- [ ] T099 [US3] Implement parseExcel method
- [ ] T100 [US3] Implement autoDetectColumnMapping method
- [ ] T101 [US3] Implement validateRows method with error reporting
- [ ] T102 [US3] Implement generateTemplate method for download
- [ ] T103 [US3] Create SpreadsheetController in `backend/src/modules/google/spreadsheet.controller.ts`
- [ ] T104 [US3] Implement POST /google/campaigns/bulk/spreadsheet/upload endpoint
- [ ] T105 [US3] Implement POST /google/campaigns/bulk/spreadsheet/import endpoint
- [ ] T106 [US3] Implement GET /google/campaigns/bulk/spreadsheet/template endpoint
- [ ] T107 [P] [US3] Create useSpreadsheetImport.ts hooks in `frontend/src/features/alvoads-google/api/useSpreadsheetImport.ts`
- [ ] T108 [P] [US3] Create SpreadsheetUploader component in `frontend/src/features/alvoads-google/components/SpreadsheetUploader.tsx`
- [ ] T109 [P] [US3] Create ColumnMapper component in `frontend/src/features/alvoads-google/components/ColumnMapper.tsx`
- [ ] T110 [P] [US3] Create ValidationReport component in `frontend/src/features/alvoads-google/components/ValidationReport.tsx`
- [ ] T111 [US3] Implement SpreadsheetImportPage in `frontend/src/features/alvoads-google/pages/SpreadsheetImportPage.tsx`
- [ ] T112 [US3] Add template download button

**Checkpoint**: Users can import campaigns from CSV/Excel with validation and error reporting

---

## Phase 10: User Story 4 - Duplicar Campanhas (Priority: P2)

**Goal**: Duplicar campanhas existentes com modificações em lote

**Independent Test**: Selecionar campanha e criar 3 cópias com sufixo " - Teste A/B"

### Implementation for User Story 4

- [ ] T113 [P] [US4] Create DuplicateDto in `backend/src/modules/google/dto/duplicate.dto.ts`
- [ ] T114 [US4] Create DuplicateService in `backend/src/modules/google/services/duplicate.service.ts`
- [ ] T115 [US4] Implement duplicateTemplate method
- [ ] T116 [US4] Implement applyBudgetModification method
- [ ] T117 [US4] Implement applySuffixTemplate method
- [ ] T118 [US4] Create POST /google/campaigns/bulk/duplicate endpoint
- [ ] T119 [P] [US4] Create useDuplicate.ts hooks in `frontend/src/features/alvoads-google/api/useDuplicate.ts`
- [ ] T120 [P] [US4] Create DuplicateForm component in `frontend/src/features/alvoads-google/components/DuplicateForm.tsx`
- [ ] T121 [US4] Implement DuplicateCampaignPage in `frontend/src/features/alvoads-google/pages/DuplicateCampaignPage.tsx`

**Checkpoint**: Users can duplicate campaigns with variations (suffix, budget adjustments)

---

## Phase 11: Single Campaign Publishing (Priority: P1)

**Goal**: Publicar campanhas individuais no Google Ads via API

**Independent Test**: Criar template e publicar no Google Ads (dry-run first)

### Implementation

- [ ] T122 Implement createCampaign method in GoogleAdsApiService
- [ ] T123 Implement createCampaignBudget method in GoogleAdsApiService
- [ ] T124 Implement createAdGroup method in GoogleAdsApiService
- [ ] T125 Implement addKeywords method in GoogleAdsApiService
- [ ] T126 Implement createResponsiveSearchAd method in GoogleAdsApiService
- [ ] T127 Implement addLocationTargeting method in GoogleAdsApiService
- [ ] T128 Enhance GoogleCampaignService.publishCampaign with real API calls
- [ ] T129 Implement dry-run validation mode
- [ ] T130 Add error handling and rollback for partial failures
- [ ] T131 Update template status after publish (published, failed)
- [ ] T132 Store Google Ads IDs (campaign_id, ad_group_id, ad_id) in template

**Checkpoint**: Individual campaigns can be published to Google Ads

---

## Phase 12: Bulk Operations Job Queue

**Goal**: Processamento assíncrono de operações em massa com progress tracking

**Independent Test**: Criar job de 10 campanhas e monitorar progresso via SSE

### Implementation

- [ ] T133 Create BulkOperationsProcessor in `backend/src/common/queues/bulk-operations.processor.ts`
- [ ] T134 Implement processJob method with batch processing
- [ ] T135 Implement updateJobProgress method
- [ ] T136 Implement logFailedItem method
- [ ] T137 Implement retryFailedItems method
- [ ] T138 Create jobs controller endpoints in `backend/src/modules/google/jobs.controller.ts`
- [ ] T139 Implement GET /google/campaigns/bulk/jobs endpoint
- [ ] T140 Implement GET /google/campaigns/bulk/jobs/:id endpoint
- [ ] T141 Implement DELETE /google/campaigns/bulk/jobs/:id (cancel) endpoint
- [ ] T142 Implement GET /google/campaigns/bulk/jobs/:id/progress SSE endpoint
- [ ] T143 Implement POST /google/campaigns/bulk/jobs/:id/retry-failed endpoint
- [ ] T144 [P] Create useJobProgress.ts hooks with EventSource in `frontend/src/features/alvoads-google/api/useJobProgress.ts`
- [ ] T145 Enhance BulkProgressTracker with real-time updates

**Checkpoint**: Bulk operations run asynchronously with real-time progress tracking

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T146 [P] Add loading states to all bulk operation pages
- [ ] T147 [P] Add error boundaries and user-friendly error messages
- [ ] T148 [P] Add empty states for campaign list
- [ ] T149 Implement credit cost calculation for all bulk operations
- [ ] T150 Add credit balance check before starting bulk operations
- [ ] T151 [P] Add tooltips and help text throughout UI
- [ ] T152 [P] Update activity_logs for all bulk operations
- [ ] T153 Add rate limiting handling with exponential backoff
- [ ] T154 Implement connection health check (token validity)
- [ ] T155 Run quickstart.md validation scenarios
- [ ] T156 [P] Code cleanup and remove console.logs
- [ ] T157 [P] Update CLAUDE.md with Google Ads module documentation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-10)**: All depend on Foundational phase completion
- **Publishing (Phase 11)**: Depends on US6 (OAuth connection)
- **Job Queue (Phase 12)**: Depends on at least one bulk operation story
- **Polish (Phase 13)**: Depends on all desired user stories being complete

### User Story Dependencies

```
US6 (OAuth) ─────────────────────────────┐
                                         │
US5 (Dashboard) ─────────────────────────┼──► US1 (Location) ──┐
                                         │                     │
                                         ├──► US2 (Product) ───┼──► Publishing ──► Job Queue ──► Polish
                                         │                     │
US7 (Keywords AI) ───────────────────────┤                     │
                                         │                     │
US8 (Ads AI) ────────────────────────────┤                     │
                                         │                     │
                                         ├──► US3 (Spreadsheet)┤
                                         │                     │
                                         └──► US4 (Duplicate) ─┘
```

### Critical Path (MVP)

1. **Phase 1**: Setup (~30 min)
2. **Phase 2**: Foundational (~2h)
3. **Phase 3**: US6 - OAuth (~3h) - **REQUIRED FIRST**
4. **Phase 4**: US5 - Dashboard (~2h)
5. **Phase 5**: US1 - Location (~4h) - **Core Feature**
6. **Phase 11**: Publishing (~4h)
7. **Phase 12**: Job Queue (~3h)

**MVP Total**: ~18h estimated

### Parallel Opportunities

After Foundational (Phase 2) completes:

```bash
# Team of 3 developers:
Developer A: US6 (OAuth) → US5 (Dashboard) → US1 (Location)
Developer B: US7 (Keywords AI) → US8 (Ads AI) → US2 (Product)
Developer C: US3 (Spreadsheet) → US4 (Duplicate)
```

---

## Summary

| Phase | User Story | Tasks | Parallel | Priority |
|-------|------------|-------|----------|----------|
| 1 | Setup | 10 | 4 | - |
| 2 | Foundational | 9 | 5 | - |
| 3 | US6: OAuth | 17 | 2 | P1 |
| 4 | US5: Dashboard | 11 | 5 | P1 |
| 5 | US1: Location | 17 | 6 | P1 |
| 6 | US2: Product | 16 | 5 | P1 |
| 7 | US7: Keywords AI | 7 | 1 | P2 |
| 8 | US8: Ads AI | 8 | 2 | P2 |
| 9 | US3: Spreadsheet | 17 | 5 | P2 |
| 10 | US4: Duplicate | 9 | 3 | P2 |
| 11 | Publishing | 11 | 0 | P1 |
| 12 | Job Queue | 13 | 1 | P1 |
| 13 | Polish | 12 | 7 | - |
| **Total** | | **157** | **46** | |

### MVP Scope (Recommended)

For fastest time-to-value, implement in this order:

1. ✅ Setup + Foundational (19 tasks)
2. ✅ US6: OAuth Connection (17 tasks)
3. ✅ US5: Dashboard (11 tasks)
4. ✅ US1: Location Bulk (17 tasks)
5. ✅ Publishing (11 tasks)
6. ✅ Job Queue (13 tasks)

**MVP Total: 88 tasks** - Delivers core bulk location feature with real Google Ads publishing
