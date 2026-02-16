# Tasks: Meus Blogs (Projetos) ✅ FINALIZADO

**Status**: ✅ **COMPLETO** - Todas as User Stories (US1-US6) implementadas
**Input**: Design documents from `/specs/004-meus-blogs/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and database schema

- [X] T001 Create database migration file for new `projects` table columns in backend/src/migrations/
- [X] T002 Add columns to `projects` table: connection_status, last_connection_test, connection_error_message, articles_count, last_sync_at
- [X] T003 Add CHECK constraint for connection_status enum values ('connected', 'error', 'not_configured', 'testing')
- [X] T004 Verify RLS policies exist for `projects` table (SELECT, INSERT, UPDATE, DELETE)
- [X] T005 Generate encryption key using `openssl rand -hex 32` and add to backend/.env as ENCRYPTION_KEY

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Backend Infrastructure

- [X] T006 Create WordPress module structure in backend/src/modules/wordpress/
- [X] T007 Create WordPressModule in backend/src/modules/wordpress/wordpress.module.ts
- [X] T008 [P] Create encryption utility service in backend/src/modules/wordpress/utils/encryption.util.ts with encrypt() and decrypt() methods
- [X] T009 [P] Create WordPress HTTP client utility in backend/src/modules/wordpress/utils/wordpress-client.util.ts with retry logic and timeout
- [X] T010 Create SupabaseService in backend/src/common/supabase/supabase.service.ts with service_role client
- [X] T011 [P] Create TestConnectionDto in backend/src/modules/wordpress/dto/test-connection.dto.ts
- [X] T012 [P] Create InstallPluginDto in backend/src/modules/wordpress/dto/install-plugin.dto.ts
- [X] T013 [P] Create InstallEssentialPluginsDto in backend/src/modules/wordpress/dto/install-essential-plugins.dto.ts
- [X] T014 Create WordPressConnectionResponse interface in backend/src/modules/wordpress/dto/test-connection.dto.ts
- [X] T015 Create PluginInstallResponse interface in backend/src/modules/wordpress/dto/install-plugin.dto.ts

### Frontend Infrastructure

- [X] T016 [P] Update Project interface in frontend/src/features/projects/types/index.ts with new fields (connection_status, last_connection_test, etc.)
- [X] T017 [P] Create PluginInstallStatus interface in frontend/src/features/projects/types/index.ts
- [X] T018 [P] Create WordPressConnectionResult interface in frontend/src/features/projects/types/index.ts
- [X] T019 [P] Create PluginInstallationResult interface in frontend/src/features/projects/types/index.ts
- [X] T020 Create api.ts HTTP client wrapper in frontend/src/shared/utils/api.ts (if not exists) for backend calls
- [X] T021 Add queryKeys for projects in frontend/src/shared/utils/queryKeys.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Visualizar Projetos WordPress (Priority: P1) 🎯 MVP ✅

**Goal**: Display list of user's WordPress projects with connection status, metrics, and empty state

**Independent Test**: Navigate to "Meus Blogs" page and verify projects are displayed with status badges and metrics

### Implementation for User Story 1

- [X] T022 [P] [US1] Create ConnectionStatusBadge component in frontend/src/features/projects/components/ConnectionStatusBadge.tsx
- [X] T023 [P] [US1] Update useProjects query in frontend/src/features/projects/api/queries.ts to fetch projects with new fields
- [X] T024 [US1] Update ProjectCard component in frontend/src/features/projects/components/ProjectCard.tsx to display connection_status badge and articles_count
- [X] T025 [US1] Update ProjectsPage in frontend/src/features/projects/pages/ProjectsPage.tsx with responsive grid layout
- [X] T026 [US1] Add empty state component to ProjectsPage when user has no projects
- [X] T027 [US1] Add search/filter input for project name and domain in ProjectsPage
- [X] T028 [US1] Add status filter dropdown (all, connected, error, not_configured) in ProjectsPage

**Checkpoint**: At this point, User Story 1 should be fully functional - users can view their projects list ✅

---

## Phase 4: User Story 2 - Adicionar Novo Projeto WordPress (Priority: P1) 🎯 MVP ✅

**Goal**: Allow users to add WordPress projects through a 4-step wizard with connection validation

**Independent Test**: Click "Adicionar novo Blog", complete wizard with valid WordPress credentials, verify project is created

### Backend Implementation for User Story 2

- [X] T029 [P] [US2] Create WordPressService in backend/src/modules/wordpress/wordpress.service.ts
- [X] T030 [US2] Implement testConnection method in WordPressService that calls WordPress /wp-json/wp/v2/users/me
- [X] T031 [US2] Implement getWordPressInfo method in WordPressService that fetches WP version and plugins
- [X] T032 [US2] Add error handling for WordPress API responses (401, 403, 404, 502) in WordPressService
- [X] T033 [P] [US2] Create WordPressController in backend/src/modules/wordpress/wordpress.controller.ts
- [X] T034 [US2] Implement POST /wordpress/test-connection endpoint in WordPressController with JWT auth guard
- [X] T035 [US2] Add user_id validation in test-connection endpoint (verify JWT user matches project owner)

### Frontend Implementation for User Story 2

- [X] T036 [P] [US2] Create useTestWordPressConnection mutation in frontend/src/features/projects/api/wordpress.ts
- [X] T037 [US2] Update ProjectCreateWizard component in frontend/src/features/projects/components/ProjectCreateWizard.tsx to 4 steps
- [X] T038 [US2] Implement Step 1 (Basic Info) in ProjectCreateWizard: name, domain, default_language fields
- [X] T039 [US2] Implement Step 2 (WordPress Credentials) in ProjectCreateWizard: login, password (Application Password) fields
- [X] T040 [US2] Add URL validation (must start with http/https) and Application Password format validation in wizard
- [X] T041 [US2] Implement connection test on Step 2 completion before proceeding to Step 3
- [X] T042 [US2] Display connection test result with success/error message and WordPress version
- [X] T043 [US2] Update createProject mutation in frontend/src/features/projects/api/mutations.ts to save encrypted credentials
- [X] T044 [US2] Add error handling and user feedback for failed project creation
- [X] T045 [US2] Implement Step 4 (Confirmation) showing project summary and "Concluir" button

**Checkpoint**: At this point, users can add WordPress projects through the wizard (without plugins yet) ✅

---

## Phase 5: User Story 2.1 - Instalar Plugins Essenciais (Priority: P1) 🎯 MVP ✅

**Goal**: Automatically install 8 essential plugins after project registration with real-time progress feedback

**Independent Test**: Complete project wizard, verify Step 3 shows plugin installation progress, verify plugins are installed in WordPress

### Backend Implementation for User Story 2.1

- [X] T046 [P] [US2.1] Define ESSENTIAL_PLUGINS constant array in backend/src/modules/wordpress/wordpress.service.ts with 8 plugin objects
- [X] T047 [US2.1] Implement installPlugin method in WordPressService that calls WordPress AlvoBot API /wp-json/alvobot-pro/v1/plugins/commands
- [X] T048 [US2.1] Implement installEssentialPlugins method in WordPressService that loops through ESSENTIAL_PLUGINS sequentially
- [X] T049 [US2.1] Add continue-on-error logic to installEssentialPlugins (don't stop loop if one plugin fails)
- [X] T050 [US2.1] Implement POST /wordpress/install-essential-plugins endpoint in WordPressController with JWT auth guard
- [X] T051 [US2.1] Return array of PluginInstallResponse with status for each plugin (installed, error, already_installed)
- [X] T052 [US2.1] Update project.plugins JSONB field in Supabase after successful installations

### Frontend Implementation for User Story 2.1

- [X] T053 [P] [US2.1] Create PluginInstallationStep component in frontend/src/features/projects/components/PluginInstallationStep.tsx
- [X] T054 [P] [US2.1] Create useInstallEssentialPlugins mutation in frontend/src/features/projects/api/wordpress.ts
- [X] T055 [US2.1] Implement Step 3 (Plugin Installation) in ProjectCreateWizard using PluginInstallationStep component
- [X] T056 [US2.1] Display list of 8 essential plugins with individual status indicators (pending, installing, installed, error)
- [X] T057 [US2.1] Add progress bar showing "X of 8 plugins installed"
- [X] T058 [US2.1] Update plugin status in real-time as backend returns results
- [X] T059 [US2.1] Display final summary: "X de 8 plugins instalados com sucesso"
- [X] T060 [US2.1] Add "Pular Instalação" button for advanced users
- [X] T061 [US2.1] Allow wizard to proceed to Step 4 even if some plugins failed

**Checkpoint**: At this point, User Stories 1, 2, and 2.1 are complete - MVP is functional! ✅

---

## Phase 6: User Story 3 - Testar Conexão WordPress (Priority: P2) ✅

**Goal**: Allow users to manually test connection of existing projects

**Independent Test**: Open project management modal, click "Testar Conexão", verify result is displayed correctly

### Implementation for User Story 3

- [X] T062 [P] [US3] Create GET /wordpress/site-info/:projectId endpoint in WordPressController
- [X] T063 [US3] Implement getSiteInfo method in WordPressService that fetches current WordPress data
- [X] T064 [P] [US3] Create ProjectManageModal component in frontend/src/features/projects/components/ProjectManageModal.tsx with tabs
- [X] T065 [P] [US3] Create ConnectionTestResult component in frontend/src/features/projects/components/ConnectionTestResult.tsx
- [X] T066 [US3] Implement "Conexão" tab in ProjectManageModal with "Testar Conexão" button
- [X] T067 [US3] Call useTestWordPressConnection mutation when user clicks "Testar Conexão"
- [X] T068 [US3] Display test result with success message, WP version, and plugins list
- [X] T069 [US3] Display error message with actionable guidance if test fails (invalid credentials, plugin inactive, etc.)
- [X] T070 [US3] Update project.connection_status and last_connection_test in database after test
- [X] T071 [US3] Add "Atualizar Credenciais" button in modal if authentication fails

**Checkpoint**: At this point, User Story 3 is complete - users can test existing connections ✅

---

## Phase 7: User Story 4 - Reinstalar Plugin AlvoBot (Priority: P2) ✅

**Goal**: Allow users to reinstall/reactivate AlvoBot plugin when needed

**Independent Test**: Deactivate plugin in WordPress, use reinstall function, verify plugin is reactivated

### Implementation for User Story 4

- [X] T072 [P] [US4] Implement reactivatePlugin method in WordPressService that calls WordPress plugin activation API
- [X] T073 [US4] Create POST /wordpress/reinstall-plugin endpoint in WordPressController
- [X] T074 [P] [US4] Create useReinstallPlugin mutation in frontend/src/features/projects/api/wordpress.ts
- [X] T075 [US4] Add "Reinstalar Plugin" button in ProjectManageModal "Conexão" tab
- [X] T076 [US4] Show loading state during plugin reinstallation with spinner
- [X] T077 [US4] Display success message when plugin is reinstalled/reactivated
- [X] T078 [US4] Display error message with manual installation instructions if reinstall fails
- [X] T079 [US4] Handle permission error (user needs admin role in WordPress)

**Checkpoint**: At this point, User Story 4 is complete - users can reinstall plugin ✅

---

## Phase 8: User Story 5 - Editar Projeto Existente (Priority: P3) ✅

**Goal**: Allow users to edit project information including name, domain, and credentials

**Independent Test**: Open project modal, edit name and credentials, save, verify changes persist

### Implementation for User Story 5

- [X] T080 [P] [US5] Create PATCH /wordpress/update-credentials/:projectId endpoint in WordPressController
- [X] T081 [US5] Implement updateProjectCredentials method in WordPressService that re-encrypts credentials
- [X] T082 [US5] Retest connection automatically when credentials are changed
- [X] T083 [P] [US5] Implement "Informações" tab in ProjectManageModal with editable fields
- [X] T084 [US5] Add form fields for name, domain, login, password in modal
- [X] T085 [US5] Use React Hook Form + Zod for validation in edit form
- [X] T086 [US5] Call useUpdateProject mutation when user saves changes
- [X] T087 [US5] Show validation errors inline for invalid inputs
- [X] T088 [US5] Display success toast notification when project is updated
- [X] T089 [US5] Invalidate projects query cache after successful update

**Checkpoint**: At this point, User Story 5 is complete - users can edit projects ✅

---

## Phase 9: User Story 6 - Excluir Projeto (Priority: P3) ✅

**Goal**: Allow users to soft delete projects with confirmation dialog

**Independent Test**: Click delete button, confirm deletion, verify project no longer appears in list

### Implementation for User Story 6

- [X] T090 [P] [US6] Create ProjectDeleteConfirm component in frontend/src/features/projects/components/ProjectDeleteConfirm.tsx
- [X] T091 [US6] Add "Excluir" button in ProjectManageModal with warning icon
- [X] T092 [US6] Show confirmation dialog when user clicks delete
- [X] T093 [US6] Display warning about preserving article data but losing draft access
- [X] T094 [US6] Call useDeleteProject mutation on confirmation
- [X] T095 [US6] Update project.is_deleted = true in database (soft delete)
- [X] T096 [US6] Remove project from UI list immediately (optimistic update)
- [X] T097 [US6] Display success toast: "Projeto excluído com sucesso"
- [X] T098 [US6] Handle error if deletion fails and revert optimistic update

**Checkpoint**: At this point, all user stories (US1-6) are complete! ✅

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T099 [P] Add loading skeleton screens to ProjectsPage during initial load
- [ ] T100 [P] Add smooth animations to wizard step transitions (200-300ms)
- [ ] T101 [P] Implement retry with exponential backoff for WordPress API calls in wordpress-client.util.ts
- [ ] T102 [P] Add rate limiting middleware to WordPress endpoints (max 10 req/min per user)
- [ ] T103 Add ARIA labels and keyboard navigation to all modals and forms
- [ ] T104 [P] Add analytics tracking for key events (project_created, connection_tested, plugin_installed)
- [ ] T105 [P] Sanitize all logs to never expose Application Passwords or encryption keys
- [ ] T106 [P] Add tooltips explaining Application Password generation in wizard
- [ ] T107 Optimize TanStack Query cache settings (5min staleTime for projects)
- [ ] T108 [P] Add error boundary component to catch and display React errors gracefully
- [ ] T109 Test responsive layout on mobile (320px, 768px, 1024px breakpoints)
- [ ] T110 Verify all WordPress API calls use HTTPS only
- [ ] T111 [P] Add unit tests for encryption/decryption utility functions
- [ ] T112 [P] Add integration tests for WordPress endpoints with mocked responses
- [ ] T113 Run manual security audit checklist (credentials never in logs, RLS working, etc.)
- [ ] T114 Update CLAUDE.md if any architecture patterns changed during implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - US1 (Visualizar) → Independent after Phase 2
  - US2 (Adicionar) → Depends on US1 (uses same list view)
  - US2.1 (Plugins) → Depends on US2 (part of wizard)
  - US3 (Testar) → Depends on US1 (uses project list), independent of US2
  - US4 (Reinstalar) → Depends on US3 (uses same test endpoint)
  - US5 (Editar) → Depends on US1 (uses project list), independent of US2-4
  - US6 (Excluir) → Depends on US1 (uses project list), independent of US2-5
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### Recommended Implementation Order

**MVP (Phases 1-5)**:
1. Phase 1: Setup → Phase 2: Foundational → Phase 3: US1 → Phase 4: US2 → Phase 5: US2.1

**Post-MVP**:
2. Phase 6: US3 → Phase 7: US4 (test & reinstall go together)
3. Phase 8: US5 → Phase 9: US6 (edit & delete go together)
4. Phase 10: Polish

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel within Phase 2
- Within each user story, tasks marked [P] can run in parallel
- User stories with no direct dependencies can be worked in parallel by different developers

---

## Parallel Example: Foundational Phase

```bash
# Launch backend DTOs together:
Task: "Create TestConnectionDto in backend/src/modules/wordpress/dto/test-connection.dto.ts"
Task: "Create InstallPluginDto in backend/src/modules/wordpress/dto/install-plugin.dto.ts"
Task: "Create InstallEssentialPluginsDto in backend/src/modules/wordpress/dto/install-essential-plugins.dto.ts"

