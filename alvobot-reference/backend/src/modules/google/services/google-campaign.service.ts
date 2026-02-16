import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { GoogleCreditsService } from "./google-credits.service";
import { GoogleAiService } from "./google-ai.service";
import { GoogleAdsApiService } from "./google-ads-api.service";
import {
  SaveGoogleTemplateDto,
  PublishGoogleCampaignDto,
  GenerateKeywordsDto,
  GenerateGoogleAdCopyDto,
} from "../dto";
import {
  GoogleConnection,
  isGoogleConnection,
} from "../entities/google-connection.entity";

export interface CampaignTemplate {
  id: string;
  user_id: string;
  workspace_id?: string;
  connection_id?: string;
  platform: "google_ads" | "meta_ads";
  name: string;
  status: "draft" | "ready" | "publishing" | "published" | "failed" | "paused";
  bulk_operation_id?: string;
  source_article_id?: number;
  source_template_id?: string;
  campaign_data: Record<string, unknown>;
  ad_groups_data: Record<string, unknown>[];
  extensions_data: Record<string, unknown>;
  platform_ids: Record<string, unknown>;
  publish_attempts: number;
  last_error?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

// Tabela unificada para Google e Meta
const AD_TEMPLATES_TABLE = "ad_campaign_templates";

@Injectable()
export class GoogleCampaignService {
  private readonly logger = new Logger(GoogleCampaignService.name);
  private supabase: SupabaseClient;

