# Tasks: Google Ad Manager Dashboard

**Input**: Design documents from `/specs/026-ad-manager-dashboard/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested - manual testing only per spec.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/modules/ad-manager/`
- **Frontend**: `frontend/src/features/ad-manager-dashboard/`

---

## Phase 1: Setup (Shared Infrastructure) ✅ COMPLETE

**Purpose**: Project initialization and backend module structure

- [x] T001 Install `@google-ads/admanager` package in `backend/package.json`
- [x] T002 [P] Create `backend/src/modules/ad-manager/ad-manager.module.ts` with module definition
- [x] T003 [P] Create `backend/src/modules/ad-manager/dto/site-analysis.dto.ts` with request/response DTOs
- [x] T004 [P] Create `backend/src/modules/ad-manager/dto/expand.dto.ts` with expand request/response DTOs
- [x] T005 [P] Create `frontend/src/features/ad-manager-dashboard/types/index.ts` with TypeScript interfaces
- [x] T006 Import AdManagerModule in `backend/src/app.module.ts`
- [x] T007 [P] Add `adManagerDashboard` query keys to `frontend/src/shared/utils/queryKeys.ts`

---

## Phase 2: Foundational (Blocking Prerequisites) ✅ COMPLETE

**Purpose**: OAuth service and controller that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T008 Create `backend/src/modules/ad-manager/services/ad-manager-oauth.service.ts` with OAuth logic:
  - `validateConfig()` - check env vars
  - `buildAuthorizationUrl()` - generate OAuth URL with state encoding
  - `exchangeCodeForToken()` - exchange code for tokens
  - `refreshAccessToken()` - refresh expired tokens
  - `fetchNetworks()` - fetch available networks after token exchange
- [x] T009 Create `backend/src/modules/ad-manager/ad-manager.controller.ts` with OAuth endpoints:
  - `POST /ad-manager/oauth/initiate`
  - `GET /ad-manager/oauth/callback`
  - `POST /ad-manager/oauth/refresh/:connectionId`
  - `GET /ad-manager/config/status`
- [x] T010 [P] Create `frontend/src/features/connections/pages/AdManagerCallbackPage.tsx` callback handler
- [x] T011 Add `/callback/ad-manager` route to `frontend/src/app/router.tsx`
- [x] T012 Update `frontend/src/features/connections/pages/ConnectionsPage.tsx` to show Ad Manager as provider option

**Checkpoint**: OAuth flow complete - user can connect Ad Manager account ✅

---

## Phase 3: User Story 1 - Conectar Conta Google Ad Manager (Priority: P1) 🎯 MVP ✅ COMPLETE

**Goal**: Users can connect their Ad Manager account via OAuth and see it in connections list

**Independent Test**: Initiate OAuth flow, authorize, verify connection appears in list with networks in metadata

### Implementation for User Story 1

- [x] T013 [US1] Add environment variables documentation to `backend/.env.example`:
  - `GOOGLE_AD_MANAGER_CLIENT_ID`
  - `GOOGLE_AD_MANAGER_CLIENT_SECRET`
  - `GOOGLE_AD_MANAGER_REDIRECT_URI`
- [x] T014 [US1] Implement network discovery in `ad-manager-oauth.service.ts` - fetch networks after token exchange, store in connection metadata
- [x] T015 [US1] Add error handling for OAuth failures (invalid code, revoked access, etc.) in `ad-manager.controller.ts`
- [x] T016 [US1] Style `AdManagerCallbackPage.tsx` with success/error states and networks preview

**Checkpoint**: User Story 1 complete - OAuth flow works end-to-end ✅

---

## Phase 4: User Story 2 - Visualizar Métricas por Site (Priority: P1) ✅ COMPLETE

**Goal**: Users can view site metrics aggregated in a table with sorting and search

**Independent Test**: Access dashboard, select network, verify all sites appear with correct metrics

### Implementation for User Story 2

- [x] T017 [US2] Create `backend/src/modules/ad-manager/services/ad-manager-report.service.ts` with:
  - `getSiteAnalysis()` - create report, run, poll, fetch results
  - `calculateMetrics()` - compute RPS, eCPM, CPC from raw data
  - Cache layer with 15-minute TTL using `@nestjs/cache-manager`
