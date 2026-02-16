import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
} from "class-validator";

// ============================================
// Inline DTOs (required for ValidationPipe whitelist)
// ============================================

class GoogleAccountStatusDto {
  @IsBoolean()
  is_active: boolean;
}

class GoogleBulkAccountStatusDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  customerIds: string[];

  @IsBoolean()
  is_active: boolean;
}

class GooglePublishDto {
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import {
  GoogleCampaignService,
  CampaignTemplate,
} from "./services/google-campaign.service";
import {
  GoogleCreditsService,
  GOOGLE_CREDIT_COSTS,
} from "./services/google-credits.service";
import { GoogleAdsApiService } from "./services/google-ads-api.service";
import {
  GoogleConnection,
  isGoogleConnection,
} from "./entities/google-connection.entity";
import {
  SaveGoogleTemplateDto,
  GenerateKeywordsDto,
  GenerateGoogleAdCopyDto,
  GenerateFromArticleDto,
  GetKeywordMetricsDto,
  GenerateKeywordIdeasDto,
  ExpandKeywordDto,
} from "./dto";
import { GoogleAiService } from "./services/google-ai.service";
import { AdminService } from "../admin/admin.service";

interface AuthenticatedRequest {
  user: {
    sub: string;
    email: string;
  };
}

@Controller("google/campaigns")
@UseGuards(JwtAuthGuard)
export class GoogleController {
  private readonly logger = new Logger(GoogleController.name);
  private supabase: SupabaseClient;

  constructor(
    private readonly campaignService: GoogleCampaignService,
    private readonly creditsService: GoogleCreditsService,
    private readonly googleAdsApiService: GoogleAdsApiService,
    private readonly aiService: GoogleAiService,
    private readonly adminService: AdminService,
    private configService: ConfigService,
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
  // Accounts - Lista contas Google Ads de uma conexão
  // ============================================

  /**
   * Get stored Google Ads accounts for a connection (from database)
   * GET /google/campaigns/accounts/:connectionId/stored
   * NOTE: This route must come BEFORE the generic :connectionId route
   */
  @Get("accounts/:connectionId/stored")
  async getStoredAccounts(
    @Req() req: AuthenticatedRequest,
    @Param("connectionId") connectionId: string,
  ) {
    const userId = req.user.sub;

    // Verify user has access to the connection
    const { data: connection, error: connError } = await this.supabase
      .from("connections")
      .select("id, workspace_id, user_id")
      .eq("id", connectionId)
      .eq("plataform_name", "google")
      .single();

    if (connError || !connection) {
      throw new BadRequestException("Connection not found");
    }

    // Check access via workspace or direct ownership
    if (connection.workspace_id) {
      const { data: membership } = await this.supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", connection.workspace_id)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (!membership && connection.user_id !== userId) {
        throw new BadRequestException("Access denied");
      }
    } else if (connection.user_id !== userId) {
      throw new BadRequestException("Access denied");
    }

    // Get stored accounts
    const { data: accounts, error } = await this.supabase
      .from("google_ads_accounts")
      .select("*")
      .eq("connection_id", connectionId)
      .order("is_active", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      this.logger.error(`Failed to get stored accounts: ${error.message}`);
      throw new BadRequestException("Failed to get stored accounts");
    }

    return {
      success: true,
      accounts: accounts || [],
    };
  }

  /**
   * Sync Google Ads accounts - fetches all accounts recursively from API and stores in database
   * POST /google/campaigns/accounts/:connectionId/sync
   */
  @Post("accounts/:connectionId/sync")
  async syncAccounts(
    @Req() req: AuthenticatedRequest,
    @Param("connectionId") connectionId: string,
  ) {
    const userId = req.user.sub;

    // Verify user has access to the connection
    const { data: connection, error: connError } = await this.supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .eq("plataform_name", "google")
      .eq("is_active", true)
      .single();

    if (connError || !connection) {
      throw new BadRequestException("Connection not found");
    }

    // Check access via workspace or direct ownership
    if (connection.workspace_id) {
      const { data: membership } = await this.supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", connection.workspace_id)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (!membership && connection.user_id !== userId) {
        throw new BadRequestException("Access denied");
      }
    } else if (connection.user_id !== userId) {
      throw new BadRequestException("Access denied");
    }

    if (!isGoogleConnection(connection)) {
      throw new BadRequestException("Invalid Google connection");
    }

