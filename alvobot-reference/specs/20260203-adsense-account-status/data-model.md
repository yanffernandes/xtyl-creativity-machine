# Data Model: AdSense Account Status Display

**Branch**: `20260203-adsense-account-status` | **Date**: 2026-02-03

## Entity Changes

### AdSenseAccount (extended)

No new database tables. The existing `connections.metadata` JSONB field is extended.

**Current structure** (`connection.metadata.accounts[]`):
```typescript
{
  id: string              // e.g., "pub-1234567890123456"
  name: string            // e.g., "accounts/pub-1234567890123456"
  displayName: string     // e.g., "My AdSense Account"
  timezone?: string       // e.g., "America/Sao_Paulo"
  currencyCode: string    // e.g., "BRL"
}
```

**New structure** (`connection.metadata.accounts[]`):
```typescript
{
  id: string              // e.g., "pub-1234567890123456"
  name: string            // e.g., "accounts/pub-1234567890123456"
  displayName: string     // e.g., "My AdSense Account"
  timezone?: string       // e.g., "America/Sao_Paulo"
  currencyCode: string    // e.g., "BRL"
  state?: string          // NEW: "READY" | "NEEDS_ATTENTION" | "CLOSED" | "STATE_UNSPECIFIED"
}
```

### Field Details

| Field | Type | Source | Nullable | Default | Description |
|-------|------|--------|----------|---------|-------------|
| `state` | `string` (enum) | AdSense API v2 `accounts` endpoint | Yes (for backward compat) | Treated as `STATE_UNSPECIFIED` when missing | Account operational status from Google |

### State Enum Values

| API Value | Display Label (PT) | Badge Color | Actionable |
|-----------|-------------------|-------------|------------|
| `READY` | Pronta | Green (`--color-success`) | No |
| `NEEDS_ATTENTION` | Requer Atenção | Yellow/Orange (`--color-warning`) | Yes - clickable link to AdSense |
| `CLOSED` | Encerrada | Red (`--color-error`) | No |
| `STATE_UNSPECIFIED` / missing | Desconhecido | Gray (`--color-text-tertiary`) | No |

## Validation Rules

1. `state` must be one of: `READY`, `NEEDS_ATTENTION`, `CLOSED`, `STATE_UNSPECIFIED`, or `undefined` (backward compat).
2. Frontend must treat `undefined`/`null`/missing `state` identically to `STATE_UNSPECIFIED`.
3. Backend must never overwrite existing state with empty/null data on API failure — retain previous value.

## State Transitions

State transitions are controlled entirely by Google. The system only reads and caches the state.

```
[OAuth Callback] → state fetched from API → stored in metadata
      ↓
[Cron every 6h]  → state re-fetched from API → metadata updated
      ↓
[API failure]    → previous state retained (no overwrite)
```

## No Database Schema Changes

This feature requires **no SQL migrations**. The `state` field is added to the JSONB `metadata.accounts[]` array within the existing `connections` table. JSONB is schema-flexible by nature.
