# Tasks: V1 Polish

**Input**: Design documents from `/specs/016-v1-polish/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested - tests OPTIONAL (manual testing defined in quickstart.md)

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/` (Python/FastAPI)
- **Frontend**: `frontend/src/` (Next.js/React)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migration and configuration updates required for all user stories

- [x] T001 Create migration file in backend/migrations/017_v1_polish_refining.sql
- [x] T002 Apply migration to add original_image_id and refinement_history columns to documents table
- [x] T003 [P] Add prompt_enrichment model type to system_config ai_models defaults via migration

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared backend infrastructure that multiple user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Update Document model in backend/models.py to add original_image_id and refinement_history fields
- [x] T005 [P] Update backend/schemas.py to add RefineImageResponse with original_image_id and refinement_count
- [x] T006 [P] Update backend/services/model_config_service.py to support prompt_enrichment model type
- [ ] T007 Add api client functions for new endpoints in frontend/src/lib/api.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Gerenciar Imagens Anexadas (Priority: P1) 🎯 MVP

**Goal**: Add view, delete permanently, and detach actions for attached images in documents

**Independent Test**: Open a document with attached images and execute all three actions (view, delete, detach) verifying each result

### Implementation for User Story 1

- [ ] T008 [P] [US1] Create ImageLightbox component with zoom support in frontend/src/components/ui/ImageLightbox.tsx
- [ ] T009 [US1] Add delete permanent endpoint in backend/routers/documents.py (DELETE /documents/{id}/attachments/{attachment_id}/permanent)
- [ ] T010 [US1] Implement R2 storage deletion logic in delete permanent endpoint in backend/routers/documents.py
- [ ] T011 [US1] Add validation to prevent deletion if image is original_image_id of another document in backend/routers/documents.py
- [ ] T012 [US1] Update DocumentAttachments.tsx to add three distinct action buttons (view/detach/delete) in frontend/src/components/document/DocumentAttachments.tsx
- [ ] T013 [US1] Integrate ImageLightbox for fullscreen view with zoom in frontend/src/components/document/DocumentAttachments.tsx
- [ ] T014 [US1] Add confirmation dialog before permanent deletion using AlertDialog in frontend/src/components/document/DocumentAttachments.tsx
- [ ] T015 [US1] Add immediate list refresh after any action in frontend/src/components/document/DocumentAttachments.tsx

**Checkpoint**: User Story 1 complete - all three image actions work independently

---

## Phase 4: User Story 2 - Criação Instantânea de Novo Documento (Priority: P1)

**Goal**: Provide instant feedback (<200ms) when clicking "Nova Criação" with background document creation

**Independent Test**: Click "Nova Criação" and measure time to visual feedback (must be instant)

### Implementation for User Story 2

- [ ] T016 [P] [US2] Add isCreating loading state to project page in frontend/src/app/workspace/[id]/project/[projectId]/page.tsx
- [ ] T017 [US2] Implement optimistic navigation (router.push immediately) in frontend/src/app/workspace/[id]/project/[projectId]/page.tsx
- [ ] T018 [US2] Create background document creation with URL replacement in frontend/src/app/workspace/[id]/project/[projectId]/page.tsx
- [ ] T019 [US2] Add debounce/disable button to prevent multiple clicks in frontend/src/app/workspace/[id]/project/[projectId]/page.tsx
- [ ] T020 [US2] Add skeleton loading state for new document page in frontend/src/app/workspace/[id]/project/[projectId]/document/[documentId]/page.tsx
- [ ] T021 [US2] Add error handling with user-friendly toast notification in frontend/src/app/workspace/[id]/project/[projectId]/page.tsx

**Checkpoint**: User Story 2 complete - "Nova Criação" provides instant feedback

---

## Phase 5: User Story 3 - Manutenção de Qualidade no Refining (Priority: P2)

**Goal**: Fix image quality degradation by always using original image as base for refinements

**Independent Test**: Execute 5+ refinements on same image and verify quality is maintained

### Implementation for User Story 3

- [ ] T022 [US3] Update refine endpoint to find and use original_image_id instead of current image in backend/routers/image_generation.py
- [ ] T023 [US3] Add logic to set original_image_id when creating refined image in backend/routers/image_generation.py
- [ ] T024 [US3] Implement refinement_history accumulation in backend/routers/image_generation.py
- [ ] T025 [US3] Build combined prompt from original + accumulated refinement instructions in backend/routers/image_generation.py
- [ ] T026 [US3] Add refinement_count to response in backend/routers/image_generation.py
- [ ] T027 [US3] Update ImageGenerationPanel to display refinement count in frontend/src/components/ImageGenerationPanel.tsx

