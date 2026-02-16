import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  Logger,
  Patch,
  Body,
} from "@nestjs/common";
import { IsBoolean } from "class-validator";
import { AuthGuard } from "@nestjs/passport";

// ============================================
// Inline DTOs (required for ValidationPipe whitelist)
// ============================================

class ToggleConnectionStatusDto {
  @IsBoolean()
  isActive: boolean;
}
import { ConfigService } from "@nestjs/config";
import { Request, Response } from "express";
import { ConnectionsService } from "./connections.service";
import { CircuitBreakerService } from "./circuit-breaker.service";
import { CircuitState } from "./interfaces/circuit-breaker.interface";
import { GoogleOAuthService } from "../google/services/google-oauth.service";
import { AdManagerOAuthService } from "../ad-manager/services/ad-manager-oauth.service";
import { AdSenseOAuthService } from "../adsense/services/adsense-oauth.service";
import { AnalyticsOAuthService } from "../analytics/services/analytics-oauth.service";
import { SearchConsoleOAuthService } from "../search-console/services/search-console-oauth.service";

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

type GoogleServiceType =
  | "adsense"
  | "ad_manager"
  | "analytics"
  | "search_console"
  | "ads";

interface OAuthState {
  userId: string;
  workspaceId?: string;
  connectionName: string;
  serviceType: GoogleServiceType;
  nonce: string;
  timestamp: number;
  reconnectConnectionId?: string;
}

@Controller("connections")
export class ConnectionsController {
  private readonly logger = new Logger(ConnectionsController.name);

  constructor(
    private readonly connectionsService: ConnectionsService,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly configService: ConfigService,
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly adManagerOAuthService: AdManagerOAuthService,
    private readonly adSenseOAuthService: AdSenseOAuthService,
    private readonly analyticsOAuthService: AnalyticsOAuthService,
    private readonly searchConsoleOAuthService: SearchConsoleOAuthService,
  ) {}

