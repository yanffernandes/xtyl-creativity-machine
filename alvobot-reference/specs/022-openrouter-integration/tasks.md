# Tasks: OpenRouter Integration for AI Models

**Input**: Design documents from `/specs/022-openrouter-integration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested in specification - test tasks not included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- **Migrations**: `supabase/migrations/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and shared types

- [x] T001 Install @openrouter/sdk dependency in backend/package.json
- [x] T002 [P] Add OPENROUTER_API_KEY to backend/.env.example
- [x] T003 [P] Create shared AI provider types in backend/src/common/types/ai-provider.types.ts
- [x] T004 [P] Create shared AI provider types in frontend/src/shared/types/ai-provider.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema and OpenRouter service module that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create database migration for system_prompts table changes in supabase/migrations/20260109_openrouter_integration.sql
- [x] T006 Create platform_settings table and seed default_image_model in supabase/migrations/20260109_openrouter_integration.sql
- [x] T007 Create OpenRouter module structure in backend/src/modules/openrouter/openrouter.module.ts
- [x] T008 [P] Create OpenRouter DTOs in backend/src/modules/openrouter/dto/openrouter.dto.ts
- [x] T009 Implement OpenRouterService with SDK client initialization in backend/src/modules/openrouter/openrouter.service.ts
- [x] T010 Add fetchModels method with 5-minute caching to backend/src/modules/openrouter/openrouter.service.ts
- [x] T011 Add validateApiKey method to backend/src/modules/openrouter/openrouter.service.ts
- [x] T012 Add chatCompletion method for text generation to backend/src/modules/openrouter/openrouter.service.ts
- [x] T013 Register OpenRouterModule in backend/src/app.module.ts

**Checkpoint**: Foundation ready - OpenRouter service operational, database schema updated

---

## Phase 3: User Story 1 - Admin Configures AI Provider for System Prompts (Priority: P1) 🎯 MVP

**Goal**: Enable admin to select OpenAI or OpenRouter provider and model when creating/editing system prompts

**Independent Test**: Admin can create a prompt with OpenRouter provider, select a model, and test it successfully

### Backend Implementation for User Story 1

- [x] T014 [US1] Add GET /admin/openrouter/models endpoint to backend/src/modules/admin/admin.controller.ts
- [x] T015 [US1] Add POST /admin/openrouter/validate-key endpoint to backend/src/modules/admin/admin.controller.ts
- [x] T016 [US1] Extend TestPromptDto with provider and model fields in backend/src/modules/admin/dto/test-prompt.dto.ts
- [x] T017 [US1] Update testPrompt method in AdminService to route to OpenRouter or OpenAI based on provider in backend/src/modules/admin/admin.service.ts
- [x] T018 [US1] Update system prompt CRUD operations to handle provider and provider_model fields in backend/src/modules/admin/admin.service.ts

### Frontend Implementation for User Story 1

- [x] T019 [P] [US1] Extend SystemPrompt types with provider fields in frontend/src/features/admin/types/index.ts
- [x] T020 [P] [US1] Add useOpenRouterModels query hook in frontend/src/features/admin/api/queries.ts
- [x] T021 [P] [US1] Add useValidateOpenRouterKey query hook in frontend/src/features/admin/api/queries.ts
- [x] T022 [US1] Add provider selector dropdown to AdminSystemPromptsPage in frontend/src/features/admin/pages/AdminSystemPromptsPage.tsx
- [x] T023 [US1] Add dynamic model dropdown based on selected provider in frontend/src/features/admin/pages/AdminSystemPromptsPage.tsx
- [x] T024 [US1] Update prompt test functionality to pass provider and model in frontend/src/features/admin/pages/AdminSystemPromptsPage.tsx
- [x] T025 [US1] Conditionally hide OpenRouter option if API key not configured in frontend/src/features/admin/pages/AdminSystemPromptsPage.tsx

**Checkpoint**: Admin can configure and test system prompts with either OpenAI or OpenRouter

---

## Phase 4: User Story 2 - Admin Configures Default Image Generation Model (Priority: P2)

**Goal**: Enable admin to set the platform-wide default image generation model from admin settings

**Independent Test**: Admin can select an OpenRouter image model in settings, and the setting persists

### Backend Implementation for User Story 2

- [ ] T026 [US2] Add GET /admin/settings/image-model endpoint in backend/src/modules/admin/admin.controller.ts
- [ ] T027 [US2] Add PUT /admin/settings/image-model endpoint in backend/src/modules/admin/admin.controller.ts
- [ ] T028 [US2] Create DefaultImageModelDto in backend/src/modules/admin/dto/image-model.dto.ts
- [ ] T029 [US2] Implement getDefaultImageModel method in backend/src/modules/admin/admin.service.ts
- [ ] T030 [US2] Implement setDefaultImageModel method in backend/src/modules/admin/admin.service.ts
- [ ] T031 [US2] Add filterModels method to OpenRouterService for image-capable models in backend/src/modules/openrouter/openrouter.service.ts

### Frontend Implementation for User Story 2

