# Tasks: Performance Optimization

**Input**: Design documents from `/specs/023-performance-optimization/`
**Prerequisites**: plan.md, spec.md

**Tests**: Not explicitly requested - test tasks omitted (manual testing checklist in spec.md)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `frontend/src/` at repository root
- All changes are frontend-only (no backend changes)

---

## Phase 1: Setup (Minimal - no new infrastructure)

**Purpose**: Verify current state before optimization

- [x] T001 Verify React Query is installed and QueryProvider exists in `frontend/src/components/providers/QueryProvider.tsx`
- [x] T002 [P] Verify api.ts interceptor structure in `frontend/src/lib/api.ts`

**Note**: Feature integrates into existing architecture - minimal setup required.

---

## Phase 2: User Story 1 - Quick Wins React Query (Priority: P0) 🎯 MVP

**Goal**: Aplicação não recarrega dados desnecessariamente ao trocar de aba

**Independent Test**: Trocar de aba do browser e voltar - Network tab não deve mostrar novas requests

### Implementation for User Story 1

- [x] T003 [US1] Update QueryProvider default staleTime from 30s to 5min (5 * 60 * 1000) in `frontend/src/components/providers/QueryProvider.tsx`
- [x] T004 [US1] Disable refetchOnWindowFocus globally (set to false) in `frontend/src/components/providers/QueryProvider.tsx`
- [x] T005 [US1] Disable refetchOnReconnect globally (set to false) in `frontend/src/components/providers/QueryProvider.tsx`
- [x] T006 [US1] Set gcTime (garbage collection) to 30min (30 * 60 * 1000) in `frontend/src/components/providers/QueryProvider.tsx`
- [x] T007 [US1] Set retry to 1 (single retry) in `frontend/src/components/providers/QueryProvider.tsx`
- [x] T008 [US1] Add staleTime override (10min) to useWorkspace hook in `frontend/src/hooks/use-workspaces.ts`
- [x] T009 [US1] Add staleTime override (10min) to useTemplates hook in `frontend/src/hooks/use-templates.ts`
- [x] T010 [US1] SKIPPED - useUserPreferences doesn't use React Query (uses manual state management with built-in caching)
- [x] T011 [US1] Verify existing functionality works - navigate between pages, cache is used

**Checkpoint**: User Story 1 complete - switching tabs no longer triggers refetches

---

## Phase 3: User Story 2 - Session Cache (Priority: P0)

**Goal**: Eliminar overhead de 50-100ms por request causado por getSession()

**Independent Test**: Fazer múltiplos requests rápidos no Network tab - apenas 1 getSession() deve aparecer

### Implementation for User Story 2

- [x] T012 [US2] Create session cache module at `frontend/src/lib/session-cache.ts`
- [x] T013 [US2] Implement SESSION_CACHE_TTL constant (30 * 1000 = 30 seconds) in session-cache.ts
- [x] T014 [US2] Implement getCachedSession() function that checks cache before calling getSession() in session-cache.ts
- [x] T015 [US2] Implement invalidateSessionCache() function to clear cache in session-cache.ts
- [x] T016 [US2] Add auth state change listener (SIGNED_OUT, TOKEN_REFRESHED) to invalidate cache in session-cache.ts
- [x] T017 [US2] Update api.ts request interceptor to import and use getCachedSession() in `frontend/src/lib/api.ts`
- [x] T018 [US2] Test login flow still works correctly
- [x] T019 [US2] Test logout flow clears cache correctly
- [x] T020 [US2] Test multiple rapid API requests share same session (verify in Network tab)

**Checkpoint**: User Story 2 complete - getSession() called only once per 30 seconds

---

## Phase 4: User Story 3 - Query Optimization N+1 (Priority: P1)

**Goal**: Sidebar carrega rapidamente sem N requests para N projetos

**Independent Test**: Load sidebar - Network tab should show ~3 requests instead of N*2

### 4.1 Documents Service Optimization

- [x] T021 [US3] Create listByProjectOptimized() function with Supabase JOIN in `frontend/src/lib/supabase/documents.ts`
- [x] T022 [US3] Add specific field selection (id, title, document_type, created_at, updated_at) instead of select('*')
- [x] T023 [US3] Include document_attachments relation in JOIN query with (id, attachment_type)
- [x] T024 [US3] Include visual_assets nested relation for thumbnails (id, thumbnail_url, file_name)
- [x] T025 [US3] SKIPPED - useDocuments already uses optimized query pattern; listByProjectOptimized available for future use
- [x] T026 [US3] Verify document list displays correctly with new data shape

### 4.2 Sidebar Batch Loading

- [x] T027 [US3] Create fetchAllProjectsDocuments(projectIds: string[]) batch function in `frontend/src/lib/supabase/documents.ts`
- [x] T028 [US3] Implement groupBy utility to organize docs by project_id in documents.ts
- [x] T029 [US3] Add limit(100) to sidebar queries to prevent over-fetching
- [x] T030 [US3] Update use-sidebar-cache.ts to use fetchAllProjectsDocuments() in `frontend/src/hooks/use-sidebar-cache.ts`
- [x] T031 [US3] Verify sidebar displays all projects correctly with batch loading

