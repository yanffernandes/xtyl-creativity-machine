# Tasks: AlvoADS Meta - Geracao Automatizada de Criativos por IA

**Input**: Design documents from `/specs/020-alvoads-meta-creative-ai/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/creative-api.yaml

**Tests**: Not explicitly requested in specification - tests are OPTIONAL.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and database setup

- [ ] T001 Install Google AI SDK dependency in backend: `cd backend && npm install @google/genai`
- [ ] T002 [P] Add GOOGLE_AI_API_KEY to backend/.env.example and document in quickstart.md
- [ ] T003 [P] Create database migration file in supabase/migrations/20260102_creative_library.sql (copy from data-model.md)
- [ ] T004 [P] Create Supabase Storage bucket 'meta-creatives' (via Dashboard or script)
- [ ] T005 Create system prompt seed file in supabase/seeds/system_prompts_image_generator.sql with `meta-ads.image-prompt-generator`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and services that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 [P] Create creative types in frontend/src/features/alvoads-meta/types/creative.ts (ImageModel, ImageFormat, CreativeStatus, GeneratedImage, AdCopy interfaces)
- [ ] T007 [P] Create DTOs in backend/src/modules/meta/dto/generate-image.dto.ts (GenerateImagesDto, RegenerateImageDto)
- [ ] T008 [P] Create DTOs in backend/src/modules/meta/dto/creative-library.dto.ts (LibraryQueryDto, LibraryCreativeDto)
- [ ] T009 Add Google Imagen integration to backend/src/modules/meta/services/ai-creative.service.ts (generateImageWithImagen method)
- [ ] T010 Add image prompt generation method to backend/src/modules/meta/services/ai-creative.service.ts (generateImagePrompt using system_prompts)
- [ ] T011 Add style variation logic to backend/src/modules/meta/services/ai-creative.service.ts (getStyleForIndex with CREATIVE_STYLES array)
- [ ] T012 Extend metaAdsWizardStore with creatives state in frontend/src/features/alvoads-meta/stores/metaAdsWizardStore.ts (generatedImages, approvedImages, imageConfig)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Gerar Imagens Automaticamente por IA (Priority: P1) 🎯 MVP

**Goal**: Usuário clica em "Gerar Imagens por IA" e o sistema gera 1 imagem por AdSet automaticamente

**Independent Test**: Selecionar um artigo sobre "financiamento imobiliario", escolher modelo/formato, clicar gerar, verificar se imagens relevantes são criadas

### Implementation for User Story 1

- [ ] T013 Create creative.controller.ts in backend/src/modules/meta/creative.controller.ts with POST /generate-images endpoint
- [ ] T014 [P] [US1] Implement generateImages method in ai-creative.service.ts that: validates credits, generates prompt, calls DALL-E or Imagen, uploads to storage
- [ ] T015 [P] [US1] Implement model fallback logic in ai-creative.service.ts (try Imagen, fallback to DALL-E if fails)
- [ ] T016 [P] [US1] Implement uploadImageToStorage helper in ai-creative.service.ts (upload base64 to Supabase Storage, return public URL)
- [ ] T017 [US1] Create StepCreatives.tsx in frontend/src/features/alvoads-meta/components/wizard/StepCreatives.tsx (configuration UI: model, format, directions)
- [ ] T018 [P] [US1] Create StepCreatives.module.css in frontend/src/features/alvoads-meta/components/wizard/StepCreatives.module.css
- [ ] T019 [US1] Create useGenerateImages mutation hook in frontend/src/features/alvoads-meta/api/useCreatives.ts
- [ ] T020 [US1] Implement progress indicator in StepCreatives.tsx (show X of Y generated, progress bar)
- [ ] T021 [US1] Add cancel generation support in StepCreatives.tsx (abort controller, stop button)
- [ ] T022 [US1] Register creative.controller in backend/src/modules/meta/meta.module.ts

**Checkpoint**: User Story 1 complete - users can generate images automatically with model/format selection

---

## Phase 4: User Story 2 - Aprovar e Rejeitar Imagens no Grid (Priority: P1)

**Goal**: Usuário visualiza imagens geradas em grid, pode aprovar, rejeitar, ou regenerar individualmente

**Independent Test**: Gerar 5 imagens, rejeitar 2, aprovar 3, verificar visual feedback e estado correto

### Implementation for User Story 2

- [ ] T023 [P] [US2] Create CreativeCard.tsx in frontend/src/features/alvoads-meta/components/wizard/CreativeCard.tsx (single image with approve/reject/regenerate buttons)
- [ ] T024 [P] [US2] Create CreativeGrid.tsx in frontend/src/features/alvoads-meta/components/wizard/CreativeGrid.tsx (grid layout, batch regenerate button)
- [ ] T025 [US2] Add approve/reject/regenerate handlers in metaAdsWizardStore.ts (approveImage, rejectImage, markForRegenerate)
- [ ] T026 [US2] Create POST /regenerate-image endpoint in backend/src/modules/meta/creative.controller.ts
- [ ] T027 [US2] Implement regenerateImage in ai-creative.service.ts (same context, new style variation)
- [ ] T028 [US2] Create useRegenerateImage mutation hook in frontend/src/features/alvoads-meta/api/useCreatives.ts
- [ ] T029 [US2] Implement batch regenerate in StepCreatives.tsx (regenerate all rejected at once)
- [ ] T030 [US2] Add visual feedback for status in CreativeCard.tsx (green border approved, red border rejected, opacity for rejected)
- [ ] T031 [US2] Add model/style info display in CreativeCard.tsx (tooltip or badge showing DALL-E/Imagen and style)
- [ ] T032 [US2] Enable "Avancar" button only when all required images approved in StepCreatives.tsx

**Checkpoint**: User Story 2 complete - users can curate generated images with full control

---

## Phase 5: User Story 3 - Gerar Textos de Anuncio para Cada Imagem (Priority: P1)

**Goal**: Sistema gera textos (primary_text, headline, description) para cada imagem aprovada, permitindo edição e regeneração

**Independent Test**: Aprovar 3 imagens, avançar para textos, verificar se 3 conjuntos de texto são gerados respeitando limites

### Implementation for User Story 3

- [ ] T033 [US3] Create POST /generate-ad-copy endpoint in backend/src/modules/meta/creative.controller.ts
- [ ] T034 [US3] Implement generateAdCopyForImage in ai-creative.service.ts (use existing prompts, validate char limits)
- [ ] T035 [P] [US3] Create StepAdCopy.tsx in frontend/src/features/alvoads-meta/components/wizard/StepAdCopy.tsx (list of image+text pairs)
- [ ] T036 [P] [US3] Create AdPreview.tsx in frontend/src/features/alvoads-meta/components/wizard/AdPreview.tsx (mock Facebook feed preview)
- [ ] T037 [US3] Create useGenerateAdCopy mutation hook in frontend/src/features/alvoads-meta/api/useCreatives.ts
- [ ] T038 [US3] Add adCopy state to metaAdsWizardStore.ts (array of {imageId, primaryText, headline, description, cta})
- [ ] T039 [US3] Implement inline text editing in StepAdCopy.tsx (editable fields with char counters)
- [ ] T040 [US3] Implement regenerate text button in StepAdCopy.tsx (regenerate individual text set)
- [ ] T041 [US3] Add character limit validation with visual feedback in StepAdCopy.tsx (red warning if over limit)

**Checkpoint**: User Story 3 complete - users can generate, edit, and preview ad copy for each creative

---

## Phase 6: User Story 4 - Configurar Prompts de IA pelo Admin (Priority: P2)

**Goal**: Administrador pode editar prompts de geração no banco de dados sem alterar código

**Independent Test**: Alterar prompt no banco de dados, gerar nova imagem, verificar se usa o prompt atualizado

### Implementation for User Story 4

- [ ] T042 [US4] Implement getSystemPrompt in ai-creative.service.ts with fallback to hardcoded if not found
- [ ] T043 [US4] Implement replaceVariables helper in ai-creative.service.ts ({{article_title}}, {{keyword}}, {{style}}, etc.)
- [ ] T044 [US4] Add error logging when prompt fails in ai-creative.service.ts (log to console, use fallback)
- [ ] T045 [US4] Document available variables in system_prompts_image_generator.sql seed file comments

**Checkpoint**: User Story 4 complete - prompts are configurable via database

---

## Phase 7: User Story 5 - Visualizar Contagem e Custo de Creditos (Priority: P2)

**Goal**: Usuário vê quantos créditos serão consumidos antes de gerar, com validação de saldo

**Independent Test**: Configurar 10 AdSets, verificar se mostra "10 imagens (50 créditos)", tentar gerar sem créditos suficientes

### Implementation for User Story 5

- [ ] T046 [US5] Create POST /credits/preview endpoint in backend/src/modules/meta/creative.controller.ts
- [ ] T047 [US5] Implement previewCredits in credits.service.ts (calculate imageCredits + textCredits, check balance)
- [ ] T048 [US5] Create useCreditsPreview query hook in frontend/src/features/alvoads-meta/api/useCreatives.ts
- [ ] T049 [US5] Add credits preview display in StepCreatives.tsx (show count, cost, and balance)
- [ ] T050 [US5] Add insufficient credits alert in StepCreatives.tsx (show warning with link to purchase)
- [ ] T051 [US5] Update credits display after regeneration in StepCreatives.tsx (real-time counter update)

**Checkpoint**: User Story 5 complete - full cost transparency before generation

---

## Phase 8: User Story 6 - Biblioteca de Criativos (Priority: P2)

**Goal**: Usuário pode acessar biblioteca de imagens aprovadas anteriormente e reutilizá-las sem custo

**Independent Test**: Aprovar imagens em campanha A, criar campanha B, verificar se imagens aparecem na biblioteca para seleção

### Implementation for User Story 6

- [ ] T052 [US6] Create creative-library.service.ts in backend/src/modules/meta/services/creative-library.service.ts (CRUD operations)
- [ ] T053 [US6] Create GET /library endpoint in backend/src/modules/meta/creative.controller.ts (list with filters, pagination)
- [ ] T054 [US6] Create DELETE /library/:id endpoint in backend/src/modules/meta/creative.controller.ts (soft delete)
- [ ] T055 [US6] Create useLibraryCreatives query hook in frontend/src/features/alvoads-meta/api/useCreatives.ts
- [ ] T056 [P] [US6] Create CreativeLibraryModal.tsx in frontend/src/features/alvoads-meta/components/wizard/CreativeLibraryModal.tsx (grid with filters)
- [ ] T057 [US6] Add "Usar da Biblioteca" button in StepCreatives.tsx that opens CreativeLibraryModal
- [ ] T058 [US6] Implement library selection logic in metaAdsWizardStore.ts (add library image to approved without credits)
- [ ] T059 [US6] Add filters UI in CreativeLibraryModal.tsx (by date, article, style, model)
- [ ] T060 [US6] Save approved images to library in ai-creative.service.ts (insert into creative_library on approve)

**Checkpoint**: User Story 6 complete - full library functionality with filters and zero-cost reuse

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Integration, wizard flow, and final adjustments

- [ ] T061 [P] Export StepCreatives and StepAdCopy from frontend/src/features/alvoads-meta/components/wizard/index.ts
- [ ] T062 Add StepCreatives and StepAdCopy to wizard steps in MetaAdsWizardPage.tsx
- [ ] T063 Update wizard stepper to include new steps in MetaWizardStepper.tsx
- [ ] T064 [P] Add useCreatives barrel export from frontend/src/features/alvoads-meta/api/index.ts
- [ ] T065 Ensure localStorage persistence for creatives state in metaAdsWizardStore.ts
- [ ] T066 Run database migration and verify tables created correctly
- [ ] T067 Seed system_prompts with image-prompt-generator and verify it works
- [ ] T068 End-to-end test: complete wizard flow from article selection to publish with AI creatives

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1, US2, US3 are P1 priority (core flow) - implement in sequence
  - US4, US5, US6 are P2 priority (enhancements) - can be done after P1 stories
- **Polish (Phase 9)**: Depends on at least US1-US3 being complete

### User Story Dependencies

- **User Story 1 (P1)**: Independent - can start after Foundational
- **User Story 2 (P1)**: Depends on US1 (needs generated images to approve/reject)
- **User Story 3 (P1)**: Depends on US2 (needs approved images to generate text for)
- **User Story 4 (P2)**: Independent - can start after Foundational
- **User Story 5 (P2)**: Independent - can start after Foundational
- **User Story 6 (P2)**: Independent - but benefits from US1/US2 for testing

### Within Each User Story

- Backend endpoints before frontend components
- Service methods before controller endpoints
- Store state before UI components
- Core implementation before edge cases

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Within stories: Tasks marked [P] can run in parallel (different files)
- US4, US5, US6 can be worked on in parallel after US3 completes

---

## Parallel Example: User Story 2

```bash
# Launch these tasks together (different files):
Task T023: "Create CreativeCard.tsx"
Task T024: "Create CreativeGrid.tsx"

