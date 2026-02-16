# Implementation Tasks: Frontend Modernization

**Feature**: 002-frontend-modernization
**Branch**: `002-frontend-modernization`
**Generated**: 2025-12-04

**Quick Links**: [Spec](./spec.md) | [Plan](./plan.md) | [Research](./research.md) | [Architecture](./data-model.md) | [Quickstart](./quickstart.md)

---

## Overview

This document provides a dependency-ordered task list for implementing the frontend modernization feature. Tasks are organized by user story to enable independent implementation and parallel execution where possible.

**Total Tasks**: 89
**User Stories**: 5 (prioritized P1 → P3)
**Estimated Duration**: 4-5 weeks

---

## Phase 1: Setup & Foundation (Week 1, Days 1-2)

**Objective**: Establish foundational infrastructure required for all user stories

### Setup Tasks

- [ ] T001 Create pre-migration backup tag: `git tag pre-migration-002-complete`
- [ ] T002 [P] Create feature directory structure in frontend/src/features/ (auth, tasks, articles, projects, calendar, flows, runs, keywords, settings, connections, scraper, users)
- [ ] T003 [P] Create shared directory structure in frontend/src/shared/ (components, composables, utils, constants, types, layouts, pages)
- [ ] T004 [P] Create router directory structure in frontend/src/router/
- [ ] T005 [P] Create stores directory in frontend/src/stores/
- [ ] T006 [P] Create Supabase client utility in frontend/src/shared/utils/supabase.ts
- [ ] T007 [P] Create Axios client utility in frontend/src/shared/utils/axios.ts
- [ ] T008 [P] Create date utilities in frontend/src/shared/utils/date.ts
- [ ] T009 [P] Create formula utilities in frontend/src/shared/utils/formulas.ts
- [ ] T010 Create Vue Router setup in frontend/src/router/index.ts
- [ ] T011 Create route definitions skeleton in frontend/src/router/routes.ts
- [ ] T012 Create navigation guards in frontend/src/router/guards.ts
- [ ] T013 Create root App.vue in frontend/src/App.vue
- [ ] T014 Create main.ts entry point in frontend/src/main.ts
- [ ] T015 Update index.html to single SPA entry point
- [ ] T016 Update Vite config for single entry and optimized chunking in vite.config.ts
- [ ] T017 Update TypeScript config for path aliases in tsconfig.json
- [ ] T018 Install Vitest and test utilities: `npm install -D vitest @vue/test-utils jsdom`
- [ ] T019 Create vitest.config.ts configuration
- [ ] T020 [P] Create .env.example template with documented variables
- [ ] T021 Test foundation: `npm run dev` should start without errors
- [ ] T022 Commit foundation: `git commit -m "feat: Phase 1 - Foundation setup" && git tag migration-002-phase-1`

**Checkpoint**: Foundation builds and runs ✅

---

## Phase 2: User Story 1 - Code Organization (P1, Week 1, Days 3-5)

**Goal**: Organize frontend code using modern feature-based architecture for developer productivity

**Independent Test**: Navigate src/ directory, verify features are self-contained with components/pages/stores/api

### US1: Feature Module Structure

