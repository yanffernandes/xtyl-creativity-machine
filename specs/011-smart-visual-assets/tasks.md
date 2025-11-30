# Tasks: Smart Visual Assets

**Input**: Design documents from `/specs/011-smart-visual-assets/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-contracts.yaml

**Tests**: Not requested in spec - manual testing via quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migrations and base infrastructure for visual assets feature

- [x] T001 Create migration file `backend/migrations/015_add_visual_asset_fields.sql` with schema from data-model.md
- [ ] T002 Apply migration to development database via Supabase dashboard or psql
- [x] T003 [P] Add AssetCategory enum and VisualContextMode enum to `backend/schemas.py`
- [x] T004 [P] Add SQLAlchemy models for AssistantVisualSettings, AssistantAssetSelection, AssetUsageHistory to `backend/models.py`
- [x] T005 Extend Document model with asset_category, asset_tags, ai_description columns in `backend/models.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core service and router setup that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create `backend/routers/visual_assets.py` with router initialization and include in `backend/main.py`
- [x] T007 Create `backend/services/visual_asset_service.py` with base class structure and database session handling
- [x] T008 [P] Add visual asset API client functions to `frontend/src/lib/api.ts` (classifyAsset, updateAssetMetadata, getVisualAssets, getVisualAssetsSummary, getVisualSettings, updateVisualSettings, getAssetSelections, updateAssetSelections, getVisualContext, recordAssetUsage)
- [x] T009 [P] Create `frontend/src/components/visual-assets/` directory structure

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Upload com Classificação Automática (Priority: P1) 🎯 MVP

**Goal**: When user uploads a visual asset, AI analyzes the image and suggests category (Logo, Pessoa, Background, Produto, Outro) and tags. User can confirm or edit before saving.

**Independent Test**: Upload an image file, verify AI classification modal appears with suggested category and tags, confirm or edit, verify metadata saved to database.

### Backend Implementation for US1

- [x] T010 [US1] Implement `classify_asset()` function in `backend/services/visual_asset_service.py` using existing vision_service with CLASSIFICATION_PROMPT
- [x] T011 [US1] Add Pydantic schemas for AssetClassificationResult, AssetMetadataUpdate in `backend/schemas.py`
- [x] T012 [US1] Implement `POST /assets/{asset_id}/classify` endpoint in `backend/routers/visual_assets.py` (FR-001, FR-002)
- [x] T013 [US1] Implement `PATCH /assets/{asset_id}/metadata` endpoint in `backend/routers/visual_assets.py` (FR-003, FR-004, FR-005)
- [x] T014 [US1] Add `get_visual_assets()` function to `backend/services/visual_asset_service.py` with category filtering
- [x] T015 [US1] Implement `GET /projects/{project_id}/visual-assets` endpoint in `backend/routers/visual_assets.py`

### Frontend Implementation for US1

- [x] T016 [P] [US1] Create `frontend/src/components/visual-assets/AssetClassificationCard.tsx` - displays AI-suggested category, tags, description with edit capability
- [x] T017 [P] [US1] Create `frontend/src/components/visual-assets/CategoryBadge.tsx` - visual badge for asset categories (Logo, Pessoa, Background, Produto, Outro)
- [x] T018 [US1] Create `frontend/src/components/visual-assets/AssetUploadModal.tsx` - upload flow with classification preview, confirm/edit buttons
- [x] T019 [US1] Enhanced `frontend/src/components/VisualAssetsLibrary.tsx` to trigger classification on upload
- [x] T020 [US1] Added category filter and tags display to assets list in VisualAssetsLibrary.tsx

**Checkpoint**: User Story 1 complete - users can upload images with AI classification

---

## Phase 4: User Story 2 - Configuração do Contexto Visual do Assistente (Priority: P2)

**Goal**: User can configure which visual assets the AI assistant should use automatically in image generations. Toggle on/off, choose manual (select specific assets) or auto mode (rotate assets).

**Independent Test**: Navigate to project settings, enable visual context, switch between manual/auto modes, select assets in manual mode, verify settings persist.

### Backend Implementation for US2

