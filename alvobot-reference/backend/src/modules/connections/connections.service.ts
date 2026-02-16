import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CircuitBreakerService } from "./circuit-breaker.service";

/**
 * Result of connection validation check
 * @feature 20260202-oauth-token-management
 */
export interface ConnectionValidationResult {
  isValid: boolean;
  connectionId: string;
  needsReconnect: boolean;
  lastError?: string;
}

export interface ConnectionLog {
  id: string;
  connection_id: string;
  action: string;
  status: "success" | "error" | "warning";
  message: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface Connection {
  id: string;
  user_id: string;
  workspace_id: string | null;
  connection_name: string;
  plataform_name: string;
  platform_user_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  is_active: boolean;
  needs_reconnect: boolean;
  last_refresh_error: string | null;
  last_refresh_attempt: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
}

@Injectable()
export class ConnectionsService {
  private readonly logger = new Logger(ConnectionsService.name);
  private supabase: SupabaseClient;

  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => CircuitBreakerService))
    private circuitBreakerService: CircuitBreakerService,
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
   * Verify that a connection belongs to a user (directly or via workspace membership)
   */
  async verifyConnectionOwnership(
    connectionId: string,
    userId: string,
  ): Promise<Connection> {
    const { data: connection, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (error || !connection) {
      throw new NotFoundException("Conexão não encontrada");
    }

    // Direct ownership
    if (connection.user_id === userId) {
      return connection;
    }

    // Workspace membership fallback
    if (connection.workspace_id) {
      const { data: membership } = await this.supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", connection.workspace_id)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (membership) {
        return connection;
      }
    }

    throw new ForbiddenException("Você não tem acesso a esta conexão");
  }

  /**
   * Assert that a connection is valid for use.
   * Throws if connection has needs_reconnect = true.
   *
   * Use this at the start of any operation that requires a valid connection.
   *
   * @param connectionId - The connection ID to validate
   * @returns The validated connection
   * @throws NotFoundException if connection doesn't exist
   * @throws BadRequestException if needs_reconnect is true
   *
   * @feature 20260202-oauth-token-management
   * @requirement FR-006: Check needs_reconnect before operations
   * @requirement FR-007: Reject operations without calling external APIs
   */
  async assertConnectionValid(connectionId: string): Promise<Connection> {
    const { data: connection, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (error || !connection) {
      throw new NotFoundException("Conexão não encontrada");
    }

    if (connection.needs_reconnect) {
      // Log the rejected operation
      await this.createConnectionLog(
        connectionId,
        "operation_skipped_needs_reconnect",
        "warning",
        `Operação rejeitada: conexão requer reconexão manual`,
        { lastError: connection.last_refresh_error },
      );

      throw new BadRequestException({
        code: "CONNECTION_NEEDS_RECONNECT",
        message: "Conexão requer reconexão manual",
        connectionId,
        lastError: connection.last_refresh_error,
      });
    }

    return connection;
  }

  /**
   * Check if a connection can be used (non-throwing version).
   *
   * @param connectionId - The connection ID to check
   * @returns Validation result with isValid and details
   *
   * @feature 20260202-oauth-token-management
   */
  async validateConnection(
    connectionId: string,
  ): Promise<ConnectionValidationResult> {
    const { data: connection, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (error || !connection) {
      return {
        isValid: false,
        connectionId,
        needsReconnect: false,
        lastError: "Connection not found",
      };
    }

    if (connection.needs_reconnect) {
      return {
        isValid: false,
        connectionId,
        needsReconnect: true,
        lastError:
          connection.last_refresh_error || "Connection requires reconnection",
      };
    }

    return {
      isValid: true,
      connectionId,
      needsReconnect: false,
    };
  }

  /**
   * Get logs for a specific connection
   */
  async getConnectionLogs(
    connectionId: string,
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      action?: string;
      status?: string;
    },
  ): Promise<{ logs: ConnectionLog[]; total: number }> {
    // Verify ownership
    await this.verifyConnectionOwnership(connectionId, userId);

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    let query = this.supabase
      .from("connection_logs")
      .select("*", { count: "exact" })
      .eq("connection_id", connectionId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (options?.action) {
      query = query.eq("action", options.action);
    }

    if (options?.status) {
      query = query.eq("status", options.status);
    }

    const { data, error, count } = await query;

    if (error) {
      this.logger.error("Failed to get connection logs:", error);
      throw new InternalServerErrorException("Falha ao buscar logs de conexão");
    }

    return {
      logs: data || [],
      total: count || 0,
    };
  }

  /**
   * Create a log entry for a connection
   * Note: This method is non-critical and will not throw on failure
   */
  async createConnectionLog(
    connectionId: string,
    action: string,
    status: "success" | "error" | "warning",
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<ConnectionLog | null> {
    try {
      const { data, error } = await this.supabase
        .from("connection_logs")
        .insert({
          connection_id: connectionId,
          action,
          status,
          message,
          metadata,
        })
        .select()
        .single();

      if (error) {
        // Log the error but don't throw - logging is not critical
        this.logger.warn("Failed to create connection log:", error.message);
        return null;
      }

      return data;
    } catch (err) {
      // Silently fail - logging should not break main functionality
      this.logger.warn("Failed to create connection log:", err.message);
      return null;
    }
  }

  /**
   * Delete a connection with token revocation
   */
  async deleteConnection(connectionId: string, userId: string): Promise<void> {
    // Verify ownership and get connection
    const connection = await this.verifyConnectionOwnership(
      connectionId,
      userId,
    );

    try {
      // Log the deletion attempt
      await this.createConnectionLog(
        connectionId,
        "delete",
        "success",
        `Conexão ${connection.connection_name} removida pelo usuário`,
        { platform: connection.plataform_name },
      );

      // Revoke tokens if applicable
      if (connection.plataform_name === "meta" && connection.access_token) {
        await this.revokeMetaToken(connection.access_token);
      } else if (
        connection.plataform_name === "google" &&
        connection.access_token
      ) {
        await this.revokeGoogleToken(connection.access_token);
      }

      // Delete associated pages/accounts if Meta
      if (connection.plataform_name === "meta") {
        await this.supabase
          .from("meta_pages")
          .delete()
          .eq("connection_id", connectionId);
      }

      // Delete the connection
      const { error } = await this.supabase
        .from("connections")
        .delete()
        .eq("id", connectionId);

      if (error) {
        throw error;
      }

      // Cleanup circuit breaker state for this connection
      // @feature 20260202-oauth-token-management
      // @requirement T047: Clean up circuit breaker state when connection is deleted
      this.circuitBreakerService.removeCircuit(connectionId);

      this.logger.log(`Connection ${connectionId} deleted for user ${userId}`);
    } catch (error) {
      this.logger.error("Failed to delete connection:", error);
      await this.createConnectionLog(
        connectionId,
        "delete",
        "error",
        `Falha ao remover conexão: ${error.message}`,
      );
      throw new InternalServerErrorException("Falha ao remover conexão");
    }
  }

  /**
   * Revoke Meta access token
   */
  private async revokeMetaToken(accessToken: string): Promise<void> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/me/permissions?access_token=${accessToken}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const error = await response.json();
        this.logger.warn("Failed to revoke Meta token:", error);
      } else {
        this.logger.log("Meta token revoked successfully");
      }
    } catch (error) {
      this.logger.warn("Error revoking Meta token:", error);
    }
  }

  /**
   * Revoke Google access token
   */
  private async revokeGoogleToken(accessToken: string): Promise<void> {
    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/revoke?token=${accessToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        },
      );

      if (!response.ok) {
        const error = await response.text();
        this.logger.warn("Failed to revoke Google token:", error);
      } else {
        this.logger.log("Google token revoked successfully");
      }
    } catch (error) {
      this.logger.warn("Error revoking Google token:", error);
    }
  }

  /**
   * Get all connections for a user
   */
  async getUserConnections(userId: string): Promise<Connection[]> {
    const { data, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      this.logger.error("Failed to get user connections:", error);
      throw new InternalServerErrorException("Falha ao buscar conexões");
    }

    return data || [];
  }

  /**
   * Get connections expiring soon (within specified days)
   */
  async getExpiringConnections(
    days: number = 7,
    userId?: string,
  ): Promise<Connection[]> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    let query = this.supabase
      .from("connections")
      .select("*")
      .eq("is_active", true)
      .is("deleted_at", null)
      .not("token_expires_at", "is", null)
      .lt("token_expires_at", expiryDate.toISOString())
      .gt("token_expires_at", new Date().toISOString());

    // Filter by user - either direct ownership or workspace membership
    if (userId) {
      // Get workspace IDs the user belongs to
      const { data: memberships } = await this.supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", userId)
        .eq("status", "active");

      const workspaceIds = (memberships || []).map((m) => m.workspace_id);

      if (workspaceIds.length > 0) {
        // User's own connections OR connections in their workspaces
        query = query.or(
          `user_id.eq.${userId},workspace_id.in.(${workspaceIds.join(",")})`,
        );
      } else {
        query = query.eq("user_id", userId);
      }
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error("Failed to get expiring connections:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Get expired connections
   */
  async getExpiredConnections(): Promise<Connection[]> {
    const { data, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("is_active", true)
      .not("token_expires_at", "is", null)
      .lt("token_expires_at", new Date().toISOString());

    if (error) {
      this.logger.error("Failed to get expired connections:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Update connection last_used_at timestamp
   */
  async updateLastUsed(connectionId: string): Promise<void> {
    await this.supabase
      .from("connections")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", connectionId);
  }

  /**
   * Check if token needs refresh (expired or expiring within 5 minutes)
   */
  needsTokenRefresh(connection: Connection): boolean {
    if (!connection.token_expires_at) return false;

    const expiresAt = new Date(connection.token_expires_at);
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

    return expiresAt <= fiveMinutesFromNow;
  }

  /**
   * Get connections that need token refresh for a user
   *
   * Filters:
   * - is_active: true (only active connections)
   * - refresh_token: not null (must have a refresh token)
   * - token_expires_at: within 5 minutes of expiring or already expired
   * - needs_reconnect: false or null (skip connections that have permanently failed)
   */
  async getConnectionsNeedingRefresh(userId: string): Promise<Connection[]> {
    const connections = await this.getUserConnections(userId);

    return connections.filter(
      (conn) =>
        conn.is_active &&
        conn.refresh_token &&
        !conn.needs_reconnect && // Skip connections that need user reconnection
        this.needsTokenRefresh(conn),
    );
  }

  /**
   * Get ALL Google connections that need token refresh (for cron job)
   * Returns connections that are:
   * - Active
   * - Have a refresh_token
   * - Token is expired or expires within the next hour
   * - Platform is 'google' (covers ads, ad_manager, adsense, analytics, search_console)
   * - NOT already marked as needs_reconnect (no point retrying permanently failed connections)
   */
  async getGoogleConnectionsNeedingRefresh(): Promise<Connection[]> {
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const { data, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("plataform_name", "google")
      .eq("is_active", true)
      .or("needs_reconnect.is.null,needs_reconnect.eq.false") // Exclude connections needing reconnect
      .not("refresh_token", "is", null)
      .lt("token_expires_at", oneHourFromNow)
      .is("deleted_at", null)
      .order("token_expires_at", { ascending: true });

    if (error) {
      this.logger.error(
        "Failed to get Google connections needing refresh:",
        error,
      );
      return [];
    }

    return data || [];
  }

  /**
   * Toggle connection active status
   */
  async toggleConnectionStatus(
    connectionId: string,
    userId: string,
    isActive: boolean,
  ): Promise<Connection> {
    // Verify ownership
    await this.verifyConnectionOwnership(connectionId, userId);

    const { data, error } = await this.supabase
      .from("connections")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", connectionId)
      .select()
      .single();

    if (error) {
      this.logger.error("Failed to toggle connection status:", error);
      throw new InternalServerErrorException(
        "Falha ao atualizar status da conexão",
      );
    }

    // Log the action
    await this.createConnectionLog(
      connectionId,
      isActive ? "activate" : "deactivate",
      "success",
      `Conexão ${isActive ? "ativada" : "desativada"} pelo usuário`,
    );

    return data;
  }

  /**
   * Mark a connection as needing reconnection
   * Called when token refresh fails permanently (e.g., invalid_grant)
   *
   * This is crucial for UX - users need to know when action is required
   * (Nielsen's Heuristic #1: Visibility of system status)
   */
  async markConnectionNeedsReconnect(
    connectionId: string,
    errorMessage: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from("connections")
      .update({
        needs_reconnect: true,
        last_refresh_error: errorMessage,
        last_refresh_attempt: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId);

    if (error) {
      this.logger.error("Failed to mark connection as needs_reconnect:", error);
      // Don't throw - this is a secondary operation
    }

    // Log the event
    await this.createConnectionLog(
      connectionId,
      "token_refresh_failed_permanent",
      "error",
      `Token refresh falhou permanentemente: ${errorMessage}. Reconexão necessária.`,
    );
  }

  /**
   * Clear the needs_reconnect flag after successful reconnection
   */
  async clearNeedsReconnect(connectionId: string): Promise<void> {
    const { error } = await this.supabase
      .from("connections")
      .update({
        needs_reconnect: false,
        last_refresh_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId);

    if (error) {
      this.logger.error("Failed to clear needs_reconnect flag:", error);
    }
  }

  /**
   * Get connection by ID (for cron jobs - no ownership check)
   */
  async getConnectionById(connectionId: string): Promise<Connection | null> {
    const { data, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (error) {
      this.logger.error("Failed to get connection:", error);
      return null;
    }

    return data;
  }

  /**
   * Get connections that need attention (needs_reconnect = true)
   * For displaying warnings to users
   */
  async getConnectionsNeedingAttention(
    workspaceId: string,
  ): Promise<Connection[]> {
    const { data, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .eq("needs_reconnect", true);

    if (error) {
      this.logger.error("Failed to get connections needing attention:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Get Meta connections that need token refresh
   * Tokens are refreshed when they expire within 7 days
   *
   * @feature 20260202-oauth-token-management
   * @requirement FR-006: Proactive Meta token refresh
   */
  async getMetaConnectionsNeedingRefresh(): Promise<Connection[]> {
    // Calculate the threshold date (7 days from now)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const thresholdDate = sevenDaysFromNow.toISOString();

    const { data, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("plataform_name", "meta")
      .eq("is_active", true)
      .eq("needs_reconnect", false)
      .not("access_token", "is", null)
      .not("token_expires_at", "is", null)
      .lt("token_expires_at", thresholdDate);

    if (error) {
      this.logger.error(
        "Failed to get Meta connections needing refresh:",
        error,
      );
      return [];
    }

    this.logger.log(
      `Found ${(data || []).length} Meta connections needing token refresh`,
    );
    return data || [];
  }

  /**
   * Get all active AdSense connections for account state refresh
   * @feature 20260203-adsense-account-status
   */
  async getActiveAdSenseConnections(): Promise<Connection[]> {
    const { data, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("plataform_name", "google")
      .eq("is_active", true)
      .is("deleted_at", null)
      .or("needs_reconnect.is.null,needs_reconnect.eq.false")
      .not("metadata", "is", null);

    if (error) {
      this.logger.error("Failed to get active AdSense connections:", error);
      return [];
    }

    // Filter to only AdSense connections (metadata.type === 'adsense')
    const adSenseConnections = (data || []).filter(
      (c) =>
        c.metadata &&
        (c.metadata as Record<string, unknown>).type === "adsense",
    );

    this.logger.log(
      `Found ${adSenseConnections.length} active AdSense connections for state refresh`,
    );
    return adSenseConnections;
  }

  /**
   * Update metadata.accounts for a connection (preserves other metadata fields)
   * @feature 20260203-adsense-account-status
   */
  async updateConnectionAccountsMetadata(
    connectionId: string,
    accounts: Array<{
      id: string;
      name: string;
      displayName: string;
      timezone?: string;
      currencyCode: string;
      state?: string;
    }>,
  ): Promise<void> {
    // First fetch the current metadata to preserve other fields
    const { data: connection, error: fetchError } = await this.supabase
      .from("connections")
      .select("metadata")
      .eq("id", connectionId)
      .single();

    if (fetchError || !connection) {
      this.logger.error(
        `Failed to fetch connection ${connectionId} for metadata update:`,
        fetchError,
      );
      return;
    }

    const currentMetadata =
      (connection.metadata as Record<string, unknown>) || {};
    const updatedMetadata = {
      ...currentMetadata,
      accounts,
    };

    const { error: updateError } = await this.supabase
      .from("connections")
      .update({
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId);

    if (updateError) {
      this.logger.error(
        `Failed to update accounts metadata for connection ${connectionId}:`,
        updateError,
      );
    }
  }
}
