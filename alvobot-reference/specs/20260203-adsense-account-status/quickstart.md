# Quickstart: AdSense Account Status Display

**Branch**: `20260203-adsense-account-status` | **Date**: 2026-02-03

## What This Feature Does

Adds account state visibility (Ready / Needs Attention / Closed) to AdSense connections on the connections page. A background cron job refreshes states every 6 hours.

## Files to Modify

### Backend (3 files)

| File | Change | Why |
|------|--------|-----|
| `backend/src/modules/adsense/services/adsense-oauth.service.ts` | Add `state` to `AdSenseAccount` interface and `fetchAccounts()` mapping | Capture state from API during OAuth and refresh |
| `backend/src/modules/connections/connections.cron.ts` | Add `refreshAdSenseAccountStates()` cron method | 6-hour periodic state refresh |
| `backend/src/modules/connections/connections.service.ts` | Add `getActiveAdSenseConnections()` and `updateConnectionMetadata()` helpers | Support cron job queries |

### Frontend (2 files)

| File | Change | Why |
|------|--------|-----|
| `frontend/src/features/connections/pages/ConnectionsPage.tsx` | Add status badges to account list, add connection-level warning indicator | Display state to users |
| `frontend/src/features/connections/pages/ConnectionsPage.module.css` | Add badge styles (`.accountStateBadge`, variants) | Style the status badges |

### Optional Enhancement (1 file)

| File | Change | Why |
|------|--------|-----|
| `frontend/src/features/connections/pages/AdSenseCallbackPage.tsx` | Show state in account preview after OAuth | Immediate feedback on connection |

## Implementation Order

1. **Backend: Interface + fetchAccounts** — Add `state` field to `AdSenseAccount` and update the mapping in `fetchAccounts()`. This is a one-line change per location.
2. **Backend: Cron job** — Add `refreshAdSenseAccountStates()` to `ConnectionsCronService`. Follow the existing `autoRefreshGoogleTokens()` pattern.
3. **Frontend: Status badges** — Add badge rendering to the account list in `ConnectionsPage.tsx`. Add CSS styles.
4. **Frontend: Connection-level indicator** — Add warning icon/count to connection cards when accounts need attention.
5. **Frontend: Callback page** (optional) — Show state in the OAuth callback success preview.

## Key Design Decisions

- **No new API endpoints** — All changes extend existing data flows.
- **No database migrations** — State stored in existing JSONB `metadata.accounts[]`.
- **No new components** — Inline badge with CSS variables, consistent with existing connection page patterns.
- **Graceful degradation** — Missing state treated as "Desconhecido" (gray badge).

## Testing Approach

1. Connect a new AdSense account → verify state appears in metadata and on UI.
2. Manually trigger cron → verify states refresh for all connections.
3. Simulate API failure during cron → verify previous state retained.
4. Check existing connection without state → verify "Desconhecido" fallback.
