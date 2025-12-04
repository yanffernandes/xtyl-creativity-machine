# Tasks: Admin Model Visibility Configuration

**Input**: Design documents from `/specs/018-admin-model-visibility/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-contracts.yaml, quickstart.md

**Tests**: Not explicitly requested - test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/` for Python, `frontend/src/` for TypeScript
- Based on plan.md structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Seed data and schema updates for new configuration keys

- [X] T001 Add seed data migration for `visible_text_models` and `visible_image_models` keys in backend/migrations/018_model_visibility_seed.sql
- [X] T002 [P] Update AIModelConfig schema to include `visible_text_models` and `visible_image_models` arrays in backend/schemas.py
- [X] T003 [P] Update AIModelConfigUpdate schema with optional fields for new model lists in backend/schemas.py

---

## Phase 2: Foundational (Backend Services)

**Purpose**: Core backend infrastructure that supports all user stories

**⚠️ CRITICAL**: No frontend work can begin until this phase is complete

- [X] T004 Add `get_visible_text_models()` method to ModelConfigService in backend/services/model_config_service.py
- [X] T005 [P] Add `get_visible_image_models()` method to ModelConfigService in backend/services/model_config_service.py
- [X] T006 Add `update_visible_text_models()` method with validation (min 1 model) in backend/services/model_config_service.py
- [X] T007 [P] Add `update_visible_image_models()` method with validation (min 1 model) in backend/services/model_config_service.py
- [X] T008 Add backward compatibility migration for existing `visible_models` key in backend/services/model_config_service.py
- [X] T009 Add cache invalidation for new model visibility keys in backend/services/model_config_service.py

**Checkpoint**: Backend service layer ready - API and frontend implementation can now begin

---

## Phase 3: User Story 1 - Admin Configures Text Models (Priority: P1) 🎯 MVP

**Goal**: Admin can configure which text/LLM models are visible to users, with pricing display

**Independent Test**: Access /admin/models, click "Text Models" tab, select models, save, verify persistence

### Implementation for User Story 1

- [X] T010 [US1] Update GET `/admin/models/config` endpoint to return `visible_text_models` in backend/routers/admin.py
- [X] T011 [US1] Update PUT `/admin/models/config` endpoint to handle `visible_text_models` updates in backend/routers/admin.py
- [X] T012 [US1] Add `type` query parameter to GET `/admin/models/available` to filter by "text" in backend/routers/admin.py
- [X] T013 [P] [US1] Update `useAdminModels` hook TypeScript types for `visible_text_models` in frontend/src/hooks/use-admin.ts
- [X] T014 [US1] Add "Text Models" tab to admin models page in frontend/src/app/admin/models/page.tsx
- [X] T015 [US1] Create `TextModelsConfig` component with pricing display in frontend/src/app/admin/models/page.tsx
- [X] T016 [US1] Filter available models by `output_modalities.includes("text")` for text tab in frontend/src/app/admin/models/page.tsx
- [X] T017 [US1] Add save handler for text models with success toast in frontend/src/app/admin/models/page.tsx

**Checkpoint**: Admin can configure text models - User Story 1 is independently testable

---

## Phase 4: User Story 2 - Admin Configures Image Models (Priority: P1)

**Goal**: Admin can configure which image generation models are visible to users

**Independent Test**: Access /admin/models, click "Image Models" tab, select models, save, verify persistence

### Implementation for User Story 2

- [X] T018 [US2] Update PUT `/admin/models/config` endpoint to handle `visible_image_models` updates in backend/routers/admin.py
- [X] T019 [P] [US2] Add `type` query parameter filtering for "image" models in backend/routers/admin.py
- [X] T020 [P] [US2] Update `useAdminModels` hook TypeScript types for `visible_image_models` in frontend/src/hooks/use-admin.ts
- [X] T021 [US2] Add "Image Models" tab to admin models page in frontend/src/app/admin/models/page.tsx
- [X] T022 [US2] Create `ImageModelsConfig` component with pricing display in frontend/src/app/admin/models/page.tsx
- [X] T023 [US2] Filter available models by `output_modalities.includes("image")` for image tab in frontend/src/app/admin/models/page.tsx
- [X] T024 [US2] Add save handler for image models with success toast in frontend/src/app/admin/models/page.tsx

**Checkpoint**: Admin can configure both text and image models independently

---

## Phase 5: User Story 3 - User Sees Filtered Models (Priority: P1)

**Goal**: User selectors show only admin-configured models, no OpenRouter calls

**Independent Test**: As non-admin user, open AI assistant and verify only configured models appear

### Implementation for User Story 3

