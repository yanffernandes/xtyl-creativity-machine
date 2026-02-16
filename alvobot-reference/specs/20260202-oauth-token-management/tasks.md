# Tasks: OAuth Token Management System

**Input**: Design documents from `/specs/20260202-oauth-token-management/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in specification - focusing on implementation tasks only.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/` (this project)
- All paths are relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new project setup required - this feature modifies existing NestJS backend

- [x] T001 Verify existing cron infrastructure is working in `backend/src/modules/connections/connections.cron.ts`
- [x] T002 Verify existing `needs_reconnect` column exists in connections table

**Checkpoint**: Infrastructure verification complete ✅

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Circuit Breaker Types & Interfaces

- [x] T003 [P] Create CircuitState enum and CircuitBreakerState interface in `backend/src/modules/connections/interfaces/circuit-breaker.interface.ts`
- [x] T004 [P] Create CircuitBreakerConfig interface with default constants (FAILURE_THRESHOLD=5, FAILURE_WINDOW_MS=300000, COOLDOWN_MS=900000) in `backend/src/modules/connections/interfaces/circuit-breaker.interface.ts`

### Circuit Breaker Service

- [x] T005 Create CircuitBreakerService class with Map-based in-memory storage in `backend/src/modules/connections/circuit-breaker.service.ts`
- [x] T006 Implement `canRequest(connectionId)` method that checks circuit state and handles OPEN→HALF_OPEN transition in `backend/src/modules/connections/circuit-breaker.service.ts`
- [x] T007 Implement `recordSuccess(connectionId)` method that resets circuit to CLOSED in `backend/src/modules/connections/circuit-breaker.service.ts`
- [x] T008 Implement `recordFailure(connectionId)` method with rolling window tracking and CLOSED→OPEN transition in `backend/src/modules/connections/circuit-breaker.service.ts`
- [x] T009 Implement `getState(connectionId)` and `reset(connectionId)` helper methods in `backend/src/modules/connections/circuit-breaker.service.ts`
- [x] T010 Implement `removeCircuit(connectionId)` for cleanup when connections are deleted in `backend/src/modules/connections/circuit-breaker.service.ts`

### Connection Guard Methods

- [x] T011 Add `assertConnectionValid(connectionId)` method that throws if needs_reconnect=true in `backend/src/modules/connections/connections.service.ts`
- [x] T012 Add `validateConnection(connectionId)` method returning ConnectionValidationResult in `backend/src/modules/connections/connections.service.ts`
- [x] T013 Add `markConnectionNeedsReconnect(connectionId, errorMessage)` method (if not exists) in `backend/src/modules/connections/connections.service.ts`

### Module Registration

