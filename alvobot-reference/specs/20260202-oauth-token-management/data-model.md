# Data Model: OAuth Token Management System

**Branch**: `20260202-oauth-token-management` | **Date**: 2026-02-02 | **Spec**: [spec.md](./spec.md)

## Overview

This document defines the data model changes required for robust OAuth token management. The design builds on existing structures while adding circuit breaker state tracking and enhanced logging.

---

## Entity Relationship Diagram

```
┌─────────────────────┐       ┌──────────────────────────┐
│     connections     │       │   circuit_breaker_state  │
├─────────────────────┤       │      (in-memory only)    │
│ id (PK)             │       ├──────────────────────────┤
│ user_id (FK)        │       │ connectionId             │
│ workspace_id (FK)   │       │ state (enum)             │
│ platform_name       │       │ failureCount             │
│ access_token        │       │ lastFailureAt            │
│ refresh_token       │       │ openedAt                 │
│ token_expires_at    │◄──────│ nextRetryAt              │
│ needs_reconnect     │       └──────────────────────────┘
│ last_refresh_error  │
│ last_refresh_attempt│       ┌──────────────────────────┐
│ metadata (JSONB)    │       │     connection_logs      │
│ created_at          │       ├──────────────────────────┤
│ updated_at          │       │ id (PK)                  │
└─────────────────────┘       │ connection_id (FK)       │
          │                   │ action                   │
          │                   │ status                   │
          │                   │ message                  │
          └───────────────────│ metadata (JSONB)         │
                              │ created_at               │
                              └──────────────────────────┘
```

---

## Existing Entities (No Changes Required)

### connections

The `connections` table already has all necessary fields for token management:

```sql
-- Existing schema (from migration 20260131_connections_needs_reconnect.sql)
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  workspace_id UUID REFERENCES workspaces(id),
  connection_name VARCHAR(255) NOT NULL,
  platform_name VARCHAR(50) NOT NULL,  -- 'google', 'meta', 'ad_manager', 'adsense'
  platform_user_id VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,                   -- Google only (Meta uses long-lived access tokens)
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  needs_reconnect BOOLEAN DEFAULT false,  -- ✓ Already exists
  last_refresh_error TEXT,                -- ✓ Already exists
  last_refresh_attempt TIMESTAMPTZ,       -- ✓ Already exists
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

-- Existing index for efficient filtering
CREATE INDEX idx_connections_needs_reconnect
  ON connections(needs_reconnect)
  WHERE needs_reconnect = true;
```

**Platform-Specific Metadata** (stored in `metadata` JSONB):

| Platform | Metadata Fields |
|----------|-----------------|
| Google Ads | `{ type: 'ads', customer_id: '...' }` |
| Ad Manager | `{ type: 'ad_manager', network_code: '...' }` |
| AdSense | `{ type: 'adsense', account_id: '...' }` |
| Meta | `{ type: 'meta', page_id: '...', instagram_id: '...' }` |

### connection_logs

The `connection_logs` table already supports the required logging:

```sql
-- Existing schema (from migration 20241215_connection_logs.sql)
CREATE TABLE connection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,  -- 'success', 'warning', 'error'
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_connection_logs_connection_id ON connection_logs(connection_id);
CREATE INDEX idx_connection_logs_created_at ON connection_logs(created_at DESC);
```

---

## New Entities

### CircuitBreakerState (In-Memory Only)

The circuit breaker state is **not persisted** to the database. It is managed in-memory by the `CircuitBreakerService` and is intentionally volatile:

```typescript
// In backend/src/modules/connections/circuit-breaker.service.ts

enum CircuitState {
  CLOSED = 'closed',      // Normal operation
  OPEN = 'open',          // Blocking requests
  HALF_OPEN = 'half_open' // Testing recovery
}

interface CircuitBreakerState {
  connectionId: string;
  state: CircuitState;
  failureCount: number;
  failureTimestamps: Date[];  // Rolling window for failure rate
  openedAt: Date | null;      // When circuit was opened
  nextRetryAt: Date | null;   // When half-open test is allowed
}

// Configuration constants
const FAILURE_THRESHOLD = 5;        // Failures to trigger open
const FAILURE_WINDOW_MS = 5 * 60 * 1000;  // 5 minutes
const COOLDOWN_MS = 15 * 60 * 1000;       // 15 minutes in open state
```

**Why In-Memory?**
- Circuit breaker state is transient by design
- Server restart naturally resets circuits (allows fresh retry)
- No database overhead for frequent state changes
- Consistent with Martin Fowler's circuit breaker pattern

---

## Enhanced Log Actions

The following new log actions will be added to track circuit breaker events:

| Action | Status | When Used |
|--------|--------|-----------|
| `circuit_breaker_opened` | error | Circuit transitioned to OPEN state |
| `circuit_breaker_half_open` | warning | Circuit transitioned to HALF_OPEN state |
| `circuit_breaker_closed` | success | Circuit recovered to CLOSED state |
| `circuit_breaker_rejected` | warning | Request rejected due to OPEN circuit |
| `meta_token_exchanged` | success | Short-lived token exchanged for long-lived |
| `meta_token_refreshed` | success | Long-lived token refreshed |
| `operation_skipped_needs_reconnect` | warning | API operation skipped due to needs_reconnect |

