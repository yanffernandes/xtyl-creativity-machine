/**
 * Ads Aggregator Service
 * Handles filtering, sorting, pagination, and summary calculation for unified ad objects
 */

import { Injectable, Logger } from "@nestjs/common";
import {
  UnifiedAdObject,
  UnifiedStatus,
  AdsSummary,
  AdsPagination,
  AdsOrderBy,
} from "../types/unified-ad-object";
import type { MetricFilterDto, FilterableMetric } from "../dto/ads-search.dto";

// ============================================
// Filter Types
// ============================================

export interface AdsFilters {
  status?: UnifiedStatus | "all";
  nameContains?: string;
  objective?: string;
  platform?: "google" | "meta";
  /** Advanced metric filters (e.g., impressions > 1000) */
  metricFilters?: MetricFilterDto[];
  /** Filter by specific campaign IDs (e.g., AlvoBot campaigns) */
  campaignIds?: string[];
  /** Filter by specific ad account IDs (e.g., Meta ad accounts within a connection) */
  accountIds?: string[];
}

export interface AdsSorting {
  orderBy?: AdsOrderBy;
  sortOrder?: "asc" | "desc";
}

export interface AdsPaginationParams {
  page?: number;
  limit?: number;
}

export interface AggregatedResult {
  items: UnifiedAdObject[];
  summary: AdsSummary;
  pagination: AdsPagination;
}

// ============================================
// Aggregator Service
// ============================================

@Injectable()
export class AdsAggregatorService {
  private readonly logger = new Logger(AdsAggregatorService.name);

  /**
   * Main aggregation method - applies filters, sorting, and pagination
   */
  aggregate(
    items: UnifiedAdObject[],
    filters: AdsFilters,
    sorting: AdsSorting,
    pagination: AdsPaginationParams,
  ): AggregatedResult {
    // 1. Apply filters
    let filteredItems = this.applyFilters(items, filters);

    // 2. Calculate summary (before pagination, after filters)
    const summary = this.calculateSummary(filteredItems);

    // 3. Apply sorting
    filteredItems = this.applySorting(filteredItems, sorting);

    // 4. Apply pagination
    const { paginatedItems, paginationInfo } = this.applyPagination(
      filteredItems,
      pagination,
    );

    return {
      items: paginatedItems,
      summary,
      pagination: paginationInfo,
    };
  }

  // ============================================
  // Filtering
  // ============================================

  /**
   * Apply all filters to the items
   */
  private applyFilters(
    items: UnifiedAdObject[],
    filters: AdsFilters,
  ): UnifiedAdObject[] {
    // Check if any filter is active - avoid unnecessary array allocation
    const hasStatusFilter = filters.status && filters.status !== "all";
    const hasNameFilter = !!filters.nameContains;
    const hasObjectiveFilter = !!filters.objective;
    const hasPlatformFilter = !!filters.platform;
    const hasCampaignIdFilter =
      filters.campaignIds && filters.campaignIds.length > 0;
    const hasAccountIdFilter =
      filters.accountIds && filters.accountIds.length > 0;
    const hasMetricFilters =
      filters.metricFilters && filters.metricFilters.length > 0;

    // No filters active - return input directly (zero-copy)
    if (
      !hasStatusFilter &&
      !hasNameFilter &&
      !hasObjectiveFilter &&
      !hasPlatformFilter &&
      !hasCampaignIdFilter &&
      !hasAccountIdFilter &&
      !hasMetricFilters
    ) {
      return items;
    }

    // Pre-compute filter values once (avoid per-item overhead)
    const searchTerm = hasNameFilter
      ? filters.nameContains!.toLowerCase()
      : "";
    const objectiveTerm = hasObjectiveFilter
      ? filters.objective!.toLowerCase()
      : "";
    const campaignIdSet = hasCampaignIdFilter
      ? new Set(filters.campaignIds)
      : null;
    const accountIdSet = hasAccountIdFilter
      ? new Set(filters.accountIds)
      : null;

    // Single-pass filter (instead of chaining multiple .filter() calls)
    let result = items.filter((item) => {
      if (hasStatusFilter && item.status !== filters.status) return false;
      if (hasNameFilter && !item.name.toLowerCase().includes(searchTerm))
        return false;
      if (
        hasObjectiveFilter &&
        (!item.objective ||
          !item.objective.toLowerCase().includes(objectiveTerm))
      )
        return false;
      if (hasPlatformFilter && item.platform !== filters.platform) return false;
      if (campaignIdSet && !campaignIdSet.has(item.id)) return false;
      if (accountIdSet && !accountIdSet.has(item.accountId)) return false;
      return true;
    });

    // Apply advanced metric filters (separate pass - complex logic)
    if (hasMetricFilters) {
      result = this.applyMetricFilters(result, filters.metricFilters!);
    }

    return result;
  }

