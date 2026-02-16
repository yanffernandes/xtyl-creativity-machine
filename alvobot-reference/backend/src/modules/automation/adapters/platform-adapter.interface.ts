import {
  EntityLevel,
  FilterGroup,
  AttributionConfig,
  ActionType,
} from '../dto';

// ============================================================================
// PLATFORM ENTITY — Normalized entity from any ad platform
// ============================================================================

/**
 * Normalized representation of an ad platform entity (campaign, adset, ad group, ad, keyword).
 * Both Google and Meta adapters transform their native data into this common format.
 */
export interface PlatformEntity {
  /** Platform-native entity ID (e.g., Google campaign resource name or Meta campaign ID) */
  id: string;

  /** Human-readable entity name */
  name: string;

  /** Source platform */
  platform: 'meta' | 'google';

  /** Entity hierarchy level */
  level: EntityLevel;

  /** Normalized status string (ENABLED/PAUSED for Google, ACTIVE/PAUSED for Meta) */
  status: string;

  /**
   * Metrics keyed by "metric_period" (e.g., "spend_last_7d", "clicks_today").
   * Also includes period-less keys as fallbacks (e.g., "spend", "clicks").
   */
  metrics: Record<string, number>;

  /** Current daily or lifetime budget (in currency units, not micros/cents) */
  budget?: number;

  /** Budget type: daily or lifetime */
  budgetType?: 'daily' | 'lifetime';

  /** Budget resource name/ID (Google-specific, needed for budget updates) */
  budgetId?: string;

  /** Current bid value (in currency units) */
  bid?: number;

  /** Bid/bidding strategy name */
  bidStrategy?: string;

  /** Entity creation timestamp (ISO string) */
  createdTime?: string;

  /** Connection ID this entity belongs to */
  connectionId: string;

  /** Ad account ID (Meta) or customer ID (Google) */
  adAccountId?: string;

  /** Login customer ID (Google MCC hierarchy) */
  loginCustomerId?: string;

  /**
   * Parent-level data for cross-level filtering.
   * E.g., when operating at ad level, includes campaign and adset/ad_group data
   * so conditions can reference parent metrics.
   */
  parentData?: {
    campaign?: Record<string, unknown>;
    adset?: Record<string, unknown>;
    ad_group?: Record<string, unknown>;
  };

  /** Raw API response data (for debugging and future expansion) */
  rawData: unknown;
}

// ============================================================================
// ACTION TYPES
// ============================================================================

/**
 * Configuration for an action to execute on an entity.
 */
export interface ActionConfig {
  /** The type of action to perform */
  action: ActionType;

  /** Action-specific parameters (budget amount, percentage, bid value, etc.) */
  params: Record<string, unknown>;
}

/**
 * Result of executing an action on an entity.
 */
export interface ActionResult {
  /** Whether the action succeeded */
  success: boolean;

  /** The action that was attempted */
  action: ActionType;

  /** Value before the action (budget, bid, status, etc.) */
  previousValue?: unknown;

  /** Value after the action */
  newValue?: unknown;

  /** Error message if the action failed */
  error?: string;

  /** Whether the user should be notified about this result */
  requiresNotification?: boolean;
}

// ============================================================================
// CONNECTION HEALTH
// ============================================================================

/**
 * Health check result for a platform connection.
 */
export interface ConnectionHealth {
  /** Whether the connection is healthy and can accept requests */
  isHealthy: boolean;

  /** The connection ID that was checked */
  connectionId: string;

  /** Last error message if the connection is unhealthy */
  lastError?: string;
}

// ============================================================================
// PLATFORM ADAPTER INTERFACE
// ============================================================================

/**
 * Abstract adapter interface for ad platform operations.
 *
 * Each platform (Google, Meta) implements this interface to normalize
 * entity fetching and action execution into a common format.
 *
 * The automation engine uses this interface exclusively — it never
 * calls platform-specific services directly.
 */
export interface PlatformAutomationAdapter {
  /** The platform this adapter handles */
  readonly platform: 'google' | 'meta';

  /**
   * Fetch entities from the platform matching the given criteria.
   *
   * @param connectionId - The connection to use for API access
   * @param adAccountIds - Ad account IDs to query (customer IDs for Google)
   * @param level - Entity hierarchy level to fetch
   * @param filters - Scope filters to apply (pushed to API when possible)
   * @param periods - Time periods for metric data (e.g., ["last_7d", "today"])
   * @param attribution - Attribution window configuration
   * @param googleCampaignType - Google campaign type filter (search, display, etc.)
   * @returns Normalized PlatformEntity array
   */
  fetchEntities(
    connectionId: string,
    adAccountIds: string[],
    level: EntityLevel,
    filters: FilterGroup[],
    periods: string[],
    attribution?: AttributionConfig,
    googleCampaignType?: string,
  ): Promise<PlatformEntity[]>;

  /**
   * Execute an action on a specific entity.
   *
   * @param connectionId - The connection to use for API access
   * @param entity - The normalized entity to act upon
   * @param action - The action configuration (type + params)
   * @param userId - The user triggering the action (for audit logging)
   * @returns Result of the action execution
   */
  executeAction(
    connectionId: string,
    entity: PlatformEntity,
    action: ActionConfig,
    userId: string,
  ): Promise<ActionResult>;

  /**
   * Check the health of a platform connection.
   * Verifies the circuit breaker state and optionally tests API connectivity.
   *
   * @param connectionId - The connection to check
   * @returns Health check result
   */
  checkConnection(connectionId: string): Promise<ConnectionHealth>;

  /**
   * Extract a specific metric value from an entity for a given period.
   *
   * @param entity - The normalized entity
   * @param metric - Metric name (e.g., "spend", "clicks", "ctr")
   * @param period - Time period (e.g., "last_7d", "today")
   * @returns The metric value, or 0 if not found
   */
  getMetricValue(
    entity: PlatformEntity,
    metric: string,
    period: string,
  ): number;
}

/**
 * Injection token for platform adapters.
 * Used with NestJS multi-provider pattern to register both adapters.
 */
export const PLATFORM_ADAPTER_TOKEN = 'PLATFORM_ADAPTER';
