import { Injectable, Inject, Logger } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";

/**
 * Cache TTL constants
 */
export const CACHE_TTL = {
  /** Historical data (before today) - data won't change */
  HISTORICAL: 7 * 24 * 60 * 60 * 1000, // 7 days in ms

  /** Today's data - may still change */
  CURRENT: 15 * 60 * 1000, // 15 minutes in ms

  /** Summary data (aggregated totals) */
  SUMMARY: 15 * 60 * 1000, // 15 minutes in ms

  /** Expand/detail data */
  EXPAND: 30 * 60 * 1000, // 30 minutes in ms
} as const;

/**
 * Cache key prefixes
 */
export const CACHE_PREFIX = {
  AD_MANAGER_SUMMARY: "revenue:am:summary",
  AD_MANAGER_REPORT: "revenue:am:report",
  AD_MANAGER_EXPAND: "revenue:am:expand",
  ADSENSE_SUMMARY: "revenue:as:summary",
  ADSENSE_REPORT: "revenue:as:report",
  ADSENSE_EXPAND: "revenue:as:expand",
} as const;

/**
 * Revenue Cache Service
 *
 * Provides intelligent caching for revenue data with:
 * - Dynamic TTL based on date range (historical vs current)
 * - Structured cache keys for easy invalidation
 * - Pattern-based cache invalidation support
 */
@Injectable()
export class RevenueCacheService {
  private readonly logger = new Logger(RevenueCacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Calculate appropriate TTL based on the date range
   *
   * - If endDate is before today: historical data (long TTL)
   * - If endDate includes today: current data (short TTL)
   *
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   * @returns TTL in milliseconds
   */
  calculateTTL(startDate: string, endDate: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    // If end date is strictly before today, data is historical (won't change)
    if (end < today) {
      this.logger.debug(
        `Historical data detected (${startDate} to ${endDate}), using long TTL`,
      );
      return CACHE_TTL.HISTORICAL;
    }

    // Data includes today, use short TTL
    this.logger.debug(
      `Current data detected (${startDate} to ${endDate}), using short TTL`,
    );
    return CACHE_TTL.CURRENT;
  }

  /**
   * Build cache key for summary data
   */
  buildSummaryKey(
    source: "ad_manager" | "adsense",
    connectionId: string,
    sourceId: string, // networkId or accountId
    startDate: string,
    endDate: string,
  ): string {
    const prefix =
      source === "ad_manager"
        ? CACHE_PREFIX.AD_MANAGER_SUMMARY
        : CACHE_PREFIX.ADSENSE_SUMMARY;

    return `${prefix}:${connectionId}:${sourceId}:${startDate}:${endDate}`;
  }

  /**
   * Build cache key for full report data
   */
  buildReportKey(
    source: "ad_manager" | "adsense",
    connectionId: string,
    sourceId: string,
    startDate: string,
    endDate: string,
    groupBy: string,
  ): string {
    const prefix =
      source === "ad_manager"
        ? CACHE_PREFIX.AD_MANAGER_REPORT
        : CACHE_PREFIX.ADSENSE_REPORT;

    return `${prefix}:${connectionId}:${sourceId}:${startDate}:${endDate}:${groupBy}`;
  }

  /**
   * Build cache key for expand data
   */
  buildExpandKey(
    source: "ad_manager" | "adsense",
    connectionId: string,
    sourceId: string,
    startDate: string,
    endDate: string,
    primaryGroupBy: string,
    subGroupBy: string,
    parentKey: string,
  ): string {
    const prefix =
      source === "ad_manager"
        ? CACHE_PREFIX.AD_MANAGER_EXPAND
        : CACHE_PREFIX.ADSENSE_EXPAND;

    // Use base64 for parentKey to avoid special characters in cache key
    const encodedParentKey = Buffer.from(parentKey).toString("base64url");

    return `${prefix}:${connectionId}:${sourceId}:${startDate}:${endDate}:${primaryGroupBy}:${subGroupBy}:${encodedParentKey}`;
  }

  /**
   * Get cached data
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const cached = await this.cacheManager.get<T>(key);
      if (cached) {
        this.logger.debug(`Cache HIT: ${key}`);
      } else {
        this.logger.debug(`Cache MISS: ${key}`);
      }
      return cached;
    } catch (error) {
      this.logger.warn(`Cache get error for ${key}: ${error.message}`);
      return undefined;
    }
  }

  /**
   * Set cached data with intelligent TTL
   */
  async set<T>(
    key: string,
    value: T,
    startDate: string,
    endDate: string,
  ): Promise<void> {
    try {
      const ttl = this.calculateTTL(startDate, endDate);
      await this.cacheManager.set(key, value, ttl);

      const ttlHours = Math.round(ttl / (60 * 60 * 1000));
      this.logger.debug(`Cache SET: ${key} (TTL: ${ttlHours}h)`);
    } catch (error) {
      this.logger.warn(`Cache set error for ${key}: ${error.message}`);
    }
  }

  /**
   * Set cached data with explicit TTL
   */
  async setWithTTL<T>(key: string, value: T, ttlMs: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttlMs);
      this.logger.debug(`Cache SET: ${key} (TTL: ${ttlMs}ms)`);
    } catch (error) {
      this.logger.warn(`Cache set error for ${key}: ${error.message}`);
    }
  }

  /**
   * Delete a specific cache entry
   */
  async delete(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DELETE: ${key}`);
    } catch (error) {
      this.logger.warn(`Cache delete error for ${key}: ${error.message}`);
    }
  }

  /**
   * Invalidate all cache entries for a specific connection and source
   *
   * Note: This requires Redis SCAN/KEYS which may not be available
   * with all cache stores. Falls back to no-op for in-memory cache.
   */
  async invalidateByConnection(
    source: "ad_manager" | "adsense",
    connectionId: string,
    sourceId: string,
  ): Promise<number> {
    const pattern = `revenue:${source === "ad_manager" ? "am" : "as"}:*:${connectionId}:${sourceId}:*`;

    try {
      // Try to access Redis client directly for pattern deletion
      const store = (this.cacheManager as any).store;

      if (store && typeof store.keys === "function") {
        const keys = await store.keys(pattern);
        if (keys && keys.length > 0) {
          await Promise.all(keys.map((key: string) => this.delete(key)));
          this.logger.log(
            `Invalidated ${keys.length} cache entries for pattern: ${pattern}`,
          );
          return keys.length;
        }
      }

      this.logger.debug(
        `Pattern invalidation not supported, skipping: ${pattern}`,
      );
      return 0;
    } catch (error) {
      this.logger.warn(
        `Cache invalidation error for ${pattern}: ${error.message}`,
      );
      return 0;
    }
  }

  /**
   * Get cache statistics (if available)
   */
  async getStats(): Promise<{
    type: "redis" | "memory";
    connected: boolean;
    keys?: number;
  }> {
    try {
      const store = (this.cacheManager as any).store;

      // Check if it's a Keyv store (Redis)
      if (store && store.opts?.store) {
        return {
          type: "redis",
          connected: true,
        };
      }

      // In-memory cache
      return {
        type: "memory",
        connected: true,
      };
    } catch {
      return {
        type: "memory",
        connected: false,
      };
    }
  }
}