- [x] T018 [US2] Add dashboard endpoints to `ad-manager.controller.ts`:
  - `GET /ad-manager/networks`
  - `POST /ad-manager/site-analysis`
  - `POST /ad-manager/site-analysis/refresh`
- [x] T019 [P] [US2] Create `frontend/src/features/ad-manager-dashboard/api/queries.ts` with:
  - `useAdManagerNetworks()` - fetch networks from connection metadata
  - `useSiteAnalysis()` - fetch site metrics
- [x] T020 [P] [US2] Create `frontend/src/features/ad-manager-dashboard/api/mutations.ts` with:
  - `useRefreshSiteAnalysis()` - force refresh
- [x] T021 [US2] Create `frontend/src/features/ad-manager-dashboard/api/index.ts` barrel export
- [x] T022 [P] [US2] Create `frontend/src/features/ad-manager-dashboard/components/NetworkSelector/index.tsx` dropdown component
- [x] T023 [P] [US2] Create `frontend/src/features/ad-manager-dashboard/components/NetworkSelector/NetworkSelector.module.css`
- [x] T024 [US2] Create `frontend/src/features/ad-manager-dashboard/components/SiteAnalysisTable/index.tsx` with:
  - Column headers for all metrics
  - Sortable columns
  - Search/filter input
  - Formatted values (currency, percentages)
- [x] T025 [P] [US2] Create `frontend/src/features/ad-manager-dashboard/components/SiteAnalysisTable/SiteAnalysisTable.module.css`
- [x] T026 [US2] Create `frontend/src/features/ad-manager-dashboard/pages/AdManagerDashboardPage.tsx` with:
  - Network selector
  - Site analysis table
  - Refresh button with timestamp
  - Loading and error states
- [x] T027 [P] [US2] Create `frontend/src/features/ad-manager-dashboard/pages/AdManagerDashboardPage.module.css`
- [x] T028 [US2] Add `/ad-manager` route to `frontend/src/app/router.tsx`
- [x] T029 [US2] Create `frontend/src/features/ad-manager-dashboard/components/index.ts` barrel export

**Checkpoint**: User Story 2 complete - site metrics table visible and functional ✅

---

## Phase 5: User Story 3 - Expandir Hierarquia Site > Data > URL (Priority: P1) ✅ COMPLETE

**Goal**: Users can expand sites to see date breakdown, and dates to see URI breakdown

**Independent Test**: Click expand on site, verify dates appear; click expand on date, verify URIs appear

### Implementation for User Story 3

- [x] T030 [US3] Add `expandLevel()` method to `ad-manager-report.service.ts`:
  - Fetch child data (dates or URIs) with caching
  - Handle level parameter ('date' | 'uri')
- [x] T031 [US3] Add `POST /ad-manager/site-analysis/expand` endpoint to `ad-manager.controller.ts`
- [x] T032 [US3] Add `useExpandLevel()` query to `frontend/src/features/ad-manager-dashboard/api/queries.ts`
- [x] T033 [US3] Create `frontend/src/features/ad-manager-dashboard/hooks/useExpandableTable.ts` with:
  - Track expanded rows state
  - Handle expand/collapse actions
  - Fetch children data on expand
- [x] T034 [US3] Create `frontend/src/features/ad-manager-dashboard/components/ExpandableRow/index.tsx` with:
  - Expand/collapse icon (+/-)
  - Indentation for nested levels
  - Loading indicator during fetch
  - Child count display
- [x] T035 [P] [US3] Create `frontend/src/features/ad-manager-dashboard/components/ExpandableRow/ExpandableRow.module.css`
- [x] T036 [US3] Integrate `ExpandableRow` into `SiteAnalysisTable/index.tsx`
- [x] T037 [US3] Add URI truncation with tooltip in `ExpandableRow` for long URLs

**Checkpoint**: User Story 3 complete - full hierarchy expansion works ✅

---

## Phase 6: User Story 4 - Filtrar por Período (Priority: P1) ✅ COMPLETE

