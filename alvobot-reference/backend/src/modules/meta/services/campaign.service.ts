import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CreditsService, CREDIT_COSTS } from "./credits.service";
import { AiCreativeService, GeneratedAdCopy } from "./ai-creative.service";
import {
  CreateCampaignDto,
  SaveCampaignTemplateDto,
  PublishCampaignDto,
  GenerateAdCopyDto,
  GenerateImageDto,
  CreativeSourceType,
  CampaignObjective,
} from "../dto/create-campaign.dto";

// ============================================
// Interfaces
// ============================================

export interface CampaignTemplate {
  id: string;
  user_id: string;
  workspace_id?: string;
  name: string;
  status: "draft" | "ready" | "published" | "failed";
  campaign_data: CreateCampaignDto;
  wizard_state?: Record<string, unknown>; // Full Zustand store snapshot for resume
  last_wizard_step?: string; // Last wizard step visited
  meta_campaign_id?: string;
  credits_consumed: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface MetaApiCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  // Add more fields as needed from Meta API
}

// ============================================
// UTM & Naming Constants
// ============================================

const XCOD_DELIMITER = "hQwK21wXxR";

/**
 * Slugify text for URL-safe names
 */
function slugify(text: string, maxLength = 50): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, maxLength);
}

/**
 * Generate Ad Set name following naming convention
 * Format: campaign-base|cjNdeM
 */
function generateAdSetName(
  campaignName: string,
  index: number,
  total: number,
): string {
  // Extract descriptive part from campaign name (before |)
  let baseName = "conjunto";
  if (campaignName) {
    const pipeIndex = campaignName.indexOf("|");
    baseName =
      pipeIndex > 0
        ? campaignName.slice(0, pipeIndex)
        : slugify(campaignName, 35);
    // Remove objective suffix (_TRF, _MSG, etc)
    baseName = baseName.replace(/_(?:TRF|MSG|LED|VND)$/, "");
  }
  return `${baseName}|cj${index}de${total}`;
}

/**
 * Generate Ad name following naming convention
 * Format: adset-base|anN_type
 */
function generateAdName(
  adSetName: string,
  index: number,
  creativeType: "img" | "vid" | "car" = "img",
): string {
  // Extract descriptive part from ad set name (before |)
  let baseName = "anuncio";
  if (adSetName) {
    const pipeIndex = adSetName.indexOf("|");
    baseName =
      pipeIndex > 0 ? adSetName.slice(0, pipeIndex) : slugify(adSetName, 30);
  }
  return `${baseName}|an${index}_${creativeType}`;
}

/**
 * Build Meta UTM URL suffix with dynamic placeholders
 *
 * @param templateId - Optional AlvoBot template ID to include in xcod for tracking
 *                     This allows tracing which template was used to create the campaign
 */
function buildMetaUtmSuffix(templateId?: string): string {
  // xcod format: FB{d}templateId{d}campaign{d}adset{d}ad{d}placement
  // The templateId makes it easy to trace back to the AlvoBot template
  const tplId = templateId ? templateId.substring(0, 8) : "manual"; // First 8 chars of UUID

  const parts = [
    "utm_source=FB",
    "utm_campaign={{campaign.name}}|{{campaign.id}}",
    "utm_medium={{adset.name}}|{{adset.id}}",
    "utm_content={{ad.name}}|{{ad.id}}",
    "utm_term={{placement}}",
    `xcod=FB${XCOD_DELIMITER}${tplId}${XCOD_DELIMITER}{{campaign.name}}|{{campaign.id}}${XCOD_DELIMITER}{{adset.name}}|{{adset.id}}${XCOD_DELIMITER}{{ad.name}}|{{ad.id}}${XCOD_DELIMITER}{{placement}}`,
  ];
  return parts.join("&");
}

// Note: UTM parameters are added via url_tags in Meta API, not embedded in URL

