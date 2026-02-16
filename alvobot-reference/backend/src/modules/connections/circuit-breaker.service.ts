import { Injectable, Logger } from "@nestjs/common";
import {
  CircuitState,
  CircuitBreakerState,
  CircuitBreakerConfig,
  CircuitBreakerStatusResponse,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from "./interfaces/circuit-breaker.interface";
import { ConnectionsService } from "./connections.service";

/**
 * Circuit Breaker Service
 *
 * Implements the circuit breaker pattern to protect the system from
 * cascading failures when OAuth connections fail repeatedly.
 *
 * State Machine:
 * CLOSED (normal) ──[5 failures in 5min]──> OPEN (blocked)
 *      ↑                                         │
 *      │                                   [15min timeout]
 *      │                                         ↓
 *      └───[success]─── HALF_OPEN (testing) <────┘
 *                            │
 *                      [failure]
 *                            ↓
 *                         OPEN
 *
 * @feature 20260202-oauth-token-management
 * @requirement FR-011, FR-012, FR-013, FR-014, FR-015
 */
@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);

  /** In-memory storage for circuit breaker states */
  private readonly circuits = new Map<string, CircuitBreakerState>();

  /** Configuration (can be overridden via constructor) */
  private readonly config: CircuitBreakerConfig;

  constructor(private readonly connectionsService: ConnectionsService) {
    this.config = DEFAULT_CIRCUIT_BREAKER_CONFIG;
  }

  /**
   * Check if a request can proceed for a connection.
   *
   * @param connectionId - The connection ID to check
   * @returns true if request can proceed, false if circuit is open
   *
   * @requirement FR-014: Test connection when transitioning to half-open
   */
  canRequest(connectionId: string): boolean {
    const state = this.circuits.get(connectionId);

    // No state = circuit is closed (default)
    if (!state) {
      return true;
    }

    switch (state.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        // Check if cooldown has passed
        if (state.nextRetryAt && new Date() >= state.nextRetryAt) {
          // Transition to HALF_OPEN
          this.transitionToHalfOpen(connectionId, state);
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        // Allow one request through for testing
        return true;

      default:
        return true;
    }
  }

  /**
   * Record a successful request for a connection.
   * If circuit is half-open, this closes the circuit.
   *
   * @param connectionId - The connection ID
   *
   * @requirement FR-015: Close circuit after successful half-open request
   */
  recordSuccess(connectionId: string): void {
    const state = this.circuits.get(connectionId);

    if (!state) {
      return;
    }

    if (state.state === CircuitState.HALF_OPEN) {
      // Success in half-open state - close the circuit
      this.transitionToClosed(connectionId, state);
    } else if (state.state === CircuitState.CLOSED) {
      // Reset failure tracking on success
      state.failureCount = 0;
      state.failureTimestamps = [];
    }
  }

  /**
   * Record a failed request for a connection.
   * May open the circuit if failure threshold is reached.
   *
   * @param connectionId - The connection ID
   * @param error - The error that occurred (optional, for logging)
   *
   * @requirement FR-011: Track consecutive failures per connection
   * @requirement FR-012: Open circuit after 5 failures in 5 minutes
   */
  recordFailure(connectionId: string, error?: Error): void {
    let state = this.circuits.get(connectionId);

    if (!state) {
      // Create new circuit state
      state = {
        connectionId,
        state: CircuitState.CLOSED,
        failureCount: 0,
        failureTimestamps: [],
        openedAt: null,
        nextRetryAt: null,
      };
      this.circuits.set(connectionId, state);
    }

    const now = new Date();

    if (state.state === CircuitState.HALF_OPEN) {
      // Failure in half-open state - back to open
      this.transitionToOpen(connectionId, state, error?.message);
      return;
    }

    // Add failure to rolling window
    state.failureTimestamps.push(now);
    state.failureCount++;

    // Remove failures outside the window
    const windowStart = new Date(now.getTime() - this.config.failureWindowMs);
    state.failureTimestamps = state.failureTimestamps.filter(
      (t) => t >= windowStart,
    );

    // Check if threshold reached within the window
    if (state.failureTimestamps.length >= this.config.failureThreshold) {
      this.transitionToOpen(connectionId, state, error?.message);
    }
  }

  /**
   * Get the current state of a circuit.
   *
   * @param connectionId - The connection ID
   * @returns The circuit state, or undefined if no state exists
   */
  getState(connectionId: string): CircuitBreakerState | undefined {
    return this.circuits.get(connectionId);
  }

  /**
   * Get circuit breaker status for API response.
   *
   * @param connectionId - The connection ID
   * @returns Status response object
   */
  getCircuitBreakerStatus(connectionId: string): CircuitBreakerStatusResponse {
    const state = this.circuits.get(connectionId);

    if (!state) {
      return {
        connectionId,
        state: CircuitState.CLOSED,
        failureCount: 0,
        isBlocking: false,
        nextRetryAt: null,
        message: "Circuit is closed (normal operation)",
      };
    }

    const isBlocking =
      state.state === CircuitState.OPEN && !this.canRequest(connectionId);

    let message: string;
    switch (state.state) {
      case CircuitState.CLOSED:
        message = "Circuit is closed (normal operation)";
        break;
      case CircuitState.OPEN:
        message = `Circuit is open (blocking requests until ${state.nextRetryAt?.toISOString() || "unknown"})`;
        break;
      case CircuitState.HALF_OPEN:
        message = "Circuit is half-open (testing recovery)";
        break;
    }

    return {
      connectionId,
      state: state.state,
      failureCount: state.failureCount,
      isBlocking,
      nextRetryAt: state.nextRetryAt?.toISOString() || null,
      message,
    };
  }

  /**
   * Reset the circuit for a connection.
   * Used when a connection is manually reconnected by user.
   *
   * @param connectionId - The connection ID
   */
  reset(connectionId: string): void {
    const state = this.circuits.get(connectionId);

    if (state) {
      state.state = CircuitState.CLOSED;
      state.failureCount = 0;
      state.failureTimestamps = [];
      state.openedAt = null;
      state.nextRetryAt = null;

      this.logger.log(`Circuit reset for connection ${connectionId}`);
    }
  }

  /**
   * Clean up circuits for deleted connections.
   *
   * @param connectionId - The connection ID to remove
   */
  removeCircuit(connectionId: string): void {
    if (this.circuits.has(connectionId)) {
      this.circuits.delete(connectionId);
      this.logger.debug(`Circuit removed for connection ${connectionId}`);
    }
  }

  // =========================================================================
  // Private Methods - State Transitions
  // =========================================================================

  /**
   * Transition circuit to OPEN state
   */
  private transitionToOpen(
    connectionId: string,
    state: CircuitBreakerState,
    lastError?: string,
  ): void {
    const now = new Date();
    const nextRetryAt = new Date(now.getTime() + this.config.cooldownMs);

    state.state = CircuitState.OPEN;
    state.openedAt = now;
    state.nextRetryAt = nextRetryAt;

    this.logger.warn(
      `Circuit OPENED for connection ${connectionId} after ${state.failureTimestamps.length} failures. Next retry at ${nextRetryAt.toISOString()}`,
    );

    // Log the circuit breaker event
    this.logCircuitBreakerEvent(connectionId, "circuit_breaker_opened", {
      failureCount: state.failureTimestamps.length,
      lastError,
      nextRetryAt: nextRetryAt.toISOString(),
    });
  }

  /**
   * Transition circuit to HALF_OPEN state
   */
  private transitionToHalfOpen(
    connectionId: string,
    state: CircuitBreakerState,
  ): void {
    state.state = CircuitState.HALF_OPEN;
    state.nextRetryAt = null;

    this.logger.log(
      `Circuit transitioned to HALF_OPEN for connection ${connectionId}`,
    );

    // Log the circuit breaker event
    this.logCircuitBreakerEvent(connectionId, "circuit_breaker_half_open", {
      openedAt: state.openedAt?.toISOString(),
    });
  }

  /**
   * Transition circuit to CLOSED state
   */
  private transitionToClosed(
    connectionId: string,
    state: CircuitBreakerState,
  ): void {
    state.state = CircuitState.CLOSED;
    state.failureCount = 0;
    state.failureTimestamps = [];
    state.openedAt = null;
    state.nextRetryAt = null;

    this.logger.log(
      `Circuit CLOSED for connection ${connectionId} (recovered)`,
    );

    // Log the circuit breaker event
    this.logCircuitBreakerEvent(connectionId, "circuit_breaker_closed", {});
  }

  /**
   * Log circuit breaker events to connection_logs
   */
  private async logCircuitBreakerEvent(
    connectionId: string,
    action:
      | "circuit_breaker_opened"
      | "circuit_breaker_half_open"
      | "circuit_breaker_closed"
      | "circuit_breaker_rejected",
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const statusMap: Record<string, "success" | "warning" | "error"> = {
      circuit_breaker_opened: "error",
      circuit_breaker_half_open: "warning",
      circuit_breaker_closed: "success",
      circuit_breaker_rejected: "warning",
    };

    const messageMap: Record<string, string> = {
      circuit_breaker_opened: "Circuit breaker opened after repeated failures",
      circuit_breaker_half_open: "Circuit breaker testing recovery",
      circuit_breaker_closed: "Circuit breaker closed (connection recovered)",
      circuit_breaker_rejected: "Request rejected by circuit breaker",
    };

    try {
      await this.connectionsService.createConnectionLog(
        connectionId,
        action,
        statusMap[action],
        messageMap[action],
        metadata,
      );
    } catch (error) {
      // Logging is non-critical
      this.logger.warn(`Failed to log circuit breaker event: ${error.message}`);
    }
  }

  /**
   * Log when a request is rejected by the circuit breaker
   */
  async logRejection(connectionId: string): Promise<void> {
    const state = this.circuits.get(connectionId);

    await this.logCircuitBreakerEvent(
      connectionId,
      "circuit_breaker_rejected",
      {
        state: state?.state,
        nextRetryAt: state?.nextRetryAt?.toISOString(),
      },
    );
  }
}