    try {
      // Map to track all discovered accounts (deduplicated by customer_id)
      const allAccounts = new Map<
        string,
        {
          customerId: string;
          name: string;
          currency?: string;
          timezone?: string;
          isManager: boolean;
          loginCustomerId?: string;
        }
      >();

      // Get root level accounts
      this.logger.log(`Syncing accounts for connection ${connectionId}...`);
      const rootAccounts =
        await this.googleAdsApiService.listAccessibleCustomers(
          connection as GoogleConnection,
        );

      this.logger.log(`Found ${rootAccounts.length} root accounts`);

      // Add root accounts to map
      for (const account of rootAccounts) {
        allAccounts.set(account.customer_id, {
          customerId: account.customer_id,
          name: account.name,
          currency: account.currency,
          timezone: account.timezone,
          isManager: account.is_manager,
          loginCustomerId: undefined,
        });
      }

      // Process MCCs recursively
      const mccQueue = rootAccounts
        .filter((a) => a.is_manager)
        .map((a) => ({
          mccId: a.customer_id,
          loginCustomerId: a.customer_id,
        }));
      const processedMccs = new Set<string>();

      while (mccQueue.length > 0) {
        const { mccId, loginCustomerId } = mccQueue.shift()!;

        if (processedMccs.has(mccId)) continue;
        processedMccs.add(mccId);

        this.logger.log(`Processing MCC ${mccId}...`);

        try {
          const managedAccounts =
            await this.googleAdsApiService.listManagedAccounts(
              connection as GoogleConnection,
              mccId,
              loginCustomerId,
            );

          this.logger.log(
            `Found ${managedAccounts.length} accounts under MCC ${mccId}`,
          );

          for (const account of managedAccounts) {
            // Only add if not already in map (deduplication)
            if (!allAccounts.has(account.customer_id)) {
              allAccounts.set(account.customer_id, {
                customerId: account.customer_id,
                name: account.name,
                currency: account.currency,
                timezone: account.timezone,
                isManager: account.is_manager,
                loginCustomerId: loginCustomerId,
              });
            }

            // Add nested MCCs to queue
            if (account.is_manager && !processedMccs.has(account.customer_id)) {
              mccQueue.push({
                mccId: account.customer_id,
                loginCustomerId: loginCustomerId, // Keep using the root MCC
              });
            }
          }
        } catch (err: any) {
          this.logger.warn(
            `Failed to list accounts under MCC ${mccId}: ${err.message}`,
          );
        }
      }

      this.logger.log(`Total unique accounts discovered: ${allAccounts.size}`);

      // Get existing accounts to preserve is_active status
      const { data: existingAccounts } = await this.supabase
        .from("google_ads_accounts")
        .select("customer_id, is_active")
        .eq("connection_id", connectionId);

      const existingMap = new Map(
        (existingAccounts || []).map((a) => [a.customer_id, a.is_active]),
      );

      // Upsert all accounts
      const accountsToUpsert = Array.from(allAccounts.values()).map(
        (account) => ({
          connection_id: connectionId,
          user_id: (connection as any).user_id,
          workspace_id: (connection as any).workspace_id,
          customer_id: account.customerId,
          name: account.name,
          currency: account.currency,
          timezone: account.timezone,
          is_manager: account.isManager,
          login_customer_id: account.loginCustomerId,
          // Preserve existing is_active status, default to false for new accounts
          is_active: existingMap.has(account.customerId)
            ? existingMap.get(account.customerId)
            : false,
          last_synced_at: new Date().toISOString(),
        }),
      );

      if (accountsToUpsert.length > 0) {
        const { error: upsertError } = await this.supabase
          .from("google_ads_accounts")
          .upsert(accountsToUpsert, {
            onConflict: "connection_id,customer_id",
          });

        if (upsertError) {
          this.logger.error(
            `Failed to upsert accounts: ${upsertError.message}`,
          );
          throw new BadRequestException("Failed to save accounts");
        }
      }

      // Fetch the updated accounts
      const { data: updatedAccounts } = await this.supabase
        .from("google_ads_accounts")
        .select("*")
        .eq("connection_id", connectionId)
        .order("is_active", { ascending: false })
        .order("name", { ascending: true });

      return {
        success: true,
        synced: accountsToUpsert.length,
        accounts: updatedAccounts || [],
      };
    } catch (err: any) {
      this.logger.error(`Failed to sync accounts: ${err.message}`);
      return {
        success: false,
        accounts: [],
        error: err.message || "Failed to sync accounts",
      };
    }
  }

