# Tasks: AdSense Account Status Display

**Input**: Design documents from `/specs/20260203-adsense-account-status/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not requested — no test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Extend the backend AdSenseAccount interface and fetchAccounts() mapping to capture the `state` field from the AdSense API. This is the foundation that both US1 (display) and US2 (cron refresh) depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 Add `state` field to `AdSenseAccount` interface in `backend/src/modules/adsense/services/adsense-oauth.service.ts` — add `state?: 'READY' | 'NEEDS_ATTENTION' | 'CLOSED' | 'STATE_UNSPECIFIED'` to the existing interface (around line 58)
- [x] T002 Update `fetchAccounts()` response mapping in `backend/src/modules/adsense/services/adsense-oauth.service.ts` — add `state: account.state || 'STATE_UNSPECIFIED'` to the object literal in the `.map()` call (around line 428-438)

**Checkpoint**: Backend now captures `state` from AdSense API during OAuth callback. New connections will have state in metadata. Existing connections unaffected until cron runs.

---

## Phase 2: User Story 1 - View AdSense Account Status on Connection (Priority: P1) 🎯 MVP

**Goal**: Display localized status badges (Pronta / Requer Atenção / Encerrada / Desconhecido) for each AdSense account on the connections page. NEEDS_ATTENTION badge is clickable, linking to Google AdSense.

**Independent Test**: Connect an AdSense account via OAuth → navigate to /connections → verify each account shows a colored status badge. For existing connections without state, verify "Desconhecido" gray badge appears.

### Implementation for User Story 1

- [x] T003 [P] [US1] Add status badge CSS styles in `frontend/src/features/connections/pages/ConnectionsPage.module.css` — add `.accountStateBadge` base class with variants `.badgeReady` (green, `--color-success`), `.badgeNeedsAttention` (yellow/orange, `--color-warning`, cursor pointer), `.badgeClosed` (red, `--color-error`), `.badgeUnknown` (gray, `--color-text-tertiary`). Use inline-flex, small padding, border-radius `--radius-full`, font-size 11px, font-weight 500 — matching existing platform badge patterns on the same page.
- [x] T004 [US1] Add per-account status badge rendering in `frontend/src/features/connections/pages/ConnectionsPage.tsx` — inside the existing `metadata.accounts.map()` block (around lines 1269-1289), after the account ID `<span>`, render a status badge. Map state values: `READY` → "Pronta" (`.badgeReady`), `NEEDS_ATTENTION` → "Requer Atenção" (`.badgeNeedsAttention`), `CLOSED` → "Encerrada" (`.badgeClosed`), `undefined`/missing/`STATE_UNSPECIFIED` → "Desconhecido" (`.badgeUnknown`). For `NEEDS_ATTENTION`, wrap the badge in an `<a href="https://www.google.com/adsense" target="_blank" rel="noopener noreferrer" title="Clique para resolver no Google AdSense">` tag.

**Checkpoint**: User Story 1 fully functional. New AdSense connections show account state badges. Existing connections show "Desconhecido" fallback.

---

## Phase 3: User Story 2 - Automatic Background Status Refresh (Priority: P2)

**Goal**: A global cron job runs every 6 hours, iterating over all active AdSense connections, fetching current account states from the API, and updating connection metadata. Handles errors per-connection without blocking the batch.

**Independent Test**: Manually trigger the cron method (or wait for schedule) → verify connection metadata is updated with fresh state values. Simulate an expired token → verify connection is marked needs_reconnect and skipped without affecting others.

### Implementation for User Story 2

- [x] T005 [US2] Add `getActiveAdSenseConnections()` helper method in `backend/src/modules/connections/connections.service.ts` — query the `connections` table using service_role Supabase client for all rows where `metadata->>'type' = 'adsense'` AND `is_active = true` AND `needs_reconnect` is false/null AND `deleted_at IS NULL`. Return the connection rows (id, metadata, user_id at minimum).
- [x] T006 [US2] Add `updateConnectionAccountsMetadata(connectionId: string, accounts: AdSenseAccount[])` helper method in `backend/src/modules/connections/connections.service.ts` — update the `metadata` JSONB field for the given connection, merging the new `accounts` array into the existing metadata (preserve other metadata fields like `type`, `user_name`, `user_email`, etc.). Use service_role Supabase client.
- [x] T007 [US2] Add `refreshAdSenseAccountStates()` cron method in `backend/src/modules/connections/connections.cron.ts` — decorate with `@Cron('0 */6 * * *')`. Implementation: (1) call `getActiveAdSenseConnections()` to get all active AdSense connections, (2) iterate sequentially with 200ms delay between each, (3) for each connection: get valid token via `adSenseOAuthService.getConnectionWithValidToken(connection.id, connection.user_id)`, call `adSenseOAuthService.fetchAccounts(accessToken)`, call `updateConnectionAccountsMetadata(connection.id, freshAccounts)`, (4) wrap each connection in try/catch — on `TokenRefreshError` with `errorType === 'permanent'`: call `markConnectionNeedsReconnect()` and skip, on other errors: log and skip, (5) log summary at end: total connections, success count, failure count. Follow the existing `autoRefreshGoogleTokens()` pattern in the same file.

**Checkpoint**: User Story 2 fully functional. Account states auto-refresh every 6 hours. Existing connections get backfilled on first cron cycle.

---

## Phase 4: User Story 3 - Visual Alert for Accounts Needing Attention (Priority: P3)

**Goal**: Show a warning indicator on connection cards when any AdSense account within has a state other than READY, allowing users to quickly spot problematic connections.

**Independent Test**: Have a connection with at least one NEEDS_ATTENTION or CLOSED account → verify the connection card shows a warning icon/badge with a count. Have all accounts READY → verify no warning shown.

### Implementation for User Story 3

- [x] T008 [P] [US3] Add warning indicator CSS styles in `frontend/src/features/connections/pages/ConnectionsPage.module.css` — add `.connectionWarningIndicator` style: inline-flex, small warning icon + count badge, uses `--color-warning` for background, positioned near the connection name or service badge area. Add a `.warningCount` style for the numeric count badge.
- [x] T009 [US3] Add connection-level warning indicator logic in `frontend/src/features/connections/pages/ConnectionsPage.tsx` — in the connection card rendering section (where the connection name and service badge are shown), compute the count of accounts with `state` defined and not equal to `'READY'` from `metadata.accounts`. If count > 0, render a warning icon (e.g., Lucide `AlertTriangle`) with the count. If count === 0 or no accounts have state defined, render nothing. Ensure this works with the backward compatibility rule: connections without any state field should NOT show a warning (they show "Desconhecido" badges but that's not an alert-worthy condition until the cron populates real states).

**Checkpoint**: All three user stories complete. Connection cards surface account health at a glance.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Optional enhancements and validation

- [x] T010 [P] Show account state in OAuth callback preview in `frontend/src/features/connections/pages/AdSenseCallbackPage.tsx` — in the account preview list (around lines 157-185), add the state badge next to each account's displayName and currencyCode. Use the same badge style classes from ConnectionsPage.module.css (import or duplicate minimal styles).
- [x] T011 Verify backend build compiles without errors by running `cd backend && npm run build`
- [x] T012 Verify frontend build compiles without errors by running `cd frontend && npm run build`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately. BLOCKS all user stories.
- **User Story 1 (Phase 2)**: Depends on Phase 1 completion. Frontend-only changes.
- **User Story 2 (Phase 3)**: Depends on Phase 1 completion. Backend-only changes. Can run in parallel with US1.
- **User Story 3 (Phase 4)**: Depends on Phase 1 completion. Frontend changes that build on US1 badge patterns. Best done after US1.
- **Polish (Phase 5)**: Depends on all stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Requires T001+T002 (foundational). No other story dependencies.
- **User Story 2 (P2)**: Requires T001+T002 (foundational). Independent of US1 (backend-only).
- **User Story 3 (P3)**: Requires T001+T002 (foundational). Shares CSS file with US1 — best done after US1 to avoid merge conflicts.

### Within Each User Story

- CSS styles [P] can be written in parallel with other file changes
- Backend helper methods (T005, T006) must complete before cron method (T007)

### Parallel Opportunities

- T003 and T004 can overlap if one developer handles CSS and another handles TSX
- T005 and T006 are in the same file but are independent methods — write sequentially
- US1 (frontend) and US2 (backend) can be developed in parallel by different developers
- T008 (CSS) can run in parallel with T009 (TSX) within US3

---

## Parallel Example: US1 + US2 Simultaneously

```bash
# Developer A (frontend): User Story 1
Task: T003 - Add badge CSS styles in ConnectionsPage.module.css
Task: T004 - Add badge rendering in ConnectionsPage.tsx

# Developer B (backend): User Story 2
Task: T005 - Add getActiveAdSenseConnections() in connections.service.ts
Task: T006 - Add updateConnectionAccountsMetadata() in connections.service.ts
Task: T007 - Add refreshAdSenseAccountStates() cron in connections.cron.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundational (T001, T002)
2. Complete Phase 2: User Story 1 (T003, T004)
3. **STOP and VALIDATE**: Connect AdSense → verify state badges appear
4. Deploy/demo if ready — users see account status immediately

### Incremental Delivery

1. Complete Foundational → State captured from API
2. Add User Story 1 → Status badges visible → Deploy (MVP!)
3. Add User Story 2 → States auto-refresh every 6h → Deploy
4. Add User Story 3 → Connection-level warnings → Deploy
5. Add Polish → Callback page preview + build verification → Deploy

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Total: 12 tasks (2 foundational + 2 US1 + 3 US2 + 2 US3 + 3 polish)
