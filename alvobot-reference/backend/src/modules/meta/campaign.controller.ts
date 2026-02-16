import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  Logger,
} from "@nestjs/common";
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
} from "class-validator";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";

// ============================================
// Inline DTOs (required for ValidationPipe whitelist)
// ============================================

class MetaConnectionIdDto {
  @IsString()
  connectionId: string;
}

class MetaAdAccountUpdateDto {
  @IsString()
  accountId: string;

  @IsBoolean()
  isActive: boolean;
}

class MetaSyncPixelsDto {
  @IsString()
  connectionId: string;

  @IsString()
  adAccountId: string;
}

class MetaPixelUpdateDto {
  @IsString()
  pixelId: string;

  @IsBoolean()
  isActive: boolean;
}

class MetaBatchPixelUpdateDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  pixelIds: string[];

  @IsBoolean()
  isActive: boolean;
}

class MetaPublishDto {
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
import { CampaignService } from "./services/campaign.service";
import { CreditsService, CREDIT_COSTS } from "./services/credits.service";
import { MetaService } from "./meta.service";
import { AdminService } from "../admin/admin.service";
import {
  SaveCampaignTemplateDto,
  GenerateAdCopyDto,
  GenerateImageDto,
  CreativeSourceType,
} from "./dto/create-campaign.dto";

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

/**
 * Map Meta account_status number to string
 * Meta API returns: 1 = ACTIVE, 2 = DISABLED, 3 = UNSETTLED, 7 = PENDING_REVIEW, 9 = IN_GRACE_PERIOD, 100 = PENDING_CLOSURE, 101 = CLOSED, 201 = ANY_ACTIVE, 202 = ANY_CLOSED
 * Reference: https://developers.facebook.com/docs/marketing-api/reference/ad-account/#fields
 */
function mapAccountStatus(status: number): string {
  switch (status) {
    case 1:
      return "ACTIVE";
    case 2:
      return "DISABLED";
    case 3:
      return "UNSETTLED";
    case 7:
      return "PENDING_REVIEW";
    case 9:
      return "IN_GRACE_PERIOD";
    case 100:
      return "PENDING_CLOSURE";
    case 101:
      return "CLOSED";
    default:
      return "DISABLED"; // Default to disabled for unknown statuses
  }
}

@Controller("meta/campaigns")
@UseGuards(AuthGuard("jwt"))
export class CampaignController {
  private readonly logger = new Logger(CampaignController.name);

  constructor(
    private readonly campaignService: CampaignService,
    private readonly creditsService: CreditsService,
    private readonly metaService: MetaService,
    private readonly adminService: AdminService,
  ) {}

  // ============================================
  // Meta Account Data (for Wizard)
  // ============================================

  /**
   * Get all ACTIVE ad accounts for a connection (from database)
   * Only returns accounts where is_active = true (configured in connection settings)
   * GET /meta/campaigns/accounts/:connectionId
   */
  @Get("accounts/:connectionId")
  async getAdAccounts(
    @Param("connectionId") connectionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    this.logger.log(
      `Fetching active ad accounts from DB for connection ${connectionId}`,
    );

    const result = await this.metaService.getAdAccountsList(
      connectionId,
      userId,
      { onlyActive: true },
    );

    return {
      success: true,
      adAccounts: (result.accounts || []).map((account) => ({
        // id should be the Meta ad account ID with act_ prefix, NOT the database UUID
        // Frontend expects: id = "act_123456789", accountId = "123456789"
        id: `act_${account.account_id}`,
        name: account.account_name,
        accountId: account.account_id,
        status: mapAccountStatus(account.account_status),
        currency: account.currency,
        timezone: account.timezone_name,
        businessName: account.business_name,
      })),
    };
  }

  /**
   * Get all ad accounts from all connections for a user
   * GET /meta/campaigns/accounts
   */
  @Get("all-accounts")
  async getAllAdAccounts(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    this.logger.log(`Fetching all ad accounts for user ${userId}`);

    const results = await this.metaService.getAllUserAdAccounts(userId);

    return {
      success: true,
      connections: results.map((result) => ({
        connectionId: result.connectionId,
        connectionName: result.connectionName,
        adAccounts: result.adAccounts.map((account) => ({
          // id should be the Meta ad account ID with act_ prefix, NOT the database UUID
          id: `act_${account.account_id}`,
          name: account.name,
          accountId: account.account_id,
          status: mapAccountStatus(account.account_status),
          currency: account.currency,
          timezone: account.timezone_name,
          businessName: account.business_name,
        })),
      })),
    };
  }