- [ ] T023 [US1] Create auth feature subdirectories (components, pages, stores, api, composables, types) in frontend/src/features/auth/
- [ ] T024 [P] [US1] Create tasks feature subdirectories in frontend/src/features/tasks/
- [ ] T025 [P] [US1] Create articles feature subdirectories in frontend/src/features/articles/
- [ ] T026 [P] [US1] Create projects feature subdirectories in frontend/src/features/projects/
- [ ] T027 [P] [US1] Create calendar feature subdirectories in frontend/src/features/calendar/
- [ ] T028 [P] [US1] Create flows feature subdirectories in frontend/src/features/flows/
- [ ] T029 [P] [US1] Create runs feature subdirectories in frontend/src/features/runs/
- [ ] T030 [P] [US1] Create keywords feature subdirectories in frontend/src/features/keywords/
- [ ] T031 [P] [US1] Create settings feature subdirectories in frontend/src/features/settings/
- [ ] T032 [P] [US1] Create connections feature subdirectories in frontend/src/features/connections/
- [ ] T033 [P] [US1] Create scraper feature subdirectories in frontend/src/features/scraper/
- [ ] T034 [P] [US1] Create users feature subdirectories in frontend/src/features/users/
- [ ] T035 [US1] Create ESLint rule to prevent cross-feature imports in .eslintrc.js
- [ ] T036 [US1] Document feature module pattern in frontend/ARCHITECTURE.md (section: Feature Modules)
- [ ] T037 [US1] Test organization: Verify developer can locate auth code in src/features/auth/ within 10 seconds (SC-001)
- [ ] T038 [US1] Commit organization: `git commit -m "feat(US1): Feature-based directory structure" && git tag migration-002-us1`

**US1 Acceptance**: ✅ All features have isolated directories, ESLint enforces boundaries, ARCHITECTURE.md documents pattern

---

## Phase 3: User Story 2 - State Management Clarity (P1, Week 1-2)

**Goal**: Consolidate to single Pinia state management system, remove Vuex

**Independent Test**: Verify all state in Pinia stores (no Vuex), Vue DevTools shows only Pinia

### US2: Auth Store Migration (Critical Path)

- [ ] T039 [US2] Create auth Pinia store in frontend/src/features/auth/stores/auth.ts (user, session, isAuthenticated, initialize, login, logout)
- [ ] T040 [US2] Create auth API module in frontend/src/features/auth/api/auth.ts (login, signUp, logout, getUser using Supabase)
- [ ] T041 [US2] Create auth types in frontend/src/features/auth/types/index.ts
- [ ] T042 [US2] Update router guards to use auth store in frontend/src/router/guards.ts
- [ ] T043 [US2] Test auth store: Login/logout functionality works

### US2: Feature Store Migration (Parallel)

- [ ] T044 [P] [US2] Migrate tasks Vuex store to Pinia in frontend/src/features/tasks/stores/tasks.ts
- [ ] T045 [P] [US2] Migrate articles Vuex store to Pinia in frontend/src/features/articles/stores/articles.ts
- [ ] T046 [P] [US2] Migrate projects Vuex store to Pinia in frontend/src/features/projects/stores/projects.ts
- [ ] T047 [P] [US2] Migrate calendar Vuex store to Pinia in frontend/src/features/calendar/stores/calendar.ts
- [ ] T048 [P] [US2] Migrate flows Vuex store to Pinia in frontend/src/features/flows/stores/flows.ts
- [ ] T049 [P] [US2] Migrate runs Vuex store to Pinia in frontend/src/features/runs/stores/runs.ts
- [ ] T050 [P] [US2] Migrate keywords Vuex store to Pinia in frontend/src/features/keywords/stores/keywords.ts

### US2: Global Store Migration

- [ ] T051 [US2] Create app Pinia store (from Vuex front) in frontend/src/stores/app.ts
- [ ] T052 [US2] Create notifications Pinia store in frontend/src/stores/notifications.ts
- [ ] T053 [US2] Remove Vuex directory: `rm -rf frontend/src/store/`
- [ ] T054 [US2] Uninstall Vuex: `npm uninstall vuex`
- [ ] T055 [US2] Update all component imports from Vuex to Pinia across codebase
- [ ] T056 [US2] Document Pinia patterns in frontend/ARCHITECTURE.md (section: State Management)
- [ ] T057 [US2] Test state management: All features access state via Pinia, Vue DevTools shows only Pinia stores (SC-005)
- [ ] T058 [US2] Commit state migration: `git commit -m "feat(US2): Consolidate to Pinia state management" && git tag migration-002-us2`

**US2 Acceptance**: ✅ Zero Vuex in package.json, all state in Pinia, Vue DevTools validation passes

---

## Phase 4: User Story 3 - Environment Configuration (P2, Week 2)

