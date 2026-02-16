# Tasks: Smart Image Generation

**Input**: Design documents from `/specs/026-smart-image-generation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Test tasks are NOT included (not explicitly requested in specification).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/` at repository root (Python/FastAPI)
- **Frontend**: `frontend/src/` at repository root (TypeScript/Next.js)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migration and configuration setup

- [x] T001 Create Alembic migration for variation fields in backend/migrations/025_add_image_variation_fields.sql
- [x] T002 Add variation fields to Document model in backend/models.py (variation_set_id, variation_index, variation_modifier)
- [x] T003 [P] Add default system_config entry for image_generation_default_variations in migration

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create Pydantic schemas for ImageGenerationConfig and ImageGenerationConfigUpdate in backend/schemas.py
- [x] T005 [P] Create helper function get_variation_config() in backend/image_generation_service.py
- [x] T006 [P] Create SSE event emitter for variation events in backend/routers/chat.py
- [x] T007 Create ImageVariation TypeScript types in frontend/src/types/image-variations.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Geração de Criativo com Prompt Simples (Priority: P1) 🎯 MVP

**Goal**: Generate 2 image variations automatically when user requests image with basic prompt

**Independent Test**: Send "cria uma imagem pro meu produto" in chat and verify 2 distinct variations are generated with marketing-optimized prompts

### Implementation for User Story 1

- [x] T008 [US1] Modify generate_image_tool in backend/tools.py to accept num_variations parameter
- [x] T009 [US1] Implement parallel variation generation using asyncio.gather() in backend/tools.py
- [x] T010 [US1] Create generate_single_variation() helper function in backend/tools.py
- [x] T011 [US1] Add variation_set_id generation (UUID) for grouping variations in backend/tools.py
- [x] T012 [US1] Update prompt enrichment to apply style modifiers per variation in backend/tools.py (integrated into generate_single_variation)
- [x] T013 [US1] Emit variation_started SSE event when generation begins in backend/routers/chat.py (helper created)
- [x] T014 [US1] Emit variation_complete SSE event for each completed variation in backend/routers/chat.py (helper created)
- [x] T015 [US1] Emit all_variations_complete SSE event when all done in backend/routers/chat.py (helper created)
- [x] T016 [US1] Handle partial failures - emit variation_failed event but continue with others in backend/tools.py
- [x] T017 [P] [US1] Create useImageVariations hook in frontend/src/hooks/useImageVariations.ts
- [x] T018 [P] [US1] Create ImageVariationGrid component in frontend/src/components/chat/ImageVariationGrid.tsx
- [x] T019 [US1] Integrate useImageVariations hook with existing chat SSE handler in frontend/src/hooks/useChat.ts
- [x] T020 [US1] Render ImageVariationGrid when variation events received in frontend/src/components/chat/ChatMessage.tsx
- [x] T021 [US1] Add skeleton loading states for pending variations in frontend/src/components/chat/ImageVariationGrid.tsx
- [x] T022 [US1] Add Framer Motion fade-in animation for completed variations in frontend/src/components/chat/ImageVariationGrid.tsx

**Checkpoint**: User Story 1 complete - users can generate 2 variations automatically with progressive delivery

---

## Phase 4: User Story 2 - Configuração de Número de Variações (Priority: P2)

**Goal**: Admin can configure default number of variations (1, 2, or 3) globally

**Independent Test**: Change variation count in admin panel, then generate image and verify correct number of variations

### Implementation for User Story 2

- [x] T023 [US2] Create GET /admin/config/image-generation endpoint in backend/routers/admin.py
- [x] T024 [US2] Create PUT /admin/config/image-generation endpoint in backend/routers/admin.py
- [x] T025 [US2] Add validation for count (1-3) and modifiers (min 3 items) in backend/routers/admin.py
- [x] T026 [US2] Update generate_image_tool to read config from system_config when num_variations not specified in backend/tools.py
- [x] T027 [P] [US2] Create ImageGenerationSettings component in frontend/src/components/admin/ImageGenerationSettings.tsx
- [x] T028 [P] [US2] Create useImageGenerationConfig hook in frontend/src/hooks/useImageGenerationConfig.ts
- [x] T029 [US2] Add ImageGenerationSettings to admin settings page in frontend/src/app/admin/settings/page.tsx
- [x] T030 [US2] Implement RadioGroup for variation count selection (1, 2, 3) in frontend/src/components/admin/ImageGenerationSettings.tsx
- [x] T031 [US2] Add save functionality with toast feedback in frontend/src/components/admin/ImageGenerationSettings.tsx

**Checkpoint**: User Story 2 complete - admin can configure variation count globally

---

