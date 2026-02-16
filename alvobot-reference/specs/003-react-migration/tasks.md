# Tasks: React Migration

**Input**: Design documents from `/specs/003-react-migration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are included where appropriate for critical functionality (auth store).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, etc.)
- All paths are relative to `frontend/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize React project and configure build tooling

- [ ] T001 Create new React project directory at frontend/src-react/ to keep Vue code intact
- [ ] T002 Initialize Vite + React + TypeScript with `npm create vite@latest . -- --template react-ts`
- [ ] T003 [P] Configure path aliases in frontend/vite.config.ts (`@/` → `./src`)
- [ ] T004 [P] Configure TypeScript paths in frontend/tsconfig.json
- [ ] T005 [P] Setup ESLint with React rules in frontend/.eslintrc.cjs
- [ ] T006 [P] Setup Prettier configuration in frontend/.prettierrc
- [ ] T007 Install core dependencies: react-router-dom, zustand, @tanstack/react-query
- [ ] T008 Install Supabase client: @supabase/supabase-js
- [ ] T009 [P] Install UI libraries: lucide-react, clsx, react-hook-form, zod
- [ ] T010 [P] Copy CSS variables from frontend/src/assets/styles/variables.css to new src/assets/styles/
- [ ] T011 [P] Copy images from frontend/src/assets/images/ to new src/assets/images/
- [ ] T012 Create directory structure per plan.md (src/app/, src/features/, src/shared/)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure required before ANY user story can begin

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Shared Types

- [ ] T013 [P] Create base TypeScript types in frontend/src/shared/types/index.ts (User, Session, ApiError)
- [ ] T014 [P] Create entity types in frontend/src/shared/types/entities.ts (Project, Article, Task, etc.)

### Supabase Client

- [ ] T015 Create Supabase client singleton in frontend/src/shared/utils/supabase.ts
- [ ] T016 Create environment validation in frontend/src/shared/utils/env.ts

### Query Client Setup

- [ ] T017 Configure TanStack Query client in frontend/src/app/providers.tsx
- [ ] T018 Create query key factory in frontend/src/shared/utils/queryKeys.ts

### Shared Components (11 base components)

- [ ] T019 [P] Create Button component in frontend/src/shared/components/Button/index.tsx
- [ ] T020 [P] Create Button styles in frontend/src/shared/components/Button/Button.module.css
- [ ] T021 [P] Create Input component in frontend/src/shared/components/Input/index.tsx
- [ ] T022 [P] Create Input styles in frontend/src/shared/components/Input/Input.module.css
- [ ] T023 [P] Create Modal component in frontend/src/shared/components/Modal/index.tsx
- [ ] T024 [P] Create Modal styles in frontend/src/shared/components/Modal/Modal.module.css
- [ ] T025 [P] Create Card component in frontend/src/shared/components/Card/index.tsx
- [ ] T026 [P] Create Card styles in frontend/src/shared/components/Card/Card.module.css
- [ ] T027 [P] Create Alert component in frontend/src/shared/components/Alert/index.tsx
- [ ] T028 [P] Create Alert styles in frontend/src/shared/components/Alert/Alert.module.css
- [ ] T029 [P] Create Spinner component in frontend/src/shared/components/Spinner/index.tsx
- [ ] T030 [P] Create Spinner styles in frontend/src/shared/components/Spinner/Spinner.module.css
- [ ] T031 [P] Create Select component in frontend/src/shared/components/Select/index.tsx
- [ ] T032 [P] Create Table component in frontend/src/shared/components/Table/index.tsx
- [ ] T033 [P] Create EmptyState component in frontend/src/shared/components/EmptyState/index.tsx
- [ ] T034 [P] Create Checkbox component in frontend/src/shared/components/Checkbox/index.tsx
- [ ] T035 [P] Create Textarea component in frontend/src/shared/components/Textarea/index.tsx
- [ ] T036 Create shared components barrel export in frontend/src/shared/components/index.ts

### App Shell

- [ ] T037 Create App root component in frontend/src/app/App.tsx
- [ ] T038 Create main entry point in frontend/src/main.tsx
- [ ] T039 Create global styles in frontend/src/index.css

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Authentication Flow (Priority: P1) 🎯 MVP

**Goal**: Users can log in, sign up, reset password, and manage their session

**Independent Test**: Create account → Login → Logout → Reset password

### Auth Store & Hooks