  /**
   * Update Google Ads account status (enable/disable)
   * PATCH /google/campaigns/accounts/:connectionId/:customerId
   */
  @Post("accounts/:connectionId/:customerId/status")
  async updateAccountStatus(
    @Req() req: AuthenticatedRequest,
    @Param("connectionId") connectionId: string,
    @Param("customerId") customerId: string,
    @Body() body: GoogleAccountStatusDto,
  ) {
    const userId = req.user.sub;

    // Verify user has access to the account
    const { data: account, error: accError } = await this.supabase
      .from("google_ads_accounts")
      .select("*, connections!inner(workspace_id, user_id, is_active, deleted_at)")
      .eq("connection_id", connectionId)
      .eq("customer_id", customerId)
      .eq("connections.is_active", true)
      .is("connections.deleted_at", null)
      .single();

    if (accError || !account) {
      throw new BadRequestException("Account not found");
    }

    const connection = (account as any).connections;

    // OWNERSHIP CHECK: Only connection creator OR super admin can edit
    const isCreator = connection.user_id === userId;
    const isAdmin = await this.adminService.isAdmin(userId);

    if (!isCreator && !isAdmin) {
      throw new BadRequestException(
        "Only the connection creator or system administrators can modify account settings",
      );
    }

    // Update the account status
    const { error: updateError } = await this.supabase
      .from("google_ads_accounts")
      .update({ is_active: body.is_active })
      .eq("connection_id", connectionId)
      .eq("customer_id", customerId);

    if (updateError) {
      this.logger.error(
        `Failed to update account status: ${updateError.message}`,
      );
      throw new BadRequestException("Failed to update account status");
    }

    return { success: true };
  }

  /**
   * Bulk update Google Ads accounts status
   * POST /google/campaigns/accounts/:connectionId/bulk-status
   */
  @Post("accounts/:connectionId/bulk-status")
  async bulkUpdateAccountStatus(
    @Req() req: AuthenticatedRequest,
    @Param("connectionId") connectionId: string,
    @Body() body: GoogleBulkAccountStatusDto,
  ) {
    const userId = req.user.sub;

    // Verify user has access to the connection
    const { data: connection, error: connError } = await this.supabase
      .from("connections")
      .select("id, workspace_id, user_id")
      .eq("id", connectionId)
      .eq("plataform_name", "google")
      .single();

    if (connError || !connection) {
      throw new BadRequestException("Connection not found");
    }

    // OWNERSHIP CHECK: Only connection creator OR super admin can edit
    const isCreator = connection.user_id === userId;
    const isAdmin = await this.adminService.isAdmin(userId);

    if (!isCreator && !isAdmin) {
      throw new BadRequestException(
        "Only the connection creator or system administrators can modify account settings",
      );
    }

    // Update all accounts
    const { error: updateError } = await this.supabase
      .from("google_ads_accounts")
      .update({ is_active: body.is_active })
      .eq("connection_id", connectionId)
      .in("customer_id", body.customerIds);

    if (updateError) {
      this.logger.error(
        `Failed to bulk update accounts: ${updateError.message}`,
      );
      throw new BadRequestException("Failed to update accounts");
    }

    return { success: true, updated: body.customerIds.length };
  }

