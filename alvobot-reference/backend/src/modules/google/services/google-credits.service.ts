import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Credit costs for Google Ads operations
export const GOOGLE_CREDIT_COSTS = {
  // Campaign operations
  CAMPAIGN_BASIC: 1,
  AD_GROUP_BASIC: 1,
  CAMPAIGN_PUBLISH: 3,

  // AI Generation
  KEYWORD_RESEARCH: 2,
  AI_HEADLINE_GENERATION: 2,
  AI_DESCRIPTION_GENERATION: 2,
  AI_IMAGE_GENERATION: 5,

  // Extensions
  EXTENSIONS_SETUP: 1,

  // Sync operations
  METRICS_SYNC: 0,

  // Bulk operations
  BULK_LOCATION_CAMPAIGN: 2, // Per location variation
  BULK_PRODUCT_CAMPAIGN: 3, // Per product (includes AI generation)
  SPREADSHEET_IMPORT_CAMPAIGN: 2, // Per row
  DUPLICATE_CAMPAIGN: 1, // Per copy
} as const;

export type GoogleCreditOperation = keyof typeof GOOGLE_CREDIT_COSTS;

export interface UserCreditsInfo {
  hasActivePlan: boolean;
  planMonthlyCredits: number;
  creditsUsed: number;
  creditsRemaining: number;
  extraCreditsAvailable: number;
  totalCreditsAvailable: number;
  cycleStart: string;
  cycleEnd: string;
  isWorkspace: boolean;
}

export interface WorkspaceCreditsInfo {
  workspaceId: string;
  workspaceName: string;
  ownerId: string;
  hasActivePlan: boolean;
  planMonthlyCredits: number;
  monthlyCreditsUsed: number;
  monthlyCreditsRemaining: number;
  extraCreditsAvailable: number;
  totalCreditsAvailable: number;
  cycleStart: string;
  cycleEnd: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  operation_type: string;
  credits_amount: number;
  resource_type: string;
  resource_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

@Injectable()
export class GoogleCreditsService {
  private readonly logger = new Logger(GoogleCreditsService.name);
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
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
   * Get the cost for a specific operation
   */
  getCost(operation: GoogleCreditOperation): number {
    return GOOGLE_CREDIT_COSTS[operation];
  }

  /**
   * Get all credit costs
   */
  getAllCosts(): typeof GOOGLE_CREDIT_COSTS {
    return GOOGLE_CREDIT_COSTS;
  }

  /**
   * Get user's current credits information from user_credits_summary view
   */
  async getUserCredits(userId: string): Promise<UserCreditsInfo> {
    const { data, error } = await this.supabase
      .from("user_credits_summary")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      this.logger.warn(`Failed to get user credits: ${error?.message}`);
      // Return default values if no subscription
      return {
        hasActivePlan: false,
        planMonthlyCredits: 0,
        creditsUsed: 0,
        creditsRemaining: 0,
        extraCreditsAvailable: 0,
        totalCreditsAvailable: 0,
        cycleStart: new Date().toISOString(),
        cycleEnd: new Date().toISOString(),
        isWorkspace: false,
      };
    }

    const creditsRemaining = data.credits_remaining || 0;
    return {
      hasActivePlan: data.has_active_plan || false,
      planMonthlyCredits: data.plan_monthly_credits || 0,
      creditsUsed: data.credits_used || 0,
      creditsRemaining,
      extraCreditsAvailable: 0,
      totalCreditsAvailable: creditsRemaining,
      cycleStart: data.cycle_start,
      cycleEnd: data.cycle_end,
      isWorkspace: false,
    };
  }