**Checkpoint**: User Story 3 complete - sidebar loads with minimal requests

---

## Phase 5: User Story 4 - Granular Cache Invalidation (Priority: P2)

**Goal**: Invalidar apenas dados afetados, não todo o cache

**Independent Test**: Create document - only that project's list should refetch, not all projects

### Implementation for User Story 4

- [x] T032 [US4] Create query keys factory at `frontend/src/lib/query-keys.ts`
- [x] T033 [US4] Define queryKeys.workspaces (all, detail) in query-keys.ts
- [x] T034 [US4] Define queryKeys.projects (all, byWorkspace, detail) in query-keys.ts
- [x] T035 [US4] Define queryKeys.documents (all, byProject, detail) in query-keys.ts
- [x] T036 [US4] Define queryKeys.templates (all, byWorkspace) in query-keys.ts
- [x] T037 [US4] Define queryKeys.preferences (all, byUser) in query-keys.ts
- [x] T038 [US4] VERIFIED - useDocuments already implements granular keys (documentKeys.list(projectId))
- [x] T039 [US4] VERIFIED - useProjects already implements granular keys (projectKeys.list(workspaceId))
- [x] T040 [US4] VERIFIED - document mutations already invalidate by project (documentKeys.list(project_id))
- [x] T041 [US4] VERIFIED - project mutations already invalidate by workspace (projectKeys.list(workspace_id))
- [x] T042 [US4] Verify CRUD operations invalidate correct cache entries only

**Checkpoint**: User Story 4 complete - mutations invalidate only affected data

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and metrics

- [x] T043 [P] Add manual refresh button in sidebar header for user-triggered updates in `frontend/src/components/WorkspaceSidebar.tsx`
- [x] T044 [P] Measure before/after Lighthouse performance score
- [x] T045 Test create document flow works correctly
- [x] T046 Test edit document flow works correctly
- [x] T047 Test delete document flow works correctly
- [x] T048 Test conversation history loading in ChatSidebar
- [x] T049 Test workflow execution still works
- [x] T050 Run final Lighthouse audit and document score improvement

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - verification only
- **US1 (Phase 2)**: No dependencies - can start immediately
- **US2 (Phase 3)**: No dependencies - can run in parallel with US1
- **US3 (Phase 4)**: Depends on US1 (uses staleTime settings)
- **US4 (Phase 5)**: Depends on US3 (uses optimized query patterns)
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

```
US1 (Quick Wins) ←── Can start immediately
    ↓
US2 (Session Cache) ←── Can run in parallel with US1
    ↓
US3 (N+1 Elimination) ←── Depends on US1 complete
    ↓
US4 (Cache Invalidation) ←── Depends on US3 complete
    ↓
Polish ←── All stories complete
```

### Parallel Opportunities

**US1 + US2 can run in parallel:**
```bash
# US1 modifies QueryProvider
# US2 modifies API interceptor
# No file conflicts between them
```

**Within US3:**
```bash
# T021-T026 (Documents optimization) can complete before
# T027-T031 (Sidebar batch loading)
```

**Phase 6 parallel tasks:**
```bash
# T043 (refresh button) and T044 (Lighthouse) can run in parallel
```

---

## Summary

| Phase | User Story | Tasks | Estimated Time | Impact |
|-------|------------|-------|----------------|--------|
| Setup | - | 2 | 15 min | Verification |
| Phase 2 | US1: Quick Wins | 9 | 2-3 hours | High - immediate |
| Phase 3 | US2: Session Cache | 9 | 2-3 hours | High - per-request |
| Phase 4 | US3: N+1 Elimination | 11 | 4-6 hours | Very High |
| Phase 5 | US4: Cache Invalidation | 11 | 3-4 hours | Medium |
| Phase 6 | Polish | 8 | 1-2 hours | Verification |
| **Total** | **4 stories** | **50** | **12-18 hours** | |

### Task Breakdown by User Story

- **User Story 1**: 9 tasks (T003-T011) - MVP Quick Wins
- **User Story 2**: 9 tasks (T012-T020) - Session Cache
- **User Story 3**: 11 tasks (T021-T031) - N+1 Elimination
- **User Story 4**: 11 tasks (T032-T042) - Cache Invalidation

### Suggested MVP Scope

Complete through Phase 3 (User Stories 1 + 2) for immediate impact:
- No more refetch on tab switch
- Session cached for 30s
- Immediate perceived performance improvement

This delivers core value in ~20 tasks (T001-T020).

---

## Rollback Plan

Se problemas surgirem após deploy:

1. **US1**: Reverter QueryProvider para valores originais (staleTime: 30s, refetchOnWindowFocus: true)
2. **US2**: Remover session-cache.ts, voltar a usar getSession() direto no api.ts
3. **US3**: Manter funções antigas como fallback, adicionar feature flag
4. **US4**: Query keys são backwards compatible - apenas remover referências

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story builds on previous but can be validated independently
- US1 + US2 can run in parallel (different files)
- Test after each phase before proceeding
- Measure performance before/after each phase to validate impact
