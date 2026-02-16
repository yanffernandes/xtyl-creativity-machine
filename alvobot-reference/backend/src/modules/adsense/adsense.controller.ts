import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  Req,
  Res,
  UseGuards,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Response, Request } from "express";
import { ConfigService } from "@nestjs/config";
import { AdSenseOAuthService } from "./services/adsense-oauth.service";
import { AdSenseApiService } from "./services/adsense-api.service";
import {
  InitiateAdSenseOAuthDto,
  GenerateAdSenseReportDto,
  RefreshAdSenseCacheDto,
  UnifiedAdSenseExpandDto,
  AdSenseSummaryRequestDto,
} from "./dto/adsense-report.dto";

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@Controller("adsense")
export class AdSenseController {
  private readonly logger = new Logger(AdSenseController.name);

  constructor(
    private readonly adSenseOAuthService: AdSenseOAuthService,
    private readonly adSenseApiService: AdSenseApiService,
    private readonly configService: ConfigService,
  ) {}

  // ============================================
  // OAuth Endpoints
  // ============================================

  /**
   * Check AdSense OAuth configuration status
   * GET /adsense/config/status
   */
  @Get("config/status")
  @UseGuards(AuthGuard("jwt"))
  async checkConfigStatus() {
    const result = this.adSenseOAuthService.validateConfig();
    return result;
  }

  /**
   * Initiate OAuth flow - returns authorization URL
   * POST /adsense/oauth/initiate
   */
  @Post("oauth/initiate")
  @UseGuards(AuthGuard("jwt"))
  async initiateOAuth(
    @Body() dto: InitiateAdSenseOAuthDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    const workspaceId =
      dto.workspaceId || (req.headers["x-workspace-id"] as string);

    // Verify workspace membership if workspaceId is provided
    if (workspaceId) {
      const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
      const supabaseKey =
        this.configService.get<string>("SUPABASE_SERVICE_KEY");
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
        throw new BadRequestException("Você não tem acesso a este workspace");
      }
    }

    const backendUrl = this.configService.get<string>("BACKEND_URL");
    const redirectUri = `${backendUrl}/connections/oauth/google/callback`;

    this.logger.log(
      `Initiating AdSense OAuth for user ${userId}, workspace ${workspaceId}, reconnect: ${dto.reconnectConnectionId || "no"}`,
    );

    const { url } = await this.adSenseOAuthService.buildAuthorizationUrl(
      userId,
      dto.connectionName,
      redirectUri,
      workspaceId,
      dto.reconnectConnectionId,
    );