- [ ] T040 [US1] Create auth Zustand store in frontend/src/features/auth/stores/authStore.ts
- [ ] T041 [US1] Create useAuth hook in frontend/src/features/auth/hooks/useAuth.ts
- [ ] T042 [US1] Create auth store unit tests in frontend/src/features/auth/stores/__tests__/authStore.test.ts

### Auth Pages

- [ ] T043 [P] [US1] Create LoginPage component in frontend/src/features/auth/pages/LoginPage.tsx
- [ ] T044 [P] [US1] Create LoginPage styles in frontend/src/features/auth/pages/LoginPage.module.css
- [ ] T045 [P] [US1] Create SignupPage component in frontend/src/features/auth/pages/SignupPage.tsx
- [ ] T046 [P] [US1] Create SignupPage styles in frontend/src/features/auth/pages/SignupPage.module.css
- [ ] T047 [P] [US1] Create ForgotPasswordPage in frontend/src/features/auth/pages/ForgotPasswordPage.tsx
- [ ] T048 [P] [US1] Create ResetPasswordPage in frontend/src/features/auth/pages/ResetPasswordPage.tsx

### Route Protection

- [ ] T049 [US1] Create ProtectedRoute component in frontend/src/shared/components/ProtectedRoute/index.tsx
- [ ] T050 [US1] Create auth routes in frontend/src/app/router.tsx (login, signup, forgot-password, reset-password)

**Checkpoint**: Auth flow complete - users can authenticate

---

## Phase 4: User Story 2 - Dashboard and Navigation (Priority: P1)

**Goal**: Users can navigate the app and view dashboard with metrics

**Independent Test**: Login → View dashboard → Navigate to all sections

### Layout

- [ ] T051 [P] [US2] Create MainLayout component in frontend/src/shared/layouts/MainLayout/index.tsx
- [ ] T052 [P] [US2] Create MainLayout styles in frontend/src/shared/layouts/MainLayout/MainLayout.module.css
- [ ] T053 [P] [US2] Create Sidebar component in frontend/src/shared/layouts/MainLayout/Sidebar.tsx
- [ ] T054 [P] [US2] Create Header component in frontend/src/shared/layouts/MainLayout/Header.tsx

### Dashboard

- [ ] T055 [US2] Create DashboardPage in frontend/src/features/dashboard/pages/DashboardPage.tsx
- [ ] T056 [US2] Create DashboardPage styles in frontend/src/features/dashboard/pages/DashboardPage.module.css
- [ ] T057 [US2] Create dashboard widgets in frontend/src/features/dashboard/components/

### Router Configuration

- [ ] T058 [US2] Configure all protected routes in frontend/src/app/router.tsx
- [ ] T059 [US2] Create NotFoundPage in frontend/src/shared/pages/NotFoundPage.tsx
- [ ] T060 [US2] Implement lazy loading for all route components

**Checkpoint**: Navigation complete - users can move between sections

---

## Phase 5: User Story 3 - Projects Management (Priority: P2)

**Goal**: Users can CRUD projects with all data preserved

**Independent Test**: Create project → Edit → View list → Delete

### Projects Types & API

- [ ] T061 [P] [US3] Create Project types in frontend/src/features/projects/types/index.ts
- [ ] T062 [US3] Create useProjects query hook in frontend/src/features/projects/api/useProjects.ts
- [ ] T063 [US3] Create useProject query hook in frontend/src/features/projects/api/useProject.ts
- [ ] T064 [US3] Create project mutation hooks in frontend/src/features/projects/api/mutations.ts

### Projects Pages

- [ ] T065 [P] [US3] Create ProjectsPage in frontend/src/features/projects/pages/ProjectsPage.tsx
- [ ] T066 [P] [US3] Create ProjectsPage styles in frontend/src/features/projects/pages/ProjectsPage.module.css
- [ ] T067 [P] [US3] Create ProjectDetailPage in frontend/src/features/projects/pages/ProjectDetailPage.tsx
- [ ] T068 [P] [US3] Create ProjectDetailPage styles in frontend/src/features/projects/pages/ProjectDetailPage.module.css

### Projects Components

- [ ] T069 [P] [US3] Create ProjectCard component in frontend/src/features/projects/components/ProjectCard.tsx
- [ ] T070 [P] [US3] Create ProjectForm component in frontend/src/features/projects/components/ProjectForm.tsx
- [ ] T071 [US3] Create ProjectList component in frontend/src/features/projects/components/ProjectList.tsx

**Checkpoint**: Projects module complete

---

## Phase 6: User Story 4 - Articles Management (Priority: P2)

