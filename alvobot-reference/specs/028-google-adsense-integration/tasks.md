# Tasks: Google AdSense Integration

**Input**: Design documents from `/specs/028-google-adsense-integration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/adsense-api.yaml

**Tests**: Not explicitly requested in spec. Test tasks NOT included.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- All paths are relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create backend AdSense module structure

- [x] T001 Create AdSense module directory structure at `backend/src/modules/adsense/`
- [x] T002 [P] Create DTOs barrel export in `backend/src/modules/adsense/dto/index.ts`
- [x] T003 [P] Create services barrel export in `backend/src/modules/adsense/services/index.ts`
- [x] T004 Create AdSense module definition in `backend/src/modules/adsense/adsense.module.ts`
- [x] T005 Register AdSense module in `backend/src/app.module.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before user stories

**⚠️ CRITICAL**: US-1 requires OAuth service; US-4 requires API service

- [x] T006 Create AdSense OAuth service skeleton in `backend/src/modules/adsense/services/adsense-oauth.service.ts` (OAuth URLs, scopes, state interface)
- [x] T007 [P] Create AdSense API service skeleton in `backend/src/modules/adsense/services/adsense-api.service.ts` (API base URL, interfaces)
- [x] T008 [P] Create AdSense report DTOs in `backend/src/modules/adsense/dto/adsense-report.dto.ts` (InitiateOAuthDto, ReportRequestDto, etc.)
- [x] T009 Create AdSense controller skeleton in `backend/src/modules/adsense/adsense.controller.ts` (route definitions, guards)

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: User Story 1 - Connect Google AdSense Account (Priority: P1) 🎯 MVP

**Goal**: Users can connect their Google AdSense account via OAuth

**Independent Test**: Navigate to /connections → Add new → Select Google → Select AdSense → Complete OAuth → Connection appears in list

### Implementation for User Story 1

- [x] T010 [US1] Implement `validateConfig()` method in `backend/src/modules/adsense/services/adsense-oauth.service.ts`
- [x] T011 [US1] Implement `buildAuthorizationUrl()` method with AdSense scopes in `backend/src/modules/adsense/services/adsense-oauth.service.ts`
- [x] T012 [US1] Implement `exchangeCodeForToken()` method in `backend/src/modules/adsense/services/adsense-oauth.service.ts`
- [x] T013 [US1] Implement `fetchAccounts()` method to get AdSense accounts in `backend/src/modules/adsense/services/adsense-oauth.service.ts`
- [x] T014 [US1] Implement `refreshAccessToken()` method in `backend/src/modules/adsense/services/adsense-oauth.service.ts`
- [x] T015 [US1] Implement `verifyConnectionOwnership()` method in `backend/src/modules/adsense/services/adsense-oauth.service.ts`
- [x] T016 [US1] Implement `GET /adsense/config/status` endpoint in `backend/src/modules/adsense/adsense.controller.ts`
- [x] T017 [US1] Implement `POST /adsense/oauth/initiate` endpoint in `backend/src/modules/adsense/adsense.controller.ts`
- [x] T018 [US1] Implement `GET /adsense/oauth/callback` endpoint with redirect logic in `backend/src/modules/adsense/adsense.controller.ts`
- [x] T019 [US1] Implement `POST /adsense/oauth/refresh/:connectionId` endpoint in `backend/src/modules/adsense/adsense.controller.ts`
- [x] T020 [US1] Implement `GET /adsense/accounts` endpoint in `backend/src/modules/adsense/adsense.controller.ts`
- [x] T021 [P] [US1] Create AdSenseCallbackPage component in `frontend/src/features/connections/pages/AdSenseCallbackPage.tsx`
- [x] T022 [P] [US1] Create AdSenseCallbackPage styles in `frontend/src/features/connections/pages/AdSenseCallbackPage.module.css`
- [x] T023 [US1] Add `/callback/adsense` route in `frontend/src/app/router.tsx`
- [x] T024 [US1] Add `initiateAdSenseOAuth` API function in `frontend/src/features/connections/api/mutations.ts`
- [x] T025 [US1] Add `useAdSenseOAuthInitiate` mutation hook in `frontend/src/features/connections/api/mutations.ts`

**Checkpoint**: User Story 1 complete - AdSense OAuth connection flow working end-to-end

---

## Phase 4: User Story 2 - Organized Google Connection Selection (Priority: P2)

**Goal**: Connection modal groups all Google services under single "Google" option

**Independent Test**: Open connection modal → Select Google → See sub-selection with Ads, AdSense, Ad Manager → Each triggers correct OAuth flow

### Implementation for User Story 2

