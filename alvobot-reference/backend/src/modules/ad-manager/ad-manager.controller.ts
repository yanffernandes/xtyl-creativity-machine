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
import { AdManagerOAuthService } from "./services/ad-manager-oauth.service";
import { AdManagerReportService } from "./services/ad-manager-report.service";
import { ConfigService } from "@nestjs/config";
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  ArrayNotEmpty,
} from "class-validator";
import {
  SiteAnalysisRequestDto,
  RefreshCacheRequestDto,
  ConsolidatedMetricsRequestDto,
  SummaryRequestDto,
} from "./dto/site-analysis.dto";
import { UnifiedExpandRequestDto } from "./dto/expand.dto";
import { AdminService } from "../admin/admin.service";

// ============================================
// Inline DTOs (required for ValidationPipe whitelist)
// ============================================

class SyncNetworksDto {
  @IsString()
  connectionId: string;

  @IsOptional()
  @IsBoolean()
  forceActivate?: boolean;
}

class ValidateConnectionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  connectionIds: string[];
}

class UpdateNetworkDto {
  @IsString()
  networkId: string;

  @IsBoolean()
  isActive: boolean;

  @IsString()
  connectionId: string;
}

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

class InitiateOAuthDto {
  @IsString()
  connectionName: string;

  @IsString()
  workspaceId: string;

  @IsOptional()
  @IsString()
  reconnectConnectionId?: string;
}

@Controller("ad-manager")
export class AdManagerController {
  private readonly logger = new Logger(AdManagerController.name);

