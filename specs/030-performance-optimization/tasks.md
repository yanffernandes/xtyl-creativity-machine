# Tasks: Performance Optimization & System Speed Improvements

**Input**: Design documents from `/specs/030-performance-optimization/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/redis-keys.md

**Tests**: No test tasks included (not explicitly requested in specification).

**Organization**: Tasks grouped by user story to enable independent implementation and validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US5)
- File paths relative to repository root

---

## Phase 1: Setup (Dependencies & Infrastructure)

**Purpose**: Add new dependencies and infrastructure required by all stories

- [x]T001 Add Redis service to docker-compose.yml with healthcheck
- [x]T002 [P] Add redis and aioredis packages to backend/requirements.txt
- [x]T003 [P] Add @tanstack/react-virtual package to frontend/package.json
- [x]T004 [P] Add REDIS_URL environment variable to .env.example

**Checkpoint**: All dependencies installed and Redis running locally

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST complete before user story work begins

**⚠️ CRITICAL**: Database indexes and Redis service are shared dependencies

### Database Indexes (FR-013 to FR-017)

- [x]T005 Create migration file supabase/migrations/034_performance_indexes.sql
- [x]T006 Add idx_documents_context index (project_id, is_context) WHERE deleted_at IS NULL
- [x]T007 [P] Add idx_documents_original_image index (original_image_id) WHERE deleted_at IS NULL
- [x]T008 [P] Add idx_documents_reference_asset index (project_id, is_reference_asset) WHERE deleted_at IS NULL
- [x]T009 [P] Add idx_attachments_image index on document_attachments(image_id)
- [x]T010 [P] Add idx_documents_share_token index (share_token) WHERE is_public = TRUE
- [x]T011 Apply migration with supabase db push (or equivalent)

### Redis Service (FR-026 Foundation)

- [x]T012 Create Redis client module in backend/services/redis_service.py
- [x]T013 Implement get_redis() async connection factory with connection pooling
- [x]T014 Add Redis health check to backend startup

### Query Key Consolidation (FR-002)

- [x]T015 Remove documentKeys export from frontend/src/hooks/use-documents.ts
- [x]T016 Update all imports to use queryKeys from frontend/src/lib/query-keys.ts
- [x]T017 Verify no remaining references to documentKeys (grep check)

### UI Store Foundation (FR-007)

- [x]T018 Create Zustand UI store in frontend/src/lib/stores/ui-store.ts
- [x]T019 Define ModalState interface with all 8 modal flags
- [x]T020 Implement openModal, closeModal, closeAllModals actions
- [x]T021 Add editingTitle and pendingNavigation state

**Checkpoint**: Foundation ready - indexes applied, Redis connected, query keys consolidated, UI store created

---

## Phase 3: User Story 1 - Faster Page Navigation (Priority: P1) 🎯 MVP

**Goal**: Page transitions feel instant using cached data with stale-while-revalidate pattern

**Independent Test**: Navigate between Kanban and Studio views repeatedly; verify <200ms render time using cached data

### React Query Configuration (FR-001, FR-004)

- [x]T022 [US1] Configure QueryClient defaults with gcTime: 30 minutes in frontend/src/app/providers.tsx
- [x]T023 [US1] Set staleTime: 15 seconds for document queries in frontend/src/hooks/use-documents.ts
- [x]T024 [US1] Add refetchOnWindowFocus: false to prevent unnecessary refetches

### Specific Cache Invalidation (FR-003)

- [x]T025 [US1] Update useCreateDocument to invalidate only queryKeys.documents.byProject(projectId) in frontend/src/hooks/use-documents.ts
- [x]T026 [P] [US1] Update useUpdateDocument to invalidate specific document + project list only
- [x]T027 [P] [US1] Update useMoveDocument to invalidate affected folder queries only
- [x]T028 [P] [US1] Update useArchiveDocument to invalidate specific project list only
- [x]T029 [US1] Update useImageStudio attach function to use correct query key in frontend/src/hooks/useImageStudio.ts

**Checkpoint**: User Story 1 complete - navigation uses cached data, proper invalidation on mutations

---

## Phase 4: User Story 2 - Responsive Image Generation Interface (Priority: P1)

**Goal**: UI remains responsive during image generation with controlled API concurrency

**Independent Test**: Generate 4+ images while scrolling and clicking UI; verify no freezes or frame drops

### Component Memoization (FR-005)

- [x]T030 [P] [US2] Wrap VariationCard with React.memo() in frontend/src/components/image-studio/VariationCard.tsx
- [x]T031 [P] [US2] Wrap StylePresetCard with React.memo() in frontend/src/components/image-studio/StylePresetCard.tsx
- [x]T032 [P] [US2] Wrap DocumentFilters with React.memo() in frontend/src/components/document/DocumentFilters.tsx

### API Rate Limiting (FR-021, FR-022, FR-023)

- [x]T033 [US2] Create asyncio.Semaphore(3) for fal.ai concurrency in backend/routers/image_generation.py
- [x]T034 [US2] Wrap generate_batch_variation with semaphore acquire/release
- [x]T035 [US2] Implement exponential backoff retry (max 3 attempts) for rate-limited responses
- [x]T036 [US2] Update batch endpoint to queue excess requests instead of failing

### Image Grid Virtualization (FR-012)

- [x]T037 [US2] Import useVirtualizer from @tanstack/react-virtual in frontend/src/components/image-studio/VariationGrid.tsx
- [x]T038 [US2] Add scrollRef for scroll container in VariationGrid
- [x]T039 [US2] Configure virtualizer with estimateSize and overscan options
- [x]T040 [US2] Update grid rendering to use virtualizer.getVirtualItems()

**Checkpoint**: User Story 2 complete - UI responsive during generation, controlled API concurrency, smooth scrolling

---

## Phase 5: User Story 3 - Fast Document List Loading (Priority: P2)

**Goal**: Document list loads quickly even with 100+ documents using optimized queries

**Independent Test**: Open project with 100+ documents; verify <2 second time to interactive

### N+1 Query Fix (FR-018)

- [x]T041 [US3] Refactor document status sync in backend/crud.py to use bulk update
- [x]T042 [US3] Replace iterative attachment queries with single JOIN query
- [x]T043 [US3] Add EXPLAIN ANALYZE verification comment for optimized query

### Combined Queries (FR-019)

- [x]T044 [US3] Combine count() and data fetch in list_project_media endpoint in backend/routers/documents.py
- [x]T045 [US3] Use window function COUNT(*) OVER() for pagination metadata

### SQL Subqueries (FR-020)

- [x]T046 [US3] Refactor soft_delete_project to use subquery instead of ID list in backend/crud.py
- [x]T047 [US3] Refactor folder hierarchy check to use recursive CTE or limit depth

**Checkpoint**: User Story 3 complete - document queries optimized, <50ms execution time

---

## Phase 6: User Story 4 - Efficient Image Display (Priority: P2)

**Goal**: Images load progressively with lazy loading and proper thumbnail usage

**Independent Test**: Scroll through gallery with 20+ images; verify visible images load first

### Next.js Image Component (FR-009)

- [x]T048 [P] [US4] Replace img tag with Image component in frontend/src/components/image-studio/ReferenceAssetSelector.tsx
- [x]T049 [P] [US4] Replace img tag with Image component in frontend/src/components/image-studio/EditMode.tsx
- [x]T050 [P] [US4] Replace img tag with Image component in frontend/src/components/image-studio/GenerationSummary.tsx
- [x]T051 [P] [US4] Replace img tag with Image component in frontend/src/components/image-studio/AdjustMode.tsx

### Lazy Loading (FR-010)

- [x]T052 [US4] Add loading="lazy" prop to all non-priority Image components
- [x]T053 [US4] Keep loading="eager" only for above-fold images (first 4-6 visible)

### Thumbnail Usage (FR-011)

- [x]T054 [US4] Update VariationCard to use thumbnail_url for grid view in frontend/src/components/image-studio/VariationCard.tsx
- [x]T055 [US4] Update DocumentAttachments to use thumbnail_url for grid view in frontend/src/components/document/DocumentAttachments.tsx
- [x]T056 [US4] Ensure full file_url used only in ImageExpandModal and detail views

**Checkpoint**: User Story 4 complete - images load progressively, thumbnails used appropriately

---

## Phase 7: User Story 5 - Reliable Batch Progress Tracking (Priority: P3)

**Goal**: Batch progress persists across page refresh and multiple browser tabs

**Independent Test**: Start generation, open new tab, refresh page; verify consistent progress

### Redis Batch Progress (FR-026)

- [x]T057 [US5] Implement create_batch() function in backend/services/redis_service.py
- [x]T058 [US5] Implement update_image_status() function with HINCRBY for counters
- [x]T059 [US5] Implement get_batch_status() function returning progress and images
- [x]T060 [US5] Add TTL (3600s) to all batch keys

### Integration with Image Generation

- [x]T061 [US5] Update generate_batch endpoint to call create_batch() on start in backend/routers/image_generation.py
- [x]T062 [US5] Update generate_batch_variation to call update_image_status() on completion
- [x]T063 [US5] Update SSE event_generator to read from Redis instead of in-memory dict

### Async Thumbnail Generation (FR-024, FR-025)

- [x]T064 [US5] Create async generate_and_update_thumbnail() function in backend/storage_service.py
- [x]T065 [US5] Use asyncio.create_task() for fire-and-forget thumbnail generation
- [x]T066 [US5] Update create_image_document to return immediately before thumbnail ready

**Checkpoint**: User Story 5 complete - batch progress reliable across tabs and refreshes

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories and final cleanup

### State Consolidation (FR-007, FR-008)

- [x]T067 Migrate modal useState calls to UI store in frontend/src/app/workspace/[id]/project/[projectId]/page.tsx
- [x]T068 Replace showAssetsModal, showArchiveModal, etc. with useUIStore selectors
- [x]T069 Consolidate editingTitle and tempTitle state into UI store
- [x]T070 Remove redundant useState calls (target: reduce from 33 to <15)

### Dynamic Imports (FR-006)

- [x]T071 [P] Add dynamic import for AssetsModal in page.tsx
- [x]T072 [P] Add dynamic import for ArchiveModal in page.tsx
- [x]T073 [P] Add dynamic import for ActivityModal in page.tsx
- [x]T074 [P] Add dynamic import for SettingsModal in page.tsx
- [x]T075 Add prefetch hints for commonly-used modals

### Performance Monitoring

- [x]T076 Verify Sentry performance monitoring captures navigation timing
- [x]T077 Add Sentry transaction for document list loading
- [x]T078 Add Sentry transaction for image generation batch

### Documentation

- [x]T079 [P] Update CLAUDE.md with Redis dependency note
- [x]T080 Run quickstart.md verification checklist

**Checkpoint**: All optimizations complete, performance validated via Sentry

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundational) → Phases 3-7 (User Stories) → Phase 8 (Polish)
                         ↓
              BLOCKS all user stories
```