**Goal**: Users can create/edit articles with rich text editor

**Independent Test**: Create article → Format text → Add images → Save → Edit

### Tiptap Setup

- [ ] T072 Install Tiptap React packages: @tiptap/react, @tiptap/starter-kit, extensions
- [ ] T073 [US4] Create TiptapEditor component in frontend/src/features/articles/components/TiptapEditor.tsx
- [ ] T074 [US4] Create TiptapEditor styles in frontend/src/features/articles/components/TiptapEditor.module.css
- [ ] T075 [US4] Configure Tiptap extensions (tables, images, links, markdown) in frontend/src/features/articles/components/tiptapConfig.ts

### Articles API

- [ ] T076 [P] [US4] Create Article types in frontend/src/features/articles/types/index.ts
- [ ] T077 [US4] Create useArticles query hook in frontend/src/features/articles/api/useArticles.ts
- [ ] T078 [US4] Create useArticle query hook in frontend/src/features/articles/api/useArticle.ts
- [ ] T079 [US4] Create article mutation hooks in frontend/src/features/articles/api/mutations.ts

### Articles Pages

- [ ] T080 [P] [US4] Create ArticlesPage in frontend/src/features/articles/pages/ArticlesPage.tsx
- [ ] T081 [P] [US4] Create ArticlesPage styles in frontend/src/features/articles/pages/ArticlesPage.module.css
- [ ] T082 [US4] Create ArticleEditPage in frontend/src/features/articles/pages/ArticleEditPage.tsx
- [ ] T083 [US4] Create ArticleEditPage styles in frontend/src/features/articles/pages/ArticleEditPage.module.css

**Checkpoint**: Articles module with rich text editor complete

---

## Phase 7: User Story 5 - Tasks and Calendar (Priority: P2)

**Goal**: Users can manage tasks and view them on calendar

**Independent Test**: Create task → Set due date → View on calendar → Mark complete

### Tasks API

- [ ] T084 [P] [US5] Create Task types in frontend/src/features/tasks/types/index.ts
- [ ] T085 [US5] Create useTasks query hook in frontend/src/features/tasks/api/useTasks.ts
- [ ] T086 [US5] Create task mutation hooks in frontend/src/features/tasks/api/mutations.ts

### Tasks Page

- [ ] T087 [US5] Create TasksPage in frontend/src/features/tasks/pages/TasksPage.tsx
- [ ] T088 [US5] Create TasksPage styles in frontend/src/features/tasks/pages/TasksPage.module.css
- [ ] T089 [P] [US5] Create TaskCard component in frontend/src/features/tasks/components/TaskCard.tsx
- [ ] T090 [P] [US5] Create TaskForm component in frontend/src/features/tasks/components/TaskForm.tsx

### Calendar

- [ ] T091 Install react-datepicker package
- [ ] T092 [US5] Create CalendarPage in frontend/src/features/calendar/pages/CalendarPage.tsx
- [ ] T093 [US5] Create CalendarPage styles in frontend/src/features/calendar/pages/CalendarPage.module.css
- [ ] T094 [US5] Create CalendarView component in frontend/src/features/calendar/components/CalendarView.tsx
- [ ] T095 [US5] Create useTasksByDate hook in frontend/src/features/calendar/api/useTasksByDate.ts

**Checkpoint**: Tasks and Calendar modules complete

---

## Phase 8: User Story 6 - Automation Flows (Priority: P3)

**Goal**: Users can create/edit automation flows with visual editor

**Independent Test**: Create flow → Add nodes → Connect → Save → Edit

### React Flow Setup

- [ ] T096 Install reactflow package
- [ ] T097 [US6] Create Flow types in frontend/src/features/flows/types/index.ts
- [ ] T098 [US6] Create custom node types in frontend/src/features/flows/components/nodes/

### Flows API

- [ ] T099 [US6] Create useFlows query hook in frontend/src/features/flows/api/useFlows.ts
- [ ] T100 [US6] Create useFlow query hook in frontend/src/features/flows/api/useFlow.ts
- [ ] T101 [US6] Create flow mutation hooks in frontend/src/features/flows/api/mutations.ts

### Flows Pages