  /**
   * List client accounts managed by an MCC (Manager) account
   * Supports nested MCCs via mccPath query parameter
   * GET /google/campaigns/accounts/:connectionId/managed/:mccCustomerId?mccPath=123,456,789
   *
   * The mccPath represents the chain of MCC IDs from root to the current MCC.
   * For example, if MCC A contains MCC B which contains MCC C:
   * - To list accounts under A: /managed/A
   * - To list accounts under B (inside A): /managed/B?mccPath=A
   * - To list accounts under C (inside B inside A): /managed/C?mccPath=A,B
   */
  @Get("accounts/:connectionId/managed/:mccCustomerId")
  async getManagedAccounts(
    @Req() req: AuthenticatedRequest,
    @Param("connectionId") connectionId: string,
    @Param("mccCustomerId") mccCustomerId: string,
    @Query("mccPath") mccPath?: string,
  ) {
    const userId = req.user.sub;

    // Get the connection first (without user_id filter to support workspace members)
    const { data: connection, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .eq("plataform_name", "google")
      .eq("is_active", true)
      .single();

    if (error || !connection) {
      throw new BadRequestException("Connection not found or access denied");
    }

    // Verify user has access via workspace membership or direct ownership
    if (connection.workspace_id) {
      const { data: membership } = await this.supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", connection.workspace_id)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (!membership && connection.user_id !== userId) {
        throw new BadRequestException("Connection not found or access denied");
      }
    } else if (connection.user_id !== userId) {
      throw new BadRequestException("Connection not found or access denied");
    }

    if (!isGoogleConnection(connection)) {
      throw new BadRequestException("Invalid Google connection");
    }

    try {
      // Parse the MCC path to determine the login_customer_id
      // The login_customer_id should be the root MCC in the hierarchy
      const mccPathArray = mccPath ? mccPath.split(",").filter(Boolean) : [];

      // The login_customer_id is the first MCC in the path (root), or the mccCustomerId if no path
      const loginCustomerId =
        mccPathArray.length > 0 ? mccPathArray[0] : mccCustomerId;

      // Full path for response (for client to track hierarchy)
      const fullPath = [...mccPathArray, mccCustomerId];

      // List managed accounts under the MCC
      const managedAccounts =
        await this.googleAdsApiService.listManagedAccounts(
          connection as GoogleConnection,
          mccCustomerId,
          loginCustomerId, // Pass the root MCC as login_customer_id for nested MCCs
        );

      return {
        success: true,
        mccCustomerId,
        mccPath: fullPath, // Return the full path for the client to use
        loginCustomerId, // The root MCC that should be used for API calls
        accounts: managedAccounts.map((c) => ({
          customerId: c.customer_id,
          name: c.name,
          currency: c.currency,
          timezone: c.timezone,
          isManager: c.is_manager,
          // The root MCC ID is needed to make API calls on behalf of this account
          loginCustomerId: loginCustomerId,
        })),
      };
    } catch (err: any) {
      this.logger.error(`Failed to list managed accounts: ${err.message}`);
      return {
        success: false,
        accounts: [],
        error: err.message || "Failed to list managed accounts",
      };
    }
  }

  /**
   * List Google Ads accounts accessible through a connection
   * GET /google/campaigns/accounts/:connectionId
   * NOTE: This generic route must come AFTER all more specific routes
   */
  @Get("accounts/:connectionId")
  async getGoogleAdsAccounts(
    @Req() req: AuthenticatedRequest,
    @Param("connectionId") connectionId: string,
  ) {
    const userId = req.user.sub;

    // Get the connection first (without user_id filter to support workspace members)
    const { data: connection, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .eq("plataform_name", "google")
      .eq("is_active", true)
      .single();

    if (error || !connection) {
      throw new BadRequestException("Connection not found or access denied");
    }

    // Verify user has access via workspace membership or direct ownership
    if (connection.workspace_id) {
      const { data: membership } = await this.supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", connection.workspace_id)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (!membership && connection.user_id !== userId) {
        throw new BadRequestException("Connection not found or access denied");
      }
    } else if (connection.user_id !== userId) {
      throw new BadRequestException("Connection not found or access denied");
    }

    if (!isGoogleConnection(connection)) {
      throw new BadRequestException("Invalid Google connection");
    }

    try {
      // List accessible Google Ads customers
      const customers = await this.googleAdsApiService.listAccessibleCustomers(
        connection as GoogleConnection,
      );

      return {
        success: true,
        accounts: customers.map((c) => ({
          customerId: c.customer_id,
          name: c.name,
          currency: c.currency,
          timezone: c.timezone,
          isManager: c.is_manager,
        })),
      };
    } catch (err: any) {
      this.logger.error(`Failed to list Google Ads accounts: ${err.message}`);
      return {
        success: false,
        accounts: [],
        error: err.message || "Failed to list Google Ads accounts",
      };
    }
  }

  // ============================================
  // Templates
  // ============================================

  @Get("templates")
  async getTemplates(
    @Req() req: AuthenticatedRequest,
    @Query("status") status?: string,
    @Query("network") network?: string,
    @Query("workspace_id") workspaceId?: string,
  ): Promise<{ success: boolean; templates: CampaignTemplate[] }> {
    const userId = req.user.sub;
    const templates = await this.campaignService.getTemplates(userId, {
      status,
      network,
      workspaceId,
    });
    return { success: true, templates };
  }

