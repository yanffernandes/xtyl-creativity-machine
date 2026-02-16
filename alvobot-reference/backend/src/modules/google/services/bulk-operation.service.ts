import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { GoogleAdsApiService } from "./google-ads-api.service";
import {
  GoogleCreditsService,
  GOOGLE_CREDIT_COSTS,
} from "./google-credits.service";
import {
  BulkOperationJob,
  BulkOperationType,
  BulkOperationStatus,
  BulkLocationConfig,
  BulkProductConfig,
} from "../entities/bulk-operation-job.entity";
import {
  BulkOperationItem,
  BulkItemStatus,
  BulkLocationInputData,
  BulkProductInputData,
} from "../entities/bulk-operation-item.entity";
import {
  GoogleConnection,
  isGoogleConnection,
} from "../entities/google-connection.entity";

// DTOs for creating bulk operations
export interface CreateBulkLocationJobDto {
  connectionId: string;
  workspaceId?: string | null;
  locations: Array<{
    code: string;
    name: string;
    customBudget?: number;
    customKeywords?: string[];
  }>;
  baseTemplate: {
    campaignName: string;
    goal?: string; // Deprecated: goal is UI-only in Google Ads, not used in API
    budget: number;
    budgetType: "daily" | "total";
    biddingStrategy?: string;
    languages?: string[];
    adGroup: {
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
    };
  };
  variations?: {
    includeLocationInName?: boolean;
    includeLocationInKeywords?: boolean;
    includeLocationInAds?: boolean;
  };
}

export interface CreateBulkProductJobDto {
  connectionId: string;
  workspaceId?: string | null;
  products: Array<{
    name: string;
    description?: string;
    url: string;
    price?: number;
    category?: string;
  }>;
  aiSettings: {
    generateKeywords: boolean;
    generateHeadlines: boolean;
    generateDescriptions: boolean;
    keywordsPerProduct?: number;
    headlinesPerProduct?: number;
    descriptionsPerProduct?: number;
  };
  campaignDefaults: {
    goal?: string;
    budget: number;
    budgetType: "daily" | "total";
    locations?: string[];
    languages?: string[];
  };
}

// Job progress info
export interface JobProgress {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  percentage: number;
}

@Injectable()
export class BulkOperationService {
  private readonly logger = new Logger(BulkOperationService.name);
  private supabase: SupabaseClient;