  /**
   * Get workspace credits information from workspace_credits_summary view
   */
  async getWorkspaceCredits(
    workspaceId: string,
  ): Promise<WorkspaceCreditsInfo | null> {
    const { data, error } = await this.supabase
      .from("workspace_credits_summary")
      .select("*")
      .eq("workspace_id", workspaceId)
      .single();

    if (error || !data) {
      this.logger.debug(
        `Workspace credits not found for ${workspaceId}: ${error?.message}`,
      );
      return null;
    }

    return {
      workspaceId: data.workspace_id,
      workspaceName: data.workspace_name,
      ownerId: data.owner_id,
      hasActivePlan: data.has_active_plan || false,
      planMonthlyCredits: data.plan_monthly_credits || 0,
      monthlyCreditsUsed: data.monthly_credits_used || 0,
      monthlyCreditsRemaining: data.monthly_credits_remaining || 0,
      extraCreditsAvailable: data.extra_credits_available || 0,
      totalCreditsAvailable: data.total_credits_available || 0,
      cycleStart: data.cycle_start,
      cycleEnd: data.cycle_end,
    };
  }

  /**
   * Get credits - tries workspace first, falls back to user credits
   */
  async getCredits(
    userId: string,
    workspaceId?: string | null,
  ): Promise<UserCreditsInfo> {
    if (workspaceId) {
      const wsCredits = await this.getWorkspaceCredits(workspaceId);

      // If workspace has active plan, use workspace credits
      if (wsCredits?.hasActivePlan) {
        return {
          hasActivePlan: wsCredits.hasActivePlan,
          planMonthlyCredits: wsCredits.planMonthlyCredits,
          creditsUsed: wsCredits.monthlyCreditsUsed,
          creditsRemaining: wsCredits.monthlyCreditsRemaining,
          extraCreditsAvailable: wsCredits.extraCreditsAvailable,
          totalCreditsAvailable: wsCredits.totalCreditsAvailable,
          cycleStart: wsCredits.cycleStart,
          cycleEnd: wsCredits.cycleEnd,
          isWorkspace: true,
        };
      }

      // Workspace doesn't have active plan - fall back to user credits
      this.logger.debug(
        `Workspace ${workspaceId} has no active plan, falling back to user credits`,
      );
    }

    return this.getUserCredits(userId);
  }

  /**
   * Check if user/workspace has enough credits for an operation
   */
  async hasEnoughCredits(
    userId: string,
    operation: GoogleCreditOperation,
    workspaceId?: string | null,
  ): Promise<boolean> {
    const cost = this.getCost(operation);
    if (cost === 0) return true;

    const credits = await this.getCredits(userId, workspaceId);
    return credits.totalCreditsAvailable >= cost;
  }

  /**
   * Check if user/workspace has enough credits for a specific amount
   */
  async checkCredits(
    userId: string,
    requiredCredits: number,
    workspaceId?: string | null,
  ): Promise<{
    hasCredits: boolean;
    required: number;
    available: number;
    isWorkspace: boolean;
  }> {
    const credits = await this.getCredits(userId, workspaceId);

    return {
      hasCredits: credits.totalCreditsAvailable >= requiredCredits,
      required: requiredCredits,
      available: credits.totalCreditsAvailable,
      isWorkspace: credits.isWorkspace,
    };
  }

