# Tasks: Workspaces & Project-Based Connections

**Feature**: 016-workspaces-migration
**Generated**: 2025-12-13
**Total Tasks**: 62
**Estimated Duration**: ~11 days

---

## Phase 1: Setup & Preparation

**Goal**: Prepare environment and ensure safe rollback capability

- [ ] T001 Create feature branch `git checkout -b 016-workspaces-migration`
- [ ] T002 Document current RLS policies state in `specs/016-workspaces-migration/current-rls-backup.sql`
- [ ] T003 Create rollback script in `specs/016-workspaces-migration/rollback.sql`
- [ ] T004 [P] Prepare test data set for migration validation

---

## Phase 2: Database Schema (Foundational)

**Goal**: Create database structure without breaking existing system
**Independent Test**: WeWeb continues to function after each step

### 2.1 Create New Tables

- [ ] T005 Create `workspaces` table with all columns and indexes in Supabase SQL Editor
- [ ] T006 Create `workspace_members` table with constraints in Supabase SQL Editor
- [ ] T007 Create `workspace_invitations` table in Supabase SQL Editor
- [ ] T008 Create `workspace_keywords` junction table in Supabase SQL Editor

### 2.2 Alter Existing Tables (Additive Only)

- [ ] T009 Add `workspace_id` column to `projects` table (nullable, FK to workspaces)
- [ ] T010 Add `project_id` column to `connections` table (nullable, FK to projects)
- [ ] T011 Add `workspace_id` column to `message_triggers` table (nullable)
- [ ] T012 Add `project_id` column to `message_triggers` table (nullable)
- [ ] T013 Add `workspace_id` column to `tasks` table (nullable)
- [ ] T014 Create indexes for all new columns

### 2.3 RLS Policies (Additive Only)

- [ ] T015 Create RLS policy `workspaces_member_select` on workspaces
- [ ] T016 Create RLS policy `workspaces_admin_update` on workspaces
- [ ] T017 Create RLS policy `workspaces_insert` on workspaces
- [ ] T018 Create RLS policy `workspaces_owner_delete` on workspaces
- [ ] T019 Create RLS policies for `workspace_members` table
- [ ] T020 Create RLS policy `projects_workspace_access` on projects (additive)
- [ ] T021 Create RLS policy `connections_project_access` on connections (additive)
- [ ] T022 Create RLS policy `triggers_workspace_access` on message_triggers (additive)
- [ ] T023 Create RLS policy `tasks_workspace_access` on tasks (additive)

### 2.4 Data Migration

- [ ] T024 Execute migration script: Create workspaces for existing users with projects
- [ ] T025 Execute migration script: Add owners as workspace members
- [ ] T026 Execute migration script: Link projects to workspaces
- [ ] T027 Execute migration script: Link connections to projects (where inferable)
- [ ] T028 Execute migration script: Link triggers to workspaces
- [ ] T029 Execute migration script: Link tasks to workspaces
- [ ] T030 Validate data integrity post-migration
- [ ] T031 Test WeWeb continues functioning after migration

---

## Phase 3: Backend - Core Workspace [US1-US4]

**Goal**: API for workspace management
**Independent Test**: All workspace CRUD and member operations work via API

### 3.1 Module Structure

- [ ] T032 [US1] Create module structure in `backend/src/modules/workspace/`
- [ ] T033 [P] [US1] Create `workspace.interface.ts` in `backend/src/modules/workspace/interfaces/`
- [ ] T034 [P] [US1] Create `create-workspace.dto.ts` in `backend/src/modules/workspace/dto/`
- [ ] T035 [P] [US1] Create `update-workspace.dto.ts` in `backend/src/modules/workspace/dto/`
- [ ] T036 [P] [US3] Create `invite-member.dto.ts` in `backend/src/modules/workspace/dto/`
- [ ] T037 [P] [US4] Create `update-member.dto.ts` in `backend/src/modules/workspace/dto/`

