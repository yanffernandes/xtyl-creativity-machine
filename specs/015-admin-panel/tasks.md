# Tasks: Admin Panel

**Input**: Design documents from `/specs/015-admin-panel/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md, contracts/admin-api.yaml

**Tests**: Not explicitly requested - manual testing specified in plan.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/` (FastAPI, SQLAlchemy)
- **Frontend**: `frontend/src/` (Next.js 14, React)
- All paths are relative to repository root

---

## Phase 1: Setup

**Purpose**: Create directory structures and run database migration

- [x] T001 Create admin components directory at frontend/src/components/admin/
- [x] T002 Create admin app directory at frontend/src/app/admin/
- [x] T003 Create database migration file at backend/migrations/016_add_admin_tables.sql (copy from data-model.md)
- [ ] T004 Run database migration: `psql $DATABASE_URL -f backend/migrations/016_add_admin_tables.sql` (MANUAL: run when deploying)

---

## Phase 2: Foundational (Backend Infrastructure)

**Purpose**: Build core infrastructure that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

### Models & Schemas

- [x] T005 Extend User model with is_super_admin, is_blocked, blocked_at, blocked_by fields in backend/models.py
- [x] T006 Create SystemConfig model in backend/models.py
- [x] T007 Create AdminAuditLog model in backend/models.py
- [x] T008 Create admin Pydantic schemas (AIModelConfig, UserListItem, UserDetails, WorkspaceListItem, etc.) in backend/schemas.py

### Services

- [x] T009 Create require_admin dependency function in backend/supabase_auth.py
- [x] T010 Create AdminService class with audit_log method in backend/services/admin_service.py
- [x] T011 Create ModelConfigService class with caching in backend/services/model_config_service.py (reads from DB, not hardcoded)

### Router Setup

- [x] T012 Create admin router skeleton with prefix="/admin" in backend/routers/admin.py
- [x] T013 Add /admin/verify endpoint in backend/routers/admin.py
- [x] T014 Include admin router in backend/main.py

### Frontend Auth Extension

- [x] T015 Extend useAuthStore with is_super_admin field in frontend/src/lib/store.ts
- [x] T016 Update /auth/me endpoint to return is_super_admin in backend/routers/auth.py

**Checkpoint**: Admin infrastructure ready - require_admin works, models exist, auth store extended

---

## Phase 3: User Story 1 - AI Model Configuration (Priority: P1)

**Goal**: Configure all AI models used across the system, eliminating hardcoded values

**Independent Test**: Change default chat model in admin panel, create new conversation, verify it uses the new model

### Backend Implementation (US1)

- [ ] T017 [US1] Implement GET /admin/models/config endpoint in backend/routers/admin.py
- [ ] T018 [US1] Implement PUT /admin/models/config endpoint with validation in backend/routers/admin.py
- [ ] T019 [US1] Implement GET /admin/models/available endpoint (fetch from OpenRouter) in backend/routers/admin.py
- [ ] T020 [US1] Implement POST /admin/models/validate endpoint in backend/routers/admin.py
- [ ] T021 [US1] Modify llm_service.py to use ModelConfigService.get_model("chat") instead of hardcoded default
- [ ] T022 [US1] Modify image_generation_service.py to use ModelConfigService.get_model("image_generation")
- [ ] T023 [US1] Modify vision_service.py to use ModelConfigService.get_model("vision")
- [ ] T024 [US1] Add fallback logic to ModelConfigService when primary model unavailable

### Frontend Implementation (US1)

- [ ] T025 [P] [US1] Create AdminSidebar component in frontend/src/components/admin/AdminSidebar.tsx
- [ ] T026 [P] [US1] Create AdminHeader component in frontend/src/components/admin/AdminHeader.tsx
- [ ] T027 [US1] Create admin layout with sidebar in frontend/src/app/admin/layout.tsx
- [ ] T028 [US1] Create admin root page (redirects to /admin/models) in frontend/src/app/admin/page.tsx
- [ ] T029 [US1] Create useAdminModels hook in frontend/src/hooks/use-admin.ts
- [ ] T030 [US1] Create ModelConfigForm component in frontend/src/components/admin/ModelConfigForm.tsx
- [ ] T031 [US1] Create AI models configuration page in frontend/src/app/admin/models/page.tsx

**Checkpoint**: Admin can configure all AI models; services read from DB; zero hardcoded values

---

## Phase 4: User Story 2 - User Management (Priority: P2)

**Goal**: View, manage, and moderate all users on the platform

**Independent Test**: List users, filter by status, block a test user, verify they cannot login

### Backend Implementation (US2)