**Checkpoint**: User Story 3 complete - refinements preserve quality via original image

---

## Phase 6: User Story 4 - Geração Inteligente de Prompts (Priority: P2)

**Goal**: Create intermediate prompt enrichment service that enhances user prompts with brand context

**Independent Test**: Request image generation via chat and verify prompt includes brand context elements

### Implementation for User Story 4

- [ ] T028 [P] [US4] Create PromptEnrichmentService class in backend/services/prompt_enrichment_service.py
- [ ] T029 [US4] Implement enrich_prompt method with brand context integration in backend/services/prompt_enrichment_service.py
- [ ] T030 [US4] Add system prompt for prompt engineering best practices in backend/services/prompt_enrichment_service.py
- [ ] T031 [US4] Add fallback template for projects without brand context in backend/services/prompt_enrichment_service.py
- [ ] T032 [P] [US4] Create /prompts/enrich endpoint in backend/routers/prompts.py (new router)
- [ ] T033 [US4] Register prompts router in backend/main.py
- [ ] T034 [US4] Integrate prompt enrichment into generate_image_tool in backend/tools.py
- [ ] T035 [US4] Add prompt_enrichment to admin model config UI in frontend/src/app/admin/models/page.tsx
- [ ] T036 [US4] Update ModelConfigForm to include prompt_enrichment field in frontend/src/components/admin/ModelConfigForm.tsx

**Checkpoint**: User Story 4 complete - prompts are automatically enriched with brand context

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T037 [P] Add error placeholder for missing images in storage in frontend/src/components/document/DocumentAttachments.tsx
- [ ] T038 [P] Add retry with backoff for rate limits in prompt enrichment in backend/services/prompt_enrichment_service.py
- [ ] T039 Run quickstart.md validation scenarios for all 4 user stories
- [ ] T040 Update CLAUDE.md with new endpoints and service locations

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 and US2 (both P1) can proceed in parallel
  - US3 and US4 (both P2) can proceed in parallel after P1 stories
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 3 (P2)**: Can start after Foundational - No dependencies on other stories
- **User Story 4 (P2)**: Can start after Foundational - No dependencies on other stories

### Within Each User Story

- Backend changes before frontend integration
- Models/schemas before endpoints
- Endpoints before frontend components
- Core implementation before polish

### Parallel Opportunities

**Phase 2 Parallel:**
```
T005, T006 can run in parallel (different files)
```

**Phase 3 (US1) Parallel:**
```
T008 (ImageLightbox) can start immediately in parallel with T009-T011 (backend)
```

**Phase 4-5-6 Parallel (after P1 complete):**
```
All P2 user stories (US3, US4) can run in parallel
Within US4: T028, T032 can run in parallel
```

---

## Parallel Example: MVP Execution

```bash
# Phase 1 - Sequential
T001 → T002 → T003

# Phase 2 - Partial Parallel
T004 → (T005 || T006) → T007

# Phase 3 (US1) - Partial Parallel
(T008) || (T009 → T010 → T011) → T012 → T013 → T014 → T015

# Phase 4 (US2) - Mostly Sequential
T016 → T017 → T018 → T019 → T020 → T021
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (migrations)
2. Complete Phase 2: Foundational (models, schemas, API client)
3. Complete Phase 3: User Story 1 (image actions)
4. Complete Phase 4: User Story 2 (instant creation)
5. **STOP and VALIDATE**: Test both P1 stories independently
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test independently → **MVP for image management**
3. Add US2 → Test independently → **MVP for instant creation**
4. Add US3 → Test independently → **Quality fix for refining**
5. Add US4 → Test independently → **Intelligent prompt generation**
6. Polish phase → Final validation

### Parallel Team Strategy

With multiple developers:
1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Backend T009-T011, then Frontend T012-T015)
   - Developer B: User Story 2 (All frontend T016-T021)
   - Developer C: ImageLightbox component (T008)
3. After P1 stories:
   - Developer A: User Story 3 (Backend refining fix)
   - Developer B: User Story 4 (Prompt enrichment)

---

## Task Summary

| Phase | Tasks | Parallel Tasks | Story |
|-------|-------|----------------|-------|
| Setup | 3 | 1 | - |
| Foundational | 4 | 2 | - |
| US1 (P1) | 8 | 1 | Gerenciar Imagens |
| US2 (P1) | 6 | 1 | Criação Instantânea |
| US3 (P2) | 6 | 0 | Qualidade Refining |
| US4 (P2) | 9 | 2 | Prompts Inteligentes |
| Polish | 4 | 2 | - |
| **Total** | **40** | **9** | - |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- US1 and US2 are both P1 priority - can be parallelized or done sequentially
- US3 and US4 are both P2 priority - can be parallelized after P1 complete