- [X] T025 [US3] Modify GET `/chat/models` endpoint to return from `visible_text_models` config in backend/routers/chat.py
- [X] T026 [P] [US3] Modify GET `/image-generation/models` endpoint to return from `visible_image_models` config in backend/routers/image_generation.py
- [X] T027 [US3] Remove OpenRouter API call from chat models endpoint in backend/routers/chat.py
- [X] T028 [P] [US3] Remove OpenRouter API call from image models endpoint in backend/routers/image_generation.py
- [X] T029 [US3] Add model name formatting (convert ID to display name) in backend/routers/chat.py
- [X] T030 [P] [US3] Add model name formatting for image models in backend/routers/image_generation.py
- [ ] T031 [US3] Verify ChatSidebar displays filtered models correctly in frontend/src/components/ChatSidebar.tsx
- [ ] T032 [P] [US3] Verify ImageGenerationPanel displays filtered models correctly in frontend/src/components/ImageGenerationPanel.tsx

**Checkpoint**: All user-facing model selectors show only admin-configured models

---

## Phase 6: User Story 4 - Remove Workspace Recommended Models (Priority: P2)

**Goal**: Remove "Modelos Recomendados" section from workspace settings

**Independent Test**: Access workspace settings and verify the section is gone

### Implementation for User Story 4

- [X] T033 [US4] Remove "Modelos Recomendados" section from workspace settings in frontend/src/app/workspace/[id]/settings/page.tsx
- [X] T034 [US4] Remove related state variables for `availableModels` if unused in frontend/src/app/workspace/[id]/settings/page.tsx
- [X] T035 [US4] Remove API calls for fetching models in workspace settings if unused in frontend/src/app/workspace/[id]/settings/page.tsx
- [X] T036 [US4] Update workspace settings page layout after section removal in frontend/src/app/workspace/[id]/settings/page.tsx

**Checkpoint**: Workspace settings simplified - all user stories complete

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T037 [P] Add loading states for model lists in admin UI in frontend/src/app/admin/models/page.tsx
- [ ] T038 [P] Add error handling for OpenRouter API failures in admin panel in frontend/src/app/admin/models/page.tsx
- [ ] T039 Add minimum selection validation (at least 1 model) in admin UI in frontend/src/app/admin/models/page.tsx
- [ ] T040 [P] Add search/filter functionality for model lists in admin in frontend/src/app/admin/models/page.tsx
- [ ] T041 Add model count display in tab headers in frontend/src/app/admin/models/page.tsx
- [ ] T042 Run manual validation per quickstart.md checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001-T003)
- **User Story 1-3 (Phases 3-5)**: All depend on Foundational (Phase 2) completion
  - US1, US2, US3 are all P1 - implement sequentially for stability
- **User Story 4 (Phase 6)**: Can run in parallel with US1-3, but cleaner to do after
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Backend → Admin UI text tab → Verification
- **User Story 2 (P1)**: Backend → Admin UI image tab → Verification (parallel to US1 after backend)
- **User Story 3 (P1)**: Depends on US1 and US2 backend being complete (reads from config)
- **User Story 4 (P2)**: Independent - can be done anytime after Foundational

### Within Each User Story

- Backend changes before frontend changes
- API updates before UI components
- Core implementation before validation/polish

### Parallel Opportunities

- T002, T003 can run in parallel (both modify schemas.py but different schemas)
- T004, T005 and T006, T007 can run in pairs (different methods)
- T013, T020 can run in parallel (different TypeScript types)
- T025, T026 and T027, T028 can run in parallel (different router files)
- T031, T032 can run in parallel (different frontend components)
- T037, T038, T040 can run in parallel (different aspects of admin UI)

---

## Parallel Example: Phase 2 (Foundational)

```bash
# First batch - add getter methods:
Task: "T004 Add get_visible_text_models() method"
Task: "T005 Add get_visible_image_models() method"

# Second batch - add setter methods:
Task: "T006 Add update_visible_text_models() method"
Task: "T007 Add update_visible_image_models() method"

# Then sequential:
Task: "T008 Add backward compatibility"
Task: "T009 Add cache invalidation"
```

---

## Parallel Example: User Story 3 (Backend)

```bash
# Launch chat and image router changes together:
Task: "T025 Modify GET /chat/models endpoint"
Task: "T026 Modify GET /image-generation/models endpoint"

# Launch OpenRouter removal together:
Task: "T027 Remove OpenRouter call from chat"
Task: "T028 Remove OpenRouter call from image"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T009)
3. Complete Phase 3: User Story 1 (T010-T017)
4. **STOP and VALIDATE**: Test admin text model configuration
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Admin can configure text models → Deploy
3. Add User Story 2 → Admin can configure image models → Deploy
4. Add User Story 3 → Users see filtered models → Deploy
5. Add User Story 4 → Workspace settings simplified → Deploy
6. Polish → Final refinements

### Recommended Order

Since US1, US2, US3 are all P1 and interconnected:
1. Complete Setup + Foundational
2. Complete US1 + US2 (admin configuration)
3. Complete US3 (user-facing changes) - depends on admin config being ready
4. Complete US4 (cleanup)
5. Polish

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Backend changes MUST be deployed/tested before frontend changes
- No OpenRouter calls from user-facing endpoints after US3
- Backward compatibility handled via automatic migration of old `visible_models` key
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