- [x] T021 [US2] Add Pydantic schemas for AssistantVisualSettings, AssistantVisualSettingsUpdate, VisualAssetsSummary in `backend/schemas.py`
- [x] T022 [US2] Add Pydantic schemas for AssetSelection, AssetSelectionList, AssetSelectionUpdate in `backend/schemas.py`
- [x] T023 [US2] Implement `get_or_create_visual_settings()` function in `backend/services/visual_asset_service.py`
- [x] T024 [US2] Implement `update_visual_settings()` function in `backend/services/visual_asset_service.py` with validation
- [x] T025 [US2] Implement `GET /projects/{project_id}/visual-assets/summary` endpoint in `backend/routers/visual_assets.py` (FR-011)
- [x] T026 [US2] Implement `GET /projects/{project_id}/assistant/visual-settings` endpoint in `backend/routers/visual_assets.py` (FR-006, FR-007)
- [x] T027 [US2] Implement `PUT /projects/{project_id}/assistant/visual-settings` endpoint in `backend/routers/visual_assets.py` (FR-006, FR-007, FR-009, FR-010)
- [x] T028 [US2] Implement `get_asset_selections()` and `update_asset_selections()` functions in `backend/services/visual_asset_service.py`
- [x] T029 [US2] Implement `GET /projects/{project_id}/assistant/visual-settings/selections` endpoint in `backend/routers/visual_assets.py` (FR-008)
- [x] T030 [US2] Implement `PUT /projects/{project_id}/assistant/visual-settings/selections` endpoint in `backend/routers/visual_assets.py` (FR-008)

### Frontend Implementation for US2

- [x] T031 [P] [US2] Create `frontend/src/components/visual-assets/VisualContextToggle.tsx` - toggle switch for enabling/disabling visual context
- [x] T032 [P] [US2] Create `frontend/src/components/visual-assets/ModeSelector.tsx` - radio buttons for manual vs auto mode selection
- [x] T033 [P] [US2] Create `frontend/src/components/visual-assets/AssetSelectorGrid.tsx` - checkbox grid for manual asset selection, organized by category
- [x] T034 [P] [US2] Create `frontend/src/components/visual-assets/AutoModeConfig.tsx` - assets-per-category slider (1-5), category summary
- [x] T035 [US2] Create `frontend/src/components/visual-assets/VisualContextSettings.tsx` - combines toggle, mode selector, and mode-specific config
- [x] T036 [US2] Create settings page `frontend/src/app/workspace/[id]/project/[projectId]/settings/visual-context/page.tsx` with VisualContextSettings component
- [x] T037 [US2] Add navigation link to visual context settings in project settings menu

**Checkpoint**: User Story 2 complete - users can configure visual context settings

---

## Phase 5: User Story 3 - Geração de Imagem com Contexto Visual (Priority: P3)

**Goal**: When generating images via chat or modal, the system automatically includes configured visual assets as references. User sees which assets are being used.

**Independent Test**: Configure visual context (US2), request image generation in chat, verify configured assets appear as references, verify generated image reflects visual context.

### Backend Implementation for US3

- [x] T038 [US3] Add Pydantic schemas for VisualContextResponse in `backend/schemas.py`
- [x] T039 [US3] Implement `get_visual_context()` function in `backend/services/visual_asset_service.py` - resolves manual selections or auto picks
- [x] T040 [US3] Implement `GET /projects/{project_id}/assistant/visual-context` endpoint in `backend/routers/visual_assets.py` (FR-012, FR-013, NFR-003)
- [x] T041 [US3] Modify image generation flow in `backend/tools.py` to fetch and inject visual context assets
- [x] T042 [US3] Add visual context asset injection to image generation modal endpoint `backend/routers/image_generation.py`

### Frontend Implementation for US3

- [x] T043 [P] [US3] Create `frontend/src/components/visual-assets/VisualContextPreview.tsx` - shows which assets will be used, with thumbnails
- [x] T044 [US3] Enhanced `frontend/src/components/ImageGenerationPanel.tsx` to fetch and display pre-selected visual context assets
- [x] T045 [US3] Added visual context status indicator to chat input in `frontend/src/components/ChatSidebar.tsx` when visual context is enabled
- [x] T046 [US3] Added toast notification in `ChatSidebar.tsx` showing visual context feedback when generating images with context

**Checkpoint**: User Story 3 complete - image generation uses configured visual assets

---

## Phase 6: User Story 4 - Rotação Inteligente de Assets (Priority: P4)

**Goal**: In auto mode, the system rotates asset selection to avoid repetition. Assets used recently are deprioritized. Logos are always included.

**Independent Test**: Configure auto mode with multiple assets per category, generate 3+ images in sequence, verify different assets are selected (check usage history table).

### Backend Implementation for US4

