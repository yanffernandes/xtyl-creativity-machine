# API Contracts: AdSense Account Status

**Branch**: `20260203-adsense-account-status` | **Date**: 2026-02-03

## No New Endpoints Required

This feature does **not** introduce new API endpoints. All changes are to existing internal data flows:

1. **OAuth callback** (`GET /adsense/oauth/callback`) — already exists, response mapping extended to include `state`.
2. **Accounts endpoint** (`GET /adsense/accounts`) — already exists, returned data naturally includes `state` once stored in metadata.
3. **Cron job** — internal scheduled task, no HTTP contract.

## Modified Internal Contracts

### 1. AdSenseAccount Interface (Backend)

**File**: `backend/src/modules/adsense/services/adsense-oauth.service.ts`

**Before**:
```typescript
export interface AdSenseAccount {
  id: string;
  name: string;
  displayName: string;
  timezone?: string;
  currencyCode: string;
}
```

**After**:
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

### 2. fetchAccounts Response Mapping

**File**: `backend/src/modules/adsense/services/adsense-oauth.service.ts`, method `fetchAccounts()`

**Before** (lines 428-438):
```typescript
const accounts: AdSenseAccount[] = (data.accounts || []).map(
  (account: any) => ({
    id: account.name?.split("/").pop() || "",
    name: account.name || "",
    displayName: account.displayName || account.name?.split("/").pop() || "Unknown Account",
    timezone: account.timeZone?.id,
    currencyCode: account.reportingTimeZone?.currencyCode || "USD",
  }),
);
```

**After**:
```typescript
const accounts: AdSenseAccount[] = (data.accounts || []).map(
  (account: any) => ({
    id: account.name?.split("/").pop() || "",
    name: account.name || "",
    displayName: account.displayName || account.name?.split("/").pop() || "Unknown Account",
    timezone: account.timeZone?.id,
    currencyCode: account.reportingTimeZone?.currencyCode || "USD",
    state: account.state || "STATE_UNSPECIFIED",
  }),
);
```

### 3. Cron Job Contract (Internal)

**New method on `ConnectionsCronService`**:

```typescript
@Cron('0 */6 * * *')
async refreshAdSenseAccountStates(): Promise<void>
```

**Behavior**:
- Fetches all active AdSense connections from DB
- For each connection:
  1. Get valid token (via `getConnectionWithValidToken`)
  2. Call `fetchAccounts(accessToken)` to get current states
  3. Update `connection.metadata.accounts` with new state values
  4. Log result
- Handles errors per-connection (skip on failure, continue batch)

### 4. OAuth Callback Accounts Preview (Extended)

**Endpoint**: `GET /adsense/oauth/callback` (redirect response)

The `accounts_preview` URL parameter (base64-encoded JSON) will now include `state`:

**Before**:
```json
[
  { "id": "pub-123", "displayName": "My Account", "currencyCode": "BRL" }
]
```

**After**:
```json
[
  { "id": "pub-123", "displayName": "My Account", "currencyCode": "BRL", "state": "READY" }
]
```

## External API Contract (Google AdSense v2)

**Endpoint**: `GET https://adsense.googleapis.com/v2/accounts`
**Auth**: Bearer token (existing `adsense.readonly` scope)

**Response** (relevant fields):
```json
{
  "accounts": [
    {
      "name": "accounts/pub-1234567890123456",
      "displayName": "My AdSense Account",
      "timeZone": { "id": "America/Sao_Paulo" },
      "state": "READY",
      "premium": false,
      "createTime": "2020-01-01T00:00:00Z",
      "pendingTasks": []
    }
  ]
}
```

**State values**: `READY`, `NEEDS_ATTENTION`, `CLOSED` (no `STATE_UNSPECIFIED` from API — that's our internal default for missing data).