  /**
   * Get pages for a connection
   * GET /meta/campaigns/pages/:connectionId
   *
   * First checks the meta_pages table for saved pages.
   * If no pages are found, fetches directly from Facebook API and saves them.
   */
  @Get("pages/:connectionId")
  async getPages(
    @Param("connectionId") connectionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    this.logger.log(`Fetching pages for connection ${connectionId}`);

    // First try to get pages from database
    let pages = await this.metaService.getConnectionPages(connectionId, userId);

    // If no pages in database, fetch from Facebook and save them
    if (!pages || pages.length === 0) {
      this.logger.log(
        `No pages in database, fetching from Facebook for connection ${connectionId}`,
      );
      try {
        const facebookPages = await this.metaService.refreshConnectionPages(
          connectionId,
          userId,
        );

        // Now get the saved pages from database
        pages = await this.metaService.getConnectionPages(connectionId, userId);

        this.logger.log(
          `Fetched and saved ${facebookPages.length} pages from Facebook`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to fetch pages from Facebook: ${error.message}`,
        );
        // Return empty array if Facebook fetch fails
        return {
          success: true,
          pages: [],
          error:
            "Não foi possível buscar páginas do Facebook. Verifique se a conexão está ativa.",
        };
      }
    }

    return {
      success: true,
      pages: pages.map((page) => ({
        id: page.page_id,
        name: page.page_name,
        isActive: page.is_active,
        category: page.category,
        pictureUrl: page.picture_url,
      })),
    };
  }

  /**
   * Get Instagram account linked to a page
   * GET /meta/campaigns/instagram/:pageId
   */
  @Get("instagram/:pageId")
  async getInstagramAccount(
    @Param("pageId") pageId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    this.logger.log(`Fetching Instagram account for page ${pageId}`);

    const instagramAccount = await this.campaignService.getInstagramAccount(
      pageId,
      userId,
    );

    return {
      success: true,
      instagramAccount,
    };
  }

  /**
   * Get pixels from database (with selection status)
   * GET /meta/campaigns/pixels/list
   * NOTE: This route MUST be defined BEFORE /pixels/:adAccountId to avoid route collision
   */
  @Get("pixels/list")
  async getPixelsList(
    @Query("connectionId") connectionId: string,
    @Query("adAccountId") adAccountId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;

    if (!connectionId || !adAccountId) {
      return { success: true, pixels: [] };
    }

    return this.metaService.getPixelsList(connectionId, adAccountId, userId);
  }

  /**
   * Get pixels for an ad account (direct from Meta API)
   * GET /meta/campaigns/pixels/:adAccountId
   */
  @Get("pixels/:adAccountId")
  async getPixels(
    @Param("adAccountId") adAccountId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    this.logger.log(`Fetching pixels for ad account ${adAccountId}`);

    const pixels = await this.campaignService.getPixels(adAccountId, userId);

    return {
      success: true,
      pixels,
    };
  }

  // ============================================
  // Unified Sync (All Resources at Once)
  // ============================================

  /**
   * Sync ALL Meta resources at once (ad accounts, pages, pixels, instagram)
   * POST /meta/campaigns/sync-all
   *
   * Based on N8N workflow pattern - fetches everything in parallel
   */
  @Post("sync-all")
  async syncAllResources(
    @Body() body: MetaConnectionIdDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    const workspaceId = req.headers["x-workspace-id"] as string;

    this.logger.log(
      `Syncing all resources for connection ${body.connectionId}`,
    );

    return this.metaService.syncAllResources(
      body.connectionId,
      userId,
      workspaceId,
    );
  }

  // ============================================
  // Ad Accounts Management (Database Sync)
  // ============================================

  /**
   * Sync ad accounts from Meta API to database
   * POST /meta/campaigns/ad-accounts/sync
   */
  @Post("ad-accounts/sync")
  async syncAdAccounts(
    @Body() body: MetaConnectionIdDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    const workspaceId = req.headers["x-workspace-id"] as string;

    return this.metaService.syncAdAccountsToDatabase(
      body.connectionId,
      userId,
      workspaceId,
    );
  }

  /**
   * Get ad accounts from database (with selection status)
   * GET /meta/campaigns/ad-accounts/list
   */
  @Get("ad-accounts/list")
  async getAdAccountsList(
    @Query("connectionId") connectionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;

    if (!connectionId) {
      return { success: true, accounts: [] };
    }

    return this.metaService.getAdAccountsList(connectionId, userId);
  }

  /**
   * Update ad account selection status
   * POST /meta/campaigns/ad-accounts/update
   */
  @Post("ad-accounts/update")
  async updateAdAccount(
    @Body() body: MetaAdAccountUpdateDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;

    return this.metaService.updateAdAccountStatus(
      body.accountId,
      body.isActive,
      userId,
      this.adminService,
    );
  }

  /**
   * Batch update multiple ad accounts selection status
   * POST /meta/campaigns/accounts/batch-update
   */
  @Post("accounts/batch-update")
  async batchUpdateAdAccounts(
    @Body()
    body: { connectionId: string; accountIds: string[]; isActive: boolean },
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    this.logger.log(
      `Batch updating ${body.accountIds.length} ad accounts for connection ${body.connectionId}`,
    );

    return this.metaService.batchUpdateAdAccountStatus(
      body.connectionId,
      body.accountIds,
      body.isActive,
      userId,
      this.adminService,
    );
  }

  // ============================================
  // Pixels Management (Database Sync)
  // ============================================

  /**
   * Sync pixels from Meta API to database
   * POST /meta/campaigns/pixels/sync
   */
  @Post("pixels/sync")
  async syncPixels(
    @Body() body: MetaSyncPixelsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    const workspaceId = req.headers["x-workspace-id"] as string;

    this.logger.log(
      `Syncing pixels for connection ${body.connectionId}, adAccount ${body.adAccountId}`,
    );

    // Fetch pixels from Meta API using the specific connection
    const pixels = await this.campaignService.getPixels(
      body.adAccountId,
      userId,
      body.connectionId, // Pass connectionId to use the correct access token
    );

    this.logger.log(`Fetched ${pixels.length} pixels from Meta API`);

    return this.metaService.syncPixelsToDatabase(
      body.connectionId,
      body.adAccountId,
      pixels,
      userId,
      workspaceId,
    );
  }

  /**
   * Update pixel selection status
   * POST /meta/campaigns/pixels/update
   */
  @Post("pixels/update")
  async updatePixel(
    @Body() body: MetaPixelUpdateDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;

    return this.metaService.updatePixelStatus(
      body.pixelId,
      body.isActive,
      userId,
      this.adminService,
    );
  }

  /**
   * Batch update multiple pixels selection status
   * POST /meta/campaigns/pixels/batch-update
   */
  @Post("pixels/batch-update")
  async batchUpdatePixels(
    @Body() body: MetaBatchPixelUpdateDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    this.logger.log(`Batch updating ${body.pixelIds.length} pixels`);

    return this.metaService.batchUpdatePixelStatus(
      body.pixelIds,
      body.isActive,
      userId,
      this.adminService,
    );
  }

  // ============================================
  // Template Management
  // ============================================

  /**
   * List all campaign templates
   * GET /meta/campaigns
   */
  @Get()
  async listTemplates(
    @Req() req: AuthenticatedRequest,
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("workspace_id") workspaceId?: string,
  ) {
    const userId = req.user.sub;
    this.logger.log(
      `Listing templates for user ${userId}, workspace ${workspaceId || "none"}`,
    );

    const result = await this.campaignService.listTemplates(userId, {
      workspaceId,
      status,
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    return {
      success: true,
      templates: result.templates,
      total: result.total,
    };
  }

  /**
   * Get a single template
   * GET /meta/campaigns/:id
   */
  @Get(":id")
  async getTemplate(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    const template = await this.campaignService.getTemplate(id, userId);

    if (!template) {
      return { success: false, error: "Template não encontrado" };
    }

    return { success: true, template };
  }

  /**
   * Save a campaign template (create or update)
   * POST /meta/campaigns
   */
  @Post()
  async saveTemplate(
    @Body() dto: SaveCampaignTemplateDto & { workspace_id?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    const workspaceId = dto.workspace_id;
    this.logger.log(
      `Saving template for user ${userId}, workspace ${workspaceId || "none"}: ${dto.templateName}`,
    );

    const template = await this.campaignService.saveTemplate(
      userId,
      dto,
      workspaceId,
    );

    return {
      success: true,
      template,
      message: dto.id ? "Template atualizado" : "Template criado",
    };
  }

  /**
   * Delete a template
   * DELETE /meta/campaigns/:id
   */
  @Delete(":id")
  async deleteTemplate(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    this.logger.log(`Deleting template ${id} for user ${userId}`);

    await this.campaignService.deleteTemplate(id, userId);

    return { success: true, message: "Template excluído" };
  }

  /**
   * Duplicate a template
   * POST /meta/campaigns/:id/duplicate
   */
  @Post(":id/duplicate")
  async duplicateTemplate(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    this.logger.log(`Duplicating template ${id} for user ${userId}`);

    const template = await this.campaignService.duplicateTemplate(id, userId);

    return {
      success: true,
      template,
      message: "Template duplicado",
    };
  }

  // ============================================
  // Publishing
  // ============================================

  /**
   * Publish a campaign to Meta Ads
   * POST /meta/campaigns/:id/publish
   */
  @Post(":id/publish")
  async publishCampaign(
    @Param("id") id: string,
    @Body() body: MetaPublishDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    this.logger.log(`Publishing campaign ${id} for user ${userId}`);

    const result = await this.campaignService.publishCampaign(userId, {
      templateId: id,
      dryRun: body.dryRun,
    });

    return result;
  }

  // ============================================
  // AI Creative Generation
  // ============================================

  /**
   * Generate ad copy using AI
   * POST /meta/campaigns/ai/copy
   */
  @Post("ai/copy")
  async generateAdCopy(
    @Body() dto: GenerateAdCopyDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    this.logger.log(
      `Generating ad copy for user ${userId}: ${dto.productName}`,
    );

    const copies = await this.campaignService.generateAdCopy(userId, dto);

    return {
      success: true,
      copies,
      creditsUsed: CREDIT_COSTS.AD_COPY_GENERATION,
    };
  }

  /**
   * Generate image using AI (DALL-E)
   * POST /meta/campaigns/ai/image
   */
  @Post("ai/image")
  async generateImage(
    @Body() dto: GenerateImageDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    this.logger.log(`Generating image for user ${userId}`);

    const result = await this.campaignService.generateImage(userId, dto);

    return {
      success: true,
      ...result,
      creditsUsed: CREDIT_COSTS.CREATIVE_AI_GENERATED * (dto.count || 1),
    };
  }

  /**
   * Generate headlines only
   * POST /meta/campaigns/ai/headlines
   */
  @Post("ai/headlines")
  async generateHeadlines(
    @Body()
    body: { productName: string; productDescription?: string; count?: number },
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    this.logger.log(
      `Generating headlines for user ${userId}: ${body.productName}`,
    );

    const headlines = await this.campaignService.generateHeadlines(
      userId,
      body.productName,
      {
        productDescription: body.productDescription,
        count: body.count,
      },
    );

    return {
      success: true,
      headlines,
      creditsUsed: CREDIT_COSTS.HEADLINE_GENERATION,
    };
  }

  // ============================================
  // Credits & Pricing
  // ============================================

  /**
   * Get credit costs for all operations
   * GET /meta/campaigns/credits/costs
   */
  @Get("credits/costs")
  getCreditCosts() {
    return {
      success: true,
      costs: this.campaignService.getCreditCosts(),
    };
  }

  /**
   * Calculate credits for a campaign configuration
   * POST /meta/campaigns/credits/calculate
   */
  @Post("credits/calculate")
  calculateCredits(
    @Body()
    body: {
      creativeSources: CreativeSourceType[];
      publishImmediately?: boolean;
      generateAdCopy?: boolean;
      generateHeadlines?: boolean;
    },
  ) {
    const result = this.campaignService.calculateCredits(body.creativeSources, {
      publishImmediately: body.publishImmediately,
      generateAdCopy: body.generateAdCopy,
      generateHeadlines: body.generateHeadlines,
    });

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Get user's current credits
   * GET /meta/campaigns/credits/balance
   */
  @Get("credits/balance")
  async getCreditsBalance(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    const credits = await this.creditsService.getUserCredits(userId);

    return {
      success: true,
      credits,
    };
  }
}