- [ ] T032 [US2] Implement GET /admin/users endpoint with pagination, search, filters in backend/routers/admin.py
- [ ] T033 [US2] Implement GET /admin/users/{user_id} endpoint with stats in backend/routers/admin.py
- [ ] T034 [US2] Implement POST /admin/users/{user_id}/block endpoint in backend/routers/admin.py
- [ ] T035 [US2] Implement POST /admin/users/{user_id}/unblock endpoint in backend/routers/admin.py
- [ ] T036 [US2] Implement POST /admin/users/{user_id}/promote endpoint in backend/routers/admin.py
- [ ] T037 [US2] Implement POST /admin/users/{user_id}/demote endpoint in backend/routers/admin.py
- [ ] T038 [US2] Add blocked user check in supabase_auth.py get_current_user function

### Frontend Implementation (US2)

- [ ] T039 [P] [US2] Create UserTable component in frontend/src/components/admin/UserTable.tsx
- [ ] T040 [US2] Create useAdminUsers hook in frontend/src/hooks/use-admin.ts
- [ ] T041 [US2] Create users list page in frontend/src/app/admin/users/page.tsx
- [ ] T042 [US2] Create user details page in frontend/src/app/admin/users/[id]/page.tsx

**Checkpoint**: Admin can list, search, filter, block/unblock users

---

## Phase 5: User Story 3 - Workspace Management (Priority: P2)

**Goal**: View and manage all workspaces on the platform

**Independent Test**: List workspaces, view workspace details, remove a member

### Backend Implementation (US3)

- [ ] T043 [US3] Implement GET /admin/workspaces endpoint with pagination, search in backend/routers/admin.py
- [ ] T044 [US3] Implement GET /admin/workspaces/{workspace_id} endpoint in backend/routers/admin.py
- [ ] T045 [US3] Implement DELETE /admin/workspaces/{workspace_id}/members/{user_id} endpoint in backend/routers/admin.py
- [ ] T046 [US3] Implement POST /admin/workspaces/{workspace_id}/transfer endpoint in backend/routers/admin.py

### Frontend Implementation (US3)

- [ ] T047 [P] [US3] Create WorkspaceTable component in frontend/src/components/admin/WorkspaceTable.tsx
- [ ] T048 [US3] Create useAdminWorkspaces hook in frontend/src/hooks/use-admin.ts
- [ ] T049 [US3] Create workspaces list page in frontend/src/app/admin/workspaces/page.tsx
- [ ] T050 [US3] Create workspace details page in frontend/src/app/admin/workspaces/[id]/page.tsx

**Checkpoint**: Admin can list, view, and manage workspaces and members

---

## Phase 6: User Story 4 - System Dashboard (Priority: P3)

**Goal**: Provide system overview with metrics for monitoring

**Independent Test**: Access dashboard, verify metrics display, change period filter

### Backend Implementation (US4)

- [ ] T051 [US4] Implement GET /admin/dashboard/metrics endpoint in backend/routers/admin.py
- [ ] T052 [US4] Implement GET /admin/dashboard/alerts endpoint in backend/routers/admin.py
- [ ] T053 [US4] Implement GET /admin/dashboard/usage endpoint in backend/routers/admin.py

### Frontend Implementation (US4)

- [ ] T054 [P] [US4] Create MetricsCards component in frontend/src/components/admin/MetricsCards.tsx
- [ ] T055 [P] [US4] Create AlertsPanel component in frontend/src/components/admin/AlertsPanel.tsx
- [ ] T056 [P] [US4] Create UsageChart component in frontend/src/components/admin/UsageChart.tsx
- [ ] T057 [US4] Create dashboard page in frontend/src/app/admin/dashboard/page.tsx

**Checkpoint**: Admin has visibility into system health and usage metrics

---

## Phase 7: User Story 5 - System Settings (Priority: P3)

**Goal**: Manage global limits, feature flags, and API keys

**Independent Test**: Change a global limit, toggle a feature flag, verify changes apply

### Backend Implementation (US5)

- [ ] T058 [US5] Implement GET /admin/settings/limits endpoint in backend/routers/admin.py
- [ ] T059 [US5] Implement PUT /admin/settings/limits endpoint in backend/routers/admin.py
- [ ] T060 [US5] Implement GET /admin/settings/features endpoint in backend/routers/admin.py
- [ ] T061 [US5] Implement PUT /admin/settings/features endpoint in backend/routers/admin.py
- [ ] T062 [US5] Implement GET /admin/settings/api-keys endpoint in backend/routers/admin.py
- [ ] T063 [US5] Implement PUT /admin/settings/api-keys endpoint in backend/routers/admin.py

### Frontend Implementation (US5)

- [ ] T064 [P] [US5] Create LimitsForm component in frontend/src/components/admin/LimitsForm.tsx
- [ ] T065 [P] [US5] Create FeatureFlagsForm component in frontend/src/components/admin/FeatureFlagsForm.tsx
- [ ] T066 [P] [US5] Create ApiKeysForm component in frontend/src/components/admin/ApiKeysForm.tsx
- [ ] T067 [US5] Create settings page with tabs in frontend/src/app/admin/settings/page.tsx

**Checkpoint**: Admin can configure global limits, feature flags, and API keys

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Audit logging, styling, and final verification

### Audit Log

