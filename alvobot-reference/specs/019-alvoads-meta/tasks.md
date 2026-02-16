# Tasks: AlvoADS Meta

**Input**: Design documents from `/specs/019-alvoads-meta/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.yaml ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `frontend/src/features/alvoads-meta/`
- **Backend**: `backend/src/modules/meta/`
- **Shared Types**: `frontend/src/features/alvoads-meta/types/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 [P] Create feature directory structure: `frontend/src/features/alvoads-meta/{api,components,pages,stores,types,utils}`
- [ ] T002 [P] Create steps directory: `frontend/src/features/alvoads-meta/components/steps/`
- [ ] T003 [P] Create barrel exports: `frontend/src/features/alvoads-meta/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Types & Interfaces

- [ ] T004 [P] Define `MetaObjective` type and `META_OBJECTIVES` constant in `frontend/src/features/alvoads-meta/types/campaign.ts`
- [ ] T005 [P] Define `MetaWizardStep` type and `META_WIZARD_STEPS` array in `frontend/src/features/alvoads-meta/types/campaign.ts`
- [ ] T006 [P] Define `MetaAdAccount` interface in `frontend/src/features/alvoads-meta/types/campaign.ts`
- [ ] T007 [P] Define `MetaPage` interface in `frontend/src/features/alvoads-meta/types/campaign.ts`
- [ ] T008 [P] Define `MetaInstagramAccount` interface in `frontend/src/features/alvoads-meta/types/campaign.ts`
- [ ] T009 [P] Define `MetaTargeting` interface in `frontend/src/features/alvoads-meta/types/campaign.ts`
- [ ] T010 [P] Define `MetaBudget` interface in `frontend/src/features/alvoads-meta/types/campaign.ts`
- [ ] T011 [P] Define `MetaCreative` and `MetaCreativeImage` interfaces in `frontend/src/features/alvoads-meta/types/campaign.ts`
- [ ] T012 [P] Define `MetaAdCopy` interface with `MetaCTA` type in `frontend/src/features/alvoads-meta/types/campaign.ts`
- [ ] T013 [P] Define `MetaCampaignTemplate` and `MetaCampaignData` interfaces in `frontend/src/features/alvoads-meta/types/campaign.ts`
- [ ] T014 [P] Define `MetaMessengerConfig` interface in `frontend/src/features/alvoads-meta/types/campaign.ts`
- [ ] T015 Create barrel export `frontend/src/features/alvoads-meta/types/index.ts`

### Zustand Store

- [ ] T016 Create `metaAdsWizardStore` with state interface in `frontend/src/features/alvoads-meta/stores/metaAdsWizardStore.ts`
- [ ] T017 Implement store actions: `setCurrentStep`, `setCompletedStep`, `goToStep` in `metaAdsWizardStore.ts`
- [ ] T018 Implement store actions: `setAccounts`, `setPages`, `setInstagramAccount` in `metaAdsWizardStore.ts`
- [ ] T019 Implement store actions: `setObjective`, `setTargeting`, `setBudget` in `metaAdsWizardStore.ts`
- [ ] T020 Implement store actions: `setCreativeMode`, `setDriveImages`, `setAiImages` in `metaAdsWizardStore.ts`
- [ ] T021 Implement store actions: `setAdCopy`, `resetStore` in `metaAdsWizardStore.ts`

### Validation Utils

- [ ] T022 Create validation constants `META_AD_LIMITS` and `META_TARGETING_RULES` in `frontend/src/features/alvoads-meta/utils/validation.ts`
- [ ] T023 Create validation functions `validateTargeting`, `validateAdCopy`, `validateBudget` in `frontend/src/features/alvoads-meta/utils/validation.ts`

### API Layer (Basic Queries)

- [ ] T024 [P] Create `useMetaAdAccounts` query hook in `frontend/src/features/alvoads-meta/api/queries.ts`
- [ ] T025 [P] Create `useMetaPages` query hook in `frontend/src/features/alvoads-meta/api/queries.ts`
- [ ] T026 [P] Create `useMetaInstagramAccounts` query hook in `frontend/src/features/alvoads-meta/api/queries.ts`
- [ ] T027 [P] Create `useMetaPixels` query hook in `frontend/src/features/alvoads-meta/api/queries.ts`
- [ ] T028 [P] Create `useMetaCountries` query hook in `frontend/src/features/alvoads-meta/api/queries.ts`
- [ ] T029 [P] Create `useMetaLanguages` query hook in `frontend/src/features/alvoads-meta/api/queries.ts`
- [ ] T030 Create barrel export `frontend/src/features/alvoads-meta/api/index.ts`

### Backend Data Endpoints

- [ ] T031 [P] Create `MetaCampaignDto` classes in `backend/src/modules/meta/dto/meta-campaign.dto.ts`
- [ ] T032 [P] Add `getAdAccounts` endpoint to `backend/src/modules/meta/campaign.controller.ts`: `GET /meta/campaigns/accounts/:connectionId`
- [ ] T033 [P] Add `getPages` endpoint to `backend/src/modules/meta/campaign.controller.ts`: `GET /meta/campaigns/pages/:connectionId`
- [ ] T034 [P] Add `getInstagramAccount` endpoint to `backend/src/modules/meta/campaign.controller.ts`: `GET /meta/campaigns/instagram/:pageId`
- [ ] T035 [P] Add `getPixels` endpoint to `backend/src/modules/meta/campaign.controller.ts`: `GET /meta/campaigns/pixels/:adAccountId`
- [ ] T036 Create `targeting.service.ts` in `backend/src/modules/meta/services/` with Meta API geo/locale search

### Routes

- [ ] T037 Add `/alvoads-meta` route to `frontend/src/app/router.tsx` pointing to `AlvoAdsMetaPage`
- [ ] T038 Add `/alvoads-meta/wizard` route to `frontend/src/app/router.tsx` pointing to `MetaAdsWizardPage`
- [ ] T039 Add `/alvoads-meta/wizard/:templateId` route for editing existing templates

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 4 - Selecionar Conta e Página do Facebook (Priority: P1) 🎯 MVP

**Goal**: Usuário pode selecionar contas de anúncios e páginas do Facebook para suas campanhas

**Independent Test**: Com conexão Meta válida, listar e selecionar contas de anúncios e páginas disponíveis

### Implementation

- [ ] T040 [P] [US4] Create `StepAccount.tsx` component in `frontend/src/features/alvoads-meta/components/steps/`
- [ ] T041 [P] [US4] Create `StepAccount.module.css` styles
- [ ] T042 [US4] Implement multi-select logic for ad accounts in `StepAccount.tsx`
- [ ] T043 [P] [US4] Create `StepPage.tsx` component in `frontend/src/features/alvoads-meta/components/steps/`
- [ ] T044 [P] [US4] Create `StepPage.module.css` styles
- [ ] T045 [US4] Implement multi-select logic for pages in `StepPage.tsx`
- [ ] T046 [US4] Add validation for account+page combination
- [ ] T047 [US4] Integrate StepAccount and StepPage with store

**Checkpoint**: User Story 4 complete - users can select accounts and pages

---

## Phase 4: User Story 9 - Selecionar Objetivo da Campanha (Priority: P1)

**Goal**: Usuário pode escolher entre 4 objetivos: Cliques, Conversas, Conversões, Vendas

**Independent Test**: Selecionar cada objetivo e verificar se etapas seguintes são adaptadas

### Implementation

- [ ] T048 [P] [US9] Create `StepObjective.tsx` component with 4 objective cards in `frontend/src/features/alvoads-meta/components/steps/`
- [ ] T049 [P] [US9] Create `StepObjective.module.css` with card grid layout
- [ ] T050 [US9] Implement objective selection with store integration
- [ ] T051 [US9] Add Pixel validation for LEADS/SALES objectives
- [ ] T052 [US9] Show warning when Pixel not configured for conversion objectives

**Checkpoint**: User Story 9 complete - users can select campaign objectives

---

## Phase 5: User Story 3 - Configurar Segmentação de Público (Priority: P1)

**Goal**: Usuário pode definir idade, gênero, país e idioma do público-alvo

**Independent Test**: Configurar segmentação e verificar se valores são aplicados na campanha

### Backend

- [ ] T053 [P] [US3] Add `GET /meta/targeting/countries` endpoint in `targeting.service.ts`
- [ ] T054 [P] [US3] Add `GET /meta/targeting/languages` endpoint in `targeting.service.ts`

### Frontend

- [ ] T055 [P] [US3] Create `StepTargeting.tsx` component in `frontend/src/features/alvoads-meta/components/steps/`
- [ ] T056 [P] [US3] Create `StepTargeting.module.css` styles
- [ ] T057 [US3] Implement age range selector (18-65) with validation
- [ ] T058 [US3] Implement gender selector (Todos, Homens, Mulheres)
- [ ] T059 [US3] Implement country search/select with Meta API data
- [ ] T060 [US3] Implement language search/select with Meta API data
- [ ] T061 [US3] Add targeting validation before step advance

**Checkpoint**: User Story 3 complete - users can configure audience targeting

---

## Phase 6: User Story 8 - Configurar Orçamento e Lances (Priority: P1)

**Goal**: Usuário pode definir orçamento diário e custo por resultado

**Independent Test**: Configurar R$50/dia e R$5/resultado, verificar aplicação na campanha

### Implementation

- [ ] T062 [P] [US8] Create `StepBudget.tsx` component in `frontend/src/features/alvoads-meta/components/steps/`
- [ ] T063 [P] [US8] Create `StepBudget.module.css` styles
- [ ] T064 [US8] Implement daily budget input with R$6 minimum validation
- [ ] T065 [US8] Implement cost per result input (optional)
- [ ] T066 [US8] Implement bid strategy selector (LOWEST_COST, COST_CAP)
- [ ] T067 [US8] Add currency formatting (BRL)
- [ ] T068 [US8] Integrate with store and validate before advance

**Checkpoint**: User Story 8 complete - users can configure budget

---

## Phase 7: User Story 1 - Criar Campanha com Imagens do Google Drive (Priority: P1)

**Goal**: Usuário pode usar imagens de pasta pública do Google Drive como criativos

**Independent Test**: Colar URL do Drive, listar imagens, selecionar e usar na campanha

### Backend

- [ ] T069 [US1] Create `drive.service.ts` in `backend/src/modules/meta/services/`
- [ ] T070 [US1] Implement `parseDriveFolderUrl` function to extract folder ID
- [ ] T071 [US1] Implement `listPublicFolderFiles` function using Google Drive API
- [ ] T072 [US1] Add `GET /meta/campaigns/drive-files` endpoint in `campaign.controller.ts`
- [ ] T073 [US1] Add validation for supported formats (JPG, PNG)

### Frontend

- [ ] T074 [P] [US1] Create `StepCreative.tsx` component with tabs (Drive | IA) in `frontend/src/features/alvoads-meta/components/steps/`
- [ ] T075 [P] [US1] Create `StepCreative.module.css` styles
- [ ] T076 [US1] Create `useDriveFiles` query hook in `api/queries.ts`
- [ ] T077 [US1] Implement Drive folder URL input with validation
- [ ] T078 [US1] Implement image grid with thumbnails and selection
- [ ] T079 [US1] Add multi-select for images with preview
- [ ] T080 [US1] Handle private folder error with clear message
- [ ] T081 [US1] Integrate selected images with store

**Checkpoint**: User Story 1 complete - users can use Google Drive images

---

## Phase 8: User Story 2 - Criar Campanha com Imagens Geradas por IA (Priority: P1)

**Goal**: Usuário pode gerar imagens profissionais usando IA (DALL-E 3)

**Independent Test**: Descrever "Mulher sorrindo com smartphone", gerar, aprovar e usar na campanha

### Backend

- [ ] T082 [P] [US2] Add `POST /meta/campaigns/ai/image` endpoint using existing `AiCreativeService`
- [ ] T083 [US2] Implement retry logic for AI generation failures

### Frontend

- [ ] T084 [P] [US2] Create AI generation tab in `StepCreative.tsx`
- [ ] T085 [US2] Implement prompt input with character limit
- [ ] T086 [US2] Create `useGenerateAiImage` mutation in `api/mutations.ts`
- [ ] T087 [US2] Implement image preview with loading state
- [ ] T088 [US2] Implement approve/reject/regenerate flow
- [ ] T089 [US2] Add warning about AI not writing text in images
- [ ] T090 [US2] Store approved images in wizard state

**Checkpoint**: User Story 2 complete - users can generate AI images

---

## Phase 9: User Story 5 - Configurar Textos do Anúncio (Priority: P1)

**Goal**: Usuário pode definir texto principal, título, descrição e CTA

**Independent Test**: Preencher textos, verificar limites de caracteres e validação

### Implementation

- [ ] T091 [P] [US5] Create `StepAdCopy.tsx` component in `frontend/src/features/alvoads-meta/components/steps/`
- [ ] T092 [P] [US5] Create `StepAdCopy.module.css` styles
- [ ] T093 [US5] Implement primary text input (max 125 chars) with counter
- [ ] T094 [US5] Implement headline input (max 27 chars) with counter
- [ ] T095 [US5] Implement description input (max 27 chars) with counter
- [ ] T096 [US5] Implement CTA selector dropdown with Meta CTAs
- [ ] T097 [US5] Implement destination URL input with validation
- [ ] T098 [US5] Add "Gerar com IA" button (optional feature)
- [ ] T099 [US5] Integrate with store and validate before advance

**Checkpoint**: User Story 5 complete - users can configure ad copy

---

## Phase 10: User Story 10 - Revisar e Publicar Campanhas (Priority: P1)

**Goal**: Usuário pode revisar todas configurações e publicar campanhas

**Independent Test**: Verificar se resumo mostra todas configurações, publicar e confirmar no Meta Ads Manager

### Backend - Templates

- [ ] T100 [P] [US10] Add `POST /meta/campaigns/templates` endpoint (save template)
- [ ] T101 [P] [US10] Add `GET /meta/campaigns/templates` endpoint (list templates)
- [ ] T102 [P] [US10] Add `GET /meta/campaigns/templates/:id` endpoint (get template)
- [ ] T103 [P] [US10] Add `DELETE /meta/campaigns/templates/:id` endpoint (delete template)

### Backend - Publishing

- [ ] T104 [US10] Implement `publishCampaign` method in `campaign.service.ts`
- [ ] T105 [US10] Implement Campaign creation via Meta API
- [ ] T106 [US10] Implement AdSet creation via Meta API
- [ ] T107 [US10] Implement image upload (hash) via Meta API
- [ ] T108 [US10] Implement AdCreative creation via Meta API
- [ ] T109 [US10] Implement Ad creation via Meta API
- [ ] T110 [US10] Update template with `platform_ids` after success
- [ ] T111 [US10] Integrate credits consumption via `CreditsService`
- [ ] T112 [US10] Add `POST /meta/campaigns/:id/publish` endpoint

### Frontend - Review

- [ ] T113 [P] [US10] Create `StepReview.tsx` component in `frontend/src/features/alvoads-meta/components/steps/`
- [ ] T114 [P] [US10] Create `StepReview.module.css` styles
- [ ] T115 [US10] Display summary of all configurations (account, page, targeting, budget, creative, copy)
- [ ] T116 [US10] Implement "Edit" links to navigate back to specific steps
- [ ] T117 [US10] Create `useSaveTemplate` mutation in `api/mutations.ts`
- [ ] T118 [US10] Create `usePublishCampaign` mutation in `api/mutations.ts`

### Frontend - Progress

- [ ] T119 [P] [US10] Create `PublishProgress.tsx` component in `frontend/src/features/alvoads-meta/components/`
- [ ] T120 [P] [US10] Create `PublishProgress.module.css` styles
- [ ] T121 [US10] Implement step-by-step progress display (validating → creating_campaign → creating_adset → uploading_images → creating_creative → creating_ad → done)
- [ ] T122 [US10] Handle publish errors with retry option

**Checkpoint**: User Story 10 complete - users can review and publish campaigns

---

## Phase 11: User Story 7 - Configurar Instagram (Priority: P2)

**Goal**: Usuário pode incluir ou excluir conta do Instagram da campanha

**Independent Test**: Selecionar conta Instagram vinculada à página e verificar se anúncios aparecem no Instagram

### Implementation

- [ ] T123 [P] [US7] Create `StepInstagram.tsx` component in `frontend/src/features/alvoads-meta/components/steps/`
- [ ] T124 [P] [US7] Create `StepInstagram.module.css` styles
- [ ] T125 [US7] Display connected Instagram accounts for selected page
- [ ] T126 [US7] Implement checkbox to include/exclude Instagram
- [ ] T127 [US7] Handle pages without Instagram with clear message
- [ ] T128 [US7] Integrate with store

**Checkpoint**: User Story 7 complete - users can configure Instagram

---

## Phase 12: User Story 6 - Campanhas de Conversão com Messenger (Priority: P2)

**Goal**: Usuário pode criar campanhas que direcionam para conversas no Messenger

**Independent Test**: Criar campanha com objetivo "Conversas", configurar mensagem de boas-vindas, verificar funcionamento

### Implementation

- [ ] T129 [P] [US6] Create Messenger section in `StepAdCopy.tsx` (conditional on MESSAGES objective)
- [ ] T130 [US6] Implement welcome message input with variable support ({{user_first_name}})
- [ ] T131 [US6] Implement quick reply button configuration
- [ ] T132 [US6] Add Messenger config to campaign data
- [ ] T133 [US6] Update publish flow to include Messenger settings

**Checkpoint**: User Story 6 complete - users can create Messenger campaigns

---

## Phase 13: Wizard Orchestration

**Purpose**: Integrate all steps into functional wizard flow

### Wizard Page

- [ ] T134 [P] Create `MetaAdsWizardPage.tsx` in `frontend/src/features/alvoads-meta/pages/`
- [ ] T135 [P] Create `MetaAdsWizardPage.module.css` styles
- [ ] T136 Reutilize `WizardStepper` component from alvoads-google (or create shared)
- [ ] T137 Reutilize `StepNavigation` component from alvoads-google (or create shared)
- [ ] T138 Implement step rendering based on `currentStep` from store
- [ ] T139 Implement step validation before navigation
- [ ] T140 Implement save draft functionality

### Dashboard Page

- [ ] T141 [P] Create `AlvoAdsMetaPage.tsx` in `frontend/src/features/alvoads-meta/pages/`
- [ ] T142 [P] Create `AlvoAdsMetaPage.module.css` styles
- [ ] T143 Create `useMetaTemplates` query hook
- [ ] T144 Display list of saved templates with status badges
- [ ] T145 Implement "Criar Nova Campanha" button
- [ ] T146 Implement template actions (edit, duplicate, delete)

### Steps Index

- [ ] T147 Create barrel export `frontend/src/features/alvoads-meta/components/steps/index.ts`
- [ ] T148 Create barrel export `frontend/src/features/alvoads-meta/components/index.ts`
- [ ] T149 Create barrel export `frontend/src/features/alvoads-meta/pages/index.ts`

**Checkpoint**: Wizard fully functional and navigable

---

## Phase 14: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Error Handling

- [ ] T150 [P] Implement token expiration detection and redirect to reconnect
- [ ] T151 [P] Add exponential backoff for Meta API rate limits
- [ ] T152 Implement clear error messages for all failure scenarios

### Responsive Design

- [ ] T153 [P] Ensure all step components are mobile-responsive
- [ ] T154 [P] Test wizard on tablet breakpoint (1024px)
- [ ] T155 [P] Test wizard on mobile breakpoint (768px)

### UX Improvements

- [ ] T156 Add loading skeletons for data fetching states
- [ ] T157 Add success toast after campaign publish
- [ ] T158 Add confirmation dialog before deleting templates

### Validation

- [ ] T159 Run full wizard flow test with each objective
- [ ] T160 Verify campaigns appear correctly in Meta Ads Manager
- [ ] T161 Test with multiple account/page combinations

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phases 3-12)**: All depend on Foundational phase completion
  - P1 stories should be completed before P2 stories
  - Within P1, stories can proceed in parallel if staffed
- **Wizard Orchestration (Phase 13)**: Depends on all step components being complete
- **Polish (Phase 14)**: Depends on wizard being functional

### User Story Dependencies

| Story | Priority | Can Start After | Notes |
|-------|----------|-----------------|-------|
| US4 (Account/Page) | P1 | Phase 2 | First in wizard flow |
| US9 (Objective) | P1 | Phase 2 | Independent of US4 |
| US3 (Targeting) | P1 | Phase 2 | Independent |
| US8 (Budget) | P1 | Phase 2 | Independent |
| US1 (Drive Images) | P1 | Phase 2 | Independent |
| US2 (AI Images) | P1 | Phase 2 | Independent |
| US5 (Ad Copy) | P1 | Phase 2 | Independent |
| US10 (Review/Publish) | P1 | All P1 steps | Needs all data |
| US7 (Instagram) | P2 | US4 | Depends on page selection |
| US6 (Messenger) | P2 | US9 | Depends on objective |

### Parallel Opportunities

```bash
# After Phase 2, launch all P1 step components in parallel:
Task: "Create StepAccount.tsx"
Task: "Create StepObjective.tsx"
Task: "Create StepTargeting.tsx"
Task: "Create StepBudget.tsx"
Task: "Create StepCreative.tsx"
Task: "Create StepAdCopy.tsx"

# Backend endpoints can run in parallel:
Task: "Add getAdAccounts endpoint"
Task: "Add getPages endpoint"
Task: "Add getInstagramAccount endpoint"
Task: "Add targeting endpoints"
```

---

## Implementation Strategy

### MVP First (P1 Stories Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phases 3-10: All P1 User Stories
4. Complete Phase 13: Wizard Orchestration
5. **STOP and VALIDATE**: Full wizard test
6. Deploy MVP

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US4 (Account/Page) → Test step
3. Add US9 (Objective) → Test step
4. Add US3, US8 (Targeting, Budget) → Test steps
5. Add US1, US2 (Creatives) → Test steps
6. Add US5, US10 (Copy, Review) → Full flow test
7. Add US7, US6 (Instagram, Messenger) → P2 features
8. Polish phase → Production ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Reutilize components from AlvoADS Google where possible
- Follow existing CSS module patterns from the project
- Use design system CSS variables (no hardcoded colors/spacing)
- Commit after each task or logical group
