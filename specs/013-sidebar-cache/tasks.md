# Tasks: Sidebar Cache with Loading Indicator

**Input**: Design documents from `/specs/013-sidebar-cache/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Not included (manual testing specified in plan.md)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/` (frontend-only feature)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create cache utilities and TypeScript interfaces

- [x] T001 [P] Create cache storage interfaces and types in `frontend/src/lib/sidebar-cache.ts`
- [x] T002 [P] Implement localStorage load/save utilities with JSON parsing in `frontend/src/lib/sidebar-cache.ts`
- [x] T003 Implement LRU eviction logic (max 10 workspaces) in `frontend/src/lib/sidebar-cache.ts`
- [x] T004 Implement quota exceeded handling with graceful degradation in `frontend/src/lib/sidebar-cache.ts`
- [x] T005 Export public API functions (getSidebarCache, setSidebarCache, clearSidebarCache, clearAllSidebarCache) in `frontend/src/lib/sidebar-cache.ts`

**Checkpoint**: Cache utilities complete - hook implementation can begin

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the custom hook that manages cache + background refresh

**⚠️ CRITICAL**: User Story implementation depends on this hook

- [x] T006 Create useSidebarCache hook skeleton with TypeScript interface in `frontend/src/hooks/use-sidebar-cache.ts`
- [x] T007 Implement initial state loading from localStorage cache in `frontend/src/hooks/use-sidebar-cache.ts`
- [x] T008 Implement background refresh logic using existing useProjects and useWorkspace hooks in `frontend/src/hooks/use-sidebar-cache.ts`
- [x] T009 Implement fetchProjectsWithDocs helper to fetch documents for all projects in `frontend/src/hooks/use-sidebar-cache.ts`
- [x] T010 Implement cache save on successful refresh in `frontend/src/hooks/use-sidebar-cache.ts`
- [x] T011 Implement workspace change handling (load new cache, trigger refresh) in `frontend/src/hooks/use-sidebar-cache.ts`
- [x] T012 Export hook with return type: workspace, projects, isRefreshing, isInitialLoad, refresh, invalidate in `frontend/src/hooks/use-sidebar-cache.ts`

**Checkpoint**: Hook ready - WorkspaceSidebar integration can begin

---

## Phase 3: User Story 1 - Instant Sidebar Load (Priority: P1) 🎯 MVP

**Goal**: Display cached sidebar data instantly on page navigation without loading state

**Independent Test**: Navigate between pages in workspace - sidebar should appear instantly from cache before network request completes

### Implementation for User Story 1

- [x] T013 [US1] Import useSidebarCache hook in `frontend/src/components/WorkspaceSidebar.tsx`
- [x] T014 [US1] Replace useProjects/useWorkspace direct calls with useSidebarCache hook in `frontend/src/components/WorkspaceSidebar.tsx`
- [x] T015 [US1] Update component to use cached workspace data for header display in `frontend/src/components/WorkspaceSidebar.tsx`
- [x] T016 [US1] Update component to use cached projects array (projectsWithDocs) in `frontend/src/components/WorkspaceSidebar.tsx`
- [x] T017 [US1] Remove redundant fetchDocumentsForProjects effect (now handled by hook) in `frontend/src/components/WorkspaceSidebar.tsx`
- [x] T018 [US1] Add isInitialLoad check to show loading skeleton only on first load (no cache) in `frontend/src/components/WorkspaceSidebar.tsx`

**Checkpoint**: User Story 1 complete - sidebar loads instantly from cache, shows skeleton only on first visit

---

## Phase 4: User Story 2 - Visual Refresh Indicator (Priority: P2)

**Goal**: Show small loading indicator next to "Projetos" during background refresh

**Independent Test**: Navigate to page and observe spinner next to "Projetos" while data refreshes in background

### Implementation for User Story 2

- [x] T019 [US2] Import Loader2 icon from lucide-react in `frontend/src/components/WorkspaceSidebar.tsx`
- [x] T020 [US2] Add isRefreshing state from useSidebarCache to component in `frontend/src/components/WorkspaceSidebar.tsx`
- [x] T021 [US2] Update "Projetos" header to include flex container with gap for indicator in `frontend/src/components/WorkspaceSidebar.tsx`
- [x] T022 [US2] Add conditional Loader2 spinner (h-3 w-3 animate-spin) when isRefreshing is true in `frontend/src/components/WorkspaceSidebar.tsx`
- [x] T023 [US2] Style indicator with text-muted-foreground for subtle appearance in `frontend/src/components/WorkspaceSidebar.tsx`

**Checkpoint**: User Story 2 complete - spinner shows during background refresh, disappears when done

---

