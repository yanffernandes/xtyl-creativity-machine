import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Query,
  Param,
  Req,
  Res,
  UseGuards,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import {
  IsString,
  IsBoolean,
  IsArray,
  ArrayNotEmpty,
} from "class-validator";
import { AuthGuard } from "@nestjs/passport";

// ============================================
// Inline DTOs (required for ValidationPipe whitelist)
// ============================================

class SCConnectionIdDto {
  @IsString()
  connectionId: string;
}

class SCPropertyStatusDto {
  @IsString()
  site_url: string;

  @IsBoolean()
  is_active: boolean;
}

class SCBulkPropertyStatusDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  siteUrls: string[];

  @IsBoolean()
  is_active: boolean;
}
import { Response, Request } from "express";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SearchConsoleOAuthService } from "./services/search-console-oauth.service";
import { InitiateSearchConsoleOAuthDto } from "./dto/initiate-oauth.dto";
import { InspectUrlDto } from "./dto/inspect-url.dto";
import { InspectBatchDto } from "./dto/inspect-batch.dto";
import { IndexUrlDto } from "./dto/index-url.dto";
import { BatchIndexDto } from "./dto/batch-index.dto";
import { AutoRunDto } from "./dto/auto-run.dto";
import {
  DetectSitemapsDto,
  CreateSitemapDto,
  UpdateSitemapDto,
  SyncSitemapDto,
} from "./dto/sitemaps.dto";
import { ListUrlsDto, StatsQueryDto, StatsHistoryDto } from "./dto/urls.dto";
import {
  SearchAnalyticsReportDto,
  SearchAnalyticsExpandDto,
} from "./dto/search-analytics.dto";
import { SearchConsoleService } from "./search-console.service";
import { SearchConsoleAnalyticsService } from "./search-console-analytics.service";
import { SitemapService } from "./sitemap.service";
import { IndexingStatsService } from "./indexing-stats.service";
import {
  SearchConsoleErrorCodes,
  mapSearchConsoleError,
} from "./search-console.errors";
import { AdminService } from "../admin/admin.service";

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@Controller("search-console")
export class SearchConsoleController {
  private readonly logger = new Logger(SearchConsoleController.name);
  private supabase: SupabaseClient;

