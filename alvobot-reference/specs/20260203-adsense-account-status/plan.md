# Implementation Plan: AdSense Account Status Display

**Branch**: `20260203-adsense-account-status` | **Date**: 2026-02-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/20260203-adsense-account-status/spec.md`

## Summary

Add AdSense account state visibility (READY / NEEDS_ATTENTION / CLOSED) to the connections page. The state is fetched from the Google AdSense Management API v2 during OAuth callback and refreshed every 6 hours via a cron job. The frontend displays localized status badges per account with a connection-level warning indicator for accounts needing attention.

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend React 19, Backend NestJS 10)
**Primary Dependencies**: @nestjs/schedule (already installed), Google AdSense API v2
**Storage**: Supabase PostgreSQL — existing `connections.metadata` JSONB (no schema changes)
**Testing**: Manual E2E (connect AdSense, verify badges; trigger cron, verify refresh)
**Target Platform**: Web application (SPA + NestJS API)
**Project Type**: Web (frontend + backend)
**Performance Goals**: Cron processes all connections within 10 minutes; badge rendering adds no perceptible latency
**Constraints**: AdSense API rate limit (10,000 requests/day); 6-hour refresh interval; read-only scope
**Scale/Scope**: Expected ~50-200 active AdSense connections

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Segurança de Dados e Segredos | PASS | No secrets exposed. AdSense API calls happen in backend only. Frontend reads state from Supabase metadata via RLS. |
| II. Dados Dinâmicos (Sem Hardcode) | PASS | State values come from Google API. Badge label mapping is UI presentation logic (not domain data). |
| III. Separação Frontend/Backend | PASS | API calls to Google in backend (cron + OAuth). Frontend reads from Supabase. |
| IV. Observabilidade Básica | PASS | Cron job logs start/end, connection count, success/failure counts, state changes. |
| V. Simplicidade Operacional | PASS | Extends existing cron service, no new infrastructure. Single JSONB field addition. |

**Post-Phase 1 Re-check**: All gates still PASS. No new endpoints, no new tables, no new services.

## Project Structure

### Documentation (this feature)

```text
specs/20260203-adsense-account-status/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── adsense-accounts.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (files to modify)

```text
backend/
├── src/
│   ├── modules/
│   │   ├── adsense/
│   │   │   └── services/
│   │   │       └── adsense-oauth.service.ts    # Add state to interface + fetchAccounts()
│   │   └── connections/
│   │       ├── connections.cron.ts              # Add refreshAdSenseAccountStates() cron
│   │       └── connections.service.ts           # Add helper methods for cron

frontend/
├── src/
│   └── features/
│       └── connections/
│           └── pages/
│               ├── ConnectionsPage.tsx          # Add status badges + warning indicator
│               ├── ConnectionsPage.module.css   # Add badge styles
│               └── AdSenseCallbackPage.tsx       # (optional) Show state in preview
```

**Structure Decision**: Web application structure. All changes are modifications to existing files — no new files or modules created.

## Implementation Details

### Phase 1: Backend — State Capture (US1/FR-001)

#### 1.1 Extend AdSenseAccount Interface

**File**: `backend/src/modules/adsense/services/adsense-oauth.service.ts` (line 58)

Add `state` field to the existing interface:

```typescript
export interface AdSenseAccount {
  id: string;
  name: string;
  displayName: string;
  timezone?: string;
  currencyCode: string;
  state?: 'READY' | 'NEEDS_ATTENTION' | 'CLOSED' | 'STATE_UNSPECIFIED';
}
```

#### 1.2 Update fetchAccounts() Mapping

**File**: `backend/src/modules/adsense/services/adsense-oauth.service.ts` (line 428-438)

Add `state: account.state || 'STATE_UNSPECIFIED'` to the mapping object.

### Phase 2: Backend — Cron Job (US2/FR-003, FR-007)

#### 2.1 Add Helper Method to ConnectionsService

**File**: `backend/src/modules/connections/connections.service.ts`

Add `getActiveAdSenseConnections()`: query all active connections where `metadata->>'type' = 'adsense'` and `is_active = true` and `needs_reconnect = false` and `deleted_at IS NULL`.

Add `updateConnectionAccountsMetadata(connectionId, accounts)`: update `metadata.accounts` for a specific connection using service_role.

#### 2.2 Add Cron Method

**File**: `backend/src/modules/connections/connections.cron.ts`

Add `@Cron('0 */6 * * *') refreshAdSenseAccountStates()`:
1. Fetch all active AdSense connections
2. For each connection:
   a. Get valid token via `adSenseOAuthService.getConnectionWithValidToken()`
   b. Call `adSenseOAuthService.fetchAccounts(accessToken)` (now returns state)
   c. Update connection metadata with new accounts data
   d. 200ms delay between connections
3. Handle errors per-connection:
   - `TokenRefreshError` (permanent) → mark needs_reconnect, skip
   - Transient errors → log, skip, retry next cycle
4. Log summary: total processed, success count, failure count

### Phase 3: Frontend — Status Badges (US1/FR-002, FR-006)

#### 3.1 Add Badge Styles

**File**: `frontend/src/features/connections/pages/ConnectionsPage.module.css`

Add styles for `.accountStateBadge` with variants:
- `.badgeReady` — green background, uses `--color-success`
- `.badgeNeedsAttention` — yellow/orange, uses `--color-warning`, cursor pointer
- `.badgeClosed` — red, uses `--color-error`
- `.badgeUnknown` — gray, uses `--color-text-tertiary`

#### 3.2 Add Badge Rendering

**File**: `frontend/src/features/connections/pages/ConnectionsPage.tsx` (lines 1269-1289)

Inside the existing `metadata.accounts.map()` block, after the account ID `<span>`, add a status badge element. For `NEEDS_ATTENTION` accounts, wrap the badge in an `<a>` tag linking to `https://www.google.com/adsense` with `target="_blank"` and a `title` attribute for the tooltip.

### Phase 4: Frontend — Connection Warning Indicator (US3/FR-005)

#### 4.1 Add Warning Logic

**File**: `frontend/src/features/connections/pages/ConnectionsPage.tsx`

In the connection card rendering section, check if any account in `metadata.accounts` has `state !== 'READY'` (and state is defined). If so, render a warning icon with a count of non-ready accounts.

## Complexity Tracking

No constitution violations. No complexity justifications needed.

## Artifacts Generated

| Artifact | Path | Status |
|----------|------|--------|
| Research | [research.md](research.md) | Complete |
| Data Model | [data-model.md](data-model.md) | Complete |
| Contracts | [contracts/adsense-accounts.md](contracts/adsense-accounts.md) | Complete |
| Quickstart | [quickstart.md](quickstart.md) | Complete |
| Tasks | tasks.md | Pending (`/speckit.tasks`) |
