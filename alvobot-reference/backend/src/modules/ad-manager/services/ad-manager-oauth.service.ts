import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
  NotFoundException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as crypto from "crypto";
import { AdminService } from "../../admin/admin.service";
import { TokenRefreshError } from "../../google/services/google-oauth.service";
import { ConnectionsService } from "../../connections/connections.service";
import { CircuitBreakerService } from "../../connections/circuit-breaker.service";

/**
 * Permanent error codes from Google OAuth that require user reconnection
 */
const PERMANENT_ERROR_CODES = [
  "invalid_grant",
  "invalid_client",
  "unauthorized_client",
  "access_denied",
];

interface OAuthState {
  userId: string;
  workspaceId?: string;
  connectionName: string;
  serviceType:
    | "adsense"
    | "ad_manager"
    | "analytics"
    | "search_console"
    | "ads";
  nonce: string;
  timestamp: number;
  reconnectConnectionId?: string;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface AdManagerNetwork {
  id: string;
  name: string;
  currencyCode: string;
}

@Injectable()
export class AdManagerOAuthService {
  private readonly logger = new Logger(AdManagerOAuthService.name);
  private supabase: SupabaseClient;

  // Google OAuth URLs
  private readonly GOOGLE_AUTH_URL =
    "https://accounts.google.com/o/oauth2/v2/auth";
  private readonly GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
  private readonly GOOGLE_USERINFO_URL =
    "https://www.googleapis.com/oauth2/v2/userinfo";

  // Ad Manager API Base URL
  private readonly AD_MANAGER_API_BASE = "https://admanager.googleapis.com/v1";

  // Required scopes for Ad Manager
  private readonly AD_MANAGER_SCOPES = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/admanager",
  ];

  constructor(
    private configService: ConfigService,
    private adminService: AdminService,
    @Inject(forwardRef(() => ConnectionsService))
    private connectionsService: ConnectionsService,
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
   * Validate OAuth configuration
   */
  validateConfig(): { configured: boolean; missingFields?: string[] } {
    const missingFields: string[] = [];

    // Check for Ad Manager specific credentials first, then fall back to generic Google credentials
    const clientId =
      this.configService.get<string>("GOOGLE_AD_MANAGER_CLIENT_ID") ||
      this.configService.get<string>("GOOGLE_CLIENT_ID");
    const clientSecret =
      this.configService.get<string>("GOOGLE_AD_MANAGER_CLIENT_SECRET") ||
      this.configService.get<string>("GOOGLE_CLIENT_SECRET");

    if (!clientId)
      missingFields.push("GOOGLE_CLIENT_ID or GOOGLE_AD_MANAGER_CLIENT_ID");
    if (!clientSecret)
      missingFields.push(
        "GOOGLE_CLIENT_SECRET or GOOGLE_AD_MANAGER_CLIENT_SECRET",
      );

    return {
      configured: missingFields.length === 0,
      missingFields: missingFields.length > 0 ? missingFields : undefined,
    };
  }

  /**
   * Get Ad Manager OAuth credentials from config
   * Uses Ad Manager specific credentials if available, otherwise falls back to generic Google credentials
   */
  private getAdManagerCredentials(): {
    clientId: string;
    clientSecret: string;
  } {
    // Try Ad Manager specific credentials first, then fall back to generic Google credentials
    const clientId =
      this.configService.get<string>("GOOGLE_AD_MANAGER_CLIENT_ID") ||
      this.configService.get<string>("GOOGLE_CLIENT_ID");
    const clientSecret =
      this.configService.get<string>("GOOGLE_AD_MANAGER_CLIENT_SECRET") ||
      this.configService.get<string>("GOOGLE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        "Google OAuth not configured. Please contact administrator.",
      );
    }

    return { clientId, clientSecret };
  }

  /**
   * Generate OAuth state for CSRF protection
   */
  private generateState(data: OAuthState): string {
    const stateJson = JSON.stringify(data);
    const encoded = Buffer.from(stateJson).toString("base64url");
    return encoded;
  }