### 3.2 Workspace CRUD [US1-US2]

- [ ] T038 [US1] Implement `workspace.service.ts` with CRUD methods
- [ ] T039 [US1] Implement `GET /workspaces` endpoint in `workspace.controller.ts`
- [ ] T040 [US1] Implement `POST /workspaces` endpoint (auto-create for first project)
- [ ] T041 [US2] Implement `GET /workspaces/:id` endpoint
- [ ] T042 [US2] Implement `PATCH /workspaces/:id` endpoint
- [ ] T043 [US2] Implement `DELETE /workspaces/:id` (soft delete) endpoint

### 3.3 Member Management [US3-US4]

- [ ] T044 [US4] Implement `GET /workspaces/:id/members` endpoint
- [ ] T045 [US3] Implement `POST /workspaces/:id/members/invite` endpoint
- [ ] T046 [US4] Implement `PATCH /workspaces/:id/members/:userId` endpoint
- [ ] T047 [US4] Implement `DELETE /workspaces/:id/members/:userId` endpoint
- [ ] T048 [US3] Implement `POST /workspaces/invitations/:token/accept` endpoint

### 3.4 Guards & Decorators

- [ ] T049 [US2] Create `WorkspaceRoleGuard` in `backend/src/modules/workspace/guards/`
- [ ] T050 [US2] Create `@WorkspaceRoles()` decorator
- [ ] T051 Register workspace module in `app.module.ts`

---

## Phase 4: Frontend - Workspace Context [US1-US2, US7-US8]

**Goal**: Integrate workspaces in React app
**Independent Test**: User can see and switch workspaces

### 4.1 Store & Queries

- [ ] T052 [US1] Create `workspaceStore.ts` in `frontend/src/features/workspace/stores/`
- [ ] T053 [US1] Create `useWorkspaces.ts` query in `frontend/src/features/workspace/api/`
- [ ] T054 [US4] Create `useWorkspaceMembers.ts` query in `frontend/src/features/workspace/api/`
- [ ] T055 [US1] Create `mutations.ts` for workspace operations

### 4.2 Workspace Switcher [US7]

- [ ] T056 [US7] Create `WorkspaceSwitcher.tsx` component in `frontend/src/shared/components/`
- [ ] T057 [US7] Create `WorkspaceSwitcher.module.css` styles
- [ ] T058 [US7] Integrate WorkspaceSwitcher in Header (conditional on 2+ workspaces)
- [ ] T059 [US7] Persist last selected workspace in localStorage

### 4.3 Settings Page [US2-US4]

- [ ] T060 [US2] Create `WorkspaceSettingsPage.tsx` in `frontend/src/features/workspace/pages/`
- [ ] T061 [US4] Create `MembersList.tsx` component
- [ ] T062 [US3] Create `InviteMemberModal.tsx` component
- [ ] T063 [US4] Create `MemberRoleSelect.tsx` component
- [ ] T064 [US2] Add route `/settings/workspace` in router config

### 4.4 Update Existing Queries

- [ ] T065 [US1] Update `useProjects` to filter by workspace (with user_id fallback)
- [ ] T066 [US1] Update `useTriggers` to filter by workspace (with user_id fallback)
- [ ] T067 [US1] Update `useTasks` to filter by workspace (with user_id fallback)

---

## Phase 5: Connections per Project [US5-US6]

**Goal**: Link connections to projects instead of users
**Independent Test**: Trigger with project selects all project pages automatically

### 5.1 Update Connections UI [US5]

- [ ] T068 [US5] Add `project_id` field in connection form
- [ ] T069 [US5] Display linked project in connections list
- [ ] T070 [US5] Allow moving connection between projects

### 5.2 Update Trigger Modal [US6]

- [ ] T071 [US6] Add project select dropdown in `TriggerModal.tsx`
- [ ] T072 [US6] Hide page selection when project is selected
- [ ] T073 [US6] Display "All project pages" badge when project selected
- [ ] T074 [US6] Update trigger mutation to include project_id