  /**
   * Parse OAuth state from base64url encoded string
   */
  private parseState(state: string): OAuthState | null {
    try {
      const decoded = Buffer.from(state, "base64url").toString("utf8");
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }

  // ============================================
  // Unified Google OAuth Callback
  // ============================================

  /**
   * Unified Google OAuth callback - handles all Google services
   * GET /connections/oauth/google/callback
   * This single endpoint replaces individual callbacks for each service
   */
  @Get("oauth/google/callback")
  async googleOAuthCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Query("error") error: string,
    @Query("error_description") errorDescription: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL");
    const backendUrl = this.configService.get<string>("BACKEND_URL");
    const redirectUri = `${backendUrl}/connections/oauth/google/callback`;

    // Parse state to get service type
    const stateData = this.parseState(state);
    const serviceType = stateData?.serviceType || "unknown";

    // Handle errors from Google
    if (error) {
      this.logger.error(
        `OAuth error for ${serviceType}: ${error} - ${errorDescription}`,
      );
      return res.redirect(
        `${frontendUrl}/callback/google?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || "")}&service=${serviceType}`,
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${frontendUrl}/callback/google?error=missing_params&error_description=Missing code or state parameter&service=${serviceType}`,
      );
    }

    try {
      let result: { connection: any; [key: string]: any };
      let resourceCount = 0;
      let resourcePreview: any[] = [];
      let resourceKey = "resources";

      // Delegate to the appropriate OAuth service based on serviceType
      switch (serviceType) {
        case "adsense":
          result = await this.adSenseOAuthService.exchangeCodeForToken(
            code,
            state,
            redirectUri,
          );
          resourceCount = result.accounts?.length || 0;
          resourcePreview = (result.accounts || [])
            .slice(0, 5)
            .map((a: any) => ({
              id: a.id,
              displayName: a.displayName,
              currencyCode: a.currencyCode,
            }));
          resourceKey = "accounts";
          break;

        case "ad_manager":
          result = await this.adManagerOAuthService.exchangeCodeForToken(
            code,
            state,
            redirectUri,
          );
          resourceCount = result.networks?.length || 0;
          resourcePreview = (result.networks || [])
            .slice(0, 5)
            .map((n: any) => ({
              id: n.id,
              name: n.name,
              currencyCode: n.currencyCode,
            }));
          resourceKey = "networks";
          break;

        case "analytics":
          result = await this.analyticsOAuthService.exchangeCodeForToken(
            code,
            state,
            redirectUri,
          );
          resourceCount = result.properties?.length || 0;
          resourcePreview = (result.properties || [])
            .slice(0, 10)
            .map((p: any) => ({
              id: p.id,
              displayName: p.displayName,
              accountId: p.accountId,
            }));
          resourceKey = "properties";
          break;

        case "search_console":
          result = await this.searchConsoleOAuthService.exchangeCodeForToken(
            code,
            state,
            redirectUri,
          );
          resourceCount = result.sites?.length || 0;
          resourcePreview = (result.sites || []).slice(0, 10).map((s: any) => ({
            siteUrl: s.siteUrl,
            permissionLevel: s.permissionLevel,
          }));
          resourceKey = "sites";
          break;

        case "ads":
          result = await this.googleOAuthService.exchangeCodeForToken(
            code,
            state,
            redirectUri,
          );
          resourceCount = result.accounts?.length || 0;
          resourcePreview = (result.accounts || [])
            .slice(0, 5)
            .map((a: any) => ({
              id: a.id,
              name: a.descriptiveName,
            }));
          resourceKey = "accounts";
          break;

        default:
          throw new Error(`Unknown service type: ${serviceType}`);
      }

      // Build success redirect URL
      const params = new URLSearchParams({
        success: "true",
        service: serviceType,
        connection_id: result.connection.id,
        [`${resourceKey}_count`]: resourceCount.toString(),
      });

      // Encode resource preview if available
      if (resourcePreview.length > 0) {
        params.append(
          `${resourceKey}_preview`,
          Buffer.from(JSON.stringify(resourcePreview)).toString("base64url"),
        );
      }

      this.logger.log(
        `OAuth callback success for ${serviceType}, connection ${result.connection.id}`,
      );

      return res.redirect(
        `${frontendUrl}/callback/google?${params.toString()}`,
      );
    } catch (err) {
      this.logger.error(`OAuth callback error for ${serviceType}:`, err);
      return res.redirect(
        `${frontendUrl}/callback/google?error=exchange_failed&error_description=${encodeURIComponent(err.message || "Failed to complete authentication")}&service=${serviceType}`,
      );
    }
  }

  // ============================================
  // Connection CRUD Operations
  // ============================================

  /**
   * Get all connections for the authenticated user
   * GET /connections
   */
  @Get()
  @UseGuards(AuthGuard("jwt"))
  async getUserConnections(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    this.logger.log(`Getting connections for user ${userId}`);

    const connections =
      await this.connectionsService.getUserConnections(userId);
    return {
      success: true,
      connections,
    };
  }

  /**
   * Get logs for a specific connection
   * GET /connections/:id/logs
   */
  @Get(":id/logs")
  @UseGuards(AuthGuard("jwt"))
  async getConnectionLogs(
    @Param("id") connectionId: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("action") action?: string,
    @Query("status") status?: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    this.logger.log(
      `Getting logs for connection ${connectionId}, user ${userId}`,
    );

    const result = await this.connectionsService.getConnectionLogs(
      connectionId,
      userId,
      {
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
        action,
        status,
      },
    );

    return {
      success: true,
      logs: result.logs,
      total: result.total,
    };
  }

  /**
   * Delete a connection with token revocation
   * DELETE /connections/:id
   */
  @Delete(":id")
  @UseGuards(AuthGuard("jwt"))
  async deleteConnection(
    @Param("id") connectionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    this.logger.log(`Deleting connection ${connectionId} for user ${userId}`);

    await this.connectionsService.deleteConnection(connectionId, userId);

    return {
      success: true,
      message: "Conexão removida com sucesso",
    };
  }

  /**
   * Toggle connection active status
   * PATCH /connections/:id/status
   */
  @Patch(":id/status")
  @UseGuards(AuthGuard("jwt"))
  async toggleConnectionStatus(
    @Param("id") connectionId: string,
    @Body() body: ToggleConnectionStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    this.logger.log(
      `Toggling connection ${connectionId} status to ${body.isActive} for user ${userId}`,
    );

    const connection = await this.connectionsService.toggleConnectionStatus(
      connectionId,
      userId,
      body.isActive,
    );

    return {
      success: true,
      connection,
    };
  }

  /**
   * Get connections that are expiring soon (filtered by user)
   * GET /connections/expiring
   */
  @Get("expiring")
  @UseGuards(AuthGuard("jwt"))
  async getExpiringConnections(
    @Req() req: AuthenticatedRequest,
    @Query("days") days?: string,
  ) {
    const userId = req.user.sub;
    const daysNum = days ? parseInt(days, 10) : 7;
    const connections =
      await this.connectionsService.getExpiringConnections(daysNum, userId);

    return {
      success: true,
      connections,
      count: connections.length,
    };
  }

  /**
   * Auto-refresh expired tokens for all user connections
   * POST /connections/auto-refresh
   *
   * This endpoint checks all connections for the user and automatically
   * refreshes any that have expired or are about to expire (within 5 minutes)
   *
   * For Google connections, uses metadata.type to select the correct OAuth service:
   * - ads (default): GoogleOAuthService
   * - ad_manager: AdManagerOAuthService
   * - adsense: AdSenseOAuthService
   * - analytics: AnalyticsOAuthService
   * - search_console: SearchConsoleOAuthService
   */
  @Post("auto-refresh")
  @UseGuards(AuthGuard("jwt"))
  async autoRefreshTokens(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    this.logger.log(`Auto-refreshing tokens for user ${userId}`);

    const connectionsToRefresh =
      await this.connectionsService.getConnectionsNeedingRefresh(userId);

    if (connectionsToRefresh.length === 0) {
      return {
        success: true,
        refreshed: 0,
        message: "Nenhuma conexão precisa de atualização",
        results: [],
      };
    }

    this.logger.log(
      `Found ${connectionsToRefresh.length} connections to refresh for user ${userId}`,
    );

    const results: Array<{
      connectionId: string;
      connectionName: string;
      platform: string;
      serviceType?: string;
      success: boolean;
      error?: string;
      expiresAt?: string;
    }> = [];

    for (const connection of connectionsToRefresh) {
      const platform = connection.plataform_name?.toLowerCase();
      // Get service type from metadata for Google connections
      const serviceType =
        (connection.metadata as { type?: string })?.type || "ads";

      try {
        if (platform === "google") {
          // Select the appropriate OAuth service based on metadata.type
          let result: { accessToken: string; expiresAt: string };
          let serviceName: string;

          switch (serviceType) {
            case "ad_manager":
              result = await this.adManagerOAuthService.refreshAccessToken(
                connection.id,
              );
              serviceName = "Ad Manager";
              break;
            case "adsense":
              result = await this.adSenseOAuthService.refreshAccessToken(
                connection.id,
              );
              serviceName = "AdSense";
              break;
            case "analytics":
              result = await this.analyticsOAuthService.refreshAccessToken(
                connection.id,
              );
              serviceName = "Analytics";
              break;
            case "search_console":
              result = await this.searchConsoleOAuthService.refreshAccessToken(
                connection.id,
              );
              serviceName = "Search Console";
              break;
            default:
              // Default to Google Ads
              result = await this.googleOAuthService.refreshAccessToken(
                connection.id,
              );
              serviceName = "Google Ads";
          }

          // Log the successful refresh
          await this.connectionsService.createConnectionLog(
            connection.id,
            "token_refresh",
            "success",
            `Token ${serviceName} atualizado automaticamente`,
            { expiresAt: result.expiresAt, serviceType },
          );

          this.logger.log(
            `✅ Refreshed ${serviceName} token for ${connection.connection_name}`,
          );

          results.push({
            connectionId: connection.id,
            connectionName: connection.connection_name,
            platform,
            serviceType,
            success: true,
            expiresAt: result.expiresAt,
          });
        } else if (platform === "meta") {
          // Meta tokens são de longa duração (60 dias), não precisam de refresh frequente
          // Se expirou, precisa reconectar
          results.push({
            connectionId: connection.id,
            connectionName: connection.connection_name,
            platform,
            success: false,
            error: "Token Meta expirado. Por favor, reconecte sua conta.",
          });

          await this.connectionsService.createConnectionLog(
            connection.id,
            "token_refresh",
            "warning",
            "Token Meta expirado - necessário reconectar",
          );

          this.logger.warn(
            `⚠️ Meta token expired for ${connection.connection_name} - requires reconnection`,
          );
        } else {
          // Unknown platform
          this.logger.warn(
            `Unknown platform ${platform} for connection ${connection.id}`,
          );
          results.push({
            connectionId: connection.id,
            connectionName: connection.connection_name,
            platform: platform || "unknown",
            success: false,
            error: `Plataforma não suportada: ${platform}`,
          });
        }
      } catch (error) {
        this.logger.error(
          `❌ Failed to refresh token for ${connection.connection_name} (${serviceType}):`,
          error,
        );

        await this.connectionsService.createConnectionLog(
          connection.id,
          "token_refresh",
          "error",
          `Falha ao atualizar token ${serviceType}: ${error.message}`,
        );

        results.push({
          connectionId: connection.id,
          connectionName: connection.connection_name,
          platform: platform || "unknown",
          serviceType,
          success: false,
          error: error.message || "Falha ao atualizar token",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    this.logger.log(
      `Auto-refresh complete for user ${userId}. Success: ${successCount}/${connectionsToRefresh.length}`,
    );

    return {
      success: true,
      refreshed: successCount,
      total: connectionsToRefresh.length,
      message:
        successCount > 0
          ? `${successCount} conexão(ões) atualizada(s) com sucesso`
          : "Nenhuma conexão foi atualizada",
      results,
    };
  }

  // ============================================
  // Connection Health Status
  // ============================================

  /**
   * Get the health status of a connection including circuit breaker state
   * GET /connections/:id/status
   *
   * Returns comprehensive health information:
   * - needs_reconnect: Whether manual reconnection is required
   * - circuit_breaker: Current circuit breaker state (closed, open, half_open)
   * - is_active: Whether the connection is enabled
   *
   * @feature 20260202-oauth-token-management
   * @requirement FR-014: Status Visibility
   */
  @Get(":id/status")
  @UseGuards(AuthGuard("jwt"))
  async getConnectionStatus(
    @Param("id") connectionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    this.logger.log(
      `Getting status for connection ${connectionId}, user ${userId}`,
    );

    // Verify ownership
    const connection = await this.connectionsService.verifyConnectionOwnership(
      connectionId,
      userId,
    );

    // Get circuit breaker status
    const circuitStatus =
      this.circuitBreakerService.getCircuitBreakerStatus(connectionId);

    // Calculate token expiry status
    let tokenStatus: "valid" | "expiring_soon" | "expired" | "unknown" =
      "unknown";
    let daysUntilExpiry: number | null = null;

    if (connection.token_expires_at) {
      const expiresAt = new Date(connection.token_expires_at);
      const now = new Date();
      const daysRemaining = Math.ceil(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      daysUntilExpiry = daysRemaining;

      if (daysRemaining < 0) {
        tokenStatus = "expired";
      } else if (daysRemaining <= 7) {
        tokenStatus = "expiring_soon";
      } else {
        tokenStatus = "valid";
      }
    }

    // Determine overall health
    let overallHealth: "healthy" | "warning" | "error" = "healthy";
    let healthMessage = "Conexão funcionando normalmente";

    if (connection.needs_reconnect) {
      overallHealth = "error";
      healthMessage =
        connection.last_refresh_error || "Conexão requer reconexão manual";
    } else if (circuitStatus.state === CircuitState.OPEN) {
      overallHealth = "error";
      healthMessage =
        "Conexão temporariamente bloqueada devido a falhas repetidas";
    } else if (circuitStatus.state === CircuitState.HALF_OPEN) {
      overallHealth = "warning";
      healthMessage = "Conexão em recuperação - testando nova requisição";
    } else if (tokenStatus === "expired") {
      overallHealth = "error";
      healthMessage = "Token expirado - reconexão necessária";
    } else if (tokenStatus === "expiring_soon") {
      overallHealth = "warning";
      healthMessage = `Token expira em ${daysUntilExpiry} dia(s)`;
    } else if (!connection.is_active) {
      overallHealth = "warning";
      healthMessage = "Conexão desativada";
    }

    return {
      success: true,
      connectionId,
      connectionName: connection.connection_name,
      platform: connection.plataform_name,
      status: {
        overall_health: overallHealth,
        health_message: healthMessage,
        is_active: connection.is_active,
        needs_reconnect: connection.needs_reconnect,
        last_refresh_error: connection.last_refresh_error,
        last_refresh_attempt: connection.last_refresh_attempt,
        token: {
          status: tokenStatus,
          expires_at: connection.token_expires_at,
          days_until_expiry: daysUntilExpiry,
        },
        circuit_breaker: {
          state: circuitStatus.state,
          failure_count: circuitStatus.failureCount,
          is_blocking: circuitStatus.isBlocking,
          next_retry_at: circuitStatus.nextRetryAt,
          message: circuitStatus.message,
        },
      },
    };
  }

  /**
   * Get all connections with health status
   * GET /connections/with-status
   *
   * Returns connections enriched with health status information
   * Useful for dashboard display showing connection health at a glance
   *
   * @feature 20260202-oauth-token-management
   * @requirement FR-014: Status Visibility
   */
  @Get("with-status")
  @UseGuards(AuthGuard("jwt"))
  async getConnectionsWithStatus(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    this.logger.log(`Getting connections with status for user ${userId}`);

    const connections =
      await this.connectionsService.getUserConnections(userId);

    // Enrich each connection with circuit breaker status
    const connectionsWithStatus = connections.map((connection) => {
      const circuitStatus = this.circuitBreakerService.getCircuitBreakerStatus(
        connection.id,
      );

      // Calculate token status
      let tokenStatus: "valid" | "expiring_soon" | "expired" | "unknown" =
        "unknown";
      let daysUntilExpiry: number | null = null;

      if (connection.token_expires_at) {
        const expiresAt = new Date(connection.token_expires_at);
        const now = new Date();
        const daysRemaining = Math.ceil(
          (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        daysUntilExpiry = daysRemaining;

        if (daysRemaining < 0) {
          tokenStatus = "expired";
        } else if (daysRemaining <= 7) {
          tokenStatus = "expiring_soon";
        } else {
          tokenStatus = "valid";
        }
      }

      // Determine overall health
      let overallHealth: "healthy" | "warning" | "error" = "healthy";

      if (connection.needs_reconnect) {
        overallHealth = "error";
      } else if (circuitStatus.state === CircuitState.OPEN) {
        overallHealth = "error";
      } else if (
        circuitStatus.state === CircuitState.HALF_OPEN ||
        tokenStatus === "expiring_soon" ||
        !connection.is_active
      ) {
        overallHealth = "warning";
      } else if (tokenStatus === "expired") {
        overallHealth = "error";
      }

      return {
        ...connection,
        health: {
          overall: overallHealth,
          needs_reconnect: connection.needs_reconnect,
          circuit_breaker_state: circuitStatus.state,
          token_status: tokenStatus,
          days_until_expiry: daysUntilExpiry,
        },
      };
    });

    // Count by health status
    const healthyCounts = connectionsWithStatus.reduce(
      (acc, c) => {
        acc[c.health.overall] = (acc[c.health.overall] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      success: true,
      connections: connectionsWithStatus,
      summary: {
        total: connections.length,
        healthy: healthyCounts.healthy || 0,
        warning: healthyCounts.warning || 0,
        error: healthyCounts.error || 0,
      },
    };
  }
}
