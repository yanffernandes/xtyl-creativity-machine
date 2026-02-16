/**
 * Circuit Breaker Service Contract
 *
 * Defines the interface for circuit breaker pattern implementation
 * to protect the system from cascading failures when OAuth connections fail.
 *
 * @feature 20260202-oauth-token-management
 * @requirement FR-011, FR-012, FR-013, FR-014, FR-015
 */

// ============================================================================
// Types & Enums
// ============================================================================

export enum CircuitState {
  /** Normal operation - requests pass through */
  CLOSED = 'closed',
  /** Blocking requests - connection has failed repeatedly */
  OPEN = 'open',
  /** Testing recovery - allowing one request to test */
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
  /** Number of failures before circuit opens (default: 5) */
  failureThreshold: number;
  /** Time window for counting failures in ms (default: 5 min) */
  failureWindowMs: number;
  /** Time circuit stays open before half-open in ms (default: 15 min) */
  cooldownMs: number;
}

// ============================================================================
// Service Interface
// ============================================================================

export interface ICircuitBreakerService {
  /**
   * Check if a request can proceed for a connection.
   *
   * @param connectionId - The connection ID to check
   * @returns true if request can proceed, false if circuit is open
   *
   * @example
   * if (!circuitBreaker.canRequest(connectionId)) {
   *   throw new ServiceUnavailableException('Circuit breaker is open');
   * }
   */
  canRequest(connectionId: string): boolean;

  /**
   * Record a successful request for a connection.
   * If circuit is half-open, this closes the circuit.
   *
   * @param connectionId - The connection ID
   *
   * @example
   * try {
   *   const result = await apiCall();
   *   circuitBreaker.recordSuccess(connectionId);
   *   return result;
   * } catch (error) {
   *   circuitBreaker.recordFailure(connectionId, error);
   *   throw error;
   * }
   */
  recordSuccess(connectionId: string): void;

  /**
   * Record a failed request for a connection.
   * May open the circuit if failure threshold is reached.
   *
   * @param connectionId - The connection ID
   * @param error - The error that occurred (optional, for logging)
   */
  recordFailure(connectionId: string, error?: Error): void;

  /**
   * Get the current state of a circuit.
   *
   * @param connectionId - The connection ID
   * @returns The circuit state, or undefined if no state exists
   */
  getState(connectionId: string): CircuitBreakerState | undefined;

  /**
   * Reset the circuit for a connection.
   * Used when a connection is manually reconnected by user.
   *
   * @param connectionId - The connection ID
   */
  reset(connectionId: string): void;

  /**
   * Clean up circuits for deleted connections.
   *
   * @param connectionId - The connection ID to remove
   */
  removeCircuit(connectionId: string): void;
}

// ============================================================================
// Response DTOs
// ============================================================================

export interface CircuitBreakerStatusResponse {
  connectionId: string;
  state: CircuitState;
  failureCount: number;
  isBlocking: boolean;
  nextRetryAt: string | null;
  message: string;
}

// ============================================================================
// Events (for logging)
// ============================================================================

export interface CircuitBreakerEvent {
  type: 'opened' | 'closed' | 'half_open' | 'rejected';
  connectionId: string;
  timestamp: Date;
  metadata: {
    failureCount?: number;
    lastError?: string;
    nextRetryAt?: Date;
  };
}