**Goal**: Clean, documented environment variables without WeWeb references

**Independent Test**: Review .env and .env.example, verify no WeWeb URLs, deployment succeeds with documented vars

### US3: Environment Cleanup

- [ ] T059 [P] [US3] Remove VITE_APP_CDN_URL from frontend/.env
- [ ] T060 [P] [US3] Remove VITE_APP_API_URL from frontend/.env
- [ ] T061 [P] [US3] Remove VITE_APP_PLUGINS_URL from frontend/.env
- [ ] T062 [P] [US3] Remove VITE_APP_PREVIEW_URL from frontend/.env
- [ ] T063 [US3] Update all WeWeb URL references to use VITE_API_URL for backend or remove
- [ ] T064 [US3] Verify .env.example has all required variables documented
- [ ] T065 [US3] Document environment variables in frontend/ARCHITECTURE.md (section: Environment Configuration)
- [ ] T066 [US3] Test environment: Search codebase for WeWeb URL references, verify zero found (SC-003)
- [ ] T067 [US3] Test deployment: Deploy to staging with only .env.example variables
- [ ] T068 [US3] Commit environment cleanup: `git commit -m "feat(US3): Remove WeWeb environment variables" && git tag migration-002-us3`

**US3 Acceptance**: ✅ Zero WeWeb URLs in environment, .env.example complete, staging deployment succeeds

---

## Phase 5: User Story 4 - Single Page Application (P2, Week 2-3)

**Goal**: True SPA architecture with single index.html and dynamic routing

**Independent Test**: Verify only one index.html, navigation works without page reloads

### US4: Auth Pages Migration

- [ ] T069 [US4] Create LoginPage component in frontend/src/features/auth/pages/LoginPage.vue
- [ ] T070 [US4] Create SignupPage component in frontend/src/features/auth/pages/SignupPage.vue
- [ ] T071 [US4] Create ForgotPasswordPage component in frontend/src/features/auth/pages/ForgotPasswordPage.vue
- [ ] T072 [US4] Create ResetPasswordPage component in frontend/src/features/auth/pages/ResetPasswordPage.vue
- [ ] T073 [US4] Add auth routes to frontend/src/router/routes.ts (login, signup, forgot-password, reset-password)
- [ ] T074 [US4] Remove old auth HTML files: `rm -rf frontend/login/ frontend/create/ frontend/forgot-password/ frontend/reset-password/ frontend/email-sent/`

### US4: Feature Pages Migration (Parallel Tracks)

**Track A: Tasks & Articles**
- [ ] T075 [P] [US4] Create TasksPage in frontend/src/features/tasks/pages/TasksPage.vue
- [ ] T076 [P] [US4] Create ArticlesPage in frontend/src/features/articles/pages/ArticlesPage.vue
- [ ] T077 [P] [US4] Create ArticleEditPage in frontend/src/features/articles/pages/ArticleEditPage.vue

**Track B: Projects & Calendar**
- [ ] T078 [P] [US4] Create ProjectsPage in frontend/src/features/projects/pages/ProjectsPage.vue
- [ ] T079 [P] [US4] Create ProjectDetailPage in frontend/src/features/projects/pages/ProjectDetailPage.vue
- [ ] T080 [P] [US4] Create CalendarPage in frontend/src/features/calendar/pages/CalendarPage.vue

**Track C: Workflows & Runs**
- [ ] T081 [P] [US4] Create FlowsPage in frontend/src/features/flows/pages/FlowsPage.vue
- [ ] T082 [P] [US4] Create FlowDetailPage in frontend/src/features/flows/pages/FlowDetailPage.vue
- [ ] T083 [P] [US4] Create RunsPage in frontend/src/features/runs/pages/RunsPage.vue

**Track D: Keywords & Settings**
- [ ] T084 [P] [US4] Create KeywordsPage in frontend/src/features/keywords/pages/KeywordsPage.vue
- [ ] T085 [P] [US4] Create SettingsPage in frontend/src/features/settings/pages/SettingsPage.vue