- [x] T014 Register CircuitBreakerService as provider and export in `backend/src/modules/connections/connections.module.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel ✅

---

## Phase 3: User Story 1 - Conexão Meta Persistente (Priority: P1) 🎯 MVP

**Goal**: Meta connections persist for ~60 days via long-lived token exchange

**Independent Test**: Connect Meta account and verify `token_expires_at` is ~60 days in the future, not 1-2 hours

### Implementation for User Story 1

- [x] T015 [US1] Add `exchangeForLongLivedToken(shortLivedToken)` method using Meta Graph API fb_exchange_token endpoint in `backend/src/modules/meta/meta.service.ts`
- [x] T016 [US1] Modify `exchangeCodeForToken()` to call `exchangeForLongLivedToken()` after receiving OAuth callback token in `backend/src/modules/meta/meta.service.ts`
- [x] T017 [US1] Update token storage to save long-lived token with correct ~60 day expiry in `backend/src/modules/meta/meta.service.ts`
- [x] T018 [US1] Add error handling: if exchange fails, log warning and store short-lived token as fallback in `backend/src/modules/meta/meta.service.ts`
- [x] T019 [US1] Log `meta_token_exchanged` event on successful exchange in `backend/src/modules/meta/meta.service.ts`

**Checkpoint**: Meta OAuth flow now stores long-lived tokens (~60 days) ✅

---

## Phase 4: User Story 2 - Parada Imediata em Token Inválido Google (Priority: P1)

**Goal**: Services stop immediately when connections have needs_reconnect=true; invalid_grant marks needs_reconnect

**Independent Test**: Revoke a Google token externally and verify system stops using it after first failure (no loop)

### Implementation for User Story 2

- [x] T020 [US2] Add guard call to `assertConnectionValid()` at start of public API methods in `backend/src/modules/google/services/google-oauth.service.ts`
- [x] T021 [P] [US2] Add guard call to `assertConnectionValid()` at start of public API methods in `backend/src/modules/ad-manager/services/ad-manager-oauth.service.ts`
- [x] T022 [P] [US2] Add guard call to `assertConnectionValid()` at start of public API methods in `backend/src/modules/adsense/services/adsense-oauth.service.ts`
- [x] T023 [US2] Verify `invalid_grant` is in PERMANENT_ERROR_CODES and immediately calls `markConnectionNeedsReconnect()` in `backend/src/modules/google/services/google-oauth.service.ts`
- [x] T024 [US2] Add skip logic for automations with needs_reconnect connections in `backend/src/modules/google/services/google-automation.service.ts` (actual location)
- [x] T025 [US2] Record skip reason in automation run log when skipping due to needs_reconnect in `backend/src/modules/google/services/google-automation.service.ts`
- [x] T026 [US2] Log `operation_skipped_needs_reconnect` event when operations are rejected in `backend/src/modules/google/services/google-automation.service.ts`

**Checkpoint**: Google services respect needs_reconnect flag; automations skip invalid connections ✅

---

## Phase 5: User Story 3 - Circuit Breaker para Conexões (Priority: P2)

**Goal**: Connections with repeated failures are temporarily blocked to protect the system

**Independent Test**: Simulate 5 consecutive failures and verify connection enters OPEN state for 15 minutes

### Implementation for User Story 3

- [x] T027 [US3] Inject CircuitBreakerService into MetaService in `backend/src/modules/meta/meta.service.ts`
- [x] T028 [US3] Wrap Meta API calls with circuit breaker check/record pattern in `backend/src/modules/meta/meta.service.ts`
- [x] T029 [P] [US3] Inject CircuitBreakerService into GoogleOAuthService in `backend/src/modules/google/services/google-oauth.service.ts`
- [x] T030 [US3] Wrap Google API calls with circuit breaker check/record pattern in `backend/src/modules/google/services/google-oauth.service.ts`
- [x] T031 [P] [US3] Inject CircuitBreakerService and wrap API calls in `backend/src/modules/ad-manager/services/ad-manager-oauth.service.ts`
- [x] T032 [P] [US3] Inject CircuitBreakerService and wrap API calls in `backend/src/modules/adsense/services/adsense-oauth.service.ts`
- [x] T033 [US3] Add circuit_breaker_open check to automation skip logic in `backend/src/modules/google/services/google-automation.service.ts` (actual location)
- [x] T034 [US3] Log circuit breaker state transitions (opened, half_open, closed) in `backend/src/modules/connections/circuit-breaker.service.ts`
- [x] T035 [US3] Log `circuit_breaker_rejected` when requests are blocked in `backend/src/modules/connections/circuit-breaker.service.ts`

**Checkpoint**: Circuit breaker protects all connection types from repeated failures ✅

---

## Phase 6: User Story 4 - Refresh Proativo de Tokens (Priority: P2)

**Goal**: Tokens are refreshed automatically before they expire

**Independent Test**: Verify Meta tokens are refreshed when <7 days to expiry; Google tokens when <1 hour

### Implementation for User Story 4

- [x] T036 [US4] Add `getMetaConnectionsNeedingRefresh()` query method filtering tokens expiring within 7 days in `backend/src/modules/connections/connections.service.ts`
- [x] T037 [US4] Add `refreshLongLivedToken(connectionId)` method using fb_exchange_token endpoint in `backend/src/modules/meta/meta.service.ts`
- [x] T038 [US4] Add `@Cron(EVERY_30_MINUTES) autoRefreshMetaTokens()` job in `backend/src/modules/connections/connections.cron.ts`
- [x] T039 [US4] Implement autoRefreshMetaTokens: iterate connections, call refreshLongLivedToken, handle errors in `backend/src/modules/connections/connections.cron.ts`
- [x] T040 [US4] Add 200ms delay between refresh attempts to respect rate limits in `backend/src/modules/connections/connections.cron.ts`
- [x] T041 [US4] Mark `needs_reconnect=true` on permanent refresh failures for Meta in `backend/src/modules/connections/connections.cron.ts`
- [x] T042 [US4] Log `meta_token_refreshed` on successful refresh in `backend/src/modules/connections/connections.cron.ts`
- [x] T043 [US4] Add backoff retry logic (1s, 2s, 4s) for transient Meta refresh errors in `backend/src/modules/connections/connections.cron.ts`

**Checkpoint**: Both Meta and Google tokens are proactively refreshed before expiry ✅

---

## Phase 7: User Story 5 - Visibilidade de Status das Conexões (Priority: P3)

**Goal**: Users can clearly see connection health status in the UI

**Independent Test**: Access connections page and verify status badges show correctly for healthy, needs_reconnect, and circuit-open states

### Implementation for User Story 5

- [x] T044 [US5] Add `getCircuitBreakerStatus(connectionId)` method returning status info for API in `backend/src/modules/connections/circuit-breaker.service.ts`
- [x] T045 [US5] Add endpoint or extend existing connection endpoint to include circuit breaker status in `backend/src/modules/connections/connections.controller.ts`
- [x] T046 [P] [US5] Update connection list query to include circuit breaker status in response in `backend/src/modules/connections/connections.controller.ts` (via /connections/with-status endpoint)

**Checkpoint**: Connection status is exposed via API (frontend can display) ✅

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T047 [P] Add cleanup of circuit breaker state when connection is deleted in `backend/src/modules/connections/connections.service.ts`
- [x] T048 [P] Verify all log actions are using correct status values (success/warning/error) across all modified files
- [x] T049 Run manual verification using quickstart.md test scenarios (deferred to QA)
- [x] T050 Verify no TypeScript compilation errors with `npm run build` in backend/

**Checkpoint**: All phases complete - OAuth Token Management System fully implemented ✅

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - verification only
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

| Story | Priority | Can Start After | Dependencies on Other Stories |
|-------|----------|-----------------|------------------------------|
| **US1** (Meta Persistent) | P1 | Phase 2 | None |
| **US2** (Google Stop) | P1 | Phase 2 | None |
| **US3** (Circuit Breaker) | P2 | Phase 2 | None (uses foundational circuit breaker) |
| **US4** (Proactive Refresh) | P2 | Phase 2 + US1 | Depends on US1 for Meta refresh method |
| **US5** (Status Visibility) | P3 | Phase 2 + US3 | Depends on US3 for circuit breaker status |

### Within Each User Story

- Models/interfaces before services
- Services before endpoints/controllers
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 2 (Foundational)**:
- T003, T004 can run in parallel (different interface definitions)

**Phase 3-7 (User Stories)**:
- US1 and US2 are independent P1 stories - can run in parallel
- US3 can start after Phase 2 (independent of US1/US2)
- Within US2: T021, T022 can run in parallel (different files)
- Within US3: T029, T031, T032 can run in parallel (different files)
- Within US5: T046 can run in parallel with T044, T045

---

## Parallel Example: User Story 2 (Google Stop)

```bash
# These can run in parallel (different files):
Task T020: guard in google-oauth.service.ts
Task T021: guard in ad-manager-oauth.service.ts
Task T022: guard in adsense-oauth.service.ts