### User Story Dependencies

| Story | Priority | Can Start After | Dependencies on Other Stories |
|-------|----------|-----------------|------------------------------|
| US1 - Page Navigation | P1 | Phase 2 complete | None |
| US2 - Responsive Generation | P1 | Phase 2 complete | None |
| US3 - Fast Document Loading | P2 | Phase 2 complete | None (indexes in Phase 2) |
| US4 - Efficient Image Display | P2 | Phase 2 complete | None |
| US5 - Batch Progress | P3 | Phase 2 complete | None (Redis in Phase 2) |

**Note**: All user stories are designed to be independently implementable after Phase 2.

### Within Each User Story

1. Backend changes before frontend changes (when both exist)
2. Core implementation before integration
3. Single responsibility per task

---

## Parallel Opportunities

### Phase 2 Parallel Tasks

```bash
# Run in parallel (different files):
T007, T008, T009, T010  # Index creation (different indexes)
T015, T016              # Query key migration (different files)
```

### User Story 2 Parallel Tasks

```bash
# Run in parallel (different components):
T030, T031, T032  # Component memoization (different files)
```

### User Story 4 Parallel Tasks

```bash
# Run in parallel (different components):
T048, T049, T050, T051  # Image component replacements (different files)
```

### Polish Phase Parallel Tasks

