import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  Logger,
  Param,
} from "@nestjs/common";
import { IsOptional, IsBoolean } from "class-validator";
import { AuthGuard } from "@nestjs/passport";
import { Response, Request } from "express";
import { MetaService } from "./meta.service";
import { CampaignService } from "./services/campaign.service";
import { InitiateOAuthDto } from "./dto/initiate-oauth.dto";
import { ConfigService } from "@nestjs/config";

// ============================================
// Inline DTOs (required for ValidationPipe whitelist)
// ============================================

class MetaTestRepublishDto {
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

/**
 * Map Meta account_status number to string
 * Meta API returns: 1 = ACTIVE, 2 = DISABLED, 3 = UNSETTLED, 7 = PENDING_REVIEW, 9 = IN_GRACE_PERIOD, etc.
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
      return "DISABLED";
  }
}

@Controller("meta")
export class MetaController {
  private readonly logger = new Logger(MetaController.name);

  constructor(
    private readonly metaService: MetaService,
    private readonly configService: ConfigService,
    private readonly campaignService: CampaignService,
  ) {}

  /**
   * Initiate OAuth flow - returns authorization URL
   * POST /meta/oauth/initiate
   */
  @Post("oauth/initiate")
  @UseGuards(AuthGuard("jwt"))
  async initiateOAuth(
    @Body() dto: InitiateOAuthDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    const workspaceId =
      dto.workspaceId || (req.headers["x-workspace-id"] as string);

    // Verify workspace membership if workspaceId is provided
    if (workspaceId) {
      const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
      const supabaseKey = this.configService.get<string>(
        "SUPABASE_SERVICE_KEY",
      );
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (!membership) {
        return {
          success: false,
          error: "Você não tem acesso a este workspace",
        };
      }
    }

    // Use provided redirect URI or default
    const frontendUrl = this.configService.get<string>("FRONTEND_URL");
    const redirectUri = dto.redirectUri || `${frontendUrl}/callback/meta`;

    this.logger.log(
      `Initiating OAuth for user ${userId}, workspace ${workspaceId}, type: ${dto.connectionType}, reconnect: ${dto.reconnectConnectionId || "no"}`,
    );

    const { url, metaAppId } = await this.metaService.buildAuthorizationUrl(
      userId,
      dto.connectionName,
      dto.connectionType,
      redirectUri,
      workspaceId,
      dto.reconnectConnectionId,
    );

    return {
      success: true,
      authorizationUrl: url,
      metaAppId,
    };
  }

  /**
   * OAuth exchange - exchanges code for token (called by frontend)
   * GET /meta/oauth/exchange
   * Returns JSON response for frontend to handle
   */
  @Get("oauth/exchange")
  async oauthExchange(
    @Query("code") code: string,
    @Query("state") state: string,
  ) {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL");
    const redirectUri = `${frontendUrl}/callback/meta`;

    this.logger.log(
      `OAuth exchange called. FRONTEND_URL=${frontendUrl}, redirectUri=${redirectUri}`,
    );

    if (!code || !state) {
      return {
        success: false,
        error: "missing_params",
        error_description: "Missing code or state parameter",
      };
    }

    try {
      const result = await this.metaService.exchangeCodeForToken(
        code,
        state,
        redirectUri,
      );

      // Encode pages preview
      const pagesPreview = result.pages.slice(0, 5).map((p) => ({
        id: p.id,
        name: p.name,
      }));

      this.logger.log(
        `OAuth exchange successful. connectionId=${result.connection.id}, pagesCount=${result.pages.length}`,
      );

      return {
        success: true,
        connection_id: result.connection.id,
        pages_count: result.pages.length,
        pages_preview: Buffer.from(JSON.stringify(pagesPreview)).toString(
          "base64url",
        ),
      };
    } catch (err) {
      this.logger.error(
        `OAuth exchange error: ${err.message}. FRONTEND_URL=${frontendUrl}`,
      );
      return {
        success: false,
        error: "exchange_failed",
        error_description: err.message || "Failed to complete authentication",
      };
    }
  }