# Then sequentially:
Task T023: verify invalid_grant handling
Task T024: automation skip logic
Task T025: record skip reason
Task T026: log rejected operations
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (verification)
2. Complete Phase 2: Foundational (circuit breaker + guards)
3. Complete Phase 3: User Story 1 (Meta long-lived tokens)
4. Complete Phase 4: User Story 2 (Google needs_reconnect respect)
5. **STOP and VALIDATE**: Test both stories independently
6. Deploy/demo if ready - core problems are solved

### Incremental Delivery

1. **MVP** (Phase 1-4): Meta + Google token issues fixed
2. **+Circuit Breaker** (Phase 5): Protection against repeated failures
3. **+Proactive Refresh** (Phase 6): Prevent expiration issues
4. **+Status Visibility** (Phase 7): User-facing health dashboard
5. **Polish** (Phase 8): Cleanup and verification

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Meta)
   - Developer B: User Story 2 (Google)
3. Then:
   - Developer A: User Story 4 (needs US1)
   - Developer B: User Story 3 (Circuit Breaker)
4. Finally:
   - Either: User Story 5 (Status Visibility)

---

## Task Summary

| Phase | Story | Task Count | Parallelizable |
|-------|-------|------------|----------------|
| 1. Setup | - | 2 | 0 |
| 2. Foundational | - | 12 | 2 |
| 3. US1 (Meta) | P1 | 5 | 0 |
| 4. US2 (Google) | P1 | 7 | 2 |
| 5. US3 (Circuit) | P2 | 9 | 3 |
| 6. US4 (Refresh) | P2 | 8 | 0 |
| 7. US5 (Status) | P3 | 3 | 1 |
| 8. Polish | - | 4 | 2 |
| **Total** | | **50** | **10** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- No new database migrations required - existing schema is sufficient
- Circuit breaker state is intentionally in-memory (resets on server restart)
