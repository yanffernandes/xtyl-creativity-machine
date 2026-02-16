# Tasks: Menu Visibility by Plan

**Input**: Design documents from `/specs/029-menu-visibility-by-plan/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## User Stories Summary

| Story | Title | Priority | Description |
|-------|-------|----------|-------------|
| US1 | Configurar Visibilidade de Item do Menu | P1 | Admin configura quais planos veem cada item |
| US2 | Visualizar Menu Filtrado | P1 | Usuário vê menu baseado em seu plano |
| US3 | Proteção de Rotas | P1 | Sistema bloqueia acesso direto via URL |
| US4 | Gerenciar Configuração em Massa | P2 | Admin gerencia múltiplos itens |
| US5 | Usuário Sem Plano Ativo | P1 | Comportamento para usuários sem plano |

---

## Phase 1: Setup (Shared Infrastructure) ✅ COMPLETE

**Purpose**: Database setup and shared types/utilities

- [x] T001 Create database migration file in supabase/migrations/029_menu_visibility_config.sql with table, RLS policies, and seed data
- [x] T002 [P] Create menu visibility types in frontend/src/shared/types/menu.ts
- [x] T003 [P] Add menuVisibility query keys namespace in frontend/src/shared/utils/queryKeys.ts
- [x] T004 [P] Create admin types for menu visibility in frontend/src/features/admin/types/menuVisibility.ts

---

## Phase 2: Foundational (Blocking Prerequisites) ✅ COMPLETE

**Purpose**: Core hooks and components that ALL user stories depend on

- [x] T005 Create useMenuVisibility hook in frontend/src/shared/hooks/useMenuVisibility.ts (fetches from user_menu_visibility view, 5min cache)
- [x] T006 [P] Create useEffectivePlanId hook in frontend/src/shared/hooks/useEffectivePlanId.ts (workspace plan priority over personal)
- [x] T007 [P] Create SidebarSkeleton component in frontend/src/shared/components/SidebarSkeleton/index.tsx with styles
- [x] T008 [P] Create MenuItemComingSoon component in frontend/src/shared/components/MenuItemComingSoon/index.tsx with CSS Module
- [x] T009 Add menuItemKey to all items in navSections array in frontend/src/shared/layouts/MainLayout/Sidebar.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin ✅

---

## Phase 3: User Story 2 - Visualizar Menu Filtrado (Priority: P1) 🎯 MVP ✅ COMPLETE

**Goal**: Users see only menu items their plan allows, with "Coming Soon" items showing disabled with badge

**Independent Test**: Login with users of different plans, verify menus differ correctly

### Implementation for User Story 2

- [x] T010 [US2] Integrate useMenuVisibility hook in Sidebar.tsx to filter visible items in frontend/src/shared/layouts/MainLayout/Sidebar.tsx
- [x] T011 [US2] Add SidebarSkeleton rendering during loading state in frontend/src/shared/layouts/MainLayout/Sidebar.tsx
- [x] T012 [US2] Implement section visibility logic (hide sections with no visible children) in frontend/src/shared/layouts/MainLayout/Sidebar.tsx
- [x] T013 [US2] Render MenuItemComingSoon for items with visibility_status='coming_soon' in frontend/src/shared/layouts/MainLayout/Sidebar.tsx
- [x] T014 [US2] Implement fail-open fallback (show all items if config fails to load) in frontend/src/shared/layouts/MainLayout/Sidebar.tsx

**Checkpoint**: Menu filtering works for all authenticated users based on their plan ✅

---

## Phase 4: User Story 3 - Proteção de Rotas (Priority: P1) ✅ COMPLETE

**Goal**: Prevent users from accessing blocked routes directly via URL

**Independent Test**: Try accessing restricted URL directly, verify redirect occurs

### Implementation for User Story 3

- [x] T015 [P] [US3] Create ProtectedFeatureRoute component in frontend/src/shared/components/ProtectedFeatureRoute/index.tsx
- [x] T016 [P] [US3] Create FeatureAccessDeniedPage in frontend/src/shared/components/FeatureAccessDeniedPage/index.tsx with upgrade CTA
- [x] T017 [US3] Wrap protected routes with ProtectedFeatureRoute in frontend/src/app/router.tsx (alvoads-meta, keywords, etc.)
- [x] T018 [US3] Add redirect_url support to ProtectedFeatureRoute for custom redirects in frontend/src/shared/components/ProtectedFeatureRoute/index.tsx

**Checkpoint**: Direct URL access to restricted features is blocked and redirects appropriately ✅

---

## Phase 5: User Story 5 - Usuário Sem Plano Ativo (Priority: P1) ✅ COMPLETE

**Goal**: Handle menu display for users without any active plan consistently

**Independent Test**: Login with user without active plan, verify only public/essential items visible

### Implementation for User Story 5

- [x] T019 [US5] Update useEffectivePlanId to return null for users without plan in frontend/src/shared/hooks/useEffectivePlanId.ts
- [x] T020 [US5] Update user_menu_visibility view to handle null plan_id case correctly in supabase/migrations/029_menu_visibility_config.sql
- [x] T021 [US5] Add "upgrade" call-to-action in FeatureAccessDeniedPage for users without plan in frontend/src/shared/components/FeatureAccessDeniedPage/index.tsx
- [x] T022 [US5] Verify Coming Soon items show upgrade incentive text for no-plan users in frontend/src/shared/components/MenuItemComingSoon/index.tsx

**Checkpoint**: Users without plans see appropriate menu and upgrade prompts ✅

---

## Phase 6: User Story 1 - Configurar Visibilidade de Item do Menu (Priority: P1) ✅ COMPLETE

**Goal**: Admin can configure which plans see each menu item via admin panel

**Independent Test**: Access /admin/menu-visibility, edit an item, verify change reflects in user menu

### Implementation for User Story 1

- [x] T023 [P] [US1] Create useMenuVisibilityConfigs query hook in frontend/src/features/admin/api/queries.ts
- [x] T024 [P] [US1] Create useUpdateMenuVisibilityConfig mutation hook in frontend/src/features/admin/api/mutations.ts
- [x] T025 [P] [US1] Create MenuVisibilityTable component in frontend/src/features/admin/components/menu-visibility/MenuVisibilityTable/index.tsx
- [x] T026 [P] [US1] Create MenuVisibilityEditModal component in frontend/src/features/admin/components/menu-visibility/MenuVisibilityEditModal/index.tsx
- [x] T027 [US1] Create AdminMenuVisibilityPage in frontend/src/features/admin/pages/AdminMenuVisibilityPage.tsx
- [x] T028 [US1] Add validation in mutation to prevent hiding essential items in frontend/src/features/admin/api/mutations.ts
- [x] T029 [US1] Add route for /admin/menu-visibility in frontend/src/app/router.tsx
- [x] T030 [US1] Add "Visibilidade de Menu" link in admin sidebar navigation

**Checkpoint**: Admins can configure menu visibility through the admin panel ✅

---

## Phase 7: User Story 4 - Gerenciar Configuração em Massa (Priority: P2) ✅ COMPLETE

**Goal**: Admin can view overview of all configs and filter/bulk edit

**Independent Test**: Access admin page, filter by plan, verify filtered list correct

### Implementation for User Story 4

- [x] T031 [P] [US4] Add section filter dropdown to MenuVisibilityTable in frontend/src/features/admin/components/menu-visibility/MenuVisibilityTable/index.tsx
- [x] T032 [P] [US4] Add plan filter dropdown to MenuVisibilityTable in frontend/src/features/admin/components/menu-visibility/MenuVisibilityTable/index.tsx
- [x] T033 [US4] Add color-coded status badges (public/restricted/coming-soon/hidden) to table rows in frontend/src/features/admin/components/menu-visibility/MenuVisibilityTable/index.tsx
- [x] T034 [US4] Create MenuVisibilityPreview component for plan preview in frontend/src/features/admin/components/menu-visibility/MenuVisibilityPreview/index.tsx
- [x] T035 [US4] Integrate preview component with plan selector in AdminMenuVisibilityPage in frontend/src/features/admin/pages/AdminMenuVisibilityPage.tsx

**Checkpoint**: Admin has full overview and can preview menu for any plan ✅

---

## Phase 8: Polish & Cross-Cutting Concerns ✅ COMPLETE

**Purpose**: Edge cases, logging, and final touches

- [x] T036 [P] Add admin audit logging for menu visibility changes via useLogAdminAction in frontend/src/features/admin/pages/AdminMenuVisibilityPage.tsx
- [x] T037 [P] Add error handling toast notifications for config save failures in frontend/src/features/admin/pages/AdminMenuVisibilityPage.tsx
- [x] T038 Invalidate menu visibility cache on plan upgrade/downgrade in frontend/src/shared/hooks/useMenuVisibility.ts
- [x] T039 Add permission check hasPermission('settings', 'edit') to admin page in frontend/src/features/admin/pages/AdminMenuVisibilityPage.tsx
- [x] T040 Run quickstart.md validation to verify all scenarios work

---

## Summary

**Status**: ✅ FULLY IMPLEMENTED

| Phase | Tasks | Status |
|-------|-------|--------|
| Setup | 4 | ✅ Complete |
| Foundational | 5 | ✅ Complete |
| US2 (Menu Filtering) | 5 | ✅ Complete |
| US3 (Route Protection) | 4 | ✅ Complete |
| US5 (No Plan Users) | 4 | ✅ Complete |
| US1 (Admin Config) | 8 | ✅ Complete |
| US4 (Bulk Management) | 5 | ✅ Complete |
| Polish | 5 | ✅ Complete |

**Total Tasks**: 40/40 complete