**Track E: Integrations & Admin**
- [ ] T086 [P] [US4] Create ConnectionsPage in frontend/src/features/connections/pages/ConnectionsPage.vue
- [ ] T087 [P] [US4] Create ScraperPage in frontend/src/features/scraper/pages/ScraperPage.vue
- [ ] T088 [P] [US4] Create UsersPage in frontend/src/features/users/pages/UsersPage.vue

### US4: Route Consolidation

- [ ] T089 [US4] Add all feature routes to frontend/src/router/routes.ts with lazy loading
- [ ] T090 [US4] Create AuthenticatedLayout in frontend/src/shared/layouts/AuthenticatedLayout.vue
- [ ] T091 [US4] Create PublicLayout in frontend/src/shared/layouts/PublicLayout.vue
- [ ] T092 [US4] Create NotFoundPage in frontend/src/shared/pages/NotFoundPage.vue
- [ ] T093 [US4] Remove all old HTML entry points: `find frontend/ -name 'index.html' ! -path 'frontend/index.html' -delete`
- [ ] T094 [US4] Update Vite config to remove multiple entry points
- [ ] T095 [US4] Test SPA navigation: Click through all routes, verify no page reloads (SC-004)
- [ ] T096 [US4] Test code splitting: Verify lazy-loaded routes in build output
- [ ] T097 [US4] Document routing architecture in frontend/ARCHITECTURE.md (section: Routing)
- [ ] T098 [US4] Commit SPA consolidation: `git commit -m "feat(US4): Consolidate to single SPA" && git tag migration-002-us4`

**US4 Acceptance**: ✅ Only one index.html, all routes lazy-loaded, navigation without page reloads

---

## Phase 6: User Story 5 - Legacy Code Removal (P3, Week 3-4)

**Goal**: Remove WeWeb legacy code (wwLib/, underscore prefixes) for clean codebase

**Independent Test**: Search for "ww" and underscore directories, verify minimal/isolated results

### US5: WeWeb Service Replacement

- [ ] T099 [P] [US5] Replace wwAuth calls with Supabase Auth direct across all components
- [ ] T100 [P] [US5] Replace wwCollection calls with Pinia store methods across all components
- [ ] T101 [P] [US5] Replace wwVariable calls with Pinia reactive state across all components
- [ ] T102 [P] [US5] Replace wwWorkflow calls with Vue composables across all components
- [ ] T103 [P] [US5] Replace wwFormula calls with utility functions across all components
- [ ] T104 [P] [US5] Replace wwElement with native Vue components across all components
- [ ] T105 [P] [US5] Replace wwPageHelper with Vue Router direct across all components

### US5: WeWeb Directory Removal

- [ ] T106 [US5] Remove wwLib directory: `rm -rf frontend/src/wwLib/`
- [ ] T107 [US5] Remove _common directory: `rm -rf frontend/src/_common/`
- [ ] T108 [US5] Remove _front directory: `rm -rf frontend/src/_front/`
- [ ] T109 [US5] Verify no remaining wwLib imports: `grep -r "wwLib" frontend/src/`
- [ ] T110 [US5] Verify no remaining _common imports: `grep -r "_common" frontend/src/`
- [ ] T111 [US5] Verify no remaining _front imports: `grep -r "_front" frontend/src/`

### US5: Legacy Directory Cleanup

- [ ] T112 [US5] Remove runs-old directory: `rm -rf frontend/runs-old/`
- [ ] T113 [US5] Remove runs_old2 directory: `rm -rf frontend/runs_old2/`
- [ ] T114 [US5] Remove test directory: `rm -rf frontend/test/`
- [ ] T115 [US5] Remove style-guide directory: `rm -rf frontend/style-guide/`

### US5: Component Reorganization