  /**
   * Apply metric filters (e.g., impressions > 1000, cost < 100)
   */
  private applyMetricFilters(
    items: UnifiedAdObject[],
    metricFilters: MetricFilterDto[],
  ): UnifiedAdObject[] {
    return items.filter((item) => {
      // All filters must pass (AND logic)
      return metricFilters.every((filter) => {
        const value = this.getMetricValue(item, filter.metric);
        if (value === undefined || value === null) return false;

        switch (filter.operator) {
          case "gt":
            return value > filter.value;
          case "lt":
            return value < filter.value;
          case "eq":
            return value === filter.value;
          case "between":
            if (filter.value2 === undefined) return false;
            return value >= filter.value && value <= filter.value2;
          default:
            return true;
        }
      });
    });
  }

  /**
   * Get metric value from an item
   */
  private getMetricValue(
    item: UnifiedAdObject,
    metric: FilterableMetric,
  ): number | undefined {
    switch (metric) {
      case "impressions":
        return item.impressions;
      case "clicks":
        return item.clicks;
      case "conversions":
        return item.conversions;
      case "cost":
        return item.cost;
      case "cpc":
        return item.cpc;
      case "cpa":
        return item.cpa;
      case "ctr":
        return item.ctr;
      case "conversionRate":
        // Calculate conversion rate if not directly available
        return item.clicks > 0 ? (item.conversions / item.clicks) * 100 : 0;
      case "roas":
        return item.roas;
      default:
        return undefined;
    }
  }

  // ============================================
  // Sorting
  // ============================================

  /**
   * Apply sorting to the items
   */
  private applySorting(
    items: UnifiedAdObject[],
    sorting: AdsSorting,
  ): UnifiedAdObject[] {
    if (!sorting.orderBy) {
      // Default: sort by cost descending (highest spenders first)
      return [...items].sort((a, b) => b.cost - a.cost);
    }

    const { orderBy, sortOrder = "desc" } = sorting;
    const direction = sortOrder === "asc" ? 1 : -1;

    return [...items].sort((a, b) => {
      const aVal = this.getSortValue(a, orderBy);
      const bVal = this.getSortValue(b, orderBy);

      // Handle string comparison
      if (typeof aVal === "string" && typeof bVal === "string") {
        return aVal.localeCompare(bVal) * direction;
      }

      // Handle numeric comparison (treat undefined as 0)
      const aNum = typeof aVal === "number" ? aVal : 0;
      const bNum = typeof bVal === "number" ? bVal : 0;
      return (aNum - bNum) * direction;
    });
  }

  /**
   * Get the value to sort by from an item
   */
  private getSortValue(
    item: UnifiedAdObject,
    orderBy: AdsOrderBy,
  ): string | number | undefined {
    switch (orderBy) {
      case "name":
        return item.name;
      case "cost":
        return item.cost;
      case "impressions":
        return item.impressions;
      case "clicks":
        return item.clicks;
      case "conversions":
        return item.conversions;
      case "ctr":
        return item.ctr;
      case "cpa":
        return item.cpa;
      case "roas":
        return item.roas;
      case "budget":
        return item.budget;
      case "cpc":
        return item.cpc;
      case "reach":
        return item.reach;
      case "frequency":
        return item.frequency;
      default:
        return item.cost;
    }
  }

  // ============================================
  // Pagination
  // ============================================