## Phase 5: User Story 3 - Incorporação Inteligente de Assets Visuais (Priority: P2)

**Goal**: Visual assets (logo, brand colors, style references) are automatically incorporated into image generation

**Independent Test**: Create project with logo/brand assets, generate image, verify assets influence the generated variations

### Implementation for User Story 3

- [x] T032 [US3] Review existing visual_asset_service.py for asset retrieval in backend/services/visual_asset_service.py
- [x] T033 [US3] Update prompt enrichment to inject visual context from project assets in backend/services/prompt_enrichment_service.py
- [x] T034 [US3] Add visual_assets_used to generation metadata in backend/tools.py
- [x] T035 [US3] Ensure brand colors and style references are passed to image generation prompt in backend/services/prompt_enrichment_service.py
- [x] T036 [US3] Handle case when project has no visual assets (use generic marketing best practices) in backend/services/prompt_enrichment_service.py

**Checkpoint**: User Story 3 complete - generated images incorporate project brand assets

---

## Phase 6: User Story 4 - Override Explícito do Comportamento Padrão (Priority: P3)

**Goal**: Advanced users can override default behavior via explicit prompt instructions

**Independent Test**: Use "gera exatamente isso:" prefix and verify no enrichment is applied; use "apenas 1 variação" and verify single image generated

### Implementation for User Story 4

- [x] T037 [US4] Update system prompt to recognize override patterns in backend/services/llm_service.py or chat context
- [x] T038 [US4] Add skip_prompt_enrichment parameter handling in backend/tools.py
- [x] T039 [US4] Add override_variations parameter handling in backend/tools.py
- [x] T040 [US4] Add skip_visual_context parameter handling in backend/tools.py
- [x] T041 [US4] Document override patterns ("exatamente isso:", "apenas X variação", "sem referências") in system prompt

**Checkpoint**: User Story 4 complete - power users can override automatic behavior

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T042 [P] Add GET /documents/variation-set/{variation_set_id} endpoint in backend/routers/documents.py
- [x] T043 [P] Add index on variation_set_id column for efficient queries (verify in migration)
- [x] T044 Log generation metadata (variations_requested, modifier_applied, timing) in backend/tools.py
- [x] T045 Add error boundary for ImageVariationGrid in frontend/src/components/chat/ImageVariationGrid.tsx
- [x] T046 Verify quickstart.md scenarios work end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in priority order (P1 → P2 → P3)
  - US3 can run in parallel with US2 (both P2)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after US1 is complete (needs variation generation working)
- **User Story 3 (P2)**: Can start after US1 is complete (needs variation generation working)
- **User Story 4 (P3)**: Can start after US1 is complete (needs base variation system)

### Within Each User Story

- Backend changes before frontend changes
- SSE events before frontend handlers
- Hooks before components
- Core implementation before integration

### Parallel Opportunities

- T002 and T003 can run in parallel (different concerns)
- T005 and T006 and T007 can run in parallel (different files)
- T017 and T018 can run in parallel (different frontend files)
- T023 and T024 sequential (same file, related)
- T027 and T028 can run in parallel (different frontend files)
- T042 and T043 can run in parallel (different concerns)

---

## Parallel Example: User Story 1

```bash
# Launch backend SSE changes (sequential - same file):
Task: "T013 Emit variation_started SSE event"
Task: "T014 Emit variation_complete SSE event"
Task: "T015 Emit all_variations_complete SSE event"

# Launch frontend components (parallel - different files):
Task: "T017 Create useImageVariations hook"
Task: "T018 Create ImageVariationGrid component"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (migration, model changes)
2. Complete Phase 2: Foundational (schemas, helpers, types)
3. Complete Phase 3: User Story 1 (variation generation + UI)
4. **STOP and VALIDATE**: Test generating 2 variations with basic prompt
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test variations → Deploy/Demo (MVP!)
3. Add User Story 2 → Test admin config → Deploy/Demo
4. Add User Story 3 → Test asset incorporation → Deploy/Demo
5. Add User Story 4 → Test overrides → Deploy/Demo
6. Complete Polish → Final testing

### Estimated Task Distribution

| Phase | Tasks | Parallel Opportunities |
|-------|-------|------------------------|
| Setup | 3 | 1 |
| Foundational | 4 | 3 |
| US1 (P1) MVP | 15 | 2 |
| US2 (P2) | 9 | 2 |
| US3 (P2) | 5 | 0 |
| US4 (P3) | 5 | 0 |
| Polish | 5 | 2 |
| **Total** | **46** | **10** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Style modifiers: "minimalista", "vibrante", "sofisticada" (from research.md)
- Default variation count: 2 (from spec.md)
- Max variations: 3 (from spec.md)