  /**
   * Consume credits for an operation
   */
  async consumeCredits(
    userId: string,
    operation: GoogleCreditOperation,
    metadata: {
      resourceType: string;
      resourceId?: string;
      description?: string;
      projectId?: number;
      breakdown?: Record<string, number>;
      workspaceId?: string | null;
    },
  ): Promise<CreditTransaction> {
    const cost = this.getCost(operation);
    const workspaceId = metadata.workspaceId;

    if (cost === 0) {
      // Return a mock transaction for free operations
      return {
        id: "free-operation",
        user_id: userId,
        operation_type: operation.toLowerCase(),
        credits_amount: 0,
        resource_type: metadata.resourceType,
        resource_id: metadata.resourceId,
        created_at: new Date().toISOString(),
      };
    }

    // Get credits (workspace if available, otherwise user)
    const credits = await this.getCredits(userId, workspaceId);
    if (credits.totalCreditsAvailable < cost) {
      throw new BadRequestException(
        `Créditos insuficientes. Necessário: ${cost}, Disponível: ${credits.totalCreditsAvailable}`,
      );
    }

    // Insert credit transaction
    const { data: transaction, error } = await this.supabase
      .from("credit_transactions")
      .insert({
        user_id: userId,
        workspace_id: credits.isWorkspace ? workspaceId : null,
        transaction_type: "debit",
        amount: cost,
        operation_type: operation.toLowerCase(),
        description:
          metadata.description || `Google Ads: ${operation.replace(/_/g, " ")}`,
        balance_before: credits.creditsRemaining,
        balance_after: credits.creditsRemaining - cost,
        metadata: {
          project_id: metadata.projectId,
          cost_per_unit: cost,
          breakdown: metadata.breakdown,
          resource_type: metadata.resourceType,
          resource_id: metadata.resourceId,
          is_workspace: credits.isWorkspace,
        },
      })
      .select()
      .single();

    if (error) {
      this.logger.error("Failed to record credit transaction:", error);
      throw new BadRequestException("Falha ao registrar consumo de créditos");
    }

    // Also log to activity_logs for user visibility
    await this.supabase.from("activity_logs").insert({
      user_id: userId,
      workspace_id: credits.isWorkspace ? workspaceId : null,
      action_type: "google_ads_" + operation.toLowerCase(),
      resource_type: metadata.resourceType,
      resource_id: metadata.resourceId,
      title: `Google Ads: ${operation.replace(/_/g, " ").toLowerCase()}`,
      description: metadata.description,
      credits_consumed: cost,
      status: "success",
      metadata: {
        operation,
        project_id: metadata.projectId,
        breakdown: metadata.breakdown,
        is_workspace: credits.isWorkspace,
      },
    });

    const source = credits.isWorkspace
      ? `workspace ${workspaceId}`
      : `user ${userId}`;
    this.logger.log(
      `Consumed ${cost} credits from ${source} for Google Ads ${operation}`,
    );

    return {
      id: transaction.id,
      user_id: userId,
      operation_type: operation.toLowerCase(),
      credits_amount: cost,
      resource_type: metadata.resourceType,
      resource_id: metadata.resourceId,
      metadata: transaction.metadata,
      created_at: transaction.created_at,
    };
  }

  /**
   * Consume credits for a bulk/combined operation (multiple costs at once)
   */
  async consumeBulkCredits(
    userId: string,
    totalCredits: number,
    operationType: string,
    metadata: {
      resourceType: string;
      resourceId?: string;
      description?: string;
      projectId?: number;
      breakdown?: Record<string, number>;
      workspaceId?: string | null;
    },
  ): Promise<CreditTransaction> {
    const workspaceId = metadata.workspaceId;

    if (totalCredits === 0) {
      return {
        id: "free-operation",
        user_id: userId,
        operation_type: operationType.toLowerCase(),
        credits_amount: 0,
        resource_type: metadata.resourceType,
        resource_id: metadata.resourceId,
        created_at: new Date().toISOString(),
      };
    }

    // Get credits (workspace if available, otherwise user)
    const credits = await this.getCredits(userId, workspaceId);
    if (credits.totalCreditsAvailable < totalCredits) {
      throw new BadRequestException(
        `Créditos insuficientes. Necessário: ${totalCredits}, Disponível: ${credits.totalCreditsAvailable}`,
      );
    }

    // Insert credit transaction
    const { data: transaction, error } = await this.supabase
      .from("credit_transactions")
      .insert({
        user_id: userId,
        workspace_id: credits.isWorkspace ? workspaceId : null,
        transaction_type: "debit",
        amount: totalCredits,
        operation_type: operationType.toLowerCase(),
        description:
          metadata.description ||
          `Google Ads: ${operationType.replace(/_/g, " ")}`,
        balance_before: credits.creditsRemaining,
        balance_after: credits.creditsRemaining - totalCredits,
        metadata: {
          project_id: metadata.projectId,
          breakdown: metadata.breakdown,
          resource_type: metadata.resourceType,
          resource_id: metadata.resourceId,
          is_workspace: credits.isWorkspace,
        },
      })
      .select()
      .single();

    if (error) {
      this.logger.error("Failed to record bulk credit transaction:", error);
      throw new BadRequestException("Falha ao registrar consumo de créditos");
    }

    // Also log to activity_logs for user visibility
    await this.supabase.from("activity_logs").insert({
      user_id: userId,
      workspace_id: credits.isWorkspace ? workspaceId : null,
      action_type: "google_ads_" + operationType.toLowerCase(),
      resource_type: metadata.resourceType,
      resource_id: metadata.resourceId,
      title: `Google Ads: ${operationType.replace(/_/g, " ").toLowerCase()}`,
      description: metadata.description,
      credits_consumed: totalCredits,
      status: "success",
      metadata: {
        operation_type: operationType,
        project_id: metadata.projectId,
        breakdown: metadata.breakdown,
        is_workspace: credits.isWorkspace,
      },
    });

    const source = credits.isWorkspace
      ? `workspace ${workspaceId}`
      : `user ${userId}`;
    this.logger.log(
      `Consumed ${totalCredits} credits from ${source} for Google Ads bulk ${operationType}`,
    );

    return {
      id: transaction.id,
      user_id: userId,
      operation_type: operationType.toLowerCase(),
      credits_amount: totalCredits,
      resource_type: metadata.resourceType,
      resource_id: metadata.resourceId,
      metadata: transaction.metadata,
      created_at: transaction.created_at,
    };
  }