- [x] T047 [US4] Add Pydantic schema for AssetUsageRecord in `backend/schemas.py`
- [x] T048 [US4] Implement `record_asset_usage()` function in `backend/services/visual_asset_service.py`
- [x] T049 [US4] Implement `POST /projects/{project_id}/assistant/visual-context/record-usage` endpoint in `backend/routers/visual_assets.py` (FR-016)
- [x] T050 [US4] Implement rotation algorithm in `get_visual_context()` - query usage history, prioritize least-recently-used (FR-017)
- [x] T051 [US4] Add logo priority logic to rotation - logos always included first in auto mode (FR-009)
- [x] T052 [US4] Call `record_asset_usage()` after successful image generation in `backend/tools.py` and `backend/routers/image_generation.py`
- [x] T053 [US4] Implement cleanup function `cleanup_old_usage_history()` for asset_usage_history records older than 30 days in `backend/services/visual_asset_service.py` (NFR-004)

**Checkpoint**: User Story 4 complete - auto mode rotates assets intelligently

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, edge cases, and final validation

- [x] T054 [P] File size validation (10MB limit) already implemented in `backend/routers/visual_assets.py` (NFR-005)
- [x] T055 [P] Added asset count validation (100 per project limit) to `backend/routers/visual_assets.py` upload flow (NFR-002)
- [x] T056 Handled AI classification failure gracefully in `AssetUploadModal.tsx` - allows manual classification as fallback with default values
- [x] T057 Loading states and error handling already implemented in frontend components (AssetUploadModal, VisualContextSettings, VisualContextPreview)
- [x] T058 [P] Toast notifications already implemented throughout components (classification, settings save, visual context feedback)
- [ ] T059 Run quickstart.md validation checklist
- [ ] T060 Manual end-to-end testing of all 4 user stories

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 can proceed independently after Phase 2
  - US2 can proceed independently after Phase 2
  - US3 depends on US2 (needs settings to exist)
  - US4 depends on US3 (needs generation flow to exist)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational
    ↓
    ├─→ Phase 3: US1 (Upload Classification) ──┐
    │                                          │
    └─→ Phase 4: US2 (Settings Config) ────────┤
                    ↓                          │
               Phase 5: US3 (Generation) ──────┤
                    ↓                          │
               Phase 6: US4 (Rotation) ────────┤
                                               ↓
                                    Phase 7: Polish
```

### Within Each User Story

- Backend models/schemas before service functions
- Service functions before router endpoints
- Router endpoints before frontend components
- Base components before composed components

### Parallel Opportunities

- All Setup tasks T003-T005 marked [P] can run in parallel
- Foundational tasks T008-T009 marked [P] can run in parallel
- US1 frontend components T016-T017 marked [P] can run in parallel
- US2 frontend components T031-T034 marked [P] can run in parallel
- US1 and US2 can run in parallel after Phase 2
- Polish tasks T054-T055, T058 marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch backend schema/model tasks in sequence:
Task T010: "Implement classify_asset() in backend/services/visual_asset_service.py"
Task T011: "Add schemas for AssetClassificationResult in backend/schemas.py"

# Then launch endpoint tasks:
Task T012: "Implement POST /assets/{asset_id}/classify endpoint"
Task T013: "Implement PATCH /assets/{asset_id}/metadata endpoint"

# Launch frontend components in parallel:
Task T016: "Create AssetClassificationCard.tsx"
Task T017: "Create CategoryBadge.tsx"
```

---

## Parallel Example: User Story 2

```bash
# Launch frontend components in parallel (after backend endpoints ready):
Task T031: "Create VisualContextToggle.tsx"
Task T032: "Create ModeSelector.tsx"
Task T033: "Create AssetSelectorGrid.tsx"
Task T034: "Create AutoModeConfig.tsx"

# Then compose them:
Task T035: "Create VisualContextSettings.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T009)
3. Complete Phase 3: User Story 1 (T010-T020)
4. **STOP and VALIDATE**: Test upload + classification flow
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test classification → Deploy/Demo (MVP!)
3. Add User Story 2 → Test settings → Deploy/Demo
4. Add User Story 3 → Test generation with context → Deploy/Demo
5. Add User Story 4 → Test rotation → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (classification)
   - Developer B: User Story 2 (settings)
3. After US2 backend done:
   - Developer A: Continue frontend polish for US1
   - Developer B: User Story 3 (generation integration)
4. After US3 done:
   - Developer B: User Story 4 (rotation)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Total: 60 tasks across 7 phases