**Example Log Entry**:
```json
{
  "id": "uuid",
  "connection_id": "conn-uuid",
  "action": "circuit_breaker_opened",
  "status": "error",
  "message": "Circuit opened after 5 consecutive failures",
  "metadata": {
    "failure_count": 5,
    "last_error": "invalid_grant",
    "next_retry_at": "2026-02-02T15:30:00Z"
  },
  "created_at": "2026-02-02T15:15:00Z"
}
```

---

## TypeScript Interfaces

### Connection (Enhanced)

```typescript
// backend/src/modules/connections/interfaces/connection.interface.ts

export interface Connection {
  id: string;
  user_id: string;
  workspace_id: string | null;
  connection_name: string;
  platform_name: 'google' | 'meta' | 'ad_manager' | 'adsense' | 'analytics' | 'search_console';
  platform_user_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  is_active: boolean;
  needs_reconnect: boolean;
  last_refresh_error: string | null;
  last_refresh_attempt: string | null;
  metadata: ConnectionMetadata | null;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
}

export interface ConnectionMetadata {
  type: 'ads' | 'ad_manager' | 'adsense' | 'analytics' | 'search_console' | 'meta';
  // Google-specific
  customer_id?: string;
  network_code?: string;
  account_id?: string;
  // Meta-specific
  page_id?: string;
  instagram_id?: string;
}
```

### ConnectionLog (Enhanced)

```typescript
// backend/src/modules/connections/interfaces/connection-log.interface.ts

export type ConnectionLogAction =
  | 'token_auto_refresh'
  | 'token_expired_notification'
  | 'token_expiring_notification'
  | 'token_refresh_failed_permanent'
  | 'circuit_breaker_opened'
  | 'circuit_breaker_half_open'
  | 'circuit_breaker_closed'
  | 'circuit_breaker_rejected'
  | 'meta_token_exchanged'
  | 'meta_token_refreshed'
  | 'operation_skipped_needs_reconnect';

export type ConnectionLogStatus = 'success' | 'warning' | 'error';

export interface ConnectionLog {
  id: string;
  connection_id: string;
  action: ConnectionLogAction;
  status: ConnectionLogStatus;
  message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
```

### CircuitBreakerState

```typescript
// backend/src/modules/connections/interfaces/circuit-breaker.interface.ts

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

export interface CircuitBreakerState {
  connectionId: string;
  state: CircuitState;
  failureCount: number;
  failureTimestamps: Date[];
  openedAt: Date | null;
  nextRetryAt: Date | null;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;    // Default: 5
  failureWindowMs: number;     // Default: 5 * 60 * 1000 (5 min)
  cooldownMs: number;          // Default: 15 * 60 * 1000 (15 min)
}
```

---

## Query Patterns

### Get Connections Needing Token Refresh

```typescript
// For Google connections (existing)
async getGoogleConnectionsNeedingRefresh(): Promise<Connection[]> {
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

  const { data } = await this.supabase
    .from('connections')
    .select('*')
    .in('platform_name', ['google', 'ad_manager', 'adsense', 'analytics', 'search_console'])
    .eq('is_active', true)
    .eq('needs_reconnect', false)
    .lt('token_expires_at', oneHourFromNow.toISOString())
    .not('refresh_token', 'is', null);

  return data ?? [];
}

// For Meta connections (new)
async getMetaConnectionsNeedingRefresh(): Promise<Connection[]> {
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const { data } = await this.supabase
    .from('connections')
    .select('*')
    .eq('platform_name', 'meta')
    .eq('is_active', true)
    .eq('needs_reconnect', false)
    .lt('token_expires_at', sevenDaysFromNow.toISOString());

  return data ?? [];
}
```

### Check Connection Validity Before Operation

```typescript
async assertConnectionValid(connectionId: string): Promise<Connection> {
  const { data, error } = await this.supabase
    .from('connections')
    .select('*')
    .eq('id', connectionId)
    .single();

  if (error || !data) {
    throw new NotFoundException('Connection not found');
  }

  if (data.needs_reconnect) {
    // Log the rejected operation
    await this.logConnectionEvent(connectionId, 'operation_skipped_needs_reconnect', 'warning');

    throw new BadRequestException({
      code: 'CONNECTION_NEEDS_RECONNECT',
      message: 'Connection requires manual reconnection',
      connectionId,
      lastError: data.last_refresh_error,
    });
  }

  return data;
}
```

---

## Migration Notes

**No new migrations required** for this feature. All necessary columns already exist:
- `needs_reconnect` - Added in `20260131_connections_needs_reconnect.sql`
- `last_refresh_error` - Added in `20260131_connections_needs_reconnect.sql`
- `last_refresh_attempt` - Added in `20260131_connections_needs_reconnect.sql`
- `connection_logs` table - Added in `20241215_connection_logs.sql`

The circuit breaker state is intentionally in-memory only.
