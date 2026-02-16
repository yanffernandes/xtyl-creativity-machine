/**
 * Token Management Service Contracts
 *
 * Defines interfaces for OAuth token management operations
 * across Google and Meta platforms.
 *
 * @feature 20260202-oauth-token-management
 * @requirement FR-001 through FR-010, FR-016 through FR-023
 */

// ============================================================================
// Common Types
// ============================================================================

export type TokenRefreshErrorType = 'permanent' | 'transient';

export interface TokenRefreshResult {
  success: boolean;
  newExpiresAt?: string;
  errorType?: TokenRefreshErrorType;
  errorMessage?: string;
}

export interface ConnectionValidationResult {
  isValid: boolean;
  connectionId: string;
  needsReconnect: boolean;
  lastError?: string;
}

// ============================================================================
// Meta Token Management
// ============================================================================

export interface IMetaTokenService {
  /**
   * Exchange a short-lived token for a long-lived token (~60 days).
   * Called immediately after OAuth callback.
   *
   * @param shortLivedToken - The token from OAuth callback
   * @returns The long-lived token and expiry date
   *
   * @requirement FR-001: Convert tokens immediately after OAuth callback
   * @requirement FR-002: Store real expiration date (~60 days)
   */
  exchangeForLongLivedToken(shortLivedToken: string): Promise<{
    accessToken: string;
    expiresAt: Date;
  }>;

  /**
   * Refresh a long-lived token before it expires.
   * Token must still be valid (not yet expired).
   *
   * @param connectionId - The connection to refresh
   * @returns Result of the refresh operation
   *
   * @requirement FR-003: Include Meta in maintenance job
   * @requirement FR-004: Refresh when < 7 days to expiry
   */
  refreshLongLivedToken(connectionId: string): Promise<TokenRefreshResult>;

  /**
   * Validate a Meta access token.
   *
   * @param accessToken - The token to validate
   * @returns Whether the token is valid
   */
  validateToken(accessToken: string): Promise<boolean>;
}

// ============================================================================
// Google Token Management (Enhanced Interface)
// ============================================================================

export interface IGoogleTokenService {
  /**
   * Refresh an access token using the refresh token.
   *
   * @param connectionId - The connection to refresh
   * @returns Result of the refresh operation
   *
   * @requirement FR-018: Implement backoff for transient errors
   * @requirement FR-019: Classify errors as permanent/transient
   */
  refreshAccessToken(connectionId: string): Promise<TokenRefreshResult>;

  /**
   * Check if a connection's token needs refresh.
   *
   * @param connectionId - The connection to check
   * @returns Whether refresh is needed
   */
  needsRefresh(connectionId: string): Promise<boolean>;
}

// ============================================================================
// Connection Guard Service
// ============================================================================

export interface IConnectionGuardService {
  /**
   * Assert that a connection is valid for use.
   * Throws if connection has needs_reconnect = true.
   *
   * @param connectionId - The connection to validate
   * @returns The validated connection
   * @throws NotFoundException if connection doesn't exist
   * @throws BadRequestException if needs_reconnect is true
   *
   * @requirement FR-006: Check needs_reconnect before operations
   * @requirement FR-007: Reject operations without calling external APIs
   */
  assertConnectionValid(connectionId: string): Promise<Connection>;

  /**
   * Check if a connection can be used (non-throwing version).
   *
   * @param connectionId - The connection to check
   * @returns Validation result
   */
  validateConnection(connectionId: string): Promise<ConnectionValidationResult>;

  /**
   * Mark a connection as needing reconnection.
   *
   * @param connectionId - The connection to mark
   * @param errorMessage - The error that caused this
   *
   * @requirement FR-008: Mark needs_reconnect on invalid_grant
   */
  markNeedsReconnect(connectionId: string, errorMessage: string): Promise<void>;

  /**
   * Clear the needs_reconnect flag after successful reconnection.
   *
   * @param connectionId - The connection to clear
   */
  clearNeedsReconnect(connectionId: string): Promise<void>;
}

// ============================================================================
// Token Maintenance Cron Service
// ============================================================================

export interface ITokenMaintenanceService {
  /**
   * Auto-refresh Google tokens that are expiring soon.
   * Runs every 30 minutes.
   *
   * @requirement FR-016: Execute maintenance job periodically
   * @requirement FR-017: Identify tokens in renewal window
   */
  autoRefreshGoogleTokens(): Promise<void>;

  /**
   * Auto-refresh Meta tokens that are expiring within 7 days.
   * Runs every 30 minutes.
   *
   * @requirement FR-003: Include Meta in maintenance job
   * @requirement FR-004: Refresh when < 7 days to expiry
   */
  autoRefreshMetaTokens(): Promise<void>;

  /**
   * Check for already-expired tokens and notify users.
   * Runs every hour.
   */
  checkExpiredTokens(): Promise<void>;

  /**
   * Check for tokens expiring soon and send warnings.
   * Runs every hour.
   */
  checkExpiringTokens(): Promise<void>;
}

// ============================================================================
// Logging Service
// ============================================================================

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

export interface IConnectionLogService {
  /**
   * Log a connection event.
   *
   * @param connectionId - The connection ID
   * @param action - The action being logged
   * @param status - success, warning, or error
   * @param message - Human-readable message
   * @param metadata - Additional context
   *
   * @requirement FR-021: Log all refresh attempts
   * @requirement FR-022: Log circuit breaker transitions
   * @requirement FR-023: Log rejected operations
   */
  log(
    connectionId: string,
    action: ConnectionLogAction,
    status: 'success' | 'warning' | 'error',
    message?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void>;
}

// ============================================================================
// Supporting Types (from data model)
// ============================================================================

export interface Connection {
  id: string;
  user_id: string;
  workspace_id: string | null;
  connection_name: string;
  platform_name: string;
  platform_user_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  is_active: boolean;
  needs_reconnect: boolean;
  last_refresh_error: string | null;
  last_refresh_attempt: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
}