  constructor(
    private configService: ConfigService,
    private googleAdsApiService: GoogleAdsApiService,
    private googleCreditsService: GoogleCreditsService,
  ) {
    const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
    const supabaseServiceKey = this.configService.get<string>(
      "SUPABASE_SERVICE_KEY",
    );

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Get user's Google connections (for selection dropdown)
   */
  async getUserGoogleConnections(userId: string): Promise<GoogleConnection[]> {
    const { data, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("user_id", userId)
      .eq("plataform_name", "google")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      this.logger.error("Failed to fetch user connections:", error);
      throw new BadRequestException("Failed to fetch connections");
    }

    // Filter and cast to GoogleConnection
    return (data || []).filter(isGoogleConnection) as GoogleConnection[];
  }

  /**
   * Get a specific connection for a user
   */
  async getConnection(
    userId: string,
    connectionId: string,
  ): Promise<GoogleConnection> {
    const { data, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .eq("user_id", userId)
      .eq("plataform_name", "google")
      .single();

    if (error || !data) {
      throw new NotFoundException("Connection not found");
    }

    if (!isGoogleConnection(data)) {
      throw new BadRequestException("Invalid Google connection");
    }

    return data as GoogleConnection;
  }

  /**
   * Create a bulk location job
   */
  async createBulkLocationJob(
    userId: string,
    dto: CreateBulkLocationJobDto,
  ): Promise<BulkOperationJob> {
    // Validate connection belongs to user
    await this.getConnection(userId, dto.connectionId);

    // Calculate required credits
    const creditCalc = this.googleCreditsService.calculateBulkLocationCredits(
      dto.locations.length,
      false, // hasExtensions
    );
    const requiredCredits = creditCalc.total;

    // Check credits (use workspace if provided)
    const creditCheck = await this.googleCreditsService.checkCredits(
      userId,
      requiredCredits,
      dto.workspaceId,
    );

    if (!creditCheck.hasCredits) {
      throw new ForbiddenException(
        `Créditos insuficientes. Necessário: ${requiredCredits}, Disponível: ${creditCheck.available}`,
      );
    }

    // Create job config
    const config: BulkLocationConfig = {
      connection_id: dto.connectionId,
      base_template: {
        campaign: {
          name: dto.baseTemplate.campaignName,
          goal: dto.baseTemplate.goal,
          budget: dto.baseTemplate.budget,
          budget_type: dto.baseTemplate.budgetType,
          bidding_strategy: dto.baseTemplate.biddingStrategy,
          languages: dto.baseTemplate.languages,
        },
        ad_group: {
          name: dto.baseTemplate.adGroup.name,
          keywords: dto.baseTemplate.adGroup.keywords.map((k) => ({
            text: k.text,
            match_type: k.matchType,
          })),
          ads: dto.baseTemplate.adGroup.ads.map((a) => ({
            headlines: a.headlines,
            descriptions: a.descriptions,
            final_url: a.finalUrl,
            path1: a.path1,
            path2: a.path2,
          })),
        },
      },
      locations: dto.locations.map((loc) => ({
        code: loc.code,
        name: loc.name,
        custom_budget: loc.customBudget,
        custom_keywords: loc.customKeywords,
      })),
      variations: {
        include_location_in_name: dto.variations?.includeLocationInName ?? true,
        include_location_in_keywords:
          dto.variations?.includeLocationInKeywords ?? true,
        include_location_in_ads: dto.variations?.includeLocationInAds ?? false,
      },
    };

    // Create job record
    const { data: job, error } = await this.supabase
      .from("bulk_operation_jobs")
      .insert({
        user_id: userId,
        workspace_id: dto.workspaceId || null,
        type: "bulk_location" as BulkOperationType,
        status: "pending" as BulkOperationStatus,
        config,
        total_items: dto.locations.length,
        completed_items: 0,
        failed_items: 0,
        estimated_credits: requiredCredits,
        consumed_credits: 0,
        error_log: [],
      })
      .select()
      .single();

    if (error) {
      this.logger.error("Failed to create bulk location job:", error);
      throw new BadRequestException("Failed to create job");
    }

    // Create item records for each location
    const items = dto.locations.map((location, index) => ({
      job_id: job.id,
      item_index: index,
      item_name: location.name,
      status: "pending" as BulkItemStatus,
      input_data: {
        location_code: location.code,
        location_name: location.name,
        custom_budget: location.customBudget,
        custom_keywords: location.customKeywords,
      } as BulkLocationInputData,
      credits_cost: GOOGLE_CREDIT_COSTS.BULK_LOCATION_CAMPAIGN,
      retry_count: 0,
    }));

    const { error: itemsError } = await this.supabase
      .from("bulk_operation_items")
      .insert(items);

    if (itemsError) {
      this.logger.error("Failed to create bulk operation items:", itemsError);
      // Cleanup job on failure
      await this.supabase.from("bulk_operation_jobs").delete().eq("id", job.id);
      throw new BadRequestException("Failed to create job items");
    }

    this.logger.log(
      `Created bulk location job ${job.id} with ${dto.locations.length} items`,
    );
    return job;
  }

  /**
   * Create a bulk product job
   */
  async createBulkProductJob(
    userId: string,
    dto: CreateBulkProductJobDto,
  ): Promise<BulkOperationJob> {
    // Validate connection
    await this.getConnection(userId, dto.connectionId);

    // Calculate required credits
    const creditCalc = this.googleCreditsService.calculateBulkProductCredits(
      dto.products.length,
      {
        generateKeywords: dto.aiSettings.generateKeywords,
        generateHeadlines: dto.aiSettings.generateHeadlines,
        generateDescriptions: dto.aiSettings.generateDescriptions,
      },
      false, // hasExtensions
    );
    const requiredCredits = creditCalc.total;

    // Check credits (use workspace if provided)
    const creditCheck = await this.googleCreditsService.checkCredits(
      userId,
      requiredCredits,
      dto.workspaceId,
    );

    if (!creditCheck.hasCredits) {
      throw new ForbiddenException(
        `Créditos insuficientes. Necessário: ${requiredCredits}, Disponível: ${creditCheck.available}`,
      );
    }

    // Create job config
    const config: BulkProductConfig = {
      connection_id: dto.connectionId,
      products: dto.products.map((p) => ({
        name: p.name,
        description: p.description,
        url: p.url,
        price: p.price,
        category: p.category,
      })),
      ai_settings: {
        generate_keywords: dto.aiSettings.generateKeywords,
        generate_headlines: dto.aiSettings.generateHeadlines,
        generate_descriptions: dto.aiSettings.generateDescriptions,
        keywords_per_product: dto.aiSettings.keywordsPerProduct || 10,
        headlines_per_product: dto.aiSettings.headlinesPerProduct || 10,
        descriptions_per_product: dto.aiSettings.descriptionsPerProduct || 4,
      },
      campaign_defaults: {
        goal: dto.campaignDefaults.goal,
        budget: dto.campaignDefaults.budget,
        budget_type: dto.campaignDefaults.budgetType,
        locations: dto.campaignDefaults.locations,
        languages: dto.campaignDefaults.languages,
      },
    };

    // Create job record
    const { data: job, error } = await this.supabase
      .from("bulk_operation_jobs")
      .insert({
        user_id: userId,
        workspace_id: dto.workspaceId || null,
        type: "bulk_product" as BulkOperationType,
        status: "pending" as BulkOperationStatus,
        config,
        total_items: dto.products.length,
        completed_items: 0,
        failed_items: 0,
        estimated_credits: requiredCredits,
        consumed_credits: 0,
        error_log: [],
      })
      .select()
      .single();

    if (error) {
      this.logger.error("Failed to create bulk product job:", error);
      throw new BadRequestException("Failed to create job");
    }

    // Create item records
    const items = dto.products.map((product, index) => ({
      job_id: job.id,
      item_index: index,
      item_name: product.name,
      status: "pending" as BulkItemStatus,
      input_data: {
        product_name: product.name,
        product_description: product.description,
        product_url: product.url,
        product_price: product.price,
        product_category: product.category,
      } as BulkProductInputData,
      credits_cost: GOOGLE_CREDIT_COSTS.BULK_PRODUCT_CAMPAIGN,
      retry_count: 0,
    }));

    const { error: itemsError } = await this.supabase
      .from("bulk_operation_items")
      .insert(items);

    if (itemsError) {
      await this.supabase.from("bulk_operation_jobs").delete().eq("id", job.id);
      throw new BadRequestException("Failed to create job items");
    }

    this.logger.log(
      `Created bulk product job ${job.id} with ${dto.products.length} items`,
    );
    return job;
  }

  /**
   * Get jobs for a user
   */
  async getUserJobs(
    userId: string,
    options?: {
      status?: BulkOperationStatus;
      type?: BulkOperationType;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ jobs: BulkOperationJob[]; total: number }> {
    let query = this.supabase
      .from("bulk_operation_jobs")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (options?.status) {
      query = query.eq("status", options.status);
    }
    if (options?.type) {
      query = query.eq("type", options.type);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 20) - 1,
      );
    }

    const { data, error, count } = await query;

    if (error) {
      this.logger.error("Failed to fetch jobs:", error);
      throw new BadRequestException("Failed to fetch jobs");
    }

    return { jobs: data || [], total: count || 0 };
  }

  /**
   * Get a specific job
   */
  async getJob(userId: string, jobId: string): Promise<BulkOperationJob> {
    const { data, error } = await this.supabase
      .from("bulk_operation_jobs")
      .select("*")
      .eq("id", jobId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      throw new NotFoundException("Job not found");
    }

    return data;
  }

  /**
   * Get items for a job
   */
  async getJobItems(
    userId: string,
    jobId: string,
    options?: {
      status?: BulkItemStatus;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ items: BulkOperationItem[]; total: number }> {
    // First verify job belongs to user
    await this.getJob(userId, jobId);

    let query = this.supabase
      .from("bulk_operation_items")
      .select("*", { count: "exact" })
      .eq("job_id", jobId)
      .order("item_index", { ascending: true });

    if (options?.status) {
      query = query.eq("status", options.status);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 50) - 1,
      );
    }

    const { data, error, count } = await query;

    if (error) {
      throw new BadRequestException("Failed to fetch job items");
    }

    return { items: data || [], total: count || 0 };
  }