  /**
   * OAuth callback - exchanges code for token (legacy redirect flow)
   * GET /meta/oauth/callback
   * This is called by Facebook after user authorizes - redirects to frontend
   */
  @Get("oauth/callback")
  async oauthCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Query("error") error: string,
    @Query("error_description") errorDescription: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL");
    const redirectUri = `${frontendUrl}/callback/meta`;

    // Handle errors from Facebook
    if (error) {
      this.logger.error(`OAuth error: ${error} - ${errorDescription}`);
      return res.redirect(
        `${frontendUrl}/callback/meta?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || "")}`,
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${frontendUrl}/callback/meta?error=missing_params&error_description=Missing code or state parameter`,
      );
    }

    try {
      const result = await this.metaService.exchangeCodeForToken(
        code,
        state,
        redirectUri,
      );

      // Redirect to frontend with connection ID and page count
      const params = new URLSearchParams({
        success: "true",
        connection_id: result.connection.id,
        pages_count: result.pages.length.toString(),
      });

      // Store pages temporarily in state for the frontend to retrieve
      // We'll encode basic page info in the URL (limited to prevent URL length issues)
      const pagesPreview = result.pages.slice(0, 5).map((p) => ({
        id: p.id,
        name: p.name,
      }));
      params.append(
        "pages_preview",
        Buffer.from(JSON.stringify(pagesPreview)).toString("base64url"),
      );

      return res.redirect(`${frontendUrl}/callback/meta?${params.toString()}`);
    } catch (err) {
      this.logger.error("OAuth callback error:", err);
      return res.redirect(
        `${frontendUrl}/callback/meta?error=exchange_failed&error_description=${encodeURIComponent(err.message || "Failed to complete authentication")}`,
      );
    }
  }

  /**
   * Get available pages for a connection
   * GET /meta/connections/:connectionId/pages
   */
  @Get("connections/:connectionId/pages")
  @UseGuards(AuthGuard("jwt"))
  async getConnectionPages(
    @Param("connectionId") connectionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    this.logger.log(
      `Getting pages for connection ${connectionId}, user ${userId}`,
    );

    const pages = await this.metaService.getConnectionPages(
      connectionId,
      userId,
    );
    return { success: true, pages };
  }

  /**
   * Refresh pages list from Facebook
   * POST /meta/connections/:connectionId/pages/refresh
   */
  @Post("connections/:connectionId/pages/refresh")
  @UseGuards(AuthGuard("jwt"))
  async refreshPages(
    @Param("connectionId") connectionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    this.logger.log(
      `Refreshing pages for connection ${connectionId}, user ${userId}`,
    );

    const pages = await this.metaService.refreshConnectionPages(
      connectionId,
      userId,
    );
    return {
      success: true,
      pages: pages.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        accessToken: p.access_token,
        hasMessagingPermission: p.tasks?.includes("MESSAGING") || false,
        pictureUrl: p.picture?.data?.url || null,
      })),
    };
  }

  /**
   * Save selected pages for a connection
   * POST /meta/connections/:connectionId/pages
   */
  @Post("connections/:connectionId/pages")
  @UseGuards(AuthGuard("jwt"))
  async savePages(
    @Param("connectionId") connectionId: string,
    @Body()
    body: {
      pages: Array<{ pageId: string; pageName: string; accessToken: string }>;
    },
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    this.logger.log(
      `Saving ${body.pages.length} pages for connection ${connectionId}, user ${userId}`,
    );

    const savedPages = await this.metaService.saveSelectedPagesWithAuth(
      connectionId,
      userId,
      body.pages,
    );

    return { success: true, pages: savedPages };
  }

  /**
   * Check Meta app configuration status
   * GET /meta/config/status
   */
  @Get("config/status")
  @UseGuards(AuthGuard("jwt"))
  async checkConfigStatus() {
    const result = await this.metaService.validateMetaAppConfig();
    return result;
  }

  /**
   * Get ad accounts for a specific connection
   * GET /meta/connections/:connectionId/ad-accounts
   */
  @Get("connections/:connectionId/ad-accounts")
  @UseGuards(AuthGuard("jwt"))
  async getAdAccounts(
    @Param("connectionId") connectionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    this.logger.log(
      `Getting ad accounts for connection ${connectionId}, user ${userId}`,
    );

    const adAccounts = await this.metaService.fetchAdAccounts(
      connectionId,
      userId,
    );
    return {
      success: true,
      adAccounts: adAccounts.map((acc) => ({
        id: acc.id,
        name: acc.name,
        accountId: acc.account_id,
        accountStatus: mapAccountStatus(acc.account_status),
        currency: acc.currency,
        timezone: acc.timezone_name,
        businessName: acc.business_name,
      })),
    };
  }

  /**
   * Refresh connection token (re-validate with Facebook)
   * POST /meta/connections/:connectionId/refresh
   */
  @Post("connections/:connectionId/refresh-token")
  @UseGuards(AuthGuard("jwt"))
  async refreshConnectionToken(
    @Param("connectionId") connectionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    this.logger.log(
      `Refreshing token for connection ${connectionId}, user ${userId}`,
    );

    try {
      const result = await this.metaService.refreshConnectionToken(
        connectionId,
        userId,
      );
      return {
        success: true,
        message: "Token validated successfully",
        isValid: result.isValid,
        expiresAt: result.expiresAt,
      };
    } catch (err) {
      this.logger.error("Token refresh error:", err);
      return {
        success: false,
        error: err.message || "Failed to refresh token",
        requiresReconnect: true,
      };
    }
  }

  /**
   * Get all ad accounts for the user across all connections
   * GET /meta/ad-accounts
   */
  @Get("ad-accounts")
  @UseGuards(AuthGuard("jwt"))
  async getAllAdAccounts(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    this.logger.log(`Getting all ad accounts for user ${userId}`);

    const result = await this.metaService.getAllUserAdAccounts(userId);
    return {
      success: true,
      connections: result.map((conn) => ({
        connectionId: conn.connectionId,
        connectionName: conn.connectionName,
        adAccounts: conn.adAccounts.map((acc) => ({
          id: acc.id,
          name: acc.name,
          accountId: acc.account_id,
          accountStatus: acc.account_status,
          currency: acc.currency,
          timezone: acc.timezone_name,
          businessName: acc.business_name,
        })),
      })),
    };
  }

  // ============================================
  // DEV ONLY: Test Endpoints (No Auth Required)
  // ============================================

  /**
   * DEV ONLY: Republish a campaign for testing (no auth required)
   * POST /meta/test-republish/:id
   *
   * This endpoint is for development testing only.
   * It republishes an existing template to test the campaign creation flow.
   */
  @Post("test-republish/:id")
  async testRepublishCampaign(
    @Param("id") id: string,
    @Body() body: MetaTestRepublishDto,
  ) {
    // Only allow in development
    if (process.env.NODE_ENV === "production") {
      return {
        success: false,
        error:
          "Este endpoint só está disponível em ambiente de desenvolvimento",
      };
    }

    this.logger.warn(`[DEV TEST] Republishing campaign ${id} without auth`);

    // Get the template to find the user_id
    const template = await this.campaignService.getTemplateById(id);
    if (!template) {
      return {
        success: false,
        error: "Template não encontrado",
      };
    }

    this.logger.log(`[DEV TEST] Template found: ${template.name}`);
    this.logger.log(`[DEV TEST] User ID: ${template.user_id}`);

    // Log creative data for debugging
    const ads = template.campaign_data?.ads;
    const firstCreative = ads?.creatives?.[0] || ads?.creative;
    if (firstCreative) {
      this.logger.log(`[DEV TEST] linkUrl: ${firstCreative.linkUrl}`);
      this.logger.log(`[DEV TEST] displayUrl: ${firstCreative.displayUrl}`);
    }

    try {
      const result = await this.campaignService.publishCampaign(
        template.user_id,
        {
          templateId: id,
          dryRun: body.dryRun,
        },
      );

      return result;
    } catch (error) {
      this.logger.error(`[DEV TEST] Error:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