- [ ] T116 [US5] Audit UUID components in frontend/src/components/elements/ (create mapping document)
- [ ] T117 [US5] Rename and migrate UUID components to semantic feature names (batch 1: auth, tasks, articles)
- [ ] T118 [US5] Rename and migrate UUID components to semantic feature names (batch 2: projects, calendar, flows)
- [ ] T119 [US5] Rename and migrate UUID components to semantic feature names (batch 3: remaining features)
- [ ] T120 [US5] Identify shared components used 3+ times, move to frontend/src/shared/components/
- [ ] T121 [US5] Remove old UUID component directory: `rm -rf frontend/src/components/elements/`
- [ ] T122 [US5] Document shared component promotion rule in frontend/ARCHITECTURE.md (section: Shared Components)

### US5: Validation

- [ ] T123 [US5] Search for "ww" prefix: `grep -r "\\bww[A-Z]" frontend/src/`, verify only necessary references
- [ ] T124 [US5] Search for underscore directories: `find frontend/src -name '_*'`, verify none found
- [ ] T125 [US5] Test build: `npm run build` succeeds without WeWeb dependencies
- [ ] T126 [US5] Commit legacy removal: `git commit -m "feat(US5): Remove WeWeb legacy code" && git tag migration-002-us5`

**US5 Acceptance**: ✅ Zero wwLib/, zero underscore directories, WeWeb references minimal and isolated

---

## Phase 7: Testing & Validation (Week 4-5)

**Objective**: Comprehensive testing to ensure zero regression (FR-012, SC-010)

### Manual Testing Checklist Creation

- [ ] T127 Create manual testing checklist in specs/002-frontend-modernization/checklists/manual-testing.md
- [ ] T128 Document authentication test scenarios (login, signup, password reset, logout, session persistence)
- [ ] T129 Document task management test scenarios (list, create, edit, delete, filter, sort)
- [ ] T130 Document article management test scenarios (list, create, edit with TipTap, save, delete, images)
- [ ] T131 Document project management test scenarios (list, create, edit, delete, integrations)
- [ ] T132 Document keyword mining test scenarios (10x mining, results, export)
- [ ] T133 Document file upload test scenarios (images, documents, Supabase Storage)
- [ ] T134 Document calendar test scenarios (view, events, scheduling)
- [ ] T135 Document workflow test scenarios (flows, execution, runs history)

### Automated Smoke Tests

- [ ] T136 [P] Create auth smoke tests in tests/smoke/auth.test.ts (login form renders, validation)
- [ ] T137 [P] Create navigation smoke tests in tests/smoke/navigation.test.ts (all routes resolve)
- [ ] T138 [P] Create API health smoke tests in tests/smoke/api.test.ts (backend connection)
- [ ] T139 [P] Create store persistence smoke tests in tests/smoke/stores.test.ts (Pinia persists)
- [ ] T140 Run smoke tests: `npm run test`, verify all pass

### Manual Testing Execution

- [ ] T141 Execute authentication testing checklist (6 scenarios)
- [ ] T142 Execute task management testing checklist (7 scenarios)
- [ ] T143 Execute article management testing checklist (7 scenarios)
- [ ] T144 Execute project management testing checklist (5 scenarios)
- [ ] T145 Execute keyword mining testing checklist (4 scenarios)
- [ ] T146 Execute file upload testing checklist (3 scenarios)
- [ ] T147 Execute calendar testing checklist (3 scenarios)
- [ ] T148 Execute workflow testing checklist (4 scenarios)
- [ ] T149 Verify 100% checklist completion (zero failures = SC-010 met)

### Build & Performance Validation

- [ ] T150 Run production build: `npm run build`
- [ ] T151 Verify build output has optimized chunks (vendor, supabase, editor, utils)
- [ ] T152 Measure build time, verify < 5 minutes (baseline for SC-008: 20% improvement)
- [ ] T153 Test production preview: `npm run preview`, verify all features work
- [ ] T154 Measure page load time, verify < 2 seconds (DEPLOYMENT.md benchmark)

---

## Phase 8: Documentation & Deployment (Week 5)