## Phase 5: User Story 3 - Seamless Data Updates (Priority: P3)

**Goal**: Update sidebar smoothly when new data arrives without jarring visual jumps

**Independent Test**: Add/remove project elsewhere, navigate in session, observe smooth update without full re-render

### Implementation for User Story 3

- [x] T024 [US3] Wire invalidate function from useSidebarCache to handleRefresh callback in `frontend/src/components/WorkspaceSidebar.tsx`
- [x] T025 [US3] Update ProjectTreeItem onRefresh prop to use invalidate in `frontend/src/components/WorkspaceSidebar.tsx`
- [x] T026 [US3] Ensure React key props are stable (using project.id) to prevent unnecessary re-renders in `frontend/src/components/WorkspaceSidebar.tsx`
- [x] T027 [US3] Add framer-motion AnimatePresence wrapper around project list for smooth enter/exit in `frontend/src/components/WorkspaceSidebar.tsx`
- [x] T028 [US3] Add motion.div with fade animation to individual ProjectTreeItem components in `frontend/src/components/WorkspaceSidebar.tsx`

**Checkpoint**: User Story 3 complete - data updates are smooth with subtle animations

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, cleanup, and validation

- [x] T029 [P] Add console.warn for cache corruption in development mode only in `frontend/src/lib/sidebar-cache.ts`
- [x] T030 [P] Add SSR safety check (typeof window !== 'undefined') to all localStorage operations in `frontend/src/lib/sidebar-cache.ts`
- [x] T031 Remove unused imports and dead code from WorkspaceSidebar after refactor in `frontend/src/components/WorkspaceSidebar.tsx`
- [x] T032 [P] Add JSDoc comments to useSidebarCache hook and exported functions in `frontend/src/hooks/use-sidebar-cache.ts`
- [ ] T033 Run quickstart.md manual test cases to validate all scenarios in browser
- [ ] T034 Test cache persistence across browser refresh and tab close/reopen

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (cache utilities)
- **User Story 1 (Phase 3)**: Depends on Phase 2 (hook must exist)
- **User Story 2 (Phase 4)**: Depends on Phase 3 (component must use hook)
- **User Story 3 (Phase 5)**: Depends on Phase 3 (component must use hook)
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Core functionality - must complete first
- **User Story 2 (P2)**: Can start after US1 - adds loading indicator
- **User Story 3 (P3)**: Can start after US1 - adds smooth animations

Note: US2 and US3 can be implemented in parallel after US1 is complete.

### Within Each Phase

- Setup: T001-T002 parallel, then T003-T004 sequential (depend on base utilities), T005 last
- Foundational: T006 first (skeleton), then T007-T012 sequential (build up hook logic)
- User Stories: Generally sequential within each story (each task builds on previous)

### Parallel Opportunities

- T001 and T002 can run in parallel (different aspects of cache utilities)
- T029 and T030 can run in parallel (independent polish tasks)
- T032 can run in parallel with other polish tasks
- After US1, US2 and US3 can be developed in parallel by different developers

---

## Parallel Example: Setup Phase

```bash
# Launch in parallel:
Task: "Create cache storage interfaces and types in frontend/src/lib/sidebar-cache.ts"
Task: "Implement localStorage load/save utilities with JSON parsing in frontend/src/lib/sidebar-cache.ts"
```

## Parallel Example: After User Story 1

```bash
# Developer A works on US2:
Task: "Import Loader2 icon from lucide-react in frontend/src/components/WorkspaceSidebar.tsx"
Task: "Add conditional Loader2 spinner when isRefreshing is true..."

# Developer B works on US3:
Task: "Wire invalidate function from useSidebarCache to handleRefresh callback..."
Task: "Add framer-motion AnimatePresence wrapper around project list..."
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (cache utilities)
2. Complete Phase 2: Foundational (useSidebarCache hook)
3. Complete Phase 3: User Story 1 (instant sidebar load)
4. **STOP and VALIDATE**: Test cache works - sidebar loads instantly
5. Deploy/demo if ready - core value delivered!

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. Add User Story 1 → **MVP!** Instant sidebar load works
3. Add User Story 2 → Loading indicator shows during refresh
4. Add User Story 3 → Smooth animations on data changes
5. Polish → Production-ready

### Single Developer Strategy

Execute in order: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Estimated time: ~2-3 hours for full implementation

---

## Notes

- All changes are frontend-only (no backend modifications)
- No new npm dependencies required (uses existing lucide-react, framer-motion)
- Cache key is `sidebar-cache-v1` - bump version if schema changes
- LRU eviction keeps max 10 workspaces cached
- Manual testing recommended via quickstart.md test cases