  constructor(
    private readonly searchConsoleOAuthService: SearchConsoleOAuthService,
    private readonly configService: ConfigService,
    private readonly searchConsoleService: SearchConsoleService,
    private readonly adminService: AdminService,
    private readonly analyticsService: SearchConsoleAnalyticsService,
    private readonly sitemapService: SitemapService,
    private readonly indexingStatsService: IndexingStatsService,
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

  private async ensureWorkspaceAccess(userId: string, workspaceId?: string) {
    if (!workspaceId) {
      throw new BadRequestException("workspace_id is required");
    }

    const isAdmin = await this.adminService.isAdmin(userId);
    if (isAdmin) return;

    const { data } = await this.supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (!data) {
      throw new BadRequestException("Access denied");
    }
  }

  private async ensureProjectAccess(userId: string, projectId: string) {
    const { data: project, error } = await this.supabase
      .from("projects")
      .select("id, user_id, workspace_id, domain")
      .eq("id", projectId)
      .single();

    if (error || !project) {
      throw new BadRequestException("Project not found");
    }

    const isAdmin = await this.adminService.isAdmin(userId);
    if (isAdmin || project.user_id === userId) return project;

    if (project.workspace_id) {
      const { data: membership } = await this.supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", project.workspace_id)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (membership) return project;
    }

    throw new BadRequestException("Access denied");
  }

  // ============================================
  // OAuth Endpoints
  // ============================================

  /**
   * Check Search Console OAuth configuration status
   * GET /search-console/config/status
   */
  @Get("config/status")
  @UseGuards(AuthGuard("jwt"))
  async checkConfigStatus() {
    const result = this.searchConsoleOAuthService.validateConfig();
    return result;
  }

  /**
   * Initiate OAuth flow - returns authorization URL
   * POST /search-console/oauth/initiate
   */
  @Post("oauth/initiate")
  @UseGuards(AuthGuard("jwt"))
  async initiateOAuth(
    @Body() dto: InitiateSearchConsoleOAuthDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    const workspaceId =
      dto.workspaceId || (req.headers["x-workspace-id"] as string);

    // Verify workspace membership if workspaceId is provided
    if (workspaceId) {
      const { data: membership } = await this.supabase
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
      `Initiating Search Console OAuth for user ${userId}, workspace ${workspaceId}, reconnect: ${dto.reconnectConnectionId || "no"}`,
    );

    const { url } = await this.searchConsoleOAuthService.buildAuthorizationUrl(
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
   * GET /search-console/oauth/callback
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
    const redirectUri = `${backendUrl}/search-console/oauth/callback`;

    // Handle errors from Google
    if (error) {
      this.logger.error(`OAuth error: ${error} - ${errorDescription}`);
      return res.redirect(
        `${frontendUrl}/callback/search-console?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || "")}`,
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${frontendUrl}/callback/search-console?error=missing_params&error_description=Missing code or state parameter`,
      );
    }

    try {
      const result = await this.searchConsoleOAuthService.exchangeCodeForToken(
        code,
        state,
        redirectUri,
      );

      const params = new URLSearchParams({
        success: "true",
        connection_id: result.connection.id,
        sites_count: result.sites.length.toString(),
      });

      // Encode sites preview info (limited to prevent URL length issues)
      if (result.sites.length > 0) {
        const sitesPreview = result.sites.slice(0, 10).map((s) => ({
          siteUrl: s.siteUrl,
          permissionLevel: s.permissionLevel,
        }));
        params.append(
          "sites_preview",
          Buffer.from(JSON.stringify(sitesPreview)).toString("base64url"),
        );
      }

      return res.redirect(
        `${frontendUrl}/callback/search-console?${params.toString()}`,
      );
    } catch (err) {
      this.logger.error("OAuth callback error:", err);
      return res.redirect(
        `${frontendUrl}/callback/search-console?error=exchange_failed&error_description=${encodeURIComponent(err.message || "Failed to complete authentication")}`,
      );
    }
  }

  /**
   * Refresh access token for a connection
   * POST /search-console/oauth/refresh/:connectionId
   */
  @Post("oauth/refresh/:connectionId")
  @UseGuards(AuthGuard("jwt"))
  async refreshToken(
    @Req() req: AuthenticatedRequest,
    @Param("connectionId") connectionId: string,
  ) {
    const userId = req.user.sub;

    await this.searchConsoleOAuthService.verifyConnectionOwnership(
      connectionId,
      userId,
    );

    try {
      const result =
        await this.searchConsoleOAuthService.refreshAccessToken(connectionId);
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
   * Get Search Console sites from connection
   * GET /search-console/sites
   */
  @Get("sites")
  @UseGuards(AuthGuard("jwt"))
  async getSites(
    @Query("connectionId") connectionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;

    if (!connectionId) {
      return { sites: [] };
    }

    const sites = await this.searchConsoleOAuthService.getSitesFromConnection(
      connectionId,
      userId,
    );

    return { sites };
  }

  /**
   * Refresh sites list from Google
   * POST /search-console/sites/refresh
   */
  @Post("sites/refresh")
  @UseGuards(AuthGuard("jwt"))
  async refreshSites(
    @Body() body: SCConnectionIdDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    const { connectionId } = body;

    // Get connection with valid token
    const connection =
      await this.searchConsoleOAuthService.getConnectionWithValidToken(
        connectionId,
        userId,
      );

    // Fetch fresh sites
    const sites = await this.searchConsoleOAuthService.fetchSites(
      connection.access_token,
    );

    return { sites };
  }

  // ============================================
  // Indexing & Inspection Endpoints
  // ============================================

  @Post("inspect")
  @UseGuards(AuthGuard("jwt"))
  async inspectUrl(
    @Body() dto: InspectUrlDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const workspaceId = (req.headers["x-workspace-id"] as string) || "";
    const correlationId =
      (req.headers["x-correlation-id"] as string) || randomUUID();
    const result = await this.searchConsoleService.inspectUrl({
      userId: req.user.sub,
      workspaceId,
      connectionId: dto.connectionId,
      url: dto.url,
      propertyId: dto.propertyId,
      forceRefresh: dto.forceRefresh,
      correlationId,
    });
    return { status: result };
  }

  @Post("inspect/batch")
  @UseGuards(AuthGuard("jwt"))
  async inspectBatch(
    @Body() dto: InspectBatchDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const workspaceId = (req.headers["x-workspace-id"] as string) || "";
    const correlationId =
      (req.headers["x-correlation-id"] as string) || randomUUID();
    const result = await this.searchConsoleService.inspectUrlsBatch({
      userId: req.user.sub,
      workspaceId,
      connectionId: dto.connectionId,
      urls: dto.urls,
      propertyId: dto.propertyId,
      forceRefresh: dto.forceRefresh,
      correlationId,
    });
    return { statuses: result };
  }

  @Post("index")
  @UseGuards(AuthGuard("jwt"))
  async requestIndex(
    @Body() dto: IndexUrlDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const workspaceId = (req.headers["x-workspace-id"] as string) || "";
    const correlationId =
      (req.headers["x-correlation-id"] as string) || randomUUID();
    const result = await this.searchConsoleService.requestIndexing({
      userId: req.user.sub,
      workspaceId,
      connectionId: dto.connectionId,
      url: dto.url,
      articleId: dto.articleId,
      requestType: dto.requestType,
      correlationId,
    });
    if (result.status === "blocked") {
      return {
        status: "blocked",
        reason: result.blocked_reason,
        message: mapSearchConsoleError(
          (result.blocked_reason as any) ||
            SearchConsoleErrorCodes.INELIGIBLE_URL,
        ),
      };
    }
    return { status: result.status, id: result.id };
  }

  @Post("index/batch")
  @UseGuards(AuthGuard("jwt"))
  async requestIndexBatch(
    @Body() dto: BatchIndexDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const workspaceId = (req.headers["x-workspace-id"] as string) || "";
    const correlationId =
      (req.headers["x-correlation-id"] as string) || randomUUID();
    const results = await this.searchConsoleService.requestIndexingBatch({
      userId: req.user.sub,
      workspaceId,
      connectionId: dto.connectionId,
      items: dto.items,
      correlationId,
    });
    return { queued: results.length };
  }

  @Get("quota")
  @UseGuards(AuthGuard("jwt"))
  async getQuota(@Query("connectionId") connectionId: string) {
    const quota = await this.searchConsoleService.getQuota(connectionId);
    return { quota };
  }

  @Post("auto-run")
  @UseGuards(AuthGuard("jwt"))
  async autoRun(@Body() dto: AutoRunDto, @Req() req: AuthenticatedRequest) {
    const workspaceId = (req.headers["x-workspace-id"] as string) || "";
    const result = await this.searchConsoleService.autoRun(
      dto.connectionId,
      req.user.sub,
      workspaceId,
    );
    return result;
  }

  // ============================================
  // Sitemap Management Endpoints
  // ============================================

  @Get("sitemaps/:projectId")
  @UseGuards(AuthGuard("jwt"))
  async listSitemaps(
    @Req() req: AuthenticatedRequest,
    @Param("projectId") projectId: string,
  ) {
    await this.ensureProjectAccess(req.user.sub, projectId);
    const sitemaps = await this.sitemapService.listProjectSitemaps(projectId);
    return { sitemaps };
  }

  @Post("sitemaps/:projectId/detect")
  @UseGuards(AuthGuard("jwt"))
  async detectSitemaps(
    @Req() req: AuthenticatedRequest,
    @Param("projectId") projectId: string,
    @Body() _dto: DetectSitemapsDto,
  ) {
    const project = await this.ensureProjectAccess(req.user.sub, projectId);
    const workspaceId =
      project.workspace_id || (req.headers["x-workspace-id"] as string);
    const sitemaps = await this.sitemapService.detectSitemaps(
      projectId,
      workspaceId,
    );
    return { sitemaps };
  }

  @Post("sitemaps/:projectId")
  @UseGuards(AuthGuard("jwt"))
  async createSitemap(
    @Req() req: AuthenticatedRequest,
    @Param("projectId") projectId: string,
    @Body() dto: CreateSitemapDto,
  ) {
    const project = await this.ensureProjectAccess(req.user.sub, projectId);
    const workspaceId =
      project.workspace_id || (req.headers["x-workspace-id"] as string);
    const sitemap = await this.sitemapService.createSitemap(
      projectId,
      workspaceId,
      {
        url: dto.url,
        isPrimary: dto.isPrimary,
      },
    );
    return { sitemap };
  }

  @Put("sitemaps/:sitemapId")
  @UseGuards(AuthGuard("jwt"))
  async updateSitemap(
    @Req() req: AuthenticatedRequest,
    @Param("sitemapId") sitemapId: string,
    @Body() dto: UpdateSitemapDto,
  ) {
    await this.ensureWorkspaceAccess(
      req.user.sub,
      req.headers["x-workspace-id"] as string,
    );
    const sitemap = await this.sitemapService.updateSitemap(sitemapId, {
      url: dto.url,
      isPrimary: dto.isPrimary,
      isEnabled: dto.isEnabled,
    });
    return { sitemap };
  }

  @Delete("sitemaps/:sitemapId")
  @UseGuards(AuthGuard("jwt"))
  async deleteSitemap(
    @Req() req: AuthenticatedRequest,
    @Param("sitemapId") sitemapId: string,
  ) {
    await this.ensureWorkspaceAccess(
      req.user.sub,
      req.headers["x-workspace-id"] as string,
    );
    return this.sitemapService.deleteSitemap(sitemapId);
  }

  @Post("sitemaps/:sitemapId/sync")
  @UseGuards(AuthGuard("jwt"))
  async syncSitemap(
    @Req() req: AuthenticatedRequest,
    @Param("sitemapId") sitemapId: string,
    @Body() dto: SyncSitemapDto,
  ) {
    await this.ensureWorkspaceAccess(
      req.user.sub,
      req.headers["x-workspace-id"] as string,
    );
    const result = await this.sitemapService.syncSitemap(sitemapId, {
      connectionId: dto.connectionId,
    });
    return result;
  }

  // ============================================
  // URL Listing & Stats
  // ============================================

  @Get("urls")
  @UseGuards(AuthGuard("jwt"))
  async listUrls(
    @Req() req: AuthenticatedRequest,
    @Query() query: ListUrlsDto,
  ) {
    const workspaceId = (req.headers["x-workspace-id"] as string) || "";
    await this.ensureWorkspaceAccess(req.user.sub, workspaceId);

    const result = await this.sitemapService.listUrls({
      workspaceId,
      projectId: query.projectId,
      sitemapId: query.sitemapId,
      connectionId: query.connectionId,
      status: query.status,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
    return result;
  }

  @Post("urls/inspect-batch")
  @UseGuards(AuthGuard("jwt"))
  async inspectBatchV2(
    @Body() dto: InspectBatchDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const workspaceId = (req.headers["x-workspace-id"] as string) || "";
    const correlationId =
      (req.headers["x-correlation-id"] as string) || randomUUID();
    const result = await this.searchConsoleService.inspectUrlsBatch({
      userId: req.user.sub,
      workspaceId,
      connectionId: dto.connectionId,
      urls: dto.urls,
      propertyId: dto.propertyId,
      forceRefresh: dto.forceRefresh,
      correlationId,
    });
    return { statuses: result };
  }

  @Post("urls/index-batch")
  @UseGuards(AuthGuard("jwt"))
  async requestIndexBatchV2(
    @Body() dto: BatchIndexDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const workspaceId = (req.headers["x-workspace-id"] as string) || "";
    const correlationId =
      (req.headers["x-correlation-id"] as string) || randomUUID();
    const results = await this.searchConsoleService.requestIndexingBatch({
      userId: req.user.sub,
      workspaceId,
      connectionId: dto.connectionId,
      items: dto.items,
      correlationId,
    });
    return { queued: results.length };
  }

  @Get("stats")
  @UseGuards(AuthGuard("jwt"))
  async getStats(
    @Req() req: AuthenticatedRequest,
    @Query() query: StatsQueryDto,
  ) {
    const workspaceId = (req.headers["x-workspace-id"] as string) || "";
    await this.ensureWorkspaceAccess(req.user.sub, workspaceId);
    const stats = await this.indexingStatsService.getCurrentStats(workspaceId, {
      projectId: query.projectId,
      connectionId: query.connectionId,
    });
    return { stats };
  }

  @Get("stats/history")
  @UseGuards(AuthGuard("jwt"))
  async getStatsHistory(
    @Req() req: AuthenticatedRequest,
    @Query() query: StatsHistoryDto,
  ) {
    const workspaceId = (req.headers["x-workspace-id"] as string) || "";
    await this.ensureWorkspaceAccess(req.user.sub, workspaceId);
    const history = await this.indexingStatsService.getHistory({
      workspaceId,
      projectId: query.projectId,
      connectionId: query.connectionId,
      startDate: query.startDate,
      endDate: query.endDate,
    });
    return { history };
  }

  // ============================================
  // Property Activation Endpoints
  // ============================================

  /**
   * Get stored Search Console properties for a connection (from database)
   * GET /search-console/properties/:connectionId/stored
   */
  @Get("properties/:connectionId/stored")
  @UseGuards(AuthGuard("jwt"))
  async getStoredProperties(
    @Req() req: AuthenticatedRequest,
    @Param("connectionId") connectionId: string,
  ) {
    const userId = req.user.sub;

    // Verify user has access to the connection
    const { data: connection, error: connError } = await this.supabase
      .from("connections")
      .select("id, workspace_id, user_id, metadata")
      .eq("id", connectionId)
      .eq("plataform_name", "google")
      .single();

    if (connError || !connection) {
      throw new BadRequestException("Connection not found");
    }

    // Check if it's a Search Console connection
    if (connection.metadata?.type !== "search_console") {
      throw new BadRequestException("Not a Search Console connection");
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

    // Get stored properties
    const { data: properties, error } = await this.supabase
      .from("search_console_properties")
      .select("*")
      .eq("connection_id", connectionId)
      .order("is_active", { ascending: false })
      .order("site_url", { ascending: true });

    if (error) {
      this.logger.error(`Failed to get stored properties: ${error.message}`);
      throw new BadRequestException("Failed to get stored properties");
    }

    return {
      success: true,
      properties: properties || [],
    };
  }

  /**
   * Sync Search Console properties - fetches all sites from API and stores in database
   * POST /search-console/properties/:connectionId/sync
   */
  @Post("properties/:connectionId/sync")
  @UseGuards(AuthGuard("jwt"))
  async syncProperties(
    @Req() req: AuthenticatedRequest,
    @Param("connectionId") connectionId: string,
  ) {
    const userId = req.user.sub;

    // Get connection with valid token
    const connection =
      await this.searchConsoleOAuthService.getConnectionWithValidToken(
        connectionId,
        userId,
      );

    // Verify it's a Search Console connection
    if (connection.metadata?.type !== "search_console") {
      throw new BadRequestException("Not a Search Console connection");
    }

    try {
      // Fetch fresh sites from Google
      const sites = await this.searchConsoleOAuthService.fetchSites(
        connection.access_token,
      );

      this.logger.log(
        `Syncing ${sites.length} properties for connection ${connectionId}`,
      );

      // Get existing properties to preserve is_active status
      const { data: existingProperties } = await this.supabase
        .from("search_console_properties")
        .select("site_url, is_active")
        .eq("connection_id", connectionId);

      const existingMap = new Map(
        (existingProperties || []).map((p) => [p.site_url, p.is_active]),
      );

      // Upsert all properties
      const propertiesToUpsert = sites.map((site: any) => ({
        connection_id: connectionId,
        user_id: connection.user_id,
        workspace_id: connection.workspace_id,
        site_url: site.siteUrl,
        property_type: site.siteUrl.startsWith("sc-domain:")
          ? "DOMAIN"
          : "URL_PREFIX",
        ownership: site.permissionLevel || "siteOwner",
        // Preserve existing is_active status, default to false for new properties
        is_active: existingMap.has(site.siteUrl)
          ? existingMap.get(site.siteUrl)
          : false,
      }));

      if (propertiesToUpsert.length > 0) {
        const { error: upsertError } = await this.supabase
          .from("search_console_properties")
          .upsert(propertiesToUpsert, {
            onConflict: "connection_id,site_url",
          });

        if (upsertError) {
          this.logger.error(
            `Failed to upsert properties: ${upsertError.message}`,
          );
          throw new BadRequestException("Failed to save properties");
        }
      }

      // Fetch the updated properties
      const { data: updatedProperties } = await this.supabase
        .from("search_console_properties")
        .select("*")
        .eq("connection_id", connectionId)
        .order("is_active", { ascending: false })
        .order("site_url", { ascending: true });

      return {
        success: true,
        synced: propertiesToUpsert.length,
        properties: updatedProperties || [],
      };
    } catch (err: any) {
      this.logger.error(`Failed to sync properties: ${err.message}`);
      return {
        success: false,
        properties: [],
        error: err.message || "Failed to sync properties",
      };
    }
  }

  /**
   * Update Search Console property status (enable/disable)
   * POST /search-console/properties/:connectionId/status
   */
  @Post("properties/:connectionId/status")
  @UseGuards(AuthGuard("jwt"))
  async updatePropertyStatus(
    @Req() req: AuthenticatedRequest,
    @Param("connectionId") connectionId: string,
    @Body() body: SCPropertyStatusDto,
  ) {
    const userId = req.user.sub;

    // Verify user has access to the property
    const { data: property, error: propError } = await this.supabase
      .from("search_console_properties")
      .select("*, connections!inner(workspace_id, user_id, is_active, deleted_at)")
      .eq("connection_id", connectionId)
      .eq("site_url", body.site_url)
      .eq("connections.is_active", true)
      .is("connections.deleted_at", null)
      .single();

    if (propError || !property) {
      throw new BadRequestException("Property not found");
    }

    const connection = (property as any).connections;

    // OWNERSHIP CHECK: Only connection creator OR super admin can edit
    const isCreator = connection.user_id === userId;
    const isAdmin = await this.adminService.isAdmin(userId);

    if (!isCreator && !isAdmin) {
      throw new BadRequestException(
        "Only the connection creator or system administrators can modify property settings",
      );
    }

    // Update the property status
    const { error: updateError } = await this.supabase
      .from("search_console_properties")
      .update({ is_active: body.is_active })
      .eq("connection_id", connectionId)
      .eq("site_url", body.site_url);

    if (updateError) {
      this.logger.error(
        `Failed to update property status: ${updateError.message}`,
      );
      throw new BadRequestException("Failed to update property status");
    }

    return { success: true };
  }

  /**
   * Bulk update Search Console properties status
   * POST /search-console/properties/:connectionId/bulk-status
   */
  @Post("properties/:connectionId/bulk-status")
  @UseGuards(AuthGuard("jwt"))
  async bulkUpdatePropertyStatus(
    @Req() req: AuthenticatedRequest,
    @Param("connectionId") connectionId: string,
    @Body() body: SCBulkPropertyStatusDto,
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
        "Only the connection creator or system administrators can modify property settings",
      );
    }

    // Update all properties
    const { error: updateError } = await this.supabase
      .from("search_console_properties")
      .update({ is_active: body.is_active })
      .eq("connection_id", connectionId)
      .in("site_url", body.siteUrls);

    if (updateError) {
      this.logger.error(
        `Failed to bulk update properties: ${updateError.message}`,
      );
      throw new BadRequestException("Failed to update properties");
    }

    return { success: true, updated: body.siteUrls.length };
  }

  // ============================================
  // Search Analytics Endpoints (Report & Expand)
  // ============================================

  /**
   * Get Search Console analytics report
   * POST /search-console/report
   */
  @Post("report")
  @UseGuards(AuthGuard("jwt"))
  async getReport(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SearchAnalyticsReportDto,
  ) {
    const userId = req.user.sub;
    this.logger.log(`User ${userId} requesting Search Console report`);

    try {
      return await this.analyticsService.getReport(dto, userId);
    } catch (error) {
      this.logger.error(
        `Failed to get Search Console report: ${error.message}`,
      );
      throw new BadRequestException(
        error.message || "Failed to fetch Search Console report",
      );
    }
  }

  /**
   * Expand a row to show sub-grouping data
   * POST /search-console/expand
   */
  @Post("expand")
  @UseGuards(AuthGuard("jwt"))
  async expandRow(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SearchAnalyticsExpandDto,
  ) {
    const userId = req.user.sub;
    this.logger.log(`User ${userId} expanding row: ${dto.parentKey}`);

    try {
      return await this.analyticsService.expand(dto, userId);
    } catch (error) {
      this.logger.error(`Failed to expand row: ${error.message}`);
      throw new BadRequestException(error.message || "Failed to expand row");
    }
  }
}