```bash
# Run in parallel (different modals):
T071, T072, T073, T074  # Dynamic imports (different components)
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (dependencies)
2. Complete Phase 2: Foundational (indexes, Redis, query keys, UI store)
3. Complete Phase 3: User Story 1 (page navigation)
4. Complete Phase 4: User Story 2 (responsive generation)
5. **STOP and VALIDATE**: Test navigation and generation independently
6. Deploy/demo - core performance improvements delivered

### Incremental Delivery

| Increment | Stories | Value Delivered |
|-----------|---------|-----------------|
| MVP | US1 + US2 | Fast navigation, responsive UI during generation |
| +1 | US3 | Fast document list loading |
| +2 | US4 | Progressive image loading |
| +3 | US5 | Reliable progress tracking |
| Polish | - | State consolidation, dynamic imports |

### Estimated Task Counts

| Phase | Tasks | Parallel Opportunities |
|-------|-------|----------------------|
| Setup | 4 | 3 |
| Foundational | 17 | 8 |
| US1 (P1) | 8 | 3 |
| US2 (P1) | 11 | 3 |
| US3 (P2) | 7 | 0 |
| US4 (P2) | 9 | 4 |
| US5 (P3) | 10 | 0 |
| Polish | 14 | 5 |
| **Total** | **80** | **26** |

---

## Notes

- [P] tasks can run in parallel (different files, no dependencies)
- [US#] label maps task to specific user story
- Each user story is independently completable and testable after Phase 2
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
- Success criteria from spec.md should be verified at each checkpoint