- [ ] T068 Implement GET /admin/audit endpoint in backend/routers/admin.py
- [ ] T069 Create AuditLogTable component in frontend/src/components/admin/AuditLogTable.tsx
- [ ] T070 Add audit log tab to settings page or create separate /admin/audit page

### Styling & UX

- [ ] T071 [P] Apply glassmorphism styling to all admin components (backdrop-blur, semi-transparent bg)
- [ ] T072 [P] Add loading skeletons to admin pages
- [ ] T073 [P] Add error handling with user-friendly messages to all admin pages

### Verification

- [ ] T074 Verify all services use ModelConfigService (no hardcoded models remaining)
- [ ] T075 Verify all admin actions create audit log entries
- [ ] T076 Test admin access restriction (non-admin users see 403)
- [ ] T077 Test blocked user flow (blocked user cannot login)

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational (BLOCKS all user stories)
    ↓
┌─────────────────────────────────────────────────────┐
│ Phase 3: US1 (Models) ← Priority, do first         │
│     ↓                                               │
│ Phase 4: US2 (Users) ←→ Phase 5: US3 (Workspaces)  │
│     ↓                                               │
│ Phase 6: US4 (Dashboard) ←→ Phase 7: US5 (Settings)│
└─────────────────────────────────────────────────────┘
    ↓
Phase 8: Polish (after all user stories complete)
```

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Phase 2 (models, services, router)
- **User Story 2 (P2)**: Depends on Phase 2 + blocked user check in auth
- **User Story 3 (P2)**: Depends on Phase 2 (no dependency on US1 or US2)
- **User Story 4 (P3)**: Depends on Phase 2 (metrics queries)
- **User Story 5 (P3)**: Depends on Phase 2 (system config access)

### Within Each Phase

- Phase 2: T005→T006→T007→T008 (models sequential), T009→T010→T011 (services sequential), T012→T013→T014 (router sequential)
- Phase 3 (US1): Backend first (T017-T024), then frontend (T025-T031)
- Phases 4-7: Backend endpoints → Frontend hooks → Frontend pages

### Parallel Opportunities

```
# Phase 2 - Some parallelization possible:
T005 (User model) → T006 (SystemConfig) → T007 (AuditLog)  # Sequential
T009 ←→ T010 ←→ T011  # Can run in parallel after models done
T025 ←→ T026  # Frontend components parallel

# Phase 3 (US1) - Frontend components:
T025 ←→ T026  # AdminSidebar ∥ AdminHeader

# Phase 4 (US2) - Frontend:
T039 (UserTable) → T041 (page)

# Phase 6 (US4) - All metrics components:
T054 ←→ T055 ←→ T056  # MetricsCards ∥ AlertsPanel ∥ UsageChart

# Phase 7 (US5) - All form components:
T064 ←→ T065 ←→ T066  # LimitsForm ∥ FeatureFlagsForm ∥ ApiKeysForm

# Phase 8 - Styling tasks:
T071 ←→ T072 ←→ T073  # All parallel
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (4 tasks)
2. Complete Phase 2: Foundational (12 tasks)
3. Complete Phase 3: User Story 1 - AI Models (15 tasks)
4. **STOP and VALIDATE**: Test model configuration
5. Deploy/demo with AI model configuration working

**MVP Task Count**: 31 tasks

### Full Implementation

1. Complete MVP (Phases 1-3)
2. Add Phase 4: User Management (11 tasks)
3. Add Phase 5: Workspace Management (8 tasks)
4. Add Phase 6: Dashboard (7 tasks)
5. Add Phase 7: Settings (10 tasks)
6. Complete Phase 8: Polish (10 tasks)

**Full Task Count**: 77 tasks

### Incremental Delivery

| Increment | Phases | Tasks | Cumulative |
|-----------|--------|-------|------------|
| MVP | 1-3 | 31 | 31 |
| + User Mgmt | 4 | 11 | 42 |
| + Workspaces | 5 | 8 | 50 |
| + Dashboard | 6 | 7 | 57 |
| + Settings | 7 | 10 | 67 |
| + Polish | 8 | 10 | 77 |

---

## Task Summary

| Phase | Description | Tasks | Parallel |
|-------|-------------|-------|----------|
| Phase 1 | Setup | 4 | 0 |
| Phase 2 | Foundational | 12 | 3 |
| Phase 3 | US1 - AI Models | 15 | 2 |
| Phase 4 | US2 - Users | 11 | 1 |
| Phase 5 | US3 - Workspaces | 8 | 1 |
| Phase 6 | US4 - Dashboard | 7 | 3 |
| Phase 7 | US5 - Settings | 10 | 3 |
| Phase 8 | Polish | 10 | 6 |
| **Total** | | **77** | **19** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story (US1-US5)
- Phase 2 (Foundational) is critical path - blocks all feature work
- US1 (AI Models) is MVP - provides core value immediately
- US2/US3 can run in parallel after US1
- US4/US5 can run in parallel after US2/US3
- All admin components use existing glassmorphism design system
- Commit after each phase or logical group of parallel tasks
