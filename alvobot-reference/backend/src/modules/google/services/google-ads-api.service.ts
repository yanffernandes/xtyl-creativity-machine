import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleAdsApi, Customer, enums } from "google-ads-api";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { GoogleOAuthService } from "./google-oauth.service";
import {
  GoogleConnection,
  GoogleCustomer,
  isGoogleConnection,
} from "../entities/google-connection.entity";

interface CampaignCreateInput {
  name: string;
  budget: number;
  budgetType: "daily" | "total";
  biddingStrategy?: string;
  targetCpa?: number;
  targetRoas?: number;
  maxCpc?: number;
  locations?: string[];
  languages?: string[];
  startDate?: string;
  endDate?: string;
  templateId?: string; // ID do template salvo no banco para tracking via xcod
  status?: "ENABLED" | "PAUSED"; // Campaign status on publish (default: ENABLED)
}

interface AdGroupCreateInput {
  campaignId: string;
  name: string;
  keywords: Array<{
    text: string;
    matchType: "BROAD" | "PHRASE" | "EXACT";
  }>;
  ads: Array<{
    headlines: string[];
    descriptions: string[];
    finalUrl: string;
    path1?: string;
    path2?: string;
  }>;
}

interface SitelinkInput {
  text: string;
  finalUrl: string;
  description1?: string;
  description2?: string;
}

interface CalloutInput {
  text: string;
}

interface StructuredSnippetInput {
  header: string;
  values: string[];
}

interface ExtensionsInput {
  sitelinks?: SitelinkInput[];
  callouts?: CalloutInput[];
  structuredSnippets?: StructuredSnippetInput[];
}

interface GoogleAdsResult {
  success: boolean;
  campaignId?: string;
  adGroupId?: string;
  adId?: string;
  error?: string;
  adError?: string;
  warning?: string;
  keywordsAdded?: number;
  keywordsRejected?: number;
  rejectedKeywords?: string[];
}

// Keyword Planner interfaces
export interface KeywordMetrics {
  keyword: string;
  avgMonthlySearches: number | null;
  competition: "LOW" | "MEDIUM" | "HIGH" | "UNSPECIFIED" | null;
  competitionIndex: number | null; // 0-100
  lowTopOfPageBidMicros: number | null;
  highTopOfPageBidMicros: number | null;
}

export interface KeywordIdea {
  keyword: string;
  avgMonthlySearches: number | null;
  competition: "LOW" | "MEDIUM" | "HIGH" | "UNSPECIFIED" | null;
  competitionIndex: number | null;
  lowTopOfPageBidMicros: number | null;
  highTopOfPageBidMicros: number | null;
}

export interface KeywordMetricsResult {
  success: boolean;
  keywords?: KeywordMetrics[];
  error?: string;
}

export interface KeywordIdeasResult {
  success: boolean;
  ideas?: KeywordIdea[];
  error?: string;
}

/**
 * Metric filter type for GAQL query building (Filter Push-down)
 */
export interface GaqlMetricFilter {
  metric:
    | "impressions"
    | "clicks"
    | "conversions"
    | "cost"
    | "cpc"
    | "cpa"
    | "ctr"
    | "conversionRate"
    | "roas";
  operator: "gt" | "lt" | "eq" | "between";
  value: number;
  value2?: number;
}

@Injectable()
export class GoogleAdsApiService {
  private readonly logger = new Logger(GoogleAdsApiService.name);
  private supabase: SupabaseClient;
  private googleAdsApi: GoogleAdsApi | null = null;

  constructor(
    private configService: ConfigService,
    private googleOAuthService: GoogleOAuthService,
  ) {
    const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
    const supabaseServiceKey = this.configService.get<string>(
      "SUPABASE_SERVICE_KEY",
    );

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    this.initializeGoogleAdsApi();
  }

  /**
   * Initialize Google Ads API client
   */
  private initializeGoogleAdsApi(): void {
    // Try GOOGLE_ADS_ prefix first, fallback to GOOGLE_ prefix
    const clientId =
      this.configService.get<string>("GOOGLE_ADS_CLIENT_ID") ||
      this.configService.get<string>("GOOGLE_CLIENT_ID");
    const clientSecret =
      this.configService.get<string>("GOOGLE_ADS_CLIENT_SECRET") ||
      this.configService.get<string>("GOOGLE_CLIENT_SECRET");
    const developerToken = this.configService.get<string>(
      "GOOGLE_ADS_DEVELOPER_TOKEN",
    );

    if (!clientId || !clientSecret || !developerToken) {
      this.logger.warn(
        "Google Ads API credentials not fully configured. Missing: " +
          [
            !clientId && "GOOGLE_CLIENT_ID",
            !clientSecret && "GOOGLE_CLIENT_SECRET",
            !developerToken && "GOOGLE_ADS_DEVELOPER_TOKEN",
          ]
            .filter(Boolean)
            .join(", "),
      );
      return;
    }

    try {
      this.googleAdsApi = new GoogleAdsApi({
        client_id: clientId,
        client_secret: clientSecret,
        developer_token: developerToken,
      });
      this.logger.log("Google Ads API client initialized");
    } catch (error) {
      this.logger.error("Failed to initialize Google Ads API:", error);
    }
  }

  /**
   * Validate Google Ads API configuration
   */
  validateConfiguration(): { valid: boolean; message: string } {
    const clientId =
      this.configService.get<string>("GOOGLE_ADS_CLIENT_ID") ||
      this.configService.get<string>("GOOGLE_CLIENT_ID");
    const clientSecret =
      this.configService.get<string>("GOOGLE_ADS_CLIENT_SECRET") ||
      this.configService.get<string>("GOOGLE_CLIENT_SECRET");
    const developerToken = this.configService.get<string>(
      "GOOGLE_ADS_DEVELOPER_TOKEN",
    );

    if (!clientId || !clientSecret || !developerToken) {
      return {
        valid: false,
        message:
          "Google Ads API not fully configured. Missing: " +
          [
            !clientId && "GOOGLE_CLIENT_ID",
            !clientSecret && "GOOGLE_CLIENT_SECRET",
            !developerToken && "GOOGLE_ADS_DEVELOPER_TOKEN",
          ]
            .filter(Boolean)
            .join(", "),
      };
    }

    return {
      valid: true,
      message: "Google Ads API configuration is valid",
    };
  }

  /**
   * Get a Google Ads API customer client for a connection
   * @param connection - The Google connection to use
   * @param overrideCustomerId - Optional customer ID to use instead of the one in connection metadata
   * @param overrideLoginCustomerId - Optional login customer ID (MCC) to use
   */
  async getCustomerClient(
    connection: GoogleConnection,
    overrideCustomerId?: string,
    overrideLoginCustomerId?: string,
  ): Promise<Customer> {
    if (!this.googleAdsApi) {
      throw new BadRequestException("Google Ads API not configured");
    }

    // Check if token needs refresh
    if (this.googleOAuthService.isTokenExpired(connection.token_expires_at)) {
      this.logger.log(`Refreshing token for connection ${connection.id}`);
      await this.googleOAuthService.refreshAccessToken(connection.id);

      // Re-fetch connection with new token from existing connections table
      const { data: updatedConnection, error } = await this.supabase
        .from("connections")
        .select("*")
        .eq("id", connection.id)
        .eq("plataform_name", "google")
        .single();

      if (
        error ||
        !updatedConnection ||
        !isGoogleConnection(updatedConnection)
      ) {
        throw new InternalServerErrorException(
          "Failed to get refreshed connection",
        );
      }
      connection = updatedConnection as GoogleConnection;
    }

    // Use override customer ID if provided, otherwise fall back to connection metadata
    const customerId = overrideCustomerId || connection.metadata.customer_id;
    const loginCustomerId =
      overrideLoginCustomerId || connection.metadata.login_customer_id;

    if (!customerId) {
      throw new BadRequestException(
        "Connection does not have a Google Ads customer ID configured. Please select a Google Ads account in the wizard.",
      );
    }

    this.logger.log(`Creating customer client with:`);
    this.logger.log(`  - customer_id: ${customerId}`);
    this.logger.log(`  - login_customer_id: ${loginCustomerId || "not set"}`);

    const customer = this.googleAdsApi.Customer({
      customer_id: customerId,
      refresh_token: connection.refresh_token || "",
      login_customer_id: loginCustomerId || undefined,
    });

    return customer;
  }

  /**
   * List all accessible Google Ads accounts for a connection
   * This method doesn't require a pre-configured customer_id - it discovers all accessible accounts
   */
  async listAccessibleCustomers(
    connection: GoogleConnection,
  ): Promise<GoogleCustomer[]> {
    if (!this.googleAdsApi) {
      throw new BadRequestException("Google Ads API not configured");
    }

    // Check if token needs refresh
    if (this.googleOAuthService.isTokenExpired(connection.token_expires_at)) {
      this.logger.log(`Refreshing token for connection ${connection.id}`);
      await this.googleOAuthService.refreshAccessToken(connection.id);

      // Re-fetch connection with new token
      const { data: updatedConnection, error } = await this.supabase
        .from("connections")
        .select("*")
        .eq("id", connection.id)
        .eq("plataform_name", "google")
        .single();

      if (
        error ||
        !updatedConnection ||
        !isGoogleConnection(updatedConnection)
      ) {
        throw new InternalServerErrorException(
          "Failed to get refreshed connection",
        );
      }
      connection = updatedConnection as GoogleConnection;
    }

    try {
      // Use listAccessibleCustomers API - this doesn't require a customer_id
      // It returns all accounts the authenticated user has access to
      this.logger.log(
        `Calling listAccessibleCustomers for connection ${connection.id}...`,
      );

      // For test developer tokens, we may need to pass the MCC (login_customer_id)
      const loginCustomerId = this.configService.get<string>(
        "GOOGLE_ADS_LOGIN_CUSTOMER_ID",
      );
      if (loginCustomerId) {
        this.logger.log(`Using login_customer_id (MCC): ${loginCustomerId}`);
      }

      const response = await this.googleAdsApi.listAccessibleCustomers(
        connection.refresh_token || "",
      );

      const resourceNames = response.resource_names || [];
      this.logger.log(
        `Found ${resourceNames.length} accessible customer IDs: ${resourceNames.join(", ")}`,
      );

      if (resourceNames.length === 0) {
        return [];
      }

      // For each accessible customer, get their details
      const customers: GoogleCustomer[] = [];

      for (const resourceName of resourceNames) {
        // resourceName format: "customers/1234567890"
        const customerId = resourceName.replace("customers/", "");

        try {
          // Create a customer client for this specific account
          // For test tokens, we need login_customer_id to access sub-accounts
          const customer = this.googleAdsApi.Customer({
            customer_id: customerId,
            refresh_token: connection.refresh_token || "",
            login_customer_id: loginCustomerId || undefined,
          });

          // Query customer details
          const response = await customer.query(`
            SELECT
              customer.id,
              customer.descriptive_name,
              customer.currency_code,
              customer.time_zone,
              customer.manager
            FROM customer
            LIMIT 1
          `);

          if (response.length > 0) {
            const row = response[0];
            customers.push({
              customer_id: String(row.customer.id),
              name: row.customer.descriptive_name || `Account ${customerId}`,
              currency: row.customer.currency_code || "BRL",
              timezone: row.customer.time_zone || "America/Sao_Paulo",
              is_manager: row.customer.manager || false,
            });
          }
        } catch (customerError: any) {
          // Log but continue - some accounts might not be accessible for queries
          this.logger.warn(
            `Could not fetch details for customer ${customerId}: ${customerError.message}`,
          );
        }
      }

      this.logger.log(
        `Successfully retrieved details for ${customers.length} customers`,
      );
      return customers;
    } catch (error: any) {
      // The google-ads-api library wraps the gRPC error, so we need to dig into it
      this.logger.error("Failed to list accessible customers.");

      // Log all available error details
      if (error.statusDetails && Array.isArray(error.statusDetails)) {
        for (const detail of error.statusDetails) {
          this.logger.error(`Request ID: ${detail.request_id}`);
          if (detail.errors && Array.isArray(detail.errors)) {
            for (const err of detail.errors) {
              this.logger.error(
                `Google Ads Error: ${JSON.stringify(err, null, 2)}`,
              );
            }
          }
        }
      }

      // Try to extract meaningful error info
      const errorStr = String(error);
      const isPermissionDenied =
        errorStr.includes("PERMISSION_DENIED") ||
        error.code === 7 ||
        error.details?.includes("PERMISSION_DENIED") ||
        error.message?.includes("PERMISSION_DENIED");

      if (isPermissionDenied) {
        this.logger.error(
          "PERMISSION_DENIED error detected. This usually means:",
        );
        this.logger.error(
          "1. Developer Token is in Test mode and cannot access production accounts",
        );
        this.logger.error(
          "2. The test account is not properly configured in API Center",
        );
        this.logger.error(
          "3. OAuth credentials are from a different Google Cloud project",
        );

        throw new InternalServerErrorException(
          "Permissão negada ao acessar Google Ads. " +
            'O Developer Token está em modo "Test" e só pode acessar contas de teste. ' +
            'Para usar com contas reais, aplique para acesso "Basic" em: ' +
            "https://developers.google.com/google-ads/api/docs/access-levels",
        );
      }

      throw new InternalServerErrorException(
        `Failed to list Google Ads accounts: ${error.message || errorStr}`,
      );
    }
  }

