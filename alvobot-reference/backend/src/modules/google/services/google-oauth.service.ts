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
import { ConnectionsService } from "../../connections/connections.service";
import { CircuitBreakerService } from "../../connections/circuit-breaker.service";

interface OAuthState {
  userId: string;
  workspaceId?: string;
  connectionName: string;
  connectionType: "ads";
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

/**
 * Error types for token refresh failures
 * - permanent: Token revoked/expired permanently, user must reconnect
 * - transient: Temporary failure (network, rate limit), can retry later
 */
export type TokenRefreshErrorType = "permanent" | "transient";

export class TokenRefreshError extends Error {
  constructor(
    message: string,
    public readonly errorType: TokenRefreshErrorType,
    public readonly originalError?: string,
  ) {
    super(message);
    this.name = "TokenRefreshError";
  }
}

/**
 * Permanent error codes from Google OAuth that require user reconnection
 * @see https://developers.google.com/identity/protocols/oauth2/web-server#handlingresponse
 */
const PERMANENT_ERROR_CODES = [
  "invalid_grant", // Token expired, revoked, or invalid
  "invalid_client", // Client credentials invalid
  "unauthorized_client", // Client not authorized for this grant type
  "access_denied", // User denied access
];

interface GoogleAdsCustomer {
  resourceName: string;
  id: string;
  descriptiveName: string;
  currencyCode: string;
  timeZone: string;
}

@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);
  private supabase: SupabaseClient;

  // Google OAuth URLs
  private readonly GOOGLE_AUTH_URL =
    "https://accounts.google.com/o/oauth2/v2/auth";
  private readonly GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
  private readonly GOOGLE_USERINFO_URL =
    "https://www.googleapis.com/oauth2/v2/userinfo";

  // Required scopes for Google Ads
  private readonly GOOGLE_ADS_SCOPES = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/adwords",
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
   * Get Google OAuth credentials from config
   */
  private getGoogleCredentials(): { clientId: string; clientSecret: string } {
    const clientId =
      this.configService.get<string>("GOOGLE_ADS_CLIENT_ID") ||
      this.configService.get<string>("GOOGLE_CLIENT_ID");
    const clientSecret =
      this.configService.get<string>("GOOGLE_ADS_CLIENT_SECRET") ||
      this.configService.get<string>("GOOGLE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        "Google OAuth not configured. Please contact administrator.",
      );
    }

    return { clientId, clientSecret };
  }

  /**
   * Build the OAuth authorization URL
   */
  async buildAuthorizationUrl(
    userId: string,
    connectionName: string,
    connectionType: "ads",
    redirectUri: string,
    workspaceId?: string,
    reconnectConnectionId?: string,
  ): Promise<{ url: string }> {
    const { clientId } = this.getGoogleCredentials();

    // Generate state for CSRF protection
    const state: OAuthState = {
      userId,
      workspaceId,
      connectionName,
      connectionType,
      serviceType: "ads",
      nonce: crypto.randomBytes(16).toString("hex"),
      timestamp: Date.now(),
      reconnectConnectionId,
    };

    const stateString = this.generateState(state);

    // Build authorization URL with PKCE and offline access
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: this.GOOGLE_ADS_SCOPES.join(" "),
      state: stateString,
      access_type: "offline", // To get refresh token
      prompt: "consent", // Force consent to always get refresh token
    });

    const url = `${this.GOOGLE_AUTH_URL}?${params.toString()}`;

    this.logger.log(`Generated Google OAuth URL for user ${userId}`);

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
    accounts: GoogleAdsCustomer[];
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

    // Calculate token expiry
    const expiresAt = new Date(
      Date.now() + tokenResponse.expires_in * 1000,
    ).toISOString();

    // Connection data to save
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
        type: stateData.connectionType,
        user_name: userInfo.name,
        user_email: userInfo.email,
        user_picture: userInfo.picture,
        scopes: tokenResponse.scope,
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
        `Reconnected Google connection ${connection.id} for user ${stateData.userId}`,
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
        `Created Google connection ${connection.id} for user ${stateData.userId}`,
      );
    }

    // Try to get Google Ads accounts (optional - may fail if user has no ads accounts)
    let accounts: GoogleAdsCustomer[] = [];
    try {
      accounts = await this.fetchGoogleAdsAccounts(tokenResponse.access_token);
    } catch (error) {
      this.logger.warn("Failed to fetch Google Ads accounts:", error);
      // This is OK - user may not have Ads accounts yet
    }

    return { connection, accounts };
  }

  /**
   * Fetch Google Ads accounts for the user
   * Note: This requires Google Ads API setup and developer token
   */
  async fetchGoogleAdsAccounts(
    _accessToken: string,
  ): Promise<GoogleAdsCustomer[]> {
    // Google Ads API requires additional setup (developer token, etc.)
    // For now, return empty array - this can be expanded later
    this.logger.log("Google Ads account fetching not yet implemented");
    return [];
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
          "Connection requires manual reconnection. Please reconnect your Google account.",
          "permanent",
          "needs_reconnect",
        );
      }
      throw error;
    }

    // Circuit breaker check
    // @feature 20260202-oauth-token-management
    // @requirement FR-012: Block requests when circuit is open
    if (!this.circuitBreakerService.canRequest(connectionId)) {
      await this.circuitBreakerService.logRejection(connectionId);
      throw new TokenRefreshError(
        "Connection is temporarily blocked due to repeated failures. Please try again later.",
        "transient",
        "circuit_breaker_open",
      );
    }

    // Get connection with refresh token
    const { data: connection, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .eq("plataform_name", "google")
      .single();

    if (error || !connection) {
      throw new NotFoundException("Connection not found");
    }

    if (!connection.refresh_token) {
      throw new TokenRefreshError(
        "No refresh token available. Please reconnect your Google account.",
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
            // Record failure for circuit breaker
            this.circuitBreakerService.recordFailure(
              connectionId,
              new Error(errorData.error || "Permanent OAuth error"),
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
            // Record failure for circuit breaker
            this.circuitBreakerService.recordFailure(
              connectionId,
              new Error(
                errorData.error || "Transient OAuth error after retries",
              ),
            );
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
          // Record failure for circuit breaker
          this.circuitBreakerService.recordFailure(
            connectionId,
            error instanceof Error ? error : new Error("Network error"),
          );
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

    // Update connection with new token and clear any previous error state
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

    // Record success for circuit breaker
    // @feature 20260202-oauth-token-management
    this.circuitBreakerService.recordSuccess(connectionId);

    this.logger.log(`Refreshed token for connection ${connectionId}`);

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
      .eq("plataform_name", "google")
      .single();

    if (error || !connection) {
      throw new NotFoundException("Connection not found");
    }

    if (connection.user_id !== userId) {
      throw new ForbiddenException("You do not have access to this connection");
    }

    return connection;
  }

  /**
   * Check if connection token is expired
   */
  isTokenExpired(tokenExpiresAt: string | null): boolean {
    if (!tokenExpiresAt) return false;
    return new Date(tokenExpiresAt) < new Date();
  }

  /**
   * Check if user has existing connection with same Google user
   */
  async checkExistingGoogleConnection(
    userId: string,
    platformUserId: string,
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("connections")
      .select("id")
      .eq("user_id", userId)
      .eq("plataform_name", "google")
      .eq("platform_user_id", platformUserId)
      .eq("is_active", true)
      .limit(1);

    if (error) {
      this.logger.warn("Error checking existing connection:", error);
      return false;
    }

    return data && data.length > 0;
  }

  /**
   * Validate Google OAuth configuration
   */
  validateGoogleConfig(): {
    valid: boolean;
    message: string;
  } {
    try {
      this.getGoogleCredentials();
      return {
        valid: true,
        message: "Google OAuth configuration is valid",
      };
    } catch {
      return {
        valid: false,
        message:
          "Google OAuth not configured. Please add GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET.",
      };
    }
  }
}
