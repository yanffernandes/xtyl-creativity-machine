import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as crypto from "crypto";
import { TokenRefreshError } from "../../google/services/google-oauth.service";

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

export interface SearchConsoleSite {
  siteUrl: string;
  permissionLevel: string;
}

@Injectable()
export class SearchConsoleOAuthService {
  private readonly logger = new Logger(SearchConsoleOAuthService.name);
  private supabase: SupabaseClient;

  // Google OAuth URLs
  private readonly GOOGLE_AUTH_URL =
    "https://accounts.google.com/o/oauth2/v2/auth";
  private readonly GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
  private readonly GOOGLE_USERINFO_URL =
    "https://www.googleapis.com/oauth2/v2/userinfo";

  // Search Console API Base URL
  private readonly SEARCH_CONSOLE_API_BASE =
    "https://www.googleapis.com/webmasters/v3";

  // Required scopes for Search Console (readonly)
  private readonly SEARCH_CONSOLE_SCOPES = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/webmasters.readonly",
  ];

  constructor(private configService: ConfigService) {
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

    const clientId = this.configService.get<string>("GOOGLE_CLIENT_ID");
    const clientSecret = this.configService.get<string>("GOOGLE_CLIENT_SECRET");

    if (!clientId) missingFields.push("GOOGLE_CLIENT_ID");
    if (!clientSecret) missingFields.push("GOOGLE_CLIENT_SECRET");

    return {
      configured: missingFields.length === 0,
      missingFields: missingFields.length > 0 ? missingFields : undefined,
    };
  }

  /**
   * Get Google OAuth credentials from config
   */
  private getGoogleCredentials(): { clientId: string; clientSecret: string } {
    const clientId = this.configService.get<string>("GOOGLE_CLIENT_ID");
    const clientSecret = this.configService.get<string>("GOOGLE_CLIENT_SECRET");

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
      serviceType: "search_console",
      nonce: crypto.randomBytes(16).toString("hex"),
      timestamp: Date.now(),
      reconnectConnectionId,
    };

    const stateString = this.generateState(state);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: this.SEARCH_CONSOLE_SCOPES.join(" "),
      state: stateString,
      access_type: "offline",
      prompt: "consent",
    });

    const url = `${this.GOOGLE_AUTH_URL}?${params.toString()}`;

    this.logger.log(`Generated Search Console OAuth URL for user ${userId}`);

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
    sites: SearchConsoleSite[];
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

    // Fetch available Search Console sites
    let sites: SearchConsoleSite[] = [];
    try {
      sites = await this.fetchSites(tokenResponse.access_token);
    } catch (error) {
      this.logger.warn("Failed to fetch Search Console sites:", error);
      // Not fatal - user may not have sites yet
    }

    // Calculate token expiry
    const expiresAt = new Date(
      Date.now() + tokenResponse.expires_in * 1000,
    ).toISOString();

    // Connection data to save
    // Using hierarchical approach: plataform_name = 'google', metadata.type = 'search_console'
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
        type: "search_console",
        sites,
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
        `Reconnected Search Console connection ${connection.id} for user ${stateData.userId}`,
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
        `Created Search Console connection ${connection.id} for user ${stateData.userId}`,
      );
    }

    return { connection, sites };
  }

  /**
   * Fetch available Search Console sites for the user
   */
  async fetchSites(accessToken: string): Promise<SearchConsoleSite[]> {
    try {
      const response = await fetch(`${this.SEARCH_CONSOLE_API_BASE}/sites`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.error("Failed to fetch Search Console sites:", errorData);
        throw new Error("Failed to fetch Search Console sites");
      }

      const data = await response.json();

      const sites: SearchConsoleSite[] = (data.siteEntry || []).map(
        (site: any) => ({
          siteUrl: site.siteUrl,
          permissionLevel: site.permissionLevel,
        }),
      );

      this.logger.log(`Fetched ${sites.length} Search Console sites`);
      return sites;
    } catch (error) {
      this.logger.error("Error fetching Search Console sites:", error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   *
   * @throws TokenRefreshError with errorType 'permanent' if user must reconnect
   * @throws TokenRefreshError with errorType 'transient' if retry is possible
   */
  async refreshAccessToken(connectionId: string): Promise<{
    accessToken: string;
    expiresAt: string;
  }> {
    const { data: connection, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (error || !connection) {
      throw new NotFoundException("Connection not found");
    }

    // Verify it's a Search Console connection (support both old 'search_console' and new 'google' + metadata.type)
    const isSearchConsoleConnection =
      connection.plataform_name === "search_console" ||
      (connection.plataform_name === "google" &&
        connection.metadata?.type === "search_console");

    if (!isSearchConsoleConnection) {
      throw new BadRequestException("Not a Search Console connection");
    }

    if (!connection.refresh_token) {
      throw new TokenRefreshError(
        "No refresh token available. Please reconnect your Search Console account.",
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

    this.logger.log(
      `Refreshed token for Search Console connection ${connectionId}`,
    );

    return {
      accessToken: tokenResponse.access_token,
      expiresAt,
    };
  }

  /**
   * Verify connection ownership
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

    // Verify it's a Search Console connection (support both old 'search_console' and new 'google' + metadata.type)
    const isSearchConsoleConnection =
      connection.plataform_name === "search_console" ||
      (connection.plataform_name === "google" &&
        connection.metadata?.type === "search_console");

    if (!isSearchConsoleConnection) {
      throw new BadRequestException("Not a Search Console connection");
    }

    // Check ownership via workspace or direct user
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
   * Get connection with valid access token (refreshing if needed)
   */
  async getConnectionWithValidToken(
    connectionId: string,
    userId: string,
  ): Promise<any> {
    const connection = await this.verifyConnectionOwnership(
      connectionId,
      userId,
    );

    const tokenExpiresAt = connection.token_expires_at
      ? new Date(connection.token_expires_at)
      : null;
    const isExpired =
      tokenExpiresAt && tokenExpiresAt < new Date(Date.now() + 5 * 60 * 1000);

    if (isExpired && connection.refresh_token) {
      const { accessToken, expiresAt } =
        await this.refreshAccessToken(connectionId);
      return {
        ...connection,
        access_token: accessToken,
        token_expires_at: expiresAt,
      };
    }

    return connection;
  }

  /**
   * Get sites from connection metadata
   */
  async getSitesFromConnection(
    connectionId: string,
    userId: string,
  ): Promise<SearchConsoleSite[]> {
    const connection = await this.verifyConnectionOwnership(
      connectionId,
      userId,
    );
    const sites = connection.metadata?.sites || [];
    return sites;
  }
}
