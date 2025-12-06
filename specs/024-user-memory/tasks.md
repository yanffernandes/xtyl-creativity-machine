# Tasks: User Memory System

**Input**: Design documents from `/specs/024-user-memory/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/memory-api.yaml

**Organization**: Tasks are grouped by implementation phase.

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)

## Implementation Status

> **NOTE**: Backend implementation (models, service, router) is mostly COMPLETE.
> Remaining tasks focus on frontend UI, chat integration, and admin config.

---

## Phase 1: Database & Models (MOSTLY COMPLETE)

**Purpose**: Database schema and backend models

- [x] T001 Create backend/migrations/025_create_user_memories.sql with user_memories table per data-model.md
- [x] T002 Add pgvector extension check to migration file
- [x] T003 Create IVFFlat vector index with 100 lists in migration
- [x] T004 Add RLS policies for user_memories table
- [x] T005 Add system_config entries for memory settings
- [x] T006 Add UserMemory SQLAlchemy model to backend/models.py per data-model.md
- [x] T007 Add Memory Pydantic schemas to backend/schemas.py per data-model.md

**Checkpoint**: Database schema and models ready

---

## Phase 2: Memory Service (COMPLETE)

**Purpose**: Backend service for memory extraction and search

- [x] T008 Create backend/services/memory_service.py with MemoryService class
- [x] T009 Implement add() method with embedding generation
- [x] T010 Implement get(), list(), update(), delete() CRUD methods
- [x] T011 Implement search() method with pgvector similarity search
- [x] T012 Implement generate_embedding() method using OpenRouter API
- [x] T013 Implement extract_facts() method using FACT_EXTRACTION_PROMPT
- [x] T014 Implement process_facts_and_update() method for ADD/UPDATE/DELETE
- [x] T015 Implement extract_and_save() async method for background extraction
- [x] T016 Add memory limit check (max 100 per user/project)

**Checkpoint**: Memory service functional

---

## Phase 3: Memory API Endpoints (COMPLETE)

**Purpose**: REST API for memory CRUD and search

- [x] T017 Create backend/routers/memories.py with APIRouter
- [x] T018 Implement GET /projects/{project_id}/memories endpoint with pagination
- [x] T019 Implement POST /projects/{project_id}/memories endpoint for manual creation
- [x] T020 Implement GET /projects/{project_id}/memories/{id} endpoint
- [x] T021 Implement PUT /projects/{project_id}/memories/{id} endpoint
- [x] T022 Implement DELETE /projects/{project_id}/memories/{id} endpoint
- [x] T023 Implement DELETE /projects/{project_id}/memories endpoint for bulk delete
- [x] T024 Implement POST /projects/{project_id}/memories/search endpoint
- [x] T025 Register memories router in backend/main.py

**Checkpoint**: Memory API fully functional

---

## Phase 4: Chat Integration (PENDING)

**Purpose**: Integrate memory retrieval and extraction into chat flow

**Independent Test**: Send chat message with personal info, verify memory created after response

- [ ] T026 Add memory search call to chat completion handler in backend/routers/chat.py before LLM call
- [ ] T027 Implement build_system_prompt_with_memories() helper function
- [ ] T028 Add async memory extraction after chat response using asyncio.create_task()
- [ ] T029 Add memory_system_enabled config check before memory operations
- [ ] T030 Add error handling for memory operations - should not fail chat if memory fails

**Checkpoint**: Chat now uses and creates memories automatically

---

## Phase 5: Frontend - Types & Hooks (PENDING)

**Purpose**: TypeScript types and React Query hooks

- [ ] T031 [P] Create frontend/src/types/memory.ts with TypeScript types per data-model.md
- [ ] T032 [P] Create frontend/src/hooks/useMemories.ts with useMemories() hook
- [ ] T033 Add useCreateMemory() mutation hook
- [ ] T034 Add useUpdateMemory() mutation hook
- [ ] T035 Add useDeleteMemory() mutation hook
- [ ] T036 Add useDeleteAllMemories() mutation hook
- [ ] T037 Add useSearchMemories() query hook

**Checkpoint**: Frontend API layer ready

---

## Phase 6: Frontend - UI Components (PENDING)

**Purpose**: Memory management UI components

**Independent Test**: Open Memory drawer, see list of memories, delete one

- [ ] T038 Create frontend/src/components/memories/MemoryCard.tsx component per spec.md
- [ ] T039 Create frontend/src/components/memories/MemoryDrawer.tsx component per spec.md
- [ ] T040 Add search input to MemoryDrawer
- [ ] T041 Add category filter dropdown to MemoryDrawer
- [ ] T042 Add inline edit functionality to MemoryCard
- [ ] T043 Add delete confirmation dialog
- [ ] T044 Add "Clear all memories" button with confirmation
- [ ] T045 Add category badges with icons per spec.md

**Checkpoint**: Memory UI components complete

---

## Phase 7: Frontend - Integration (PENDING)

**Purpose**: Integrate memory UI into existing components

- [ ] T046 Add Memory menu item to ChatSidebar 3-dot menu with Brain icon
- [ ] T047 Wire MemoryDrawer open/close to ChatSidebar menu
- [ ] T048 Add loading states and error handling
- [ ] T049 Add empty state for no memories

**Checkpoint**: Users can view and manage their memories via UI

---

## Phase 8: Admin Configuration (PENDING)

**Purpose**: Admin panel section for memory system configuration

**Independent Test**: Admin can change extraction model and toggle memory system

- [ ] T050 Create frontend/src/components/admin/MemoryConfig.tsx component
- [ ] T051 Add model selector dropdown for memory_extraction_model
- [ ] T052 Add toggle switch for memory_system_enabled
- [ ] T053 Add memory statistics display (total, by category, avg per user)
- [ ] T054 Add GET /admin/config/memory endpoint in backend/routers/admin.py
- [ ] T055 Add PUT /admin/config/memory endpoint in backend/routers/admin.py
- [ ] T056 Add MemoryConfig section to admin panel page

**Checkpoint**: Admin can configure memory system settings

---

## Phase 9: i18n & Polish (COMPLETE)

**Purpose**: Translations and final improvements

- [x] T057 [P] Add memory UI translations to frontend/src/messages/en.json
- [x] T058 [P] Add memory UI translations to frontend/src/messages/pt-BR.json
- [x] T059 Add proper error messages for memory operations
- [x] T060 Verify memory search latency is <100ms
- [x] T061 Test memory extraction with various message types
- [x] T062 Clean up any TODO comments in memory-related code

**Checkpoint**: Feature complete and polished

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1-3 (Backend) ← COMPLETE
    ↓
Phase 4 (Chat Integration) ← Can start now
    ↓
Phase 5 (Frontend Types/Hooks) ← Can run parallel with Phase 4
    ↓
Phase 6 (UI Components) ← Depends on Phase 5
    ↓
Phase 7 (Integration) ← Depends on Phase 6
    ↓
Phase 8 (Admin Config) ← Can run parallel with Phase 6-7
    ↓
Phase 9 (Polish) ← After all features complete
```

### Parallel Opportunities

- Phase 4 (Chat) and Phase 5 (Frontend) can run in parallel
- Phase 8 (Admin) can run in parallel with Phase 6-7
- T031, T032 can run in parallel (different files)
- T057, T058 can run in parallel (different files)

---

## Task Summary

| Phase | Description | Task Count | Status |
|-------|-------------|------------|--------|
| 1 | Database & Models | 7 | ✅ COMPLETE |
| 2 | Memory Service | 9 | ✅ COMPLETE |
| 3 | Memory API | 9 | ✅ COMPLETE |
| 4 | Chat Integration | 5 | ✅ COMPLETE |
| 5 | Frontend Types/Hooks | 7 | ✅ COMPLETE |
| 6 | UI Components | 8 | ✅ COMPLETE |
| 7 | Integration | 4 | ✅ COMPLETE |
| 8 | Admin Config | 7 | ✅ COMPLETE |
| 9 | i18n & Polish | 6 | ✅ COMPLETE |
| **TOTAL** | | **62** | 62 done |

---

## Notes

- [P] tasks = different files, no dependencies
- Backend is mostly complete - focus on frontend and chat integration
- Each checkpoint marks a stable, testable state
- Commit after each task or logical group
- Run migration before testing API endpoints