### 5.3 Backend - Resolve Pages [US6]

- [ ] T075 [US6] Create `getTriggeredPages` service method that resolves project pages
- [ ] T076 [US6] Update trigger execution logic to use page resolution

---

## Phase 6: Testing & Polish

**Goal**: Ensure quality and backward compatibility
**Independent Test**: All acceptance criteria pass

### 6.1 WeWeb Compatibility Tests

- [ ] T077 Manual test: WeWeb login works
- [ ] T078 Manual test: WeWeb project listing works
- [ ] T079 Manual test: WeWeb project creation works
- [ ] T080 Manual test: WeWeb triggers work
- [ ] T081 Manual test: WeWeb connections work

### 6.2 Workspace Feature Tests

- [ ] T082 Manual test: Workspace creation works
- [ ] T083 Manual test: Member invitation works
- [ ] T084 Manual test: Invitation acceptance works
- [ ] T085 Manual test: Role change works
- [ ] T086 Manual test: Member removal works
- [ ] T087 Manual test: Workspace switching works

### 6.3 Performance & Documentation

- [ ] T088 Measure query latency with new RLS (target: <10% increase)
- [ ] T089 Optimize RLS if needed (indexes, materialized views)
- [ ] T090 Update CLAUDE.md with workspace patterns
- [ ] T091 Document changes for WeWeb team

---

## Dependencies

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Database) ──────────────────────────────────────────┐
    │                                                         │
    ├──► Phase 3 (Backend)                                   │
    │         │                                              │
    │         ▼                                              │
    │    Phase 4 (Frontend)                                  │
    │         │                                              │
    │         ▼                                              │
    │    Phase 5 (Connections per Project)                   │
    │                                                         │
    └──► Phase 6 (Testing) ◄─────────────────────────────────┘
```

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|-------|------------|-------------------|
| US1 (Auto Workspace) | Phase 2 | - |
| US2 (Manage Workspace) | US1 | US3, US4 |
| US3 (Invite Members) | US1 | US2, US4 |
| US4 (Manage Members) | US1 | US2, US3 |
| US5 (Connections/Project) | Phase 2 | US1-US4 |
| US6 (Triggers/Project) | US5 | US7, US8 |
| US7 (Switch Workspace) | US1 | US5, US6 |
| US8 (Create Workspace) | US1 | US5, US6 |

---

## Parallel Execution Opportunities

### Phase 2 (Database)
```
T005, T006, T007, T008 can run in parallel (independent tables)
T009, T010, T011, T012, T013 can run in parallel (independent columns)
T015-T023 can run in parallel (independent policies)
```

### Phase 3 (Backend)
```
T033, T034, T035, T036, T037 can run in parallel (independent DTOs)
T039, T040, T041, T042, T043 can run sequentially (depend on T038)
T044-T048 can run in parallel after T038
```

### Phase 4 (Frontend)
```
T052, T053, T054, T055 can run in parallel (independent files)
T056, T060 can run in parallel (independent components)
T065, T066, T067 can run in parallel (independent query updates)
```

---

## MVP Scope

**Recommended MVP**: User Stories 1-2 only

| MVP Tasks | Count |
|-----------|-------|
| Phase 1 (Setup) | 4 |
| Phase 2 (Database) | 27 |
| Phase 3 Backend (US1-US2 only) | 12 |
| Phase 4 Frontend (US1-US2 only) | 8 |
| **MVP Total** | ~51 tasks |

After MVP validation, add:
- US3-US4 (Member management)
- US5-US6 (Connections per project)
- US7-US8 (Multi-workspace switching)

---

## Success Checklist

- [ ] WeWeb functions 100% after deploy
- [ ] Existing users see their projects unchanged
- [ ] New users get workspace created automatically
- [ ] Invitations work end-to-end
- [ ] Triggers with project select all pages automatically
- [ ] Performance degradation < 10%
- [ ] Zero data leakage between workspaces