  /**
   * Calculate total credits needed for a campaign
   */
  calculateCampaignCredits(
    adGroupCount: number,
    hasExtensions: boolean,
    aiGeneratedItems: {
      keywords?: number;
      headlines?: number;
      descriptions?: number;
      images?: number;
    } = {},
  ): { total: number; breakdown: Record<string, number> } {
    const breakdown: Record<string, number> = {};
    let total = GOOGLE_CREDIT_COSTS.CAMPAIGN_PUBLISH;
    breakdown["campaign_publish"] = GOOGLE_CREDIT_COSTS.CAMPAIGN_PUBLISH;

    // Add cost per ad group
    const adGroupCost = adGroupCount * GOOGLE_CREDIT_COSTS.AD_GROUP_BASIC;
    if (adGroupCost > 0) {
      breakdown["ad_groups"] = adGroupCost;
      total += adGroupCost;
    }

    // Add extensions cost if used
    if (hasExtensions) {
      breakdown["extensions"] = GOOGLE_CREDIT_COSTS.EXTENSIONS_SETUP;
      total += GOOGLE_CREDIT_COSTS.EXTENSIONS_SETUP;
    }

    // Add AI generation costs
    if (aiGeneratedItems.keywords) {
      const keywordCost =
        Math.ceil(aiGeneratedItems.keywords / 10) *
        GOOGLE_CREDIT_COSTS.KEYWORD_RESEARCH;
      breakdown["keywords"] = keywordCost;
      total += keywordCost;
    }
    if (aiGeneratedItems.headlines) {
      const headlineCost =
        Math.ceil(aiGeneratedItems.headlines / 5) *
        GOOGLE_CREDIT_COSTS.AI_HEADLINE_GENERATION;
      breakdown["headlines"] = headlineCost;
      total += headlineCost;
    }
    if (aiGeneratedItems.descriptions) {
      const descriptionCost =
        Math.ceil(aiGeneratedItems.descriptions / 2) *
        GOOGLE_CREDIT_COSTS.AI_DESCRIPTION_GENERATION;
      breakdown["descriptions"] = descriptionCost;
      total += descriptionCost;
    }
    if (aiGeneratedItems.images) {
      const imageCost =
        aiGeneratedItems.images * GOOGLE_CREDIT_COSTS.AI_IMAGE_GENERATION;
      breakdown["images"] = imageCost;
      total += imageCost;
    }

    return { total, breakdown };
  }