# Launch frontend interfaces together:
Task: "Update Project interface in frontend/src/features/projects/types/index.ts"
Task: "Create PluginInstallStatus interface in frontend/src/features/projects/types/index.ts"
Task: "Create WordPressConnectionResult interface in frontend/src/features/projects/types/index.ts"
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US2.1)

1. Complete Phase 1: Setup (database schema)
2. Complete Phase 2: Foundational (CRITICAL - backend/frontend infrastructure)
3. Complete Phase 3: User Story 1 (view projects)
4. Complete Phase 4: User Story 2 (add project wizard)
5. Complete Phase 5: User Story 2.1 (plugin installation)
6. **STOP and VALIDATE**: Test complete flow - user can add WordPress project and see plugins installed
7. Deploy MVP to staging/production

### Incremental Delivery

1. Deploy MVP (US1 + US2 + US2.1) → Users can manage basic project list
2. Add US3 + US4 → Users can test connections and fix issues
3. Add US5 + US6 → Users can edit and delete projects
4. Add Phase 10 → Polish and performance improvements

### Parallel Team Strategy

With 2+ developers:

1. Complete Setup + Foundational together (required)
2. After Foundational:
   - Developer A: US1 (Visualizar) + US2 (Adicionar)
   - Developer B: US2.1 (Plugins) - can start after US2 wizard structure exists
3. After MVP:
   - Developer A: US3 + US4 (test/reinstall features)
   - Developer B: US5 + US6 (edit/delete features)
4. Polish together

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Priority: Complete MVP (US1 + US2 + US2.1) before other stories
- Credentials NEVER exposed in frontend, logs, or error messages
- All WordPress API calls go through backend with proper encryption