**Goal**: Users can filter data by different time periods (today, 7d, 30d, custom)

**Independent Test**: Select different periods, verify data updates accordingly

### Implementation for User Story 4

- [x] T038 [US4] Create `frontend/src/features/ad-manager-dashboard/components/PeriodFilter/index.tsx` with:
  - Preset buttons (Today, 7 days, 30 days)
  - Custom date range picker
  - Max 90 days validation
- [x] T039 [P] [US4] Create `frontend/src/features/ad-manager-dashboard/components/PeriodFilter/PeriodFilter.module.css`
- [x] T040 [US4] Integrate `PeriodFilter` into `AdManagerDashboardPage.tsx`
- [x] T041 [US4] Add period params to URL (update URL on filter change, restore from URL on load)
- [x] T042 [US4] Display selected period in dashboard header with date range

**Checkpoint**: User Story 4 complete - period filtering works ✅

---

## Phase 7: User Story 5 - Alternar Agrupamento (Priority: P2) ✅ COMPLETE

**Goal**: Users can switch primary grouping between Site and Request URI

**Independent Test**: Toggle grouping dropdown, verify table structure changes

### Implementation for User Story 5

- [x] T043 [US5] Add `groupBy` parameter support to `getSiteAnalysis()` in `ad-manager-report.service.ts`
- [x] T044 [US5] Create grouping selector dropdown in `AdManagerDashboardPage.tsx`
- [x] T045 [US5] Update `SiteAnalysisTable` to handle different grouping structures
- [x] T046 [US5] Add `groupBy` param to URL state

**Checkpoint**: User Story 5 complete - grouping toggle works ✅

---

## Phase 8: User Story 6 - Exportar Dados (Priority: P3) ✅ COMPLETE

**Goal**: Users can export visible data to CSV

**Independent Test**: Click export, verify CSV downloads with correct data

### Implementation for User Story 6

- [x] T047 [US6] Create `frontend/src/features/ad-manager-dashboard/utils/exportCsv.ts` utility function
- [x] T048 [US6] Add export button to `AdManagerDashboardPage.tsx`
- [x] T049 [US6] Implement CSV generation with all visible columns and filtered data

**Checkpoint**: User Story 6 complete - CSV export works ✅

---

## Phase 9: Polish & Cross-Cutting Concerns ✅ COMPLETE

**Purpose**: Improvements that affect multiple user stories

- [x] T050 Add loading skeleton to `SiteAnalysisTable` during initial load
- [x] T051 Add empty state message when no data for selected period
- [x] T052 [P] Add error boundary and retry UI for API failures
- [x] T053 Implement exponential backoff for rate limit errors (429) in `ad-manager-report.service.ts`
- [x] T054 Add sidebar menu item for Ad Manager Dashboard in `frontend/src/shared/layouts/MainLayout/`
- [x] T055 [P] Format currency values with correct locale and symbol based on network currency
- [x] T056 [P] Format percentage values with 2 decimal places consistently
- [x] T057 Run manual testing per `quickstart.md` scenarios
- [x] T058 Update `CLAUDE.md` with Ad Manager feature documentation if needed

---

## Summary

| Phase | Tasks | Stories | Status |
|-------|-------|---------|--------|
| Setup | 7 | - | ✅ Complete |
| Foundational | 5 | - | ✅ Complete |
| US1 OAuth | 4 | P1 | ✅ Complete |
| US2 Site Metrics | 13 | P1 | ✅ Complete |
| US3 Hierarchy | 8 | P1 | ✅ Complete |
| US4 Period Filter | 5 | P1 | ✅ Complete |
| US5 Grouping | 4 | P2 | ✅ Complete |
| US6 Export | 3 | P3 | ✅ Complete |
| Polish | 9 | - | ✅ Complete |
| **Total** | **58** | **6 stories** | ✅ Complete |

**MVP Scope**: Phases 1-4 (29 tasks) - OAuth + Site Metrics Table ✅
**P1 Complete**: Phases 1-6 (42 tasks) - Add Hierarchy + Period Filter ✅
**Full Feature**: All phases (58 tasks) ✅

**Status**: FULLY IMPLEMENTED ✅
