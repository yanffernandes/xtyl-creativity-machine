# Research: OAuth Token Management System

**Branch**: `20260202-oauth-token-management` | **Date**: 2026-02-02 | **Spec**: [spec.md](./spec.md)

## Executive Summary

This document captures technical research and design decisions for implementing robust OAuth token management for Google and Meta platforms. The research identified critical gaps in the current implementation and evaluated solutions.

---

## Problem Analysis

### Current State Assessment

| Platform | Token Type | Refresh Mechanism | Cron Support | Gaps |
|----------|-----------|-------------------|--------------|------|
| **Meta** | Long-lived (~60 days) | None (on-demand validation) | No | No proactive refresh, no exchange to long-lived |
| **Google Ads** | Short-lived (~1h) + Refresh | Auto-refresh every 30min | Yes | Services ignore `needs_reconnect` flag |
| **Ad Manager** | Short-lived (~1h) + Refresh | Auto-refresh every 30min | Yes | Same as Google Ads |
| **AdSense** | Short-lived (~1h) + Refresh | Auto-refresh every 30min | Yes | Same as Google Ads |

### Critical Issues Identified

1. **Meta Token Lifecycle**: Tokens stored directly from OAuth without exchange to long-lived tokens (60 days instead of 1-2 hours)
2. **Google Loop Problem**: Services continue calling APIs with revoked tokens, generating infinite `invalid_grant` loops
3. **Missing Guard Pattern**: No centralized check for `needs_reconnect` before API operations
4. **No Circuit Breaker**: Failures not rate-limited, causing log spam and potential rate limit violations

---

## Research Decisions

### RD-001: Meta Token Exchange Strategy

**Question**: How should we obtain long-lived tokens from Meta?

**Options Evaluated**:

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Exchange immediately after OAuth | Simplest, guaranteed long token | One extra API call on connect |
| B | Store short token, exchange in cron | Deferred processing | Complex state management |
| C | Exchange only when needed | Lazy evaluation | Unpredictable UX |

**Decision**: **Option A - Exchange immediately after OAuth callback**

**Rationale**:
- Meta Graph API v21.0 endpoint: `GET /oauth/access_token?grant_type=fb_exchange_token&client_id={app-id}&client_secret={app-secret}&fb_exchange_token={short-token}`
- Response includes `access_token` (long-lived, ~60 days) and `expires_in`
- Single point of exchange simplifies error handling
- User is still in OAuth flow, so reconnection is natural if exchange fails

**Implementation Location**: `backend/src/modules/meta/meta.service.ts:exchangeCodeForToken()`

---

### RD-002: Service Guard Pattern for needs_reconnect

**Question**: How should services prevent operations on invalid connections?

**Options Evaluated**:

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Check in each service method | Explicit, granular control | Code duplication |
| B | Decorator/Guard middleware | DRY, centralized | Magic behavior, harder to debug |
| C | Utility function called at service entry points | Balance of explicit + DRY | Minor boilerplate |

**Decision**: **Option C - Utility function with early return pattern**

**Rationale**:
- Clear and explicit in code flow
- Easy to test and debug
- Consistent error responses
- No hidden behavior

**Implementation Pattern**:
```typescript
// In ConnectionsService
async assertConnectionValid(connectionId: string): Promise<Connection> {
  const connection = await this.getConnection(connectionId);
  if (!connection) {
    throw new NotFoundException('Connection not found');
  }
  if (connection.needs_reconnect) {
    throw new BadRequestException({
      code: 'CONNECTION_NEEDS_RECONNECT',
      message: 'Connection requires reconnection',
      connectionId,
    });
  }
  return connection;
}
```

**Affected Services**:
- `GoogleOAuthService` - Before any API call
- `MetaService` - Before any API call
- `AdManagerOAuthService` - Before any API call
- `AdSenseOAuthService` - Before any API call
- All automation/workflow services consuming connections

---

### RD-003: Circuit Breaker Implementation

**Question**: Should we implement a full circuit breaker or enhance the existing approach?

**Options Evaluated**:

| Option | Approach | Complexity | Benefit |
|--------|----------|------------|---------|
| A | Full circuit breaker library (opossum) | High | Industry standard |
| B | Custom in-memory circuit breaker | Medium | Tailored to needs |
| C | Enhance `needs_reconnect` with timestamps | Low | Minimal changes |
| D | Redis-backed circuit breaker | High | Multi-instance support |

**Decision**: **Option B - Custom in-memory circuit breaker per connection**

