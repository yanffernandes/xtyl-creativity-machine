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

export interface AdSenseAccount {
  id: string;
  name: string;
  displayName: string;
  timezone?: string;
  currencyCode: string;
  state?: "READY" | "NEEDS_ATTENTION" | "CLOSED" | "STATE_UNSPECIFIED";
}

@Injectable()
export class AdSenseOAuthService {
  private readonly logger = new Logger(AdSenseOAuthService.name);
  private supabase: SupabaseClient;

  // Google OAuth URLs
  private readonly GOOGLE_AUTH_URL =
    "https://accounts.google.com/o/oauth2/v2/auth";
  private readonly GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
  private readonly GOOGLE_USERINFO_URL =
    "https://www.googleapis.com/oauth2/v2/userinfo";

  // AdSense API Base URL
  private readonly ADSENSE_API_BASE = "https://adsense.googleapis.com/v2";

  // Required scopes for AdSense (read-only per spec)
  private readonly ADSENSE_SCOPES = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/adsense.readonly",
  ];

  constructor(
    private configService: ConfigService,
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
   * Get Google OAuth credentials from config
   */
  private getGoogleCredentials(): { clientId: string; clientSecret: string } {
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
    const { clientId } = this.getGoogleCredentials();

    const state: OAuthState = {
      userId,
      workspaceId,
      connectionName,
      serviceType: "adsense",
      nonce: crypto.randomBytes(16).toString("hex"),
      timestamp: Date.now(),
      reconnectConnectionId,
    };

    const stateString = this.generateState(state);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: this.ADSENSE_SCOPES.join(" "),
      state: stateString,
      access_type: "offline",
      prompt: "consent",
    });

    const url = `${this.GOOGLE_AUTH_URL}?${params.toString()}`;

    this.logger.log(`Generated AdSense OAuth URL for user ${userId}`);

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
    accounts: AdSenseAccount[];
  }> {
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

    const { clientId, clientSecret } = this.getGoogleCredentials();

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

    // Fetch available AdSense accounts
    let accounts: AdSenseAccount[] = [];
    try {
      accounts = await this.fetchAccounts(tokenResponse.access_token);
    } catch (error) {
      this.logger.warn("Failed to fetch AdSense accounts:", error);
      // Not fatal - user may not have accounts yet
    }

    // Calculate token expiry
    const expiresAt = new Date(
      Date.now() + tokenResponse.expires_in * 1000,
    ).toISOString();

    // Connection data to save
    // Using hierarchical approach: plataform_name = 'google', metadata.type = 'adsense'
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
        type: "adsense",
        accounts,
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

      if (
        stateData.workspaceId &&
        existingConnection.workspace_id !== stateData.workspaceId
      ) {
        this.logger.error("Workspace mismatch for reconnect");
        throw new ForbiddenException(
          "You do not have access to this connection",
        );
      }

      const { data, error } = await this.supabase
        .from("connections")
        .update({
          ...connectionData,
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
        `Reconnected AdSense connection ${connection.id} for user ${stateData.userId}`,
      );
    } else {
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
        `Created AdSense connection ${connection.id} for user ${stateData.userId}`,
      );
    }

    return { connection, accounts };
  }

  /**
   * Fetch available AdSense accounts for the user
   */
  async fetchAccounts(accessToken: string): Promise<AdSenseAccount[]> {
    try {
      const response = await fetch(`${this.ADSENSE_API_BASE}/accounts`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.error("Failed to fetch AdSense accounts:", errorData);
        throw new Error("Failed to fetch AdSense accounts");
      }

      const data = await response.json();

      const accounts: AdSenseAccount[] = (data.accounts || []).map(
        (account: any) => ({
          id: account.name?.split("/").pop() || "",
          name: account.name || "",
          displayName:
            account.displayName ||
            account.name?.split("/").pop() ||
            "Unknown Account",
          timezone: account.timeZone?.id,
          currencyCode: account.reportingTimeZone?.currencyCode || "USD",
          state: account.state || "STATE_UNSPECIFIED",
        }),
      );

      this.logger.log(`Fetched ${accounts.length} AdSense accounts`);
      return accounts;
    } catch (error) {
      this.logger.error("Error fetching AdSense accounts:", error);
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
          "Connection requires manual reconnection. Please reconnect your AdSense account.",
          "permanent",
          "needs_reconnect",
        );
      }
      throw error;
    }

    const { data: connection, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (error || !connection) {
      throw new NotFoundException("Connection not found");
    }

    // Verify it's an AdSense connection (support both old 'google' and new 'adsense' plataform_name)
    const isAdSenseConnection =
      connection.plataform_name === "adsense" ||
      (connection.plataform_name === "google" &&
        connection.metadata?.type === "adsense");

    if (!isAdSenseConnection) {
      throw new BadRequestException("Not an AdSense connection");
    }

    if (!connection.refresh_token) {
      throw new TokenRefreshError(
        "No refresh token available. Please reconnect your AdSense account.",
        "permanent",
      );
    }

    const { clientId, clientSecret } = this.getGoogleCredentials();

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

    const expiresAt = new Date(
      Date.now() + tokenResponse.expires_in * 1000,
    ).toISOString();

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

    this.logger.log(`Refreshed token for AdSense connection ${connectionId}`);

    return {
      accessToken: tokenResponse.access_token,
      expiresAt,
    };
  }

  /**
   * Verify connection ownership (supports both direct ownership and workspace membership)
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

    // Verify it's an AdSense connection (support both old 'google' and new 'adsense' plataform_name)
    const isAdSenseConnection =
      connection.plataform_name === "adsense" ||
      (connection.plataform_name === "google" &&
        connection.metadata?.type === "adsense");

    if (!isAdSenseConnection) {
      throw new BadRequestException("Not an AdSense connection");
    }

    // Check access via workspace membership or direct ownership
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
          `[TOKEN CACHE HIT] AdSense connection ${connectionId} (age: ${now - cached.cachedAt}ms)`,
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
   * Get accounts from connection metadata
   */
  async getAccountsFromConnection(
    connectionId: string,
    userId: string,
  ): Promise<AdSenseAccount[]> {
    const connection = await this.verifyConnectionOwnership(
      connectionId,
      userId,
    );
    const accounts = connection.metadata?.accounts || [];
    return accounts;
  }
}