  constructor(
    private configService: ConfigService,
    private readonly creditsService: GoogleCreditsService,
    private readonly aiService: GoogleAiService,
    private readonly googleAdsApiService: GoogleAdsApiService,
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
   * Get all campaign templates for a user/workspace
   */
  async getTemplates(
    userId: string,
    filters?: { status?: string; network?: string; workspaceId?: string },
  ): Promise<CampaignTemplate[]> {
    const client = this.supabase;

    let query = client
      .from(AD_TEMPLATES_TABLE)
      .select("*")
      .eq("platform", "google_ads")
      .order("updated_at", { ascending: false });

    // Filter by workspace if provided, otherwise by user_id
    if (filters?.workspaceId) {
      query = query.eq("workspace_id", filters.workspaceId);
    } else {
      query = query.eq("user_id", userId);
    }

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to get templates: ${error.message}`);
      throw error;
    }

    return data || [];
  }

  /**
   * Get a single campaign template by ID
   * Checks user_id first, then falls back to workspace membership
   */
  async getTemplate(
    userId: string,
    templateId: string,
  ): Promise<CampaignTemplate> {
    const client = this.supabase;

    // First try: direct ownership
    const { data, error } = await client
      .from(AD_TEMPLATES_TABLE)
      .select("*")
      .eq("id", templateId)
      .eq("user_id", userId)
      .eq("platform", "google_ads")
      .single();

    if (!error && data) {
      return data;
    }

    // Second try: workspace membership
    const { data: wsData, error: wsError } = await client
      .from(AD_TEMPLATES_TABLE)
      .select("*")
      .eq("id", templateId)
      .eq("platform", "google_ads")
      .not("workspace_id", "is", null)
      .single();

    if (wsError || !wsData) {
      throw new NotFoundException("Template not found");
    }

    // Verify the user is a member of this workspace
    const { data: membership } = await client
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", wsData.workspace_id)
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (!membership) {
      throw new NotFoundException("Template not found");
    }

    return wsData;
  }

  /**
   * Save or update a campaign template
   */
  async saveTemplate(
    userId: string,
    dto: SaveGoogleTemplateDto,
    workspaceId?: string,
  ): Promise<{ success: boolean; template: CampaignTemplate }> {
    const client = this.supabase;

    const templateData = {
      user_id: userId,
      workspace_id: workspaceId || null,
      platform: "google_ads" as const,
      name: dto.templateName,
      status: "draft" as const,
      connection_id: dto.account?.connectionId || null,
      source_article_id: dto.source_article_id || null,
      campaign_data: {
        ...dto.campaign,
        account: dto.account, // Incluir dados da conta no campaign_data
      },
      ad_groups_data: dto.adGroups,
      extensions_data: dto.extensions,
      updated_at: new Date().toISOString(),
    };

    let result;

    if (dto.id) {
      // Validate access first (throws NotFoundException if not found/unauthorized)
      await this.getTemplate(userId, dto.id);

      // Update existing template - don't change workspace_id on update
      const { workspace_id: _workspaceId, ...updateData } = templateData;
      void _workspaceId;
      const { data, error } = await client
        .from(AD_TEMPLATES_TABLE)
        .update(updateData)
        .eq("id", dto.id)
        .eq("platform", "google_ads")
        .select()
        .single();

      if (error) {
        this.logger.error(`Failed to update template: ${error.message}`);
        throw error;
      }
      result = data;
    } else {
      // Create new template
      const { data, error } = await client
        .from(AD_TEMPLATES_TABLE)
        .insert({
          ...templateData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        this.logger.error(`Failed to create template: ${error.message}`);
        throw error;
      }
      result = data;
    }

    return { success: true, template: result };
  }

  /**
   * Publish a campaign to Google Ads
   */
  async publishCampaign(
    userId: string,
    dto: PublishGoogleCampaignDto,
  ): Promise<{
    success: boolean;
    campaignId?: string;
    adGroupIds?: string[];
    errors?: string[];
    warnings?: string[];
    partialSuccess?: boolean;
  }> {
    // Get the template
    const template = await this.getTemplate(userId, dto.templateId);

    // Calculate and consume credits
    const adGroupCount = template.ad_groups_data?.length || 1;
    const hasExtensions =
      (template.extensions_data as any)?.sitelinks?.length > 0 ||
      (template.extensions_data as any)?.callouts?.length > 0;

    const totalCredits = this.creditsService.calculateCampaignCredits(
      adGroupCount,
      hasExtensions,
    );

    // Check credits (use workspace if template has one)
    const hasCredits = await this.creditsService.hasEnoughCredits(
      userId,
      "CAMPAIGN_PUBLISH",
      template.workspace_id,
    );
    if (!hasCredits) {
      return {
        success: false,
        errors: [`Insufficient credits. Required: ${totalCredits}`],
      };
    }

    // Validate campaign
    const validationErrors = this.validateCampaign(template);
    if (validationErrors.length > 0) {
      return { success: false, errors: validationErrors };
    }

    if (dto.dryRun) {
      // Validate only, don't publish
      return { success: true };
    }

    this.logger.log(`Publishing campaign for template ${dto.templateId}`);

    // Get the Google Ads connection
    const connection = await this.getGoogleConnection(template);
    if (!connection) {
      return {
        success: false,
        errors: [
          "No Google Ads account connected. Please connect your Google Ads account first.",
        ],
      };
    }

    // Update template status to publishing
    const client = this.supabase;
    await client
      .from(AD_TEMPLATES_TABLE)
      .update({
        status: "publishing",
        publish_attempts: (template.publish_attempts || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dto.templateId);

    try {
      // Extract campaign data
      const campaignData = template.campaign_data as any;

      // Get the customer ID from the template's account data
      // This is set when the user selects a Google Ads account in the wizard
      const customerId = campaignData?.account?.customerId;
      const isManager = campaignData?.account?.isManager;
      const loginCustomerId = campaignData?.account?.loginCustomerId;

      if (!customerId) {
        throw new Error(
          "No Google Ads account selected. Please select a Google Ads account in the campaign wizard.",
        );
      }

      // Check if the selected account is a Manager account (MCC)
      // Campaigns cannot be created in MCC accounts - only in client accounts
      if (isManager) {
        throw new Error(
          "Não é possível criar campanhas em uma conta Gerenciadora (MCC). " +
            "Por favor, selecione uma conta cliente individual. " +
            "Contas MCC são usadas para gerenciar múltiplas contas, mas campanhas devem ser criadas em contas individuais.",
        );
      }

      this.logger.log(
        `Using Google Ads customer ID: ${customerId} (isManager: ${isManager}, loginCustomerId: ${loginCustomerId || "not set"})`,
      );

      // Use campaign name from campaignData, fall back to template name
      let campaignName = campaignData.name || template.name;

      // Replace template variables in campaign name
      campaignName = campaignName.replace(
        "{{current_date}}",
        new Date().toLocaleDateString("pt-BR"),
      );

      this.logger.log(
        `Campaign name from data: "${campaignName}" (original: ${campaignData.name})`,
      );

      // 1. Create Campaign in Google Ads (with retry for duplicate names)
      let campaignResult = await this.googleAdsApiService.createCampaign(
        connection,
        {
          name: campaignName,
          budget: campaignData.budget || 50,
          budgetType: campaignData.budgetType || "daily",
          biddingStrategy: campaignData.biddingStrategy,
          targetCpa: campaignData.targetCpa,
          targetRoas: campaignData.targetRoas,
          maxCpc: campaignData.maxCpc,
          locations: campaignData.locations,
          languages: campaignData.languages,
          startDate: campaignData.startDate,
          endDate: campaignData.endDate,
          templateId: dto.templateId, // Pass template ID for xcod tracking
          status: campaignData.status, // Campaign status: ENABLED or PAUSED (default: ENABLED)
        },
        false, // Not a dry run
        customerId, // Pass the customer ID from the template
        loginCustomerId, // Pass the MCC ID if this account is managed by an MCC
      );

      // Handle duplicate campaign name error - retry with timestamp suffix
      if (
        !campaignResult.success &&
        campaignResult.error?.includes("DUPLICATE_CAMPAIGN_NAME")
      ) {
        const timestamp = new Date()
          .toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
          .replace(/[/,:]/g, "-")
          .replace(/\s/g, "_");
        campaignName = `${campaignName} (${timestamp})`;
        this.logger.log(
          `Retrying with unique campaign name: "${campaignName}"`,
        );

        campaignResult = await this.googleAdsApiService.createCampaign(
          connection,
          {
            name: campaignName,
            budget: campaignData.budget || 50,
            budgetType: campaignData.budgetType || "daily",
            biddingStrategy: campaignData.biddingStrategy,
            targetCpa: campaignData.targetCpa,
            targetRoas: campaignData.targetRoas,
            maxCpc: campaignData.maxCpc,
            locations: campaignData.locations,
            languages: campaignData.languages,
            startDate: campaignData.startDate,
            endDate: campaignData.endDate,
            templateId: dto.templateId, // Pass template ID for xcod tracking
            status: campaignData.status, // Campaign status: ENABLED or PAUSED (default: ENABLED)
          },
          false,
          customerId,
          loginCustomerId,
        );
      }

      if (!campaignResult.success || !campaignResult.campaignId) {
        throw new Error(campaignResult.error || "Failed to create campaign");
      }

      this.logger.log(
        `Created Google Ads campaign: ${campaignResult.campaignId}`,
      );

      // 2. Create Ad Groups with Keywords and Ads
      const adGroupIds: string[] = [];
      const warnings: string[] = [];
      for (const adGroupData of template.ad_groups_data) {
        const adGroup = adGroupData as any;

        const adGroupResult = await this.googleAdsApiService.createAdGroup(
          connection,
          {
            campaignId: campaignResult.campaignId,
            name: adGroup.name || `Ad Group ${adGroupIds.length + 1}`,
            keywords: (adGroup.keywords || []).map((kw: any) => ({
              text: kw.text,
              matchType: kw.matchType || "BROAD",
            })),
            ads: (adGroup.ads || []).map((ad: any) => ({
              headlines: ad.headlines || [],
              descriptions: ad.descriptions || [],
              finalUrl: ad.finalUrl,
              path1: ad.path1,
              path2: ad.path2,
            })),
          },
          false,
          customerId, // Pass the customer ID from the template
          loginCustomerId, // Pass the MCC ID if this account is managed by an MCC
        );

        if (adGroupResult.success && adGroupResult.adGroupId) {
          adGroupIds.push(adGroupResult.adGroupId);
          this.logger.log(
            `Created Google Ads ad group: ${adGroupResult.adGroupId}`,
          );

          // Track ad creation warnings
          if (adGroupResult.warning) {
            warnings.push(adGroupResult.warning);
          }
        } else {
          this.logger.warn(`Failed to create ad group: ${adGroupResult.error}`);
          warnings.push(
            `Falha ao criar grupo de anúncios: ${adGroupResult.error}`,
          );
        }
      }

      // 3. Create Extensions (sitelinks, callouts, structured snippets)
      const extensionsData = template.extensions_data as any;
      if (extensionsData) {
        const hasExtensions =
          extensionsData.sitelinks?.length > 0 ||
          extensionsData.callouts?.length > 0 ||
          extensionsData.structuredSnippets?.length > 0;

        if (hasExtensions) {
          this.logger.log("Creating campaign extensions...");
          this.logger.log(
            `Extensions data from template: ${JSON.stringify(extensionsData)}`,
          );

          // Get article URL from template or ad groups for fallback
          const articleUrl =
            (template.campaign_data as any)?.articleUrl ||
            (template.ad_groups_data?.[0] as any)?.ads?.[0]?.finalUrl ||
            null;

          this.logger.log(`Article URL for extensions fallback: ${articleUrl}`);

          // Format extensions for the API
          const extensionsInput = {
            sitelinks: extensionsData.sitelinks?.map((s: any) => ({
              text: s.text,
              // Use sitelink's finalUrl, or fall back to article URL
              finalUrl: s.finalUrl || articleUrl || "",
              description1: s.description1,
              description2: s.description2,
            })),
            callouts: extensionsData.callouts?.map((c: any) => ({
              text: c.text,
            })),
            structuredSnippets: extensionsData.structuredSnippets?.map(
              (s: any) => ({
                header: s.header,
                values: s.values,
              }),
            ),
          };

          this.logger.log(
            `Formatted extensions input: ${JSON.stringify(extensionsInput)}`,
          );

          const extensionsResult =
            await this.googleAdsApiService.createCampaignExtensions(
              connection,
              campaignResult.campaignId,
              extensionsInput,
              false,
              customerId,
              loginCustomerId,
            );

          if (!extensionsResult.success && extensionsResult.errors) {
            extensionsResult.errors.forEach((err) => {
              warnings.push(`Extensões: ${err}`);
            });
          } else {
            this.logger.log("Campaign extensions created successfully");
          }
        }
      }

      // Determine final status based on results
      const hasWarnings = warnings.length > 0;

      // Consume credits after successful publication (at least campaign was created)
      await this.creditsService.consumeCredits(userId, "CAMPAIGN_PUBLISH", {
        resourceType: "google_campaign",
        resourceId: dto.templateId,
        description: template.name,
        workspaceId: template.workspace_id,
      });

      // Update template status based on results
      // Note: valid statuses are: draft, ready, publishing, published, failed, paused
      const finalStatus = "published"; // Warnings are stored in last_error field
      const platformIds = {
        campaignId: campaignResult.campaignId,
        adGroupIds,
        customerId, // Store for direct link to Google Ads
        loginCustomerId, // Store MCC ID if applicable
      };

      this.logger.log(
        `Updating template ${dto.templateId} with status: ${finalStatus}, platform_ids: ${JSON.stringify(platformIds)}`,
      );

      const { error: updateError } = await client
        .from(AD_TEMPLATES_TABLE)
        .update({
          status: finalStatus,
          platform_ids: platformIds,
          last_error: hasWarnings ? warnings.join("; ") : null,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", dto.templateId);

      if (updateError) {
        this.logger.error(
          `Failed to update template status: ${updateError.message}`,
        );
        // Campaign was created but status update failed - still return success
        // but log the error for debugging
      } else {
        this.logger.log(
          `Template ${dto.templateId} status updated to ${finalStatus}`,
        );
      }

      return {
        success: true,
        campaignId: campaignResult.campaignId,
        adGroupIds,
        warnings: hasWarnings ? warnings : undefined,
        partialSuccess: hasWarnings,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to publish campaign: ${error.message}`,
        error.stack,
      );

      // Update template status to failed
      await client
        .from(AD_TEMPLATES_TABLE)
        .update({
          status: "failed",
          last_error: error.message || "Unknown error during publication",
          updated_at: new Date().toISOString(),
        })
        .eq("id", dto.templateId);

      return {
        success: false,
        errors: [error.message || "Failed to publish campaign to Google Ads"],
      };
    }
  }