- [x] T026 [US2] Update platform selection to only show Meta and Google in `frontend/src/features/connections/pages/ConnectionsPage.tsx`
- [x] T027 [US2] Add Google services sub-selection step (Ads, AdSense, Ad Manager) in `frontend/src/features/connections/pages/ConnectionsPage.tsx`
- [x] T028 [US2] Update modal step navigation logic for Google sub-selection in `frontend/src/features/connections/pages/ConnectionsPage.tsx`
- [x] T029 [US2] Add service type badges (Ads, AdSense, Ad Manager) to connection list items in `frontend/src/features/connections/pages/ConnectionsPage.tsx`
- [x] T030 [US2] Add badge styles (blue for Ads, green for AdSense, orange for Ad Manager) in `frontend/src/features/connections/pages/ConnectionsPage.module.css`
- [x] T031 [US2] Update OAuth initiation to route to correct service based on selection in `frontend/src/features/connections/pages/ConnectionsPage.tsx`

**Checkpoint**: User Story 2 complete - Google services grouped in modal with visual badges

---

## Phase 5: User Story 3 - View Unified Revenue Dashboard (Priority: P3)

**Goal**: Sidebar shows "Receita" and dashboard displays both Ad Manager and AdSense data

**Independent Test**: Click "Receita" in sidebar → See dashboard with source filter → Filter shows data from both sources

### Implementation for User Story 3

- [x] T032 [US3] Update sidebar menu item from "Ad Manager" to "Receita" with DollarSign icon in `frontend/src/shared/layouts/MainLayout/Sidebar.tsx`
- [x] T033 [US3] Rename `ad-manager-dashboard` feature folder to `revenue-dashboard` in `frontend/src/features/`
- [x] T034 [US3] Update all imports referencing old folder name throughout the codebase
- [x] T035 [US3] Update route from `/ad-manager` to `/receita` in `frontend/src/app/router.tsx`
- [x] T036 [US3] Add redirect from `/ad-manager` to `/receita` for backwards compatibility in `frontend/src/app/router.tsx`
- [x] T037 [P] [US3] Create RevenueSourceFilter component in `frontend/src/features/revenue-dashboard/components/RevenueSourceFilter/index.tsx`
- [x] T038 [P] [US3] Create RevenueSourceFilter styles in `frontend/src/features/revenue-dashboard/components/RevenueSourceFilter/RevenueSourceFilter.module.css`
- [x] T039 [P] [US3] Create RevenueSummaryCards component in `frontend/src/features/revenue-dashboard/components/RevenueSummaryCards/index.tsx`
- [x] T040 [P] [US3] Create RevenueSummaryCards styles in `frontend/src/features/revenue-dashboard/components/RevenueSummaryCards/RevenueSummaryCards.module.css`
- [x] T041 [US3] Add source column to SiteAnalysisTable in `frontend/src/features/revenue-dashboard/components/SiteAnalysisTable/index.tsx`
- [x] T042 [US3] Update SiteAnalysisTable styles for source column in `frontend/src/features/revenue-dashboard/components/SiteAnalysisTable/SiteAnalysisTable.module.css`
- [x] T043 [US3] Add AdSense types (AdSenseReportRow, AdSenseReportParams) in `frontend/src/features/revenue-dashboard/types/index.ts`
- [x] T044 [US3] Add unified revenue types (UnifiedRevenueRow, RevenueSource) in `frontend/src/features/revenue-dashboard/types/index.ts`
- [x] T045 [US3] Update connection selector to show both Ad Manager and AdSense connections in `frontend/src/features/revenue-dashboard/pages/RevenueDashboardPage.tsx`
- [x] T046 [US3] Add source filter state management in `frontend/src/features/revenue-dashboard/pages/RevenueDashboardPage.tsx`
- [x] T047 [US3] Integrate RevenueSourceFilter and RevenueSummaryCards in `frontend/src/features/revenue-dashboard/pages/RevenueDashboardPage.tsx`
- [x] T048 [US3] Update components barrel export in `frontend/src/features/revenue-dashboard/components/index.ts`

**Checkpoint**: User Story 3 complete - Unified "Receita" dashboard with source filtering

---

## Phase 6: User Story 4 - AdSense Metrics Display (Priority: P4)

**Goal**: AdSense metrics (Revenue, Impressions, Clicks, CTR, CPC, RPM) displayed in dashboard

**Independent Test**: Select AdSense connection → Select account → See metrics table with AdSense data → Change date range → Data updates

### Implementation for User Story 4

