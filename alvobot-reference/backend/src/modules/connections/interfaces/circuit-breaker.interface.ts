/**
 * Circuit Breaker Types and Interfaces
 *
 * Implements the circuit breaker pattern to protect the system from
 * cascading failures when OAuth connections fail repeatedly.
 *
 * @feature 20260202-oauth-token-management
 * @requirement FR-011, FR-012, FR-013, FR-014, FR-015
 */

// ============================================================================
// Enums
// ============================================================================

export enum CircuitState {
  /** Normal operation - requests pass through */
  CLOSED = "closed",
  /** Blocking requests - connection has failed repeatedly */
  OPEN = "open",
  /** Testing recovery - allowing one request to test */
  HALF_OPEN = "half_open",
}

// ============================================================================
// Interfaces
// ============================================================================

export interface CircuitBreakerState {
  connectionId: string;
  state: CircuitState;
  failureCount: number;
  failureTimestamps: Date[];
  openedAt: Date | null;
  nextRetryAt: Date | null;
}

export interface CircuitBreakerConfig {
  /** Number of failures before circuit opens (default: 5) */
  failureThreshold: number;
  /** Time window for counting failures in ms (default: 5 min) */
  failureWindowMs: number;
  /** Time circuit stays open before half-open in ms (default: 15 min) */
  cooldownMs: number;
}

export interface CircuitBreakerStatusResponse {
  connectionId: string;
  state: CircuitState;
  failureCount: number;
  isBlocking: boolean;
  nextRetryAt: string | null;
  message: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Default: 5 failures before circuit opens */
export const FAILURE_THRESHOLD = 5;

/** Default: 5 minutes (300000ms) - time window for counting failures */
export const FAILURE_WINDOW_MS = 5 * 60 * 1000;

/** Default: 15 minutes (900000ms) - time circuit stays open */
export const COOLDOWN_MS = 15 * 60 * 1000;

/** Default configuration */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: FAILURE_THRESHOLD,
  failureWindowMs: FAILURE_WINDOW_MS,
  cooldownMs: COOLDOWN_MS,
};