  /**
   * Get job progress
   */
  async getJobProgress(userId: string, jobId: string): Promise<JobProgress> {
    const job = await this.getJob(userId, jobId);

    const total = job.total_items;
    const completed = job.completed_items;
    const failed = job.failed_items;
    const pending = total - completed - failed;

    return {
      total,
      completed,
      failed,
      pending,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  /**
   * Cancel a job
   */
  async cancelJob(userId: string, jobId: string): Promise<BulkOperationJob> {
    const job = await this.getJob(userId, jobId);

    if (job.status === "completed" || job.status === "cancelled") {
      throw new BadRequestException(`Cannot cancel a ${job.status} job`);
    }

    // Update job status
    const { data, error } = await this.supabase
      .from("bulk_operation_jobs")
      .update({ status: "cancelled" as BulkOperationStatus })
      .eq("id", jobId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException("Failed to cancel job");
    }

    // Cancel pending items
    await this.supabase
      .from("bulk_operation_items")
      .update({ status: "skipped" as BulkItemStatus })
      .eq("job_id", jobId)
      .eq("status", "pending");

    this.logger.log(`Cancelled job ${jobId}`);
    return data;
  }

  /**
   * Get available geo targets for Google Ads targeting (countries only)
   * Data source: google_geo_targets table in Supabase
   * See: https://developers.google.com/google-ads/api/reference/data/geotargets
   */
  async getGeoTargets(
    search?: string,
  ): Promise<
    Array<{ id: string; name: string; type: string; country_code?: string }>
  > {
    let query = this.supabase
      .from("google_geo_targets")
      .select("id, name, type, country_code")
      .eq("status", "active")
      .order("name", { ascending: true });

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error("Failed to fetch geo targets:", error);
      throw new BadRequestException("Failed to fetch geo targets");
    }

    return data || [];
  }

  /**
   * Get available languages for Google Ads targeting
   * Data source: google_languages table in Supabase
   * See: https://developers.google.com/google-ads/api/reference/data/codes-formats#languages
   */
  async getAvailableLanguages(
    search?: string,
  ): Promise<Array<{ id: string; code: string; name: string }>> {
    let query = this.supabase
      .from("google_languages")
      .select("id, code, name")
      .eq("status", "active")
      .order("name", { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error("Failed to fetch languages:", error);
      throw new BadRequestException("Failed to fetch languages");
    }

    return data || [];
  }

  /**
   * Get campaign templates
   */
  async getCampaignTemplates(
    userId: string,
  ): Promise<Array<{ id: string; name: string; description?: string }>> {
    const { data, error } = await this.supabase
      .from("google_campaign_templates")
      .select("id, name, description")
      .or(`user_id.eq.${userId},is_public.eq.true`)
      .order("name", { ascending: true });

    if (error) {
      throw new BadRequestException("Failed to fetch templates");
    }

    return data || [];
  }

  /**
   * Get user's credit balance
   */
  async getUserCreditsBalance(userId: string): Promise<{
    balance: number;
    workspaceId: string | null;
  }> {
    const { data: membership, error } = await this.supabase
      .from("workspace_memberships")
      .select("workspace_id, workspace:workspaces(credits_balance)")
      .eq("user_id", userId)
      .single();

    if (error || !membership) {
      return { balance: 0, workspaceId: null };
    }

    return {
      balance: (membership.workspace as any)?.credits_balance || 0,
      workspaceId: membership.workspace_id,
    };
  }

  /**
   * Estimate credits for a bulk operation
   */
  estimateCredits(
    type: BulkOperationType,
    itemCount: number,
    options?: {
      hasExtensions?: boolean;
      aiSettings?: {
        generateKeywords?: boolean;
        generateHeadlines?: boolean;
        generateDescriptions?: boolean;
      };
    },
  ): { credits: number; costPerItem: number } {
    let credits: number;
    let costPerItem: number;

    switch (type) {
      case "bulk_location":
        credits = this.googleCreditsService.calculateBulkLocationCredits(
          itemCount,
          options?.hasExtensions || false,
        ).total;
        costPerItem = GOOGLE_CREDIT_COSTS.BULK_LOCATION_CAMPAIGN;
        break;
      case "bulk_product":
        credits = this.googleCreditsService.calculateBulkProductCredits(
          itemCount,
          options?.aiSettings || {},
          options?.hasExtensions || false,
        ).total;
        costPerItem = GOOGLE_CREDIT_COSTS.BULK_PRODUCT_CAMPAIGN;
        break;
      case "spreadsheet":
        credits =
          this.googleCreditsService.calculateSpreadsheetImportCredits(
            itemCount,
          );
        costPerItem = GOOGLE_CREDIT_COSTS.SPREADSHEET_IMPORT_CAMPAIGN;
        break;
      case "duplicate":
        credits =
          this.googleCreditsService.calculateDuplicateCredits(itemCount);
        costPerItem = GOOGLE_CREDIT_COSTS.DUPLICATE_CAMPAIGN;
        break;
      default:
        credits = itemCount;
        costPerItem = 1;
    }

    return { credits, costPerItem };
  }
}