  /**
   * Apply pagination to the items
   */
  private applyPagination(
    items: UnifiedAdObject[],
    pagination: AdsPaginationParams,
  ): { paginatedItems: UnifiedAdObject[]; paginationInfo: AdsPagination } {
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(100, Math.max(1, pagination.limit || 20));
    const total = items.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    const paginatedItems = items.slice(offset, offset + limit);

    return {
      paginatedItems,
      paginationInfo: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  // ============================================
  // Summary Calculation
  // ============================================

  /**
   * Calculate summary statistics from items
   */
  calculateSummary(items: UnifiedAdObject[]): AdsSummary {
    const summary: AdsSummary = {
      totalItems: items.length,
      activeItems: 0,
      pausedItems: 0,
      removedItems: 0,
      totalImpressions: 0,
      totalClicks: 0,
      totalCost: 0,
      totalConversions: 0,
      avgCtr: 0,
      avgCpa: 0,
      avgRoas: undefined,
      totalReach: undefined,
    };

    let hasReach = false;
    let hasRoas = false;
    let totalReach = 0;
    let totalRoas = 0;
    let roasCount = 0;

    for (const item of items) {
      // Status counts
      switch (item.status) {
        case "ENABLED":
          summary.activeItems++;
          break;
        case "PAUSED":
          summary.pausedItems++;
          break;
        case "REMOVED":
          summary.removedItems++;
          break;
      }

      // Metric totals
      summary.totalImpressions += item.impressions || 0;
      summary.totalClicks += item.clicks || 0;
      summary.totalCost += item.cost || 0;
      summary.totalConversions += item.conversions || 0;

      // Reach (Meta-specific)
      if (item.reach !== undefined) {
        hasReach = true;
        totalReach += item.reach;
      }

      // ROAS
      if (item.roas !== undefined && item.roas > 0) {
        hasRoas = true;
        totalRoas += item.roas;
        roasCount++;
      }
    }

    // Calculate averages
    if (summary.totalImpressions > 0) {
      summary.avgCtr = summary.totalClicks / summary.totalImpressions;
    }

    if (summary.totalConversions > 0) {
      summary.avgCpa = summary.totalCost / summary.totalConversions;
    }

    if (hasReach) {
      summary.totalReach = totalReach;
    }

    if (hasRoas && roasCount > 0) {
      summary.avgRoas = totalRoas / roasCount;
    }

    return summary;
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Merge items from multiple sources, handling duplicates by ID
   * Note: In a unified system, Google and Meta IDs won't conflict
   * because they're from different platforms
   */
  mergeItems(sources: UnifiedAdObject[][]): UnifiedAdObject[] {
    const merged: UnifiedAdObject[] = [];
    const seen = new Set<string>();

    for (const sourceItems of sources) {
      for (const item of sourceItems) {
        // Create a composite key from platform and ID to avoid conflicts
        const key = `${item.platform}:${item.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(item);
        }
      }
    }

    return merged;
  }

  /**
   * Filter items by parent ID (for expand/drill-down operations)
   */
  filterByParent(
    items: UnifiedAdObject[],
    parentId: string,
  ): UnifiedAdObject[] {
    return items.filter((item) => item.parentId === parentId);
  }

  /**
   * Group items by a field (useful for reporting)
   */
  groupBy<K extends keyof UnifiedAdObject>(
    items: UnifiedAdObject[],
    field: K,
  ): Map<UnifiedAdObject[K], UnifiedAdObject[]> {
    const groups = new Map<UnifiedAdObject[K], UnifiedAdObject[]>();

    for (const item of items) {
      const key = item[field];
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    }

    return groups;
  }

  /**
   * Get top N items by a metric
   */
  getTopByMetric(
    items: UnifiedAdObject[],
    metric: AdsOrderBy,
    n: number,
  ): UnifiedAdObject[] {
    return this.applySorting(items, {
      orderBy: metric,
      sortOrder: "desc",
    }).slice(0, n);
  }

  /**
   * Calculate performance metrics for a subset of items
   */
  calculatePerformanceMetrics(items: UnifiedAdObject[]): {
    totalSpend: number;
    weightedCtr: number;
    weightedCpa: number;
    totalConversions: number;
    costPerMille: number;
  } {
    const totalSpend = items.reduce((sum, item) => sum + (item.cost || 0), 0);
    const totalImpressions = items.reduce(
      (sum, item) => sum + (item.impressions || 0),
      0,
    );
    const totalClicks = items.reduce(
      (sum, item) => sum + (item.clicks || 0),
      0,
    );
    const totalConversions = items.reduce(
      (sum, item) => sum + (item.conversions || 0),
      0,
    );

    return {
      totalSpend,
      weightedCtr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
      weightedCpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
      totalConversions,
      costPerMille:
        totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
    };
  }
}