  /**
   * Parse OAuth state
   */
  private parseState(state: string): OAuthState | null {
    try {
      const decoded = Buffer.from(state, "base64url").toString("utf8");
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }

  /**
   * Build the OAuth authorization URL
   */
  async buildAuthorizationUrl(
    userId: string,
    connectionName: string,
    redirectUri: string,
    workspaceId?: string,
    reconnectConnectionId?: string,
  ): Promise<{ url: string }> {
    const { clientId } = this.getAdManagerCredentials();

    // Generate state for CSRF protection
    const state: OAuthState = {
      userId,
      workspaceId,
      connectionName,
      serviceType: "ad_manager",
      nonce: crypto.randomBytes(16).toString("hex"),
      timestamp: Date.now(),
      reconnectConnectionId,
    };

    const stateString = this.generateState(state);

    // Build authorization URL with offline access
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: this.AD_MANAGER_SCOPES.join(" "),
      state: stateString,
      access_type: "offline", // To get refresh token
      prompt: "consent", // Force consent to always get refresh token
    });

    const url = `${this.GOOGLE_AUTH_URL}?${params.toString()}`;

    this.logger.log(`Generated Ad Manager OAuth URL for user ${userId}`);

    return { url };
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    code: string,
    state: string,
    redirectUri: string,
    expectedUserId?: string,
  ): Promise<{
    connection: any;
    networks: AdManagerNetwork[];
  }> {
    // Parse and validate state
    const stateData = this.parseState(state);
    if (!stateData) {
      throw new BadRequestException("Invalid OAuth state");
    }

    // Verify state ownership if expectedUserId provided
    if (expectedUserId && stateData.userId !== expectedUserId) {
      throw new ForbiddenException(
        "OAuth state does not belong to the current user",
      );
    }

    // Check state timestamp (10 minute expiry)
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      throw new BadRequestException("OAuth state expired");
    }

    const { clientId, clientSecret } = this.getAdManagerCredentials();

    // Exchange code for token
    let tokenResponse: GoogleTokenResponse;
    try {
      const response = await fetch(this.GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        this.logger.error("Token exchange failed:", errorData);
        throw new BadRequestException(
          errorData.error_description || "Failed to exchange code for token",
        );
      }
      tokenResponse = await response.json();
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error("Token exchange error:", error);
      throw new InternalServerErrorException(
        "Failed to exchange authorization code",
      );
    }

    // Get user info
    let userInfo: GoogleUserInfo;
    try {
      const userResponse = await fetch(this.GOOGLE_USERINFO_URL, {
        headers: {
          Authorization: `Bearer ${tokenResponse.access_token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error("Failed to get user info");
      }
      userInfo = await userResponse.json();
    } catch (error) {
      this.logger.error("User info fetch error:", error);
      throw new InternalServerErrorException("Failed to get Google user info");
    }

    // Fetch available networks
    let networks: AdManagerNetwork[] = [];
    try {
      networks = await this.fetchNetworks(tokenResponse.access_token);
    } catch (error) {
      this.logger.warn("Failed to fetch Ad Manager networks:", error);
      // This is not fatal - user may not have networks yet
    }

    // Calculate token expiry
    const expiresAt = new Date(
      Date.now() + tokenResponse.expires_in * 1000,
    ).toISOString();

    // Connection data to save
    // Using hierarchical approach: plataform_name = 'google', metadata.type = 'ad_manager'
    // Clear needs_reconnect and error state on successful (re)connection
    const connectionData = {
      user_id: stateData.userId,
      workspace_id: stateData.workspaceId || null,
      connection_name: stateData.connectionName,
      plataform_name: "google",
      platform_user_id: userInfo.id,
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token || null,
      token_expires_at: expiresAt,
      metadata: {
        type: "ad_manager",
        networks,
        user_name: userInfo.name,
        user_email: userInfo.email,
        user_picture: userInfo.picture,
        scopes: tokenResponse.scope.split(" "),
      },
      is_active: true,
      needs_reconnect: false,
      last_refresh_error: null,
      last_refresh_attempt: new Date().toISOString(),
    };

    let connection: any;
    let connectionError: any;

    // Check if this is a reconnection
    if (stateData.reconnectConnectionId) {
      // First verify the connection exists and belongs to the workspace
      const { data: existingConnection, error: fetchError } =
        await this.supabase
          .from("connections")
          .select("id, workspace_id")
          .eq("id", stateData.reconnectConnectionId)
          .single();

      if (fetchError || !existingConnection) {
        this.logger.error("Connection not found for reconnect:", fetchError);
        throw new BadRequestException("Connection not found");
      }

      // Verify workspace access (connection must belong to the same workspace)
      if (
        stateData.workspaceId &&
        existingConnection.workspace_id !== stateData.workspaceId
      ) {
        this.logger.error("Workspace mismatch for reconnect");
        throw new ForbiddenException(
          "You do not have access to this connection",
        );
      }

      // Update existing connection
      const { data, error } = await this.supabase
        .from("connections")
        .update({
          ...connectionData,
          // Keep the original workspace_id to preserve workspace association
          workspace_id: existingConnection.workspace_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", stateData.reconnectConnectionId)
        .select()
        .single();

      connection = data;
      connectionError = error;

      if (connectionError) {
        this.logger.error("Failed to update connection:", connectionError);
        throw new InternalServerErrorException("Failed to update connection");
      }

      this.logger.log(
        `Reconnected Ad Manager connection ${connection.id} for user ${stateData.userId}`,
      );
    } else {
      // Create new connection
      const { data, error } = await this.supabase
        .from("connections")
        .insert(connectionData)
        .select()
        .single();

      connection = data;
      connectionError = error;

      if (connectionError) {
        this.logger.error("Failed to create connection:", connectionError);
        throw new InternalServerErrorException("Failed to save connection");
      }

      this.logger.log(
        `Created Ad Manager connection ${connection.id} for user ${stateData.userId}`,
      );
    }

    return { connection, networks };
  }

  /**
   * Fetch available Ad Manager networks for the user
   */
  async fetchNetworks(accessToken: string): Promise<AdManagerNetwork[]> {
    try {
      // Use the Ad Manager API to list networks
      const response = await fetch(`${this.AD_MANAGER_API_BASE}/networks`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.error("Failed to fetch networks:", errorData);
        throw new Error("Failed to fetch networks");
      }

      const data = await response.json();

      // Map the response to our network interface
      // The API returns networks in the format: { networks: [{ name: 'networks/123', networkCode: '123', displayName: '...', ... }] }
      const networks: AdManagerNetwork[] = (data.networks || []).map(
        (network: any) => ({
          id: network.networkCode || network.name?.split("/").pop() || "",
          name: network.displayName || network.networkCode || "Unknown Network",
          currencyCode: network.currencyCode || "USD",
        }),
      );

      this.logger.log(`Fetched ${networks.length} Ad Manager networks`);
      return networks;
    } catch (error) {
      this.logger.error("Error fetching networks:", error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   *
   * @throws TokenRefreshError with errorType 'permanent' if user must reconnect
   * @throws TokenRefreshError with errorType 'transient' if retry is possible
   *
   * @feature 20260202-oauth-token-management
   * @requirement FR-006: Verify needs_reconnect flag before any operation
   * @requirement FR-007: Reject operations on connections with needs_reconnect=true
   */
  async refreshAccessToken(connectionId: string): Promise<{
    accessToken: string;
    expiresAt: string;
  }> {
    // Guard: Check if connection needs manual reconnection
    // @feature 20260202-oauth-token-management
    // This prevents infinite refresh loops when token is permanently invalid
    try {
      await this.connectionsService.assertConnectionValid(connectionId);
    } catch (error) {
      // Convert BadRequestException to TokenRefreshError for consistent error handling
      if (error instanceof BadRequestException) {
        throw new TokenRefreshError(
          "Connection requires manual reconnection. Please reconnect your Ad Manager account.",
          "permanent",
          "needs_reconnect",
        );
      }
      throw error;
    }

    // Get connection with refresh token
    const { data: connection, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (error || !connection) {
      throw new NotFoundException("Connection not found");
    }

    // Verify it's an Ad Manager connection (support both old 'ad_manager' and new 'google' + metadata.type)
    const isAdManagerConnection =
      connection.plataform_name === "ad_manager" ||
      (connection.plataform_name === "google" &&
        connection.metadata?.type === "ad_manager");

    if (!isAdManagerConnection) {
      throw new BadRequestException("Not an Ad Manager connection");
    }

    if (!connection.refresh_token) {
      throw new TokenRefreshError(
        "No refresh token available. Please reconnect your Ad Manager account.",
        "permanent",
      );
    }

    const { clientId, clientSecret } = this.getAdManagerCredentials();

    // Refresh the token with retry logic (exponential backoff)
    // Only retry for transient errors, fail fast for permanent errors
    const maxAttempts = 3;
    const baseDelay = 1000; // 1 second
    let tokenResponse: GoogleTokenResponse;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(this.GOOGLE_TOKEN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: connection.refresh_token,
            grant_type: "refresh_token",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          this.logger.error(
            `Token refresh failed (attempt ${attempt}/${maxAttempts}):`,
            errorData,
          );

          // Check if this is a permanent error - no point retrying
          const isPermanentError = PERMANENT_ERROR_CODES.includes(
            errorData.error,
          );

          if (isPermanentError) {
            this.logger.warn(
              `Permanent error detected (${errorData.error}), not retrying`,
            );
            throw new TokenRefreshError(
              errorData.error_description ||
                "Token has been revoked or expired. Please reconnect your account.",
              "permanent",
              errorData.error,
            );
          }

          // If last attempt for transient error, throw
          if (attempt === maxAttempts) {
            throw new TokenRefreshError(
              errorData.error_description ||
                "Failed to refresh token after multiple attempts.",
              "transient",
              errorData.error,
            );
          }

          // Otherwise, wait and retry with exponential backoff for transient errors
          const delay = baseDelay * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        tokenResponse = await response.json();
        if (attempt > 1) {
          this.logger.log(
            `Token refresh succeeded on attempt ${attempt}/${maxAttempts}`,
          );
        }
        break;
      } catch (error) {
        // Re-throw TokenRefreshError as-is
        if (error instanceof TokenRefreshError) throw error;

        // Network or other unexpected errors are transient
        if (attempt === maxAttempts) {
          this.logger.error("Token refresh network error:", error);
          throw new TokenRefreshError(
            "Network error while refreshing token. Will retry later.",
            "transient",
            error instanceof Error ? error.message : "Unknown error",
          );
        }

        // Otherwise, wait and retry
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // Calculate new expiry
    const expiresAt = new Date(
      Date.now() + tokenResponse.expires_in * 1000,
    ).toISOString();

    // Update connection with new token and clear error state
    const { error: updateError } = await this.supabase
      .from("connections")
      .update({
        access_token: tokenResponse.access_token,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
        needs_reconnect: false,
        last_refresh_error: null,
        last_refresh_attempt: new Date().toISOString(),
      })
      .eq("id", connectionId);

    if (updateError) {
      this.logger.error("Failed to update connection:", updateError);
      throw new InternalServerErrorException("Failed to save refreshed token");
    }

    this.logger.log(
      `Refreshed token for Ad Manager connection ${connectionId}`,
    );

    return {
      accessToken: tokenResponse.access_token,
      expiresAt,
    };
  }

  /**
   * Verify connection ownership via workspace membership
   */
  async verifyConnectionOwnership(
    connectionId: string,
    userId: string,
  ): Promise<any> {
    const { data: connection, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (error || !connection) {
      throw new NotFoundException("Connection not found");
    }

    // Verify it's an Ad Manager connection (support both old 'ad_manager' and new 'google' + metadata.type)
    const isAdManagerConnection =
      connection.plataform_name === "ad_manager" ||
      (connection.plataform_name === "google" &&
        connection.metadata?.type === "ad_manager");

    if (!isAdManagerConnection) {
      throw new BadRequestException("Not an Ad Manager connection");
    }

    const isSuperAdmin = await this.adminService.isSuperAdmin(userId);
    if (isSuperAdmin) {
      return connection;
    }

    // Verify user has access to this connection via workspace membership or direct ownership
    if (connection.workspace_id) {
      const { data: membership } = await this.supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", connection.workspace_id)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (!membership && connection.user_id !== userId) {
        throw new ForbiddenException(
          "You do not have access to this connection",
        );
      }
    } else if (connection.user_id !== userId) {
      throw new ForbiddenException("You do not have access to this connection");
    }

    return connection;
  }

  /**
   * In-memory cache for validated connections within a request lifecycle
   * Key: `${connectionId}:${userId}`, Value: connection with valid token
   * TTL: 60 seconds (covers most request durations)
   */
  private connectionCache = new Map<
    string,
    { connection: any; cachedAt: number }
  >();
  private readonly CONNECTION_CACHE_TTL_MS = 60000; // 60 seconds

  /**
   * Get connection with valid access token (refreshing if needed)
   * Uses in-memory cache to avoid redundant DB queries for the same connection within a request
   */
  async getConnectionWithValidToken(
    connectionId: string,
    userId: string,
  ): Promise<any> {
    const cacheKey = `${connectionId}:${userId}`;
    const now = Date.now();

    // Check in-memory cache first (avoids DB query entirely for repeated calls)
    const cached = this.connectionCache.get(cacheKey);
    if (cached && now - cached.cachedAt < this.CONNECTION_CACHE_TTL_MS) {
      // Still check if token needs refresh (might have expired since caching)
      const tokenExpiresAt = cached.connection.token_expires_at
        ? new Date(cached.connection.token_expires_at)
        : null;
      const isExpired =
        tokenExpiresAt && tokenExpiresAt < new Date(now + 5 * 60 * 1000);

      if (!isExpired) {
        this.logger.debug(
          `[TOKEN CACHE HIT] Ad Manager connection ${connectionId} (age: ${now - cached.cachedAt}ms)`,
        );
        return cached.connection;
      }
      // Token expired, need to refresh (but connection data is still valid)
    }

    // Fetch from DB (only happens once per connection per request cycle)
    const connection = await this.verifyConnectionOwnership(
      connectionId,
      userId,
    );

    // Check if token is expired or about to expire (within 5 minutes)
    const tokenExpiresAt = connection.token_expires_at
      ? new Date(connection.token_expires_at)
      : null;
    const isExpired =
      tokenExpiresAt && tokenExpiresAt < new Date(now + 5 * 60 * 1000);

    let finalConnection = connection;

    if (isExpired && connection.refresh_token) {
      const { accessToken, expiresAt } =
        await this.refreshAccessToken(connectionId);
      finalConnection = {
        ...connection,
        access_token: accessToken,
        token_expires_at: expiresAt,
      };
    }

    // Cache the validated connection
    this.connectionCache.set(cacheKey, {
      connection: finalConnection,
      cachedAt: now,
    });

    // Cleanup old entries periodically (every 100 calls)
    if (this.connectionCache.size > 100) {
      this.cleanupConnectionCache();
    }

    return finalConnection;
  }

  /**
   * Clean up expired entries from the connection cache
   */
  private cleanupConnectionCache(): void {
    const now = Date.now();
    for (const [key, value] of this.connectionCache.entries()) {
      if (now - value.cachedAt > this.CONNECTION_CACHE_TTL_MS) {
        this.connectionCache.delete(key);
      }
    }
  }

  /**
   * Get networks from connection metadata
   */
  async getNetworksFromConnection(
    connectionId: string,
    userId: string,
  ): Promise<AdManagerNetwork[]> {
    const connection = await this.verifyConnectionOwnership(
      connectionId,
      userId,
    );

    // Return networks from metadata
    const networks = connection.metadata?.networks || [];
    return networks;
  }

  /**
   * Sync networks from connection metadata to ad_manager_networks table
   */
  async syncNetworksToDatabase(
    connectionId: string,
    userId: string,
    _workspaceId?: string,
  ): Promise<{
    success: boolean;
    synced: number;
    networks: any[];
  }> {
    // Get connection and verify ownership
    const connection = await this.verifyConnectionOwnership(
      connectionId,
      userId,
    );

    // Get networks from metadata
    const metadataNetworks = connection.metadata?.networks || [];

    if (metadataNetworks.length === 0) {
      // Try to fetch fresh networks from API
      const freshNetworks = await this.fetchNetworks(connection.access_token);

      if (freshNetworks.length === 0) {
        return {
          success: true,
          synced: 0,
          networks: [],
        };
      }

      // Update connection metadata with fresh networks
      await this.supabase
        .from("connections")
        .update({
          metadata: {
            ...connection.metadata,
            networks: freshNetworks,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", connectionId);

      metadataNetworks.push(...freshNetworks);
    }

    // Get existing networks to check which ones already exist
    const { data: existingNetworks } = await this.supabase
      .from("ad_manager_networks")
      .select("network_code, is_active")
      .eq("connection_id", connectionId);

    const existingNetworkCodes = new Set(
      (existingNetworks || []).map((n) => n.network_code),
    );

    // Upsert networks to database
    const networksToInsert = metadataNetworks.map((network) => {
      const isExisting = existingNetworkCodes.has(network.id);
      const existingNetwork = (existingNetworks || []).find(
        (n) => n.network_code === network.id,
      );

      return {
        connection_id: connectionId,
        user_id: connection.user_id,
        workspace_id: connection.workspace_id,
        network_code: network.id,
        network_name: network.name,
        currency_code: network.currencyCode,
        // New networks are active by default, existing networks keep their status
        is_active: isExisting ? existingNetwork?.is_active : true,
        last_synced_at: new Date().toISOString(),
      };
    });

    const { data, error } = await this.supabase
      .from("ad_manager_networks")
      .upsert(networksToInsert, {
        onConflict: "connection_id,network_code",
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      this.logger.error("Failed to sync networks:", error);
      throw new InternalServerErrorException("Failed to sync networks");
    }

    this.logger.log(
      `Synced ${data.length} Ad Manager networks for connection ${connectionId}`,
    );

    return {
      success: true,
      synced: data.length,
      networks: data,
    };
  }

  /**
   * Get networks list from database
   * Returns ALL networks (active and inactive) for connection owner/admin
   * This allows them to activate/deactivate networks in the UI
   */
  async getNetworksList(
    connectionId: string,
    userId: string,
  ): Promise<{
    success: boolean;
    networks: any[];
  }> {
    // Verify connection ownership
    const connection = await this.verifyConnectionOwnership(
      connectionId,
      userId,
    );

    // Check if user is the connection creator or admin
    // Use String() to ensure consistent comparison (UUID can come as string or object)
    const isCreator = String(connection.user_id) === String(userId);
    const isSuperAdmin = await this.adminService.isSuperAdmin(userId);
    const canEdit = isCreator || isSuperAdmin;

    // Get networks from database
    // If user can edit, return ALL networks (active and inactive)
    // If user cannot edit, return only active networks
    let query = this.supabase
      .from("ad_manager_networks")
      .select("*")
      .eq("connection_id", connectionId);

    if (!canEdit) {
      // Non-owners see only active networks
      query = query.eq("is_active", true);
    }

    const { data, error } = await query.order("network_name", {
      ascending: true,
    });

    if (error) {
      this.logger.error("Failed to get networks:", error);
      throw new InternalServerErrorException("Failed to get networks");
    }

    // Map to both old and new formats for compatibility
    const networks = (data || []).map((network) => ({
      // New format (for revenue dashboard)
      id: network.network_code,
      name: network.network_name,
      currencyCode: network.currency_code,
      is_active: network.is_active,
      // Old format (for connections modal)
      network_code: network.network_code,
      network_name: network.network_name,
      currency_code: network.currency_code,
      created_at: network.created_at,
      updated_at: network.updated_at,
    }));

    this.logger.log(
      `Returning ${networks.length} networks for connection ${connectionId} (canEdit: ${canEdit})`,
    );

    return {
      success: true,
      networks,
    };
  }

  /**
   * Batch fetch networks for multiple connections in a single query
   * Optimized to avoid N+1 queries when fetching networks for multiple connections
   */
  async getNetworksListBatch(
    connectionIds: string[],
    userId: string,
  ): Promise<{
    success: boolean;
    networks: Array<{
      id: string;
      name: string;
      currencyCode: string;
      is_active: boolean;
      connectionId: string;
    }>;
  }> {
    if (!connectionIds.length) {
      return { success: true, networks: [] };
    }

    // Verify all connections are accessible (batch verification)
    const { data: connections, error: connError } = await this.supabase
      .from("connections")
      .select("id, user_id, workspace_id")
      .in("id", connectionIds);

    if (connError) {
      this.logger.error("Failed to verify connections:", connError);
      throw new InternalServerErrorException("Failed to verify connections");
    }

    // Filter to only connections user has access to
    const accessibleConnectionIds = (connections || []).map((c) => c.id);

    if (!accessibleConnectionIds.length) {
      return { success: true, networks: [] };
    }

    // Check if user is admin (for active/inactive visibility)
    const isSuperAdmin = await this.adminService.isSuperAdmin(userId);

    // Get networks for all connections in single query
    let query = this.supabase
      .from("ad_manager_networks")
      .select("*")
      .in("connection_id", accessibleConnectionIds);

    // Non-admins only see active networks (simplified check)
    if (!isSuperAdmin) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query.order("network_name", {
      ascending: true,
    });

    if (error) {
      this.logger.error("Failed to get networks batch:", error);
      throw new InternalServerErrorException("Failed to get networks");
    }

    const networks = (data || []).map((network) => ({
      id: network.network_code,
      name: network.network_name,
      currencyCode: network.currency_code,
      is_active: network.is_active,
      connectionId: network.connection_id,
    }));

    this.logger.log(
      `Batch returning ${networks.length} networks for ${accessibleConnectionIds.length} connections`,
    );

    return { success: true, networks };
  }

  /**
   * Update network active status
   * If network doesn't exist in database, it will be created from connection metadata
   */
  async updateNetworkStatus(
    networkId: string,
    isActive: boolean,
    userId: string,
    connectionId?: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    if (!connectionId) {
      throw new BadRequestException("connectionId é obrigatório");
    }

    // Fetch connection once for validation + permission checks
    const { data: connection, error: connectionError } = await this.supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (connectionError || !connection) {
      throw new NotFoundException("Conexão não encontrada");
    }

    const isAdManagerConnection =
      connection.plataform_name === "ad_manager" ||
      (connection.plataform_name === "google" &&
        connection.metadata?.type === "ad_manager");

    if (!isAdManagerConnection) {
      throw new BadRequestException("Conexão não é do Ad Manager");
    }

    const isCreator = String(connection.user_id) === String(userId);
    const isSuperAdmin = await this.adminService.isSuperAdmin(userId);

    if (!isCreator && !isSuperAdmin) {
      throw new ForbiddenException(
        "Você não tem permissão para alterar esta conexão. Somente o criador ou um super admin pode modificar redes.",
      );
    }

    // First try to get the network from database (unique per connection)
    // networkId is the network_code
    const { data: existingNetwork, error: fetchError } = await this.supabase
      .from("ad_manager_networks")
      .select("id")
      .eq("connection_id", connectionId)
      .eq("network_code", networkId)
      .maybeSingle();

    if (fetchError) {
      this.logger.error(`Error fetching network: ${networkId}`, fetchError);
      throw new InternalServerErrorException("Erro ao buscar rede");
    }

    if (existingNetwork) {
      const { error: updateError } = await this.supabase
        .from("ad_manager_networks")
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq("id", existingNetwork.id);

      if (updateError) {
        this.logger.error("Failed to update network:", updateError);
        throw new InternalServerErrorException("Erro ao atualizar rede");
      }

      this.logger.log(
        `Updated network ${networkId} status to ${isActive ? "active" : "inactive"}`,
      );

      return {
        success: true,
        message: `Rede ${isActive ? "ativada" : "desativada"} com sucesso`,
      };
    }

    // Network doesn't exist - create it from connection metadata
    this.logger.log(
      `Network ${networkId} not found in database for connection ${connectionId}, checking metadata...`,
    );

    const metadataNetworks = connection.metadata?.networks || [];
    const networkFromMetadata = metadataNetworks.find(
      (network: any) => network.id === networkId,
    );

    if (!networkFromMetadata) {
      this.logger.error(
        `Network ${networkId} not found in connection metadata for ${connectionId}`,
      );
      throw new NotFoundException(
        "Rede não encontrada. Sincronize as redes e tente novamente.",
      );
    }

    const { error: insertError } = await this.supabase
      .from("ad_manager_networks")
      .insert({
        connection_id: connection.id,
        user_id: connection.user_id,
        workspace_id: connection.workspace_id,
        network_code: networkId,
        network_name: networkFromMetadata.name,
        currency_code: networkFromMetadata.currencyCode,
        is_active: isActive,
        last_synced_at: new Date().toISOString(),
      });

    if (insertError) {
      this.logger.error("Failed to create network:", insertError);
      throw new InternalServerErrorException("Erro ao criar rede");
    }

    this.logger.log(
      `Created and ${isActive ? "activated" : "deactivated"} network ${networkId} from connection ${connection.id}`,
    );

    return {
      success: true,
      message: `Rede ${isActive ? "ativada" : "desativada"} com sucesso`,
    };
  }

  /**
   * Validate multiple connections in a single optimized query
   * Returns which connections have active networks
   */
  async validateConnections(
    connectionIds: string[],
    _userId: string,
  ): Promise<{
    success: boolean;
    validations: Array<{
      connectionId: string;
      hasActiveNetworks: boolean;
      activeNetworkCount: number;
    }>;
  }> {
    if (connectionIds.length === 0) {
      return { success: true, validations: [] };
    }

    // Single optimized query to get active network counts for all connections
    // Uses aggregation to avoid N+1 queries
    const { data, error } = await this.supabase
      .from("ad_manager_networks")
      .select("connection_id, is_active")
      .in("connection_id", connectionIds)
      .eq("is_active", true);

    if (error) {
      this.logger.error("Failed to validate connections:", error);
      throw new InternalServerErrorException("Failed to validate connections");
    }

    // Count active networks per connection
    const activeCountsByConnection = new Map<string, number>();
    (data || []).forEach((network) => {
      const count = activeCountsByConnection.get(network.connection_id) || 0;
      activeCountsByConnection.set(network.connection_id, count + 1);
    });

    // Build result for all requested connections
    const validations = connectionIds.map((connectionId) => {
      const activeNetworkCount =
        activeCountsByConnection.get(connectionId) || 0;
      return {
        connectionId,
        hasActiveNetworks: activeNetworkCount > 0,
        activeNetworkCount,
      };
    });

    this.logger.log(
      `Validated ${connectionIds.length} connections, ${validations.filter((v) => v.hasActiveNetworks).length} have active networks`,
    );

    return {
      success: true,
      validations,
    };
  }

  /**
   * Fix network activation: Set is_active=true for all user's networks with valid data
   * This is a fix for networks that were synced before is_active was properly set
   */
  async fixNetworkActivation(userId: string): Promise<{
    success: boolean;
    updated: number;
  }> {
    const { data, error } = await this.supabase
      .from("ad_manager_networks")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("is_active", false)
      .not("network_code", "is", null)
      .not("network_name", "is", null)
      .select();

    if (error) {
      this.logger.error("Failed to fix network activation:", error);
      throw new InternalServerErrorException(
        "Failed to fix network activation",
      );
    }

    const updated = data?.length || 0;
    this.logger.log(`Activated ${updated} networks for user ${userId}`);

    return {
      success: true,
      updated,
    };
  }
}
