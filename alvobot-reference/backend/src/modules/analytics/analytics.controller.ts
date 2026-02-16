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

class ConnectionIdDto {
  @IsString()
  connectionId: string;
}

class PropertyStatusDto {
  @IsBoolean()
  is_active: boolean;
}

class BulkPropertyStatusDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  propertyIds: string[];

  @IsBoolean()
  is_active: boolean;
}
import { Response, Request } from "express";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { AnalyticsOAuthService } from "./services/analytics-oauth.service";
import { AnalyticsReportService } from "./services/analytics-report.service";
import { InitiateAnalyticsOAuthDto } from "./dto/initiate-oauth.dto";
import {
  AnalyticsReportRequestDto,
  AnalyticsExpandRequestDto,
  ActivePropertiesRequestDto,
} from "./dto/analytics-report.dto";
import { AdminService } from "../admin/admin.service";

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@Controller("analytics")
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);
  private supabase: SupabaseClient;

  constructor(
    private readonly analyticsOAuthService: AnalyticsOAuthService,
    private readonly analyticsReportService: AnalyticsReportService,
    private readonly configService: ConfigService,
    private readonly adminService: AdminService,
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
  // OAuth Endpoints
  // ============================================

  /**
   * Check Analytics OAuth configuration status
   * GET /analytics/config/status
   */
  @Get("config/status")
  @UseGuards(AuthGuard("jwt"))
  async checkConfigStatus() {
    const result = this.analyticsOAuthService.validateConfig();
    return result;
  }

  /**
   * Initiate OAuth flow - returns authorization URL
   * POST /analytics/oauth/initiate
   */
  @Post("oauth/initiate")
  @UseGuards(AuthGuard("jwt"))
  async initiateOAuth(
    @Body() dto: InitiateAnalyticsOAuthDto,
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
      `Initiating Analytics OAuth for user ${userId}, workspace ${workspaceId}, reconnect: ${dto.reconnectConnectionId || "no"}`,
    );

    const { url } = await this.analyticsOAuthService.buildAuthorizationUrl(
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
   * GET /analytics/oauth/callback
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
    const redirectUri = `${backendUrl}/analytics/oauth/callback`;

    // Handle errors from Google
    if (error) {
      this.logger.error(`OAuth error: ${error} - ${errorDescription}`);
      return res.redirect(
        `${frontendUrl}/callback/analytics?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || "")}`,
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${frontendUrl}/callback/analytics?error=missing_params&error_description=Missing code or state parameter`,
      );
    }

    try {
      const result = await this.analyticsOAuthService.exchangeCodeForToken(
        code,
        state,
        redirectUri,
      );

      const params = new URLSearchParams({
        success: "true",
        connection_id: result.connection.id,
        accounts_count: result.accounts.length.toString(),
        properties_count: result.properties.length.toString(),
      });

      // Encode properties preview info (limited to prevent URL length issues)
      if (result.properties.length > 0) {
        const propertiesPreview = result.properties.slice(0, 10).map((p) => ({
          id: p.id,
          displayName: p.displayName,
          accountId: p.accountId,
        }));
        params.append(
          "properties_preview",
          Buffer.from(JSON.stringify(propertiesPreview)).toString("base64url"),
        );
      }

      return res.redirect(
        `${frontendUrl}/callback/analytics?${params.toString()}`,
      );
    } catch (err) {
      this.logger.error("OAuth callback error:", err);
      return res.redirect(
        `${frontendUrl}/callback/analytics?error=exchange_failed&error_description=${encodeURIComponent(err.message || "Failed to complete authentication")}`,
      );
    }
  }

  /**
   * Refresh access token for a connection
   * POST /analytics/oauth/refresh/:connectionId
   */
  @Post("oauth/refresh/:connectionId")
  @UseGuards(AuthGuard("jwt"))
  async refreshToken(
    @Req() req: AuthenticatedRequest,
    @Param("connectionId") connectionId: string,
  ) {
    const userId = req.user.sub;

    await this.analyticsOAuthService.verifyConnectionOwnership(
      connectionId,
      userId,
    );

    try {
      const result =
        await this.analyticsOAuthService.refreshAccessToken(connectionId);
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
   * Get Analytics accounts from connection
   * GET /analytics/accounts
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

    const accounts = await this.analyticsOAuthService.getAccountsFromConnection(
      connectionId,
      userId,
    );

    return { accounts };
  }

  /**
   * Get Analytics properties from connection
   * GET /analytics/properties
   */
  @Get("properties")
  @UseGuards(AuthGuard("jwt"))
  async getProperties(
    @Query("connectionId") connectionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;

    if (!connectionId) {
      return { properties: [] };
    }

    const properties =
      await this.analyticsOAuthService.getPropertiesFromConnection(
        connectionId,
        userId,
      );

    return { properties };
  }

  /**
   * Get data streams for a property
   * GET /analytics/data-streams
   */
  @Get("data-streams")
  @UseGuards(AuthGuard("jwt"))
  async getDataStreams(
    @Query("connectionId") connectionId: string,
    @Query("propertyId") propertyId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;

    if (!connectionId || !propertyId) {
      return { dataStreams: [] };
    }

    // Get connection with valid token
    const connection =
      await this.analyticsOAuthService.getConnectionWithValidToken(
        connectionId,
        userId,
      );

    // Fetch data streams
    const dataStreams = await this.analyticsOAuthService.fetchDataStreams(
      connection.access_token,
      propertyId,
    );

    return { dataStreams };
  }

  /**
   * Refresh accounts and properties list from Google
   * POST /analytics/refresh
   */
  @Post("refresh")
  @UseGuards(AuthGuard("jwt"))
  async refreshAccountsAndProperties(
    @Body() body: ConnectionIdDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    const { connectionId } = body;

    // Get connection with valid token
    const connection =
      await this.analyticsOAuthService.getConnectionWithValidToken(
        connectionId,
        userId,
      );

    // Fetch fresh accounts and properties
    const result = await this.analyticsOAuthService.fetchAccountsAndProperties(
      connection.access_token,
    );

    return result;
  }

  // ============================================
  // Property Activation Endpoints
  // ============================================

  /**
   * Get stored Analytics properties for a connection (from database)
   * GET /analytics/properties/:connectionId/stored
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
      .select("id, workspace_id, user_id")
      .eq("id", connectionId)
      .eq("plataform_name", "google")
      .single();

    if (connError || !connection) {
      throw new BadRequestException("Connection not found");
    }

    // Check if it's an Analytics connection
    const { data: connFull } = await this.supabase
      .from("connections")
      .select("metadata")
      .eq("id", connectionId)
      .single();

    if (connFull?.metadata?.type !== "analytics") {
      throw new BadRequestException("Not an Analytics connection");
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
      .from("analytics_properties")
      .select("*")
      .eq("connection_id", connectionId)
      .order("is_active", { ascending: false })
      .order("display_name", { ascending: true });

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
   * Sync Analytics properties - fetches all properties from API and stores in database
   * POST /analytics/properties/:connectionId/sync
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
      await this.analyticsOAuthService.getConnectionWithValidToken(
        connectionId,
        userId,
      );

    // Verify it's an Analytics connection
    if (connection.metadata?.type !== "analytics") {
      throw new BadRequestException("Not an Analytics connection");
    }

    try {
      // Fetch fresh properties from Google
      const result =
        await this.analyticsOAuthService.fetchAccountsAndProperties(
          connection.access_token,
        );

      this.logger.log(
        `Syncing ${result.properties.length} properties for connection ${connectionId}`,
      );

      // Get existing properties to preserve is_active status
      const { data: existingProperties } = await this.supabase
        .from("analytics_properties")
        .select("property_id, is_active")
        .eq("connection_id", connectionId);

      const existingMap = new Map(
        (existingProperties || []).map((p) => [p.property_id, p.is_active]),
      );

      // Build account map for names
      const accountMap = new Map(
        result.accounts.map((a) => [a.id, a.displayName]),
      );

      // Upsert all properties
      const propertiesToUpsert = result.properties.map((property) => ({
        connection_id: connectionId,
        user_id: connection.user_id,
        workspace_id: connection.workspace_id,
        property_id: property.name, // Full resource name like "properties/123456789"
        display_name: property.displayName,
        account_id: property.accountId,
        account_name: accountMap.get(property.accountId) || null,
        property_type: property.propertyType,
        time_zone: property.timeZone,
        currency_code: property.currencyCode,
        // Preserve existing is_active status, default to false for new properties
        is_active: existingMap.has(property.name)
          ? existingMap.get(property.name)
          : false,
        last_synced_at: new Date().toISOString(),
      }));

      if (propertiesToUpsert.length > 0) {
        const { error: upsertError } = await this.supabase
          .from("analytics_properties")
          .upsert(propertiesToUpsert, {
            onConflict: "connection_id,property_id",
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
        .from("analytics_properties")
        .select("*")
        .eq("connection_id", connectionId)
        .order("is_active", { ascending: false })
        .order("display_name", { ascending: true });

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
   * Update Analytics property status (enable/disable)
   * POST /analytics/properties/:connectionId/:propertyId/status
   */
  @Post("properties/:connectionId/:propertyId/status")
  @UseGuards(AuthGuard("jwt"))
  async updatePropertyStatus(
    @Req() req: AuthenticatedRequest,
    @Param("connectionId") connectionId: string,
    @Param("propertyId") propertyId: string,
    @Body() body: PropertyStatusDto,
  ) {
    const userId = req.user.sub;

    // Verify user has access to the property
    const { data: property, error: propError } = await this.supabase
      .from("analytics_properties")
      .select("*, connections!inner(workspace_id, user_id, is_active, deleted_at)")
      .eq("connection_id", connectionId)
      .eq("property_id", decodeURIComponent(propertyId))
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
      .from("analytics_properties")
      .update({ is_active: body.is_active })
      .eq("connection_id", connectionId)
      .eq("property_id", decodeURIComponent(propertyId));

    if (updateError) {
      this.logger.error(
        `Failed to update property status: ${updateError.message}`,
      );
      throw new BadRequestException("Failed to update property status");
    }

    return { success: true };
  }

  /**
   * Bulk update Analytics properties status
   * POST /analytics/properties/:connectionId/bulk-status
   */
  @Post("properties/:connectionId/bulk-status")
  @UseGuards(AuthGuard("jwt"))
  async bulkUpdatePropertyStatus(
    @Req() req: AuthenticatedRequest,
    @Param("connectionId") connectionId: string,
    @Body() body: BulkPropertyStatusDto,
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
      .from("analytics_properties")
      .update({ is_active: body.is_active })
      .eq("connection_id", connectionId)
      .in("property_id", body.propertyIds);

    if (updateError) {
      this.logger.error(
        `Failed to bulk update properties: ${updateError.message}`,
      );
      throw new BadRequestException("Failed to update properties");
    }

    return { success: true, updated: body.propertyIds.length };
  }

  // ============================================
  // Report Endpoints
  // ============================================

  /**
   * Get active Analytics properties from multiple connections (batch)
   * POST /analytics/report/properties/active
   */
  @Post("report/properties/active")
  @UseGuards(AuthGuard("jwt"))
  async getActiveProperties(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ActivePropertiesRequestDto,
  ) {
    const userId = req.user.sub;

    // Get user's workspace memberships for access verification
    const { data: memberships } = await this.supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .eq("status", "active");

    const workspaceIds = (memberships || []).map((m) => m.workspace_id);

    // Verify user has access to the requested connections
    // (either direct ownership or workspace membership)
    let query = this.supabase
      .from("connections")
      .select("id")
      .in("id", dto.connectionIds)
      .eq("plataform_name", "google")
      .is("deleted_at", null);

    if (workspaceIds.length > 0) {
      query = query.or(
        `user_id.eq.${userId},workspace_id.in.(${workspaceIds.join(",")})`,
      );
    } else {
      query = query.eq("user_id", userId);
    }

    const { data: connections } = await query;

    if (!connections || connections.length === 0) {
      throw new BadRequestException("No valid connections found");
    }

    // Only pass verified connection IDs to the service
    const verifiedIds = connections.map((c) => c.id);
    return this.analyticsReportService.getActiveProperties(verifiedIds);
  }

  /**
   * Get unified Analytics report from multiple properties
   * POST /analytics/report
   */
  @Post("report")
  @UseGuards(AuthGuard("jwt"))
  async getReport(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AnalyticsReportRequestDto,
  ) {
    const userId = req.user.sub;

    // Validate sources
    if (!dto.sources || dto.sources.length === 0) {
      throw new BadRequestException("At least one source is required");
    }

    // Validate dates
    if (!dto.startDate || !dto.endDate) {
      throw new BadRequestException("Start date and end date are required");
    }

    // Verify user has access to all requested connections
    const connectionIds = [
      ...new Set(dto.sources.map((s) => s.connectionId)),
    ];
    await this.verifyConnectionAccess(userId, connectionIds);

    this.logger.log(
      `[REPORT] User ${userId} requesting report for ${dto.sources.length} source(s)`,
    );

    return this.analyticsReportService.getReport(dto);
  }

  /**
   * Expand a row to show sub-grouped data
   * POST /analytics/report/expand
   */
  @Post("report/expand")
  @UseGuards(AuthGuard("jwt"))
  async expandRow(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AnalyticsExpandRequestDto,
  ) {
    const userId = req.user.sub;

    // Validate sources
    if (!dto.sources || dto.sources.length === 0) {
      throw new BadRequestException("At least one source is required");
    }

    // Verify user has access to all requested connections
    const connectionIds = [
      ...new Set(dto.sources.map((s) => s.connectionId)),
    ];
    await this.verifyConnectionAccess(userId, connectionIds);

    this.logger.log(
      `[EXPAND] User ${userId} expanding ${dto.primaryGroupBy} → ${dto.subGroupBy} for ${dto.parentKey}`,
    );

    return this.analyticsReportService.expandRow(dto);
  }

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Verify user has access to all requested connections
   * (either direct ownership or workspace membership)
   */
  private async verifyConnectionAccess(
    userId: string,
    connectionIds: string[],
  ): Promise<void> {
    if (connectionIds.length === 0) return;

    // Get user's workspace memberships
    const { data: memberships } = await this.supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .eq("status", "active");

    const workspaceIds = (memberships || []).map((m) => m.workspace_id);

    // Query connections the user has access to
    let query = this.supabase
      .from("connections")
      .select("id")
      .in("id", connectionIds)
      .is("deleted_at", null);

    if (workspaceIds.length > 0) {
      query = query.or(
        `user_id.eq.${userId},workspace_id.in.(${workspaceIds.join(",")})`,
      );
    } else {
      query = query.eq("user_id", userId);
    }

    const { data: accessibleConnections } = await query;
    const accessibleIds = new Set(
      (accessibleConnections || []).map((c) => c.id),
    );

    // Check if all requested connections are accessible
    const deniedIds = connectionIds.filter((id) => !accessibleIds.has(id));
    if (deniedIds.length > 0) {
      this.logger.warn(
        `User ${userId} denied access to connections: ${deniedIds.join(", ")}`,
      );
      throw new BadRequestException(
        "You do not have access to one or more requested connections",
      );
    }
  }
}
