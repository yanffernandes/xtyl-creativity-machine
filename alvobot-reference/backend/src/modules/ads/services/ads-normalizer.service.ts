/**
 * Ads Normalizer Service
 * Transforms Google Ads and Meta Ads objects into a unified format (UnifiedAdObject)
 */

import { Injectable, Logger } from "@nestjs/common";
import {
  UnifiedAdObject,
  UnifiedStatus,
  AdsPlatform,
  AdsLevel,
} from "../types/unified-ad-object";

// ============================================
// Google Ads Types (from google-dashboard.service)
// ============================================

interface GoogleCampaign {
  id: string;
  name: string;
  status: "ENABLED" | "PAUSED" | "REMOVED";
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cost: number;
  conversions: number;
  cpa: number;
  roas?: number;
  budget: number;
  budgetId?: string;
  budgetSpentPercent: number;
  biddingStrategyType?: string;
  targetCpa?: number;
  targetRoas?: number;
  maxCpc?: number;
  searchImpressionShare?: number;
  networkType?: string;
  objective?: string;
  alerts?: string[];
  // Connection info
  customerId?: string;
  loginCustomerId?: string;
  connectionId?: string;
  connectionName?: string;
}

interface GoogleAdGroup {
  id: string;
  name: string;
  status: "ENABLED" | "PAUSED" | "REMOVED";
  campaignId: string;
  campaignName?: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cost: number;
  conversions: number;
  cpa: number;
  maxCpc?: number;
  // Connection info
  customerId?: string;
  loginCustomerId?: string;
  connectionId?: string;
  connectionName?: string;
}

interface GoogleAd {
  id: string;
  adGroupId: string;
  adGroupName?: string;
  campaignId?: string;
  campaignName?: string;
  type: string;
  status: "ENABLED" | "PAUSED" | "REMOVED";
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cost: number;
  conversions: number;
  cpa: number;
  // Creative info (RSA/ETA/DSA)
  headlines?: string[];
  descriptions?: string[];
  finalUrl?: string;
  finalUrls?: string[];
  finalMobileUrls?: string[];
  displayUrl?: string;
  path1?: string;
  path2?: string;
  addedByGoogleAds?: boolean;
  devicePreference?: string;
  // Tracking & UTM fields
  trackingUrlTemplate?: string;
  finalUrlSuffix?: string;
  urlCustomParameters?: Array<{ key: string; value: string }>;
  // Ad-level tracking (may override ad group/campaign)
  adTrackingUrlTemplate?: string;
  adFinalUrlSuffix?: string;
  // Ad group level tracking
  adGroupTrackingUrlTemplate?: string;
  adGroupFinalUrlSuffix?: string;
  // Campaign level tracking
  campaignTrackingUrlTemplate?: string;
  campaignFinalUrlSuffix?: string;
  campaignUrlCustomParameters?: Array<{ key: string; value: string }>;
  // Call Ad
  callAd?: {
    countryCode?: string;
    phoneNumber?: string;
    businessName?: string;
    headline1?: string;
    headline2?: string;
    description1?: string;
    description2?: string;
    callTracked?: boolean;
    disableCallConversion?: boolean;
    path1?: string;
    path2?: string;
  };
  // Image Ad
  imageAd?: {
    pixelWidth?: number;
    pixelHeight?: number;
    imageUrl?: string;
    previewPixelWidth?: number;
    previewPixelHeight?: number;
    previewImageUrl?: string;
    mimeType?: string;
    name?: string;
  };
  // Responsive Display Ad
  responsiveDisplayAd?: {
    headlines?: string[];
    longHeadline?: string;
    descriptions?: string[];
    businessName?: string;
    mainColor?: string;
    accentColor?: string;
    allowFlexibleColor?: boolean;
    callToActionText?: string;
    pricePrefix?: string;
    promoText?: string;
    formatSetting?: string;
  };
  // Connection info
  customerId?: string;
  loginCustomerId?: string;
  connectionId?: string;
  connectionName?: string;
}

// ============================================
// Meta Ads Types (from meta-dashboard.service)
// ============================================