**Objective**: Complete documentation and deploy to production

### Architecture Documentation

- [ ] T155 Create frontend/ARCHITECTURE.md covering all required sections (FR-013)
- [ ] T156 Document folder structure with examples in ARCHITECTURE.md
- [ ] T157 Document feature module pattern with code samples in ARCHITECTURE.md
- [ ] T158 Document shared component rules (3+ uses) in ARCHITECTURE.md
- [ ] T159 Document Pinia state management approach in ARCHITECTURE.md
- [ ] T160 Document Vue Router conventions in ARCHITECTURE.md
- [ ] T161 Document code organization principles in ARCHITECTURE.md

### Pre-Deployment Preparation

- [ ] T162 Update package.json version to 2.0.0-frontend-modernization
- [ ] T163 Create release notes documenting all changes
- [ ] T164 Review all success criteria (SC-001 through SC-010), verify met
- [ ] T165 Create deployment rollback plan document
- [ ] T166 Verify all tests passing: `npm run test`
- [ ] T167 Verify build succeeds: `npm run build`
- [ ] T168 Tag pre-deployment: `git tag v2.0.0-pre-deployment`

### Staging Deployment

- [ ] T169 Merge to staging branch: `git checkout staging && git merge 002-frontend-modernization`
- [ ] T170 Deploy to staging environment
- [ ] T171 Run smoke tests on staging: `curl https://staging.alvobot.ai/health`
- [ ] T172 Execute full manual testing checklist on staging (100% completion required)
- [ ] T173 Monitor staging for 2-3 days, verify stability
- [ ] T174 Document any issues found and resolved

### Production Deployment

- [ ] T175 Merge to main: `git checkout main && git merge 002-frontend-modernization`
- [ ] T176 Tag release: `git tag v2.0.0-frontend-modernization`
- [ ] T177 Push to production: `git push origin main --tags`
- [ ] T178 Deploy to production environment
- [ ] T179 Run immediate smoke tests on production
- [ ] T180 Monitor production for 24 hours (rollback window)
- [ ] T181 Verify all success criteria met in production:
  - SC-001: File location < 10 seconds ✓
  - SC-002: 100% feature isolation ✓
  - SC-003: Zero WeWeb URLs ✓
  - SC-004: One HTML file ✓
  - SC-005: Zero Vuex ✓
  - SC-006-009: Performance metrics baselined for future measurement
  - SC-010: Zero regressions (100% manual checklist pass) ✓

---

## Phase 9: Post-Deployment & Polish (Week 5+)

**Objective**: Post-deployment monitoring and quality improvements

### Monitoring & Validation

- [ ] T182 Set up frontend error monitoring (Sentry or similar)
- [ ] T183 Monitor user feedback for first week
- [ ] T184 Track performance metrics (build time, page load, bundle size)
- [ ] T185 Document baseline metrics for future comparison (SC-006 through SC-009)
- [ ] T186 Create retrospective document with lessons learned

### Polish & Optimization

- [ ] T187 [P] Optimize component lazy loading for faster initial load
- [ ] T188 [P] Add loading skeletons for async data fetching
- [ ] T189 [P] Implement progressive enhancement for offline support
- [ ] T190 [P] Add TypeScript strict mode incrementally
- [ ] T191 [P] Optimize bundle splitting further based on usage analytics
- [ ] T192 [P] Add E2E tests for critical user journeys (Playwright)

### Knowledge Transfer

- [ ] T193 Conduct architecture walkthrough for team
- [ ] T194 Document common patterns and anti-patterns
- [ ] T195 Create onboarding guide for new developers (leverage SC-007: 50% faster onboarding)
- [ ] T196 Update team documentation with migration lessons learned

---

## Dependencies & Parallel Execution

### Critical Path (Sequential)

```
Phase 1 (Setup) → Phase 2 (US1: Organization) → Phase 3 (US2: State Management)
→ Phase 4 (US3: Environment) → Phase 5 (US4: SPA) → Phase 6 (US5: Legacy Removal)
→ Phase 7 (Testing) → Phase 8 (Deployment) → Phase 9 (Post-Deployment)
```