// ============================================
// Campaign Service
// ============================================

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);
  private supabase: SupabaseClient;

  // Meta Marketing API URLs
  private readonly META_API_URL = "https://graph.facebook.com/v22.0";

  constructor(
    private configService: ConfigService,
    private creditsService: CreditsService,
    private aiCreativeService: AiCreativeService,
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

  // ============================================
  // Template Management
  // ============================================

  /**
   * Save a campaign template (draft)
   */
  async saveTemplate(
    userId: string,
    dto: SaveCampaignTemplateDto,
    workspaceId?: string,
  ): Promise<CampaignTemplate> {
    // Calculate creative sources for credit calculation
    // Handle case where mediaFiles might be empty or undefined
    const mediaFiles = dto.upload?.mediaFiles || [];
    const creativeSources = mediaFiles.map(
      (m) => m.source || CreativeSourceType.UPLOAD,
    );

    // Calculate credits for saving (base campaign only, no publishing)
    const { breakdown } = this.creditsService.calculateCampaignCredits(
      creativeSources,
      {
        publishImmediately: false,
      },
    );

    // Check credits only for new templates
    if (!dto.id) {
      const creditCheck = await this.creditsService.checkCredits(
        userId,
        "CAMPAIGN_BASIC",
        1,
        workspaceId || null,
      );

      if (!creditCheck.hasCredits) {
        throw new BadRequestException(
          `Créditos insuficientes. Necessário: ${creditCheck.required}, Disponível: ${creditCheck.available}`,
        );
      }
    }

    let template: CampaignTemplate;

    if (dto.id) {
      // Update existing template (getTemplate validates access via user_id or workspace)
      const existing = await this.getTemplate(dto.id, userId);
      if (!existing) {
        throw new NotFoundException("Template não encontrado");
      }

      const { data, error } = await this.supabase
        .from("campaign_templates")
        .update({
          name: dto.templateName,
          template_name: dto.templateName, // Legacy column - still NOT NULL in DB
          campaign_data: dto,
          wizard_state: dto.wizard_state || null,
          last_wizard_step: dto.last_wizard_step || null,
          status: "draft",
          updated_at: new Date().toISOString(),
        })
        .eq("id", dto.id)
        .select()
        .single();

      if (error) {
        this.logger.error("Failed to update template:", error);
        throw new BadRequestException("Falha ao atualizar template");
      }

      template = data;
    } else {
      // Create new template and consume credits
      const { data, error } = await this.supabase
        .from("campaign_templates")
        .insert({
          user_id: userId,
          workspace_id: workspaceId || null,
          name: dto.templateName,
          template_name: dto.templateName, // Legacy column - still NOT NULL in DB
          campaign_data: dto,
          wizard_state: dto.wizard_state || null,
          last_wizard_step: dto.last_wizard_step || null,
          status: "draft",
          credits_consumed: CREDIT_COSTS.CAMPAIGN_BASIC,
        })
        .select()
        .single();

      if (error) {
        this.logger.error("Failed to create template:", error);
        throw new BadRequestException("Falha ao criar template");
      }

      template = data;

      // Consume credits for new template
      await this.creditsService.consumeCredits(userId, "CAMPAIGN_BASIC", 1, {
        resourceType: "campaign_template",
        resourceId: template.id,
        description: `Template de campanha: ${dto.templateName}`,
        breakdown,
        workspaceId: workspaceId || null,
      });

      // Log activity
      await this.creditsService.logCampaignActivity(
        userId,
        "created",
        template.id,
        dto.templateName,
        CREDIT_COSTS.CAMPAIGN_BASIC,
      );
    }

    return template;
  }

  /**
   * Get a single template by ID
   * Checks user_id first, then falls back to workspace membership
   */
  async getTemplate(
    templateId: string,
    userId: string,
  ): Promise<CampaignTemplate | null> {
    // First try: direct ownership
    const { data, error } = await this.supabase
      .from("campaign_templates")
      .select("*")
      .eq("id", templateId)
      .eq("user_id", userId)
      .single();

    if (!error && data) {
      return data;
    }

    // Second try: workspace membership (template belongs to a workspace the user is part of)
    const { data: wsData, error: wsError } = await this.supabase
      .from("campaign_templates")
      .select("*")
      .eq("id", templateId)
      .not("workspace_id", "is", null)
      .single();

    if (wsError || !wsData) {
      return null;
    }

    // Verify the user is a member of this workspace
    const { data: membership } = await this.supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", wsData.workspace_id)
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (!membership) {
      return null;
    }

    return wsData;
  }

  /**
   * Get a template by ID without user validation (admin/test use only)
   * WARNING: Only use in development/testing contexts
   */
  async getTemplateById(templateId: string): Promise<CampaignTemplate | null> {
    const { data, error } = await this.supabase
      .from("campaign_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (error || !data) {
      this.logger.warn(`Template ${templateId} not found: ${error?.message}`);
      return null;
    }

    return data;
  }

  /**
   * List all templates for a user/workspace
   */
  async listTemplates(
    userId: string,
    options: {
      workspaceId?: string;
      status?: string;
      search?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ templates: CampaignTemplate[]; total: number }> {
    let query = this.supabase
      .from("campaign_templates")
      .select("*", { count: "exact" })
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    // Filter by workspace if provided, otherwise by user_id
    if (options.workspaceId) {
      // Verify user is a member of the workspace before listing
      const { data: membership } = await this.supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", options.workspaceId)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (!membership) {
        this.logger.warn(
          `User ${userId} attempted to list templates for workspace ${options.workspaceId} without membership`,
        );
        return { templates: [], total: 0 };
      }

      query = query.eq("workspace_id", options.workspaceId);
    } else {
      query = query.eq("user_id", userId);
    }

    if (options.status) {
      query = query.eq("status", options.status);
    }

    if (options.search) {
      query = query.ilike("name", `%${options.search}%`);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1,
      );
    }

    const { data, error, count } = await query;

    if (error) {
      this.logger.error("Failed to list templates:", error);
      throw new BadRequestException("Falha ao listar templates");
    }

    return {
      templates: data || [],
      total: count || 0,
    };
  }

  /**
   * Delete a template (soft delete)
   */
  async deleteTemplate(templateId: string, userId: string): Promise<void> {
    const template = await this.getTemplate(templateId, userId);
    if (!template) {
      throw new NotFoundException("Template não encontrado");
    }

    // Use template.id directly (getTemplate already validated access via user_id or workspace)
    const { error } = await this.supabase
      .from("campaign_templates")
      .update({
        deleted_at: new Date().toISOString(),
        status: "deleted",
      })
      .eq("id", templateId);

    if (error) {
      this.logger.error("Failed to delete template:", error);
      throw new BadRequestException("Falha ao excluir template");
    }

    // Log activity (no credits refunded)
    await this.creditsService.logCampaignActivity(
      userId,
      "deleted",
      templateId,
      template.name,
      0,
    );
  }

  /**
   * Duplicate a template
   */
  async duplicateTemplate(
    templateId: string,
    userId: string,
  ): Promise<CampaignTemplate> {
    const original = await this.getTemplate(templateId, userId);
    if (!original) {
      throw new NotFoundException("Template não encontrado");
    }

    // Check credits for new template
    const creditCheck = await this.creditsService.checkCredits(
      userId,
      "CAMPAIGN_BASIC",
      1,
      original.workspace_id || null,
    );

    if (!creditCheck.hasCredits) {
      throw new BadRequestException(
        `Créditos insuficientes para duplicar. Necessário: ${creditCheck.required}, Disponível: ${creditCheck.available}`,
      );
    }

    // Create duplicate
    const newData = {
      ...original.campaign_data,
      templateName: `${original.name} (Cópia)`,
    };

    const { data, error } = await this.supabase
      .from("campaign_templates")
      .insert({
        user_id: userId,
        workspace_id: original.workspace_id || null,
        name: newData.templateName,
        campaign_data: newData,
        status: "draft",
        credits_consumed: CREDIT_COSTS.CAMPAIGN_BASIC,
      })
      .select()
      .single();

    if (error) {
      this.logger.error("Failed to duplicate template:", error);
      throw new BadRequestException("Falha ao duplicar template");
    }

    // Consume credits
    await this.creditsService.consumeCredits(userId, "CAMPAIGN_BASIC", 1, {
      resourceType: "campaign_template",
      resourceId: data.id,
      description: `Duplicação de template: ${newData.templateName}`,
      workspaceId: original.workspace_id || null,
    });

    return data;
  }

  // ============================================
  // AI Creative Generation
  // ============================================

  /**
   * Generate ad copy using AI
   */
  async generateAdCopy(
    userId: string,
    dto: GenerateAdCopyDto,
  ): Promise<GeneratedAdCopy[]> {
    // Check credits
    const workspaceId = dto.workspaceId || null;
    const creditCheck = await this.creditsService.checkCredits(
      userId,
      "AD_COPY_GENERATION",
      1,
      workspaceId,
    );

    if (!creditCheck.hasCredits) {
      throw new BadRequestException(
        `Créditos insuficientes. Necessário: ${creditCheck.required}, Disponível: ${creditCheck.available}`,
      );
    }

    // Generate copies
    const copies = await this.aiCreativeService.generateAdCopy(
      dto.productName,
      {
        productDescription: dto.productDescription,
        targetAudience: dto.targetAudience,
        campaignObjective: dto.campaignObjective,
        tone: dto.tone,
        language: dto.language || "pt-BR",
        variations: dto.variations || 3,
      },
    );

    // Consume credits
    await this.creditsService.consumeCredits(userId, "AD_COPY_GENERATION", 1, {
      resourceType: "ad_copy",
      description: `Geração de copy: ${dto.productName}`,
      workspaceId,
    });

    return copies;
  }

  /**
   * Generate image using AI (DALL-E)
   */
  async generateImage(
    userId: string,
    dto: GenerateImageDto,
  ): Promise<{ imageUrl: string; revisedPrompt?: string }> {
    // Check credits
    const count = dto.count || 1;
    const workspaceId = dto.workspaceId || null;
    const creditCheck = await this.creditsService.checkCredits(
      userId,
      "CREATIVE_AI_GENERATED",
      count,
      workspaceId,
    );

    if (!creditCheck.hasCredits) {
      throw new BadRequestException(
        `Créditos insuficientes. Necessário: ${creditCheck.required}, Disponível: ${creditCheck.available}`,
      );
    }

    // Generate image
    const result = await this.aiCreativeService.generateImage(dto.prompt, {
      style: dto.style,
      aspectRatio: dto.aspectRatio,
    });

    // Consume credits
    await this.creditsService.consumeCredits(
      userId,
      "CREATIVE_AI_GENERATED",
      count,
      {
        resourceType: "image",
        description: `Imagem gerada: ${dto.prompt.substring(0, 50)}...`,
        workspaceId,
      },
    );

    // Log creative activity
    await this.creditsService.logCreativeActivity(
      userId,
      "generated",
      count,
      CreativeSourceType.AI_GENERATED,
      CREDIT_COSTS.CREATIVE_AI_GENERATED * count,
    );

    return result;
  }

  /**
   * Generate headlines only
   */
  async generateHeadlines(
    userId: string,
    productName: string,
    options: {
      productDescription?: string;
      count?: number;
      workspaceId?: string;
    } = {},
  ): Promise<string[]> {
    // Check credits
    const workspaceId = options.workspaceId || null;
    const creditCheck = await this.creditsService.checkCredits(
      userId,
      "HEADLINE_GENERATION",
      1,
      workspaceId,
    );

    if (!creditCheck.hasCredits) {
      throw new BadRequestException(
        `Créditos insuficientes. Necessário: ${creditCheck.required}, Disponível: ${creditCheck.available}`,
      );
    }

    // Generate headlines
    const headlines = await this.aiCreativeService.generateHeadlines(
      productName,
      {
        productDescription: options.productDescription,
        count: options.count || 5,
      },
    );

    // Consume credits
    await this.creditsService.consumeCredits(userId, "HEADLINE_GENERATION", 1, {
      resourceType: "headline",
      description: `Headlines para: ${productName}`,
      workspaceId,
    });

    return headlines;
  }

  // ============================================
  // Campaign Publishing (Meta API)
  // ============================================

  /**
   * Publish a campaign template to Meta Ads
   */
  async publishCampaign(
    userId: string,
    dto: PublishCampaignDto,
  ): Promise<{
    success: boolean;
    campaignId?: string;
    adSetId?: string;
    creativeId?: string;
    adId?: string;
    adSetsCount?: number;
    adsCount?: number;
    message: string;
  }> {
    this.logger.log(
      `[publishCampaign] Starting for userId=${userId}, templateId=${dto.templateId}`,
    );

    const template = await this.getTemplate(dto.templateId, userId);
    if (!template) {
      this.logger.error(
        `[publishCampaign] Template not found: ${dto.templateId}`,
      );
      throw new NotFoundException("Template não encontrado");
    }

    this.logger.log(
      `[publishCampaign] Template found: name=${template.name}, status=${template.status}, workspace_id=${template.workspace_id || "none"}`,
    );

    if (template.status === "published") {
      throw new BadRequestException("Campanha já foi publicada");
    }

    // Get connection and verify access
    // Support both new format (upload.adAccountId) and legacy format (accounts[0].id/accountId)
    // Cast to unknown first to safely access legacy fields
    const campaignDataLegacy = template.campaign_data as unknown as Record<
      string,
      unknown
    >;
    let adAccountId = template.campaign_data.upload?.adAccountId;
    let connectionId = template.campaign_data.upload?.connectionId;

    // Fallback to legacy format: accounts array at root level
    if (
      !adAccountId &&
      Array.isArray(campaignDataLegacy.accounts) &&
      (campaignDataLegacy.accounts as unknown[]).length > 0
    ) {
      const firstAccount = (
        campaignDataLegacy.accounts as Record<string, string>[]
      )[0];
      // Legacy format stores id as "act_xxx" or accountId as "xxx"
      adAccountId =
        firstAccount.id ||
        (firstAccount.accountId ? `act_${firstAccount.accountId}` : undefined);
      connectionId = connectionId || firstAccount.connectionId;
      this.logger.log(
        `[publishCampaign] Using legacy accounts format: adAccountId=${adAccountId}, connectionId=${connectionId}`,
      );
    }

    this.logger.log(
      `[publishCampaign] Template data: adAccountId=${adAccountId || "MISSING"}, connectionId=${connectionId || "MISSING"}`,
    );
    this.logger.log(
      `[publishCampaign] Full upload data: ${JSON.stringify(template.campaign_data.upload || {})}`,
    );

    if (!adAccountId) {
      this.logger.error(
        `[publishCampaign] Ad Account ID not found in template`,
      );
      throw new BadRequestException(
        "Ad Account ID não encontrado no template. Selecione uma conta de anúncios no wizard.",
      );
    }

    // Try to get connection: first by connectionId if available, then by adAccountId
    let connection: { access_token: string } | null = null;

    if (connectionId) {
      this.logger.log(
        `[publishCampaign] Trying to get connection by connectionId=${connectionId}`,
      );
      connection = await this.getMetaConnectionById(userId, connectionId);
    }

    if (!connection) {
      this.logger.log(
        `[publishCampaign] Trying to get connection by adAccountId=${adAccountId}`,
      );
      connection = await this.getMetaAdsConnection(userId, adAccountId);
    }

    if (!connection) {
      this.logger.error(
        `[publishCampaign] No Meta connection found for userId=${userId}, connectionId=${connectionId || "N/A"}, adAccountId=${adAccountId}`,
      );
      throw new BadRequestException("Conexão Meta Ads não encontrada");
    }

    this.logger.log(
      `[publishCampaign] Connection found, proceeding with campaign creation`,
    );

    // Check publishing credits
    // Handle case where mediaFiles might be empty or undefined
    const publishMediaFiles = template.campaign_data.upload?.mediaFiles || [];
    const creativeSources = publishMediaFiles.map(
      (m) => m.source || CreativeSourceType.UPLOAD,
    );

    const { breakdown } = this.creditsService.calculateCampaignCredits(
      creativeSources,
      {
        publishImmediately: true,
      },
    );

    // Only charge publish cost (template cost already charged)
    const publishCost = CREDIT_COSTS.CAMPAIGN_PUBLISH;
    const workspaceId = template.workspace_id || null;
    const creditCheck = await this.creditsService.checkCredits(
      userId,
      "CAMPAIGN_PUBLISH",
      1,
      workspaceId,
    );

    if (!creditCheck.hasCredits) {
      throw new BadRequestException(
        `Créditos insuficientes para publicar. Necessário: ${publishCost}, Disponível: ${creditCheck.available}`,
      );
    }

    // Dry run mode - just validate without publishing
    if (dto.dryRun) {
      return {
        success: true,
        message: "Validação concluída. Campanha pronta para publicação.",
      };
    }

    try {
      // Create campaign in Meta Ads API
      const campaignData = template.campaign_data;
      const adAccountId = template.campaign_data.upload?.adAccountId || "";
      const accessToken = connection.access_token;

      // Step 1: Create Campaign
      // Use status from template (ACTIVE or PAUSED) - default to PAUSED for safety
      const campaignStatus = campaignData.campaign?.status || "PAUSED";
      this.logger.log(
        `Step 1: Creating campaign with status: ${campaignStatus}...`,
      );
      const specialAdCategories =
        campaignData.campaign?.specialAdCategories || [];
      const specialAdCategoryCountry =
        campaignData.campaign?.specialAdCategoryCountry || [];
      const campaign = await this.createMetaCampaign(accessToken, adAccountId, {
        name: campaignData.campaign?.name || template.name,
        objective: this.mapObjectiveToMeta(campaignData.campaign?.objective),
        special_ad_categories: specialAdCategories,
        special_ad_category_country:
          specialAdCategories.length > 0 ? specialAdCategoryCountry : [],
        status: campaignStatus,
      });
      this.logger.log(`Campaign created: ${campaign.id}`);

      // Step 2: Prepare common settings
      this.logger.log(`Step 2: Preparing ad sets and ads...`);

      // Extract budget - can be number or object { type, amount, costPerResult, bidCap }
      let dailyBudget = 1000; // Default: R$10.00 in cents
      let bidStrategy = "LOWEST_COST_WITHOUT_CAP"; // Default strategy
      let bidAmount: number | undefined; // For COST_CAP or BID_CAP strategies

      const budgetData = campaignData.adSet?.budget;
      if (budgetData) {
        if (typeof budgetData === "number") {
          dailyBudget = budgetData;
        } else if (typeof budgetData === "object" && budgetData !== null) {
          // Budget is an object with type, amount, costPerResult, bidCap
          const budgetObj = budgetData as {
            type?: string;
            amount?: number;
            costPerResult?: number;
            bidCap?: number;
          };
          dailyBudget = budgetObj.amount || 1000;

          // Extract costPerResult for COST_CAP strategy
          if (budgetObj.costPerResult && budgetObj.costPerResult > 0) {
            bidAmount = Math.floor(Number(budgetObj.costPerResult));
          }
          // Extract bidCap for BID_CAP strategy
          if (budgetObj.bidCap && budgetObj.bidCap > 0) {
            bidAmount = Math.floor(Number(budgetObj.bidCap));
          }
        } else if (typeof budgetData === "string") {
          dailyBudget = parseInt(budgetData, 10) || 1000;
        }
      }

      // Extract bid strategy from adSet
      const rawBidStrategy = campaignData.adSet?.bidStrategy;
      if (rawBidStrategy && typeof rawBidStrategy === "string") {
        // Map frontend values to Meta API values (handle both new and legacy formats)
        const strategyMap: Record<string, string> = {
          // New API values (pass through)
          LOWEST_COST_WITHOUT_CAP: "LOWEST_COST_WITHOUT_CAP",
          COST_CAP: "COST_CAP",
          LOWEST_COST_WITH_BID_CAP: "LOWEST_COST_WITH_BID_CAP",
          LOWEST_COST_WITH_MIN_ROAS: "LOWEST_COST_WITH_MIN_ROAS",
          // Legacy values (backward compat)
          LOWEST_COST: "LOWEST_COST_WITHOUT_CAP",
          BID_CAP: "LOWEST_COST_WITH_BID_CAP",
        };
        bidStrategy = strategyMap[rawBidStrategy] || "LOWEST_COST_WITHOUT_CAP";

        // For ROAS strategy, extract minRoas as bidAmount
        if (bidStrategy === "LOWEST_COST_WITH_MIN_ROAS") {
          const budgetObj = budgetData as Record<string, unknown> | null;
          const minRoas = budgetObj?.minRoas;
          if (minRoas && typeof minRoas === "number" && minRoas > 0) {
            // Meta API expects roas_average_floor as integer (e.g., 200 = 2.00x ROAS)
            bidAmount = Math.floor(minRoas * 100);
          }
        }
      }

      // Ensure dailyBudget is a valid integer (Meta API requires cents)
      dailyBudget = Math.floor(Number(dailyBudget));
      if (isNaN(dailyBudget) || dailyBudget < 100) {
        dailyBudget = 1000; // Minimum R$10.00
      }

      this.logger.log(
        `Budget extracted: ${dailyBudget} cents (R$${(dailyBudget / 100).toFixed(2)})`,
      );
      this.logger.log(
        `Bid strategy: ${bidStrategy}${bidAmount ? `, bid_amount: ${bidAmount} cents` : ""}`,
      );

      // Normalize targeting from frontend format to Meta API format
      const rawTargeting = campaignData.adSet?.targeting || {};
      const normalizedTargeting = this.normalizeTargeting(rawTargeting);
      this.logger.log(
        `Targeting normalized: ${JSON.stringify(normalizedTargeting)}`,
      );

      // Support both new format (upload.mediaFiles) and legacy format (creatives at root)
      // Cast to unknown first to safely access legacy fields not in CreateCampaignDto
      const campaignDataAny = campaignData as unknown as Record<
        string,
        unknown
      >;

      let mediaFiles = campaignData.upload?.mediaFiles || [];
      const legacyCreatives = campaignDataAny.creatives as
        | Array<{ imageUrl?: string; id?: string }>
        | undefined;

      if (
        mediaFiles.length === 0 &&
        Array.isArray(legacyCreatives) &&
        legacyCreatives.length > 0
      ) {
        // Convert legacy creatives to mediaFiles format
        mediaFiles = legacyCreatives.map((c, idx) => ({
          id: c.id || `creative_${idx}`,
          name: `Creative ${idx + 1}`,
          type: "image" as const,
          url: c.imageUrl || "",
        }));
        this.logger.log(
          `[publishCampaign] Using legacy creatives format: ${mediaFiles.length} items`,
        );
      }

      // Support both new format (upload.pageId) and legacy format (pages[0].id)
      let pageId =
        campaignData.upload?.pageId || campaignData.ads?.facebookPageId;

      // Fallback to legacy pages array at root level
      if (!pageId) {
        const pagesArray = campaignDataAny.pages as
          | Array<{ id: string }>
          | undefined;
        if (Array.isArray(pagesArray) && pagesArray.length > 0) {
          pageId = pagesArray[0].id;
          this.logger.log(
            `[publishCampaign] Using legacy pages format: pageId=${pageId}`,
          );
        }
      }

      if (!pageId) {
        throw new Error(
          "Facebook Page ID é obrigatório para criar anúncios. Selecione uma página no wizard.",
        );
      }

      if (mediaFiles.length === 0) {
        throw new Error(
          "Nenhuma imagem encontrada para criar o anúncio. Adicione criativos no wizard.",
        );
      }

      // Get ad creatives array (new format) or fall back to single creative (legacy)
      const adsCreatives = campaignData.ads?.creatives || [];
      const hasMultipleCreatives = adsCreatives.length > 0;

      this.logger.log(
        `Creating ${mediaFiles.length} ad sets with ads (hasMultipleCreatives: ${hasMultipleCreatives})`,
      );

      // Determine campaign objective and destination
      const objective =
        campaignData.campaign?.objective?.toString() || "OUTCOME_TRAFFIC";

      // NEW: Use destination_type and promotedObject from frontend if available
      const frontendDestType = campaignData.adSet?.destinationType;
      const frontendPromotedObj = campaignData.adSet?.promotedObject;

      // Legacy detection: is this a MESSAGES campaign (old format)?
      const isLegacyMessagesCampaign =
        objective.toUpperCase() === "MESSAGES" && !frontendDestType;

      // Determine destination_type
      let destinationType: string | undefined;
      if (frontendDestType) {
        // New ODAX format: use destination directly from frontend
        destinationType = frontendDestType;
      } else if (isLegacyMessagesCampaign) {
        // Legacy format: derive from messageConfig
        const messageConfig = campaignData.messageConfig || {};
        destinationType = messageConfig.destination || "MESSENGER";
      }

      // Check if this is a messaging destination
      const isMessagingDestination = [
        "MESSENGER",
        "WHATSAPP",
        "INSTAGRAM_DIRECT",
      ].includes(destinationType || "");

      // Determine promoted_object
      let promotedObject: Record<string, unknown> | undefined;

      // Pixel configuration (optional)
      // Support both new format (ads.pixelId) and legacy format (pixel.id at root)
      let pixelId = campaignData.ads?.pixelId;
      let legacyPixelEvent: string | undefined;

      // Fallback to legacy pixel format at root level
      if (!pixelId) {
        const legacyPixel = campaignDataAny.pixel as
          | { id?: string }
          | undefined;
        if (legacyPixel?.id) {
          pixelId = legacyPixel.id;
          legacyPixelEvent = campaignDataAny.pixelEvent as string | undefined;
          this.logger.log(
            `[publishCampaign] Using legacy pixel format: pixelId=${pixelId}, event=${legacyPixelEvent}`,
          );
        }
      }

      const pixelEnabled = campaignData.ads?.pixelEnabled === true || !!pixelId;
      const shouldUsePixel =
        pixelEnabled && typeof pixelId === "string" && pixelId.length > 0;

      if (frontendPromotedObj && Object.keys(frontendPromotedObj).length > 0) {
        // New ODAX format: use promoted_object from frontend (already correctly built)
        promotedObject = frontendPromotedObj;
        this.logger.log(
          `Using frontend promotedObject: ${JSON.stringify(promotedObject)}`,
        );
      } else if (shouldUsePixel) {
        // PIXEL-BASED optimization: promoted_object uses pixel_id + custom_event_type
        // IMPORTANT: page_id and pixel_id are MUTUALLY EXCLUSIVE in promoted_object.
        // page_id = optimize for conversations; pixel_id = optimize for conversions.
        const pixelEvent =
          legacyPixelEvent || this.mapObjectiveToPixelEvent(objective);
        promotedObject = {
          pixel_id: pixelId,
          custom_event_type: pixelEvent,
        };
        this.logger.log(
          `Pixel-based promoted_object: pixel_id=${pixelId}, event=${pixelEvent}`,
        );
      } else if (isMessagingDestination) {
        // PAGE-BASED optimization (messaging without pixel): optimize for conversations
        promotedObject = {
          page_id: pageId,
        };
        this.logger.log(
          `Messaging campaign - destination_type: ${destinationType}, page_id: ${pageId}`,
        );
      }

      // Track created resources
      const createdAdSets: string[] = [];
      const createdAds: string[] = [];
      const createdCreatives: string[] = [];

      // Get campaign name for naming convention
      const campaignName = campaignData.campaign?.name || template.name;
      const totalAdSets = mediaFiles.length;

      // Determine optimization goal once (same for all ad sets)
      // PRIORITY: 1. Frontend-provided optimizationGoal  2. Legacy messageConfig  3. Default mapping
      let optimizationGoal: string;
      const frontendOptGoal = campaignData.adSet?.optimizationGoal;

      if (frontendOptGoal) {
        optimizationGoal = frontendOptGoal;
        this.logger.log(`Using frontend optimizationGoal: ${optimizationGoal}`);
      } else if (isLegacyMessagesCampaign) {
        const messageConfig = campaignData.messageConfig || {};
        optimizationGoal = messageConfig.optimization || "CONVERSATIONS";
        this.logger.log(
          `[Legacy MESSAGES] Using optimization: ${optimizationGoal}`,
        );
      } else {
        optimizationGoal = this.mapOptimizationGoal(
          campaignData.campaign?.objective,
        );
        this.logger.log(
          `Using default optimization for objective: ${optimizationGoal}`,
        );
      }

      // Build UTM tags string once (same for all creatives) - OBRIGATÓRIO
      const urlTags = buildMetaUtmSuffix(template.id);

      // ============================================================
      // PHASE 1: Upload ALL images in parallel (no dependencies)
      // ============================================================
      this.logger.log(
        `\n=== Phase 1: Uploading ${mediaFiles.length} images in parallel ===`,
      );
      const imageUploadStart = Date.now();

      const imageHashResults = await Promise.all(
        mediaFiles.map(async (mediaFile, i) => {
          const imageHash = await this.uploadImageToMeta(
            accessToken,
            adAccountId,
            mediaFile.url,
          );
          this.logger.log(
            `Image ${i + 1}/${mediaFiles.length} uploaded, hash: ${imageHash}`,
          );
          return imageHash;
        }),
      );

      const imageUploadTime = Date.now() - imageUploadStart;
      this.logger.log(
        `All ${mediaFiles.length} images uploaded in ${(imageUploadTime / 1000).toFixed(1)}s (parallel)`,
      );

      // ============================================================
      // PHASE 2: Create Ad Sets + Creatives + Ads in parallel batches
      // ============================================================
      const CONCURRENCY_LIMIT = 3;
      this.logger.log(
        `\n=== Phase 2: Creating ${mediaFiles.length} ad sets (concurrency: ${CONCURRENCY_LIMIT}) ===`,
      );
      const adSetCreationStart = Date.now();

      // Prepare all pipeline data upfront
      const pipelineConfigs = mediaFiles.map((mediaFile, i) => {
        const adSetIndex = i + 1;
        const adSetName = generateAdSetName(
          campaignName,
          adSetIndex,
          totalAdSets,
        );
        const adName = generateAdName(adSetName, adSetIndex, "img");
        const imageHash = imageHashResults[i];

        // Get ad copy for this creative
        let adCopyData: {
          primaryText?: string;
          headline?: string;
          description?: string;
          callToAction?: string;
          linkUrl?: string;
          destinationUrl?: string;
          displayUrl?: string;
          articleId?: number;
          greetingConfig?: {
            greeting: string;
            iceBreakers: Array<{ title: string; response: string }>;
          };
        } = {};

        if (hasMultipleCreatives) {
          const matchingCreative = adsCreatives.find(
            (c: { imageId?: string }) => c.imageId === mediaFile.id,
          );
          if (matchingCreative) {
            adCopyData = matchingCreative;
          } else if (adsCreatives[i]) {
            adCopyData = adsCreatives[i];
          }
        }

        if (!adCopyData.primaryText) {
          adCopyData = campaignData.ads?.creative || {};
        }

        const primaryText =
          adCopyData.primaryText || "Confira nossa oferta especial!";
        const headline = adCopyData.headline || template.name;
        const description = adCopyData.description || "";

        const linkUrl =
          adCopyData.linkUrl ||
          adCopyData.destinationUrl ||
          campaignData.ads?.website ||
          "";

        let displayUrl = adCopyData.displayUrl || "";
        if (!displayUrl && linkUrl) {
          try {
            const urlObj = new URL(linkUrl);
            displayUrl = urlObj.hostname.replace(/^www\./, "");
          } catch {
            // Invalid URL, leave displayUrl empty
          }
        }

        const callToAction = adCopyData.callToAction || "LEARN_MORE";

        return {
          adSetIndex,
          adSetName,
          adName,
          imageHash,
          primaryText,
          headline,
          description,
          linkUrl,
          displayUrl,
          callToAction,
          adCopyData,
        };
      });

      // Process pipelines with concurrency limit
      const processPipeline = async (config: (typeof pipelineConfigs)[0]) => {
        const {
          adSetIndex,
          adSetName,
          adName,
          imageHash,
          primaryText,
          headline,
          description,
          linkUrl,
          displayUrl,
          callToAction,
        } = config;

        this.logger.log(
          `\n--- Creating Ad Set ${adSetIndex}/${totalAdSets} ---`,
        );
        this.logger.log(`Ad Set Name: ${adSetName}`);

        // 1. Create Ad Set
        const adSet = await this.createMetaAdSet(
          accessToken,
          adAccountId,
          campaign.id,
          {
            name: adSetName,
            dailyBudget,
            targeting: normalizedTargeting,
            optimizationGoal,
            billingEvent: "IMPRESSIONS",
            status: campaignStatus,
            bidStrategy,
            bidAmount,
            destinationType,
            promotedObject,
          },
        );
        this.logger.log(`Ad Set ${adSetIndex} created: ${adSet.id}`);

        // 2. Create Ad Creative
        let creative: { id: string };

        if (isMessagingDestination) {
          const messageConfig = campaignData.messageConfig || {};
          const messageDestination = (messageConfig.destination ||
            "MESSENGER") as "MESSENGER" | "WHATSAPP" | "INSTAGRAM_DIRECT";

          creative = await this.createMetaMessageCreative(
            accessToken,
            adAccountId,
            {
              name: `${adSetName}_criativo`,
              pageId,
              imageHash,
              primaryText,
              headline,
              description,
              callToAction,
              messageDestination,
              greetingMessage: messageConfig.greetingMessage,
              whatsappNumber: messageConfig.whatsappNumber,
              greetingConfig: config.adCopyData.greetingConfig,
            },
          );
        } else {
          if (!linkUrl) {
            throw new Error(
              `URL de destino é OBRIGATÓRIA para campanhas de tráfego.\n` +
                `Creative ${adSetIndex} não tem URL definida.\n` +
                `Se você selecionou um artigo, verifique se o projeto tem um domínio configurado e o artigo tem um slug.\n` +
                `Dados recebidos: linkUrl="${config.adCopyData.linkUrl || ""}", destinationUrl="${config.adCopyData.destinationUrl || ""}", articleId=${config.adCopyData.articleId || "nenhum"}`,
            );
          }

          creative = await this.createMetaAdCreative(accessToken, adAccountId, {
            name: `${adSetName}_criativo`,
            pageId,
            imageHash,
            primaryText,
            headline,
            description,
            linkUrl,
            callToAction,
            displayUrl,
            urlTags,
          });
        }
        this.logger.log(`Creative ${adSetIndex} created: ${creative.id}`);

        // 3. Create Ad
        const ad = await this.createMetaAd(
          accessToken,
          adAccountId,
          adSet.id,
          creative.id,
          {
            name: adName,
            status: campaignStatus,
          },
        );
        this.logger.log(`Ad ${adSetIndex} created: ${ad.id} (${adName})`);

        return {
          adSetIndex,
          adSetId: adSet.id,
          creativeId: creative.id,
          adId: ad.id,
        };
      };

      // Execute with concurrency limit using batches
      const results: Awaited<ReturnType<typeof processPipeline>>[] = [];
      for (
        let batchStart = 0;
        batchStart < pipelineConfigs.length;
        batchStart += CONCURRENCY_LIMIT
      ) {
        const batch = pipelineConfigs.slice(
          batchStart,
          batchStart + CONCURRENCY_LIMIT,
        );
        const batchResults = await Promise.all(batch.map(processPipeline));
        results.push(...batchResults);
      }

      // Sort results by index and populate tracking arrays
      results.sort((a, b) => a.adSetIndex - b.adSetIndex);
      for (const result of results) {
        createdAdSets.push(result.adSetId);
        createdCreatives.push(result.creativeId);
        createdAds.push(result.adId);
      }

      const adSetCreationTime = Date.now() - adSetCreationStart;
      this.logger.log(
        `\nAll ${totalAdSets} ad sets created in ${(adSetCreationTime / 1000).toFixed(1)}s (batches of ${CONCURRENCY_LIMIT})`,
      );

      this.logger.log(`\n=== Summary ===`);
      this.logger.log(`Campaign: ${campaign.id}`);
      this.logger.log(
        `Ad Sets created: ${createdAdSets.length} - ${createdAdSets.join(", ")}`,
      );
      this.logger.log(
        `Ads created: ${createdAds.length} - ${createdAds.join(", ")}`,
      );

      // Use first created resources for backward compatibility in DB
      const adSet = { id: createdAdSets[0] };
      const ad = { id: createdAds[0] };
      const creative = { id: createdCreatives[0] };

      // Update template with Meta IDs
      await this.supabase
        .from("campaign_templates")
        .update({
          status: "published",
          published_campaign_id: campaign.id,
          published_ad_set_id: adSet.id,
          published_ad_id: ad.id,
          published_at: new Date().toISOString(),
          credits_consumed: template.credits_consumed + publishCost,
          updated_at: new Date().toISOString(),
        })
        .eq("id", template.id);

      // Consume publishing credits
      await this.creditsService.consumeCredits(userId, "CAMPAIGN_PUBLISH", 1, {
        resourceType: "campaign",
        resourceId: template.id,
        description: `Publicação: ${campaignData.campaign?.name || template.name}`,
        breakdown,
        workspaceId,
      });

      // Log activity
      await this.creditsService.logCampaignActivity(
        userId,
        "published",
        template.id,
        template.name,
        publishCost,
      );

      return {
        success: true,
        campaignId: campaign.id,
        adSetId: adSet.id,
        creativeId: creative.id,
        adId: ad.id,
        // Include counts for user feedback
        adSetsCount: createdAdSets.length,
        adsCount: createdAds.length,
        message: `Campanha publicada com sucesso: ${createdAdSets.length} conjunto(s) e ${createdAds.length} anúncio(s) criados`,
      };
    } catch (error) {
      this.logger.error("Failed to publish campaign:", error);

      // Update template with error
      await this.supabase
        .from("campaign_templates")
        .update({
          status: "failed",
          publish_error: error.message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", template.id);

      throw new BadRequestException(
        `Falha ao publicar campanha: ${error.message}`,
      );
    }
  }

  /**
   * Get credit cost preview for campaigns
   */
  getCreditCosts(): typeof CREDIT_COSTS {
    return this.creditsService.getCreditCostPreview();
  }

  /**
   * Calculate credits for a campaign configuration
   */
  calculateCredits(
    creativeSources: CreativeSourceType[],
    options: {
      publishImmediately?: boolean;
      generateAdCopy?: boolean;
      generateHeadlines?: boolean;
    } = {},
  ): { total: number; breakdown: Record<string, number> } {
    return this.creditsService.calculateCampaignCredits(
      creativeSources,
      options,
    );
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Extract user-friendly error message from Meta API error response
   * Meta API returns more descriptive messages in error_user_msg or error_user_title
   */
  private extractMetaErrorMessage(errorData: any, fallback: string): string {
    const error = errorData?.error;
    if (!error) return fallback;

    // Priority: error_user_msg > error_user_title > message > fallback
    // error_user_msg contains actionable instructions for the user
    if (error.error_user_msg) {
      return error.error_user_msg;
    }

    // error_user_title contains a short, user-friendly summary
    if (error.error_user_title) {
      return error.error_user_title;
    }

    // error.message is the generic API message
    if (error.message) {
      return error.message;
    }

    return fallback;
  }

  /**
   * Get Meta connection by ID with access verification
   *
   * This method finds the connection directly by ID and verifies access
   */
  private async getMetaConnectionById(
    userId: string,
    connectionId: string,
  ): Promise<{ access_token: string } | null> {
    this.logger.log(
      `[getMetaConnectionById] Looking up connection by id=${connectionId}, userId=${userId}`,
    );

    const { data: connection, error: connError } = await this.supabase
      .from("connections")
      .select(
        "id, access_token, user_id, workspace_id, plataform_name, is_active, deleted_at, connection_name",
      )
      .eq("id", connectionId)
      .single();

    if (connError) {
      this.logger.error(
        `[getMetaConnectionById] Failed to get connection: ${JSON.stringify(connError)}`,
      );
      return null;
    }

    if (!connection) {
      this.logger.error(
        `[getMetaConnectionById] Connection not found for id=${connectionId}`,
      );
      return null;
    }

    this.logger.log(
      `[getMetaConnectionById] Found connection: id=${connection.id}, name=${connection.connection_name}, user_id=${connection.user_id}, workspace_id=${connection.workspace_id}, is_active=${connection.is_active}, deleted_at=${connection.deleted_at}`,
    );

    // Validate connection state
    if (!connection.is_active) {
      this.logger.error(`[getMetaConnectionById] Connection is not active`);
      return null;
    }

    if (connection.deleted_at) {
      this.logger.error(`[getMetaConnectionById] Connection is deleted`);
      return null;
    }

    if (connection.plataform_name !== "meta") {
      this.logger.error(
        `[getMetaConnectionById] Connection platform is not meta: ${connection.plataform_name}`,
      );
      return null;
    }

    // Verify user has access (owner OR workspace member)
    const isOwner = connection.user_id === userId;
    this.logger.log(`[getMetaConnectionById] User is owner: ${isOwner}`);

    if (isOwner) {
      this.logger.log(`[getMetaConnectionById] Access granted (owner)`);
      return { access_token: connection.access_token };
    }

    // Check workspace membership if connection belongs to a workspace
    if (connection.workspace_id) {
      this.logger.log(
        `[getMetaConnectionById] Checking workspace membership for workspace_id=${connection.workspace_id}`,
      );

      const { data: membership, error: membershipError } = await this.supabase
        .from("workspace_members")
        .select("id, status")
        .eq("workspace_id", connection.workspace_id)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (membershipError) {
        this.logger.warn(
          `[getMetaConnectionById] Workspace membership query error: ${JSON.stringify(membershipError)}`,
        );
      }

      if (membership) {
        this.logger.log(
          `[getMetaConnectionById] Access granted (workspace member)`,
        );
        return { access_token: connection.access_token };
      }

      this.logger.error(
        `[getMetaConnectionById] User is not a member of workspace ${connection.workspace_id}`,
      );
    } else {
      this.logger.error(
        `[getMetaConnectionById] Connection has no workspace and user is not owner`,
      );
    }

    return null;
  }

  /**
   * Get Meta Ads connection for a user
   *
   * This method finds the correct Meta connection by:
   * 1. Looking up the ad account to find its connection_id
   * 2. Verifying the user has access (owner OR workspace member)
   * 3. Returning the connection's access token
   */
  private async getMetaAdsConnection(
    userId: string,
    adAccountId: string,
  ): Promise<{ access_token: string } | null> {
    this.logger.log(
      `[getMetaAdsConnection] Starting lookup for userId=${userId}, adAccountId=${adAccountId}`,
    );

    // Step 1: Find the ad account in meta_ad_accounts to get the connection_id
    // Clean the adAccountId (remove 'act_' prefix if present)
    const cleanAccountId = adAccountId.replace(/^act_/, "");
    this.logger.log(
      `[getMetaAdsConnection] Looking up meta_ad_accounts with account_id=${cleanAccountId}`,
    );

    const { data: adAccount, error: adAccountError } = await this.supabase
      .from("meta_ad_accounts")
      .select("connection_id, account_id, account_name")
      .eq("account_id", cleanAccountId)
      .single();

    if (adAccountError) {
      this.logger.warn(
        `[getMetaAdsConnection] Failed to find ad account: ${JSON.stringify(adAccountError)}`,
      );
    }

    if (adAccount) {
      this.logger.log(
        `[getMetaAdsConnection] Found ad account: account_name=${adAccount.account_name}, connection_id=${adAccount.connection_id}`,
      );

      // Step 2: Get the connection and verify access
      const { data: connection, error: connError } = await this.supabase
        .from("connections")
        .select(
          "id, access_token, user_id, workspace_id, plataform_name, is_active, deleted_at, connection_name",
        )
        .eq("id", adAccount.connection_id)
        .single();

      if (connError) {
        this.logger.error(
          `[getMetaAdsConnection] Failed to get connection: ${JSON.stringify(connError)}`,
        );
        return null;
      }

      if (!connection) {
        this.logger.error(
          `[getMetaAdsConnection] Connection not found for id=${adAccount.connection_id}`,
        );
        return null;
      }

      this.logger.log(
        `[getMetaAdsConnection] Found connection: id=${connection.id}, name=${connection.connection_name}, user_id=${connection.user_id}, workspace_id=${connection.workspace_id}, is_active=${connection.is_active}, deleted_at=${connection.deleted_at}`,
      );

      // Validate connection state
      if (!connection.is_active) {
        this.logger.error(`[getMetaAdsConnection] Connection is not active`);
        return null;
      }

      if (connection.deleted_at) {
        this.logger.error(`[getMetaAdsConnection] Connection is deleted`);
        return null;
      }

      if (connection.plataform_name !== "meta") {
        this.logger.error(
          `[getMetaAdsConnection] Connection platform is not meta: ${connection.plataform_name}`,
        );
        return null;
      }

      // Step 3: Verify user has access (owner OR workspace member)
      const isOwner = connection.user_id === userId;
      this.logger.log(`[getMetaAdsConnection] User is owner: ${isOwner}`);

      if (isOwner) {
        this.logger.log(`[getMetaAdsConnection] Access granted (owner)`);
        return { access_token: connection.access_token };
      }

      // Check workspace membership if connection belongs to a workspace
      if (connection.workspace_id) {
        this.logger.log(
          `[getMetaAdsConnection] Checking workspace membership for workspace_id=${connection.workspace_id}`,
        );

        const { data: membership, error: membershipError } = await this.supabase
          .from("workspace_members")
          .select("id, status")
          .eq("workspace_id", connection.workspace_id)
          .eq("user_id", userId)
          .eq("status", "active")
          .single();

        if (membershipError) {
          this.logger.warn(
            `[getMetaAdsConnection] Workspace membership query error: ${JSON.stringify(membershipError)}`,
          );
        }

        if (membership) {
          this.logger.log(
            `[getMetaAdsConnection] Access granted (workspace member)`,
          );
          return { access_token: connection.access_token };
        }

        this.logger.error(
          `[getMetaAdsConnection] User is not a member of workspace ${connection.workspace_id}`,
        );
      } else {
        this.logger.error(
          `[getMetaAdsConnection] Connection has no workspace and user is not owner`,
        );
      }

      return null;
    }

    // Fallback: Try to find any active Meta connection for this user (legacy behavior)
    this.logger.log(
      `[getMetaAdsConnection] Ad account not found in meta_ad_accounts, falling back to direct user connection lookup`,
    );

    const { data: directConnection, error: directError } = await this.supabase
      .from("connections")
      .select("id, access_token, connection_name")
      .eq("user_id", userId)
      .eq("plataform_name", "meta")
      .eq("is_active", true)
      .is("deleted_at", null)
      .single();

    if (directError) {
      this.logger.error(
        `[getMetaAdsConnection] Fallback query error: ${JSON.stringify(directError)}`,
      );

      // Check if it's "multiple rows returned" error - user might have multiple connections
      if (directError.code === "PGRST116") {
        this.logger.error(
          `[getMetaAdsConnection] User has multiple Meta connections but ad account not linked to any`,
        );
      }

      return null;
    }

    if (directConnection) {
      this.logger.log(
        `[getMetaAdsConnection] Found direct user connection: id=${directConnection.id}, name=${directConnection.connection_name}`,
      );
      return { access_token: directConnection.access_token };
    }

    this.logger.error(
      `[getMetaAdsConnection] No connection found for user ${userId}`,
    );
    return null;
  }

  /**
   * Create a campaign in Meta Ads API
   */
  private async createMetaCampaign(
    accessToken: string,
    adAccountId: string,
    data: {
      name: string;
      objective: string;
      special_ad_categories: string[];
      special_ad_category_country: string[];
      status: string;
    },
  ): Promise<{ id: string }> {
    // Remove 'act_' prefix if already present to avoid duplication
    const cleanAccountId = adAccountId.replace(/^act_/, "");
    const url = `${this.META_API_URL}/act_${cleanAccountId}/campaigns`;

    this.logger.debug(`Creating Meta campaign at URL: ${url}`);
    this.logger.debug(`Campaign data: ${JSON.stringify(data)}`);

    const params = new URLSearchParams({
      access_token: accessToken,
      name: data.name,
      objective: data.objective,
      status: data.status,
      special_ad_categories: JSON.stringify(data.special_ad_categories),
    });

    // Only include special_ad_category_country when there are special categories
    if (
      data.special_ad_categories.length > 0 &&
      data.special_ad_category_country.length > 0
    ) {
      params.set(
        "special_ad_category_country",
        JSON.stringify(data.special_ad_category_country),
      );
    }

    const response = await fetch(url, {
      method: "POST",
      body: params,
    });

    if (!response.ok) {
      const errorData = await response.json();
      this.logger.error(`Meta API error: ${JSON.stringify(errorData)}`);
      throw new Error(
        this.extractMetaErrorMessage(errorData, "Falha ao criar campanha"),
      );
    }

    return response.json();
  }

  /**
   * Map internal objective to Meta API objective
   * Now accepts string for flexibility with AI flow
   */
  private mapObjectiveToMeta(
    objective: string | CampaignObjective | undefined,
  ): string {
    if (!objective) return "OUTCOME_TRAFFIC";

    const objectiveStr = objective.toString();

    // If already an OUTCOME_ value (new ODAX format from frontend), pass through
    if (objectiveStr.startsWith("OUTCOME_")) {
      return objectiveStr;
    }

    // Legacy mapping for backward compatibility
    const normalizedObjective = objectiveStr.toLowerCase();
    const mapping: Record<string, string> = {
      awareness: "OUTCOME_AWARENESS",
      engagement: "OUTCOME_ENGAGEMENT",
      leads: "OUTCOME_LEADS",
      sales: "OUTCOME_SALES",
      traffic: "OUTCOME_TRAFFIC",
      app_promotion: "OUTCOME_APP_PROMOTION",
      // Handle legacy MESSAGES objective from wizard
      messages: "OUTCOME_ENGAGEMENT",
    };

    return mapping[normalizedObjective] || "OUTCOME_TRAFFIC";
  }

  /**
   * Map objective to optimization goal for ad sets
   */
  /**
   * Map objective to default optimization goal.
   * Used as fallback when the frontend doesn't provide an explicit optimization_goal.
   */
  private mapOptimizationGoal(objective: string | undefined): string {
    if (!objective) return "LINK_CLICKS";

    const objectiveStr = objective.toString();

    // Direct ODAX mapping
    const odaxMapping: Record<string, string> = {
      OUTCOME_AWARENESS: "REACH",
      OUTCOME_TRAFFIC: "LINK_CLICKS",
      OUTCOME_ENGAGEMENT: "POST_ENGAGEMENT",
      OUTCOME_LEADS: "LEAD_GENERATION",
      OUTCOME_APP_PROMOTION: "APP_INSTALLS",
      OUTCOME_SALES: "OFFSITE_CONVERSIONS",
    };

    if (odaxMapping[objectiveStr]) {
      return odaxMapping[objectiveStr];
    }

    // Legacy mapping
    const normalizedObjective = objectiveStr.toLowerCase();
    const legacyMapping: Record<string, string> = {
      awareness: "REACH",
      engagement: "POST_ENGAGEMENT",
      leads: "LEAD_GENERATION",
      sales: "OFFSITE_CONVERSIONS",
      traffic: "LINK_CLICKS",
      messages: "CONVERSATIONS",
    };

    return legacyMapping[normalizedObjective] || "LINK_CLICKS";
  }

  /**
   * Map objective to Meta pixel event type.
   * Used as fallback when the frontend doesn't provide an explicit conversion event.
   */
  private mapObjectiveToPixelEvent(objective: string | undefined): string {
    if (!objective) return "VIEW_CONTENT";

    const objectiveStr = objective.toString();

    // ODAX mapping
    const odaxMapping: Record<string, string> = {
      OUTCOME_TRAFFIC: "VIEW_CONTENT",
      OUTCOME_LEADS: "LEAD",
      OUTCOME_SALES: "PURCHASE",
      OUTCOME_ENGAGEMENT: "VIEW_CONTENT",
      OUTCOME_AWARENESS: "VIEW_CONTENT",
    };

    if (odaxMapping[objectiveStr]) {
      return odaxMapping[objectiveStr];
    }

    // Legacy mapping
    const normalizedObjective = objectiveStr.toLowerCase();
    const legacyMapping: Record<string, string> = {
      traffic: "VIEW_CONTENT",
      leads: "LEAD",
      sales: "PURCHASE",
    };

    return legacyMapping[normalizedObjective] || "VIEW_CONTENT";
  }

  /**
   * Meta locale IDs mapping from ISO 639-1 language codes
   * Reference: https://developers.facebook.com/docs/marketing-api/audiences/reference/targeting-search#locales
   */
  private readonly META_LOCALE_IDS: Record<string, number> = {
    pt: 6, // Portuguese
    en: 24, // English (US)
    es: 23, // Spanish
    de: 10, // German
    fr: 9, // French
    it: 13, // Italian
    ja: 14, // Japanese
    ko: 15, // Korean
    zh: 44, // Chinese (Simplified)
    ru: 19, // Russian
    ar: 28, // Arabic
    hi: 45, // Hindi
    nl: 17, // Dutch
    pl: 18, // Polish
    tr: 21, // Turkish
    sv: 20, // Swedish
    da: 7, // Danish
    fi: 8, // Finnish
    no: 16, // Norwegian
    cs: 5, // Czech
    el: 11, // Greek
    he: 12, // Hebrew
    hu: 42, // Hungarian
    id: 54, // Indonesian
    ms: 41, // Malay
    th: 34, // Thai
    vi: 25, // Vietnamese
    uk: 22, // Ukrainian
    ro: 40, // Romanian
    bg: 36, // Bulgarian
    hr: 38, // Croatian
    sk: 43, // Slovak
    sl: 47, // Slovenian
    sr: 48, // Serbian
    lt: 39, // Lithuanian
    lv: 46, // Latvian
    et: 37, // Estonian
    tl: 26, // Filipino/Tagalog
  };

  /**
   * Normalize targeting from frontend format to Meta API format
   * Frontend uses camelCase, Meta API uses snake_case
   */
  private normalizeTargeting(
    rawTargeting: Record<string, unknown>,
  ): Record<string, unknown> {
    const normalized: Record<string, unknown> = {};

    // Age range
    if (rawTargeting.ageMin !== undefined) {
      normalized.age_min = Number(rawTargeting.ageMin) || 18;
    }
    if (rawTargeting.ageMax !== undefined) {
      normalized.age_max = Number(rawTargeting.ageMax) || 65;
    }

    // Genders (1 = male, 2 = female, or [1,2] for all)
    // Note: [0] means "all" in frontend but Meta API expects no genders field or [1,2]
    if (rawTargeting.genders !== undefined) {
      const genders = rawTargeting.genders;
      if (Array.isArray(genders) && genders.length > 0) {
        // Filter out 0 (all) and only include 1 (male) and 2 (female)
        const validGenders = genders
          .map((g) => Number(g))
          .filter((g) => g === 1 || g === 2);
        if (validGenders.length > 0) {
          normalized.genders = validGenders;
        }
        // If only [0] was passed, we don't set genders (targets all)
      }
    }

    // Geo locations - convert from geoLocations to geo_locations
    if (rawTargeting.geoLocations !== undefined) {
      normalized.geo_locations = rawTargeting.geoLocations;
    } else if (rawTargeting.geo_locations !== undefined) {
      normalized.geo_locations = rawTargeting.geo_locations;
    } else {
      // Default to Brazil
      normalized.geo_locations = { countries: ["BR"] };
    }

    // Locales (language targeting) - convert ISO codes to Meta locale IDs
    if (rawTargeting.locales !== undefined) {
      const locales = rawTargeting.locales;
      if (Array.isArray(locales) && locales.length > 0) {
        const validLocales = locales
          .map((l) => {
            // If it's already a valid number, use it
            if (typeof l === "number" && l > 0) return l;

            // If it's a string that looks like a number, parse it
            if (typeof l === "string") {
              const parsed = parseInt(l, 10);
              if (!isNaN(parsed) && parsed > 0) return parsed;

              // Otherwise, try to map from ISO code
              const isoCode = l.toLowerCase();
              if (this.META_LOCALE_IDS[isoCode]) {
                return this.META_LOCALE_IDS[isoCode];
              }
            }

            // If it's an object with key property (from frontend targeting.languages)
            if (typeof l === "object" && l !== null && "key" in l) {
              const key = String((l as { key: string }).key).toLowerCase();
              // Try to parse as number first
              const parsed = parseInt(key, 10);
              if (!isNaN(parsed) && parsed > 0) return parsed;
              // Otherwise map from ISO code
              if (this.META_LOCALE_IDS[key]) {
                return this.META_LOCALE_IDS[key];
              }
            }

            return 0;
          })
          .filter((l) => l > 0);

        // Only set locales if we have valid ones
        if (validLocales.length > 0) {
          normalized.locales = validLocales;
          this.logger.log(`Locales mapped: ${JSON.stringify(validLocales)}`);
        } else {
          this.logger.log(`No valid locales found, skipping locale targeting`);
        }
      }
    }

    // Copy any other fields that are already in snake_case format
    const snakeCaseFields = [
      "flexible_spec",
      "exclusions",
      "publisher_platforms",
      "facebook_positions",
      "instagram_positions",
    ];
    for (const field of snakeCaseFields) {
      if (rawTargeting[field] !== undefined) {
        normalized[field] = rawTargeting[field];
      }
    }

    return normalized;
  }

  /**
   * Create an Ad Set in Meta Ads API
   * For MESSAGES campaigns, requires destination_type and promoted_object
   */
  private async createMetaAdSet(
    accessToken: string,
    adAccountId: string,
    campaignId: string,
    data: {
      name: string;
      dailyBudget: number;
      targeting: Record<string, unknown>;
      optimizationGoal: string;
      billingEvent: string;
      status: string;
      // Bid strategy and amount
      bidStrategy?: string;
      bidAmount?: number;
      // For MESSAGES campaigns
      destinationType?: string;
      promotedObject?: Record<string, unknown>;
    },
  ): Promise<{ id: string }> {
    const cleanAccountId = adAccountId.replace(/^act_/, "");
    const url = `${this.META_API_URL}/act_${cleanAccountId}/adsets`;

    this.logger.debug(`Creating Ad Set at URL: ${url}`);

    // Determine bid strategy (default to lowest cost without cap)
    const bidStrategy = data.bidStrategy || "LOWEST_COST_WITHOUT_CAP";

    const params = new URLSearchParams({
      access_token: accessToken,
      name: data.name,
      campaign_id: campaignId,
      daily_budget: String(data.dailyBudget),
      targeting: JSON.stringify(data.targeting),
      optimization_goal: data.optimizationGoal,
      billing_event: data.billingEvent,
      status: data.status,
      bid_strategy: bidStrategy,
    });

    // Add bid_amount for COST_CAP and BID_CAP strategies
    // Meta API requires bid_amount in cents for these strategies
    if (data.bidAmount && data.bidAmount > 0) {
      if (
        bidStrategy === "COST_CAP" ||
        bidStrategy === "LOWEST_COST_WITH_BID_CAP"
      ) {
        params.append("bid_amount", String(data.bidAmount));
        this.logger.log(
          `Ad Set bid_amount: ${data.bidAmount} cents (R$${(data.bidAmount / 100).toFixed(2)})`,
        );
      } else if (bidStrategy === "LOWEST_COST_WITH_MIN_ROAS") {
        // For ROAS strategy, use roas_average_floor (integer, e.g., 200 = 2.00x)
        params.append("roas_average_floor", String(data.bidAmount));
        this.logger.log(
          `Ad Set roas_average_floor: ${data.bidAmount} (${(data.bidAmount / 100).toFixed(2)}x ROAS)`,
        );
      }
    }

    // Add destination_type (for ALL campaign types, not just MESSAGES)
    if (data.destinationType) {
      params.append("destination_type", data.destinationType);
      this.logger.debug(`Ad Set destination_type: ${data.destinationType}`);
    }

    // Add promoted_object (pixel events, page_id for messaging, etc.)
    if (data.promotedObject) {
      params.append("promoted_object", JSON.stringify(data.promotedObject));
      this.logger.debug(
        `Ad Set promoted_object: ${JSON.stringify(data.promotedObject)}`,
      );
    }

    const response = await fetch(url, {
      method: "POST",
      body: params,
    });

    if (!response.ok) {
      const errorData = await response.json();
      this.logger.error(
        `Meta API error (Ad Set): ${JSON.stringify(errorData)}`,
      );
      throw new Error(
        this.extractMetaErrorMessage(
          errorData,
          "Falha ao criar conjunto de anúncios",
        ),
      );
    }

    return response.json();
  }

  /**
   * Upload image to Meta Ads and get image hash
   */
  private async uploadImageToMeta(
    accessToken: string,
    adAccountId: string,
    imageUrl: string,
  ): Promise<string> {
    const cleanAccountId = adAccountId.replace(/^act_/, "");
    const url = `${this.META_API_URL}/act_${cleanAccountId}/adimages`;

    this.logger.debug(`Uploading image from URL: ${imageUrl}`);

    // Download image and convert to base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image from ${imageUrl}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");

    const params = new URLSearchParams({
      access_token: accessToken,
      bytes: base64Image,
    });

    const response = await fetch(url, {
      method: "POST",
      body: params,
    });

    if (!response.ok) {
      const errorData = await response.json();
      this.logger.error(
        `Meta API error (Image Upload): ${JSON.stringify(errorData)}`,
      );
      throw new Error(
        this.extractMetaErrorMessage(
          errorData,
          "Falha ao fazer upload da imagem",
        ),
      );
    }

    const result = await response.json();
    // Response format: { images: { filename: { hash: "...", ... } } }
    const images = result.images;
    const firstImageKey = Object.keys(images)[0];
    return images[firstImageKey].hash;
  }

  /**
   * Create an Ad Creative in Meta Ads API
   */
  private async createMetaAdCreative(
    accessToken: string,
    adAccountId: string,
    data: {
      name: string;
      pageId: string;
      imageHash: string;
      primaryText: string;
      headline: string;
      description: string;
      linkUrl: string;
      callToAction: string;
      displayUrl?: string;
      urlTags?: string;
    },
  ): Promise<{ id: string }> {
    const cleanAccountId = adAccountId.replace(/^act_/, "");
    const url = `${this.META_API_URL}/act_${cleanAccountId}/adcreatives`;

    this.logger.debug(`Creating Ad Creative at URL: ${url}`);
    this.logger.debug(`Link URL: ${data.linkUrl}`);
    this.logger.debug(`URL Tags: ${data.urlTags}`);

    // Map call to action to Meta format
    const ctaMapping: Record<string, string> = {
      LEARN_MORE: "LEARN_MORE",
      SHOP_NOW: "SHOP_NOW",
      SIGN_UP: "SIGN_UP",
      CONTACT_US: "CONTACT_US",
      BOOK_NOW: "BOOK_NOW",
      DOWNLOAD: "DOWNLOAD",
      GET_QUOTE: "GET_QUOTE",
      APPLY_NOW: "APPLY_NOW",
      SUBSCRIBE: "SUBSCRIBE",
      GET_OFFER: "GET_OFFER",
      WHATSAPP_MESSAGE: "WHATSAPP_MESSAGE",
    };
    const callToAction = ctaMapping[data.callToAction] || "LEARN_MORE";

    // Build link_data with optional caption (display URL)
    const linkData: Record<string, unknown> = {
      image_hash: data.imageHash,
      link: data.linkUrl,
      message: data.primaryText,
      name: data.headline,
      description: data.description,
      call_to_action: {
        type: callToAction,
        value: {
          link: data.linkUrl,
        },
      },
    };

    // Add caption (display URL) if provided
    if (data.displayUrl) {
      linkData.caption = data.displayUrl;
    }

    const objectStorySpec = {
      page_id: data.pageId,
      link_data: linkData,
    };

    const params = new URLSearchParams({
      access_token: accessToken,
      name: data.name,
      object_story_spec: JSON.stringify(objectStorySpec),
    });

    // Add url_tags for UTM tracking (this is the proper way to add UTM params in Meta API)
    // This is MANDATORY for proper tracking - follows UTM-FY pattern
    if (data.urlTags) {
      params.append("url_tags", data.urlTags);
      this.logger.log(
        `[UTM] url_tags set: ${data.urlTags.substring(0, 100)}...`,
      );
    } else {
      this.logger.warn(
        `[UTM] WARNING: No url_tags provided for creative ${data.name}`,
      );
    }

    const response = await fetch(url, {
      method: "POST",
      body: params,
    });

    if (!response.ok) {
      const errorData = await response.json();
      this.logger.error(
        `Meta API error (Ad Creative): ${JSON.stringify(errorData)}`,
      );
      throw new Error(
        this.extractMetaErrorMessage(
          errorData,
          "Falha ao criar criativo do anúncio",
        ),
      );
    }

    return response.json();
  }

  /**
   * Create an Ad Creative for Click-to-Message campaigns (MESSAGES objective)
   *
   * IMPORTANT: For OUTCOME_ENGAGEMENT with destination_type set to messaging platforms,
   * the creative must NOT include a 'link' field in link_data. The call_to_action
   * must be configured for messaging (SEND_MESSAGE, WHATSAPP_MESSAGE, etc.)
   *
   * Reference: Meta Marketing API - Ad Creative for Click-to-Message
   */
  private async createMetaMessageCreative(
    accessToken: string,
    adAccountId: string,
    data: {
      name: string;
      pageId: string;
      imageHash: string;
      primaryText: string;
      headline: string;
      description: string;
      callToAction: string;
      messageDestination: "MESSENGER" | "WHATSAPP" | "INSTAGRAM_DIRECT";
      greetingMessage?: string;
      whatsappNumber?: string;
      greetingConfig?: {
        greeting: string;
        iceBreakers: Array<{ title: string; response: string }>;
      };
    },
  ): Promise<{ id: string }> {
    const cleanAccountId = adAccountId.replace(/^act_/, "");
    const url = `${this.META_API_URL}/act_${cleanAccountId}/adcreatives`;

    this.logger.debug(`Creating Message Ad Creative at URL: ${url}`);
    this.logger.debug(`Message destination: ${data.messageDestination}`);

    // Map call to action based on destination
    // These are the valid CTA types for click-to-message ads
    let callToActionType: string;
    switch (data.messageDestination) {
      case "WHATSAPP":
        callToActionType = "WHATSAPP_MESSAGE";
        break;
      case "INSTAGRAM_DIRECT":
        callToActionType = "INSTAGRAM_MESSAGE";
        break;
      case "MESSENGER":
      default:
        callToActionType = "MESSAGE_PAGE"; // Use MESSAGE_PAGE for Messenger
        break;
    }

    // Build the call_to_action value based on destination
    // For click-to-message, we need specific fields depending on destination
    const ctaValue: Record<string, unknown> = {};

    if (data.messageDestination === "WHATSAPP") {
      if (data.whatsappNumber) {
        // For WhatsApp, we need the phone number in E.164 format
        ctaValue.whatsapp_number = data.whatsappNumber.replace(/\D/g, "");
      }
    }

    // For click-to-message ads, we still need the 'link' field pointing to the Facebook page
    // Meta requires this field even for message ads
    const facebookPageUrl = `https://www.facebook.com/${data.pageId}`;

    const linkData: Record<string, unknown> = {
      image_hash: data.imageHash,
      link: facebookPageUrl, // Required by Meta API even for message ads
      message: data.primaryText,
      name: data.headline,
      description: data.description,
      call_to_action: {
        type: callToActionType,
        value:
          Object.keys(ctaValue).length > 0
            ? ctaValue
            : { app_destination: "MESSENGER" },
      },
    };

    // Build page_welcome_message with ice_breakers for Messenger ads
    // Priority: 1) greetingConfig from frontend wizard, 2) AI generation as fallback
    if (data.messageDestination === "MESSENGER") {
      try {
        let greetingText: string;
        let iceBreakers: Array<{ title: string; response: string }>;

        if (
          data.greetingConfig &&
          data.greetingConfig.greeting &&
          data.greetingConfig.iceBreakers?.length > 0
        ) {
          // Use pre-configured greeting from wizard (user typed or AI generated in frontend)
          greetingText = data.greetingConfig.greeting;
          iceBreakers = data.greetingConfig.iceBreakers;
          this.logger.log(
            `[MESSAGE CREATIVE] Using pre-configured greeting with ${iceBreakers.length} ice breakers`,
          );
        } else {
          // Fallback: generate via AI based on ad copy
          const aiResult = await this.aiCreativeService.generateIceBreakers(
            data.primaryText,
            data.headline,
            data.description,
          );
          greetingText = data.greetingMessage || aiResult.greeting;
          iceBreakers = aiResult.iceBreakers;
          this.logger.log(
            `[MESSAGE CREATIVE] AI-generated greeting with ${iceBreakers.length} ice breakers`,
          );
        }

        const pageWelcomeMessage = {
          type: "VISUAL_EDITOR",
          version: 2,
          landing_screen_type: "welcome_message",
          media_type: "text",
          text_format: {
            customer_action_type: "ice_breakers",
            message: {
              ice_breakers: iceBreakers,
              quick_replies: [],
              text: greetingText,
            },
          },
          user_edit: false,
          surface: "visual_editor_new",
        };

        linkData.page_welcome_message = JSON.stringify(pageWelcomeMessage);

        this.logger.log(
          `[MESSAGE CREATIVE] page_welcome_message set with ${iceBreakers.length} ice breakers`,
        );
      } catch (error) {
        this.logger.warn(
          `[MESSAGE CREATIVE] Failed to build page_welcome_message: ${error.message}. Proceeding without it.`,
        );
      }
    }

    this.logger.log(
      `[MESSAGE CREATIVE] Using Facebook page URL as link: ${facebookPageUrl}`,
    );

    const objectStorySpec = {
      page_id: data.pageId,
      link_data: linkData,
    };

    const params = new URLSearchParams({
      access_token: accessToken,
      name: data.name,
      object_story_spec: JSON.stringify(objectStorySpec),
    });

    this.logger.log(`Message Creative - CTA type: ${callToActionType}`);
    this.logger.debug(
      `Message Creative object_story_spec: ${JSON.stringify(objectStorySpec, null, 2)}`,
    );

    const response = await fetch(url, {
      method: "POST",
      body: params,
    });

    if (!response.ok) {
      const errorData = await response.json();
      this.logger.error(
        `Meta API error (Message Ad Creative): ${JSON.stringify(errorData)}`,
      );
      throw new Error(
        this.extractMetaErrorMessage(
          errorData,
          "Falha ao criar criativo de mensagem",
        ),
      );
    }

    return response.json();
  }

  /**
   * Create an Ad in Meta Ads API
   *
   * Note: url_tags are set at the AdCreative level, NOT at Ad level.
   * The Ad object doesn't have a url_tags field - it belongs to AdCreative.
   */
  private async createMetaAd(
    accessToken: string,
    adAccountId: string,
    adSetId: string,
    creativeId: string,
    data: {
      name: string;
      status: string;
    },
  ): Promise<{ id: string }> {
    const cleanAccountId = adAccountId.replace(/^act_/, "");
    const url = `${this.META_API_URL}/act_${cleanAccountId}/ads`;

    this.logger.debug(`Creating Ad at URL: ${url}`);

    const params = new URLSearchParams({
      access_token: accessToken,
      name: data.name,
      adset_id: adSetId,
      creative: JSON.stringify({ creative_id: creativeId }),
      status: data.status,
    });

    const response = await fetch(url, {
      method: "POST",
      body: params,
    });

    const result = await response.json();
    this.logger.debug(`Meta Ad response: ${JSON.stringify(result)}`);

    // Check for error in response (Meta sometimes returns 200 with error in body)
    if (result.error) {
      this.logger.error(`Meta API error (Ad): ${JSON.stringify(result)}`);
      throw new Error(
        this.extractMetaErrorMessage(result, "Falha ao criar anúncio"),
      );
    }

    if (!response.ok) {
      this.logger.error(`Meta API error (Ad): ${JSON.stringify(result)}`);
      throw new Error(
        this.extractMetaErrorMessage(result, "Falha ao criar anúncio"),
      );
    }

    return result;
  }

  // ============================================
  // Meta Page & Instagram Methods
  // ============================================

  /**
   * Get Instagram Business Account linked to a Facebook Page
   */
  async getInstagramAccount(
    pageId: string,
    userId: string,
  ): Promise<{
    id: string;
    username: string;
    name: string;
    profilePictureUrl?: string;
    followersCount?: number;
  } | null> {
    // Get the page from meta_pages table with access token
    // First try: direct ownership
    let pageData: { access_token: string; connection_id: string } | null = null;

    const { data: directPage, error: directError } = await this.supabase
      .from("meta_pages")
      .select("access_token, connection_id")
      .eq("page_id", pageId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (!directError && directPage) {
      pageData = directPage;
    } else {
      // Second try: workspace membership
      const { data: wsPage } = await this.supabase
        .from("meta_pages")
        .select("access_token, connection_id, workspace_id")
        .eq("page_id", pageId)
        .eq("is_active", true)
        .not("workspace_id", "is", null)
        .single();

      if (wsPage?.workspace_id) {
        const { data: membership } = await this.supabase
          .from("workspace_members")
          .select("id")
          .eq("workspace_id", wsPage.workspace_id)
          .eq("user_id", userId)
          .eq("status", "active")
          .single();

        if (membership) {
          pageData = {
            access_token: wsPage.access_token,
            connection_id: wsPage.connection_id,
          };
        }
      }
    }

    if (!pageData) {
      this.logger.warn(`Page ${pageId} not found for user ${userId}`);
      return null;
    }

    try {
      // Fetch Instagram Business Account linked to the page
      const url = `${this.META_API_URL}/${pageId}?fields=instagram_business_account{id,username,name,profile_picture_url,followers_count}&access_token=${pageData.access_token}`;

      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        this.logger.warn(
          `Failed to fetch Instagram account for page ${pageId}:`,
          errorData,
        );
        return null;
      }

      const data = await response.json();

      if (!data.instagram_business_account) {
        return null;
      }

      const ig = data.instagram_business_account;
      return {
        id: ig.id,
        username: ig.username,
        name: ig.name || ig.username,
        profilePictureUrl: ig.profile_picture_url,
        followersCount: ig.followers_count,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching Instagram account for page ${pageId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Get Meta Pixels for an Ad Account
   *
   * @param adAccountId - The Meta ad account ID (with or without 'act_' prefix)
   * @param userId - The user ID making the request
   * @param connectionId - Optional specific connection ID to use
   */
  async getPixels(
    adAccountId: string,
    userId: string,
    connectionId?: string,
  ): Promise<
    {
      id: string;
      name: string;
      isUnavailable?: boolean;
    }[]
  > {
    // Get connection - either by specific ID or find first active Meta connection
    let query = this.supabase
      .from("connections")
      .select("access_token")
      .eq("plataform_name", "meta")
      .eq("is_active", true)
      .is("deleted_at", null);

    if (connectionId) {
      // Use specific connection
      query = query.eq("id", connectionId);
    } else {
      // Fallback to user's first active Meta connection (for backwards compatibility)
      query = query.eq("user_id", userId).limit(1);
    }

    const { data: connections, error: connError } = await query;

    if (connError || !connections || connections.length === 0) {
      this.logger.warn(
        `No Meta connection found for user ${userId}${connectionId ? ` (connectionId: ${connectionId})` : ""}`,
      );
      return [];
    }

    const connection = connections[0];

    try {
      // Clean ad account ID (remove 'act_' prefix if present)
      const cleanAccountId = adAccountId.replace("act_", "");

      const url = `${this.META_API_URL}/act_${cleanAccountId}/adspixels?fields=id,name,is_unavailable&access_token=${connection.access_token}`;

      this.logger.log(`Fetching pixels from: act_${cleanAccountId}/adspixels`);

      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        this.logger.warn(
          `Failed to fetch pixels for ad account ${adAccountId}: ${JSON.stringify(errorData)}`,
        );
        return [];
      }

      const data = await response.json();
      this.logger.log(
        `Meta API returned ${data.data?.length || 0} pixels for ad account ${adAccountId}`,
      );

      return (data.data || []).map((pixel: any) => ({
        id: pixel.id,
        name: pixel.name,
        isUnavailable: pixel.is_unavailable,
      }));
    } catch (error) {
      this.logger.error(
        `Error fetching pixels for ad account ${adAccountId}:`,
        error,
      );
      return [];
    }
  }
}