- [ ] T102 [P] [US6] Create FlowsPage in frontend/src/features/flows/pages/FlowsPage.tsx
- [ ] T103 [P] [US6] Create FlowsPage styles in frontend/src/features/flows/pages/FlowsPage.module.css
- [ ] T104 [US6] Create FlowEditorPage in frontend/src/features/flows/pages/FlowEditorPage.tsx
- [ ] T105 [US6] Create FlowEditorPage styles in frontend/src/features/flows/pages/FlowEditorPage.module.css
- [ ] T106 [US6] Create FlowCanvas component in frontend/src/features/flows/components/FlowCanvas.tsx

**Checkpoint**: Flows module with visual editor complete

---

## Phase 9: User Story 7 - Keywords and Scraper (Priority: P3)

**Goal**: Users can research keywords and use scraper tool

**Independent Test**: Search keyword → View results → Run scraper

### Keywords Module

- [ ] T107 [P] [US7] Create Keyword types in frontend/src/features/keywords/types/index.ts
- [ ] T108 [US7] Create useKeywords query hook in frontend/src/features/keywords/api/useKeywords.ts
- [ ] T109 [US7] Create KeywordsPage in frontend/src/features/keywords/pages/KeywordsPage.tsx
- [ ] T110 [US7] Create KeywordsPage styles in frontend/src/features/keywords/pages/KeywordsPage.module.css
- [ ] T111 [P] [US7] Create KeywordSearch component in frontend/src/features/keywords/components/KeywordSearch.tsx

### Scraper Module

- [ ] T112 [P] [US7] Create ScraperPage in frontend/src/features/scraper/pages/ScraperPage.tsx
- [ ] T113 [P] [US7] Create ScraperPage styles in frontend/src/features/scraper/pages/ScraperPage.module.css
- [ ] T114 [US7] Create ScraperForm component in frontend/src/features/scraper/components/ScraperForm.tsx
- [ ] T115 [US7] Create ScraperResults component in frontend/src/features/scraper/components/ScraperResults.tsx

**Checkpoint**: Keywords and Scraper modules complete

---

## Phase 10: User Story 8 - Settings and User Management (Priority: P3)

**Goal**: Users can manage settings, admins can manage users

**Independent Test**: Change settings → Verify persistence → Admin: view users

### Runs Module (Execution History)

- [ ] T116 [P] [US8] Create Run types in frontend/src/features/runs/types/index.ts
- [ ] T117 [US8] Create useRuns query hook in frontend/src/features/runs/api/useRuns.ts
- [ ] T118 [US8] Create RunsPage in frontend/src/features/runs/pages/RunsPage.tsx
- [ ] T119 [US8] Create RunDetailPage in frontend/src/features/runs/pages/RunDetailPage.tsx

### Connections Module

- [ ] T120 [P] [US8] Create Connection types in frontend/src/features/connections/types/index.ts
- [ ] T121 [US8] Create useConnections query hook in frontend/src/features/connections/api/useConnections.ts
- [ ] T122 [US8] Create ConnectionsPage in frontend/src/features/connections/pages/ConnectionsPage.tsx
- [ ] T123 [US8] Create ConnectionsPage styles in frontend/src/features/connections/pages/ConnectionsPage.module.css

### Settings Module

- [ ] T124 [US8] Create SettingsPage in frontend/src/features/settings/pages/SettingsPage.tsx
- [ ] T125 [US8] Create SettingsPage styles in frontend/src/features/settings/pages/SettingsPage.module.css
- [ ] T126 [US8] Create settings form components in frontend/src/features/settings/components/

### Users Module (Admin)

- [ ] T127 [US8] Create UsersPage in frontend/src/features/users/pages/UsersPage.tsx
- [ ] T128 [US8] Create UsersPage styles in frontend/src/features/users/pages/UsersPage.module.css
- [ ] T129 [US8] Create useUsers query hook in frontend/src/features/users/api/useUsers.ts
- [ ] T130 [US8] Create admin route guard in frontend/src/shared/components/AdminRoute/index.tsx

**Checkpoint**: All feature modules complete

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Visual enhancements, testing, and deployment preparation

### Visual Enhancements

- [ ] T131 [P] Add micro-interactions (hover effects) across all components
- [ ] T132 [P] Enhance shadows and depth in Card, Modal, Button components
- [ ] T133 [P] Add subtle animations for loading/success/error states
- [ ] T134 [P] Improve typography spacing in all pages
- [ ] T135 Review and polish responsive design for mobile (320px+)

### Testing

