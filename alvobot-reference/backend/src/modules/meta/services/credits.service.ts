import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CreativeSourceType } from "../dto/create-campaign.dto";

// ============================================
// Credit Cost Configuration
// ============================================

export const CREDIT_COSTS = {
  // Campaign creation
  CAMPAIGN_BASIC: 1, // Basic campaign template (upload media manually)

  // Creative generation
  CREATIVE_UPLOAD: 1, // Manual upload creative
  CREATIVE_GOOGLE_DRIVE: 3, // Google Drive integration creative
  CREATIVE_AI_GENERATED: 5, // AI-generated image

  // AI text generation
  AD_COPY_GENERATION: 2, // Generate ad copy variations
  HEADLINE_GENERATION: 1, // Generate headlines only

  // Publishing
  CAMPAIGN_PUBLISH: 2, // Publish campaign to Meta

  // Sync/Metrics
  METRICS_SYNC: 0, // Free - sync metrics from Meta
} as const;

export type CreditOperationType = keyof typeof CREDIT_COSTS;

export interface CreditTransaction {
  id: string;
  user_id: string;
  workspace_id?: string;
  operation_type: string;
  credits_amount: number;
  resource_type: string;
  resource_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface UserCreditsInfo {
  hasActivePlan: boolean;
  planMonthlyCredits: number;
  creditsUsed: number;
  creditsRemaining: number;
  cycleStart: string;
  cycleEnd: string;
}

export interface WorkspaceCreditsInfo {
  workspaceId: string;
  workspaceName: string;
  hasActivePlan: boolean;
  planMonthlyCredits: number;
  monthlyCreditsUsed: number;
  monthlyCreditsRemaining: number;
  extraCreditsAvailable: number;
  totalCreditsAvailable: number;
  cycleStart: string;
  cycleEnd: string;
}

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);
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
   * Get user's current credits information (legacy - for backwards compatibility)
   */
  async getUserCredits(userId: string): Promise<UserCreditsInfo> {
    // Query the user_credits_summary view
    const { data, error } = await this.supabase
      .from("user_credits_summary")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      // Return default values if no subscription
      return {
        hasActivePlan: false,
        planMonthlyCredits: 0,
        creditsUsed: 0,
        creditsRemaining: 0,
        cycleStart: new Date().toISOString(),
        cycleEnd: new Date().toISOString(),
      };
    }

    return {
      hasActivePlan: data.has_active_plan || false,
      planMonthlyCredits: data.plan_monthly_credits || 0,
      creditsUsed: data.credits_used || 0,
      creditsRemaining: data.credits_remaining || 0,
      cycleStart: data.cycle_start,
      cycleEnd: data.cycle_end,
    };
  }

  /**
   * Get workspace's current credits information
   * Credits come from the workspace owner's plan
   */
  async getWorkspaceCredits(
    workspaceId: string,
  ): Promise<WorkspaceCreditsInfo> {
    // Query the workspace_credits_summary view
    const { data, error } = await this.supabase
      .from("workspace_credits_summary")
      .select("*")
      .eq("workspace_id", workspaceId)
      .single();

    if (error || !data) {
      this.logger.warn(
        `No workspace credits found for workspace ${workspaceId}: ${error?.message}`,
      );
      // Return default values if no subscription
      return {
        workspaceId,
        workspaceName: "",
        hasActivePlan: false,
        planMonthlyCredits: 0,
        monthlyCreditsUsed: 0,
        monthlyCreditsRemaining: 0,
        extraCreditsAvailable: 0,
        totalCreditsAvailable: 0,
        cycleStart: new Date().toISOString(),
        cycleEnd: new Date().toISOString(),
      };
    }

    return {
      workspaceId: data.workspace_id,
      workspaceName: data.workspace_name || "",
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
   * Get credits information - workspace-aware with fallback
   * If workspaceId is provided and workspace has active plan, returns workspace credits
   * Otherwise, returns user's personal credits (fallback)
   */
  async getCredits(
    userId: string,
    workspaceId?: string | null,
  ): Promise<{
    hasActivePlan: boolean;
    planMonthlyCredits: number;
    creditsUsed: number;
    creditsRemaining: number;
    extraCreditsAvailable: number;
    totalCreditsAvailable: number;
    cycleStart: string;
    cycleEnd: string;
    isWorkspace: boolean;
  }> {
    if (workspaceId) {
      const wsCredits = await this.getWorkspaceCredits(workspaceId);

      // If workspace has active plan, use workspace credits
      if (wsCredits.hasActivePlan) {
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

    const userCredits = await this.getUserCredits(userId);
    return {
      hasActivePlan: userCredits.hasActivePlan,
      planMonthlyCredits: userCredits.planMonthlyCredits,
      creditsUsed: userCredits.creditsUsed,
      creditsRemaining: userCredits.creditsRemaining,
      extraCreditsAvailable: 0, // User-level extras handled separately
      totalCreditsAvailable: userCredits.creditsRemaining,
      cycleStart: userCredits.cycleStart,
      cycleEnd: userCredits.cycleEnd,
      isWorkspace: false,
    };
  }

  /**
   * Check if user/workspace has enough credits for an operation
   */
  async checkCredits(
    userId: string,
    operationType: CreditOperationType,
    quantity: number = 1,
    workspaceId?: string | null,
  ): Promise<{ hasCredits: boolean; required: number; available: number }> {
    const credits = await this.getCredits(userId, workspaceId);
    const costPerUnit = CREDIT_COSTS[operationType];
    const totalRequired = costPerUnit * quantity;

    return {
      hasCredits: credits.totalCreditsAvailable >= totalRequired,
      required: totalRequired,
      available: credits.totalCreditsAvailable,
    };
  }

  /**
   * Calculate total credits needed for a campaign
   */
  calculateCampaignCredits(
    creativeSources: CreativeSourceType[],
    options: {
      publishImmediately?: boolean;
      generateAdCopy?: boolean;
      generateHeadlines?: boolean;
    } = {},
  ): { total: number; breakdown: Record<string, number> } {
    const breakdown: Record<string, number> = {};
    let total = 0;

    // Base campaign cost
    breakdown["campaign_base"] = CREDIT_COSTS.CAMPAIGN_BASIC;
    total += CREDIT_COSTS.CAMPAIGN_BASIC;

    // Creative costs based on source
    for (const source of creativeSources) {
      switch (source) {
        case CreativeSourceType.UPLOAD:
          breakdown["creative_upload"] =
            (breakdown["creative_upload"] || 0) + CREDIT_COSTS.CREATIVE_UPLOAD;
          total += CREDIT_COSTS.CREATIVE_UPLOAD;
          break;
        case CreativeSourceType.GOOGLE_DRIVE:
          breakdown["creative_drive"] =
            (breakdown["creative_drive"] || 0) +
            CREDIT_COSTS.CREATIVE_GOOGLE_DRIVE;
          total += CREDIT_COSTS.CREATIVE_GOOGLE_DRIVE;
          break;
        case CreativeSourceType.AI_GENERATED:
          breakdown["creative_ai"] =
            (breakdown["creative_ai"] || 0) +
            CREDIT_COSTS.CREATIVE_AI_GENERATED;
          total += CREDIT_COSTS.CREATIVE_AI_GENERATED;
          break;
      }
    }

    // AI generation costs
    if (options.generateAdCopy) {
      breakdown["ad_copy"] = CREDIT_COSTS.AD_COPY_GENERATION;
      total += CREDIT_COSTS.AD_COPY_GENERATION;
    }

    if (options.generateHeadlines) {
      breakdown["headlines"] = CREDIT_COSTS.HEADLINE_GENERATION;
      total += CREDIT_COSTS.HEADLINE_GENERATION;
    }

    // Publishing cost
    if (options.publishImmediately) {
      breakdown["publish"] = CREDIT_COSTS.CAMPAIGN_PUBLISH;
      total += CREDIT_COSTS.CAMPAIGN_PUBLISH;
    }

    return { total, breakdown };
  }

  /**
   * Consume credits for an operation
   * If workspaceId is provided, consumes from workspace pool
   * Otherwise, consumes from user's personal credits
   */
  async consumeCredits(
    userId: string,
    operationType: CreditOperationType,
    quantity: number = 1,
    metadata: {
      resourceType: string;
      resourceId?: string;
      description?: string;
      projectId?: number;
      breakdown?: Record<string, number>;
      workspaceId?: string | null;
    },
  ): Promise<CreditTransaction> {
    const costPerUnit = CREDIT_COSTS[operationType];
    const totalCredits = costPerUnit * quantity;
    const workspaceId = metadata.workspaceId;

    // Check if there are enough credits
    const credits = await this.getCredits(userId, workspaceId);
    if (credits.totalCreditsAvailable < totalCredits) {
      throw new BadRequestException(
        `Créditos insuficientes. Necessário: ${totalCredits}, Disponível: ${credits.totalCreditsAvailable}`,
      );
    }

    // Insert credit transaction with workspace_id if provided
    const baseInsertData: Record<string, unknown> = {
      user_id: userId,
      transaction_type: "debit",
      amount: -totalCredits, // Negative for consumption
      operation_type: operationType.toLowerCase(),
      operation_id: metadata.resourceId,
      description:
        metadata.description || `${operationType} - ${metadata.resourceType}`,
    };

    // Try with workspace_id first, fallback without if column doesn't exist yet
    let transaction: CreditTransaction | null = null;

    if (workspaceId) {
      const insertWithWs = { ...baseInsertData, workspace_id: workspaceId };
      const { data, error: wsError } = await this.supabase
        .from("credit_transactions")
        .insert(insertWithWs)
        .select()
        .single();

      if (wsError) {
        // If column doesn't exist (PGRST204), retry without workspace_id
        if (
          wsError.code === "PGRST204" ||
          wsError.message?.includes("workspace_id")
        ) {
          this.logger.warn(
            `workspace_id column not found in credit_transactions, inserting without it`,
          );
          const { data: fallbackData, error: fallbackError } =
            await this.supabase
              .from("credit_transactions")
              .insert(baseInsertData)
              .select()
              .single();

          if (fallbackError) {
            this.logger.error(
              "Failed to record credit transaction:",
              fallbackError,
            );
            throw new BadRequestException(
              "Falha ao registrar consumo de créditos",
            );
          }
          transaction = fallbackData;
        } else {
          this.logger.error("Failed to record credit transaction:", wsError);
          throw new BadRequestException(
            "Falha ao registrar consumo de créditos",
          );
        }
      } else {
        transaction = data;
      }
    } else {
      const { data, error } = await this.supabase
        .from("credit_transactions")
        .insert(baseInsertData)
        .select()
        .single();

      if (error) {
        this.logger.error("Failed to record credit transaction:", error);
        throw new BadRequestException("Falha ao registrar consumo de créditos");
      }
      transaction = data;
    }

    const logContext = workspaceId
      ? `Workspace ${workspaceId}`
      : `User ${userId}`;
    this.logger.log(
      `${logContext} consumed ${totalCredits} credits for ${operationType}`,
    );

    return transaction;
  }

  /**
   * Log activity for campaign operations
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
      created: "Campanha criada",
      updated: "Campanha atualizada",
      published: "Campanha publicada",
      deleted: "Campanha excluída",
    };

    const insertData: Record<string, unknown> = {
      user_id: userId,
      action_type: `campaign_${action}`,
      resource_type: "campaign",
      resource_id: campaignId,
      title: actionLabels[action],
      description: campaignName,
      credits_consumed: creditsConsumed,
      metadata: {
        campaign_name: campaignName,
        project_id: projectId,
      },
    };

    await this.insertWithOptionalWorkspaceId(
      "activity_logs",
      insertData,
      workspaceId,
    );
  }

  /**
   * Log activity for creative generation
   */
  async logCreativeActivity(
    userId: string,
    action: "generated" | "uploaded",
    creativeCount: number,
    source: CreativeSourceType,
    creditsConsumed: number,
    campaignId?: string,
    workspaceId?: string | null,
  ): Promise<void> {
    const sourceLabels = {
      [CreativeSourceType.UPLOAD]: "upload manual",
      [CreativeSourceType.GOOGLE_DRIVE]: "Google Drive",
      [CreativeSourceType.AI_GENERATED]: "IA",
    };

    const insertData: Record<string, unknown> = {
      user_id: userId,
      action_type: "creative_generated",
      resource_type: "creative",
      resource_id: campaignId,
      title: `${creativeCount} criativo(s) ${action === "generated" ? "gerado(s)" : "enviado(s)"}`,
      description: `Via ${sourceLabels[source]}`,
      credits_consumed: creditsConsumed,
      metadata: {
        source,
        creative_count: creativeCount,
        campaign_id: campaignId,
      },
    };

    await this.insertWithOptionalWorkspaceId(
      "activity_logs",
      insertData,
      workspaceId,
    );
  }

  /**
   * Helper: Insert data with optional workspace_id column.
   * Falls back to inserting without workspace_id if column doesn't exist in the table.
   */
  private async insertWithOptionalWorkspaceId(
    table: string,
    insertData: Record<string, unknown>,
    workspaceId?: string | null,
  ): Promise<void> {
    if (workspaceId) {
      const dataWithWs = { ...insertData, workspace_id: workspaceId };
      const { error } = await this.supabase.from(table).insert(dataWithWs);

      if (error) {
        if (
          error.code === "PGRST204" ||
          error.message?.includes("workspace_id")
        ) {
          this.logger.warn(
            `workspace_id column not found in ${table}, inserting without it`,
          );
          const { error: fallbackError } = await this.supabase
            .from(table)
            .insert(insertData);
          if (fallbackError) {
            this.logger.warn(
              `Failed to log activity in ${table}:`,
              fallbackError,
            );
          }
        } else {
          this.logger.warn(`Failed to log activity in ${table}:`, error);
        }
      }
    } else {
      const { error } = await this.supabase.from(table).insert(insertData);
      if (error) {
        this.logger.warn(`Failed to log activity in ${table}:`, error);
      }
    }
  }

  /**
   * Get credit cost preview for a set of operations
   */
  getCreditCostPreview(): typeof CREDIT_COSTS {
    return CREDIT_COSTS;
  }
}