  /**
   * Create a campaign in Google Ads
   * @param connection - The Google connection to use
   * @param input - Campaign creation input
   * @param dryRun - If true, only validate without creating
   * @param customerId - Optional customer ID to use (overrides connection metadata)
   * @param loginCustomerId - Optional MCC customer ID (required when accessing accounts managed by MCC)
   */
  async createCampaign(
    connection: GoogleConnection,
    input: CampaignCreateInput,
    dryRun = false,
    customerId?: string,
    loginCustomerId?: string,
  ): Promise<GoogleAdsResult> {
    try {
      // Log input for debugging
      this.logger.log(
        `Creating campaign with input: ${JSON.stringify(input, null, 2)}`,
      );
      this.logger.log(
        `Using customerId: ${customerId}, loginCustomerId: ${loginCustomerId || "not set"}`,
      );

      const customer = await this.getCustomerClient(
        connection,
        customerId,
        loginCustomerId,
      );

      // All campaigns created through the wizard are Search campaigns
      const advertisingChannelType = enums.AdvertisingChannelType.SEARCH;

      // Map bidding strategy to the actual strategy object
      // IMPORTANT: Google Ads API requires a bidding strategy to always be set
      // Default to MAXIMIZE_CLICKS (which maps to target_spend in the API)
      const biddingStrategy = input.biddingStrategy || "MAXIMIZE_CLICKS";
      this.logger.log(
        `Using bidding strategy: ${biddingStrategy} (original: ${input.biddingStrategy || "not set"})`,
      );

      const biddingStrategyConfig = this.getBiddingStrategyConfig(
        biddingStrategy,
        input.targetCpa,
        input.targetRoas,
        input.maxCpc,
      );

      // Validate required fields
      if (!input.name) {
        throw new Error("Campaign name is required");
      }
      if (!input.budget || input.budget <= 0) {
        throw new Error(
          "Campaign budget is required and must be greater than 0",
        );
      }

      // Validate bidding strategy config is not empty
      if (
        !biddingStrategyConfig ||
        Object.keys(biddingStrategyConfig).length === 0
      ) {
        this.logger.error(
          `Bidding strategy config is empty for strategy: ${biddingStrategy}`,
        );
        throw new Error(
          `Invalid bidding strategy configuration for: ${biddingStrategy}`,
        );
      }

      this.logger.log(
        `Mapped advertisingChannelType: ${advertisingChannelType}`,
      );
      this.logger.log(
        `Mapped biddingStrategyConfig: ${JSON.stringify(biddingStrategyConfig)}`,
      );

      if (dryRun) {
        this.logger.log(`Dry run: Would create campaign "${input.name}"`);
        return {
          success: true,
          campaignId: "dry-run-campaign-id",
        };
      }

      // Create campaign budget first
      // Note: amount_micros should be in micros (1 BRL = 1,000,000 micros)
      const budgetAmountMicros = Math.round(input.budget * 1_000_000);
      this.logger.log(
        `Creating budget: ${input.name} Budget, amount: ${budgetAmountMicros} micros`,
      );

      let budgetResourceName: string;
      try {
        const budgetResponse = await customer.campaignBudgets.create([
          {
            name: `${input.name} Budget - ${Date.now()}`, // Add timestamp to avoid duplicate names
            amount_micros: budgetAmountMicros,
            delivery_method: enums.BudgetDeliveryMethod.STANDARD,
            explicitly_shared: false, // Budget is not shared between campaigns
          },
        ]);
        budgetResourceName = budgetResponse.results[0].resource_name;
        this.logger.log(`Budget created: ${budgetResourceName}`);
      } catch (budgetError: any) {
        this.logger.error(
          `Failed to create budget: ${JSON.stringify(budgetError, null, 2)}`,
        );
        throw new Error(
          `Failed to create campaign budget: ${budgetError.message || JSON.stringify(budgetError)}`,
        );
      }

      // Format dates for Google Ads (YYYY-MM-DD format)
      const startDate =
        input.startDate || this.formatDateForGoogleAds(new Date());
      this.logger.log(`Creating campaign with start_date: ${startDate}`);

      // Create campaign
      let campaignResourceName: string;
      try {
        // Build UTM final URL suffix for tracking
        // This appends UTMs to all URLs in the campaign automatically
        const campaignSlug = input.name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .slice(0, 30);

        // Build the xcod parameter for internal tracking
        // Format: alvobot<delimiter>templateId<delimiter>campaignid<delimiter>adgroupid<delimiter>creative<delimiter>placement
        // Using 'xABx' as delimiter (unique pattern unlikely to appear in IDs)
        const templateId = input.templateId || "unknown";
        const xcodValue = `alvobotxABx${templateId}xABx{campaignid}xABx{adgroupid}xABx{creative}xABx{placement}`;

        const finalUrlSuffix = [
          "utm_source=google",
          `utm_campaign=${campaignSlug}|{campaignid}`,
          "utm_medium=cpc|{adgroupid}",
          "utm_content=ad|{creative}",
          "utm_term={placement}::{keyword}", // UTMify format: placement::keyword
          "keyword={keyword}",
          "device={device}",
          "network={network}",
          `xcod=${xcodValue}`, // AlvoBot internal tracking code
        ].join("&");

        const campaignData: any = {
          name: input.name,
          advertising_channel_type: advertisingChannelType,
          status:
            input.status === "PAUSED"
              ? enums.CampaignStatus.PAUSED
              : enums.CampaignStatus.ENABLED, // Respect user choice (default: ENABLED)
          campaign_budget: budgetResourceName,
          start_date: startDate,
          end_date: input.endDate || undefined,
          // UTM tracking - appended to all final URLs in this campaign
          final_url_suffix: finalUrlSuffix,
          // Required field for EU political advertising compliance
          // Using enum value 3 = DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING
          contains_eu_political_advertising:
            enums.EuPoliticalAdvertisingStatus
              .DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING,
          // Network settings for search
          network_settings: {
            target_google_search: true,
            target_search_network: false,
            target_content_network: false,
          },
          // Add the bidding strategy configuration
          ...biddingStrategyConfig,
        };

        this.logger.log(
          `Campaign data to create: ${JSON.stringify(campaignData, null, 2)}`,
        );

        const campaignResponse = await customer.campaigns.create([
          campaignData,
        ]);
        campaignResourceName = campaignResponse.results[0].resource_name;
        this.logger.log(`Campaign created: ${campaignResourceName}`);
      } catch (campaignError: any) {
        this.logger.error(
          `Failed to create campaign: ${JSON.stringify(campaignError, null, 2)}`,
        );
        throw new Error(
          `Failed to create campaign: ${campaignError.message || JSON.stringify(campaignError)}`,
        );
      }

      const campaignId = campaignResourceName.split("/").pop();

      // Add geo targeting if locations specified
      if (input.locations && input.locations.length > 0) {
        await this.addCampaignGeoTargets(
          customer,
          campaignResourceName,
          input.locations,
        );
      }

      // Add language targeting if specified
      if (input.languages && input.languages.length > 0) {
        await this.addCampaignLanguages(
          customer,
          campaignResourceName,
          input.languages,
        );
      }

      this.logger.log(
        `Created campaign ${campaignId} for connection ${connection.id}`,
      );

      // Update last used timestamp
      await this.supabase
        .from("connections")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", connection.id);

      return {
        success: true,
        campaignId,
      };
    } catch (error: any) {
      // Extract detailed error information from Google Ads API errors
      let errorMessage = "Failed to create campaign";
      let errorDetails = "";

      if (error.errors && Array.isArray(error.errors)) {
        // Google Ads API returns errors in an array
        errorDetails = error.errors
          .map((e: any) => {
            const msg =
              e.message || e.error_code?.toString() || JSON.stringify(e);
            return msg;
          })
          .join("; ");
        errorMessage = errorDetails || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === "object") {
        errorMessage = JSON.stringify(error, null, 2);
      }

      this.logger.error(`Failed to create campaign: ${errorMessage}`);
      if (error.stack) {
        this.logger.error(`Stack: ${error.stack}`);
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Create an ad group with keywords and ads
   * @param connection - The Google connection to use
   * @param input - Ad group creation input
   * @param dryRun - If true, only validate without creating
   * @param customerId - Optional customer ID to use (overrides connection metadata)
   * @param loginCustomerId - Optional MCC customer ID (required when accessing accounts managed by MCC)
   */
  async createAdGroup(
    connection: GoogleConnection,
    input: AdGroupCreateInput,
    dryRun = false,
    customerId?: string,
    loginCustomerId?: string,
  ): Promise<GoogleAdsResult> {
    try {
      const customer = await this.getCustomerClient(
        connection,
        customerId,
        loginCustomerId,
      );

      if (dryRun) {
        this.logger.log(`Dry run: Would create ad group "${input.name}"`);
        return {
          success: true,
          adGroupId: "dry-run-ad-group-id",
        };
      }

      // Use provided customerId or fall back to connection metadata
      const resolvedCustomerId = customerId || connection.metadata.customer_id;
      if (!resolvedCustomerId) {
        throw new BadRequestException(
          "Connection does not have a Google Ads customer ID",
        );
      }

      // Create ad group
      // Note: cpc_bid_micros is required for SEARCH_STANDARD ad groups
      // Default to 1 BRL (1,000,000 micros) if not specified
      const defaultBidMicros = 1_000_000; // 1 BRL

      this.logger.log(
        `Creating ad group "${input.name}" for campaign ${input.campaignId}`,
      );

      const adGroupData = {
        name: input.name,
        campaign: `customers/${resolvedCustomerId}/campaigns/${input.campaignId}`,
        status: enums.AdGroupStatus.ENABLED,
        type: enums.AdGroupType.SEARCH_STANDARD,
        cpc_bid_micros: defaultBidMicros,
      };

      this.logger.log(
        `Ad group data to create: ${JSON.stringify(adGroupData, null, 2)}`,
      );

      let adGroupResourceName: string;
      let adGroupId: string | undefined;

      try {
        const adGroupResponse = await customer.adGroups.create([adGroupData]);
        adGroupResourceName = adGroupResponse.results[0].resource_name;
        adGroupId = adGroupResourceName.split("/").pop();
        this.logger.log(`Ad group created: ${adGroupResourceName}`);
      } catch (adGroupError: any) {
        this.logger.error(
          `Failed to create ad group: ${JSON.stringify(adGroupError, null, 2)}`,
        );
        throw new Error(
          `Failed to create ad group: ${adGroupError.message || JSON.stringify(adGroupError)}`,
        );
      }

      // Add keywords
      let keywordsAdded = 0;
      let keywordsRejected = 0;
      let rejectedKeywords: string[] = [];
      if (input.keywords && input.keywords.length > 0) {
        this.logger.log(
          `Adding ${input.keywords.length} keywords to ad group...`,
        );
        try {
          const keywordResult = await this.addKeywordsToAdGroup(
            customer,
            adGroupResourceName,
            input.keywords,
          );
          keywordsAdded = keywordResult.added;
          keywordsRejected = keywordResult.rejected;
          rejectedKeywords = keywordResult.rejectedKeywords;
          this.logger.log(
            `Keywords processing complete: ${keywordsAdded} added, ${keywordsRejected} rejected`,
          );
        } catch (keywordError: any) {
          this.logger.error(
            `Failed to add keywords: ${JSON.stringify(keywordError, null, 2)}`,
          );
          // Continue even if keywords fail - ad group was created
        }
      }

      // Create responsive search ads
      let adId: string | undefined;
      let adError: string | undefined;
      if (input.ads && input.ads.length > 0) {
        this.logger.log(`Creating responsive search ad...`);
        this.logger.log(`Ad input: ${JSON.stringify(input.ads[0], null, 2)}`);
        try {
          adId = await this.createResponsiveSearchAd(
            customer,
            adGroupResourceName,
            input.ads[0],
          );
          this.logger.log(`Ad created: ${adId}`);
        } catch (error: any) {
          // Extract meaningful error message
          const errorDetails = error?.errors?.[0];
          if (errorDetails) {
            const errorCode =
              Object.keys(errorDetails.error_code || {})[0] || "UNKNOWN";
            const errorValue =
              Object.values(errorDetails.error_code || {})[0] || "";
            adError = `${errorCode}: ${errorValue} - ${errorDetails.message || "Failed to create ad"}`;
          } else {
            adError = error.message || "Failed to create ad";
          }
          this.logger.error(
            `Failed to create ad: ${JSON.stringify(error, null, 2)}`,
          );
          // Continue even if ad fails - ad group was created, but track the error
        }
      }

      this.logger.log(
        `Created ad group ${adGroupId} for campaign ${input.campaignId}`,
      );

      // Build warning message if there were any issues
      const warnings: string[] = [];
      if (adError) {
        warnings.push(`Ad failed: ${adError}`);
      }
      if (keywordsRejected > 0) {
        warnings.push(
          `${keywordsRejected} keywords rejected by Google Ads policy (${keywordsAdded} added successfully)`,
        );
      }

      return {
        success: true,
        adGroupId,
        adId,
        adError, // Include ad creation error if any
        warning: warnings.length > 0 ? warnings.join("; ") : undefined,
        keywordsAdded,
        keywordsRejected,
        rejectedKeywords:
          rejectedKeywords.length > 0 ? rejectedKeywords : undefined,
      };
    } catch (error: any) {
      this.logger.error("Failed to create ad group:", error);
      return {
        success: false,
        error: error.message || "Failed to create ad group",
      };
    }
  }

  // Complete mapping of ISO country codes to Google Ads geo target constant IDs
  // Source: https://developers.google.com/google-ads/api/reference/data/geotargets
  private static readonly GEO_TARGET_MAP: Record<string, string> = {
    // Americas
    AF: "2004",
    AL: "2008",
    DZ: "2012",
    AS: "2016",
    AD: "2020",
    AO: "2024",
    AI: "2660",
    AQ: "2010",
    AG: "2028",
    AR: "2032",
    AM: "2051",
    AW: "2533",
    AU: "2036",
    AT: "2040",
    AZ: "2031",
    BS: "2044",
    BH: "2048",
    BD: "2050",
    BB: "2052",
    BY: "2112",
    BE: "2056",
    BZ: "2084",
    BJ: "2204",
    BM: "2060",
    BT: "2064",
    BO: "2068",
    BQ: "2535",
    BA: "2070",
    BW: "2072",
    BR: "2076",
    VG: "2092",
    BN: "2096",
    BG: "2100",
    BF: "2854",
    BI: "2108",
    KH: "2116",
    CM: "2120",
    CA: "2124",
    CV: "2132",
    KY: "2136",
    CF: "2140",
    TD: "2148",
    CL: "2152",
    CN: "2156",
    CX: "2162",
    CC: "2166",
    CO: "2170",
    KM: "2174",
    CG: "2178",
    CD: "2180",
    CK: "2184",
    CR: "2188",
    CI: "2384",
    HR: "2191",
    CU: "2192",
    CW: "2531",
    CY: "2196",
    CZ: "2203",
    DK: "2208",
    DJ: "2262",
    DM: "2212",
    DO: "2214",
    EC: "2218",
    EG: "2818",
    SV: "2222",
    GQ: "2226",
    ER: "2232",
    EE: "2233",
    SZ: "2748",
    ET: "2231",
    FK: "2238",
    FO: "2234",
    FJ: "2242",
    FI: "2246",
    FR: "2250",
    GF: "2254",
    PF: "2258",
    TF: "2260",
    GA: "2266",
    GM: "2270",
    GE: "2268",
    DE: "2276",
    GH: "2288",
    GI: "2292",
    GR: "2300",
    GL: "2304",
    GD: "2308",
    GP: "2312",
    GU: "2316",
    GT: "2320",
    GG: "2831",
    GN: "2324",
    GW: "2624",
    GY: "2328",
    HT: "2332",
    VA: "2336",
    HN: "2340",
    HK: "2344",
    HU: "2348",
    IS: "2352",
    IN: "2356",
    ID: "2360",
    IR: "2364",
    IQ: "2368",
    IE: "2372",
    IM: "2833",
    IL: "2376",
    IT: "2380",
    JM: "2388",
    JP: "2392",
    JE: "2832",
    JO: "2400",
    KZ: "2398",
    KE: "2404",
    KI: "2296",
    KP: "2408",
    KR: "2410",
    KW: "2414",
    KG: "2417",
    LA: "2418",
    LV: "2428",
    LB: "2422",
    LS: "2426",
    LR: "2430",
    LY: "2434",
    LI: "2438",
    LT: "2440",
    LU: "2442",
    MO: "2446",
    MK: "2807",
    MG: "2450",
    MW: "2454",
    MY: "2458",
    MV: "2462",
    ML: "2466",
    MT: "2470",
    MH: "2584",
    MQ: "2474",
    MR: "2478",
    MU: "2480",
    YT: "2175",
    MX: "2484",
    FM: "2583",
    MD: "2498",
    MC: "2492",
    MN: "2496",
    ME: "2499",
    MS: "2500",
    MA: "2504",
    MZ: "2508",
    MM: "2104",
    NA: "2516",
    NR: "2520",
    NP: "2524",
    NL: "2528",
    NC: "2540",
    NZ: "2554",
    NI: "2558",
    NE: "2562",
    NG: "2566",
    NU: "2570",
    NF: "2574",
    MP: "2580",
    NO: "2578",
    OM: "2512",
    PK: "2586",
    PW: "2585",
    PS: "2275",
    PA: "2591",
    PG: "2598",
    PY: "2600",
    PE: "2604",
    PH: "2608",
    PN: "2612",
    PL: "2616",
    PT: "2620",
    PR: "2630",
    QA: "2634",
    RE: "2638",
    RO: "2642",
    RU: "2643",
    RW: "2646",
    BL: "2652",
    SH: "2654",
    KN: "2659",
    LC: "2662",
    MF: "2663",
    PM: "2666",
    VC: "2670",
    WS: "2882",
    SM: "2674",
    ST: "2678",
    SA: "2682",
    SN: "2686",
    RS: "2688",
    SC: "2690",
    SL: "2694",
    SG: "2702",
    SX: "2534",
    SK: "2703",
    SI: "2705",
    SB: "2090",
    SO: "2706",
    ZA: "2710",
    GS: "2239",
    SS: "2728",
    ES: "2724",
    LK: "2144",
    SD: "2736",
    SR: "2740",
    SJ: "2744",
    SE: "2752",
    CH: "2756",
    SY: "2760",
    TW: "2158",
    TJ: "2762",
    TZ: "2834",
    TH: "2764",
    TL: "2626",
    TG: "2768",
    TK: "2772",
    TO: "2776",
    TT: "2780",
    TN: "2788",
    TR: "2792",
    TM: "2795",
    TC: "2796",
    TV: "2798",
    UG: "2800",
    UA: "2804",
    AE: "2784",
    GB: "2826",
    US: "2840",
    UM: "2581",
    UY: "2858",
    UZ: "2860",
    VU: "2548",
    VE: "2862",
    VN: "2704",
    VI: "2850",
    WF: "2876",
    EH: "2732",
    YE: "2887",
    ZM: "2894",
    ZW: "2716",
    IO: "2086",
    BV: "2074",
    HM: "2334",
  };

  // Note: Language code to ID mapping is now done in the frontend using getLanguageId()
  // The backend only accepts numeric criterion IDs directly

  // Countries blocked by Google Ads due to sanctions/embargoes
  // These IDs will cause "INVALID_CRITERION_ID" errors if used
  private static readonly BLOCKED_GEO_TARGETS = new Set([
    "2192", // Cuba
    "2364", // Iran
    "2408", // North Korea
    "2760", // Syria
  ]);

  /**
   * Add geo targets to a campaign
   */
  private async addCampaignGeoTargets(
    customer: Customer,
    campaignResourceName: string,
    locationCodes: string[],
  ): Promise<void> {
    const geoTargets = locationCodes
      .map((code) => {
        // Check if it's already a numeric ID or needs mapping
        const upperCode = code.toUpperCase();
        const geoTargetId =
          GoogleAdsApiService.GEO_TARGET_MAP[upperCode] || code;

        // Validate that we have a valid numeric ID
        if (!/^\d+$/.test(geoTargetId)) {
          this.logger.warn(`Unknown geo target code: ${code}, skipping`);
          return null;
        }

        // Skip blocked/embargoed countries
        if (GoogleAdsApiService.BLOCKED_GEO_TARGETS.has(geoTargetId)) {
          this.logger.warn(
            `Blocked geo target (embargoed country): ${geoTargetId}, skipping`,
          );
          return null;
        }

        return {
          campaign: campaignResourceName,
          location: {
            geo_target_constant: `geoTargetConstants/${geoTargetId}`,
          },
        };
      })
      .filter((gt): gt is NonNullable<typeof gt> => gt !== null);

    this.logger.log(`Adding geo targets: ${JSON.stringify(geoTargets)}`);

    if (geoTargets.length > 0) {
      try {
        await customer.campaignCriteria.create(geoTargets);
        this.logger.log(`Geo targets added successfully`);
      } catch (error: any) {
        this.logger.error(
          `Failed to add geo targets: ${JSON.stringify(error, null, 2)}`,
        );
        throw error;
      }
    }
  }

  /**
   * Add language targeting to a campaign
   * Accepts numeric criterion IDs (e.g., "1014" for Portuguese, "1000" for English)
   * Note: Language code to ID conversion is done in the frontend
   */
  private async addCampaignLanguages(
    customer: Customer,
    campaignResourceName: string,
    languageIds: string[],
  ): Promise<void> {
    const languages = languageIds
      .map((id) => {
        // Validate that we have a valid numeric ID
        if (!/^\d+$/.test(id)) {
          this.logger.warn(
            `Invalid language ID: ${id} (must be numeric), skipping`,
          );
          return null;
        }

        return {
          campaign: campaignResourceName,
          language: {
            language_constant: `languageConstants/${id}`,
          },
        };
      })
      .filter((lang): lang is NonNullable<typeof lang> => lang !== null);

    this.logger.log(`Adding language targeting: ${JSON.stringify(languages)}`);

    if (languages.length > 0) {
      try {
        await customer.campaignCriteria.create(languages);
        this.logger.log(`Language targeting added successfully`);
      } catch (error: any) {
        this.logger.error(
          `Failed to add language targeting: ${JSON.stringify(error, null, 2)}`,
        );
        throw error;
      }
    }
  }

  /**
   * Add keywords to an ad group
   * Handles policy violations gracefully by trying individual keywords when batch fails
   */
  private async addKeywordsToAdGroup(
    customer: Customer,
    adGroupResourceName: string,
    keywords: Array<{ text: string; matchType: "BROAD" | "PHRASE" | "EXACT" }>,
  ): Promise<{ added: number; rejected: number; rejectedKeywords: string[] }> {
    const keywordCriteria = keywords.map((kw) => ({
      ad_group: adGroupResourceName,
      status: enums.AdGroupCriterionStatus.ENABLED,
      keyword: {
        text: kw.text,
        match_type: enums.KeywordMatchType[kw.matchType],
      },
    }));

    const result = {
      added: 0,
      rejected: 0,
      rejectedKeywords: [] as string[],
    };

    try {
      // Try to add all keywords at once
      await customer.adGroupCriteria.create(keywordCriteria);
      result.added = keywords.length;
      this.logger.log(
        `Successfully added all ${keywords.length} keywords in batch`,
      );
    } catch (batchError: any) {
      // Check if it's a policy violation error
      const isPolicyError = batchError?.errors?.some(
        (e: any) =>
          e.error_code?.policy_violation_error ||
          e.error_code?.criterion_error === "KEYWORD_NOT_ALLOWED",
      );

      if (isPolicyError) {
        this.logger.warn(
          `Batch keyword creation failed due to policy violations. Trying individual keywords...`,
        );

        // Try adding keywords one by one to identify which ones fail
        for (let i = 0; i < keywords.length; i++) {
          const kw = keywords[i];
          try {
            await customer.adGroupCriteria.create([
              {
                ad_group: adGroupResourceName,
                status: enums.AdGroupCriterionStatus.ENABLED,
                keyword: {
                  text: kw.text,
                  match_type: enums.KeywordMatchType[kw.matchType],
                },
              },
            ]);
            result.added++;
          } catch (singleError: any) {
            result.rejected++;
            result.rejectedKeywords.push(kw.text);

            // Log the specific policy violation
            const errorCode = singleError?.errors?.[0]?.error_code || {};
            const policyName =
              singleError?.errors?.[0]?.details?.policy_violation_details
                ?.external_policy_name ||
              singleError?.errors?.[0]?.details?.policy_violation_details?.key
                ?.policy_name ||
              "Unknown policy";
            this.logger.warn(
              `Keyword "${kw.text}" rejected - Policy: ${policyName}, Error: ${JSON.stringify(errorCode)}`,
            );
          }
        }

        this.logger.log(
          `Individual keyword processing complete: ${result.added} added, ${result.rejected} rejected`,
        );

        if (result.rejectedKeywords.length > 0) {
          this.logger.warn(
            `Rejected keywords: ${result.rejectedKeywords.slice(0, 10).join(", ")}${result.rejectedKeywords.length > 10 ? "..." : ""}`,
          );
        }
      } else {
        // Not a policy error, rethrow
        throw batchError;
      }
    }

    return result;
  }

  /**
   * Create a responsive search ad
   */
  private async createResponsiveSearchAd(
    customer: Customer,
    adGroupResourceName: string,
    ad: {
      headlines: string[];
      descriptions: string[];
      finalUrl: string;
      path1?: string;
      path2?: string;
    },
  ): Promise<string | undefined> {
    // Deduplicate and trim headlines (Google Ads rejects duplicate assets)
    const seenHeadlines = new Set<string>();
    const uniqueHeadlines = ad.headlines
      .map((text) => text.slice(0, 30).trim()) // Max 30 chars, trim whitespace
      .filter((text) => {
        if (!text || seenHeadlines.has(text.toLowerCase())) {
          return false;
        }
        seenHeadlines.add(text.toLowerCase());
        return true;
      })
      .slice(0, 15); // Max 15 headlines

    // Deduplicate and trim descriptions
    const seenDescriptions = new Set<string>();
    const uniqueDescriptions = ad.descriptions
      .map((text) => text.slice(0, 90).trim()) // Max 90 chars, trim whitespace
      .filter((text) => {
        if (!text || seenDescriptions.has(text.toLowerCase())) {
          return false;
        }
        seenDescriptions.add(text.toLowerCase());
        return true;
      })
      .slice(0, 4); // Max 4 descriptions

    // Log if duplicates were removed
    if (uniqueHeadlines.length < ad.headlines.length) {
      this.logger.log(
        `Removed ${ad.headlines.length - uniqueHeadlines.length} duplicate headlines`,
      );
    }
    if (uniqueDescriptions.length < ad.descriptions.length) {
      this.logger.log(
        `Removed ${ad.descriptions.length - uniqueDescriptions.length} duplicate descriptions`,
      );
    }

    // Ensure minimum requirements (3 headlines, 2 descriptions)
    if (uniqueHeadlines.length < 3) {
      throw new Error(
        `Not enough unique headlines: ${uniqueHeadlines.length} (minimum 3 required)`,
      );
    }
    if (uniqueDescriptions.length < 2) {
      throw new Error(
        `Not enough unique descriptions: ${uniqueDescriptions.length} (minimum 2 required)`,
      );
    }

    // Validate and clean the final URL
    let cleanFinalUrl = ad.finalUrl?.trim();
    if (!cleanFinalUrl) {
      throw new Error("Final URL is required");
    }

    // Remove any UTM parameters from stored URL (they should be applied via final_url_suffix)
    try {
      const urlObj = new URL(cleanFinalUrl);
      // Remove UTM params to prevent URL_TOO_LONG errors
      const paramsToRemove = [
        "utm_source",
        "utm_campaign",
        "utm_medium",
        "utm_content",
        "utm_term",
        "keyword",
        "device",
        "network",
      ];
      paramsToRemove.forEach((param) => urlObj.searchParams.delete(param));
      cleanFinalUrl = urlObj.toString();
      // Remove trailing ? if no params left
      if (cleanFinalUrl.endsWith("?")) {
        cleanFinalUrl = cleanFinalUrl.slice(0, -1);
      }
    } catch {
      throw new Error(`Invalid URL format: ${cleanFinalUrl}`);
    }

    // Check URL length (Google Ads limit is 2048 characters)
    if (cleanFinalUrl.length > 2048) {
      throw new Error(
        `URL too long: ${cleanFinalUrl.length} characters (max 2048)`,
      );
    }

    const headlines = uniqueHeadlines.map((text) => ({ text }));
    const descriptions = uniqueDescriptions.map((text) => ({ text }));

    this.logger.log(`Creating ad with clean URL: ${cleanFinalUrl}`);

    // Use adGroupAds.create for creating ads (not customer.ads.create)
    const adResponse = await customer.adGroupAds.create([
      {
        ad_group: adGroupResourceName,
        status: enums.AdGroupAdStatus.ENABLED,
        ad: {
          responsive_search_ad: {
            headlines,
            descriptions,
            path1: ad.path1?.slice(0, 15),
            path2: ad.path2?.slice(0, 15),
          },
          final_urls: [cleanFinalUrl],
        },
      },
    ]);

    const adResourceName = adResponse.results[0].resource_name;
    return adResourceName.split("/").pop();
  }

  /**
   * Map goal to Google Ads channel type
   */
  // Note: mapGoalToChannelType was removed because campaign goals are UI-only concepts
  // in Google Ads. The wizard always creates Search campaigns.

  /**
   * Get bidding strategy configuration object for the Google Ads API
   *
   * Based on official Google Ads API documentation (2024-2025):
   * - https://developers.google.com/google-ads/api/docs/campaigns/bidding/assign-strategies
   * - https://github.com/googleapis/googleapis/blob/master/google/ads/googleads/v19/resources/campaign.proto
   *
   * The campaign_bidding_strategy oneof field includes these standard strategies:
   *   - target_spend (field 27) - "Maximize Clicks" functionality
   *   - maximize_conversions (field 30)
   *   - maximize_conversion_value (field 31)
   *   - target_cpa (field 26)
   *   - target_roas (field 29)
   *   - manual_cpc (field 24)
   *   - target_impression_share (field 48)
   *
   * IMPORTANT: There is NO "maximize_clicks" field. Use "target_spend" instead.
   * When embedding the strategy directly on the campaign, you only need the
   * strategy object (e.g., { target_spend: {} }), NOT bidding_strategy_type.
   *
   * @param strategy - The bidding strategy name from frontend
   * @param targetCpa - Optional target CPA in currency units (will be converted to micros)
   * @param targetRoas - Optional target ROAS (e.g., 4.0 for 400% return)
   * @param maxCpc - Optional max CPC in currency units (for target_spend cpc_bid_ceiling)
   */
  private getBiddingStrategyConfig(
    strategy: string,
    targetCpa?: number,
    targetRoas?: number,
    maxCpc?: number,
  ): Record<string, any> {
    // Convert to micros (1 unit = 1,000,000 micros)
    const targetCpaMicros = targetCpa
      ? Math.round(targetCpa * 1_000_000)
      : undefined;
    const maxCpcMicros = maxCpc ? Math.round(maxCpc * 1_000_000) : undefined;

    this.logger.log(`Getting bidding strategy config for: ${strategy}`);

    switch (strategy) {
      case "MAXIMIZE_CLICKS":
        // "Maximize Clicks" uses target_spend in the API
        // See: https://developers.google.com/google-ads/api/docs/campaigns/bidding/strategy-types
        if (maxCpcMicros) {
          return {
            target_spend: {
              cpc_bid_ceiling_micros: maxCpcMicros,
            },
          };
        }
        return {
          target_spend: {},
        };

      case "MAXIMIZE_CONVERSIONS":
        // MaximizeConversions with optional target CPA
        if (targetCpaMicros) {
          return {
            maximize_conversions: {
              target_cpa_micros: targetCpaMicros,
            },
          };
        }
        return {
          maximize_conversions: {},
        };

      case "MAXIMIZE_CONVERSION_VALUE":
        // MaximizeConversionValue with optional target ROAS
        if (targetRoas) {
          return {
            maximize_conversion_value: {
              target_roas: targetRoas,
            },
          };
        }
        return {
          maximize_conversion_value: {},
        };

      case "TARGET_CPA":
        return {
          target_cpa: {
            target_cpa_micros: targetCpaMicros || 10_000_000, // Default to 10 if not specified
          },
        };

      case "TARGET_ROAS":
        // Note: Pure TARGET_ROAS strategy requires conversion history with values.
        // For new campaigns, we use MAXIMIZE_CONVERSION_VALUE with target_roas instead.
        return {
          maximize_conversion_value: {
            target_roas: targetRoas || 3.0, // Default 300% ROAS
          },
        };

      case "TARGET_SPEND":
        // Same as MAXIMIZE_CLICKS
        if (maxCpcMicros) {
          return {
            target_spend: {
              cpc_bid_ceiling_micros: maxCpcMicros,
            },
          };
        }
        return {
          target_spend: {},
        };

      case "MANUAL_CPC":
        return {
          manual_cpc: {
            enhanced_cpc_enabled: false,
          },
        };

      case "ENHANCED_CPC":
        // Enhanced CPC is MANUAL_CPC with enhanced_cpc_enabled = true
        return {
          manual_cpc: {
            enhanced_cpc_enabled: true,
          },
        };

      case "TARGET_IMPRESSION_SHARE":
        return {
          target_impression_share: {
            location: enums.TargetImpressionShareLocation.ANYWHERE_ON_PAGE,
            location_fraction_micros: 500_000, // 50%
          },
        };

      default:
        // Default to target_spend (Maximize Clicks) as safest option
        this.logger.warn(
          `Unknown bidding strategy: ${strategy}, defaulting to target_spend (maximize clicks)`,
        );
        return {
          target_spend: {},
        };
    }
  }

  /**
   * Map bidding strategy (DEPRECATED - use getBiddingStrategyConfig instead)
   * Kept for reference of enum values
   * Note: Using numeric values from Google Ads API enums
   */
  private mapBiddingStrategy(strategy: string): number {
    // BiddingStrategyType enum values from Google Ads API
    const biddingStrategies: Record<string, number> = {
      MANUAL_CPC: 1,
      MANUAL_CPM: 2,
      MANUAL_CPV: 13,
      MAXIMIZE_CONVERSIONS: 10,
      MAXIMIZE_CONVERSION_VALUE: 11,
      TARGET_CPA: 6,
      TARGET_IMPRESSION_SHARE: 15,
      TARGET_ROAS: 8,
      TARGET_SPEND: 9,
      PERCENT_CPC: 12,
      TARGET_CPM: 14,
    };

    return biddingStrategies[strategy] || biddingStrategies.TARGET_SPEND;
  }

  /**
   * Map bidding strategy enum value (number or string) to string name
   * Google Ads API returns enums as numbers, this converts them to readable names
   */
  private mapBiddingStrategyEnumToString(
    value: number | string | undefined,
  ): string | undefined {
    if (value === undefined || value === null) return undefined;

    // If it's already a string name (e.g., 'MAXIMIZE_CONVERSIONS'), return it
    if (typeof value === "string" && isNaN(Number(value))) {
      return value;
    }

    // Map numeric enum values to string names
    const enumToString: Record<number, string> = {
      0: "UNSPECIFIED",
      1: "MANUAL_CPC",
      2: "MANUAL_CPM",
      3: "MANUAL_CPV",
      4: "MAXIMIZE_CONVERSIONS",
      5: "MAXIMIZE_CONVERSION_VALUE",
      6: "TARGET_CPA",
      7: "TARGET_CPM",
      8: "TARGET_ROAS",
      9: "TARGET_SPEND",
      10: "MAXIMIZE_CONVERSIONS",
      11: "MAXIMIZE_CONVERSION_VALUE",
      12: "PERCENT_CPC",
      13: "MANUAL_CPV",
      14: "TARGET_CPM",
      15: "TARGET_IMPRESSION_SHARE",
    };

    const numValue = typeof value === "string" ? parseInt(value, 10) : value;
    return enumToString[numValue] || `UNKNOWN_${numValue}`;
  }

  /**
   * Format date for Google Ads API (YYYY-MM-DD)
   */
  private formatDateForGoogleAds(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  /**
   * Validate campaign data before creation
   */
  validateCampaignData(input: CampaignCreateInput): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!input.name || input.name.length === 0) {
      errors.push("Campaign name is required");
    }
    if (input.name && input.name.length > 255) {
      errors.push("Campaign name must be 255 characters or less");
    }
    if (!input.budget || input.budget <= 0) {
      errors.push("Budget must be greater than 0");
    }
    if (input.budget && input.budget < 1) {
      errors.push("Minimum budget is R$1.00");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate ad group data before creation
   */
  validateAdGroupData(input: AdGroupCreateInput): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!input.name || input.name.length === 0) {
      errors.push("Ad group name is required");
    }
    if (!input.campaignId) {
      errors.push("Campaign ID is required");
    }
    if (!input.keywords || input.keywords.length === 0) {
      errors.push("At least one keyword is required");
    }
    if (!input.ads || input.ads.length === 0) {
      errors.push("At least one ad is required");
    }

    // Validate ad requirements
    if (input.ads && input.ads.length > 0) {
      const ad = input.ads[0];
      if (!ad.headlines || ad.headlines.length < 3) {
        errors.push("At least 3 headlines are required");
      }
      if (!ad.descriptions || ad.descriptions.length < 2) {
        errors.push("At least 2 descriptions are required");
      }
      if (!ad.finalUrl) {
        errors.push("Final URL is required");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Update campaign status (pause/resume/enable)
   * @param connection - The Google connection to use
   * @param campaignId - The campaign ID to update
   * @param status - The new status
   * @param customerId - Optional customer ID to use (overrides connection metadata)
   */
  async updateCampaignStatus(
    connection: GoogleConnection,
    campaignId: string,
    status: "ENABLED" | "PAUSED" | "REMOVED",
    customerId?: string,
  ): Promise<GoogleAdsResult> {
    try {
      const customer = await this.getCustomerClient(connection, customerId);

      // Use provided customerId or fall back to connection metadata
      const resolvedCustomerId = customerId || connection.metadata.customer_id;
      if (!resolvedCustomerId) {
        throw new BadRequestException(
          "Connection does not have a Google Ads customer ID",
        );
      }

      const campaignResourceName = `customers/${resolvedCustomerId}/campaigns/${campaignId}`;

      // Map status to enum
      const statusEnum = enums.CampaignStatus[status];

      // Update campaign status
      await customer.campaigns.update([
        {
          resource_name: campaignResourceName,
          status: statusEnum,
        },
      ]);

      this.logger.log(`Updated campaign ${campaignId} status to ${status}`);

      // Update last used timestamp
      await this.supabase
        .from("connections")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", connection.id);

      return {
        success: true,
        campaignId,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to update campaign status: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        error: error.message || "Failed to update campaign status",
      };
    }
  }

  /**
   * List managed accounts under an MCC
   * @param connection - The Google connection to use
   * @param mccCustomerId - The MCC account to query
   * @param loginCustomerId - The root MCC ID for authentication (for nested MCCs).
   *                          If not provided, defaults to mccCustomerId.
   *                          For nested MCCs (MCC inside MCC), the login_customer_id
   *                          must be the root/top-level MCC that has direct access.
   */
  async listManagedAccounts(
    connection: GoogleConnection,
    mccCustomerId: string,
    loginCustomerId?: string,
  ): Promise<GoogleCustomer[]> {
    if (!this.googleAdsApi) {
      throw new BadRequestException("Google Ads API not configured");
    }

    // Use the provided loginCustomerId or default to mccCustomerId
    const effectiveLoginCustomerId = loginCustomerId || mccCustomerId;

    // Check if token needs refresh
    if (this.googleOAuthService.isTokenExpired(connection.token_expires_at)) {
      this.logger.log(`Refreshing token for connection ${connection.id}`);
      await this.googleOAuthService.refreshAccessToken(connection.id);

      // Re-fetch connection with new token
      const { data: updatedConnection, error } = await this.supabase
        .from("connections")
        .select("*")
        .eq("id", connection.id)
        .eq("plataform_name", "google")
        .single();

      if (
        error ||
        !updatedConnection ||
        !isGoogleConnection(updatedConnection)
      ) {
        throw new InternalServerErrorException(
          "Failed to get refreshed connection",
        );
      }
      connection = updatedConnection as GoogleConnection;
    }

    try {
      this.logger.log(
        `Listing managed accounts for MCC ${mccCustomerId} (login_customer_id: ${effectiveLoginCustomerId})...`,
      );

      // Create a customer client for the MCC account
      // For nested MCCs, we need to use the root MCC as login_customer_id
      // but query the specific sub-MCC
      const mccCustomer = this.googleAdsApi.Customer({
        customer_id: mccCustomerId,
        refresh_token: connection.refresh_token || "",
        login_customer_id: effectiveLoginCustomerId,
      });

      // Query customer_client to get all managed accounts
      // This is a specific resource for MCC accounts that lists their client accounts
      // level = 1 means direct children of this MCC
      const response = await mccCustomer.query(`
        SELECT
          customer_client.client_customer,
          customer_client.descriptive_name,
          customer_client.currency_code,
          customer_client.time_zone,
          customer_client.manager,
          customer_client.level,
          customer_client.hidden
        FROM customer_client
        WHERE customer_client.level = 1
          AND customer_client.hidden = false
      `);

      const managedAccounts: GoogleCustomer[] = [];

      for (const row of response) {
        // Extract customer ID from resource name (format: "customers/1234567890")
        const clientCustomerResourceName = row.customer_client.client_customer;
        const clientCustomerId = clientCustomerResourceName.split("/").pop();

        managedAccounts.push({
          customer_id: clientCustomerId,
          name:
            row.customer_client.descriptive_name ||
            `Account ${clientCustomerId}`,
          currency: row.customer_client.currency_code || "BRL",
          timezone: row.customer_client.time_zone || "America/Sao_Paulo",
          is_manager: row.customer_client.manager || false,
        });
      }

      this.logger.log(
        `Found ${managedAccounts.length} managed accounts under MCC ${mccCustomerId}`,
      );
      return managedAccounts;
    } catch (error: any) {
      this.logger.error(
        `Failed to list managed accounts for MCC ${mccCustomerId}: ${error.message}`,
      );

      // Check if this might not be an MCC account
      if (
        error.message?.includes("PERMISSION_DENIED") ||
        error.message?.includes("customer_client")
      ) {
        throw new BadRequestException(
          "Esta conta não é uma conta gerenciadora (MCC) ou não tem permissão para listar contas gerenciadas.",
        );
      }

      throw new InternalServerErrorException(
        `Failed to list managed accounts: ${error.message}`,
      );
    }
  }

  /**
   * Get campaign status from Google Ads
   * @param connection - The Google connection to use
   * @param campaignId - The campaign ID to check
   * @param customerId - Optional customer ID to use (overrides connection metadata)
   */
  async getCampaignStatus(
    connection: GoogleConnection,
    campaignId: string,
    customerId?: string,
  ): Promise<{ success: boolean; status?: string; error?: string }> {
    try {
      const customer = await this.getCustomerClient(connection, customerId);

      const resolvedCustomerId = customerId || connection.metadata.customer_id;
      if (!resolvedCustomerId) {
        throw new BadRequestException(
          "Connection does not have a Google Ads customer ID",
        );
      }

      const response = await customer.query(`
        SELECT
          campaign.id,
          campaign.name,
          campaign.status
        FROM campaign
        WHERE campaign.id = ${campaignId}
      `);

      if (response.length === 0) {
        return {
          success: false,
          error: "Campaign not found",
        };
      }

      const campaign = response[0];
      return {
        success: true,
        status: String(campaign.campaign.status),
      };
    } catch (error: any) {
      this.logger.error(`Failed to get campaign status: ${error.message}`);
      return {
        success: false,
        error: error.message || "Failed to get campaign status",
      };
    }
  }

  /**
   * Get keyword metrics (search volume, competition, CPC) for a list of keywords
   * Uses Google Ads Keyword Planner API - GenerateKeywordHistoricalMetrics
   * @param connection - The Google connection to use
   * @param keywords - Array of keyword strings to get metrics for
   * @param geoTargetConstants - Optional geo target constant IDs (e.g., ['2076'] for Brazil)
   * @param languageId - Optional language constant ID (e.g., '1014' for Portuguese)
   * @param customerId - Optional customer ID to use
   * @param loginCustomerId - Optional MCC customer ID
   */
  async getKeywordMetrics(
    connection: GoogleConnection,
    keywords: string[],
    geoTargetConstants?: string[],
    languageId?: string,
    customerId?: string,
    loginCustomerId?: string,
  ): Promise<KeywordMetricsResult> {
    if (!this.googleAdsApi) {
      return {
        success: false,
        error: "Google Ads API not configured",
      };
    }

    if (!keywords || keywords.length === 0) {
      return {
        success: false,
        error: "No keywords provided",
      };
    }

    try {
      const customer = await this.getCustomerClient(
        connection,
        customerId,
        loginCustomerId,
      );

      // Use provided customerId or fall back to connection metadata
      const resolvedCustomerId = customerId || connection.metadata.customer_id;
      if (!resolvedCustomerId) {
        return {
          success: false,
          error: "Connection does not have a Google Ads customer ID",
        };
      }

      // Build geo targeting
      const geoTargets = geoTargetConstants?.map(
        (id) => `geoTargetConstants/${id}`,
      ) || ["geoTargetConstants/2076"]; // Default: Brazil
      const language = languageId
        ? `languageConstants/${languageId}`
        : "languageConstants/1014"; // Default: Portuguese

      this.logger.log(
        `Getting keyword metrics for ${keywords.length} keywords...`,
      );
      this.logger.log(`Geo targets: ${geoTargets.join(", ")}`);
      this.logger.log(`Language: ${language}`);

      // Call Keyword Planner service to get historical metrics
      // Note: The google-ads-api library may not have direct typing for KeywordPlanIdeaService
      // We'll use the report query approach for keyword metrics
      const keywordMetrics: KeywordMetrics[] = [];

      // For historical metrics, we use the keyword_plan_historical_metrics method
      // But first, let's try using generateKeywordHistoricalMetrics through the REST endpoint
      // Since the library might not expose this directly, we'll use a workaround

      // Alternative: Use KeywordPlanService if available, or use search terms report
      // For now, let's provide mock data structure and try the API call

      try {
        // The google-ads-api library provides keywordPlanIdea service
        // We need to access it through the customer object
        const keywordPlanService = (customer as any).keywordPlanIdeas;

        if (
          keywordPlanService &&
          typeof keywordPlanService.generateKeywordHistoricalMetrics ===
            "function"
        ) {
          const response =
            await keywordPlanService.generateKeywordHistoricalMetrics({
              customer_id: resolvedCustomerId,
              keywords: keywords,
              geo_target_constants: geoTargets,
              language: language,
              keyword_plan_network: 2, // GOOGLE_SEARCH
            });

          if (response && response.results) {
            for (const result of response.results) {
              const metrics = result.keyword_metrics || {};
              keywordMetrics.push({
                keyword: result.text || "",
                avgMonthlySearches: metrics.avg_monthly_searches
                  ? Number(metrics.avg_monthly_searches)
                  : null,
                competition: this.mapCompetitionLevel(metrics.competition),
                competitionIndex: metrics.competition_index
                  ? Number(metrics.competition_index)
                  : null,
                lowTopOfPageBidMicros: metrics.low_top_of_page_bid_micros
                  ? Number(metrics.low_top_of_page_bid_micros)
                  : null,
                highTopOfPageBidMicros: metrics.high_top_of_page_bid_micros
                  ? Number(metrics.high_top_of_page_bid_micros)
                  : null,
              });
            }
          }
        } else {
          // Fallback: Try using REST API directly or return empty metrics
          this.logger.warn(
            "KeywordPlanIdeas service not available, returning empty metrics",
          );

          // Return keywords with null metrics as a fallback
          for (const keyword of keywords) {
            keywordMetrics.push({
              keyword,
              avgMonthlySearches: null,
              competition: null,
              competitionIndex: null,
              lowTopOfPageBidMicros: null,
              highTopOfPageBidMicros: null,
            });
          }
        }
      } catch (apiError: any) {
        this.logger.error(`Keyword Planner API error: ${apiError.message}`);

        // Check for specific error types
        if (apiError.message?.includes("PERMISSION_DENIED")) {
          return {
            success: false,
            error:
              "Permissão negada para acessar o Keyword Planner. Verifique se o Developer Token tem acesso básico.",
          };
        }

        // Return keywords without metrics as fallback
        for (const keyword of keywords) {
          keywordMetrics.push({
            keyword,
            avgMonthlySearches: null,
            competition: null,
            competitionIndex: null,
            lowTopOfPageBidMicros: null,
            highTopOfPageBidMicros: null,
          });
        }
      }

      this.logger.log(
        `Retrieved metrics for ${keywordMetrics.length} keywords`,
      );

      return {
        success: true,
        keywords: keywordMetrics,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get keyword metrics: ${error.message}`);
      return {
        success: false,
        error: error.message || "Failed to get keyword metrics",
      };
    }
  }

  /**
   * Generate keyword ideas from seed keywords or URL
   * Uses Google Ads Keyword Planner API - GenerateKeywordIdeas
   * @param connection - The Google connection to use
   * @param seedKeywords - Array of seed keyword strings
   * @param url - Optional URL to analyze for keyword ideas
   * @param geoTargetConstants - Optional geo target constant IDs
   * @param languageId - Optional language constant ID
   * @param customerId - Optional customer ID to use
   * @param loginCustomerId - Optional MCC customer ID
   */
  async generateKeywordIdeas(
    connection: GoogleConnection,
    seedKeywords?: string[],
    url?: string,
    geoTargetConstants?: string[],
    languageId?: string,
    customerId?: string,
    loginCustomerId?: string,
  ): Promise<KeywordIdeasResult> {
    if (!this.googleAdsApi) {
      return {
        success: false,
        error: "Google Ads API not configured",
      };
    }

    if ((!seedKeywords || seedKeywords.length === 0) && !url) {
      return {
        success: false,
        error: "Either seed keywords or URL must be provided",
      };
    }

    try {
      const customer = await this.getCustomerClient(
        connection,
        customerId,
        loginCustomerId,
      );

      const resolvedCustomerId = customerId || connection.metadata.customer_id;
      if (!resolvedCustomerId) {
        return {
          success: false,
          error: "Connection does not have a Google Ads customer ID",
        };
      }

      // Build geo targeting
      const geoTargets = geoTargetConstants?.map(
        (id) => `geoTargetConstants/${id}`,
      ) || ["geoTargetConstants/2076"];
      const language = languageId
        ? `languageConstants/${languageId}`
        : "languageConstants/1014";

      this.logger.log(`Generating keyword ideas...`);
      this.logger.log(`Seed keywords: ${seedKeywords?.join(", ") || "none"}`);
      this.logger.log(`URL: ${url || "none"}`);

      const keywordIdeas: KeywordIdea[] = [];

      try {
        const keywordPlanService = (customer as any).keywordPlanIdeas;

        if (
          keywordPlanService &&
          typeof keywordPlanService.generateKeywordIdeas === "function"
        ) {
          const requestParams: any = {
            customer_id: resolvedCustomerId,
            geo_target_constants: geoTargets,
            language: language,
            keyword_plan_network: 2, // GOOGLE_SEARCH
            include_adult_keywords: false,
            page_size: 3000, // Request more keywords for better sorting by volume
          };

          // Add seed keywords or URL
          if (seedKeywords && seedKeywords.length > 0) {
            requestParams.keyword_seed = {
              keywords: seedKeywords,
            };
          }
          if (url) {
            requestParams.url_seed = {
              url: url,
            };
          }

          const response =
            await keywordPlanService.generateKeywordIdeas(requestParams);

          // The response can be either:
          // 1. An array directly (newer API versions)
          // 2. An object with .results property (older API versions)
          // 3. An iterable/array-like object with numeric keys
          let results: any[] = [];

          if (Array.isArray(response)) {
            results = response;
          } else if (response && response.results) {
            results = response.results;
          } else if (
            response &&
            typeof response[Symbol.iterator] === "function"
          ) {
            // It's iterable (like an array-like object)
            results = Array.from(response);
          } else if (response && typeof response === "object") {
            // It's an object with numeric keys (array-like)
            const keys = Object.keys(response).filter((k) => !isNaN(Number(k)));
            if (keys.length > 0) {
              results = keys.map((k) => response[k]);
            }
          }

          for (const result of results) {
            const metrics =
              result.keyword_idea_metrics || result.keywordIdeaMetrics || {};
            const keyword = result.text || result.keyword || "";
            if (keyword) {
              keywordIdeas.push({
                keyword: keyword,
                avgMonthlySearches:
                  (metrics.avg_monthly_searches ?? metrics.avgMonthlySearches)
                    ? Number(
                        metrics.avg_monthly_searches ??
                          metrics.avgMonthlySearches,
                      )
                    : null,
                competition: this.mapCompetitionLevel(metrics.competition),
                competitionIndex:
                  (metrics.competition_index ?? metrics.competitionIndex)
                    ? Number(
                        metrics.competition_index ?? metrics.competitionIndex,
                      )
                    : null,
                lowTopOfPageBidMicros:
                  (metrics.low_top_of_page_bid_micros ??
                  metrics.lowTopOfPageBidMicros)
                    ? Number(
                        metrics.low_top_of_page_bid_micros ??
                          metrics.lowTopOfPageBidMicros,
                      )
                    : null,
                highTopOfPageBidMicros:
                  (metrics.high_top_of_page_bid_micros ??
                  metrics.highTopOfPageBidMicros)
                    ? Number(
                        metrics.high_top_of_page_bid_micros ??
                          metrics.highTopOfPageBidMicros,
                      )
                    : null,
              });
            }
          }
        } else {
          this.logger.warn(
            "KeywordPlanIdeas.generateKeywordIdeas not available",
          );
          return {
            success: false,
            error:
              "Keyword Planner API not available. Please ensure you have the required API access level.",
          };
        }
      } catch (apiError: any) {
        this.logger.error(`Keyword Planner API error: ${apiError.message}`);

        if (apiError.message?.includes("PERMISSION_DENIED")) {
          return {
            success: false,
            error:
              'Permissão negada para acessar o Keyword Planner. O Developer Token precisa ter nível de acesso "Basic" ou superior.',
          };
        }

        return {
          success: false,
          error: `Erro ao gerar ideias de keywords: ${apiError.message}`,
        };
      }

      this.logger.log(`Generated ${keywordIdeas.length} keyword ideas`);

      return {
        success: true,
        ideas: keywordIdeas,
      };
    } catch (error: any) {
      this.logger.error(`Failed to generate keyword ideas: ${error.message}`);
      return {
        success: false,
        error: error.message || "Failed to generate keyword ideas",
      };
    }
  }

  /**
   * Map competition level enum to string
   */
  private mapCompetitionLevel(
    competition: any,
  ): "LOW" | "MEDIUM" | "HIGH" | "UNSPECIFIED" | null {
    if (!competition) return null;

    // Handle both numeric and string values
    const competitionValue =
      typeof competition === "number" ? competition : String(competition);

    switch (competitionValue) {
      case 2:
      case "2":
      case "LOW":
        return "LOW";
      case 3:
      case "3":
      case "MEDIUM":
        return "MEDIUM";
      case 4:
      case "4":
      case "HIGH":
        return "HIGH";
      default:
        return "UNSPECIFIED";
    }
  }

  // Note: Geo target and language mappings are handled in the frontend
  // The backend receives numeric criterion IDs directly from the google_geo_targets and google_languages tables

  /**
   * Create campaign-level extensions (sitelinks, callouts, structured snippets)
   * Uses the Asset-based extension system (v13+)
   */
  async createCampaignExtensions(
    connection: GoogleConnection,
    campaignId: string,
    extensions: ExtensionsInput,
    dryRun = false,
    customerId?: string,
    loginCustomerId?: string,
  ): Promise<{ success: boolean; errors?: string[] }> {
    const errors: string[] = [];

    if (dryRun) {
      this.logger.log(
        `Dry run: Would create extensions for campaign ${campaignId}`,
      );
      return { success: true };
    }

    try {
      const customer = await this.getCustomerClient(
        connection,
        customerId,
        loginCustomerId,
      );

      const resolvedCustomerId = customerId || connection.metadata.customer_id;
      const campaignResourceName = `customers/${resolvedCustomerId}/campaigns/${campaignId}`;

      this.logger.log(
        `Creating extensions for campaign: ${campaignResourceName}`,
      );
      this.logger.log(
        `Extensions to create: sitelinks=${extensions.sitelinks?.length || 0}, callouts=${extensions.callouts?.length || 0}, snippets=${extensions.structuredSnippets?.length || 0}`,
      );

      // Create Sitelink Assets
      if (extensions.sitelinks && extensions.sitelinks.length > 0) {
        try {
          await this.createSitelinkAssets(
            customer,
            campaignResourceName,
            extensions.sitelinks,
            resolvedCustomerId,
          );
          this.logger.log(
            `Created ${extensions.sitelinks.length} sitelink assets`,
          );
        } catch (error: any) {
          const errorMsg = `Failed to create sitelinks: ${error.message || JSON.stringify(error)}`;
          this.logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      // Create Callout Assets
      if (extensions.callouts && extensions.callouts.length > 0) {
        try {
          await this.createCalloutAssets(
            customer,
            campaignResourceName,
            extensions.callouts,
            resolvedCustomerId,
          );
          this.logger.log(
            `Created ${extensions.callouts.length} callout assets`,
          );
        } catch (error: any) {
          const errorMsg = `Failed to create callouts: ${error.message || JSON.stringify(error)}`;
          this.logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      // Create Structured Snippet Assets
      if (
        extensions.structuredSnippets &&
        extensions.structuredSnippets.length > 0
      ) {
        try {
          await this.createStructuredSnippetAssets(
            customer,
            campaignResourceName,
            extensions.structuredSnippets,
            resolvedCustomerId,
          );
          this.logger.log(
            `Created ${extensions.structuredSnippets.length} structured snippet assets`,
          );
        } catch (error: any) {
          const errorMsg = `Failed to create structured snippets: ${error.message || JSON.stringify(error)}`;
          this.logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      return {
        success: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to create campaign extensions: ${error.message}`,
      );
      return {
        success: false,
        errors: [error.message || "Failed to create extensions"],
      };
    }
  }

  /**
   * Create sitelink assets and link them to the campaign
   */
  private async createSitelinkAssets(
    customer: Customer,
    campaignResourceName: string,
    sitelinks: SitelinkInput[],
    _customerId: string,
  ): Promise<void> {
    this.logger.log(
      `Creating sitelinks with data: ${JSON.stringify(sitelinks)}`,
    );

    // Filter out sitelinks without valid URLs
    const validSitelinks = sitelinks.filter((sitelink) => {
      if (!sitelink.finalUrl || sitelink.finalUrl.trim() === "") {
        this.logger.warn(
          `Skipping sitelink "${sitelink.text}" - no finalUrl provided`,
        );
        return false;
      }
      return true;
    });

    if (validSitelinks.length === 0) {
      throw new Error("No valid sitelinks with URLs provided");
    }

    // Create sitelink assets
    // Google Ads API v16+: final_urls is at the root Asset level, NOT inside sitelink_asset
    // sitelink_asset contains: link_text, description1, description2
    // The Asset itself contains: final_urls
    const assetOperations = validSitelinks.map((sitelink) => {
      const finalUrl = sitelink.finalUrl.trim();
      const operation = {
        // final_urls goes at Asset level, not inside sitelink_asset
        final_urls: [finalUrl],
        sitelink_asset: {
          link_text: sitelink.text.slice(0, 25), // Max 25 chars
          description1: sitelink.description1?.slice(0, 35) || undefined,
          description2: sitelink.description2?.slice(0, 35) || undefined,
        },
      };
      return operation;
    });

    this.logger.log(
      `Sitelink asset operations to create: ${JSON.stringify(assetOperations, null, 2)}`,
    );

    // Create assets
    const assetResponse = await customer.assets.create(assetOperations);
    const assetResourceNames = assetResponse.results.map(
      (r) => r.resource_name,
    );

    this.logger.log(
      `Created sitelink assets: ${assetResourceNames.join(", ")}`,
    );

    // Link assets to campaign
    const campaignAssetOperations = assetResourceNames.map(
      (assetResourceName) => ({
        campaign: campaignResourceName,
        asset: assetResourceName,
        field_type: enums.AssetFieldType.SITELINK,
      }),
    );

    await customer.campaignAssets.create(campaignAssetOperations);
    this.logger.log(
      `Linked ${assetResourceNames.length} sitelinks to campaign`,
    );
  }

  /**
   * Create callout assets and link them to the campaign
   */
  private async createCalloutAssets(
    customer: Customer,
    campaignResourceName: string,
    callouts: CalloutInput[],
    _customerId: string,
  ): Promise<void> {
    // Create callout assets
    const assetOperations = callouts.map((callout) => ({
      callout_asset: {
        callout_text: callout.text.slice(0, 25), // Max 25 chars
      },
    }));

    // Create assets
    const assetResponse = await customer.assets.create(assetOperations);
    const assetResourceNames = assetResponse.results.map(
      (r) => r.resource_name,
    );

    this.logger.log(`Created callout assets: ${assetResourceNames.join(", ")}`);

    // Link assets to campaign
    const campaignAssetOperations = assetResourceNames.map(
      (assetResourceName) => ({
        campaign: campaignResourceName,
        asset: assetResourceName,
        field_type: enums.AssetFieldType.CALLOUT,
      }),
    );

    await customer.campaignAssets.create(campaignAssetOperations);
    this.logger.log(`Linked ${assetResourceNames.length} callouts to campaign`);
  }

  /**
   * Create structured snippet assets and link them to the campaign
   */
  private async createStructuredSnippetAssets(
    customer: Customer,
    campaignResourceName: string,
    snippets: StructuredSnippetInput[],
    _customerId: string,
  ): Promise<void> {
    // Valid Google Ads API headers in Portuguese (pt-BR) - the language of the Google Ads account
    // Headers must match the account language exactly
    const validHeadersPtBr = new Set([
      "Tipos",
      "Serviços",
      "Marcas",
      "Cursos",
      "Destinos",
      "Modelos",
      "Vizinhança",
      "Arredores",
      "Estilos",
      "Comodidades",
      "Programas",
      "Programas de graduação",
      "Licenciaturas",
      "Cobertura do seguro",
      "Hotéis em destaque",
      "Hotéis de destaque",
      "Shows",
    ]);

    // English to Portuguese header translation map (AI sometimes generates in English)
    const englishToPortugueseMap = new Map<string, string>([
      ["types", "Tipos"],
      ["services", "Serviços"],
      ["brands", "Marcas"],
      ["courses", "Cursos"],
      ["destinations", "Destinos"],
      ["models", "Modelos"],
      ["neighborhoods", "Vizinhança"],
      ["neighborhood", "Vizinhança"],
      ["surroundings", "Arredores"],
      ["styles", "Estilos"],
      ["amenities", "Comodidades"],
      ["programs", "Programas"],
      ["degree programs", "Programas de graduação"],
      ["degrees", "Licenciaturas"],
      ["insurance coverage", "Cobertura do seguro"],
      ["featured hotels", "Hotéis em destaque"],
      ["shows", "Shows"],
    ]);

    // Log incoming snippets for debugging
    this.logger.log(
      `Received ${snippets.length} snippets with headers: ${snippets.map((s) => s.header).join(", ")}`,
    );

    // Create a map from lowercase to correct case for normalization
    const headerNormalizationMap = new Map<string, string>();
    for (const header of validHeadersPtBr) {
      headerNormalizationMap.set(header.toLowerCase(), header);
    }
    // Also add English translations to the normalization map
    for (const [english, portuguese] of englishToPortugueseMap) {
      headerNormalizationMap.set(english.toLowerCase(), portuguese);
    }

    // Filter to only valid headers and normalize them
    const validSnippets = snippets
      .map((snippet) => {
        const headerLower = snippet.header?.toLowerCase();
        const normalizedHeader = headerNormalizationMap.get(headerLower);
        if (!normalizedHeader) {
          this.logger.warn(
            `Invalid structured snippet header: "${snippet.header}" - skipping (must be in Portuguese: ${Array.from(validHeadersPtBr).slice(0, 8).join(", ")}...)`,
          );
          return null;
        }
        return {
          ...snippet,
          header: normalizedHeader, // Use the correctly-cased header
        };
      })
      .filter((s): s is StructuredSnippetInput => s !== null);

    if (validSnippets.length === 0) {
      this.logger.warn(
        "No valid structured snippets to create (all headers invalid)",
      );
      return;
    }

    this.logger.log(
      `Creating ${validSnippets.length} structured snippets (${snippets.length - validSnippets.length} skipped due to invalid headers)`,
    );

    // Create structured snippet assets
    const assetOperations = validSnippets.map((snippet) => ({
      structured_snippet_asset: {
        header: snippet.header,
        values: snippet.values.slice(0, 10).map((v) => v.slice(0, 25)), // Max 10 values, 25 chars each
      },
    }));

    // Create assets
    const assetResponse = await customer.assets.create(assetOperations);
    const assetResourceNames = assetResponse.results.map(
      (r) => r.resource_name,
    );

    this.logger.log(
      `Created structured snippet assets: ${assetResourceNames.join(", ")}`,
    );

    // Link assets to campaign
    const campaignAssetOperations = assetResourceNames.map(
      (assetResourceName) => ({
        campaign: campaignResourceName,
        asset: assetResourceName,
        field_type: enums.AssetFieldType.STRUCTURED_SNIPPET,
      }),
    );

    await customer.campaignAssets.create(campaignAssetOperations);
    this.logger.log(
      `Linked ${assetResourceNames.length} structured snippets to campaign`,
    );
  }

  // ============================================================================
  // Dashboard Performance Methods (Feature 025)
  // ============================================================================

  /**
   * Get campaign metrics for the dashboard
   * Fetches real-time data from Google Ads API
   * @param connection - The Google connection to use
   * @param period - Time period for metrics
   * @param startDate - Custom start date (for custom period)
   * @param endDate - Custom end date (for custom period)
   * @param customerId - Optional customer ID to use
   * @param loginCustomerId - Optional MCC customer ID
   */
  async getCampaignMetrics(
    connection: GoogleConnection,
    period:
      | "today"
      | "yesterday"
      | "last_7d"
      | "last_30d"
      | "custom" = "last_7d",
    startDate?: string,
    endDate?: string,
    customerId?: string,
    loginCustomerId?: string,
  ): Promise<{
    success: boolean;
    campaigns?: Array<{
      id: string;
      name: string;
      status: "ENABLED" | "PAUSED" | "REMOVED";
      channelType: string;
      budget: number;
      budgetId: string;
      maxBid?: number;
      biddingStrategyType?: string;
      targetCpa?: number;
      targetRoas?: number;
      impressions: number;
      clicks: number;
      ctr: number;
      cost: number;
      conversions: number;
      conversionsValue: number;
      cpa: number;
      roas: number;
      budgetSpentPercent: number;
    }>;
    summary?: {
      totalCampaigns: number;
      activeCampaigns: number;
      totalImpressions: number;
      totalClicks: number;
      totalCost: number;
      totalConversions: number;
      avgCtr: number;
      avgCpa: number;
    };
    fetchedAt?: string;
    error?: string;
  }> {
    try {
      const customer = await this.getCustomerClient(
        connection,
        customerId,
        loginCustomerId,
      );

      // Calculate date range based on period
      const { dateFrom, dateTo } = this.calculateDateRange(
        period,
        startDate,
        endDate,
      );

      this.logger.log(
        `Fetching campaign metrics for period: ${period} (${dateFrom} to ${dateTo})`,
      );

      // GAQL query to fetch campaign metrics
      // Note: target_spend.cpc_bid_ceiling_micros contains the max CPC for Maximize Clicks strategy
      // Bidding strategy fields help identify campaign type (CPA, ROAS, CPC, etc.)
      const query = `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          campaign.start_date,
          campaign.target_spend.cpc_bid_ceiling_micros,
          campaign.bidding_strategy_type,
          campaign.target_cpa.target_cpa_micros,
          campaign.target_roas.target_roas,
          campaign.maximize_conversions.target_cpa_micros,
          campaign.maximize_conversion_value.target_roas,
          campaign_budget.id,
          campaign_budget.amount_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.ctr,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value,
          metrics.cost_per_conversion
        FROM campaign
        WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
          AND campaign.status != 'REMOVED'
        ORDER BY metrics.cost_micros DESC
      `;

      const response = await customer.query(query);

      // Fetch ad group CPC bids to get the actual max bid per campaign
      // This is more accurate than target_spend.cpc_bid_ceiling_micros which is just a ceiling
      const adGroupQuery = `
        SELECT
          campaign.id,
          ad_group.cpc_bid_micros
        FROM ad_group
        WHERE campaign.status != 'REMOVED'
          AND ad_group.status != 'REMOVED'
      `;

      let adGroupResponse: any[] = [];
      try {
        adGroupResponse = await customer.query(adGroupQuery);
      } catch (e) {
        // If ad group query fails, we'll use the campaign-level bid ceiling
        this.logger.warn(`Failed to fetch ad group bids: ${e.message}`);
      }

      // Build a map of campaign ID -> max CPC bid from ad groups
      const campaignMaxBidMap = new Map<string, number>();
      for (const row of adGroupResponse) {
        const campaignId = String(row.campaign?.id);
        const cpcBidMicros = Number(row.ad_group?.cpc_bid_micros || 0);
        if (cpcBidMicros > 0) {
          const currentMax = campaignMaxBidMap.get(campaignId) || 0;
          campaignMaxBidMap.set(campaignId, Math.max(currentMax, cpcBidMicros));
        }
      }

      // Aggregate metrics per campaign (since query returns per-day segments)
      const campaignMap = new Map<
        string,
        {
          id: string;
          name: string;
          status: "ENABLED" | "PAUSED" | "REMOVED";
          channelType: string;
          budget: number;
          budgetId: string;
          maxBid?: number;
          biddingStrategyType?: string;
          targetCpa?: number;
          targetRoas?: number;
          impressions: number;
          clicks: number;
          cost: number;
          conversions: number;
          conversionsValue: number;
          startDate?: string;
        }
      >();

      for (const row of response) {
        const campaignId = String(row.campaign.id);
        const existing = campaignMap.get(campaignId);

        if (existing) {
          // Aggregate metrics
          existing.impressions += Number(row.metrics.impressions || 0);
          existing.clicks += Number(row.metrics.clicks || 0);
          existing.cost += Number(row.metrics.cost_micros || 0) / 1_000_000;
          existing.conversions += Number(row.metrics.conversions || 0);
          existing.conversionsValue += Number(
            row.metrics.conversions_value || 0,
          );
        } else {
          // New campaign entry
          // First try to get max CPC from ad groups (more accurate as it's the actual bid)
          // Fall back to target_spend.cpc_bid_ceiling_micros (the bid ceiling for Maximize Clicks strategy)
          const adGroupMaxBidMicros = campaignMaxBidMap.get(campaignId);
          const cpcBidCeilingMicros = Number(
            row.campaign?.target_spend?.cpc_bid_ceiling_micros || 0,
          );

          let maxBid: number | undefined;
          if (adGroupMaxBidMicros && adGroupMaxBidMicros > 0) {
            maxBid = adGroupMaxBidMicros / 1_000_000;
          } else if (cpcBidCeilingMicros > 0) {
            maxBid = cpcBidCeilingMicros / 1_000_000;
          }

          // Extract bidding strategy information
          // Map numeric enum values to string names
          const biddingStrategyType = row.campaign?.bidding_strategy_type
            ? this.mapBiddingStrategyEnumToString(
                row.campaign.bidding_strategy_type,
              )
            : undefined;

          // Get target CPA (from target_cpa or maximize_conversions strategy)
          let targetCpa: number | undefined;
          const targetCpaMicros = Number(
            row.campaign?.target_cpa?.target_cpa_micros || 0,
          );
          const maxConvTargetCpaMicros = Number(
            row.campaign?.maximize_conversions?.target_cpa_micros || 0,
          );
          if (targetCpaMicros > 0) {
            targetCpa = targetCpaMicros / 1_000_000;
          } else if (maxConvTargetCpaMicros > 0) {
            targetCpa = maxConvTargetCpaMicros / 1_000_000;
          }

          // Get target ROAS (from target_roas or maximize_conversion_value strategy)
          let targetRoas: number | undefined;
          const targetRoasValue = Number(
            row.campaign?.target_roas?.target_roas || 0,
          );
          const maxConvValueTargetRoas = Number(
            row.campaign?.maximize_conversion_value?.target_roas || 0,
          );
          if (targetRoasValue > 0) {
            targetRoas = targetRoasValue;
          } else if (maxConvValueTargetRoas > 0) {
            targetRoas = maxConvValueTargetRoas;
          }

          campaignMap.set(campaignId, {
            id: campaignId,
            name: row.campaign.name || "",
            status: this.mapCampaignStatus(row.campaign.status),
            channelType: String(
              row.campaign.advertising_channel_type || "UNKNOWN",
            ),
            budget: Number(row.campaign_budget?.amount_micros || 0) / 1_000_000,
            budgetId: String(row.campaign_budget?.id || ""),
            maxBid,
            biddingStrategyType,
            targetCpa,
            targetRoas,
            impressions: Number(row.metrics.impressions || 0),
            clicks: Number(row.metrics.clicks || 0),
            cost: Number(row.metrics.cost_micros || 0) / 1_000_000,
            conversions: Number(row.metrics.conversions || 0),
            conversionsValue: Number(row.metrics.conversions_value || 0),
            startDate: row.campaign.start_date,
          });
        }
      }

      // Convert to array and calculate derived metrics
      const campaigns = Array.from(campaignMap.values()).map((campaign) => {
        const ctr =
          campaign.impressions > 0 ? campaign.clicks / campaign.impressions : 0;
        const cpa =
          campaign.conversions > 0 ? campaign.cost / campaign.conversions : 0;
        const roas =
          campaign.cost > 0 ? campaign.conversionsValue / campaign.cost : 0;
        const budgetSpentPercent =
          campaign.budget > 0 ? (campaign.cost / campaign.budget) * 100 : 0;

        return {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          channelType: campaign.channelType,
          budget: campaign.budget,
          budgetId: campaign.budgetId,
          maxBid: campaign.maxBid,
          biddingStrategyType: campaign.biddingStrategyType,
          targetCpa: campaign.targetCpa,
          targetRoas: campaign.targetRoas,
          impressions: campaign.impressions,
          clicks: campaign.clicks,
          ctr,
          cost: campaign.cost,
          conversions: campaign.conversions,
          conversionsValue: campaign.conversionsValue,
          cpa,
          roas,
          budgetSpentPercent: Math.min(budgetSpentPercent, 100), // Cap at 100%
        };
      });

      // Calculate summary
      const activeCampaigns = campaigns.filter(
        (c) => c.status === "ENABLED",
      ).length;
      const totalImpressions = campaigns.reduce(
        (sum, c) => sum + c.impressions,
        0,
      );
      const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
      const totalCost = campaigns.reduce((sum, c) => sum + c.cost, 0);
      const totalConversions = campaigns.reduce(
        (sum, c) => sum + c.conversions,
        0,
      );
      const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
      const avgCpa = totalConversions > 0 ? totalCost / totalConversions : 0;

      const summary = {
        totalCampaigns: campaigns.length,
        activeCampaigns,
        totalImpressions,
        totalClicks,
        totalCost,
        totalConversions,
        avgCtr,
        avgCpa,
      };

      this.logger.log(`Retrieved metrics for ${campaigns.length} campaigns`);

      return {
        success: true,
        campaigns,
        summary,
        fetchedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error(`Failed to get campaign metrics: ${error.message}`);
      return {
        success: false,
        error: error.message || "Failed to get campaign metrics",
      };
    }
  }

  /**
   * Get campaign metrics with filter pushdown to GAQL
   * This method builds GAQL queries with WHERE clauses for filtering,
   * ORDER BY for sorting, and LIMIT for pagination - all executed by Google Ads API
   *
   * @param connection - The Google connection to use
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   * @param customerId - Customer ID
   * @param loginCustomerId - MCC login customer ID (optional)
   * @param options - Filter, sort, and pagination options
   */
  async getCampaignMetricsWithFilters(
    connection: GoogleConnection,
    startDate: string,
    endDate: string,
    customerId: string,
    loginCustomerId?: string,
    options?: {
      metricFilters?: GaqlMetricFilter[];
      nameContains?: string;
      statusFilter?: "ENABLED" | "PAUSED" | "all";
      orderBy?:
        | "cost"
        | "impressions"
        | "clicks"
        | "conversions"
        | "ctr"
        | "cpa"
        | "roas"
        | "name";
      sortOrder?: "asc" | "desc";
      limit?: number;
    },
  ): Promise<{
    success: boolean;
    campaigns?: Array<{
      id: string;
      name: string;
      status: "ENABLED" | "PAUSED" | "REMOVED";
      channelType: string;
      budget: number;
      budgetId: string;
      maxBid?: number;
      biddingStrategyType?: string;
      targetCpa?: number;
      targetRoas?: number;
      impressions: number;
      clicks: number;
      ctr: number;
      cost: number;
      conversions: number;
      conversionsValue: number;
      cpa: number;
      roas: number;
      budgetSpentPercent: number;
    }>;
    summary?: {
      totalCampaigns: number;
      activeCampaigns: number;
      totalImpressions: number;
      totalClicks: number;
      totalCost: number;
      totalConversions: number;
      avgCtr: number;
      avgCpa: number;
    };
    fetchedAt?: string;
    error?: string;
  }> {
    try {
      const customer = await this.getCustomerClient(
        connection,
        customerId,
        loginCustomerId,
      );

      this.logger.log(
        `Fetching campaign metrics with filters: ${startDate} to ${endDate}`,
      );

      // Build WHERE clauses
      const whereClauses: string[] = [
        `segments.date BETWEEN '${startDate}' AND '${endDate}'`,
        `campaign.status != 'REMOVED'`,
      ];

      // Add status filter
      if (options?.statusFilter && options.statusFilter !== "all") {
        whereClauses.push(`campaign.status = '${options.statusFilter}'`);
      }

      // Add name filter (LIKE search)
      if (options?.nameContains) {
        // Escape special characters in the search term
        const escapedName = options.nameContains.replace(/'/g, "\\'");
        whereClauses.push(`campaign.name CONTAINS '${escapedName}'`);
      }

      // Add metric filters
      if (options?.metricFilters && options.metricFilters.length > 0) {
        for (const filter of options.metricFilters) {
          const clause = this.buildGaqlMetricWhereClause(filter);
          if (clause) {
            whereClauses.push(clause);
          }
        }
      }

      // Build ORDER BY clause
      let orderByClause = "ORDER BY metrics.cost_micros DESC";
      if (options?.orderBy) {
        const gaqlField = this.mapOrderByToGaqlField(options.orderBy);
        const direction =
          options?.sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";
        orderByClause = `ORDER BY ${gaqlField} ${direction}`;
      }

      // Build LIMIT clause (GAQL supports up to 10000 rows per query)
      const limitClause = options?.limit ? `LIMIT ${options.limit}` : "";

      // GAQL query to fetch campaign metrics with filters
      const query = `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          campaign.start_date,
          campaign.target_spend.cpc_bid_ceiling_micros,
          campaign.bidding_strategy_type,
          campaign.target_cpa.target_cpa_micros,
          campaign.target_roas.target_roas,
          campaign.maximize_conversions.target_cpa_micros,
          campaign.maximize_conversion_value.target_roas,
          campaign_budget.id,
          campaign_budget.amount_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.ctr,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value,
          metrics.cost_per_conversion
        FROM campaign
        WHERE ${whereClauses.join(" AND ")}
        ${orderByClause}
        ${limitClause}
      `;

      this.logger.debug(`GAQL Query: ${query}`);

      const response = await customer.query(query);

      // Fetch ad group CPC bids to get the actual max bid per campaign
      const adGroupQuery = `
        SELECT
          campaign.id,
          ad_group.cpc_bid_micros
        FROM ad_group
        WHERE campaign.status != 'REMOVED'
          AND ad_group.status != 'REMOVED'
      `;

      let adGroupResponse: any[] = [];
      try {
        adGroupResponse = await customer.query(adGroupQuery);
      } catch (e) {
        this.logger.warn(`Failed to fetch ad group bids: ${e.message}`);
      }

      // Build a map of campaign ID -> max CPC bid from ad groups
      const campaignMaxBidMap = new Map<string, number>();
      for (const row of adGroupResponse) {
        const campaignId = String(row.campaign?.id);
        const cpcBidMicros = Number(row.ad_group?.cpc_bid_micros || 0);
        if (cpcBidMicros > 0) {
          const currentMax = campaignMaxBidMap.get(campaignId) || 0;
          campaignMaxBidMap.set(campaignId, Math.max(currentMax, cpcBidMicros));
        }
      }

      // Aggregate metrics per campaign (since query returns per-day segments)
      const campaignMap = new Map<
        string,
        {
          id: string;
          name: string;
          status: "ENABLED" | "PAUSED" | "REMOVED";
          channelType: string;
          budget: number;
          budgetId: string;
          maxBid?: number;
          biddingStrategyType?: string;
          targetCpa?: number;
          targetRoas?: number;
          impressions: number;
          clicks: number;
          cost: number;
          conversions: number;
          conversionsValue: number;
          startDate?: string;
        }
      >();

      for (const row of response) {
        const campaignId = String(row.campaign.id);
        const existing = campaignMap.get(campaignId);

        if (existing) {
          // Aggregate metrics
          existing.impressions += Number(row.metrics.impressions || 0);
          existing.clicks += Number(row.metrics.clicks || 0);
          existing.cost += Number(row.metrics.cost_micros || 0) / 1_000_000;
          existing.conversions += Number(row.metrics.conversions || 0);
          existing.conversionsValue += Number(
            row.metrics.conversions_value || 0,
          );
        } else {
          // New campaign entry
          const adGroupMaxBidMicros = campaignMaxBidMap.get(campaignId);
          const cpcBidCeilingMicros = Number(
            row.campaign?.target_spend?.cpc_bid_ceiling_micros || 0,
          );

          let maxBid: number | undefined;
          if (adGroupMaxBidMicros && adGroupMaxBidMicros > 0) {
            maxBid = adGroupMaxBidMicros / 1_000_000;
          } else if (cpcBidCeilingMicros > 0) {
            maxBid = cpcBidCeilingMicros / 1_000_000;
          }

          const biddingStrategyType = row.campaign?.bidding_strategy_type
            ? this.mapBiddingStrategyEnumToString(
                row.campaign.bidding_strategy_type,
              )
            : undefined;

          let targetCpa: number | undefined;
          const targetCpaMicros = Number(
            row.campaign?.target_cpa?.target_cpa_micros || 0,
          );
          const maxConvTargetCpaMicros = Number(
            row.campaign?.maximize_conversions?.target_cpa_micros || 0,
          );
          if (targetCpaMicros > 0) {
            targetCpa = targetCpaMicros / 1_000_000;
          } else if (maxConvTargetCpaMicros > 0) {
            targetCpa = maxConvTargetCpaMicros / 1_000_000;
          }

          let targetRoas: number | undefined;
          const targetRoasValue = Number(
            row.campaign?.target_roas?.target_roas || 0,
          );
          const maxConvValueTargetRoas = Number(
            row.campaign?.maximize_conversion_value?.target_roas || 0,
          );
          if (targetRoasValue > 0) {
            targetRoas = targetRoasValue;
          } else if (maxConvValueTargetRoas > 0) {
            targetRoas = maxConvValueTargetRoas;
          }

          campaignMap.set(campaignId, {
            id: campaignId,
            name: row.campaign.name || "",
            status: this.mapCampaignStatus(row.campaign.status),
            channelType: String(
              row.campaign.advertising_channel_type || "UNKNOWN",
            ),
            budget: Number(row.campaign_budget?.amount_micros || 0) / 1_000_000,
            budgetId: String(row.campaign_budget?.id || ""),
            maxBid,
            biddingStrategyType,
            targetCpa,
            targetRoas,
            impressions: Number(row.metrics.impressions || 0),
            clicks: Number(row.metrics.clicks || 0),
            cost: Number(row.metrics.cost_micros || 0) / 1_000_000,
            conversions: Number(row.metrics.conversions || 0),
            conversionsValue: Number(row.metrics.conversions_value || 0),
            startDate: row.campaign.start_date,
          });
        }
      }

      // Convert to array and calculate derived metrics
      const campaigns = Array.from(campaignMap.values()).map((campaign) => {
        const ctr =
          campaign.impressions > 0 ? campaign.clicks / campaign.impressions : 0;
        const cpa =
          campaign.conversions > 0 ? campaign.cost / campaign.conversions : 0;
        const roas =
          campaign.cost > 0 ? campaign.conversionsValue / campaign.cost : 0;
        const budgetSpentPercent =
          campaign.budget > 0 ? (campaign.cost / campaign.budget) * 100 : 0;

        return {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          channelType: campaign.channelType,
          budget: campaign.budget,
          budgetId: campaign.budgetId,
          maxBid: campaign.maxBid,
          biddingStrategyType: campaign.biddingStrategyType,
          targetCpa: campaign.targetCpa,
          targetRoas: campaign.targetRoas,
          impressions: campaign.impressions,
          clicks: campaign.clicks,
          ctr,
          cost: campaign.cost,
          conversions: campaign.conversions,
          conversionsValue: campaign.conversionsValue,
          cpa,
          roas,
          budgetSpentPercent: Math.min(budgetSpentPercent, 100),
        };
      });

      // Calculate summary
      const activeCampaigns = campaigns.filter(
        (c) => c.status === "ENABLED",
      ).length;
      const totalImpressions = campaigns.reduce(
        (sum, c) => sum + c.impressions,
        0,
      );
      const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
      const totalCost = campaigns.reduce((sum, c) => sum + c.cost, 0);
      const totalConversions = campaigns.reduce(
        (sum, c) => sum + c.conversions,
        0,
      );
      const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
      const avgCpa = totalConversions > 0 ? totalCost / totalConversions : 0;

      const summary = {
        totalCampaigns: campaigns.length,
        activeCampaigns,
        totalImpressions,
        totalClicks,
        totalCost,
        totalConversions,
        avgCtr,
        avgCpa,
      };

      this.logger.log(
        `Retrieved metrics for ${campaigns.length} campaigns with filters`,
      );

      return {
        success: true,
        campaigns,
        summary,
        fetchedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to get campaign metrics with filters: ${error.message}`,
      );
      return {
        success: false,
        error: error.message || "Failed to get campaign metrics",
      };
    }
  }

  /**
   * Build GAQL WHERE clause for a metric filter
   */
  private buildGaqlMetricWhereClause(filter: GaqlMetricFilter): string | null {
    // Map frontend metric names to GAQL fields
    const metricFieldMap: Record<string, string> = {
      impressions: "metrics.impressions",
      clicks: "metrics.clicks",
      conversions: "metrics.conversions",
      cost: "metrics.cost_micros",
      cpc: "metrics.average_cpc",
      cpa: "metrics.cost_per_conversion",
      ctr: "metrics.ctr",
      roas: "metrics.conversions_value", // ROAS is computed, we filter on value
    };

    const gaqlField = metricFieldMap[filter.metric];
    if (!gaqlField) {
      this.logger.warn(`Unknown metric filter: ${filter.metric}`);
      return null;
    }

    // For cost, values are in dollars but GAQL uses micros
    const isMicrosField = ["cost", "cpc", "cpa"].includes(filter.metric);
    const value = isMicrosField ? filter.value * 1_000_000 : filter.value;
    const value2 =
      isMicrosField && filter.value2
        ? filter.value2 * 1_000_000
        : filter.value2;

    // Build operator clause
    switch (filter.operator) {
      case "gt":
        return `${gaqlField} > ${value}`;
      case "lt":
        return `${gaqlField} < ${value}`;
      case "eq":
        return `${gaqlField} = ${value}`;
      case "between":
        if (value2 === undefined) {
          this.logger.warn("Between filter requires value2");
          return null;
        }
        return `${gaqlField} BETWEEN ${value} AND ${value2}`;
      default:
        return null;
    }
  }

  /**
   * Map orderBy parameter to GAQL field
   */
  private mapOrderByToGaqlField(orderBy: string): string {
    const orderByFieldMap: Record<string, string> = {
      cost: "metrics.cost_micros",
      impressions: "metrics.impressions",
      clicks: "metrics.clicks",
      conversions: "metrics.conversions",
      ctr: "metrics.ctr",
      cpa: "metrics.cost_per_conversion",
      roas: "metrics.conversions_value",
      name: "campaign.name",
    };

    return orderByFieldMap[orderBy] || "metrics.cost_micros";
  }

  /**
   * Get detailed information for a specific campaign
   * @param connection - The Google connection to use
   * @param campaignId - The campaign ID
   * @param customerId - Optional customer ID to use
   * @param loginCustomerId - Optional MCC login customer ID
   * @param startDate - Start date for metrics
   * @param endDate - End date for metrics
   */
  async getCampaignDetails(
    connection: GoogleConnection,
    campaignId: string,
    customerId?: string,
    loginCustomerId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    success: boolean;
    campaign?: {
      id: string;
      resourceName: string;
      name: string;
      status: string;
      advertisingChannelType: string;
      advertisingChannelSubType?: string;
      startDate?: string;
      endDate?: string;
      // Budget
      budget: {
        id: string;
        resourceName: string;
        amountMicros: number;
        amount: number;
        deliveryMethod?: string;
        period?: string;
        type?: string;
      };
      // Bidding
      biddingStrategy: {
        type: string;
        targetCpaMicros?: number;
        targetCpa?: number;
        targetRoas?: number;
        maxCpcBidCeilingMicros?: number;
        maxCpcBidCeiling?: number;
      };
      // Network settings
      networkSettings?: {
        targetGoogleSearch?: boolean;
        targetSearchNetwork?: boolean;
        targetContentNetwork?: boolean;
        targetPartnerSearchNetwork?: boolean;
      };
      // Geo targeting
      geoTargetTypeSetting?: {
        positiveGeoTargetType?: string;
        negativeGeoTargetType?: string;
      };
      // URLs
      finalUrlSuffix?: string;
      trackingUrlTemplate?: string;
      // Labels
      labels?: string[];
      // Metrics
      metrics: {
        impressions: number;
        clicks: number;
        ctr: number;
        cost: number;
        conversions: number;
        conversionsValue: number;
        cpa: number;
        roas: number;
        averageCpc: number;
        averageCpm: number;
        averagePosition?: number;
        searchImpressionShare?: number;
        searchTopImpressionShare?: number;
        searchAbsoluteTopImpressionShare?: number;
        contentImpressionShare?: number;
      };
      // Ad groups summary
      adGroupsCount?: number;
      activeAdGroupsCount?: number;
      // Keywords summary
      keywordsCount?: number;
      // Customer info
      customerId: string;
      loginCustomerId?: string;
    };
    error?: string;
  }> {
    this.logger.log(
      `getCampaignDetails: campaignId=${campaignId}, customerId=${customerId}, loginCustomerId=${loginCustomerId}`,
    );

    try {
      const customer = await this.getCustomerClient(
        connection,
        customerId,
        loginCustomerId,
      );

      // Calculate date range (default to last 30 days)
      const today = new Date();
      const defaultEndDate = today.toISOString().split("T")[0];
      const defaultStartDate = new Date(
        today.getTime() - 30 * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .split("T")[0];

      const dateFrom = startDate || defaultStartDate;
      const dateTo = endDate || defaultEndDate;

      // Main campaign query with detailed fields
      const campaignQuery = `
        SELECT
          campaign.id,
          campaign.resource_name,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          campaign.advertising_channel_sub_type,
          campaign.start_date,
          campaign.end_date,
          campaign.final_url_suffix,
          campaign.tracking_url_template,
          campaign.bidding_strategy_type,
          campaign.target_cpa.target_cpa_micros,
          campaign.target_roas.target_roas,
          campaign.target_spend.cpc_bid_ceiling_micros,
          campaign.maximize_conversions.target_cpa_micros,
          campaign.maximize_conversion_value.target_roas,
          campaign.network_settings.target_google_search,
          campaign.network_settings.target_search_network,
          campaign.network_settings.target_content_network,
          campaign.network_settings.target_partner_search_network,
          campaign.geo_target_type_setting.positive_geo_target_type,
          campaign.geo_target_type_setting.negative_geo_target_type,
          campaign.labels,
          campaign_budget.id,
          campaign_budget.resource_name,
          campaign_budget.amount_micros,
          campaign_budget.delivery_method,
          campaign_budget.period,
          campaign_budget.type,
          metrics.impressions,
          metrics.clicks,
          metrics.ctr,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value,
          metrics.average_cpc,
          metrics.average_cpm,
          metrics.search_impression_share,
          metrics.search_top_impression_share,
          metrics.search_absolute_top_impression_share,
          metrics.content_impression_share
        FROM campaign
        WHERE campaign.id = ${campaignId}
          AND segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      `;

      const response = await customer.query(campaignQuery);

      if (!response || response.length === 0) {
        // Try without date filter to get basic campaign info
        const basicQuery = `
          SELECT
            campaign.id,
            campaign.resource_name,
            campaign.name,
            campaign.status,
            campaign.advertising_channel_type,
            campaign.advertising_channel_sub_type,
            campaign.start_date,
            campaign.end_date,
            campaign.bidding_strategy_type,
            campaign.target_cpa.target_cpa_micros,
            campaign.target_roas.target_roas,
            campaign.target_spend.cpc_bid_ceiling_micros,
            campaign_budget.id,
            campaign_budget.resource_name,
            campaign_budget.amount_micros,
            campaign_budget.delivery_method,
            campaign_budget.period,
            campaign_budget.type
          FROM campaign
          WHERE campaign.id = ${campaignId}
        `;

        const basicResponse = await customer.query(basicQuery);

        if (!basicResponse || basicResponse.length === 0) {
          return {
            success: false,
            error: `Campaign with ID ${campaignId} not found`,
          };
        }

        // Return basic info without metrics
        const row = basicResponse[0];
        const budgetAmountMicros = Number(
          row.campaign_budget?.amount_micros || 0,
        );
        const targetCpaMicros =
          Number(row.campaign?.target_cpa?.target_cpa_micros || 0) ||
          Number(row.campaign?.maximize_conversions?.target_cpa_micros || 0);
        const targetRoas =
          Number(row.campaign?.target_roas?.target_roas || 0) ||
          Number(row.campaign?.maximize_conversion_value?.target_roas || 0);

        return {
          success: true,
          campaign: {
            id: String(row.campaign.id),
            resourceName: row.campaign.resource_name,
            name: row.campaign.name,
            status: String(row.campaign.status),
            advertisingChannelType: String(
              row.campaign.advertising_channel_type,
            ),
            advertisingChannelSubType: row.campaign.advertising_channel_sub_type
              ? String(row.campaign.advertising_channel_sub_type)
              : undefined,
            startDate: row.campaign.start_date,
            endDate: row.campaign.end_date,
            budget: {
              id: String(row.campaign_budget?.id || ""),
              resourceName: row.campaign_budget?.resource_name || "",
              amountMicros: budgetAmountMicros,
              amount: budgetAmountMicros / 1_000_000,
              deliveryMethod: row.campaign_budget?.delivery_method
                ? String(row.campaign_budget.delivery_method)
                : undefined,
              period: row.campaign_budget?.period
                ? String(row.campaign_budget.period)
                : undefined,
              type: row.campaign_budget?.type
                ? String(row.campaign_budget.type)
                : undefined,
            },
            biddingStrategy: {
              type: String(row.campaign.bidding_strategy_type || "UNSPECIFIED"),
              targetCpaMicros: targetCpaMicros || undefined,
              targetCpa: targetCpaMicros
                ? targetCpaMicros / 1_000_000
                : undefined,
              targetRoas: targetRoas || undefined,
              maxCpcBidCeilingMicros:
                Number(
                  row.campaign?.target_spend?.cpc_bid_ceiling_micros || 0,
                ) || undefined,
              maxCpcBidCeiling:
                Number(
                  row.campaign?.target_spend?.cpc_bid_ceiling_micros || 0,
                ) / 1_000_000 || undefined,
            },
            metrics: {
              impressions: 0,
              clicks: 0,
              ctr: 0,
              cost: 0,
              conversions: 0,
              conversionsValue: 0,
              cpa: 0,
              roas: 0,
              averageCpc: 0,
              averageCpm: 0,
            },
            customerId: customerId || connection.metadata.customer_id || "",
            loginCustomerId: loginCustomerId,
          },
        };
      }

      // Aggregate metrics from response (multiple rows per day)
      let totalImpressions = 0;
      let totalClicks = 0;
      let totalCostMicros = 0;
      let totalConversions = 0;
      let totalConversionsValue = 0;
      let avgCpcSum = 0;
      let avgCpmSum = 0;
      let searchImpressionShare = 0;
      let searchTopImpressionShare = 0;
      let searchAbsTopImpressionShare = 0;
      let contentImpressionShare = 0;
      let rowCount = 0;

      for (const row of response) {
        totalImpressions += Number(row.metrics?.impressions || 0);
        totalClicks += Number(row.metrics?.clicks || 0);
        totalCostMicros += Number(row.metrics?.cost_micros || 0);
        totalConversions += Number(row.metrics?.conversions || 0);
        totalConversionsValue += Number(row.metrics?.conversions_value || 0);
        avgCpcSum += Number(row.metrics?.average_cpc || 0);
        avgCpmSum += Number(row.metrics?.average_cpm || 0);
        searchImpressionShare = Number(
          row.metrics?.search_impression_share || searchImpressionShare,
        );
        searchTopImpressionShare = Number(
          row.metrics?.search_top_impression_share || searchTopImpressionShare,
        );
        searchAbsTopImpressionShare = Number(
          row.metrics?.search_absolute_top_impression_share ||
            searchAbsTopImpressionShare,
        );
        contentImpressionShare = Number(
          row.metrics?.content_impression_share || contentImpressionShare,
        );
        rowCount++;
      }

      const totalCost = totalCostMicros / 1_000_000;
      const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
      const cpa = totalConversions > 0 ? totalCost / totalConversions : 0;
      const roas = totalCost > 0 ? totalConversionsValue / totalCost : 0;
      const avgCpc = rowCount > 0 ? avgCpcSum / rowCount / 1_000_000 : 0;
      const avgCpm = rowCount > 0 ? avgCpmSum / rowCount / 1_000_000 : 0;

      const row = response[0]; // Use first row for campaign info
      const budgetAmountMicros = Number(
        row.campaign_budget?.amount_micros || 0,
      );
      const targetCpaMicros =
        Number(row.campaign?.target_cpa?.target_cpa_micros || 0) ||
        Number(row.campaign?.maximize_conversions?.target_cpa_micros || 0);
      const targetRoas =
        Number(row.campaign?.target_roas?.target_roas || 0) ||
        Number(row.campaign?.maximize_conversion_value?.target_roas || 0);

      // Count ad groups
      let adGroupsCount = 0;
      let activeAdGroupsCount = 0;
      try {
        const adGroupQuery = `
          SELECT ad_group.status
          FROM ad_group
          WHERE campaign.id = ${campaignId}
        `;
        const adGroupResponse = await customer.query(adGroupQuery);
        adGroupsCount = adGroupResponse.length;
        activeAdGroupsCount = adGroupResponse.filter(
          (r: any) => r.ad_group?.status === "ENABLED",
        ).length;
      } catch (e) {
        this.logger.warn(`Failed to count ad groups: ${e.message}`);
      }

      // Count keywords
      let keywordsCount = 0;
      try {
        const keywordQuery = `
          SELECT ad_group_criterion.criterion_id
          FROM ad_group_criterion
          WHERE campaign.id = ${campaignId}
            AND ad_group_criterion.type = 'KEYWORD'
            AND ad_group_criterion.status != 'REMOVED'
        `;
        const keywordResponse = await customer.query(keywordQuery);
        keywordsCount = keywordResponse.length;
      } catch (e) {
        this.logger.warn(`Failed to count keywords: ${e.message}`);
      }

      return {
        success: true,
        campaign: {
          id: String(row.campaign.id),
          resourceName: row.campaign.resource_name,
          name: row.campaign.name,
          status: String(row.campaign.status),
          advertisingChannelType: String(row.campaign.advertising_channel_type),
          advertisingChannelSubType: row.campaign.advertising_channel_sub_type
            ? String(row.campaign.advertising_channel_sub_type)
            : undefined,
          startDate: row.campaign.start_date,
          endDate: row.campaign.end_date,
          finalUrlSuffix: row.campaign.final_url_suffix,
          trackingUrlTemplate: row.campaign.tracking_url_template,
          labels: row.campaign.labels || [],
          budget: {
            id: String(row.campaign_budget?.id || ""),
            resourceName: row.campaign_budget?.resource_name || "",
            amountMicros: budgetAmountMicros,
            amount: budgetAmountMicros / 1_000_000,
            deliveryMethod: row.campaign_budget?.delivery_method
              ? String(row.campaign_budget.delivery_method)
              : undefined,
            period: row.campaign_budget?.period
              ? String(row.campaign_budget.period)
              : undefined,
            type: row.campaign_budget?.type
              ? String(row.campaign_budget.type)
              : undefined,
          },
          biddingStrategy: {
            type: String(row.campaign.bidding_strategy_type || "UNSPECIFIED"),
            targetCpaMicros: targetCpaMicros || undefined,
            targetCpa: targetCpaMicros
              ? targetCpaMicros / 1_000_000
              : undefined,
            targetRoas: targetRoas || undefined,
            maxCpcBidCeilingMicros:
              Number(row.campaign?.target_spend?.cpc_bid_ceiling_micros || 0) ||
              undefined,
            maxCpcBidCeiling:
              Number(row.campaign?.target_spend?.cpc_bid_ceiling_micros || 0) /
                1_000_000 || undefined,
          },
          networkSettings: row.campaign.network_settings
            ? {
                targetGoogleSearch:
                  row.campaign.network_settings.target_google_search,
                targetSearchNetwork:
                  row.campaign.network_settings.target_search_network,
                targetContentNetwork:
                  row.campaign.network_settings.target_content_network,
                targetPartnerSearchNetwork:
                  row.campaign.network_settings.target_partner_search_network,
              }
            : undefined,
          geoTargetTypeSetting: row.campaign.geo_target_type_setting
            ? {
                positiveGeoTargetType: row.campaign.geo_target_type_setting
                  .positive_geo_target_type
                  ? String(
                      row.campaign.geo_target_type_setting
                        .positive_geo_target_type,
                    )
                  : undefined,
                negativeGeoTargetType: row.campaign.geo_target_type_setting
                  .negative_geo_target_type
                  ? String(
                      row.campaign.geo_target_type_setting
                        .negative_geo_target_type,
                    )
                  : undefined,
              }
            : undefined,
          metrics: {
            impressions: totalImpressions,
            clicks: totalClicks,
            ctr,
            cost: totalCost,
            conversions: totalConversions,
            conversionsValue: totalConversionsValue,
            cpa,
            roas,
            averageCpc: avgCpc,
            averageCpm: avgCpm,
            searchImpressionShare: searchImpressionShare || undefined,
            searchTopImpressionShare: searchTopImpressionShare || undefined,
            searchAbsoluteTopImpressionShare:
              searchAbsTopImpressionShare || undefined,
            contentImpressionShare: contentImpressionShare || undefined,
          },
          adGroupsCount,
          activeAdGroupsCount,
          keywordsCount,
          customerId: customerId || connection.metadata.customer_id || "",
          loginCustomerId: loginCustomerId,
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to get campaign details: ${error.message}`);
      return {
        success: false,
        error: error.message || "Failed to get campaign details",
      };
    }
  }

  /**
   * Update campaign budget
   * @param connection - The Google connection to use
   * @param campaignId - The campaign ID
   * @param budgetId - The budget resource ID
   * @param newBudget - New budget amount in currency units (not micros)
   * @param customerId - Optional customer ID to use
   * @param loginCustomerId - Optional MCC login customer ID
   */
  async updateCampaignBudget(
    connection: GoogleConnection,
    campaignId: string,
    budgetId: string,
    newBudget: number,
    customerId?: string,
    loginCustomerId?: string,
  ): Promise<{
    success: boolean;
    previousBudget?: number;
    newBudget?: number;
    error?: string;
  }> {
    this.logger.log(
      `updateCampaignBudget: campaignId=${campaignId}, budgetId=${budgetId}, newBudget=${newBudget}, customerId=${customerId}, loginCustomerId=${loginCustomerId}`,
    );

    if (!budgetId) {
      this.logger.error(`updateCampaignBudget: budgetId is empty or undefined`);
      return { success: false, error: "Budget ID is required" };
    }

    try {
      const customer = await this.getCustomerClient(
        connection,
        customerId,
        loginCustomerId,
      );

      const resolvedCustomerId = customerId || connection.metadata.customer_id;
      this.logger.log(
        `updateCampaignBudget: resolvedCustomerId=${resolvedCustomerId}`,
      );

      if (!resolvedCustomerId) {
        throw new BadRequestException(
          "Connection does not have a Google Ads customer ID",
        );
      }

      // First, get current budget
      const budgetQuery = `
        SELECT campaign_budget.amount_micros
        FROM campaign_budget
        WHERE campaign_budget.id = ${budgetId}
      `;

      const budgetResponse = await customer.query(budgetQuery);
      const previousBudgetMicros =
        budgetResponse[0]?.campaign_budget?.amount_micros || 0;
      const previousBudget = Number(previousBudgetMicros) / 1_000_000;

      // Update the budget
      const newBudgetMicros = Math.round(newBudget * 1_000_000);
      const budgetResourceName = `customers/${resolvedCustomerId}/campaignBudgets/${budgetId}`;

      await customer.campaignBudgets.update([
        {
          resource_name: budgetResourceName,
          amount_micros: newBudgetMicros,
        },
      ]);

      this.logger.log(
        `Updated budget for campaign ${campaignId}: ${previousBudget} -> ${newBudget}`,
      );

      return {
        success: true,
        previousBudget,
        newBudget,
      };
    } catch (error: any) {
      this.logger.error(`Failed to update campaign budget: ${error.message}`);
      return {
        success: false,
        error: error.message || "Failed to update campaign budget",
      };
    }
  }

  /**
   * Pause a campaign
   * @param connection - The Google connection to use
   * @param campaignId - The campaign ID to pause
   * @param customerId - Optional customer ID to use
   */
  async pauseCampaign(
    connection: GoogleConnection,
    campaignId: string,
    customerId?: string,
  ): Promise<{ success: boolean; previousStatus?: string; error?: string }> {
    try {
      // Get current status first
      const statusResult = await this.getCampaignStatus(
        connection,
        campaignId,
        customerId,
      );
      const previousStatus = statusResult.status;

      // Update to PAUSED
      const result = await this.updateCampaignStatus(
        connection,
        campaignId,
        "PAUSED",
        customerId,
      );

      if (result.success) {
        return {
          success: true,
          previousStatus,
        };
      }

      return {
        success: false,
        error: result.error,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to pause campaign",
      };
    }
  }

  /**
   * Enable a campaign
   * @param connection - The Google connection to use
   * @param campaignId - The campaign ID to enable
   * @param customerId - Optional customer ID to use
   */
  async enableCampaign(
    connection: GoogleConnection,
    campaignId: string,
    customerId?: string,
  ): Promise<{ success: boolean; previousStatus?: string; error?: string }> {
    try {
      // Get current status first
      const statusResult = await this.getCampaignStatus(
        connection,
        campaignId,
        customerId,
      );
      const previousStatus = statusResult.status;

      // Update to ENABLED
      const result = await this.updateCampaignStatus(
        connection,
        campaignId,
        "ENABLED",
        customerId,
      );

      if (result.success) {
        return {
          success: true,
          previousStatus,
        };
      }

      return {
        success: false,
        error: result.error,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to enable campaign",
      };
    }
  }

  /**
   * Calculate date range based on period
   */
  private calculateDateRange(
    period: "today" | "yesterday" | "last_7d" | "last_30d" | "custom",
    startDate?: string,
    endDate?: string,
  ): { dateFrom: string; dateTo: string } {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    switch (period) {
      case "today":
        return { dateFrom: formatDate(today), dateTo: formatDate(today) };
      case "yesterday": {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return {
          dateFrom: formatDate(yesterday),
          dateTo: formatDate(yesterday),
        };
      }
      case "last_7d": {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);
        return {
          dateFrom: formatDate(sevenDaysAgo),
          dateTo: formatDate(today),
        };
      }
      case "last_30d": {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 29);
        return {
          dateFrom: formatDate(thirtyDaysAgo),
          dateTo: formatDate(today),
        };
      }
      case "custom":
        if (!startDate || !endDate) {
          throw new BadRequestException(
            "Custom period requires startDate and endDate",
          );
        }
        return { dateFrom: startDate, dateTo: endDate };
      default:
        return { dateFrom: formatDate(today), dateTo: formatDate(today) };
    }
  }

  /**
   * Map campaign status number to string
   */
  private mapCampaignStatus(status: any): "ENABLED" | "PAUSED" | "REMOVED" {
    const statusNum =
      typeof status === "number" ? status : parseInt(status, 10);
    switch (statusNum) {
      case 2:
        return "ENABLED";
      case 3:
        return "PAUSED";
      case 4:
        return "REMOVED";
      default:
        // Try string matching
        if (status === "ENABLED" || status === 2) return "ENABLED";
        if (status === "PAUSED" || status === 3) return "PAUSED";
        if (status === "REMOVED" || status === 4) return "REMOVED";
        return "PAUSED"; // Default to PAUSED for unknown
    }
  }

  /**
   * Get ad groups for a campaign with their CPC bids
   * @param connection - The Google connection to use
   * @param campaignId - The campaign ID
   * @param customerId - Optional customer ID to use
   * @param loginCustomerId - Optional MCC login customer ID
   */
  async getAdGroupsForCampaign(
    connection: GoogleConnection,
    campaignId: string,
    customerId?: string,
    loginCustomerId?: string,
  ): Promise<{
    adGroups: Array<{ id: string; name: string; cpcBidMicros: number }>;
    error?: string;
  }> {
    try {
      const customer = await this.getCustomerClient(
        connection,
        customerId,
        loginCustomerId,
      );
      const resolvedCustomerId = customerId || connection.metadata.customer_id;

      if (!resolvedCustomerId) {
        return { adGroups: [], error: "No customer ID available" };
      }

      const query = `
        SELECT
          ad_group.id,
          ad_group.name,
          ad_group.cpc_bid_micros
        FROM ad_group
        WHERE campaign.id = ${campaignId}
          AND ad_group.status != 'REMOVED'
      `;

      const response = await customer.query(query);
      const adGroups = response.map((row: any) => ({
        id: String(row.ad_group.id),
        name: row.ad_group.name || "",
        cpcBidMicros: Number(row.ad_group.cpc_bid_micros) || 0,
      }));

      return { adGroups };
    } catch (error: any) {
      this.logger.error(
        `Failed to get ad groups for campaign ${campaignId}: ${error.message}`,
      );
      return { adGroups: [], error: error.message };
    }
  }

  /**
   * Update CPC bid for all ad groups in a campaign
   * @param connection - The Google connection to use
   * @param campaignId - The campaign ID
   * @param newBid - New CPC bid amount in currency units (not micros)
   * @param customerId - Optional customer ID to use
   * @param loginCustomerId - Optional MCC login customer ID
   */
  async updateCampaignBid(
    connection: GoogleConnection,
    campaignId: string,
    newBid: number,
    customerId?: string,
    loginCustomerId?: string,
  ): Promise<{
    success: boolean;
    previousBid?: number;
    newBid?: number;
    adGroupsUpdated?: number;
    error?: string;
  }> {
    this.logger.log(
      `updateCampaignBid: campaignId=${campaignId}, newBid=${newBid}, customerId=${customerId}, loginCustomerId=${loginCustomerId}`,
    );

    try {
      const customer = await this.getCustomerClient(
        connection,
        customerId,
        loginCustomerId,
      );
      const resolvedCustomerId = customerId || connection.metadata.customer_id;

      if (!resolvedCustomerId) {
        throw new BadRequestException(
          "Connection does not have a Google Ads customer ID",
        );
      }

      // Get all ad groups for this campaign
      const { adGroups, error: adGroupError } =
        await this.getAdGroupsForCampaign(
          connection,
          campaignId,
          customerId,
          loginCustomerId,
        );

      if (adGroupError || adGroups.length === 0) {
        return {
          success: false,
          error: adGroupError || "No ad groups found for this campaign",
        };
      }

      // Calculate average previous bid from all ad groups
      const totalPreviousBidMicros = adGroups.reduce(
        (sum, ag) => sum + ag.cpcBidMicros,
        0,
      );
      const previousBid = totalPreviousBidMicros / adGroups.length / 1_000_000;

      // Update all ad groups with new bid
      const newBidMicros = Math.round(newBid * 1_000_000);

      const updateOperations = adGroups.map((adGroup) => ({
        resource_name: `customers/${resolvedCustomerId}/adGroups/${adGroup.id}`,
        cpc_bid_micros: newBidMicros,
      }));

      await customer.adGroups.update(updateOperations);

      this.logger.log(
        `Updated CPC bid for ${adGroups.length} ad groups in campaign ${campaignId}: ${previousBid.toFixed(2)} -> ${newBid}`,
      );

      return {
        success: true,
        previousBid: Math.round(previousBid * 100) / 100,
        newBid,
        adGroupsUpdated: adGroups.length,
      };
    } catch (error: any) {
      this.logger.error(`Failed to update campaign bid: ${error.message}`);
      return {
        success: false,
        error: error.message || "Failed to update campaign bid",
      };
    }
  }

  /**
   * Update Target CPA for a campaign
   * Only works for campaigns using TARGET_CPA or MAXIMIZE_CONVERSIONS with target CPA
   * @param connection - The Google connection to use
   * @param campaignId - The campaign ID
   * @param newTargetCpa - New Target CPA in currency units (not micros)
   * @param customerId - Optional customer ID to use
   * @param loginCustomerId - Optional MCC login customer ID
   */
  async updateCampaignTargetCpa(
    connection: GoogleConnection,
    campaignId: string,
    newTargetCpa: number,
    customerId?: string,
    loginCustomerId?: string,
  ): Promise<{
    success: boolean;
    previousValue?: number;
    newValue?: number;
    error?: string;
  }> {
    this.logger.log(
      `updateCampaignTargetCpa: campaignId=${campaignId}, newTargetCpa=${newTargetCpa}, customerId=${customerId}, loginCustomerId=${loginCustomerId}`,
    );

    try {
      const customer = await this.getCustomerClient(
        connection,
        customerId,
        loginCustomerId,
      );
      const resolvedCustomerId = customerId || connection.metadata.customer_id;

      if (!resolvedCustomerId) {
        throw new BadRequestException(
          "Connection does not have a Google Ads customer ID",
        );
      }

      // First, get current campaign to check bidding strategy and current target CPA
      const query = `
        SELECT
          campaign.id,
          campaign.name,
          campaign.bidding_strategy_type,
          campaign.target_cpa.target_cpa_micros,
          campaign.maximize_conversions.target_cpa_micros
        FROM campaign
        WHERE campaign.id = ${campaignId}
      `;

      const response = await customer.query(query);
      if (!response || response.length === 0) {
        return {
          success: false,
          error: "Campaign not found",
        };
      }

      const campaign = response[0].campaign;
      const biddingStrategyType = String(campaign.bidding_strategy_type);

      // Validate that campaign uses a CPA-based strategy
      const validStrategies = ["TARGET_CPA", "MAXIMIZE_CONVERSIONS"];
      if (!validStrategies.includes(biddingStrategyType)) {
        return {
          success: false,
          error: `Campaign uses ${biddingStrategyType} strategy. Target CPA can only be updated for TARGET_CPA or MAXIMIZE_CONVERSIONS strategies.`,
        };
      }

      // Get previous value (might be in target_cpa or maximize_conversions)
      let previousValueMicros = 0;
      if (campaign.target_cpa?.target_cpa_micros) {
        previousValueMicros = Number(campaign.target_cpa.target_cpa_micros);
      } else if (campaign.maximize_conversions?.target_cpa_micros) {
        previousValueMicros = Number(
          campaign.maximize_conversions.target_cpa_micros,
        );
      }
      const previousValue = previousValueMicros / 1_000_000;

      // Prepare update operation
      const newTargetCpaMicros = Math.round(newTargetCpa * 1_000_000);

      const updateData: any = {
        resource_name: `customers/${resolvedCustomerId}/campaigns/${campaignId}`,
      };

      if (biddingStrategyType === "TARGET_CPA") {
        updateData.target_cpa = {
          target_cpa_micros: newTargetCpaMicros,
        };
      } else if (biddingStrategyType === "MAXIMIZE_CONVERSIONS") {
        updateData.maximize_conversions = {
          target_cpa_micros: newTargetCpaMicros,
        };
      }

      await customer.campaigns.update([updateData], {
        partial_failure: false,
      });

      this.logger.log(
        `Updated Target CPA for campaign ${campaignId}: ${previousValue.toFixed(2)} -> ${newTargetCpa}`,
      );

      return {
        success: true,
        previousValue: Math.round(previousValue * 100) / 100,
        newValue: newTargetCpa,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to update campaign target CPA: ${error.message}`,
      );
      return {
        success: false,
        error: error.message || "Failed to update campaign target CPA",
      };
    }
  }

  /**
   * Update Target ROAS for a campaign
   * Only works for campaigns using TARGET_ROAS or MAXIMIZE_CONVERSION_VALUE with target ROAS
   * @param connection - The Google connection to use
   * @param campaignId - The campaign ID
   * @param newTargetRoas - New Target ROAS as decimal (e.g., 4.0 = 400%)
   * @param customerId - Optional customer ID to use
   * @param loginCustomerId - Optional MCC login customer ID
   */
  async updateCampaignTargetRoas(
    connection: GoogleConnection,
    campaignId: string,
    newTargetRoas: number,
    customerId?: string,
    loginCustomerId?: string,
  ): Promise<{
    success: boolean;
    previousValue?: number;
    newValue?: number;
    error?: string;
  }> {
    this.logger.log(
      `updateCampaignTargetRoas: campaignId=${campaignId}, newTargetRoas=${newTargetRoas}, customerId=${customerId}, loginCustomerId=${loginCustomerId}`,
    );

    try {
      const customer = await this.getCustomerClient(
        connection,
        customerId,
        loginCustomerId,
      );
      const resolvedCustomerId = customerId || connection.metadata.customer_id;

      if (!resolvedCustomerId) {
        throw new BadRequestException(
          "Connection does not have a Google Ads customer ID",
        );
      }

      // First, get current campaign to check bidding strategy and current target ROAS
      const query = `
        SELECT
          campaign.id,
          campaign.name,
          campaign.bidding_strategy_type,
          campaign.target_roas.target_roas,
          campaign.maximize_conversion_value.target_roas
        FROM campaign
        WHERE campaign.id = ${campaignId}
      `;

      const response = await customer.query(query);
      if (!response || response.length === 0) {
        return {
          success: false,
          error: "Campaign not found",
        };
      }

      const campaign = response[0].campaign;
      const biddingStrategyType = String(campaign.bidding_strategy_type);

      // Validate that campaign uses a ROAS-based strategy
      const validStrategies = ["TARGET_ROAS", "MAXIMIZE_CONVERSION_VALUE"];
      if (!validStrategies.includes(biddingStrategyType)) {
        return {
          success: false,
          error: `Campaign uses ${biddingStrategyType} strategy. Target ROAS can only be updated for TARGET_ROAS or MAXIMIZE_CONVERSION_VALUE strategies.`,
        };
      }

      // Get previous value (might be in target_roas or maximize_conversion_value)
      let previousValue = 0;
      if (campaign.target_roas?.target_roas) {
        previousValue = Number(campaign.target_roas.target_roas);
      } else if (campaign.maximize_conversion_value?.target_roas) {
        previousValue = Number(campaign.maximize_conversion_value.target_roas);
      }

      // Prepare update operation
      const updateData: any = {
        resource_name: `customers/${resolvedCustomerId}/campaigns/${campaignId}`,
      };

      if (biddingStrategyType === "TARGET_ROAS") {
        updateData.target_roas = {
          target_roas: newTargetRoas,
        };
      } else if (biddingStrategyType === "MAXIMIZE_CONVERSION_VALUE") {
        updateData.maximize_conversion_value = {
          target_roas: newTargetRoas,
        };
      }

      await customer.campaigns.update([updateData], {
        partial_failure: false,
      });

      this.logger.log(
        `Updated Target ROAS for campaign ${campaignId}: ${previousValue.toFixed(2)} -> ${newTargetRoas}`,
      );

      return {
        success: true,
        previousValue: Math.round(previousValue * 100) / 100,
        newValue: newTargetRoas,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to update campaign target ROAS: ${error.message}`,
      );
      return {
        success: false,
        error: error.message || "Failed to update campaign target ROAS",
      };
    }
  }

  /**
   * Get ad groups with their ads for a campaign (for expand functionality)
   * Returns hierarchical data: ad groups with their ads and URLs
   */
  async getCampaignHierarchy(
    connection: GoogleConnection,
    campaignId: string,
    customerId?: string,
    loginCustomerId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    success: boolean;
    // Campaign-level URL settings
    trackingUrlTemplate?: string;
    finalUrlSuffix?: string;
    adGroups?: Array<{
      id: string;
      name: string;
      status: string;
      type: string; // SEARCH_STANDARD, SEARCH_DYNAMIC_ADS, DISPLAY_STANDARD, etc.
      cpcBidMicros: number;
      cpcBid: number;
      metrics: {
        impressions: number;
        clicks: number;
        ctr: number;
        cost: number;
        conversions: number;
        cpa: number;
      };
      ads: Array<{
        id: string;
        name: string;
        status: string;
        type: string;
        finalUrls: string[];
        displayUrl?: string;
        path1?: string;
        path2?: string;
        headlines?: string[];
        descriptions?: string[];
        metrics: {
          impressions: number;
          clicks: number;
          ctr: number;
          cost: number;
          conversions: number;
        };
      }>;
    }>;
    error?: string;
  }> {
    this.logger.log(
      `getCampaignHierarchy: campaignId=${campaignId}, customerId=${customerId}`,
    );

    try {
      const customer = await this.getCustomerClient(
        connection,
        customerId,
        loginCustomerId,
      );

      // Calculate date range (default to last 30 days)
      const today = new Date();
      const defaultEndDate = today.toISOString().split("T")[0];
      const defaultStartDate = new Date(
        today.getTime() - 30 * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .split("T")[0];

      const dateFrom = startDate || defaultStartDate;
      const dateTo = endDate || defaultEndDate;

      // First, get campaign-level URL settings (tracking template, final URL suffix)
      let trackingUrlTemplate: string | undefined;
      let finalUrlSuffix: string | undefined;
      try {
        const campaignUrlQuery = `
          SELECT
            campaign.id,
            campaign.tracking_url_template,
            campaign.final_url_suffix
          FROM campaign
          WHERE campaign.id = ${campaignId}
        `;
        const campaignUrlResponse = await customer.query(campaignUrlQuery);
        if (campaignUrlResponse && campaignUrlResponse.length > 0) {
          trackingUrlTemplate =
            campaignUrlResponse[0].campaign?.tracking_url_template || undefined;
          finalUrlSuffix =
            campaignUrlResponse[0].campaign?.final_url_suffix || undefined;
        }
      } catch (e) {
        this.logger.warn(`Failed to get campaign URL settings: ${e.message}`);
      }

      // Query ad groups with metrics
      // ad_group.type indicates: SEARCH_STANDARD, SEARCH_DYNAMIC_ADS, DISPLAY_STANDARD, etc.
      const adGroupQuery = `
        SELECT
          ad_group.id,
          ad_group.name,
          ad_group.status,
          ad_group.type,
          ad_group.cpc_bid_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.ctr,
          metrics.cost_micros,
          metrics.conversions
        FROM ad_group
        WHERE campaign.id = ${campaignId}
          AND ad_group.status != 'REMOVED'
          AND segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      `;

      const adGroupResponse = await customer.query(adGroupQuery);

      // Aggregate ad group metrics (multiple rows per ad group due to date segmentation)
      const adGroupMap = new Map<
        string,
        {
          id: string;
          name: string;
          status: string;
          type: string;
          cpcBidMicros: number;
          impressions: number;
          clicks: number;
          costMicros: number;
          conversions: number;
        }
      >();

      // Map Google Ads AdGroupType enum to readable names
      // See: https://developers.google.com/google-ads/api/reference/rpc/v22/AdGroupTypeEnum.AdGroupType
      const adGroupTypeMap: Record<number | string, string> = {
        0: "UNSPECIFIED",
        1: "UNKNOWN",
        2: "SEARCH_STANDARD",
        3: "DISPLAY_STANDARD",
        4: "SHOPPING_PRODUCT_ADS",
        6: "SHOPPING_SMART_ADS",
        7: "SHOPPING_COMPARISON_LISTING_ADS",
        8: "VIDEO_BUMPER",
        9: "VIDEO_TRUE_VIEW_IN_STREAM",
        10: "VIDEO_TRUE_VIEW_IN_DISPLAY",
        11: "VIDEO_NON_SKIPPABLE_IN_STREAM",
        13: "SEARCH_DYNAMIC_ADS",
        14: "VIDEO_RESPONSIVE",
        15: "SMART_CAMPAIGN_ADS",
        16: "HOTEL_ADS",
        17: "VIDEO_EFFICIENT_REACH",
        18: "TRAVEL_ADS",
        19: "PROMOTED_HOTEL_ADS",
        20: "DEMAND_GEN_MULTI_ASSET",
        21: "DEMAND_GEN_VIDEO_RESPONSIVE",
        22: "DEMAND_GEN_PRODUCT",
        23: "YOUTUBE_AUDIO",
      };

      for (const row of adGroupResponse) {
        const id = String(row.ad_group.id);
        const existing = adGroupMap.get(id);

        // Convert raw type to readable name
        const rawType = row.ad_group.type;
        const adGroupType =
          adGroupTypeMap[rawType] ||
          adGroupTypeMap[String(rawType)] ||
          "UNKNOWN";

        if (existing) {
          existing.impressions += Number(row.metrics?.impressions || 0);
          existing.clicks += Number(row.metrics?.clicks || 0);
          existing.costMicros += Number(row.metrics?.cost_micros || 0);
          existing.conversions += Number(row.metrics?.conversions || 0);
        } else {
          adGroupMap.set(id, {
            id,
            name: row.ad_group.name || "",
            status: String(row.ad_group.status),
            type: adGroupType,
            cpcBidMicros: Number(row.ad_group.cpc_bid_micros || 0),
            impressions: Number(row.metrics?.impressions || 0),
            clicks: Number(row.metrics?.clicks || 0),
            costMicros: Number(row.metrics?.cost_micros || 0),
            conversions: Number(row.metrics?.conversions || 0),
          });
        }
      }

      // If no metrics data, try without date filter
      if (adGroupMap.size === 0) {
        const basicQuery = `
          SELECT
            ad_group.id,
            ad_group.name,
            ad_group.status,
            ad_group.type,
            ad_group.cpc_bid_micros
          FROM ad_group
          WHERE campaign.id = ${campaignId}
            AND ad_group.status != 'REMOVED'
        `;

        const basicResponse = await customer.query(basicQuery);
        for (const row of basicResponse) {
          const id = String(row.ad_group.id);
          // Convert raw type to readable name
          const rawType = row.ad_group.type;
          const adGroupType =
            adGroupTypeMap[rawType] ||
            adGroupTypeMap[String(rawType)] ||
            "UNKNOWN";

          adGroupMap.set(id, {
            id,
            name: row.ad_group.name || "",
            status: String(row.ad_group.status),
            type: adGroupType,
            cpcBidMicros: Number(row.ad_group.cpc_bid_micros || 0),
            impressions: 0,
            clicks: 0,
            costMicros: 0,
            conversions: 0,
          });
        }
      }

      // Query ads for all ad groups in this campaign
      // Include multiple ad types: RSA, Expanded Text Ads, and display URL info
      const adQuery = `
        SELECT
          ad_group_ad.ad.id,
          ad_group_ad.ad.name,
          ad_group_ad.ad.type,
          ad_group_ad.ad.final_urls,
          ad_group_ad.ad.display_url,
          ad_group_ad.ad.responsive_search_ad.headlines,
          ad_group_ad.ad.responsive_search_ad.descriptions,
          ad_group_ad.ad.responsive_search_ad.path1,
          ad_group_ad.ad.responsive_search_ad.path2,
          ad_group_ad.ad.expanded_text_ad.headline_part1,
          ad_group_ad.ad.expanded_text_ad.headline_part2,
          ad_group_ad.ad.expanded_text_ad.headline_part3,
          ad_group_ad.ad.expanded_text_ad.description,
          ad_group_ad.ad.expanded_text_ad.description2,
          ad_group_ad.ad.expanded_text_ad.path1,
          ad_group_ad.ad.expanded_text_ad.path2,
          ad_group_ad.ad.expanded_dynamic_search_ad.description,
          ad_group_ad.ad.expanded_dynamic_search_ad.description2,
          ad_group_ad.status,
          ad_group.id,
          metrics.impressions,
          metrics.clicks,
          metrics.ctr,
          metrics.cost_micros,
          metrics.conversions
        FROM ad_group_ad
        WHERE campaign.id = ${campaignId}
          AND ad_group_ad.status != 'REMOVED'
          AND segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      `;

      let adResponse: any[] = [];
      try {
        adResponse = await customer.query(adQuery);
      } catch (e) {
        this.logger.warn(`Failed to get ads with metrics: ${e.message}`);
        // Try without metrics
        const basicAdQuery = `
          SELECT
            ad_group_ad.ad.id,
            ad_group_ad.ad.name,
            ad_group_ad.ad.type,
            ad_group_ad.ad.final_urls,
            ad_group_ad.ad.display_url,
            ad_group_ad.ad.responsive_search_ad.headlines,
            ad_group_ad.ad.responsive_search_ad.descriptions,
            ad_group_ad.ad.responsive_search_ad.path1,
            ad_group_ad.ad.responsive_search_ad.path2,
            ad_group_ad.ad.expanded_text_ad.headline_part1,
            ad_group_ad.ad.expanded_text_ad.headline_part2,
            ad_group_ad.ad.expanded_text_ad.headline_part3,
            ad_group_ad.ad.expanded_text_ad.description,
            ad_group_ad.ad.expanded_text_ad.description2,
            ad_group_ad.ad.expanded_text_ad.path1,
            ad_group_ad.ad.expanded_text_ad.path2,
            ad_group_ad.ad.expanded_dynamic_search_ad.description,
            ad_group_ad.ad.expanded_dynamic_search_ad.description2,
            ad_group_ad.status,
            ad_group.id
          FROM ad_group_ad
          WHERE campaign.id = ${campaignId}
            AND ad_group_ad.status != 'REMOVED'
        `;
        try {
          adResponse = await customer.query(basicAdQuery);
        } catch (e2) {
          this.logger.warn(`Failed to get basic ads: ${e2.message}`);
        }
      }

      // Group ads by ad group and aggregate metrics
      const adsByAdGroup = new Map<
        string,
        Map<
          string,
          {
            id: string;
            name: string;
            status: string;
            type: string;
            finalUrls: string[];
            displayUrl: string;
            path1: string;
            path2: string;
            headlines: string[];
            descriptions: string[];
            impressions: number;
            clicks: number;
            costMicros: number;
            conversions: number;
          }
        >
      >();

      for (const row of adResponse) {
        const adGroupId = String(row.ad_group.id);
        const adId = String(row.ad_group_ad?.ad?.id || "");

        if (!adId) continue;

        if (!adsByAdGroup.has(adGroupId)) {
          adsByAdGroup.set(adGroupId, new Map());
        }

        const adMap = adsByAdGroup.get(adGroupId)!;
        const existing = adMap.get(adId);

        // Extract headlines, descriptions, and URL paths from different ad types
        const headlines: string[] = [];
        const descriptions: string[] = [];
        let path1 = "";
        let path2 = "";
        const ad = row.ad_group_ad?.ad;

        // 1. Responsive Search Ad (RSA)
        if (ad?.responsive_search_ad) {
          const rsa = ad.responsive_search_ad;
          if (rsa.headlines) {
            for (const h of rsa.headlines) {
              if (h.text) headlines.push(h.text);
            }
          }
          if (rsa.descriptions) {
            for (const d of rsa.descriptions) {
              if (d.text) descriptions.push(d.text);
            }
          }
          if (rsa.path1) path1 = rsa.path1;
          if (rsa.path2) path2 = rsa.path2;
        }

        // 2. Expanded Text Ad (ETA) - deprecated but still exists
        if (ad?.expanded_text_ad) {
          const eta = ad.expanded_text_ad;
          if (eta.headline_part1) headlines.push(eta.headline_part1);
          if (eta.headline_part2) headlines.push(eta.headline_part2);
          if (eta.headline_part3) headlines.push(eta.headline_part3);
          if (eta.description) descriptions.push(eta.description);
          if (eta.description2) descriptions.push(eta.description2);
          if (eta.path1) path1 = eta.path1;
          if (eta.path2) path2 = eta.path2;
        }

        // 3. Expanded Dynamic Search Ad (DSA)
        if (ad?.expanded_dynamic_search_ad) {
          const dsa = ad.expanded_dynamic_search_ad;
          // DSA headlines are auto-generated, we don't have them
          // But we have the descriptions
          if (dsa.description) descriptions.push(dsa.description);
          if (dsa.description2) descriptions.push(dsa.description2);
          // DSA uses the website URL directly, no path customization
        }

        // Map Google Ads AdType enum to readable names
        // See: https://developers.google.com/google-ads/api/reference/rpc/v22/AdTypeEnum.AdType
        const adTypeMap: Record<number | string, string> = {
          0: "UNSPECIFIED",
          1: "UNKNOWN",
          2: "TEXT_AD",
          3: "EXPANDED_TEXT_AD",
          7: "EXPANDED_DYNAMIC_SEARCH_AD",
          8: "HOTEL_AD",
          9: "SHOPPING_SMART_AD",
          10: "SHOPPING_PRODUCT_AD",
          12: "VIDEO_AD",
          14: "IMAGE_AD",
          15: "RESPONSIVE_SEARCH_AD",
          16: "LEGACY_RESPONSIVE_DISPLAY_AD",
          17: "APP_AD",
          18: "LEGACY_APP_INSTALL_AD",
          19: "RESPONSIVE_DISPLAY_AD",
          20: "LOCAL_AD",
          21: "HTML5_UPLOAD_AD",
          22: "DYNAMIC_HTML5_AD",
          23: "APP_ENGAGEMENT_AD",
          24: "SHOPPING_COMPARISON_LISTING_AD",
          25: "VIDEO_BUMPER_AD",
          26: "VIDEO_NON_SKIPPABLE_IN_STREAM_AD",
          29: "VIDEO_TRUEVIEW_IN_STREAM_AD",
          30: "VIDEO_RESPONSIVE_AD",
          31: "SMART_CAMPAIGN_AD",
          32: "CALL_AD",
          33: "APP_PRE_REGISTRATION_AD",
          34: "IN_FEED_VIDEO_AD",
          37: "TRAVEL_AD",
          39: "DEMAND_GEN_PRODUCT_AD",
          40: "DEMAND_GEN_MULTI_ASSET_AD",
          41: "DEMAND_GEN_CAROUSEL_AD",
          42: "DEMAND_GEN_VIDEO_RESPONSIVE_AD",
          44: "YOUTUBE_AUDIO_AD",
        };

        const rawAdType = row.ad_group_ad?.ad?.type;
        const adType =
          adTypeMap[rawAdType] || adTypeMap[String(rawAdType)] || "UNKNOWN";

        if (existing) {
          existing.impressions += Number(row.metrics?.impressions || 0);
          existing.clicks += Number(row.metrics?.clicks || 0);
          existing.costMicros += Number(row.metrics?.cost_micros || 0);
          existing.conversions += Number(row.metrics?.conversions || 0);
        } else {
          adMap.set(adId, {
            id: adId,
            name: row.ad_group_ad?.ad?.name || `Ad ${adId}`,
            status: String(row.ad_group_ad?.status || "UNKNOWN"),
            type: adType,
            finalUrls: row.ad_group_ad?.ad?.final_urls || [],
            displayUrl: row.ad_group_ad?.ad?.display_url || "",
            path1,
            path2,
            headlines,
            descriptions,
            impressions: Number(row.metrics?.impressions || 0),
            clicks: Number(row.metrics?.clicks || 0),
            costMicros: Number(row.metrics?.cost_micros || 0),
            conversions: Number(row.metrics?.conversions || 0),
          });
        }
      }

      // Build final result
      const adGroups = Array.from(adGroupMap.values()).map((ag) => {
        const cost = ag.costMicros / 1_000_000;
        const ctr = ag.impressions > 0 ? ag.clicks / ag.impressions : 0;
        const cpa = ag.conversions > 0 ? cost / ag.conversions : 0;

        const adsForGroup = adsByAdGroup.get(ag.id);
        const ads = adsForGroup
          ? Array.from(adsForGroup.values()).map((ad) => {
              const adCost = ad.costMicros / 1_000_000;
              const adCtr = ad.impressions > 0 ? ad.clicks / ad.impressions : 0;

              // Build display URL preview (e.g., "example.com/path1/path2")
              let displayUrlPreview = "";
              if (ad.finalUrls && ad.finalUrls.length > 0) {
                try {
                  const url = new URL(ad.finalUrls[0]);
                  displayUrlPreview = url.hostname;
                  if (ad.path1) displayUrlPreview += `/${ad.path1}`;
                  if (ad.path2) displayUrlPreview += `/${ad.path2}`;
                } catch {
                  displayUrlPreview = ad.displayUrl || "";
                }
              }

              return {
                id: ad.id,
                name: ad.name,
                status: ad.status,
                type: ad.type,
                finalUrls: ad.finalUrls,
                displayUrl: ad.displayUrl || displayUrlPreview,
                path1: ad.path1 || undefined,
                path2: ad.path2 || undefined,
                headlines: ad.headlines.length > 0 ? ad.headlines : undefined,
                descriptions:
                  ad.descriptions.length > 0 ? ad.descriptions : undefined,
                metrics: {
                  impressions: ad.impressions,
                  clicks: ad.clicks,
                  ctr: adCtr,
                  cost: adCost,
                  conversions: ad.conversions,
                },
              };
            })
          : [];

        return {
          id: ag.id,
          name: ag.name,
          status: ag.status,
          type: ag.type,
          cpcBidMicros: ag.cpcBidMicros,
          cpcBid: ag.cpcBidMicros / 1_000_000,
          metrics: {
            impressions: ag.impressions,
            clicks: ag.clicks,
            ctr,
            cost,
            conversions: ag.conversions,
            cpa,
          },
          ads,
        };
      });

      // Sort ad groups by impressions descending
      adGroups.sort((a, b) => b.metrics.impressions - a.metrics.impressions);

      return {
        success: true,
        trackingUrlTemplate,
        finalUrlSuffix,
        adGroups,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get campaign hierarchy: ${error.message}`);
      return {
        success: false,
        error: error.message || "Failed to get campaign hierarchy",
      };
    }
  }

  /**
   * Pause an ad group
   */
  async pauseAdGroup(
    connection: GoogleConnection,
    adGroupId: string,
  ): Promise<{ success: boolean; previousStatus?: string; error?: string }> {
    try {
      const client = await this.getCustomerClient(connection);

      // Get current status
      const query = `
        SELECT ad_group.status, ad_group.resource_name
        FROM ad_group
        WHERE ad_group.id = ${adGroupId}
        LIMIT 1
      `;

      const searchResponse = await client.query(query);
      if (!searchResponse || searchResponse.length === 0) {
        return { success: false, error: "Ad group not found" };
      }

      const adGroup = searchResponse[0].ad_group;
      const previousStatus = String(adGroup.status);

      // Update status
      const operation = {
        update: {
          resource_name: adGroup.resource_name,
          status: "PAUSED",
        },
        update_mask: "status",
      } as any;

      await client.adGroups.update([operation]);

      return { success: true, previousStatus: String(previousStatus) };
    } catch (error: any) {
      this.logger.error(`Failed to pause ad group: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enable an ad group
   */
  async enableAdGroup(
    connection: GoogleConnection,
    adGroupId: string,
  ): Promise<{ success: boolean; previousStatus?: string; error?: string }> {
    try {
      const client = await this.getCustomerClient(connection);

      // Get current status
      const query = `
        SELECT ad_group.status, ad_group.resource_name
        FROM ad_group
        WHERE ad_group.id = ${adGroupId}
        LIMIT 1
      `;

      const searchResponse = await client.query(query);
      if (!searchResponse || searchResponse.length === 0) {
        return { success: false, error: "Ad group not found" };
      }

      const adGroup = searchResponse[0].ad_group;
      const previousStatus = String(adGroup.status);

      // Update status
      const operation = {
        update: {
          resource_name: adGroup.resource_name,
          status: "ENABLED",
        },
        update_mask: "status",
      } as any;

      await client.adGroups.update([operation]);

      return { success: true, previousStatus: String(previousStatus) };
    } catch (error: any) {
      this.logger.error(`Failed to enable ad group: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Pause an ad
   */
  async pauseAd(
    connection: GoogleConnection,
    adId: string,
  ): Promise<{ success: boolean; previousStatus?: string; error?: string }> {
    try {
      const client = await this.getCustomerClient(connection);

      // Get current status
      const query = `
        SELECT ad_group_ad.status, ad_group_ad.resource_name
        FROM ad_group_ad
        WHERE ad_group_ad.ad.id = ${adId}
        LIMIT 1
      `;

      const searchResponse = await client.query(query);
      if (!searchResponse || searchResponse.length === 0) {
        return { success: false, error: "Ad not found" };
      }

      const ad = searchResponse[0].ad_group_ad;
      const previousStatus = String(ad.status);

      // Update status
      const operation = {
        update: {
          resource_name: ad.resource_name,
          status: "PAUSED",
        },
        update_mask: "status",
      } as any;

      await client.adGroupAds.update([operation]);

      return { success: true, previousStatus: String(previousStatus) };
    } catch (error: any) {
      this.logger.error(`Failed to pause ad: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enable an ad
   */
  async enableAd(
    connection: GoogleConnection,
    adId: string,
  ): Promise<{ success: boolean; previousStatus?: string; error?: string }> {
    try {
      const client = await this.getCustomerClient(connection);

      // Get current status
      const query = `
        SELECT ad_group_ad.status, ad_group_ad.resource_name
        FROM ad_group_ad
        WHERE ad_group_ad.ad.id = ${adId}
        LIMIT 1
      `;

      const searchResponse = await client.query(query);
      if (!searchResponse || searchResponse.length === 0) {
        return { success: false, error: "Ad not found" };
      }

      const ad = searchResponse[0].ad_group_ad;
      const previousStatus = String(ad.status);

      // Update status
      const operation = {
        update: {
          resource_name: ad.resource_name,
          status: "ENABLED",
        },
        update_mask: "status",
      } as any;

      await client.adGroupAds.update([operation]);

      return { success: true, previousStatus: String(previousStatus) };
    } catch (error: any) {
      this.logger.error(`Failed to enable ad: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get ads for a specific ad group
   * Used for on-demand loading when expanding ad groups in the unified ads table
   */
  async getAdGroupAds(
    connection: GoogleConnection,
    adGroupId: string,
    customerId?: string,
    loginCustomerId?: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<{
    success: boolean;
    ads?: Array<{
      id: string;
      name: string;
      status: string;
      type: string;
      finalUrls: string[];
      displayUrl: string;
      displayUrlPreview: string;
      path1: string;
      path2: string;
      headlines: string[];
      descriptions: string[];
      metrics: {
        impressions: number;
        clicks: number;
        ctr: number;
        cost: number;
        conversions: number;
      };
    }>;
    error?: string;
  }> {
    this.logger.log(
      `getAdGroupAds: adGroupId=${adGroupId}, customerId=${customerId}`,
    );

    try {
      const customer = await this.getCustomerClient(
        connection,
        customerId,
        loginCustomerId,
      );

      // Default to last 7 days if no date range specified
      const now = new Date();
      const defaultDateFrom = new Date(now);
      defaultDateFrom.setDate(now.getDate() - 7);

      const effectiveDateFrom =
        dateFrom || defaultDateFrom.toISOString().split("T")[0];
      const effectiveDateTo = dateTo || now.toISOString().split("T")[0];

      // Query ads for the specific ad group with full creative details
      // Includes: tracking URLs, UTM parameters, all ad type variants
      const adQuery = `
        SELECT
          ad_group_ad.ad.id,
          ad_group_ad.ad.name,
          ad_group_ad.ad.type,
          ad_group_ad.ad.final_urls,
          ad_group_ad.ad.final_mobile_urls,
          ad_group_ad.ad.display_url,
          ad_group_ad.ad.tracking_url_template,
          ad_group_ad.ad.final_url_suffix,
          ad_group_ad.ad.url_custom_parameters,
          ad_group_ad.ad.device_preference,
          ad_group_ad.ad.added_by_google_ads,
          ad_group_ad.ad.responsive_search_ad.headlines,
          ad_group_ad.ad.responsive_search_ad.descriptions,
          ad_group_ad.ad.responsive_search_ad.path1,
          ad_group_ad.ad.responsive_search_ad.path2,
          ad_group_ad.ad.expanded_text_ad.headline_part1,
          ad_group_ad.ad.expanded_text_ad.headline_part2,
          ad_group_ad.ad.expanded_text_ad.headline_part3,
          ad_group_ad.ad.expanded_text_ad.description,
          ad_group_ad.ad.expanded_text_ad.description2,
          ad_group_ad.ad.expanded_text_ad.path1,
          ad_group_ad.ad.expanded_text_ad.path2,
          ad_group_ad.ad.expanded_dynamic_search_ad.description,
          ad_group_ad.ad.expanded_dynamic_search_ad.description2,
          ad_group_ad.ad.call_ad.country_code,
          ad_group_ad.ad.call_ad.phone_number,
          ad_group_ad.ad.call_ad.business_name,
          ad_group_ad.ad.call_ad.headline1,
          ad_group_ad.ad.call_ad.headline2,
          ad_group_ad.ad.call_ad.description1,
          ad_group_ad.ad.call_ad.description2,
          ad_group_ad.ad.call_ad.call_tracked,
          ad_group_ad.ad.call_ad.disable_call_conversion,
          ad_group_ad.ad.call_ad.path1,
          ad_group_ad.ad.call_ad.path2,
          ad_group_ad.ad.image_ad.pixel_width,
          ad_group_ad.ad.image_ad.pixel_height,
          ad_group_ad.ad.image_ad.image_url,
          ad_group_ad.ad.image_ad.preview_pixel_width,
          ad_group_ad.ad.image_ad.preview_pixel_height,
          ad_group_ad.ad.image_ad.preview_image_url,
          ad_group_ad.ad.image_ad.name,
          ad_group_ad.ad.responsive_display_ad.headlines,
          ad_group_ad.ad.responsive_display_ad.long_headline,
          ad_group_ad.ad.responsive_display_ad.descriptions,
          ad_group_ad.ad.responsive_display_ad.business_name,
          ad_group_ad.ad.responsive_display_ad.main_color,
          ad_group_ad.ad.responsive_display_ad.accent_color,
          ad_group_ad.ad.responsive_display_ad.call_to_action_text,
          ad_group_ad.ad.responsive_display_ad.price_prefix,
          ad_group_ad.ad.responsive_display_ad.promo_text,
          ad_group_ad.ad.responsive_display_ad.format_setting,
          ad_group_ad.status,
          ad_group.tracking_url_template,
          ad_group.final_url_suffix,
          campaign.tracking_url_template,
          campaign.final_url_suffix,
          campaign.url_custom_parameters,
          metrics.impressions,
          metrics.clicks,
          metrics.ctr,
          metrics.cost_micros,
          metrics.conversions
        FROM ad_group_ad
        WHERE ad_group.id = ${adGroupId}
          AND ad_group_ad.status != 'REMOVED'
          AND segments.date BETWEEN '${effectiveDateFrom}' AND '${effectiveDateTo}'
      `;

      let adResponse: any[] = [];
      try {
        this.logger.log(`Executing ad query for ad group ${adGroupId}`);
        adResponse = await customer.query(adQuery);
        this.logger.log(`Ad query returned ${adResponse.length} rows`);
      } catch (e) {
        this.logger.warn(
          `Failed to get ads with metrics for ad group ${adGroupId}: ${e.message}`,
        );
        this.logger.warn(`Query error details: ${JSON.stringify(e)}`);
        // Try without metrics (for cases where no impressions in the date range)
        const basicAdQuery = `
          SELECT
            ad_group_ad.ad.id,
            ad_group_ad.ad.name,
            ad_group_ad.ad.type,
            ad_group_ad.ad.final_urls,
            ad_group_ad.ad.final_mobile_urls,
            ad_group_ad.ad.display_url,
            ad_group_ad.ad.tracking_url_template,
            ad_group_ad.ad.final_url_suffix,
            ad_group_ad.ad.url_custom_parameters,
            ad_group_ad.ad.device_preference,
            ad_group_ad.ad.added_by_google_ads,
            ad_group_ad.ad.responsive_search_ad.headlines,
            ad_group_ad.ad.responsive_search_ad.descriptions,
            ad_group_ad.ad.responsive_search_ad.path1,
            ad_group_ad.ad.responsive_search_ad.path2,
            ad_group_ad.ad.expanded_text_ad.headline_part1,
            ad_group_ad.ad.expanded_text_ad.headline_part2,
            ad_group_ad.ad.expanded_text_ad.headline_part3,
            ad_group_ad.ad.expanded_text_ad.description,
            ad_group_ad.ad.expanded_text_ad.description2,
            ad_group_ad.ad.expanded_text_ad.path1,
            ad_group_ad.ad.expanded_text_ad.path2,
            ad_group_ad.ad.expanded_dynamic_search_ad.description,
            ad_group_ad.ad.expanded_dynamic_search_ad.description2,
            ad_group_ad.ad.call_ad.country_code,
            ad_group_ad.ad.call_ad.phone_number,
            ad_group_ad.ad.call_ad.business_name,
            ad_group_ad.ad.call_ad.headline1,
            ad_group_ad.ad.call_ad.headline2,
            ad_group_ad.ad.call_ad.description1,
            ad_group_ad.ad.call_ad.description2,
            ad_group_ad.ad.call_ad.call_tracked,
            ad_group_ad.ad.call_ad.disable_call_conversion,
            ad_group_ad.ad.call_ad.path1,
            ad_group_ad.ad.call_ad.path2,
            ad_group_ad.ad.image_ad.pixel_width,
            ad_group_ad.ad.image_ad.pixel_height,
            ad_group_ad.ad.image_ad.image_url,
            ad_group_ad.ad.image_ad.preview_pixel_width,
            ad_group_ad.ad.image_ad.preview_pixel_height,
            ad_group_ad.ad.image_ad.preview_image_url,
            ad_group_ad.ad.image_ad.name,
            ad_group_ad.ad.video_ad.video.id,
            ad_group_ad.ad.responsive_display_ad.headlines,
            ad_group_ad.ad.responsive_display_ad.long_headline,
            ad_group_ad.ad.responsive_display_ad.descriptions,
            ad_group_ad.ad.responsive_display_ad.business_name,
            ad_group_ad.ad.responsive_display_ad.main_color,
            ad_group_ad.ad.responsive_display_ad.accent_color,
            ad_group_ad.ad.responsive_display_ad.call_to_action_text,
            ad_group_ad.ad.responsive_display_ad.price_prefix,
            ad_group_ad.ad.responsive_display_ad.promo_text,
            ad_group_ad.ad.responsive_display_ad.format_setting,
            ad_group_ad.status,
            ad_group.tracking_url_template,
            ad_group.final_url_suffix,
            campaign.tracking_url_template,
            campaign.final_url_suffix,
            campaign.url_custom_parameters
          FROM ad_group_ad
          WHERE ad_group.id = ${adGroupId}
            AND ad_group_ad.status != 'REMOVED'
        `;
        try {
          this.logger.log(`Trying basic query for ad group ${adGroupId}`);
          adResponse = await customer.query(basicAdQuery);
          this.logger.log(`Basic query returned ${adResponse.length} rows`);
        } catch (e2) {
          this.logger.warn(
            `Failed to get basic ads for ad group ${adGroupId}: ${e2.message}`,
          );
          this.logger.warn(`Basic query error details: ${JSON.stringify(e2)}`);
        }
      }

      // Map ad type enum to readable names
      const adTypeMap: Record<number | string, string> = {
        0: "UNSPECIFIED",
        1: "UNKNOWN",
        2: "TEXT_AD",
        3: "EXPANDED_TEXT_AD",
        7: "EXPANDED_DYNAMIC_SEARCH_AD",
        8: "HOTEL_AD",
        9: "SHOPPING_SMART_AD",
        10: "SHOPPING_PRODUCT_AD",
        12: "VIDEO_AD",
        14: "IMAGE_AD",
        15: "RESPONSIVE_SEARCH_AD",
        16: "LEGACY_RESPONSIVE_DISPLAY_AD",
        17: "APP_AD",
        18: "LEGACY_APP_INSTALL_AD",
        19: "RESPONSIVE_DISPLAY_AD",
        20: "LOCAL_AD",
        21: "HTML5_UPLOAD_AD",
        22: "DYNAMIC_HTML5_AD",
        23: "APP_ENGAGEMENT_AD",
        24: "SHOPPING_COMPARISON_LISTING_AD",
        25: "VIDEO_BUMPER_AD",
        26: "VIDEO_NON_SKIPPABLE_IN_STREAM_AD",
        29: "VIDEO_TRUEVIEW_IN_STREAM_AD",
        30: "VIDEO_RESPONSIVE_AD",
        31: "SMART_CAMPAIGN_AD",
        32: "CALL_AD",
        33: "APP_PRE_REGISTRATION_AD",
        34: "IN_FEED_VIDEO_AD",
        37: "TRAVEL_AD",
        39: "DEMAND_GEN_PRODUCT_AD",
        40: "DEMAND_GEN_MULTI_ASSET_AD",
        41: "DEMAND_GEN_CAROUSEL_AD",
        42: "DEMAND_GEN_VIDEO_RESPONSIVE_AD",
        44: "YOUTUBE_AUDIO_AD",
      };

      // Aggregate metrics by ad ID (multiple rows per ad due to date segmentation)
      const adMap = new Map<
        string,
        {
          id: string;
          name: string;
          status: string;
          type: string;
          finalUrls: string[];
          finalMobileUrls: string[];
          displayUrl: string;
          path1: string;
          path2: string;
          headlines: string[];
          descriptions: string[];
          // Tracking URLs (can come from ad, ad group, or campaign level)
          trackingUrlTemplate: string;
          finalUrlSuffix: string;
          urlCustomParameters: Array<{ key: string; value: string }>;
          // Ad-level tracking (overrides campaign/ad group)
          adTrackingUrlTemplate: string;
          adFinalUrlSuffix: string;
          // Additional ad type fields
          devicePreference: string;
          addedByGoogleAds: boolean;
          // Call Ad fields
          callAd?: {
            countryCode: string;
            phoneNumber: string;
            businessName: string;
            headline1: string;
            headline2: string;
            description1: string;
            description2: string;
            callTracked: boolean;
            disableCallConversion: boolean;
            phoneNumberVerificationUrl: string;
            conversionAction: string;
            conversionReportingState: string;
          };
          // Image Ad fields
          imageAd?: {
            pixelWidth: number;
            pixelHeight: number;
            imageUrl: string;
            previewImageUrl: string;
            name: string;
          };
          // Video Ad fields
          videoAd?: {
            videoId: string;
          };
          // Responsive Display Ad fields
          responsiveDisplayAd?: {
            headlines: string[];
            longHeadline: string;
            descriptions: string[];
            businessName: string;
            callToActionText: string;
            mainColor: string;
            accentColor: string;
            pricePrefix: string;
            promoText: string;
            formatSetting: string;
          };
          impressions: number;
          clicks: number;
          costMicros: number;
          conversions: number;
        }
      >();

      for (const row of adResponse) {
        const adId = String(row.ad_group_ad?.ad?.id || "");
        if (!adId) continue;

        const existing = adMap.get(adId);

        // Extract headlines, descriptions, and URL paths from different ad types
        const headlines: string[] = [];
        const descriptions: string[] = [];
        let path1 = "";
        let path2 = "";
        const ad = row.ad_group_ad?.ad;

        // 1. Responsive Search Ad (RSA)
        if (ad?.responsive_search_ad) {
          const rsa = ad.responsive_search_ad;
          if (rsa.headlines) {
            for (const h of rsa.headlines) {
              if (h.text) headlines.push(h.text);
            }
          }
          if (rsa.descriptions) {
            for (const d of rsa.descriptions) {
              if (d.text) descriptions.push(d.text);
            }
          }
          if (rsa.path1) path1 = rsa.path1;
          if (rsa.path2) path2 = rsa.path2;
        }

        // 2. Expanded Text Ad (ETA) - deprecated but still exists
        if (ad?.expanded_text_ad) {
          const eta = ad.expanded_text_ad;
          if (eta.headline_part1) headlines.push(eta.headline_part1);
          if (eta.headline_part2) headlines.push(eta.headline_part2);
          if (eta.headline_part3) headlines.push(eta.headline_part3);
          if (eta.description) descriptions.push(eta.description);
          if (eta.description2) descriptions.push(eta.description2);
          if (eta.path1) path1 = eta.path1;
          if (eta.path2) path2 = eta.path2;
        }

        // 3. Expanded Dynamic Search Ad (DSA)
        if (ad?.expanded_dynamic_search_ad) {
          const dsa = ad.expanded_dynamic_search_ad;
          if (dsa.description) descriptions.push(dsa.description);
          if (dsa.description2) descriptions.push(dsa.description2);
        }

        // 4. Call Ad
        let callAd: any = undefined;
        if (ad?.call_ad) {
          const ca = ad.call_ad;
          callAd = {
            countryCode: ca.country_code || "",
            phoneNumber: ca.phone_number || "",
            businessName: ca.business_name || "",
            headline1: ca.headline1 || "",
            headline2: ca.headline2 || "",
            description1: ca.description1 || "",
            description2: ca.description2 || "",
            callTracked: ca.call_tracked || false,
            disableCallConversion: ca.disable_call_conversion || false,
          };
          // Call ads also have headlines and descriptions
          if (ca.headline1) headlines.push(ca.headline1);
          if (ca.headline2) headlines.push(ca.headline2);
          if (ca.description1) descriptions.push(ca.description1);
          if (ca.description2) descriptions.push(ca.description2);
          if (ca.path1) path1 = ca.path1;
          if (ca.path2) path2 = ca.path2;
        }

        // 5. Image Ad
        let imageAd: any = undefined;
        if (ad?.image_ad) {
          const ia = ad.image_ad;
          imageAd = {
            pixelWidth: ia.pixel_width || 0,
            pixelHeight: ia.pixel_height || 0,
            imageUrl: ia.image_url || "",
            previewImageUrl: ia.preview_image_url || "",
            name: ia.name || "",
          };
        }

        // 6. Video Ad
        let videoAd: any = undefined;
        if (ad?.video_ad?.video?.id) {
          videoAd = {
            videoId: ad.video_ad.video.id,
          };
        }

        // 7. Responsive Display Ad
        let responsiveDisplayAd: any = undefined;
        if (ad?.responsive_display_ad) {
          const rda = ad.responsive_display_ad;
          const rdaHeadlines: string[] = [];
          const rdaDescriptions: string[] = [];
          if (rda.headlines) {
            for (const h of rda.headlines) {
              if (h.text) rdaHeadlines.push(h.text);
            }
          }
          if (rda.descriptions) {
            for (const d of rda.descriptions) {
              if (d.text) rdaDescriptions.push(d.text);
            }
          }
          responsiveDisplayAd = {
            headlines: rdaHeadlines,
            longHeadline: rda.long_headline?.text || "",
            descriptions: rdaDescriptions,
            businessName: rda.business_name || "",
            callToActionText: rda.call_to_action_text || "",
            mainColor: rda.main_color || "",
            accentColor: rda.accent_color || "",
            pricePrefix: rda.price_prefix || "",
            promoText: rda.promo_text || "",
            formatSetting: rda.format_setting || "",
          };
          // Also add to main headlines/descriptions
          headlines.push(...rdaHeadlines);
          if (rda.long_headline?.text) headlines.push(rda.long_headline.text);
          descriptions.push(...rdaDescriptions);
        }

        // Extract tracking URL info (priority: ad > ad group > campaign)
        const adTrackingUrlTemplate = ad?.tracking_url_template || "";
        const adFinalUrlSuffix = ad?.final_url_suffix || "";
        const adGroupTrackingUrlTemplate =
          row.ad_group?.tracking_url_template || "";
        const adGroupFinalUrlSuffix = row.ad_group?.final_url_suffix || "";
        const campaignTrackingUrlTemplate =
          row.campaign?.tracking_url_template || "";
        const campaignFinalUrlSuffix = row.campaign?.final_url_suffix || "";

        // Use most specific (ad level overrides ad group which overrides campaign)
        const effectiveTrackingUrlTemplate =
          adTrackingUrlTemplate ||
          adGroupTrackingUrlTemplate ||
          campaignTrackingUrlTemplate;
        const effectiveFinalUrlSuffix =
          adFinalUrlSuffix || adGroupFinalUrlSuffix || campaignFinalUrlSuffix;

        // Extract URL custom parameters
        const urlCustomParameters: Array<{ key: string; value: string }> = [];
        const customParams =
          ad?.url_custom_parameters ||
          row.campaign?.url_custom_parameters ||
          [];
        for (const param of customParams) {
          if (param.key && param.value) {
            urlCustomParameters.push({ key: param.key, value: param.value });
          }
        }

        const rawAdType = row.ad_group_ad?.ad?.type;
        const adType =
          adTypeMap[rawAdType] || adTypeMap[String(rawAdType)] || "UNKNOWN";

        if (existing) {
          existing.impressions += Number(row.metrics?.impressions || 0);
          existing.clicks += Number(row.metrics?.clicks || 0);
          existing.costMicros += Number(row.metrics?.cost_micros || 0);
          existing.conversions += Number(row.metrics?.conversions || 0);
        } else {
          adMap.set(adId, {
            id: adId,
            name: row.ad_group_ad?.ad?.name || `Ad ${adId}`,
            status: String(row.ad_group_ad?.status || "UNKNOWN"),
            type: adType,
            finalUrls: row.ad_group_ad?.ad?.final_urls || [],
            finalMobileUrls: row.ad_group_ad?.ad?.final_mobile_urls || [],
            displayUrl: row.ad_group_ad?.ad?.display_url || "",
            path1,
            path2,
            headlines,
            descriptions,
            // Tracking URLs
            trackingUrlTemplate: effectiveTrackingUrlTemplate,
            finalUrlSuffix: effectiveFinalUrlSuffix,
            urlCustomParameters,
            adTrackingUrlTemplate,
            adFinalUrlSuffix,
            // Additional fields
            devicePreference: ad?.device_preference || "",
            addedByGoogleAds: ad?.added_by_google_ads || false,
            // Ad type specific data
            callAd,
            imageAd,
            videoAd,
            responsiveDisplayAd,
            impressions: Number(row.metrics?.impressions || 0),
            clicks: Number(row.metrics?.clicks || 0),
            costMicros: Number(row.metrics?.cost_micros || 0),
            conversions: Number(row.metrics?.conversions || 0),
          });
        }
      }

      // Build final result with computed metrics
      const ads = Array.from(adMap.values()).map((ad) => {
        const cost = ad.costMicros / 1_000_000;
        const ctr = ad.impressions > 0 ? ad.clicks / ad.impressions : 0;

        // Build display URL preview (e.g., "example.com/path1/path2")
        let displayUrlPreview = "";
        if (ad.finalUrls && ad.finalUrls.length > 0) {
          try {
            const url = new URL(ad.finalUrls[0]);
            displayUrlPreview = url.hostname;
            if (ad.path1) displayUrlPreview += `/${ad.path1}`;
            if (ad.path2) displayUrlPreview += `/${ad.path2}`;
          } catch {
            displayUrlPreview = ad.displayUrl || "";
          }
        }

        return {
          id: ad.id,
          name: ad.name,
          status: ad.status,
          type: ad.type,
          finalUrls: ad.finalUrls,
          finalMobileUrls: ad.finalMobileUrls,
          displayUrl: ad.displayUrl,
          displayUrlPreview,
          path1: ad.path1,
          path2: ad.path2,
          headlines: ad.headlines,
          descriptions: ad.descriptions,
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
          metrics: {
            impressions: ad.impressions,
            clicks: ad.clicks,
            ctr,
            cost,
            conversions: ad.conversions,
          },
        };
      });

      // Sort by impressions descending
      ads.sort((a, b) => b.metrics.impressions - a.metrics.impressions);

      return {
        success: true,
        ads,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to get ads for ad group ${adGroupId}: ${error.message}`,
      );
      return {
        success: false,
        error: error.message || "Failed to get ad group ads",
      };
    }
  }
}