- [ ] T136 Setup Vitest configuration in frontend/vitest.config.ts
- [ ] T137 [P] Add unit tests for critical hooks (useAuth, useProjects, useArticles)
- [ ] T138 Setup Playwright configuration in frontend/playwright.config.ts
- [ ] T139 Create E2E test for auth flow in frontend/tests/e2e/auth.spec.ts
- [ ] T140 Create E2E test for navigation in frontend/tests/e2e/navigation.spec.ts
- [ ] T141 Create E2E test for CRUD operations in frontend/tests/e2e/crud.spec.ts

### Performance & Build

- [ ] T142 Configure code splitting for all routes
- [ ] T143 Optimize bundle size (analyze with vite-plugin-visualizer)
- [ ] T144 Test build output with `npm run build`
- [ ] T145 Verify production build runs correctly with `npm run preview`

### Final Verification

- [ ] T146 Run full feature parity check against Vue application
- [ ] T147 Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] T148 Performance benchmark: page load < 3s on 3G
- [ ] T149 Update README with React-specific instructions
- [ ] T150 Final cleanup: remove Vue backup files when ready for production

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 - BLOCKS all user stories
- **Phases 3-10 (User Stories)**: All depend on Phase 2 completion
  - US1 and US2 are P1 priority - complete first
  - US3-US5 are P2 priority - complete second
  - US6-US8 are P3 priority - complete last
- **Phase 11 (Polish)**: Depends on all user stories being complete

### User Story Dependencies

| Story | Priority | Can Start After | Dependencies |
|-------|----------|-----------------|--------------|
| US1 (Auth) | P1 | Phase 2 | None |
| US2 (Dashboard) | P1 | Phase 2 + US1 | Auth for protected routes |
| US3 (Projects) | P2 | US2 | Navigation for routing |
| US4 (Articles) | P2 | US2 | Navigation for routing |
| US5 (Tasks/Calendar) | P2 | US2 | Navigation for routing |
| US6 (Flows) | P3 | US2 | Navigation for routing |
| US7 (Keywords/Scraper) | P3 | US2 | Navigation for routing |
| US8 (Settings/Users) | P3 | US2 | Navigation for routing |

### Parallel Opportunities

**Within Phase 2 (Foundational)**:
```
T013-T014 (Types) can run in parallel
T019-T035 (All shared components) can run in parallel
```

**Within User Stories**:
```
US3-US8 can run in parallel after US1+US2 complete (if team capacity)
Pages within each story marked [P] can run in parallel
```

---

## Parallel Example: Shared Components (Phase 2)

```bash
# All these can run simultaneously:
Task: "Create Button component in frontend/src/shared/components/Button/index.tsx"
Task: "Create Input component in frontend/src/shared/components/Input/index.tsx"
Task: "Create Modal component in frontend/src/shared/components/Modal/index.tsx"
Task: "Create Card component in frontend/src/shared/components/Card/index.tsx"
Task: "Create Alert component in frontend/src/shared/components/Alert/index.tsx"
Task: "Create Spinner component in frontend/src/shared/components/Spinner/index.tsx"
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup (T001-T012)
2. Complete Phase 2: Foundational (T013-T039)
3. Complete Phase 3: US1 - Auth (T040-T050)
4. Complete Phase 4: US2 - Dashboard (T051-T060)
5. **STOP and VALIDATE**: Test auth + navigation independently
6. Deploy/demo if ready - this is your MVP!

### Incremental Delivery

1. Setup + Foundation → Foundation ready
2. Add US1 + US2 → Test → **MVP!**
3. Add US3 (Projects) → Test → Demo
4. Add US4 (Articles) → Test → Demo
5. Add US5 (Tasks/Calendar) → Test → Demo
6. Add US6-US8 (Advanced) → Test → Demo
7. Polish → Final release

### Task Summary

| Phase | Tasks | Parallel Tasks |
|-------|-------|----------------|
| Setup | 12 | 6 |
| Foundational | 27 | 20 |
| US1 (Auth) | 11 | 6 |
| US2 (Dashboard) | 10 | 4 |
| US3 (Projects) | 11 | 5 |
| US4 (Articles) | 12 | 4 |
| US5 (Tasks/Calendar) | 12 | 3 |
| US6 (Flows) | 11 | 3 |
| US7 (Keywords/Scraper) | 9 | 5 |
| US8 (Settings/Users) | 15 | 3 |
| Polish | 20 | 6 |
| **Total** | **150** | **65** |

---

## Notes

- [P] tasks can run in parallel (different files, no dependencies)
- [Story] label maps task to specific user story
- Each user story is independently testable after completion
- Commit after each task or logical group
- Stop at any checkpoint to validate and demo
- Vue source remains in `src-vue-backup/` until final migration