  /**
   * Get Google Ads connection for a template
   */
  private async getGoogleConnection(
    template: CampaignTemplate,
  ): Promise<GoogleConnection | null> {
    // First try to get connection from template
    let connectionId = template.connection_id;

    // If not in template, try to get from campaign_data.account
    if (!connectionId) {
      const campaignData = template.campaign_data as any;
      connectionId = campaignData?.account?.connectionId;
    }

    if (!connectionId) {
      this.logger.warn(`No connection ID found for template ${template.id}`);
      return null;
    }

    const { data: connection, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .eq("plataform_name", "google")
      .eq("is_active", true)
      .single();

    if (error || !connection || !isGoogleConnection(connection)) {
      this.logger.warn(
        `Failed to get Google connection: ${error?.message || "Not found"}`,
      );
      return null;
    }

    return connection as GoogleConnection;
  }

  /**
   * Pause a published campaign
   */
  async pauseCampaign(
    userId: string,
    templateId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const template = await this.getTemplate(userId, templateId);

    if (template.status !== "published") {
      return { success: false, error: "Campaign is not published" };
    }

    // Get the Google Ads campaign ID from platform_ids
    const platformIds = template.platform_ids as { campaignId?: string };
    if (!platformIds?.campaignId) {
      return { success: false, error: "No Google Ads campaign ID found" };
    }

    // Get the Google connection
    const connection = await this.getGoogleConnection(template);
    if (!connection) {
      return { success: false, error: "Google Ads connection not found" };
    }

    // Get customer ID from template
    const campaignData = template.campaign_data as any;
    const customerId = campaignData?.account?.customerId;

    // Call Google Ads API to pause the campaign
    const result = await this.googleAdsApiService.updateCampaignStatus(
      connection,
      platformIds.campaignId,
      "PAUSED",
      customerId,
    );

    if (!result.success) {
      this.logger.error(
        `Failed to pause campaign in Google Ads: ${result.error}`,
      );
      return { success: false, error: result.error };
    }

    // Update local status
    const client = this.supabase;
    await client
      .from(AD_TEMPLATES_TABLE)
      .update({
        status: "paused",
        updated_at: new Date().toISOString(),
      })
      .eq("id", templateId);

    this.logger.log(`Campaign ${templateId} paused successfully`);
    return { success: true };
  }

  /**
   * Resume a paused campaign
   */
  async resumeCampaign(
    userId: string,
    templateId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const template = await this.getTemplate(userId, templateId);

    if (template.status !== "paused") {
      return { success: false, error: "Campaign is not paused" };
    }

    // Get the Google Ads campaign ID from platform_ids
    const platformIds = template.platform_ids as { campaignId?: string };
    if (!platformIds?.campaignId) {
      return { success: false, error: "No Google Ads campaign ID found" };
    }

    // Get the Google connection
    const connection = await this.getGoogleConnection(template);
    if (!connection) {
      return { success: false, error: "Google Ads connection not found" };
    }

    // Get customer ID from template
    const campaignData = template.campaign_data as any;
    const customerId = campaignData?.account?.customerId;

    // Call Google Ads API to enable (resume) the campaign
    const result = await this.googleAdsApiService.updateCampaignStatus(
      connection,
      platformIds.campaignId,
      "ENABLED",
      customerId,
    );

    if (!result.success) {
      this.logger.error(
        `Failed to resume campaign in Google Ads: ${result.error}`,
      );
      return { success: false, error: result.error };
    }

    // Update local status
    const client = this.supabase;
    await client
      .from(AD_TEMPLATES_TABLE)
      .update({
        status: "published",
        updated_at: new Date().toISOString(),
      })
      .eq("id", templateId);

    this.logger.log(`Campaign ${templateId} resumed successfully`);
    return { success: true };
  }

  /**
   * Delete a campaign template
   * Uses getTemplate to validate access (supports workspace membership)
   */
  async deleteTemplate(
    userId: string,
    templateId: string,
  ): Promise<{ success: boolean }> {
    // Validate access first (throws NotFoundException if not found/unauthorized)
    await this.getTemplate(userId, templateId);

    const client = this.supabase;

    const { error } = await client
      .from(AD_TEMPLATES_TABLE)
      .delete()
      .eq("id", templateId)
      .eq("platform", "google_ads");

    if (error) {
      this.logger.error(`Failed to delete template: ${error.message}`);
      return { success: false };
    }

    return { success: true };
  }

  /**
   * Generate keyword suggestions using AI
   */
  async generateKeywords(
    userId: string,
    dto: GenerateKeywordsDto,
    workspaceId?: string | null,
  ): Promise<{
    success: boolean;
    keywords: Array<{ text: string; matchType: string; relevance?: number }>;
    creditsUsed: number;
    error?: string;
  }> {
    // Check and consume credits
    try {
      await this.creditsService.consumeCredits(userId, "KEYWORD_RESEARCH", {
        resourceType: "keyword_generation",
        description: `Keywords: ${dto.seedKeywords.join(", ")}`,
        workspaceId,
      });
    } catch (error) {
      return {
        success: false,
        keywords: [],
        creditsUsed: 0,
        error:
          error instanceof Error ? error.message : "Erro ao consumir créditos",
      };
    }

    const keywords = await this.aiService.generateKeywords(dto);

    return {
      success: true,
      keywords,
      creditsUsed: this.creditsService.getCost("KEYWORD_RESEARCH"),
    };
  }

  /**
   * Generate ad copy using AI
   */
  async generateAdCopy(
    userId: string,
    dto: GenerateGoogleAdCopyDto,
    workspaceId?: string | null,
  ): Promise<{
    success: boolean;
    headlines: string[];
    descriptions: string[];
    creditsUsed: number;
    error?: string;
  }> {
    // Check and consume credits
    try {
      await this.creditsService.consumeCredits(
        userId,
        "AI_HEADLINE_GENERATION",
        {
          resourceType: "ad_copy_generation",
          description: `Ad Copy: ${dto.productName}`,
          workspaceId,
        },
      );
    } catch (error) {
      return {
        success: false,
        headlines: [],
        descriptions: [],
        creditsUsed: 0,
        error:
          error instanceof Error ? error.message : "Erro ao consumir créditos",
      };
    }

    const adCopy = await this.aiService.generateAdCopy(dto);

    return {
      success: true,
      headlines: adCopy.headlines,
      descriptions: adCopy.descriptions,
      creditsUsed: this.creditsService.getCost("AI_HEADLINE_GENERATION"),
    };
  }

  /**
   * Generate headlines, descriptions and extensions from an article
   * Keywords are provided externally (from RapidAPI mining)
   */
  async generateFromArticle(
    userId: string,
    articleId: number,
    options: {
      keywords?: string[]; // Keywords from RapidAPI mining - used for generating coherent content
      headlineCount?: number;
      descriptionCount?: number;
      tone?: string;
      articleUrl?: string; // URL do artigo passada pelo frontend
      language: string; // Required - language code for AI generation
      workspaceId?: string | null; // Optional workspace for credit tracking
    },
  ) {
    // Ensure articleId is a number
    const numericArticleId = Number(articleId);
    this.logger.log(
      `generateFromArticle called - articleId: ${articleId}, keywords: ${options.keywords?.length || 0}, userId: ${userId}`,
    );

    if (isNaN(numericArticleId)) {
      this.logger.error(`Invalid articleId: ${articleId}`);
      return {
        success: false,
        error: "Invalid article ID",
      };
    }

    // Debug: log some articles to verify table access
    const { data: debugArticles, error: debugError } = await this.supabase
      .from("articles")
      .select("id, title")
      .limit(5);
    this.logger.log(
      `Debug - Sample articles: ${JSON.stringify(debugArticles?.map((a) => ({ id: a.id, idType: typeof a.id, title: a.title?.substring(0, 30) })))}, error: ${debugError?.message || "none"}`,
    );

    // Fetch article from database
    // Note: wpPost_id uses camelCase with capital P (legacy naming in DB)
    // Use String for bigint comparison (PostgreSQL int8 may come as string from Supabase)
    const articleIdStr = String(numericArticleId);
    this.logger.log(
      `Looking for article with id: ${articleIdStr} (original: ${articleId}, numeric: ${numericArticleId})`,
    );

    const { data: article, error: articleError } = await this.supabase
      .from("articles")
      .select(
        "id, title, excerpt, content, keyword_used, language, words, project_id, wpPost_id",
      )
      .eq("id", numericArticleId)
      .single();

    this.logger.log(
      `Article query result - found: ${!!article}, articleData: ${article ? JSON.stringify({ id: article.id, title: article.title?.substring(0, 30) }) : "null"}, error: ${articleError?.message || "none"}, code: ${articleError?.code}`,
    );

    if (articleError || !article) {
      this.logger.error(
        `Article ${articleId} not found: ${articleError?.message}`,
      );
      return {
        success: false,
        error: "Article not found",
      };
    }

    // Verify user has access to this article (through project/workspace)
    const { data: project, error: projectError } = await this.supabase
      .from("projects")
      .select("id, workspace_id")
      .eq("id", article.project_id)
      .single();

    if (projectError || !project) {
      this.logger.error(`Project access denied for article ${articleId}`);
      return {
        success: false,
        error: "Access denied",
      };
    }

    // Verify user belongs to the workspace
    const { data: workspaceMember, error: memberError } = await this.supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", project.workspace_id)
      .eq("user_id", userId)
      .single();

    if (memberError || !workspaceMember) {
      this.logger.error(
        `User ${userId} not member of workspace for article ${articleId}`,
      );
      return {
        success: false,
        error: "Access denied",
      };
    }

    // Check credits (only ad copy cost - keywords come from RapidAPI)
    const adCopyCost = this.creditsService.getCost("AI_HEADLINE_GENERATION");

    const creditCheck = await this.creditsService.checkCredits(
      userId,
      adCopyCost,
      options.workspaceId,
    );
    if (!creditCheck.hasCredits) {
      return {
        success: false,
        error: `Créditos insuficientes. Necessário: ${adCopyCost}, Disponível: ${creditCheck.available}`,
        creditsRequired: adCopyCost,
      };
    }

    // Use the provided URL or a placeholder
    const articleUrl = options.articleUrl || "#";

    // Generate content from article using the provided keywords
    const generated = await this.aiService.generateFromArticle(
      {
        title: article.title || "Sem título",
        excerpt: article.excerpt,
        content: article.content,
        keywordUsed: article.keyword_used,
        language: options.language, // Use language from request, not from article
        articleUrl: articleUrl,
      },
      {
        keywords: options.keywords, // Pass keywords from RapidAPI
        headlineCount: options.headlineCount,
        descriptionCount: options.descriptionCount,
        tone: options.tone,
        generateExtensions: true,
      },
    );

    // Consume credits
    await this.creditsService.consumeCredits(userId, "AI_HEADLINE_GENERATION", {
      resourceType: "article",
      resourceId: String(articleId),
      description: `Headlines/Descriptions/Extensions: ${article.title}`,
      workspaceId: options.workspaceId,
    });

    return {
      success: true,
      headlines: generated.headlines,
      descriptions: generated.descriptions,
      suggestedCampaignName: generated.suggestedCampaignName,
      extensions: generated.extensions,
      creditsUsed: adCopyCost,
      articleId: article.id,
      articleTitle: article.title,
    };
  }

  /**
   * Validate campaign data before publishing
   */
  private validateCampaign(template: CampaignTemplate): string[] {
    const errors: string[] = [];

    // Check for ad groups
    if (!template.ad_groups_data || template.ad_groups_data.length === 0) {
      errors.push("At least one ad group is required");
    }

    // Check each ad group
    template.ad_groups_data?.forEach((adGroup: any, index) => {
      if (!adGroup.keywords || adGroup.keywords.length === 0) {
        errors.push(`Ad group ${index + 1}: At least one keyword is required`);
      }
      if (!adGroup.ads || adGroup.ads.length === 0) {
        errors.push(`Ad group ${index + 1}: At least one ad is required`);
      }

      // Validate ads
      adGroup.ads?.forEach((ad: any, adIndex: number) => {
        if (!ad.headlines || ad.headlines.length < 3) {
          errors.push(
            `Ad group ${index + 1}, Ad ${adIndex + 1}: At least 3 headlines required`,
          );
        }
        if (!ad.descriptions || ad.descriptions.length < 2) {
          errors.push(
            `Ad group ${index + 1}, Ad ${adIndex + 1}: At least 2 descriptions required`,
          );
        }
        if (!ad.finalUrl) {
          errors.push(
            `Ad group ${index + 1}, Ad ${adIndex + 1}: Final URL is required`,
          );
        }
      });
    });

    // Check campaign data
    const campaign = template.campaign_data as any;
    if (!campaign.budget || campaign.budget <= 0) {
      errors.push("Campaign budget must be greater than 0");
    }
    if (!campaign.locations || campaign.locations.length === 0) {
      errors.push("At least one target location is required");
    }

    return errors;
  }
}