interface MetaCampaign {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED";
  effectiveStatus?: string;
  objective: string;
  dailyBudget: number;
  lifetimeBudget: number;
  budgetType?: "daily" | "lifetime";
  isABO?: boolean;
  bidStrategy?: string;
  specialAdCategories?: string[];
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  spend: number;
  reach?: number;
  frequency?: number;
  conversions: number;
  cpa: number;
  roas?: number;
  qualityRanking?: string;
  engagementRateRanking?: string;
  conversionRateRanking?: string;
  landingPageViews?: number;
  startTime?: string;
  stopTime?: string;
  createdTime?: string;
  updatedTime?: string;
  // Connection info
  connectionId?: string;
  connectionName?: string;
  adAccountId?: string;
  adAccountName?: string;
}

interface MetaAdSet {
  id: string;
  name: string;
  status: string;
  effectiveStatus?: string;
  optimizationGoal?: string;
  billingEvent?: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  bidAmount?: number;
  destinationType?: string;
  learningStageInfo?: {
    status: string;
    learningPhaseExitInfo?: {
      type: string;
      countNeeded?: number;
    };
  };
  issuesInfo?: Array<{
    level: string;
    errorType: string;
    errorCode?: number;
    errorSummary: string;
    errorMessage: string;
  }>;
  startTime?: string;
  endTime?: string;
  targeting?: {
    ageMin?: number;
    ageMax?: number;
    genders?: number[];
    geoLocations?: string[];
    interests?: string[];
    behaviors?: string[];
  };
  metrics?: {
    impressions: number;
    clicks: number;
    ctr: number;
    spend: number;
    conversions: number;
    cpa: number;
    qualityRanking?: string;
    engagementRateRanking?: string;
    conversionRateRanking?: string;
    landingPageViews?: number;
  };
  // Connection info
  connectionId?: string;
  connectionName?: string;
  adAccountId?: string;
  adAccountName?: string;
  campaignId?: string;
  campaignName?: string;
}

interface MetaAd {
  id: string;
  name: string;
  status: string;
  effectiveStatus?: string;
  configuredStatus?: string;
  creativeId?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  failedDeliveryChecks?: Array<{
    checkName: string;
    summary: string;
    description: string;
  }>;
  adReviewFeedback?: {
    globalStatus?: string;
    placementSpecificReviews?: Array<{
      placement: string;
      status: string;
    }>;
  };
  creative?: {
    title?: string;
    body?: string;
    callToAction?: string;
    linkUrl?: string;
    imageUrl?: string;
    urlTags?: string;
  };
  metrics?: {
    impressions: number;
    clicks: number;
    ctr: number;
    spend: number;
    conversions: number;
    cpa: number;
    qualityRanking?: string;
    engagementRateRanking?: string;
    conversionRateRanking?: string;
    landingPageViews?: number;
  };
  // Connection info
  connectionId?: string;
  connectionName?: string;
  adAccountId?: string;
  adAccountName?: string;
  adSetId?: string;
  adSetName?: string;
  campaignId?: string;
  campaignName?: string;
}

// ============================================
// Normalizer Service
// ============================================

@Injectable()
export class AdsNormalizerService {
  private readonly logger = new Logger(AdsNormalizerService.name);

  // ============================================
  // Field Selection (Projection)
  // ============================================

  /**
   * Filter an object to only include specified fields
   * This implements projection pushdown to reduce payload size
   *
   * @param item - The full UnifiedAdObject
   * @param fields - Array of field names to include, or ['*'] for all fields
   * @returns Partial object with only requested fields
   */
  filterFields(item: UnifiedAdObject, fields?: string[]): UnifiedAdObject {
    // If no fields specified or '*' included, return full object
    if (!fields || fields.length === 0 || fields.includes("*")) {
      return item;
    }

    // Always include identity fields for proper functioning
    const requiredFields = ["id", "platform", "level"];
    const allFields = [...new Set([...requiredFields, ...fields])];

    const result: Partial<UnifiedAdObject> = {};

    for (const field of allFields) {
      if (field in item && item[field as keyof UnifiedAdObject] !== undefined) {
        (result as Record<string, unknown>)[field] =
          item[field as keyof UnifiedAdObject];
      }
    }

    return result as UnifiedAdObject;
  }

  /**
   * Filter a batch of items to only include specified fields
   */
  filterFieldsBatch(
    items: UnifiedAdObject[],
    fields?: string[],
  ): UnifiedAdObject[] {
    // Early return for no filtering
    if (!fields || fields.length === 0 || fields.includes("*")) {
      return items;
    }

    return items.map((item) => this.filterFields(item, fields));
  }