  constructor(
    private readonly adManagerOAuthService: AdManagerOAuthService,
    private readonly adManagerReportService: AdManagerReportService,
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Check Ad Manager OAuth configuration status
   * GET /ad-manager/config/status
   */
  @Get("config/status")
  @UseGuards(AuthGuard("jwt"))
  async checkConfigStatus() {
    const result = this.adManagerOAuthService.validateConfig();
    return result;
  }

  /**
   * Initiate OAuth flow - returns authorization URL
   * POST /ad-manager/oauth/initiate
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

    // Redirect URI must point to the unified callback endpoint
    const backendUrl = this.configService.get<string>("BACKEND_URL");
    const redirectUri = `${backendUrl}/connections/oauth/google/callback`;

    this.logger.log(
      `Initiating Ad Manager OAuth for user ${userId}, workspace ${workspaceId}, reconnect: ${dto.reconnectConnectionId || "no"}, redirectUri: ${redirectUri}`,
    );

    const { url } = await this.adManagerOAuthService.buildAuthorizationUrl(
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
   * GET /ad-manager/oauth/callback
   * This is called by Google after user authorizes
   * NOTE: This is the legacy callback endpoint, kept for backwards compatibility.
   * New integrations should use the unified /connections/oauth/google/callback endpoint.
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

    // Redirect URI must match exactly what was used in initiate
    const backendUrl = this.configService.get<string>("BACKEND_URL");
    const redirectUri = `${backendUrl}/ad-manager/oauth/callback`;

    // Handle errors from Google
    if (error) {
      this.logger.error(`OAuth error: ${error} - ${errorDescription}`);
      return res.redirect(
        `${frontendUrl}/callback/google?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || "")}`,
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${frontendUrl}/callback/google?error=missing_params&error_description=Missing code or state parameter`,
      );
    }

    try {
      const result = await this.adManagerOAuthService.exchangeCodeForToken(
        code,
        state,
        redirectUri,
      );

      // Redirect to frontend with connection ID
      const params = new URLSearchParams({
        success: "true",
        connection_id: result.connection.id,
        service: "ad_manager",
        networks_count: result.networks.length.toString(),
      });

      // Encode networks preview info (limited to prevent URL length issues)
      if (result.networks.length > 0) {
        const networksPreview = result.networks.slice(0, 5).map((n) => ({
          id: n.id,
          name: n.name,
          currencyCode: n.currencyCode,
        }));
        params.append(
          "networks_preview",
          Buffer.from(JSON.stringify(networksPreview)).toString("base64url"),
        );
      }

      return res.redirect(
        `${frontendUrl}/callback/google?${params.toString()}`,
      );
    } catch (err) {
      this.logger.error("OAuth callback error:", err);
      return res.redirect(
        `${frontendUrl}/callback/google?error=exchange_failed&error_description=${encodeURIComponent(err.message || "Failed to complete authentication")}`,
      );
    }
  }

  /**
   * Refresh access token for a connection
   * POST /ad-manager/oauth/refresh/:connectionId
   */
  @Post("oauth/refresh/:connectionId")
  @UseGuards(AuthGuard("jwt"))
  async refreshToken(
    @Req() req: AuthenticatedRequest,
    @Param("connectionId") connectionId: string,
  ) {
    const userId = req.user.sub;

    // Verify ownership first
    await this.adManagerOAuthService.verifyConnectionOwnership(
      connectionId,
      userId,
    );

    try {
      const result =
        await this.adManagerOAuthService.refreshAccessToken(connectionId);
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
   * Get networks from connection (legacy - from metadata)
   * GET /ad-manager/networks
   */
  @Get("networks")
  @UseGuards(AuthGuard("jwt"))
  async getNetworks(
    @Query("connectionId") connectionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;

    if (!connectionId) {
      return { networks: [] };
    }

    const networks = await this.adManagerOAuthService.getNetworksFromConnection(
      connectionId,
      userId,
    );

    return { networks };
  }

  /**
   * Sync networks from Ad Manager API to database
   * POST /ad-manager/networks/sync
   */
  @Post("networks/sync")
  @UseGuards(AuthGuard("jwt"))
  async syncNetworks(
    @Body() body: SyncNetworksDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    const workspaceId = req.headers["x-workspace-id"] as string;

    const result = await this.adManagerOAuthService.syncNetworksToDatabase(
      body.connectionId,
      userId,
      workspaceId,
    );

    // If forceActivate is true, activate all synced networks
    if (body.forceActivate) {
      this.logger.log(
        `Force activating all networks for connection ${body.connectionId}`,
      );
      // This will be handled in the sync method
    }

    return result;
  }

  /**
   * Get networks from database (with selection status)
   * GET /ad-manager/networks/list
   */
  @Get("networks/list")
  @UseGuards(AuthGuard("jwt"))
  async getNetworksList(
    @Query("connectionId") connectionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;

    if (!connectionId) {
      return { success: true, networks: [] };
    }

    return this.adManagerOAuthService.getNetworksList(connectionId, userId);
  }

  /**
   * Validate multiple connections (batch check for active networks)
   * POST /ad-manager/connections/validate
   * Optimized endpoint to check which connections have active networks
   */
  @Post("connections/validate")
  @UseGuards(AuthGuard("jwt"))
  async validateConnections(
    @Body() body: ValidateConnectionsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;

    return this.adManagerOAuthService.validateConnections(
      body.connectionIds,
      userId,
    );
  }

  /**
   * Update network selection status
   * POST /ad-manager/networks/update
   */
  @Post("networks/update")
  @UseGuards(AuthGuard("jwt"))
  async updateNetwork(
    @Body() body: UpdateNetworkDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;

    return this.adManagerOAuthService.updateNetworkStatus(
      body.networkId,
      body.isActive,
      userId,
      body.connectionId,
    );
  }

  /**
   * Fix network activation - activate all networks with valid data
   * POST /ad-manager/networks/fix-activation
   */
  @Post("networks/fix-activation")
  @UseGuards(AuthGuard("jwt"))
  async fixNetworkActivation(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.adManagerOAuthService.fixNetworkActivation(userId);
  }

  // ============================================
  // Report Endpoints (Dashboard)
  // ============================================

  /**
   * Get summary metrics (aggregated totals only, no dimensions)
   * POST /ad-manager/report/summary
   *
   * This is optimized for initial page load - fetches minimal data.
   * Use this for the "top view" totals, then use /report for detailed data on-demand.
   */
  @Post("report/summary")
  @UseGuards(AuthGuard("jwt"))
  async getReportSummary(
    @Body() dto: SummaryRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    return this.adManagerReportService.getSummary(dto, userId);
  }

  /**
   * Get site analysis report
   * POST /ad-manager/report
   */
  @Post("report")
  @UseGuards(AuthGuard("jwt"))
  async getReport(
    @Body() dto: SiteAnalysisRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    return this.adManagerReportService.getSiteAnalysis(dto, userId);
  }

  /**
   * Unified expand endpoint - supports both legacy and hierarchical formats
   * POST /ad-manager/report/expand
   *
   * Legacy format (level + parentSite):
   *   { level: 'date' | 'uri', parentSite: string, parentDate?: string, ... }
   *
   * Hierarchical format (primaryGroupBy + subGroupBy + parentKey):
   *   { primaryGroupBy: string, subGroupBy: string, parentKey: string, ... }
   */
  @Post("report/expand")
  @UseGuards(AuthGuard("jwt"))
  async expandReport(
    @Body() dto: UnifiedExpandRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;

    // Validate common required fields
    if (!dto.connectionId || !dto.networkId || !dto.startDate || !dto.endDate) {
      throw new Error(
        "Missing required fields: connectionId, networkId, startDate, endDate",
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dto.startDate) || !dateRegex.test(dto.endDate)) {
      throw new BadRequestException("Invalid date format. Expected YYYY-MM-DD");
    }

    // Validate date range
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException("Invalid date values");
    }

    if (startDate > endDate) {
      throw new BadRequestException("startDate cannot be after endDate");
    }

    if (endDate > today) {
      throw new BadRequestException("endDate cannot be in the future");
    }

    // Validate range is not more than 1 year (API limit)
    const oneYearInMs = 365 * 24 * 60 * 60 * 1000;
    if (endDate.getTime() - startDate.getTime() > oneYearInMs) {
      throw new BadRequestException(
        "Date range cannot exceed 1 year (API limitation)",
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
        "country",
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

      this.logger.log(
        `expand called: primaryGroupBy="${dto.primaryGroupBy}" (type: ${typeof dto.primaryGroupBy}), subGroupBy="${dto.subGroupBy}" (type: ${typeof dto.subGroupBy})`,
      );
      this.logger.log(
        `validSubGroupBy: ${JSON.stringify(validSubGroupBy)}, includes: ${validSubGroupBy.includes(dto.subGroupBy)}`,
      );

      if (!validPrimaryGroupBy.includes(dto.primaryGroupBy)) {
        throw new Error(`Invalid primaryGroupBy: ${dto.primaryGroupBy}`);
      }
      if (!validSubGroupBy.includes(dto.subGroupBy)) {
        throw new Error(`Invalid subGroupBy: ${dto.subGroupBy}`);
      }

      return this.adManagerReportService.expandHierarchical(
        {
          connectionId: dto.connectionId,
          networkId: dto.networkId,
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
      if (!["date", "uri"].includes(dto.level)) {
        throw new Error(`Invalid level: ${dto.level}`);
      }

      return this.adManagerReportService.expandLevel(
        {
          connectionId: dto.connectionId,
          networkId: dto.networkId,
          startDate: dto.startDate,
          endDate: dto.endDate,
          level: dto.level as "date" | "uri",
          parentSite: dto.parentSite,
          parentDate: dto.parentDate,
          sortBy: dto.sortBy,
          sortOrder: (dto.sortOrder as "asc" | "desc") || "desc",
          forceRefresh: dto.forceRefresh,
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
   * Force refresh cache for a network
   * POST /ad-manager/report/refresh
   */
  @Post("report/refresh")
  @UseGuards(AuthGuard("jwt"))
  async refreshReportCache(
    @Body() dto: RefreshCacheRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;

    // Verify ownership
    await this.adManagerOAuthService.verifyConnectionOwnership(
      dto.connectionId,
      userId,
    );

    // Invalidate cache
    await this.adManagerReportService.invalidateCache(
      dto.connectionId,
      dto.networkId,
    );

    return {
      success: true,
      message: `Cache invalidated for network ${dto.networkId}`,
    };
  }

  /**
   * Get consolidated metrics for land_uri data
   * Used by Google Ads dashboard to display Ad Manager revenue data
   * POST /ad-manager/consolidated-metrics
   */
  @Post("consolidated-metrics")
  @UseGuards(AuthGuard("jwt"))
  async getConsolidatedMetrics(
    @Body() dto: ConsolidatedMetricsRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    return this.adManagerReportService.getConsolidatedMetrics(dto, userId);
  }
}