**Rationale**:
- No external dependencies
- Sufficient for current scale (single backend instance)
- Provides half-open state for recovery testing
- Can migrate to Redis later if needed

**State Machine**:
```
CLOSED (normal) ──[5 failures in 5min]──> OPEN (blocked)
     ↑                                         │
     │                                   [15min timeout]
     │                                         ↓
     └───[success]─── HALF_OPEN (testing) <────┘
                           │
                     [failure]
                           ↓
                        OPEN
```

**Implementation**: New `CircuitBreakerService` in `backend/src/modules/connections/`

---

### RD-004: Meta Token Refresh Strategy

**Question**: How should Meta tokens be refreshed before expiry?

**Research Findings**:
- Meta long-lived tokens can be refreshed if still valid and less than 60 days old
- Endpoint: `GET /oauth/access_token?grant_type=fb_exchange_token&...&fb_exchange_token={current-long-token}`
- If token is older than 60 days, user must re-authenticate

**Decision**: Add Meta connections to existing cron job with 7-day refresh window

**Implementation**:
```typescript
// In connections.cron.ts - Add new method
@Cron(CronExpression.EVERY_30_MINUTES)
async autoRefreshMetaTokens() {
  const connections = await this.connectionsService.getMetaConnectionsNeedingRefresh();
  // Connections expiring within 7 days
  for (const conn of connections) {
    await this.metaService.refreshLongLivedToken(conn);
  }
}
```

---

### RD-005: Automation Skip Strategy

**Question**: How should automations handle connections with `needs_reconnect`?

**Options Evaluated**:

| Option | Approach | UX Impact |
|--------|----------|-----------|
| A | Fail silently, log only | User unaware |
| B | Fail with error, continue others | Partial execution |
| C | Skip with recorded reason, notify user | Full visibility |

**Decision**: **Option C - Skip with recorded reason and notification**

**Implementation**:
- Check `needs_reconnect` at automation start
- Record skip reason in `automation_runs.status = 'skipped'` with `skip_reason`
- Create notification for user (respecting 24h deduplication)
- Continue processing other automations in batch

---

### RD-006: Error Classification Refinement

**Current Classification** (from codebase):
```typescript
const PERMANENT_ERROR_CODES = [
  'invalid_grant',
  'invalid_client',
  'unauthorized_client',
  'access_denied',
];
```

**Enhanced Classification for Meta**:
```typescript
const META_PERMANENT_ERRORS = [
  'OAuthException',           // Generic OAuth failure
  'invalid_token',            // Token is invalid
  'error_validating_access_token', // Token validation failed
  190,                        // Invalid OAuth access token (error code)
  463,                        // Token expired (error code)
];

const META_TRANSIENT_ERRORS = [
  1,    // Unknown error (retry)
  2,    // Service temporarily unavailable
  4,    // Application request limit reached (rate limit)
  17,   // User request limit reached
  341,  // Application limit reached
];
```

---

## Technical Constraints

### API Rate Limits

| Platform | Limit | Mitigation |
|----------|-------|------------|
| Google OAuth | 10,000/day per client | Batch refresh, 200ms delay |
| Meta Graph API | 200 calls/user/hour | Circuit breaker, exponential backoff |

### Database Considerations

- Connection table already has `needs_reconnect`, `last_refresh_error`, `last_refresh_attempt`
- Circuit breaker state should be in-memory (volatile, per-connection)
- Logging goes to existing `connection_logs` table

### Backward Compatibility

- Existing connections with short-lived Meta tokens will be marked `needs_reconnect` on first use
- No automatic migration of existing tokens (out of scope per spec)
- Users with expired Meta connections must manually reconnect

---

## Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| @nestjs/schedule | ^4.0.0 | Existing cron infrastructure |
| axios | ^1.6.0 | HTTP client for token exchange |
| Meta Graph API | v21.0 | Token exchange endpoint |
| Google OAuth2 | v2 | Refresh token endpoint |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Meta API changes token format | High | Version lock API, monitor changelogs |
| Circuit breaker too aggressive | Medium | Conservative thresholds (5 failures/5 min) |
| Memory leak in circuit breaker | Low | Clear state on connection delete, periodic cleanup |
| Rate limit violations during mass refresh | Medium | Stagger refresh times, respect 200ms delay |

---

## References

- [Meta Long-Lived Tokens](https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived)
- [Google OAuth2 Refresh](https://developers.google.com/identity/protocols/oauth2/web-server#offline)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- Current implementation: `backend/src/modules/connections/connections.cron.ts`