  @Get("templates/:id")
  async getTemplate(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<{ success: boolean; template: CampaignTemplate }> {
    const userId = req.user.sub;
    const template = await this.campaignService.getTemplate(userId, id);
    return { success: true, template };
  }

  @Post("templates")
  async saveTemplate(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SaveGoogleTemplateDto & { workspace_id?: string },
  ): Promise<{ success: boolean; template: CampaignTemplate }> {
    const userId = req.user.sub;
    const workspaceId = dto.workspace_id;
    this.logger.log(
      `[saveTemplate] Received DTO - templateName: ${dto.templateName}, workspace: ${workspaceId || "none"}, account: ${JSON.stringify(dto.account)}, extensions: ${JSON.stringify(dto.extensions)}`,
    );
    return this.campaignService.saveTemplate(userId, dto, workspaceId);
  }

  @Delete("templates/:id")
  @HttpCode(HttpStatus.OK)
  async deleteTemplate(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    const userId = req.user.sub;
    return this.campaignService.deleteTemplate(userId, id);
  }

  // ============================================
  // Campaign Operations
  // ============================================

  @Post(":id/publish")
  async publishCampaign(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: GooglePublishDto,
  ) {
    const userId = req.user.sub;
    return this.campaignService.publishCampaign(userId, {
      templateId: id,
      dryRun: body.dryRun,
    });
  }

  @Post(":id/pause")
  @HttpCode(HttpStatus.OK)
  async pauseCampaign(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    const userId = req.user.sub;
    return this.campaignService.pauseCampaign(userId, id);
  }

  @Post(":id/resume")
  @HttpCode(HttpStatus.OK)
  async resumeCampaign(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    const userId = req.user.sub;
    return this.campaignService.resumeCampaign(userId, id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  async deleteCampaign(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    const userId = req.user.sub;
    return this.campaignService.deleteTemplate(userId, id);
  }

  // ============================================
  // AI Generation
  // ============================================

  @Post("ai/keywords")
  async generateKeywords(
    @Req() req: AuthenticatedRequest,
    @Body() dto: GenerateKeywordsDto,
  ) {
    const userId = req.user.sub;
    return this.campaignService.generateKeywords(userId, dto, dto.workspaceId);
  }

  @Post("ai/ad-copy")
  async generateAdCopy(
    @Req() req: AuthenticatedRequest,
    @Body() dto: GenerateGoogleAdCopyDto,
  ) {
    const userId = req.user.sub;
    return this.campaignService.generateAdCopy(userId, dto, dto.workspaceId);
  }

  @Post("ai/from-article")
  async generateFromArticle(
    @Req() req: AuthenticatedRequest,
    @Body() dto: GenerateFromArticleDto,
  ) {
    const userId = req.user.sub;
    console.log("[generateFromArticle] DTO received:", JSON.stringify(dto));
    console.log(
      "[generateFromArticle] articleId:",
      dto.articleId,
      "keywords:",
      dto.keywords?.length || 0,
    );
    return this.campaignService.generateFromArticle(userId, dto.articleId, {
      keywords: dto.keywords, // Keywords from RapidAPI mining
      headlineCount: dto.headlineCount,
      descriptionCount: dto.descriptionCount,
      tone: dto.tone,
      articleUrl: dto.articleUrl,
      language: dto.language,
      workspaceId: dto.workspaceId,
    });
  }

  // ============================================
  // Credits
  // ============================================

  @Get("credits/costs")
  getCreditCosts() {
    return {
      success: true,
      costs: GOOGLE_CREDIT_COSTS,
    };
  }

  @Get("credits/balance")
  async getCreditBalance(
    @Req() req: AuthenticatedRequest,
    @Query("workspaceId") workspaceId?: string,
  ) {
    const userId = req.user.sub;
    const credits = await this.creditsService.getCredits(userId, workspaceId);
    return {
      success: true,
      hasCredits: credits.totalCreditsAvailable > 0,
      creditsAvailable: credits.totalCreditsAvailable,
      isWorkspace: credits.isWorkspace,
    };
  }

  // ============================================
  // Keyword Planner (Metrics & Ideas)
  // ============================================

  /**
   * Get keyword metrics (search volume, competition, CPC) for a list of keywords
   * POST /google/campaigns/keywords/metrics
   */
  @Post("keywords/metrics")
  async getKeywordMetrics(
    @Req() req: AuthenticatedRequest,
    @Body() dto: GetKeywordMetricsDto,
  ) {
    const userId = req.user.sub;

    // Get the connection first (without user_id filter to support workspace members)
    const { data: connection, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("id", dto.connectionId)
      .eq("plataform_name", "google")
      .eq("is_active", true)
      .single();

    if (error || !connection) {
      throw new BadRequestException("Connection not found or access denied");
    }

    // Verify user has access via workspace membership or direct ownership
    if (connection.workspace_id) {
      const { data: membership } = await this.supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", connection.workspace_id)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (!membership && connection.user_id !== userId) {
        throw new BadRequestException("Connection not found or access denied");
      }
    } else if (connection.user_id !== userId) {
      throw new BadRequestException("Connection not found or access denied");
    }

    if (!isGoogleConnection(connection)) {
      throw new BadRequestException("Invalid Google connection");
    }

    try {
      const result = await this.googleAdsApiService.getKeywordMetrics(
        connection as GoogleConnection,
        dto.keywords,
        dto.geoTargetConstants,
        dto.languageId,
        dto.customerId,
        dto.loginCustomerId,
      );

      return result;
    } catch (err: any) {
      this.logger.error(`Failed to get keyword metrics: ${err.message}`);
      return {
        success: false,
        error: err.message || "Failed to get keyword metrics",
      };
    }
  }

  /**
   * Generate keyword ideas from seed keywords or URL
   * POST /google/campaigns/keywords/ideas
   */
  @Post("keywords/ideas")
  async generateKeywordIdeas(
    @Req() req: AuthenticatedRequest,
    @Body() dto: GenerateKeywordIdeasDto,
  ) {
    const userId = req.user.sub;

    // Get the connection first (without user_id filter to support workspace members)
    const { data: connection, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("id", dto.connectionId)
      .eq("plataform_name", "google")
      .eq("is_active", true)
      .single();

    if (error || !connection) {
      throw new BadRequestException("Connection not found or access denied");
    }

    // Verify user has access via workspace membership or direct ownership
    if (connection.workspace_id) {
      const { data: membership } = await this.supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", connection.workspace_id)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (!membership && connection.user_id !== userId) {
        throw new BadRequestException("Connection not found or access denied");
      }
    } else if (connection.user_id !== userId) {
      throw new BadRequestException("Connection not found or access denied");
    }

    if (!isGoogleConnection(connection)) {
      throw new BadRequestException("Invalid Google connection");
    }

    try {
      const result = await this.googleAdsApiService.generateKeywordIdeas(
        connection as GoogleConnection,
        dto.seedKeywords,
        dto.url,
        dto.geoTargetConstants,
        dto.languageId,
        dto.customerId,
        dto.loginCustomerId,
      );

      return result;
    } catch (err: any) {
      this.logger.error(`Failed to generate keyword ideas: ${err.message}`);
      return {
        success: false,
        error: err.message || "Failed to generate keyword ideas",
      };
    }
  }

  // Note: Geo target and language endpoints removed - data now comes from
  // google_geo_targets and google_languages tables via BulkOperationService
  // See: GET /google/bulk/geo-targets and GET /google/bulk/languages

  // ============================================
  // Keyword Expansion (LLM fallback for specific keywords)
  // ============================================

  /**
   * Expand a specific keyword into broader alternatives using LLM
   * Used when Google Keyword Planner returns too few results (< 50 keywords)
   * POST /google/campaigns/ai/expand-keyword
   */
  @Post("ai/expand-keyword")
  async expandKeyword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ExpandKeywordDto,
  ) {
    try {
      this.logger.log(
        `[expandKeyword] Expanding keyword "${dto.originalKeyword}" (current count: ${dto.currentCount})`,
      );

      const result = await this.aiService.expandKeyword(
        dto.originalKeyword,
        dto.currentCount,
        {
          title: dto.articleTitle,
          excerpt: dto.articleExcerpt,
          language: dto.language,
        },
      );

      return {
        success: true,
        alternativeKeywords: result.alternativeKeywords,
        reasoning: result.reasoning,
      };
    } catch (err: any) {
      this.logger.error(`Failed to expand keyword: ${err.message}`);
      return {
        success: false,
        error: err.message || "Failed to expand keyword",
        alternativeKeywords: [],
      };
    }
  }
}
