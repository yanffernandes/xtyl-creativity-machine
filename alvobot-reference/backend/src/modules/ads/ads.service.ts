/**
 * Ads Service
 * Main orchestration service for the unified ads search API
 * Handles parallel fetching from Google and Meta, normalization, and aggregation
 */

import { Injectable, Logger } from "@nestjs/common";
import pLimit from "p-limit";
import { GoogleDashboardService } from "../google/services/google-dashboard.service";
import { MetaDashboardService } from "../meta/services/meta-dashboard.service";
import { AdsNormalizerService } from "./services/ads-normalizer.service";
import {
  AdsAggregatorService,
  AdsFilters,
  AdsSorting,
  AdsPaginationParams,
} from "./services/ads-aggregator.service";
import { AlvobotCampaignService } from "./services/alvobot-campaign.service";
import {
  AdsSearchRequestDto,
  AdsSourceDto,
  FIELD_GROUPS,
} from "./dto/ads-search.dto";
import { AdsExpandRequestDto } from "./dto/ads-expand.dto";
import {
  UnifiedAdObject,
  AdsSearchResponse,
  AdsExpandResponse,
  AdsActionResponse,
  FailedSource,
  AdsLevel,
} from "./types/unified-ad-object";
import { DashboardPeriod } from "../google/dto/campaign-metrics.dto";

// Concurrency limits for API calls to avoid rate limiting
const GOOGLE_CONCURRENCY_LIMIT = 5; // Google Ads API: ~10 requests/second per customer ID
const META_CONCURRENCY_LIMIT = 5; // Meta API: 200 requests/hour/user

// Per-source timeout to prevent a single slow source from blocking the entire request
const SOURCE_TIMEOUT_MS = 30_000; // 30 seconds per source

// ============================================
// Service
// ============================================

@Injectable()
export class AdsService {
  private readonly logger = new Logger(AdsService.name);

  constructor(
    private readonly googleDashboardService: GoogleDashboardService,
    private readonly metaDashboardService: MetaDashboardService,
    private readonly normalizerService: AdsNormalizerService,
    private readonly aggregatorService: AdsAggregatorService,
    private readonly alvobotCampaignService: AlvobotCampaignService,
  ) {}

  // ============================================
  // Search
  // ============================================