- [ ] T032 [P] [US2] Add PlatformSettings type in frontend/src/features/admin/types/index.ts
- [ ] T033 [P] [US2] Add useDefaultImageModel query hook in frontend/src/features/admin/api/queries.ts
- [ ] T034 [P] [US2] Add useUpdateDefaultImageModel mutation hook in frontend/src/features/admin/api/mutations.ts
- [ ] T035 [US2] Add Image Generation Model configuration section to AdminSettingsPage in frontend/src/features/admin/pages/AdminSettingsPage.tsx
- [ ] T036 [US2] Implement provider/model selector with OpenAI, Google, and OpenRouter options in frontend/src/features/admin/pages/AdminSettingsPage.tsx

**Checkpoint**: Admin can configure platform-wide default image model, visible in settings

---

## Phase 5: User Story 3 - User Generates Images with Admin-Configured Model (Priority: P3)

**Goal**: Users generating images in AlvoAds Meta automatically use the admin-configured model

**Independent Test**: User generates image in AlvoAds Meta, and it uses the admin-configured OpenRouter model (visible in creative library details)

### Backend Implementation for User Story 3

- [x] T037 [US3] Add generateImage method to OpenRouterService using chat completions with modalities in backend/src/modules/openrouter/openrouter.service.ts
- [x] T038 [US3] Extend AiCreativeService to read default image model from platform_settings in backend/src/modules/meta/services/ai-creative.service.ts
- [x] T039 [US3] Add OpenRouter image generation path to AiCreativeService in backend/src/modules/meta/services/ai-creative.service.ts
- [x] T040 [US3] Implement fallback to DALL-E-3 when OpenRouter fails in backend/src/modules/meta/services/ai-creative.service.ts
- [x] T041 [US3] Update creative library save to store full model identifier in backend/src/modules/meta/services/ai-creative.service.ts

### Frontend Implementation for User Story 3

- [x] T042 [US3] Ensure image generation request passes through without model selection in frontend/src/features/alvoads-meta/pages/AlvoAdsMetaPage.tsx
- [x] T043 [US3] Display model_used in creative library image details in frontend/src/features/alvoads-meta/components/wizard/CreativeLibraryModal.tsx

**Checkpoint**: Users can generate images using admin-configured model without any UI changes

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, edge cases, and refinements

- [x] T044 [P] Add error handling for OpenRouter API unavailability (503) in backend/src/modules/openrouter/openrouter.service.ts
- [x] T045 [P] Add user-friendly error messages for common OpenRouter errors in frontend/src/features/admin/pages/AdminSystemPromptsPage.tsx
- [x] T046 [P] Add loading states for model dropdown while fetching OpenRouter models in frontend/src/features/admin/pages/AdminSystemPromptsPage.tsx
- [x] T047 Add admin notification when configured image model fails and fallback is used in backend/src/modules/meta/services/ai-creative.service.ts
- [ ] T048 Run quickstart.md validation steps to verify integration

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - US1 (Phase 3): Independent, can start immediately after Phase 2
  - US2 (Phase 4): Independent, can start immediately after Phase 2
  - US3 (Phase 5): Depends on US2 (needs default image model configuration)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational
    ↓
    ├── US1 (Phase 3): System Prompts [Independent]
    │
    ├── US2 (Phase 4): Image Model Config [Independent]
    │       ↓
    └── US3 (Phase 5): Image Generation [Depends on US2]
            ↓
        Phase 6: Polish
```

### Within Each User Story

- Backend before frontend (APIs must exist before UI consumes them)
- Types/DTOs before service methods
- Service methods before controller endpoints
- Queries before UI components that use them

### Parallel Opportunities

**Phase 1 (Setup)**:
- T002, T003, T004 can run in parallel

**Phase 2 (Foundational)**:
- T008 can run in parallel with T007
- T009-T012 must be sequential (building on each other)

**Phase 3 (US1)**:
- T019, T020, T021 can run in parallel (after backend complete)

**Phase 4 (US2)**:
- T032, T033, T034 can run in parallel (after backend complete)

**Phase 6 (Polish)**:
- T044, T045, T046 can all run in parallel

---

## Parallel Example: User Story 1 Frontend

```bash
# After backend tasks T014-T018 are complete, launch in parallel:
Task: "Extend SystemPrompt types in frontend/src/features/admin/types/index.ts"
Task: "Add useOpenRouterModels query hook in frontend/src/features/admin/api/queries.ts"
Task: "Add useValidateOpenRouterKey query hook in frontend/src/features/admin/api/queries.ts"

# Then sequential UI tasks:
Task: "Add provider selector dropdown to AdminSystemPromptsPage"
Task: "Add dynamic model dropdown based on selected provider"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test admin can configure and test prompts with OpenRouter
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → OpenRouter service ready
2. Add User Story 1 → Test independently → Deploy (Admin can use OpenRouter for prompts)
3. Add User Story 2 → Test independently → Deploy (Admin can configure image model)
4. Add User Story 3 → Test independently → Deploy (Users generate images with configured model)

### Suggested MVP Scope

**MVP = Setup + Foundational + User Story 1**

This delivers:
- OpenRouter as a provider option for system prompts
- Admin can select and test prompts with any OpenRouter model
- Existing OpenAI functionality unchanged

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