  // ============================================
  // Status Mapping
  // ============================================

  /**
   * Map Google Ads status to unified status
   */
  private mapGoogleStatus(status: string): UnifiedStatus {
    switch (status?.toUpperCase()) {
      case "ENABLED":
        return "ENABLED";
      case "PAUSED":
        return "PAUSED";
      case "REMOVED":
        return "REMOVED";
      default:
        return "PAUSED";
    }
  }

  /**
   * Map Meta Ads status to unified status
   */
  private mapMetaStatus(status: string): UnifiedStatus {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return "ENABLED";
      case "PAUSED":
        return "PAUSED";
      case "DELETED":
      case "ARCHIVED":
        return "REMOVED";
      default:
        return "PAUSED";
    }
  }

  // ============================================
  // Google Ads Normalizers
  // ============================================

  /**
   * Normalize Google Ads campaign to unified format
   */
  normalizeGoogleCampaign(
    campaign: GoogleCampaign,
    connectionId: string,
    connectionName: string,
    accountId: string,
    accountName: string,
  ): UnifiedAdObject {
    return {
      // Identity
      id: campaign.id,
      name: campaign.name,
      platform: "google" as AdsPlatform,
      level: "campaign" as AdsLevel,

      // Status
      status: this.mapGoogleStatus(campaign.status),

      // Budget
      budget: campaign.budget,
      budgetType: "daily", // Google uses daily budget at campaign level
      isABO: false, // Google doesn't have ABO concept at campaign level

      // Metrics
      impressions: campaign.impressions || 0,
      clicks: campaign.clicks || 0,
      ctr: campaign.ctr || 0,
      cpc: campaign.cpc || 0,
      cost: campaign.cost || 0,
      conversions: campaign.conversions || 0,
      cpa: campaign.cpa || 0,
      roas: campaign.roas,

      // Connection info
      connectionId,
      connectionName,
      accountId,
      accountName,

      // Objective - map from biddingStrategyType or networkType
      objective: campaign.objective || campaign.biddingStrategyType,

      // Bidding info
      biddingStrategyType: campaign.biddingStrategyType,
      targetCpa: campaign.targetCpa,
      targetRoas: campaign.targetRoas,
      maxCpc: campaign.maxCpc,

      // Alerts
      alerts: campaign.alerts,

      // Google-specific identifiers for actions
      customerId: campaign.customerId,
      loginCustomerId: campaign.loginCustomerId,
      budgetId: campaign.budgetId,

      // Raw data for advanced operations
      platformData: campaign,
    };
  }

  /**
   * Normalize Google Ads ad group to unified format (as adset)
   */
  normalizeGoogleAdGroup(
    adGroup: GoogleAdGroup,
    connectionId: string,
    connectionName: string,
    accountId: string,
    accountName: string,
  ): UnifiedAdObject {
    return {
      // Identity
      id: adGroup.id,
      name: adGroup.name,
      platform: "google" as AdsPlatform,
      level: "adset" as AdsLevel, // Map ad group to adset

      // Status
      status: this.mapGoogleStatus(adGroup.status),

      // Hierarchy
      parentId: adGroup.campaignId,
      parentName: adGroup.campaignName,
      campaignId: adGroup.campaignId,
      campaignName: adGroup.campaignName,

      // Budget - ad groups don't have budget in Google Ads
      budget: undefined,

      // Metrics
      impressions: adGroup.impressions || 0,
      clicks: adGroup.clicks || 0,
      ctr: adGroup.ctr || 0,
      cpc: adGroup.cpc || 0,
      cost: adGroup.cost || 0,
      conversions: adGroup.conversions || 0,
      cpa: adGroup.cpa || 0,

      // Connection info
      connectionId,
      connectionName,
      accountId,
      accountName,

      // Bidding
      maxCpc: adGroup.maxCpc,

      // Google-specific identifiers
      customerId: adGroup.customerId,
      loginCustomerId: adGroup.loginCustomerId,

      // Raw data
      platformData: adGroup,
    };
  }

  /**
   * Normalize Google Ads ad to unified format
   */
  normalizeGoogleAd(
    ad: GoogleAd,
    connectionId: string,
    connectionName: string,
    accountId: string,
    accountName: string,
  ): UnifiedAdObject {
    // Determine the effective tracking URL template (ad > ad group > campaign)
    const effectiveTrackingUrlTemplate =
      ad.adTrackingUrlTemplate ||
      ad.trackingUrlTemplate ||
      ad.adGroupTrackingUrlTemplate ||
      ad.campaignTrackingUrlTemplate;

    // Determine the effective final URL suffix (ad > ad group > campaign)
    const effectiveFinalUrlSuffix =
      ad.adFinalUrlSuffix ||
      ad.finalUrlSuffix ||
      ad.adGroupFinalUrlSuffix ||
      ad.campaignFinalUrlSuffix;

    // Determine the effective URL custom parameters
    const effectiveUrlCustomParameters =
      ad.urlCustomParameters || ad.campaignUrlCustomParameters;

    return {
      // Identity
      id: ad.id,
      name:
        ad.headlines?.[0] ||
        ad.callAd?.headline1 ||
        ad.responsiveDisplayAd?.headlines?.[0] ||
        `Ad ${ad.id}`,
      platform: "google" as AdsPlatform,
      level: "ad" as AdsLevel,

      // Status
      status: this.mapGoogleStatus(ad.status),

      // Hierarchy
      parentId: ad.adGroupId,
      parentName: ad.adGroupName,
      campaignId: ad.campaignId,
      campaignName: ad.campaignName,
      adSetId: ad.adGroupId, // Map ad group to adset
      adSetName: ad.adGroupName,

      // Metrics
      impressions: ad.impressions || 0,
      clicks: ad.clicks || 0,
      ctr: ad.ctr || 0,
      cpc: ad.cpc || 0,
      cost: ad.cost || 0,
      conversions: ad.conversions || 0,
      cpa: ad.cpa || 0,

      // Connection info
      connectionId,
      connectionName,
      accountId,
      accountName,

      // Creative info - comprehensive for all ad types
      creative: {
        // Basic RSA/ETA fields
        headlines: ad.headlines,
        descriptions: ad.descriptions,
        finalUrl: ad.finalUrl,
        finalUrls: ad.finalUrls,
        finalMobileUrls: ad.finalMobileUrls,
        displayUrl: ad.displayUrl,
        path1: ad.path1,
        path2: ad.path2,
        type: ad.type,
        addedByGoogleAds: ad.addedByGoogleAds,
        devicePreference: ad.devicePreference,

        // Tracking & UTM fields
        trackingUrlTemplate: effectiveTrackingUrlTemplate,
        finalUrlSuffix: effectiveFinalUrlSuffix,
        urlCustomParameters: effectiveUrlCustomParameters,
        // Keep original sources for debugging/display
        adGroupTrackingUrlTemplate: ad.adGroupTrackingUrlTemplate,
        adGroupFinalUrlSuffix: ad.adGroupFinalUrlSuffix,
        campaignTrackingUrlTemplate: ad.campaignTrackingUrlTemplate,
        campaignFinalUrlSuffix: ad.campaignFinalUrlSuffix,
        campaignUrlCustomParameters: ad.campaignUrlCustomParameters,

        // Call Ad details
        callAd: ad.callAd,

        // Image Ad details
        imageAd: ad.imageAd,

        // Responsive Display Ad details
        responsiveDisplayAd: ad.responsiveDisplayAd,
      },

      // Google-specific identifiers
      customerId: ad.customerId,
      loginCustomerId: ad.loginCustomerId,

      // Raw data
      platformData: ad,
    };
  }

  // ============================================
  // Meta Ads Normalizers
  // ============================================

  /**
   * Normalize Meta campaign to unified format
   */
  normalizeMetaCampaign(
    campaign: MetaCampaign,
    connectionId: string,
    connectionName: string,
    accountId: string,
    accountName: string,
  ): UnifiedAdObject {
    // Determine budget and type
    const budget =
      campaign.dailyBudget > 0 ? campaign.dailyBudget : campaign.lifetimeBudget;
    const budgetType: "daily" | "lifetime" =
      campaign.dailyBudget > 0 ? "daily" : "lifetime";

    return {
      // Identity
      id: campaign.id,
      name: campaign.name,
      platform: "meta" as AdsPlatform,
      level: "campaign" as AdsLevel,

      // Status
      status: this.mapMetaStatus(campaign.status),
      effectiveStatus: campaign.effectiveStatus,

      // Budget
      budget,
      budgetType,
      isABO: campaign.isABO,

      // Metrics
      impressions: campaign.impressions || 0,
      clicks: campaign.clicks || 0,
      ctr: campaign.ctr || 0,
      cpc: campaign.cpc || 0,
      cost: campaign.spend || 0, // Meta uses 'spend', we normalize to 'cost'
      conversions: campaign.conversions || 0,
      cpa: campaign.cpa || 0,
      roas: campaign.roas,

      // Meta-specific metrics
      reach: campaign.reach,
      frequency: campaign.frequency,
      landingPageViews: campaign.landingPageViews,

      // Connection info
      connectionId,
      connectionName,
      accountId,
      accountName,

      // Objective
      objective: campaign.objective,

      // Quality metrics
      qualityRanking: campaign.qualityRanking,
      engagementRateRanking: campaign.engagementRateRanking,
      conversionRateRanking: campaign.conversionRateRanking,

      // Timestamps
      createdTime: campaign.createdTime,
      updatedTime: campaign.updatedTime,
      startTime: campaign.startTime,
      endTime: campaign.stopTime,

      // Special categories
      specialAdCategories: campaign.specialAdCategories,
      bidStrategy: campaign.bidStrategy,

      // Raw data
      platformData: campaign,
    };
  }

  /**
   * Normalize Meta ad set to unified format
   */
  normalizeMetaAdSet(
    adSet: MetaAdSet,
    connectionId: string,
    connectionName: string,
    accountId: string,
    accountName: string,
  ): UnifiedAdObject {
    const metrics = adSet.metrics || {
      impressions: 0,
      clicks: 0,
      ctr: 0,
      spend: 0,
      conversions: 0,
      cpa: 0,
    };

    // Determine budget
    const budget = adSet.dailyBudget || adSet.lifetimeBudget;
    const budgetType: "daily" | "lifetime" | undefined = adSet.dailyBudget
      ? "daily"
      : adSet.lifetimeBudget
        ? "lifetime"
        : undefined;

    return {
      // Identity
      id: adSet.id,
      name: adSet.name,
      platform: "meta" as AdsPlatform,
      level: "adset" as AdsLevel,

      // Status
      status: this.mapMetaStatus(adSet.status),
      effectiveStatus: adSet.effectiveStatus,

      // Hierarchy
      parentId: adSet.campaignId,
      parentName: adSet.campaignName,
      campaignId: adSet.campaignId,
      campaignName: adSet.campaignName,

      // Budget
      budget,
      budgetType,

      // Metrics
      impressions: metrics.impressions || 0,
      clicks: metrics.clicks || 0,
      ctr: metrics.ctr || 0,
      cpc: metrics.spend && metrics.clicks ? metrics.spend / metrics.clicks : 0,
      cost: metrics.spend || 0,
      conversions: metrics.conversions || 0,
      cpa: metrics.cpa || 0,

      // Meta-specific metrics
      landingPageViews: metrics.landingPageViews,

      // Connection info
      connectionId,
      connectionName,
      accountId,
      accountName,

      // Quality metrics
      qualityRanking: metrics.qualityRanking,
      engagementRateRanking: metrics.engagementRateRanking,
      conversionRateRanking: metrics.conversionRateRanking,

      // Timestamps
      startTime: adSet.startTime,
      endTime: adSet.endTime,

      // Learning info
      learningStageInfo: adSet.learningStageInfo,

      // Issues
      issuesInfo: adSet.issuesInfo,

      // Targeting
      targeting: adSet.targeting,

      // Raw data
      platformData: adSet,
    };
  }

  /**
   * Normalize Meta ad to unified format
   */
  normalizeMetaAd(
    ad: MetaAd,
    connectionId: string,
    connectionName: string,
    accountId: string,
    accountName: string,
  ): UnifiedAdObject {
    const metrics = ad.metrics || {
      impressions: 0,
      clicks: 0,
      ctr: 0,
      spend: 0,
      conversions: 0,
      cpa: 0,
    };

    return {
      // Identity
      id: ad.id,
      name: ad.name,
      platform: "meta" as AdsPlatform,
      level: "ad" as AdsLevel,

      // Status
      status: this.mapMetaStatus(ad.status),
      effectiveStatus: ad.effectiveStatus,

      // Hierarchy
      parentId: ad.adSetId,
      parentName: ad.adSetName,
      campaignId: ad.campaignId,
      campaignName: ad.campaignName,
      adSetId: ad.adSetId,
      adSetName: ad.adSetName,

      // Metrics
      impressions: metrics.impressions || 0,
      clicks: metrics.clicks || 0,
      ctr: metrics.ctr || 0,
      cpc: metrics.spend && metrics.clicks ? metrics.spend / metrics.clicks : 0,
      cost: metrics.spend || 0,
      conversions: metrics.conversions || 0,
      cpa: metrics.cpa || 0,

      // Meta-specific metrics
      landingPageViews: metrics.landingPageViews,

      // Connection info
      connectionId,
      connectionName,
      accountId,
      accountName,

      // Quality metrics
      qualityRanking: metrics.qualityRanking,
      engagementRateRanking: metrics.engagementRateRanking,
      conversionRateRanking: metrics.conversionRateRanking,

      // Creative info
      creativeId: ad.creativeId,
      previewUrl: ad.previewUrl,
      thumbnailUrl: ad.thumbnailUrl,
      creative: ad.creative
        ? {
            title: ad.creative.title,
            body: ad.creative.body,
            callToAction: ad.creative.callToAction,
            linkUrl: ad.creative.linkUrl,
            imageUrl: ad.creative.imageUrl,
            urlTags: ad.creative.urlTags,
          }
        : undefined,

      // Failed delivery checks
      failedDeliveryChecks: ad.failedDeliveryChecks,

      // Ad review feedback
      adReviewFeedback: ad.adReviewFeedback,

      // Raw data
      platformData: ad,
    };
  }

  // ============================================
  // Batch Normalizers
  // ============================================

  /**
   * Normalize a batch of Google campaigns
   */
  normalizeGoogleCampaigns(
    campaigns: GoogleCampaign[],
    connectionId: string,
    connectionName: string,
    accountId: string,
    accountName: string,
  ): UnifiedAdObject[] {
    return campaigns.map((c) =>
      this.normalizeGoogleCampaign(
        c,
        connectionId,
        connectionName,
        accountId,
        accountName,
      ),
    );
  }

  /**
   * Normalize a batch of Google ad groups
   */
  normalizeGoogleAdGroups(
    adGroups: GoogleAdGroup[],
    connectionId: string,
    connectionName: string,
    accountId: string,
    accountName: string,
  ): UnifiedAdObject[] {
    return adGroups.map((ag) =>
      this.normalizeGoogleAdGroup(
        ag,
        connectionId,
        connectionName,
        accountId,
        accountName,
      ),
    );
  }

  /**
   * Normalize a batch of Google ads
   */
  normalizeGoogleAds(
    ads: GoogleAd[],
    connectionId: string,
    connectionName: string,
    accountId: string,
    accountName: string,
  ): UnifiedAdObject[] {
    return ads.map((ad) =>
      this.normalizeGoogleAd(
        ad,
        connectionId,
        connectionName,
        accountId,
        accountName,
      ),
    );
  }

  /**
   * Normalize a batch of Meta campaigns
   */
  normalizeMetaCampaigns(
    campaigns: MetaCampaign[],
    connectionId: string,
    connectionName: string,
    accountId: string,
    accountName: string,
  ): UnifiedAdObject[] {
    return campaigns.map((c) =>
      this.normalizeMetaCampaign(
        c,
        connectionId,
        connectionName,
        accountId,
        accountName,
      ),
    );
  }

  /**
   * Normalize a batch of Meta ad sets
   */
  normalizeMetaAdSets(
    adSets: MetaAdSet[],
    connectionId: string,
    connectionName: string,
    accountId: string,
    accountName: string,
  ): UnifiedAdObject[] {
    return adSets.map((as) =>
      this.normalizeMetaAdSet(
        as,
        connectionId,
        connectionName,
        accountId,
        accountName,
      ),
    );
  }

  /**
   * Normalize a batch of Meta ads
   */
  normalizeMetaAds(
    ads: MetaAd[],
    connectionId: string,
    connectionName: string,
    accountId: string,
    accountName: string,
  ): UnifiedAdObject[] {
    return ads.map((ad) =>
      this.normalizeMetaAd(
        ad,
        connectionId,
        connectionName,
        accountId,
        accountName,
      ),
    );
  }
}
