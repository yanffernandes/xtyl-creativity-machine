# Quickstart: OAuth Token Management System

**Branch**: `20260202-oauth-token-management` | **Date**: 2026-02-02 | **Spec**: [spec.md](./spec.md)

## Overview

This guide provides step-by-step instructions for implementing the OAuth Token Management System. Follow the phases in order, as each builds upon the previous.

---

## Prerequisites

- [ ] Access to the backend repository (`backend/`)
- [ ] Understanding of NestJS module structure
- [ ] Meta App credentials (App ID and App Secret)
- [ ] Existing cron infrastructure working (`connections.cron.ts`)

---

## Phase 1: Circuit Breaker Service

**Goal**: Implement in-memory circuit breaker to prevent request floods on failing connections.

### Files to Create

1. `backend/src/modules/connections/interfaces/circuit-breaker.interface.ts`
2. `backend/src/modules/connections/circuit-breaker.service.ts`

### Implementation Steps

```bash
# 1. Create the interface file
touch backend/src/modules/connections/interfaces/circuit-breaker.interface.ts

# 2. Create the service file
touch backend/src/modules/connections/circuit-breaker.service.ts
```

### Key Implementation Points

```typescript
// circuit-breaker.service.ts
@Injectable()
export class CircuitBreakerService {
  private circuits = new Map<string, CircuitBreakerState>();

  private readonly config: CircuitBreakerConfig = {
    failureThreshold: 5,
    failureWindowMs: 5 * 60 * 1000,  // 5 minutes
    cooldownMs: 15 * 60 * 1000,      // 15 minutes
  };

  canRequest(connectionId: string): boolean {
    const state = this.getOrCreateState(connectionId);

    if (state.state === CircuitState.OPEN) {
      // Check if cooldown has passed
      if (state.nextRetryAt && new Date() >= state.nextRetryAt) {
        state.state = CircuitState.HALF_OPEN;
        return true;
      }
      return false;
    }

    return true;
  }

  recordFailure(connectionId: string, error?: Error): void {
    const state = this.getOrCreateState(connectionId);
    const now = new Date();

    // Add to rolling window
    state.failureTimestamps.push(now);

    // Remove failures outside the window
    const windowStart = new Date(now.getTime() - this.config.failureWindowMs);
    state.failureTimestamps = state.failureTimestamps.filter(t => t >= windowStart);

    // Check if threshold reached
    if (state.failureTimestamps.length >= this.config.failureThreshold) {
      this.openCircuit(connectionId, state);
    }
  }

  recordSuccess(connectionId: string): void {
    const state = this.circuits.get(connectionId);
    if (state) {
      state.state = CircuitState.CLOSED;
      state.failureCount = 0;
      state.failureTimestamps = [];
      state.openedAt = null;
      state.nextRetryAt = null;
    }
  }
}
```

### Test Verification

```typescript
// Test: Circuit opens after 5 failures
it('should open circuit after threshold failures', () => {
  for (let i = 0; i < 5; i++) {
    service.recordFailure('conn-1');
  }
  expect(service.canRequest('conn-1')).toBe(false);
  expect(service.getState('conn-1')?.state).toBe(CircuitState.OPEN);
});
```

---

## Phase 2: Connection Guard Service

**Goal**: Add validation layer that prevents operations on invalid connections.

### Files to Modify

1. `backend/src/modules/connections/connections.service.ts` (add method)

### Implementation

```typescript
// Add to ConnectionsService
async assertConnectionValid(connectionId: string): Promise<Connection> {
  const connection = await this.getConnection(connectionId);

  if (!connection) {
    throw new NotFoundException('Connection not found');
  }

  if (connection.needs_reconnect) {
    // Log the rejected operation
    await this.logConnectionEvent(
      connectionId,
      'operation_skipped_needs_reconnect',
      'warning',
      `Operation rejected: connection requires reconnection`,
    );

    throw new BadRequestException({
      code: 'CONNECTION_NEEDS_RECONNECT',
      message: 'Connection requires manual reconnection',
      connectionId,
      lastError: connection.last_refresh_error,
    });
  }

  return connection;
}
```

### Integration Points

Update each service to call `assertConnectionValid` before API operations:

```typescript
// In GoogleAdsService, MetaService, etc.
async getAccountData(connectionId: string) {
  // Add this at the start of every public method
  const connection = await this.connectionsService.assertConnectionValid(connectionId);

  // Then proceed with normal operation
  return this.callGoogleApi(connection);
}
```

---

## Phase 3: Meta Token Exchange

**Goal**: Convert short-lived tokens to long-lived tokens during OAuth flow.

### Files to Modify

1. `backend/src/modules/meta/meta.service.ts`

### Implementation