- [x] T049 [US4] Implement `generateReport()` method in `backend/src/modules/adsense/services/adsense-api.service.ts`
- [x] T050 [US4] Implement report response parsing (cells to typed rows) in `backend/src/modules/adsense/services/adsense-api.service.ts`
- [x] T051 [US4] Implement `POST /adsense/report` endpoint in `backend/src/modules/adsense/adsense.controller.ts`
- [x] T052 [US4] Implement `POST /adsense/report/refresh` cache invalidation endpoint in `backend/src/modules/adsense/adsense.controller.ts`
- [x] T053 [US4] Add `useAdSenseAccounts` query hook in `frontend/src/features/revenue-dashboard/api/queries.ts`
- [x] T054 [US4] Add `useAdSenseReport` query hook in `frontend/src/features/revenue-dashboard/api/queries.ts`
- [x] T055 [US4] Create `useUnifiedRevenueData` hook for merging Ad Manager and AdSense data in `frontend/src/features/revenue-dashboard/hooks/useUnifiedRevenueData.ts`
- [x] T056 [US4] Implement parallel data fetching with Promise.all in `frontend/src/features/revenue-dashboard/hooks/useUnifiedRevenueData.ts`
- [x] T057 [US4] Add currency display logic (no conversion, show original currency) in `frontend/src/features/revenue-dashboard/components/SiteAnalysisTable/index.tsx`
- [x] T058 [US4] Add "multiple currencies" warning to summary cards in `frontend/src/features/revenue-dashboard/components/RevenueSummaryCards/index.tsx`
- [x] T059 [US4] Add skeleton loading states for cards in `frontend/src/features/revenue-dashboard/components/RevenueSummaryCards/index.tsx`
- [x] T060 [US4] Add skeleton loading states for table rows in `frontend/src/features/revenue-dashboard/components/SiteAnalysisTable/index.tsx`
- [x] T061 [US4] Implement combined totals calculation in RevenueSummaryCards in `frontend/src/features/revenue-dashboard/components/RevenueSummaryCards/index.tsx`
- [x] T062 [US4] Integrate useUnifiedRevenueData in dashboard page in `frontend/src/features/revenue-dashboard/pages/RevenueDashboardPage.tsx`
- [x] T063 [US4] Add refresh cache mutation for AdSense in `frontend/src/features/revenue-dashboard/api/mutations.ts`
- [x] T064 [US4] Update API barrel export in `frontend/src/features/revenue-dashboard/api/index.ts`

**Checkpoint**: User Story 4 complete - Full AdSense metrics display with parallel loading

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T065 [P] Add error handling for OAuth errors (permission denied, no account) in `frontend/src/features/connections/pages/AdSenseCallbackPage.tsx`
- [x] T066 [P] Add empty state for "no data in period" in `frontend/src/features/revenue-dashboard/pages/RevenueDashboardPage.tsx`
- [x] T067 [P] Add inactive connection warning with reconnect link in `frontend/src/features/revenue-dashboard/pages/RevenueDashboardPage.tsx`
- [x] T068 Verify all routes work correctly (manual testing)
- [x] T069 Verify backwards compatibility redirect from `/ad-manager` to `/receita`
- [x] T070 Run quickstart.md validation checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - OAuth backend must exist
- **User Story 2 (Phase 4)**: Depends on US-1 - needs OAuth endpoints to call
- **User Story 3 (Phase 5)**: Can run in parallel with US-2 after Foundational
- **User Story 4 (Phase 6)**: Depends on US-1 and US-3 - needs OAuth and dashboard structure
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational
    ↓
    ├── Phase 3: US-1 (OAuth) ← MVP
    │       ↓
    │   Phase 4: US-2 (Modal) ← depends on US-1
    │
    └── Phase 5: US-3 (Dashboard) ← can start after Foundational
            ↓
        Phase 6: US-4 (Metrics) ← depends on US-1 + US-3
            ↓
        Phase 7: Polish
```

### Parallel Opportunities

**Within Phase 2 (Foundational):**
- T007 and T008 can run in parallel (different files)

**Within Phase 3 (US-1):**
- T021 and T022 can run in parallel (component + styles)

**Within Phase 5 (US-3):**
- T037/T038 and T039/T040 can run in parallel (different components)

**Within Phase 7 (Polish):**
- T065, T066, T067 can all run in parallel (different files)

---

## Parallel Example: User Story 3

```bash
# After T036 (routes updated), these can run in parallel:
Task: "T037 Create RevenueSourceFilter component"
Task: "T039 Create RevenueSummaryCards component"

# These component+style pairs can run in parallel:
Task: "T037 RevenueSourceFilter component" + "T038 RevenueSourceFilter styles"
Task: "T039 RevenueSummaryCards component" + "T040 RevenueSummaryCards styles"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T009)
3. Complete Phase 3: User Story 1 (T010-T025)
4. **STOP and VALIDATE**: Test AdSense OAuth connection flow
5. Deploy/demo if ready - users can connect AdSense accounts

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US-1 → Test OAuth → **MVP: Users can connect AdSense!**
3. Add US-2 → Test modal → **Improved UX: Better organization**
4. Add US-3 → Test dashboard → **New feature: Unified Receita view**
5. Add US-4 → Test metrics → **Complete: Full AdSense data display**
6. Polish → Test edge cases → **Production ready**

### Estimated Task Distribution

| Phase | Tasks | Parallel Opportunities |
|-------|-------|----------------------|
| Setup | 5 | 2 parallel |
| Foundational | 4 | 2 parallel |
| US-1 (OAuth) | 16 | 2 parallel |
| US-2 (Modal) | 6 | 0 parallel |
| US-3 (Dashboard) | 17 | 4 parallel |
| US-4 (Metrics) | 16 | 0 parallel |
| Polish | 6 | 3 parallel |
| **Total** | **70** | **13 parallel** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Each user story can be independently tested at its checkpoint
- No test tasks included (not requested in spec)
- Commit after each task or logical group
- Ad Manager functionality remains unchanged throughout