# Then sequential (same file dependencies):
Task T025: "Add handlers to store"
Task T026: "Create regenerate endpoint"
Task T027: "Implement regenerateImage service"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

1. Complete Phase 1: Setup (~30 min)
2. Complete Phase 2: Foundational (~1-2 hours)
3. Complete Phase 3: US1 - Image Generation (~2-3 hours)
4. Complete Phase 4: US2 - Grid Approval (~2-3 hours)
5. Complete Phase 5: US3 - Text Generation (~2-3 hours)
6. **STOP and VALIDATE**: Test full creative flow end-to-end
7. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test generation → Deploy (MVP: "Users can generate AI images")
3. Add US2 → Test approval → Deploy ("Users can curate images")
4. Add US3 → Test text gen → Deploy ("Users have complete creatives")
5. Add US4-US6 → Deploy (Enhanced experience)

---

## Summary

| Phase | Tasks | Parallelizable |
|-------|-------|----------------|
| Setup | 5 | 3 |
| Foundational | 7 | 4 |
| US1 - Image Generation | 10 | 3 |
| US2 - Grid Approval | 10 | 3 |
| US3 - Text Generation | 9 | 2 |
| US4 - Admin Prompts | 4 | 0 |
| US5 - Credits Preview | 6 | 0 |
| US6 - Library | 9 | 1 |
| Polish | 8 | 3 |
| **Total** | **68** | **19** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1-US3 form the core MVP and should be implemented in sequence
- US4-US6 are enhancements that can be added incrementally
- Each story checkpoint validates independent functionality
- Commit after each task or logical group