  /**
   * Unified search across Google and Meta ad platforms
   */
  async search(
    dto: AdsSearchRequestDto,
    userId: string,
  ): Promise<AdsSearchResponse> {
    const startTime = Date.now();
    this.logger.log(
      `Search request: level=${dto.level}, sources=${dto.sources.length}`,
    );

    // Separate sources by platform
    const googleSources = dto.sources.filter((s) => s.platform === "google");
    const metaSources = dto.sources.filter((s) => s.platform === "meta");

    const failedSources: FailedSource[] = [];
    let sourcesSucceeded = 0;

    // Create concurrency limiters to avoid rate limiting
    const googleLimit = pLimit(GOOGLE_CONCURRENCY_LIMIT);
    const metaLimit = pLimit(META_CONCURRENCY_LIMIT);

    // Helper: wrap a fetch with a per-source timeout
    const withTimeout = <T>(
      promise: Promise<T>,
      timeoutMs: number,
      label: string,
    ): Promise<T> => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(
            new Error(`Source ${label} timed out after ${timeoutMs / 1000}s`),
          );
        }, timeoutMs);
        promise.then(
          (val) => {
            clearTimeout(timer);
            resolve(val);
          },
          (err) => {
            clearTimeout(timer);
            reject(err);
          },
        );
      });
    };

    // Build per-source fetch promises that return their items (avoids push-spread on large arrays)
    type SourceResult = {
      items: UnifiedAdObject[];
      platform: "google" | "meta";
      connectionId: string;
      accountId?: string;
    };

    const sourceFetches: Promise<SourceResult | null>[] = [];

    // Google fetches with concurrency limit + per-source timeout
    for (const source of googleSources) {
      sourceFetches.push(
        googleLimit(() =>
          withTimeout(
            this.fetchFromGoogle(dto, source, userId),
            SOURCE_TIMEOUT_MS,
            `google:${source.connectionId}`,
          )
            .then((items): SourceResult => {
              sourcesSucceeded++;
              return {
                items,
                platform: "google",
                connectionId: source.connectionId,
                accountId: source.customerId,
              };
            })
            .catch((error): null => {
              this.logger.error(
                `Google fetch failed for ${source.connectionId}: ${error.message}`,
              );
              failedSources.push({
                platform: "google",
                connectionId: source.connectionId,
                accountId: source.customerId,
                error: error.message,
                retryable: this.isRetryableError(error),
              });
              return null;
            }),
        ),
      );
    }

    // Meta fetches with concurrency limit + per-source timeout
    for (const source of metaSources) {
      sourceFetches.push(
        metaLimit(() =>
          withTimeout(
            this.fetchFromMeta(dto, source, userId),
            SOURCE_TIMEOUT_MS,
            `meta:${source.connectionId}`,
          )
            .then((items): SourceResult => {
              sourcesSucceeded++;
              return {
                items,
                platform: "meta",
                connectionId: source.connectionId,
                accountId: source.adAccountId,
              };
            })
            .catch((error): null => {
              this.logger.error(
                `Meta fetch failed for ${source.connectionId}: ${error.message}`,
              );
              failedSources.push({
                platform: "meta",
                connectionId: source.connectionId,
                accountId: source.adAccountId,
                error: error.message,
                retryable: this.isRetryableError(error),
              });
              return null;
            }),
        ),
      );
    }

    // Run AlvoBot ID resolution IN PARALLEL with platform fetches
    const alvobotIdsPromise = dto.alvobotOnly
      ? this.alvobotCampaignService
          .getAlvobotCampaignIds(dto.workspaceId)
          .then((idSet) => Array.from(idSet))
          .catch((err) => {
            this.logger.error(`Failed to resolve AlvoBot IDs: ${err.message}`);
            return undefined;
          })
      : Promise.resolve(undefined);

    // Wait for all fetches AND AlvoBot IDs to complete in parallel
    const [sourceResults, alvobotCampaignIds] = await Promise.all([
      Promise.all(sourceFetches),
      alvobotIdsPromise,
    ]);

    // Collect items safely (Array.concat avoids push-spread stack overflow on 50k+ items)
    const allItems = sourceResults.reduce<UnifiedAdObject[]>((acc, result) => {
      if (result?.items) {
        // Use for-loop instead of spread for large arrays (avoids call stack overflow)
        for (let i = 0; i < result.items.length; i++) {
          acc.push(result.items[i]);
        }
      }
      return acc;
    }, []);

    this.logger.log(
      `Fetched ${allItems.length} items from ${sourcesSucceeded} sources in ${Date.now() - startTime}ms`,
    );

    if (dto.alvobotOnly && alvobotCampaignIds) {
      this.logger.debug(
        `AlvoBot filter active: ${alvobotCampaignIds.length} campaign IDs resolved`,
      );
      this.logger.debug(
        `AlvoBot IDs (first 5): ${alvobotCampaignIds.slice(0, 5).join(", ")}`,
      );
      this.logger.debug(
        `Fetched campaign IDs (first 5): ${allItems
          .slice(0, 5)
          .map((i) => `${i.id} [${i.platform}]`)
          .join(", ")}`,
      );
    }

    // Build filters from request
    const filters: AdsFilters = {
      status: dto.status,
      nameContains: dto.nameContains,
      objective: dto.objective,
      metricFilters: dto.metricFilters,
      campaignIds: alvobotCampaignIds,
      accountIds: dto.accountIds,
    };

    // Build sorting from request
    const sorting: AdsSorting = {
      orderBy: dto.orderBy,
      sortOrder: dto.sortOrder,
    };

    // Build pagination from request
    const pagination: AdsPaginationParams = {
      page: dto.page,
      limit: dto.limit,
    };

    // Aggregate: filter, sort, paginate
    const aggregated = this.aggregatorService.aggregate(
      allItems,
      filters,
      sorting,
      pagination,
    );

    // Apply field selection (projection pushdown)
    const fields = this.resolveFields(dto.fieldGroup, dto.fields);
    const projectedItems = this.normalizerService.filterFieldsBatch(
      aggregated.items,
      fields,
    );

    const response: AdsSearchResponse = {
      success: sourcesSucceeded > 0, // false only if ALL sources failed
      items: projectedItems,
      summary: aggregated.summary,
      pagination: aggregated.pagination,
      metadata: {
        level: dto.level,
        dateRange: {
          start: dto.startDate,
          end: dto.endDate,
        },
        sourcesQueried: dto.sources.length,
        sourcesSucceeded,
        cachedAt: null,
      },
      failedSources: failedSources.length > 0 ? failedSources : undefined,
    };

    return response;
  }

  /**
   * Fetch campaigns from Google with filter push-down to GAQL
   * Metric filters, name filters, and sorting are pushed to the Google Ads API
   * for server-side execution, significantly reducing data transfer and processing time
   */
  private async fetchFromGoogle(
    dto: AdsSearchRequestDto,
    source: AdsSourceDto,
    userId: string,
  ): Promise<UnifiedAdObject[]> {
    // Use the filter-enabled method for campaign-level queries with filters
    // This pushes WHERE/ORDER BY/LIMIT to GAQL for better performance
    const hasFilters =
      dto.metricFilters?.length ||
      dto.nameContains ||
      dto.orderBy ||
      (dto.status && dto.status !== "all");

    if (dto.level === "campaign" && hasFilters) {
      // Use filter push-down method for campaigns
      const result = await this.googleDashboardService.getCampaignsWithFilters(
        userId,
        source.connectionId,
        dto.startDate,
        dto.endDate,
        {
          metricFilters: dto.metricFilters?.map((f) => ({
            metric: f.metric as
              | "impressions"
              | "clicks"
              | "conversions"
              | "cost"
              | "cpc"
              | "cpa"
              | "ctr"
              | "conversionRate"
              | "roas",
            operator: f.operator,
            value: f.value,
            value2: f.value2,
          })),
          nameContains: dto.nameContains,
          statusFilter:
            dto.status === "all"
              ? undefined
              : (dto.status as "ENABLED" | "PAUSED"),
          orderBy: dto.orderBy as
            | "cost"
            | "impressions"
            | "clicks"
            | "conversions"
            | "ctr"
            | "cpa"
            | "roas"
            | "name"
            | undefined,
          sortOrder: dto.sortOrder,
          limit: dto.limit ? dto.limit * 2 : undefined, // Fetch extra for cross-platform merging
        },
        dto.forceRefresh,
      );

      // Normalize campaigns
      return this.normalizerService.normalizeGoogleCampaigns(
        result.campaigns as any[],
        source.connectionId,
        result.connections?.[0]?.name || "Google Ads",
        source.customerId || "",
        source.customerId || "",
      );
    }

    // Fallback to original method for non-filtered or non-campaign queries
    const period = DashboardPeriod.CUSTOM;

    const result = await this.googleDashboardService.getCampaigns(
      userId,
      source.connectionId,
      period,
      dto.startDate,
      dto.endDate,
      dto.status === "all" ? undefined : (dto.status as "ENABLED" | "PAUSED"),
      undefined, // sortBy - we'll sort after merging
      "desc",
      dto.forceRefresh,
      undefined, // workspaceId - sources already specify connection
    );

    if (dto.level === "campaign") {
      // Normalize campaigns
      return this.normalizerService.normalizeGoogleCampaigns(
        result.campaigns as any[],
        source.connectionId,
        result.connections?.[0]?.name || "Google Ads",
        source.customerId || "",
        source.customerId || "",
      );
    }

    // For adset or ad level, fetch hierarchy for all campaigns IN PARALLEL
    const connectionName = result.connections?.[0]?.name || "Google Ads";
    const hierarchyLimit = pLimit(GOOGLE_CONCURRENCY_LIMIT);

    const hierarchyResults = await Promise.allSettled(
      result.campaigns.map((campaign) =>
        hierarchyLimit(async () => {
          const hierarchy =
            await this.googleDashboardService.getCampaignHierarchy(
              userId,
              source.connectionId,
              campaign.id,
              source.customerId,
              source.loginCustomerId,
              dto.startDate,
              dto.endDate,
            );

          if (!hierarchy.success || !hierarchy.adGroups) return [];

          if (dto.level === "adset") {
            return this.normalizerService.normalizeGoogleAdGroups(
              hierarchy.adGroups.map((ag: any) => ({
                id: ag.id,
                name: ag.name,
                status: ag.status,
                type: ag.type,
                cpcBidMicros: ag.cpcBidMicros,
                cpcBid: ag.cpcBid,
                campaignId: campaign.id,
                campaignName: campaign.name,
                impressions: ag.metrics?.impressions || 0,
                clicks: ag.metrics?.clicks || 0,
                ctr: ag.metrics?.ctr || 0,
                cost: ag.metrics?.cost || 0,
                conversions: ag.metrics?.conversions || 0,
                cpc:
                  ag.metrics?.clicks > 0
                    ? (ag.metrics?.cost || 0) / ag.metrics.clicks
                    : 0,
                cpa:
                  ag.metrics?.conversions > 0
                    ? (ag.metrics?.cost || 0) / ag.metrics.conversions
                    : 0,
                maxCpc: ag.cpcBid,
                ads: ag.ads,
                metrics: ag.metrics,
              })),
              source.connectionId,
              connectionName,
              source.customerId || "",
              source.customerId || "",
            );
          } else if (dto.level === "ad") {
            // Flatten ads from all ad groups
            const items: UnifiedAdObject[] = [];
            for (const adGroup of hierarchy.adGroups) {
              if (adGroup.ads) {
                const normalizedAds = this.normalizerService.normalizeGoogleAds(
                  adGroup.ads.map((ad: any) => ({
                    id: ad.id,
                    name: ad.name || ad.headlines?.[0] || `Ad ${ad.id}`,
                    status: ad.status,
                    type: ad.type,
                    headlines: ad.headlines,
                    descriptions: ad.descriptions,
                    finalUrl: ad.finalUrls?.[0],
                    finalUrls: ad.finalUrls,
                    finalMobileUrls: ad.finalMobileUrls,
                    displayUrl: ad.displayUrl,
                    path1: ad.path1,
                    path2: ad.path2,
                    adGroupId: adGroup.id,
                    adGroupName: adGroup.name,
                    campaignId: campaign.id,
                    campaignName: campaign.name,
                    impressions: ad.metrics?.impressions || 0,
                    clicks: ad.metrics?.clicks || 0,
                    ctr: ad.metrics?.ctr || 0,
                    cost: ad.metrics?.cost || 0,
                    conversions: ad.metrics?.conversions || 0,
                    cpc:
                      ad.metrics?.clicks > 0
                        ? (ad.metrics?.cost || 0) / ad.metrics.clicks
                        : 0,
                    cpa:
                      ad.metrics?.conversions > 0
                        ? (ad.metrics?.cost || 0) / ad.metrics.conversions
                        : 0,
                  })),
                  source.connectionId,
                  connectionName,
                  source.customerId || "",
                  source.customerId || "",
                );
                items.push(...normalizedAds);
              }
            }
            return items;
          }
          return [];
        }),
      ),
    );

    const allItems: UnifiedAdObject[] = [];
    for (const result of hierarchyResults) {
      if (result.status === "fulfilled") {
        allItems.push(...result.value);
      }
    }

    return allItems;
  }

  /**
   * Fetch campaigns from Meta with filter push-down
   * Name, status, AND metric filters are pushed to Meta API for server-side filtering
   * This significantly reduces data transfer and improves performance
   */
  private async fetchFromMeta(
    dto: AdsSearchRequestDto,
    source: AdsSourceDto,
    userId: string,
  ): Promise<UnifiedAdObject[]> {
    // Use filter-enabled method when ad account ID is available
    // This enables per-account fetching with full push-down of filters,
    // ordering, and limit to the Meta Marketing API
    if (dto.level === "campaign" && source.adAccountId) {
      // Use filter push-down method for campaigns when ad account is specified
      try {
        const campaigns =
          await this.metaDashboardService.getCampaignsWithFilters(
            userId,
            source.connectionId,
            source.adAccountId,
            dto.startDate,
            dto.endDate,
            {
              metricFilters: dto.metricFilters?.map((f) => ({
                metric: f.metric as
                  | "impressions"
                  | "clicks"
                  | "conversions"
                  | "cost"
                  | "cpc"
                  | "cpa"
                  | "ctr"
                  | "conversionRate"
                  | "roas",
                operator: f.operator,
                value: f.value,
                value2: f.value2,
              })),
              nameContains: dto.nameContains,
              statusFilter:
                dto.status === "all"
                  ? undefined
                  : dto.status === "ENABLED"
                    ? "ACTIVE"
                    : (dto.status as "PAUSED"),
              objective: dto.objective,
              orderBy: dto.orderBy,
              sortOrder: dto.sortOrder,
              limit: dto.limit ? dto.limit * 2 : undefined, // Fetch extra for cross-platform merging
            },
            dto.forceRefresh,
          );

        // Normalize campaigns
        return campaigns.map((campaign: any) =>
          this.normalizerService.normalizeMetaCampaign(
            campaign,
            source.connectionId,
            campaign.connectionName || "Meta Ads",
            campaign.adAccountId || source.adAccountId || "",
            campaign.adAccountName || "",
          ),
        );
      } catch (error) {
        // Fall back to original method if filter push-down fails
        this.logger.warn(
          `Filter push-down failed for Meta, falling back: ${error.message}`,
        );
      }
    }

    // Fallback to original method for non-filtered queries or when ad account not specified
    const result = await this.metaDashboardService.getCampaigns(
      userId,
      source.connectionId,
      undefined, // period - we use custom dates
      dto.startDate,
      dto.endDate,
      dto.status === "all"
        ? undefined
        : dto.status === "ENABLED"
          ? "ACTIVE"
          : (dto.status as "PAUSED"),
      undefined, // sortBy
      "desc",
      dto.forceRefresh,
      undefined, // workspaceId
      1,
      1000, // Get all campaigns
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch Meta campaigns");
    }

    if (dto.level === "campaign") {
      // Normalize campaigns - each campaign has its own adAccountId
      return result.campaigns.map((campaign: any) =>
        this.normalizerService.normalizeMetaCampaign(
          campaign,
          source.connectionId,
          campaign.connectionName || "Meta Ads",
          campaign.adAccountId || source.adAccountId || "",
          campaign.adAccountName || "",
        ),
      );
    }

    // For adset or ad level, fetch hierarchy for all campaigns IN PARALLEL
    const metaHierarchyLimit = pLimit(META_CONCURRENCY_LIMIT);

    const hierarchyResults = await Promise.allSettled(
      result.campaigns.map((campaign: any) =>
        metaHierarchyLimit(async () => {
          const hierarchy =
            await this.metaDashboardService.getCampaignHierarchy(
              userId,
              source.connectionId,
              campaign.id,
              source.adAccountId,
              dto.startDate,
              dto.endDate,
            );

          if (!hierarchy.success || !hierarchy.adSets) return [];

          const adAccountId = campaign.adAccountId || source.adAccountId || "";
          const adAccountName = campaign.adAccountName || "";
          const connectionName = campaign.connectionName || "Meta Ads";

          if (dto.level === "adset") {
            return this.normalizerService.normalizeMetaAdSets(
              hierarchy.adSets.map((as: any) => ({
                ...as,
                campaignId: campaign.id,
                campaignName: campaign.name,
                connectionId: source.connectionId,
                connectionName,
                adAccountId,
                adAccountName,
              })),
              source.connectionId,
              connectionName,
              adAccountId,
              adAccountName,
            );
          } else if (dto.level === "ad") {
            // Fetch ads from all ad sets IN PARALLEL (avoids double-sequential loop)
            const adSetResults = await Promise.allSettled(
              hierarchy.adSets.map((adSet: any) =>
                metaHierarchyLimit(async () => {
                  const adsResult = await this.metaDashboardService.getAdSetAds(
                    userId,
                    source.connectionId,
                    adSet.id,
                    dto.startDate,
                    dto.endDate,
                  );

                  if (!adsResult.success || !adsResult.ads) return [];

                  return this.normalizerService.normalizeMetaAds(
                    adsResult.ads.map((ad: any) => ({
                      ...ad,
                      adSetId: adSet.id,
                      adSetName: adSet.name,
                      campaignId: campaign.id,
                      campaignName: campaign.name,
                      connectionId: source.connectionId,
                      connectionName,
                      adAccountId,
                      adAccountName,
                    })),
                    source.connectionId,
                    connectionName,
                    adAccountId,
                    adAccountName,
                  );
                }),
              ),
            );

            const items: UnifiedAdObject[] = [];
            for (const adSetResult of adSetResults) {
              if (adSetResult.status === "fulfilled") {
                items.push(...adSetResult.value);
              }
            }
            return items;
          }
          return [];
        }),
      ),
    );

    const allItems: UnifiedAdObject[] = [];
    for (const hResult of hierarchyResults) {
      if (hResult.status === "fulfilled") {
        allItems.push(...hResult.value);
      }
    }

    return allItems;
  }

  // ============================================
  // Expand (Drill-down)
  // ============================================

  /**
   * Expand a parent object to get its children
   * campaign -> adsets, adset -> ads
   */
  async expand(
    dto: AdsExpandRequestDto,
    userId: string,
  ): Promise<AdsExpandResponse> {
    this.logger.log(
      `Expand request: parentLevel=${dto.parentLevel}, parentId=${dto.parentId}, childLevel=${dto.childLevel}`,
    );

    // Determine which platform the parent belongs to
    // We need to identify the source that contains this parent
    const source = dto.sources[0]; // For now, assume single source

    if (!source) {
      return {
        success: false,
        items: [],
        metadata: {
          parentLevel: dto.parentLevel as AdsLevel,
          parentId: dto.parentId,
          childLevel: dto.childLevel as AdsLevel,
        },
        error: "No source provided",
      };
    }

    try {
      let items: UnifiedAdObject[] = [];

      if (source.platform === "google") {
        items = await this.expandGoogle(dto, source, userId);
      } else if (source.platform === "meta") {
        items = await this.expandMeta(dto, source, userId);
      }

      // Apply sorting if specified
      if (dto.orderBy) {
        items = this.aggregatorService.aggregate(
          items,
          {},
          { orderBy: dto.orderBy, sortOrder: dto.sortOrder },
          { page: 1, limit: items.length },
        ).items;
      }

      return {
        success: true,
        items,
        metadata: {
          parentLevel: dto.parentLevel as AdsLevel,
          parentId: dto.parentId,
          childLevel: dto.childLevel as AdsLevel,
        },
      };
    } catch (error) {
      this.logger.error(`Expand failed: ${error.message}`);
      return {
        success: false,
        items: [],
        metadata: {
          parentLevel: dto.parentLevel as AdsLevel,
          parentId: dto.parentId,
          childLevel: dto.childLevel as AdsLevel,
        },
        error: error.message,
      };
    }
  }

  /**
   * Expand Google Ads hierarchy
   */
  private async expandGoogle(
    dto: AdsExpandRequestDto,
    source: AdsSourceDto,
    userId: string,
  ): Promise<UnifiedAdObject[]> {
    if (dto.parentLevel === "campaign" && dto.childLevel === "adset") {
      // Get ad groups for campaign
      const hierarchy = await this.googleDashboardService.getCampaignHierarchy(
        userId,
        source.connectionId,
        dto.parentId,
        source.customerId,
        source.loginCustomerId,
        dto.startDate,
        dto.endDate,
      );

      if (!hierarchy.success || !hierarchy.adGroups) {
        return [];
      }

      return this.normalizerService.normalizeGoogleAdGroups(
        hierarchy.adGroups.map((ag: any) => ({
          id: ag.id,
          name: ag.name,
          status: ag.status,
          type: ag.type,
          cpcBidMicros: ag.cpcBidMicros,
          cpcBid: ag.cpcBid,
          campaignId: dto.parentId,
          // Flatten metrics from the nested object
          impressions: ag.metrics?.impressions || 0,
          clicks: ag.metrics?.clicks || 0,
          ctr: ag.metrics?.ctr || 0,
          cost: ag.metrics?.cost || 0,
          conversions: ag.metrics?.conversions || 0,
          cpc:
            ag.metrics?.clicks > 0
              ? (ag.metrics?.cost || 0) / ag.metrics.clicks
              : 0,
          cpa:
            ag.metrics?.conversions > 0
              ? (ag.metrics?.cost || 0) / ag.metrics.conversions
              : 0,
          maxCpc: ag.cpcBid,
          // Keep original data for platformData
          ads: ag.ads,
          metrics: ag.metrics,
        })),
        source.connectionId,
        "Google Ads",
        source.customerId || "",
        source.customerId || "",
      );
    } else if (dto.parentLevel === "adset" && dto.childLevel === "ad") {
      // Get ads for ad group directly
      const result = await this.googleDashboardService.getAdGroupAds(
        userId,
        source.connectionId,
        dto.parentId,
        source.customerId,
        source.loginCustomerId,
        dto.startDate,
        dto.endDate,
      );

      if (!result.success || !result.ads) {
        return [];
      }

      return this.normalizerService.normalizeGoogleAds(
        result.ads.map((ad: any) => ({
          id: ad.id,
          name: ad.name,
          status: ad.status,
          type: ad.type,
          headlines: ad.headlines,
          descriptions: ad.descriptions,
          finalUrl: ad.finalUrls?.[0],
          finalUrls: ad.finalUrls,
          finalMobileUrls: ad.finalMobileUrls,
          displayUrl: ad.displayUrl,
          displayUrlPreview: ad.displayUrlPreview,
          path1: ad.path1,
          path2: ad.path2,
          adGroupId: dto.parentId,
          // Tracking & UTM data
          trackingUrlTemplate: ad.trackingUrlTemplate,
          finalUrlSuffix: ad.finalUrlSuffix,
          urlCustomParameters: ad.urlCustomParameters,
          adTrackingUrlTemplate: ad.adTrackingUrlTemplate,
          adFinalUrlSuffix: ad.adFinalUrlSuffix,
          // Additional fields
          devicePreference: ad.devicePreference,
          addedByGoogleAds: ad.addedByGoogleAds,
          // Ad type specific data
          callAd: ad.callAd,
          imageAd: ad.imageAd,
          videoAd: ad.videoAd,
          responsiveDisplayAd: ad.responsiveDisplayAd,
          // Flatten metrics from the nested object
          impressions: ad.metrics?.impressions || 0,
          clicks: ad.metrics?.clicks || 0,
          ctr: ad.metrics?.ctr || 0,
          cost: ad.metrics?.cost || 0,
          conversions: ad.metrics?.conversions || 0,
          cpc:
            ad.metrics?.clicks > 0
              ? (ad.metrics?.cost || 0) / ad.metrics.clicks
              : 0,
          cpa:
            ad.metrics?.conversions > 0
              ? (ad.metrics?.cost || 0) / ad.metrics.conversions
              : 0,
        })),
        source.connectionId,
        "Google Ads",
        source.customerId || "",
        source.customerId || "",
      );
    }

    return [];
  }

  /**
   * Expand Meta Ads hierarchy
   */
  private async expandMeta(
    dto: AdsExpandRequestDto,
    source: AdsSourceDto,
    userId: string,
  ): Promise<UnifiedAdObject[]> {
    if (dto.parentLevel === "campaign" && dto.childLevel === "adset") {
      // Get ad sets for campaign
      const hierarchy = await this.metaDashboardService.getCampaignHierarchy(
        userId,
        source.connectionId,
        dto.parentId,
        source.adAccountId,
        dto.startDate,
        dto.endDate,
      );

      if (!hierarchy.success || !hierarchy.adSets) {
        return [];
      }

      return this.normalizerService.normalizeMetaAdSets(
        hierarchy.adSets.map((as: any) => ({
          ...as,
          campaignId: dto.parentId,
          connectionId: source.connectionId,
          adAccountId: source.adAccountId,
        })),
        source.connectionId,
        "Meta Ads",
        source.adAccountId || "",
        "",
      );
    } else if (dto.parentLevel === "adset" && dto.childLevel === "ad") {
      // Get ads for ad set
      const result = await this.metaDashboardService.getAdSetAds(
        userId,
        source.connectionId,
        dto.parentId,
        dto.startDate,
        dto.endDate,
      );

      if (!result.success || !result.ads) {
        return [];
      }

      return this.normalizerService.normalizeMetaAds(
        result.ads.map((ad: any) => ({
          ...ad,
          adSetId: dto.parentId,
          connectionId: source.connectionId,
          adAccountId: source.adAccountId,
        })),
        source.connectionId,
        "Meta Ads",
        source.adAccountId || "",
        "",
      );
    }

    return [];
  }

  // ============================================
  // Actions
  // ============================================

  /**
   * Pause an ad object
   */
  async pause(
    platform: "google" | "meta",
    level: AdsLevel,
    objectId: string,
    connectionId: string,
    userId: string,
    customerId?: string,
    loginCustomerId?: string,
    adAccountId?: string,
    name?: string,
  ): Promise<AdsActionResponse> {
    try {
      if (platform === "google") {
        return await this.pauseGoogle(
          level,
          objectId,
          connectionId,
          userId,
          customerId,
          loginCustomerId,
        );
      } else {
        return await this.pauseMeta(
          level,
          objectId,
          connectionId,
          userId,
          adAccountId,
          name,
        );
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        objectId,
      };
    }
  }

  private async pauseGoogle(
    level: AdsLevel,
    objectId: string,
    connectionId: string,
    userId: string,
    _customerId?: string,
    _loginCustomerId?: string,
  ): Promise<AdsActionResponse> {
    switch (level) {
      case "campaign":
        const campaignResult = await this.googleDashboardService.pauseCampaign(
          userId,
          connectionId,
          objectId,
        );
        return {
          success: campaignResult.success,
          objectId,
          previousStatus: campaignResult.previousStatus as any,
          newStatus: "PAUSED",
          actionLogId: campaignResult.actionLogId,
          error: campaignResult.error,
        };
      case "adset":
        const adGroupResult = await this.googleDashboardService.pauseAdGroup(
          userId,
          connectionId,
          objectId,
        );
        return {
          success: adGroupResult.success,
          objectId,
          previousStatus: adGroupResult.previousStatus as any,
          newStatus: "PAUSED",
          error: adGroupResult.error,
        };
      case "ad":
        const adResult = await this.googleDashboardService.pauseAd(
          userId,
          connectionId,
          objectId,
        );
        return {
          success: adResult.success,
          objectId,
          previousStatus: adResult.previousStatus as any,
          newStatus: "PAUSED",
          error: adResult.error,
        };
      default:
        return { success: false, error: "Invalid level", objectId };
    }
  }

  private async pauseMeta(
    level: AdsLevel,
    objectId: string,
    connectionId: string,
    userId: string,
    adAccountId?: string,
    name?: string,
  ): Promise<AdsActionResponse> {
    switch (level) {
      case "campaign":
        const campaignResult = await this.metaDashboardService.pauseCampaign(
          userId,
          connectionId,
          objectId,
          adAccountId,
          name,
        );
        return {
          success: campaignResult.success,
          objectId,
          newStatus: "PAUSED",
          error: campaignResult.error,
        };
      case "adset":
        const adSetResult = await this.metaDashboardService.pauseAdSet(
          userId,
          connectionId,
          objectId,
          adAccountId,
        );
        return {
          success: adSetResult.success,
          objectId,
          newStatus: "PAUSED",
          error: adSetResult.error,
        };
      case "ad":
        const adResult = await this.metaDashboardService.pauseAd(
          userId,
          connectionId,
          objectId,
          adAccountId,
        );
        return {
          success: adResult.success,
          objectId,
          newStatus: "PAUSED",
          error: adResult.error,
        };
      default:
        return { success: false, error: "Invalid level", objectId };
    }
  }

  /**
   * Enable an ad object
   */
  async enable(
    platform: "google" | "meta",
    level: AdsLevel,
    objectId: string,
    connectionId: string,
    userId: string,
    customerId?: string,
    loginCustomerId?: string,
    adAccountId?: string,
    name?: string,
  ): Promise<AdsActionResponse> {
    try {
      if (platform === "google") {
        return await this.enableGoogle(
          level,
          objectId,
          connectionId,
          userId,
          customerId,
          loginCustomerId,
        );
      } else {
        return await this.enableMeta(
          level,
          objectId,
          connectionId,
          userId,
          adAccountId,
          name,
        );
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        objectId,
      };
    }
  }

  private async enableGoogle(
    level: AdsLevel,
    objectId: string,
    connectionId: string,
    userId: string,
    _customerId?: string,
    _loginCustomerId?: string,
  ): Promise<AdsActionResponse> {
    switch (level) {
      case "campaign":
        const campaignResult = await this.googleDashboardService.enableCampaign(
          userId,
          connectionId,
          objectId,
        );
        return {
          success: campaignResult.success,
          objectId,
          previousStatus: campaignResult.previousStatus as any,
          newStatus: "ENABLED",
          actionLogId: campaignResult.actionLogId,
          error: campaignResult.error,
        };
      case "adset":
        const adGroupResult = await this.googleDashboardService.enableAdGroup(
          userId,
          connectionId,
          objectId,
        );
        return {
          success: adGroupResult.success,
          objectId,
          previousStatus: adGroupResult.previousStatus as any,
          newStatus: "ENABLED",
          error: adGroupResult.error,
        };
      case "ad":
        const adResult = await this.googleDashboardService.enableAd(
          userId,
          connectionId,
          objectId,
        );
        return {
          success: adResult.success,
          objectId,
          previousStatus: adResult.previousStatus as any,
          newStatus: "ENABLED",
          error: adResult.error,
        };
      default:
        return { success: false, error: "Invalid level", objectId };
    }
  }

  private async enableMeta(
    level: AdsLevel,
    objectId: string,
    connectionId: string,
    userId: string,
    adAccountId?: string,
    name?: string,
  ): Promise<AdsActionResponse> {
    switch (level) {
      case "campaign":
        const campaignResult = await this.metaDashboardService.enableCampaign(
          userId,
          connectionId,
          objectId,
          adAccountId,
          name,
        );
        return {
          success: campaignResult.success,
          objectId,
          newStatus: "ENABLED",
          error: campaignResult.error,
        };
      case "adset":
        const adSetResult = await this.metaDashboardService.enableAdSet(
          userId,
          connectionId,
          objectId,
          adAccountId,
        );
        return {
          success: adSetResult.success,
          objectId,
          newStatus: "ENABLED",
          error: adSetResult.error,
        };
      case "ad":
        const adResult = await this.metaDashboardService.enableAd(
          userId,
          connectionId,
          objectId,
          adAccountId,
        );
        return {
          success: adResult.success,
          objectId,
          newStatus: "ENABLED",
          error: adResult.error,
        };
      default:
        return { success: false, error: "Invalid level", objectId };
    }
  }

  /**
   * Update budget for a campaign
   */
  async updateBudget(
    platform: "google" | "meta",
    campaignId: string,
    newBudget: number,
    connectionId: string,
    userId: string,
    budgetId?: string,
    customerId?: string,
    loginCustomerId?: string,
    adAccountId?: string,
  ): Promise<AdsActionResponse> {
    try {
      if (platform === "google") {
        if (!budgetId) {
          return {
            success: false,
            error: "Budget ID required for Google Ads",
            objectId: campaignId,
          };
        }
        const result = await this.googleDashboardService.updateBudget(
          userId,
          connectionId,
          campaignId,
          budgetId,
          newBudget,
          customerId,
          loginCustomerId,
        );
        return {
          success: result.success,
          objectId: campaignId,
          previousBudget: result.previousBudget,
          newBudget: result.newBudget,
          actionLogId: result.actionLogId,
          error: result.error,
        };
      } else {
        const result = await this.metaDashboardService.updateBudget(
          userId,
          connectionId,
          campaignId,
          newBudget,
          adAccountId,
        );
        return {
          success: result.success,
          objectId: campaignId,
          previousBudget: result.oldBudget,
          newBudget: result.newBudget,
          error: result.error,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        objectId: campaignId,
      };
    }
  }

  // ============================================
  // Helpers
  // ============================================

  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes("timeout") ||
      message.includes("rate limit") ||
      message.includes("temporarily") ||
      message.includes("503") ||
      message.includes("429")
    );
  }

  /**
   * Resolve fields from fieldGroup or fields array
   * fieldGroup takes precedence if specified
   */
  private resolveFields(
    fieldGroup?: keyof typeof FIELD_GROUPS,
    fields?: string[],
  ): string[] | undefined {
    // Field group takes precedence
    if (fieldGroup && FIELD_GROUPS[fieldGroup]) {
      return [...FIELD_GROUPS[fieldGroup]];
    }

    // Return fields array if specified
    if (fields && fields.length > 0) {
      return fields;
    }

    // No field filtering - return all fields
    return undefined;
  }
}
