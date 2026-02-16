# Research: AdSense Account Status Display

**Branch**: `20260203-adsense-account-status` | **Date**: 2026-02-03

## R1: AdSense API v2 Account State Field

**Decision**: The `state` field is already returned by the existing `GET /v2/accounts` endpoint. No additional API call is needed — only the response mapping needs to include the `state` field.

**Rationale**: The current `fetchAccounts()` method in `adsense-oauth.service.ts` (line 412-447) calls `GET https://adsense.googleapis.com/v2/accounts` and maps the response, but currently omits the `state` field from the mapping (line 428-438). The API already returns it; it's just not being captured.

**Alternatives considered**:
- Calling `GET /v2/accounts/{accountId}` individually per account — unnecessary, the list endpoint already returns `state`.
- Using a separate AdSense Notifications API — doesn't exist for this purpose.

## R2: Existing Cron Infrastructure

**Decision**: Add a new cron method to the existing `ConnectionsCronService` at `backend/src/modules/connections/connections.cron.ts`. Use `@Cron('0 */6 * * *')` for every-6-hours scheduling.

**Rationale**: The cron service already exists, already injects `AdSenseOAuthService`, and follows a well-established pattern (iterate connections, try operation, handle permanent vs transient errors). Adding a new cron method is the simplest approach.

**Alternatives considered**:
- Creating a separate cron service — unnecessary complexity, violates Constitution V (Simplicidade Operacional).
- Using Temporal workflows — overkill for a simple periodic fetch.

## R3: Token Validity for Cron Status Refresh

**Decision**: Reuse `getConnectionWithValidToken()` from `AdSenseOAuthService` during the cron job. This method already handles token refresh, caching, and error classification (permanent vs transient).

**Rationale**: The method is battle-tested, handles edge cases (expired tokens, revoked access), and integrates with the `needs_reconnect` flag system. No new token management code needed.

**Alternatives considered**:
- Direct token fetch in the cron — duplicates existing logic.
- Calling `refreshAccessToken()` first then fetching — `getConnectionWithValidToken()` already does this internally.

## R4: Frontend Badge Rendering

**Decision**: Add status badges inline within the existing account list rendering in `ConnectionsPage.tsx` (lines 1269-1289). Use the project's existing status badge CSS patterns (similar to connection status indicators already present).

**Rationale**: The account list already renders per-account items with icon, name, and ID. Adding a badge after the ID maintains the existing layout structure. No new components needed — standard inline badge with CSS variables.

**Alternatives considered**:
- Creating a shared `AccountStatusBadge` component — premature abstraction for a single use case.
- Using shadcn/ui Badge — the connections page uses CSS Modules, not Tailwind/shadcn. Mixing paradigms would be inconsistent.

## R5: Backward Compatibility for Existing Connections

**Decision**: Frontend treats `undefined`/missing `state` as `STATE_UNSPECIFIED` and displays "Desconhecido" (gray badge). The first cron cycle after deployment will populate state for all existing connections.

**Rationale**: No migration needed. The cron job naturally backfills the data within 6 hours of deployment. Frontend fallback ensures no broken UI during the transition window.

**Alternatives considered**:
- Running a one-time migration script — unnecessary given the cron will handle it.
- Making the state field required — would break existing connections.

## R6: AdSense API Rate Limits

**Decision**: Process connections sequentially with a 200ms delay between each (matching existing cron pattern). The AdSense Management API has generous rate limits (default 10,000 requests/day per project).

**Rationale**: Even with hundreds of connections, sequential processing with 200ms delay will complete quickly and stay well within quotas. The existing `autoRefreshGoogleTokens` cron already uses this pattern.

**Alternatives considered**:
- Parallel processing — risk of rate limiting, no meaningful benefit for the expected scale.
- Batching API calls — the `GET /accounts` endpoint doesn't support batch requests.

## R7: Observability (Constitution IV)

**Decision**: Log each cron run with: start timestamp, connection count processed, success/failure counts, and any state changes detected. Use the existing `ConnectionsService.createConnectionLog()` for audit trail.

**Rationale**: Constitution IV requires logging success/error with timestamps for external integrations. The existing logging pattern in the cron service provides the template.

**Alternatives considered**:
- Dedicated metrics/telemetry — overkill for this feature's scope.