  /**
   * Calculate credits for bulk location operation
   */
  calculateBulkLocationCredits(
    locationCount: number,
    hasExtensions: boolean,
  ): { total: number; breakdown: Record<string, number> } {
    const breakdown: Record<string, number> = {};
    let total = locationCount * GOOGLE_CREDIT_COSTS.BULK_LOCATION_CAMPAIGN;
    breakdown["locations"] = total;

    if (hasExtensions) {
      const extensionCost =
        locationCount * GOOGLE_CREDIT_COSTS.EXTENSIONS_SETUP;
      breakdown["extensions"] = extensionCost;
      total += extensionCost;
    }

    return { total, breakdown };
  }

  /**
   * Calculate credits for bulk product operation
   */
  calculateBulkProductCredits(
    productCount: number,
    aiSettings: {
      generateKeywords?: boolean;
      generateHeadlines?: boolean;
      generateDescriptions?: boolean;
    },
    hasExtensions: boolean,
  ): { total: number; breakdown: Record<string, number> } {
    const breakdown: Record<string, number> = {};
    let total = productCount * GOOGLE_CREDIT_COSTS.BULK_PRODUCT_CAMPAIGN;
    breakdown["products"] = total;

    // AI generation costs per product
    if (aiSettings.generateKeywords) {
      const keywordCost = productCount * GOOGLE_CREDIT_COSTS.KEYWORD_RESEARCH;
      breakdown["keywords"] = keywordCost;
      total += keywordCost;
    }
    if (aiSettings.generateHeadlines) {
      const headlineCost =
        productCount * GOOGLE_CREDIT_COSTS.AI_HEADLINE_GENERATION;
      breakdown["headlines"] = headlineCost;
      total += headlineCost;
    }
    if (aiSettings.generateDescriptions) {
      const descriptionCost =
        productCount * GOOGLE_CREDIT_COSTS.AI_DESCRIPTION_GENERATION;
      breakdown["descriptions"] = descriptionCost;
      total += descriptionCost;
    }

    if (hasExtensions) {
      const extensionCost = productCount * GOOGLE_CREDIT_COSTS.EXTENSIONS_SETUP;
      breakdown["extensions"] = extensionCost;
      total += extensionCost;
    }

    return { total, breakdown };
  }

  /**
   * Calculate credits for spreadsheet import
   */
  calculateSpreadsheetImportCredits(rowCount: number): number {
    return rowCount * GOOGLE_CREDIT_COSTS.SPREADSHEET_IMPORT_CAMPAIGN;
  }

  /**
   * Calculate credits for duplicate operation
   */
  calculateDuplicateCredits(copyCount: number): number {
    return copyCount * GOOGLE_CREDIT_COSTS.DUPLICATE_CAMPAIGN;
  }

  /**
   * Log activity for Google Ads campaign operations
   */
  async logCampaignActivity(
    userId: string,
    action: "created" | "updated" | "published" | "deleted",
    campaignId: string,
    campaignName: string,
    creditsConsumed: number = 0,
    projectId?: number,
    workspaceId?: string | null,
  ): Promise<void> {
    const actionLabels = {
      created: "Campanha Google Ads criada",
      updated: "Campanha Google Ads atualizada",
      published: "Campanha Google Ads publicada",
      deleted: "Campanha Google Ads excluída",
    };

    const { error } = await this.supabase.from("activity_logs").insert({
      user_id: userId,
      workspace_id: workspaceId || null,
      action_type: `google_campaign_${action}`,
      resource_type: "google_campaign",
      resource_id: campaignId,
      title: actionLabels[action],
      description: campaignName,
      credits_consumed: creditsConsumed,
      status: "success",
      metadata: {
        campaign_name: campaignName,
        project_id: projectId,
      },
    });

    if (error) {
      this.logger.warn("Failed to log Google Ads campaign activity:", error);
    }
  }

  /**
   * Get credit cost preview for a set of operations
   */
  getCreditCostPreview(): typeof GOOGLE_CREDIT_COSTS {
    return GOOGLE_CREDIT_COSTS;
  }
}
