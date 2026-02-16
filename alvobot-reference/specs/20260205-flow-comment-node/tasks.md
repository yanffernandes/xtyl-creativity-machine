# Tasks: Comment Node & Flow Name Display

**Input**: Design documents from `/specs/20260205-flow-comment-node/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Manual testing only (projeto não possui testes automatizados de frontend)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/features/flows/` (all changes in frontend)

---

## Phase 1: Setup

**Purpose**: No setup needed - existing project with established patterns

> This feature modifies an existing codebase. No project initialization required.

**Checkpoint**: Ready to begin implementation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type definitions shared by subsequent phases

**⚠️ CRITICAL**: Type definitions must be complete before component implementation

- [x] T001 Add 'comment' to MessengerNodeType union in `frontend/src/features/flows/types/index.ts`
- [x] T002 Add CommentNodeData interface in `frontend/src/features/flows/types/index.ts`
- [x] T003 Add CommentNodeData to MessengerNodeData union in `frontend/src/features/flows/types/index.ts`
- [x] T004 Add comment entry to AVAILABLE_NODE_TYPES array in `frontend/src/features/flows/types/index.ts`

**Checkpoint**: Type system ready - component implementation can begin

---

## Phase 3: User Story 1 - Add Comment Node to Flow (Priority: P1) 🎯 MVP

**Goal**: Users can add visual annotation nodes to flows that don't affect execution

**Independent Test**: Create a flow, add a comment node via dock, edit its text, save the flow, reload and verify comment persists. Verify no edges can connect to it.

### Implementation for User Story 1

- [x] T005 [P] [US1] Create CommentNode component in `frontend/src/features/flows/components/nodes/CommentNode.tsx`
- [x] T006 [P] [US1] Add .commentNode styles in `frontend/src/features/flows/components/nodes/nodes.module.css`
- [x] T007 [US1] Export CommentNode and add to nodeTypes registry in `frontend/src/features/flows/components/nodes/index.ts`
- [x] T008 [US1] Add 'comment' to DOCK_ITEMS array in `frontend/src/features/flows/pages/FlowEditorPage.tsx`
- [x] T009 [US1] Add getDefaultNodeData case for 'comment' type in `frontend/src/features/flows/pages/FlowEditorPage.tsx`
- [x] T010 [US1] Add comment node editor section in `frontend/src/features/flows/components/sidebar/NodeEditSidebar.tsx`
- [x] T011 [US1] Skip comment nodes in validateFlow function in `frontend/src/features/flows/utils/validateFlow.ts`

**Checkpoint**: Comment nodes can be added, edited, saved, and loaded. They cannot be connected to other nodes.

---

## Phase 4: User Story 2 - View Flow Name in Call Flow Node (Priority: P1)

**Goal**: Call-flow nodes display the referenced flow's name instead of its UUID

**Independent Test**: Create a flow with a call-flow node, select a target flow, verify the node card shows "Executar: [Flow Name]" instead of the UUID.

### Implementation for User Story 2

- [x] T012 [US2] Create enrichedNodes useMemo to resolve flowName for call-flow nodes in `frontend/src/features/flows/pages/FlowEditorPage.tsx`
- [x] T013 [US2] Pass enrichedNodes to ReactFlow component instead of nodes in `frontend/src/features/flows/pages/FlowEditorPage.tsx`

**Checkpoint**: All call-flow nodes display flow names. Existing behavior preserved for nodes without selected flows.

---

## Phase 5: Polish & Validation

**Purpose**: Final validation and edge case handling

- [x] T014 Verify comment nodes are ignored by backend flow executor (manual test with existing flows)
- [x] T015 Verify existing flows without comment nodes still load correctly (backwards compatibility)
- [x] T016 Run quickstart.md validation checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies - start immediately
- **User Story 1 (Phase 3)**: Depends on Foundational (types must exist)
- **User Story 2 (Phase 4)**: Depends on Foundational only (independent of US1)
- **Polish (Phase 5)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Foundational - No dependencies on US2
- **User Story 2 (P1)**: Depends only on Foundational - No dependencies on US1

### Within Each Phase

**Foundational (T001-T004)**:
- T001 → T002 → T003 → T004 (sequential, same file)

**User Story 1 (T005-T011)**:
- T005 + T006 can run in parallel (different files)
- T007 depends on T005 (needs CommentNode to export)
- T008, T009 can run together (same file but different sections)
- T010 depends on T007 (node type must be registered)
- T011 independent (different file)

**User Story 2 (T012-T013)**:
- T012 → T013 (sequential, same file)

### Parallel Opportunities

Within Phase 3 (User Story 1):
```
# Parallel group 1:
T005: Create CommentNode component
T006: Add .commentNode styles

# After T005 completes:
T007: Export CommentNode in index.ts

# Parallel group 2 (after T007):
T008+T009: FlowEditorPage changes
T010: NodeEditSidebar editor
T011: validateFlow skip logic
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational types
2. Complete Phase 3: User Story 1 (Comment Node)
3. **STOP and VALIDATE**: Test comment node independently
4. Ship Comment Node feature

### Full Feature Delivery

1. Complete Foundational (Phase 2)
2. Complete User Story 1 (Phase 3)
3. Complete User Story 2 (Phase 4)
4. Complete Polish (Phase 5)
5. Ship complete feature

### Parallel Team Strategy

With two developers:
- Both complete Foundational together (small, fast)
- Developer A: User Story 1 (Comment Node)
- Developer B: User Story 2 (Flow Name Display)
- Both stories can proceed in parallel since they touch different parts of the codebase

---

## Task Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| Foundational | T001-T004 | Type definitions |
| User Story 1 | T005-T011 | Comment Node (7 tasks) |
| User Story 2 | T012-T013 | Flow Name Display (2 tasks) |
| Polish | T014-T016 | Validation (3 tasks) |
| **Total** | **16 tasks** | |

---

## Notes

- All files are in `frontend/src/features/flows/`
- No backend changes required
- No database migrations required
- Manual testing only (no automated tests)
- Commit after each task or logical group
- Both user stories are P1 priority but are independent