```typescript
// Add new method to MetaService
async exchangeForLongLivedToken(shortLivedToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  const url = `${this.graphApiUrl}/oauth/access_token`;

  const response = await axios.get(url, {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: this.configService.get('META_APP_ID'),
      client_secret: this.configService.get('META_APP_SECRET'),
      fb_exchange_token: shortLivedToken,
    },
  });

  const { access_token, expires_in } = response.data;
  const expiresAt = new Date(Date.now() + expires_in * 1000);

  return {
    accessToken: access_token,
    expiresAt,
  };
}

// Modify exchangeCodeForToken to use this
async exchangeCodeForToken(code: string, redirectUri: string) {
  // ... existing code to get short-lived token ...

  // NEW: Exchange for long-lived token
  const longLived = await this.exchangeForLongLivedToken(tokenResponse.access_token);

  // Store the long-lived token
  const connectionData = {
    access_token: longLived.accessToken,
    token_expires_at: longLived.expiresAt.toISOString(),
    needs_reconnect: false,
    last_refresh_error: null,
  };

  // ... continue with connection storage ...
}
```

---

## Phase 4: Meta Token Refresh Cron

**Goal**: Add Meta connections to the token maintenance cron job.

### Files to Modify

1. `backend/src/modules/connections/connections.service.ts` (add query)
2. `backend/src/modules/connections/connections.cron.ts` (add cron job)

### Implementation

```typescript
// connections.service.ts - Add query method
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

// connections.cron.ts - Add new cron job
@Cron(CronExpression.EVERY_30_MINUTES)
async autoRefreshMetaTokens() {
  this.logger.log('Starting Meta token auto-refresh');

  const connections = await this.connectionsService.getMetaConnectionsNeedingRefresh();
  this.logger.log(`Found ${connections.length} Meta connections needing refresh`);

  for (const connection of connections) {
    try {
      await this.metaService.refreshLongLivedToken(connection.id);

      await this.connectionsService.logConnectionEvent(
        connection.id,
        'meta_token_refreshed',
        'success',
      );
    } catch (error) {
      // Handle errors similar to Google refresh
      await this.handleRefreshError(connection, error);
    }

    // Rate limiting
    await this.delay(200);
  }
}
```

---

## Phase 5: Integrate Circuit Breaker

**Goal**: Connect circuit breaker to all API call paths.

### Pattern to Apply

```typescript
// Wrapper for all external API calls
async callExternalApi<T>(
  connectionId: string,
  apiCall: () => Promise<T>,
): Promise<T> {
  // Check connection validity
  await this.connectionsService.assertConnectionValid(connectionId);

  // Check circuit breaker
  if (!this.circuitBreakerService.canRequest(connectionId)) {
    await this.connectionsService.logConnectionEvent(
      connectionId,
      'circuit_breaker_rejected',
      'warning',
    );
    throw new ServiceUnavailableException('Circuit breaker is open');
  }

  try {
    const result = await apiCall();
    this.circuitBreakerService.recordSuccess(connectionId);
    return result;
  } catch (error) {
    this.circuitBreakerService.recordFailure(connectionId, error);
    throw error;
  }
}
```

---

## Phase 6: Automation Guard Integration

**Goal**: Skip automations that use invalid connections.

### Files to Modify

1. `backend/src/temporal/activities/automation.activities.ts`

### Implementation

```typescript
// At the start of automation execution
async executeAutomation(automationId: string, runId: string) {
  const automation = await this.getAutomation(automationId);

  for (const connectionId of automation.connectionIds) {
    const validation = await this.connectionsService.validateConnection(connectionId);

    if (!validation.isValid) {
      await this.recordSkippedRun(runId, 'connection_needs_reconnect', connectionId);

      this.logger.warn(
        `Skipping automation ${automationId}: connection ${connectionId} needs reconnect`,
      );

      return {
        status: 'skipped',
        reason: 'connection_needs_reconnect',
        connectionId,
      };
    }
  }

  // Proceed with execution...
}
```

---

## Verification Checklist

### Unit Tests

- [ ] CircuitBreakerService opens after 5 failures in 5 minutes
- [ ] CircuitBreakerService transitions to half-open after 15 minutes
- [ ] CircuitBreakerService closes on successful half-open test
- [ ] Meta token exchange returns ~60 day expiry
- [ ] Connection guard throws on needs_reconnect = true

### Integration Tests

- [ ] Meta OAuth flow stores long-lived token
- [ ] Google invalid_grant marks needs_reconnect immediately
- [ ] Cron job refreshes Meta tokens within 7-day window
- [ ] Cron job skips connections with needs_reconnect

### Manual Tests

- [ ] Connect Meta account → verify token_expires_at is ~60 days out
- [ ] Revoke Google token in Google settings → verify loop stops
- [ ] Check connections page shows correct status badges

---

## Rollback Plan

If issues occur:

1. **Circuit Breaker**: Remove circuit breaker checks (service is stateless)
2. **Meta Exchange**: Revert to storing short-lived token (users reconnect normally)
3. **Guard Checks**: Remove assertConnectionValid calls (reverts to current behavior)

All changes are backward compatible - existing connections continue to work.