    return {
      success: true,
      authorizationUrl: url,
    };
  }

  /**
   * OAuth callback - exchanges code for token
   * GET /adsense/oauth/callback
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

    const backendUrl = this.configService.get<string>("BACKEND_URL");
    const redirectUri = `${backendUrl}/adsense/oauth/callback`;

    // Handle errors from Google
    if (error) {
      this.logger.error(`OAuth error: ${error} - ${errorDescription}`);
      return res.redirect(
        `${frontendUrl}/callback/adsense?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || "")}`,
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${frontendUrl}/callback/adsense?error=missing_params&error_description=Missing code or state parameter`,
      );
    }

    try {
      const result = await this.adSenseOAuthService.exchangeCodeForToken(
        code,
        state,
        redirectUri,
      );

      const params = new URLSearchParams({
        success: "true",
        connection_id: result.connection.id,
        accounts_count: result.accounts.length.toString(),
      });

      // Encode accounts preview info (limited to prevent URL length issues)
      if (result.accounts.length > 0) {
        const accountsPreview = result.accounts.slice(0, 5).map((a) => ({
          id: a.id,
          displayName: a.displayName,
          currencyCode: a.currencyCode,
        }));
        params.append(
          "accounts_preview",
          Buffer.from(JSON.stringify(accountsPreview)).toString("base64url"),
        );
      }

      return res.redirect(
        `${frontendUrl}/callback/adsense?${params.toString()}`,
      );
    } catch (err) {
      this.logger.error("OAuth callback error:", err);
      return res.redirect(
        `${frontendUrl}/callback/adsense?error=exchange_failed&error_description=${encodeURIComponent(err.message || "Failed to complete authentication")}`,
      );
    }
  }

  /**
   * Refresh access token for a connection
   * POST /adsense/oauth/refresh/:connectionId
   */
  @Post("oauth/refresh/:connectionId")
  @UseGuards(AuthGuard("jwt"))
  async refreshToken(
    @Req() req: AuthenticatedRequest,
    @Param("connectionId") connectionId: string,
  ) {
    const userId = req.user.sub;

    await this.adSenseOAuthService.verifyConnectionOwnership(
      connectionId,
      userId,
    );

    try {
      const result =
        await this.adSenseOAuthService.refreshAccessToken(connectionId);
      return {
        success: true,
        message: "Token refreshed successfully",
        expiresAt: result.expiresAt,
      };
    } catch (err) {
      this.logger.error("Token refresh error:", err);
      return {
        success: false,
        error: err.message || "Failed to refresh token",
        requiresReconnect: err.message?.includes("reconnect"),
      };
    }
  }

  /**
   * Get AdSense accounts from connection
   * GET /adsense/accounts
   */
  @Get("accounts")
  @UseGuards(AuthGuard("jwt"))
  async getAccounts(
    @Query("connectionId") connectionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;

    if (!connectionId) {
      return { accounts: [] };
    }

    const accounts = await this.adSenseOAuthService.getAccountsFromConnection(
      connectionId,
      userId,
    );

    return { accounts };
  }

  // ============================================
  // Report Endpoints
  // ============================================

  /**
   * Get summary metrics (aggregated totals only, no dimensions)
   * POST /adsense/report/summary
   *
   * This is optimized for initial page load - fetches minimal data.
   * Use this for the "top view" totals, then use /report for detailed data on-demand.
   */
  @Post("report/summary")
  @UseGuards(AuthGuard("jwt"))
  async getReportSummary(
    @Body() dto: AdSenseSummaryRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    return this.adSenseApiService.getSummary(dto, userId);
  }

  /**
   * Generate AdSense report
   * POST /adsense/report
   */
  @Post("report")
  @UseGuards(AuthGuard("jwt"))
  async generateReport(
    @Body() dto: GenerateAdSenseReportDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    return this.adSenseApiService.generateReport(dto, userId);
  }

  /**
   * Unified expand endpoint - supports both legacy and hierarchical formats
   * POST /adsense/report/expand
   *
   * Legacy format (level + parentSite):
   *   { level: 'date' | 'url', parentSite: string, parentDate?: string, ... }
   *
   * Hierarchical format (primaryGroupBy + subGroupBy + parentKey):
   *   { primaryGroupBy: string, subGroupBy: string, parentKey: string, ... }
   */
  @Post("report/expand")
  @UseGuards(AuthGuard("jwt"))
  async expandReport(
    @Body() dto: UnifiedAdSenseExpandDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;

    // Validate common required fields
    if (!dto.connectionId || !dto.accountId || !dto.startDate || !dto.endDate) {
      throw new Error(
        "Missing required fields: connectionId, accountId, startDate, endDate",
      );
    }

    // Detect if this is a hierarchical request (has primaryGroupBy and subGroupBy)
    if (dto.primaryGroupBy && dto.subGroupBy && dto.parentKey) {
      // Validate hierarchical field values
      const validPrimaryGroupBy = [
        "domain",
        "url",
        "url_full",
        "date_day",
        "date_week",
        "date_month",
      ];
      const validSubGroupBy = [
        "none",
        "total",
        "date_day",
        "date_week",
        "date_month",
        "url",
        "url_full",
        "domain",
      ];

      if (!validPrimaryGroupBy.includes(dto.primaryGroupBy)) {
        throw new Error(`Invalid primaryGroupBy: ${dto.primaryGroupBy}`);
      }
      if (!validSubGroupBy.includes(dto.subGroupBy)) {
        throw new Error(`Invalid subGroupBy: ${dto.subGroupBy}`);
      }

      return this.adSenseApiService.expandHierarchical(
        {
          connectionId: dto.connectionId,
          accountId: dto.accountId,
          startDate: dto.startDate,
          endDate: dto.endDate,
          primaryGroupBy: dto.primaryGroupBy as
            | "domain"
            | "url"
            | "url_full"
            | "date_day"
            | "date_week"
            | "date_month",
          subGroupBy: dto.subGroupBy as
            | "none"
            | "total"
            | "date_day"
            | "date_week"
            | "date_month"
            | "url"
            | "url_full"
            | "domain",
          parentKey: dto.parentKey,
          sortBy: dto.sortBy,
          sortOrder: (dto.sortOrder as "asc" | "desc") || "desc",
          forceRefresh: dto.forceRefresh,
        },
        userId,
      );
    }

    // Legacy format
    if (dto.level && dto.parentSite) {
      // Validate legacy field values
      if (!["date", "url"].includes(dto.level)) {
        throw new Error(`Invalid level: ${dto.level}`);
      }

      return this.adSenseApiService.expandReport(
        {
          connectionId: dto.connectionId,
          accountId: dto.accountId,
          startDate: dto.startDate,
          endDate: dto.endDate,
          level: dto.level as "date" | "url",
          parentSite: dto.parentSite,
          parentDate: dto.parentDate,
          sortBy: dto.sortBy,
          sortOrder: (dto.sortOrder as "asc" | "desc") || "desc",
        },
        userId,
      );
    }

    // Invalid request
    throw new Error(
      "Invalid expand request: must provide either (level + parentSite) or (primaryGroupBy + subGroupBy + parentKey)",
    );
  }

  /**
   * Force refresh cache for an account
   * POST /adsense/report/refresh
   */
  @Post("report/refresh")
  @UseGuards(AuthGuard("jwt"))
  async refreshCache(
    @Body() dto: RefreshAdSenseCacheDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;

    await this.adSenseOAuthService.verifyConnectionOwnership(
      dto.connectionId,
      userId,
    );
    await this.adSenseApiService.invalidateCache(
      dto.connectionId,
      dto.accountId,
    );

    return {
      success: true,
      message: `Cache invalidated for account ${dto.accountId}`,
    };
  }
}