### User Story Dependencies

- **US1** (Code Organization): No dependencies, can start after Setup ✅
- **US2** (State Management): Requires US1 directory structure ⚠️
- **US3** (Environment): Independent, can run parallel with US1/US2 ✅
- **US4** (SPA): Requires US1 directories and US2 stores ⚠️
- **US5** (Legacy Removal): Requires US2 (state migration) and US4 (page migration) ⚠️

### Parallelization Opportunities

**Phase 1**: T002-T009, T020 (10 parallel tasks)
**Phase 2**: T024-T034 (11 parallel feature directory creation)
**Phase 3**: T044-T050 (7 parallel store migrations)
**Phase 4**: T059-T062, T075-T088 (19 parallel tasks across 5 tracks)
**Phase 6**: T099-T105, T117-T119 (14 parallel WeWeb replacements)

**Total Parallelizable**: 61 of 196 tasks (31%)

---

## MVP Scope Recommendation

**Minimum Viable Migration (MVP)**: User Stories 1 + 2 + 3 only

**Rationale**:
- US1 (Organization): Foundation for all work, enables parallel dev
- US2 (State Management): Critical for app functionality, removes Vuex
- US3 (Environment): Simple cleanup, low risk
- **Defer**: US4 (SPA) and US5 (Legacy Removal) to second increment

**MVP Benefits**:
- Faster feedback cycle (~2 weeks vs 5 weeks)
- Reduced risk (smaller change set)
- Enables team to work in new structure sooner
- Can deploy incrementally if needed

**MVP Deployment**:
- Keep old HTML entry points temporarily
- Gradually redirect routes to new SPA
- Remove legacy in phase 2

---

## Success Validation Checklist

After Phase 8 deployment, verify:

- [ ] **SC-001**: Developer locates any file in < 10 seconds via features/ structure
- [ ] **SC-002**: New feature can be added without touching other features (test with dummy feature)
- [ ] **SC-003**: `grep -r "weweb.io" frontend/` returns zero results
- [ ] **SC-004**: `find frontend -name 'index.html' | wc -l` returns 1
- [ ] **SC-005**: `grep "vuex" frontend/package.json` returns zero results
- [ ] **SC-006**: Baseline code review time for future 40% improvement measurement
- [ ] **SC-007**: Baseline onboarding time for future 50% improvement measurement
- [ ] **SC-008**: Build time < 5 minutes (measure for 20% improvement)
- [ ] **SC-009**: Baseline merge conflict rate for future 60% reduction measurement
- [ ] **SC-010**: 100% manual testing checklist pass (zero regressions)

---

## Rollback Procedures

If critical issues occur within 24-hour window:

### Immediate Rollback (< 5 minutes)

```bash
# Switch to previous stable version
git checkout v1.x.x  # Previous tag
# Redeploy
# Or use infrastructure blue-green switch
```

### Partial Rollback (to specific phase)

```bash
# Rollback to specific milestone
git checkout migration-002-phase-3  # Example: back to US2 complete
# Fix issues
# Re-test
# Re-deploy
```

### Git History Revert

```bash
# If already merged to main
git revert {commit-hash}
git push origin main
```

---

## Implementation Notes

1. **Task IDs**: Sequential (T001-T196) in execution order
2. **[P] Marker**: 61 tasks parallelizable (different files, no blocking dependencies)
3. **[US#] Labels**: All user story tasks labeled for traceability
4. **File Paths**: Every task includes specific file path
5. **Checkpoints**: Git tags after each major phase for rollback
6. **Testing**: Manual checklist + automated smoke tests (no full TDD required per spec)

---

**Generated**: 2025-12-04
**Status**: Ready for implementation
**Next**: Begin Phase 1 (Setup & Foundation)

Start with: `git checkout 002-frontend-modernization && git pull`
