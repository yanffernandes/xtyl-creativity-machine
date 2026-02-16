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
import { CircuitBreakerService } from "../connections/circuit-breaker.service";

interface MetaAppCredentials {
  id: string;
  app_name: string;
  app_id: string;
  app_secret: string;
  webhook_url: string;
  webhook_verify_token: string;
  environment: string;
  is_active: boolean;
  is_banned: boolean;
  default_for: string[] | null;
}

interface OAuthState {
  userId: string;
  workspaceId?: string;
  connectionName: string;
  connectionType: "messages" | "ads";
  metaAppId: string;
  nonce: string;
  timestamp: number;
  reconnectConnectionId?: string;
  redirectUri?: string; // Store redirectUri to ensure consistency between initiate and exchange
}

interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface FacebookUserResponse {
  id: string;
  name: string;
  email?: string;
}

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  tasks?: string[];
  picture?: {
    data: {
      url: string;
    };
  };
}

interface FacebookPagesResponse {
  data: FacebookPage[];
  paging?: {
    cursors: { before: string; after: string };
    next?: string;
  };
}

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);
  private supabase: SupabaseClient;

  // Meta OAuth URLs
  private readonly META_AUTH_URL =
    "https://www.facebook.com/v21.0/dialog/oauth";
  private readonly META_TOKEN_URL =
    "https://graph.facebook.com/v21.0/oauth/access_token";
  private readonly META_GRAPH_URL = "https://graph.facebook.com/v21.0";

  // Required scopes for messaging
  private readonly MESSENGER_SCOPES = [
    "pages_show_list",
    "pages_messaging",
    "pages_read_engagement",
    "pages_manage_metadata",
    "pages_read_user_content",
    "public_profile",
  ];

  // Required scopes for ads
  private readonly ADS_SCOPES = [
    "pages_show_list",
    "ads_management",
    "ads_read",
    "business_management",
    "public_profile",
  ];

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
   * Exchange a short-lived token for a long-lived token (~60 days).
   * Called immediately after OAuth callback.
   *
   * Meta long-lived tokens:
   * - User tokens: ~60 days
   * - Page tokens: Non-expiring (when obtained from long-lived user token)
   *
   * @param shortLivedToken - The short-lived token from OAuth callback
   * @param appId - Meta App ID
   * @param appSecret - Meta App Secret
   * @returns The long-lived token and expiry (in seconds)
   *
   * @feature 20260202-oauth-token-management
   * @requirement FR-001: Convert tokens immediately after OAuth callback
   * @requirement FR-002: Store real expiration date (~60 days)
   */
  async exchangeForLongLivedToken(
    shortLivedToken: string,
    appId: string,
    appSecret: string,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const params = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortLivedToken,
    });

    const response = await fetch(
      `${this.META_GRAPH_URL}/oauth/access_token?${params.toString()}`,
    );

    if (!response.ok) {
      const errorData = await response.json();
      this.logger.error("Long-lived token exchange failed:", errorData);
      throw new Error(
        errorData.error?.message || "Failed to exchange for long-lived token",
      );
    }

    const data = await response.json();

    // Long-lived tokens typically have ~60 days expiry
    // expires_in is in seconds
    const expiresIn = data.expires_in || 60 * 24 * 60 * 60; // Default to 60 days

    this.logger.debug(
      `Long-lived token obtained, expires in ${Math.round(expiresIn / 86400)} days`,
    );

    return {
      accessToken: data.access_token,
      expiresIn,
    };
  }

  /**
   * Refresh a long-lived Meta token before it expires.
   * This extends the token's validity by another ~60 days.
   *
   * @param connectionId - The connection ID to refresh
   * @returns Result object with success status and new expiry
   *
   * @feature 20260202-oauth-token-management
   * @requirement FR-006: Proactive Meta token refresh
   */
  async refreshLongLivedToken(connectionId: string): Promise<{
    success: boolean;
    newExpiresAt?: string;
    error?: string;
    errorType?: "permanent" | "transient";
  }> {
    this.logger.log(
      `Refreshing long-lived token for connection: ${connectionId}`,
    );

    // Get the connection
    const { data: connection, error: connectionError } = await this.supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .eq("plataform_name", "meta")
      .single();

    if (connectionError || !connection) {
      this.logger.warn(`Connection not found: ${connectionId}`);
      return {
        success: false,
        error: "Connection not found",
        errorType: "permanent",
      };
    }

    if (!connection.access_token) {
      this.logger.warn(`No access token for connection: ${connectionId}`);
      return {
        success: false,
        error: "No access token available",
        errorType: "permanent",
      };
    }

    // Get the Meta app credentials
    const { data: metaApp, error: appError } = await this.supabase
      .from("meta_app_credentials")
      .select("*")
      .eq("id", connection.meta_app_id)
      .single();

    if (appError || !metaApp) {
      this.logger.warn(
        `Meta app not found for connection: ${connectionId}, meta_app_id: ${connection.meta_app_id}`,
      );
      return {
        success: false,
        error: "Meta app credentials not found",
        errorType: "permanent",
      };
    }

    try {
      // Call the fb_exchange_token endpoint to refresh
      const longLivedResult = await this.exchangeForLongLivedToken(
        connection.access_token,
        metaApp.app_id,
        metaApp.app_secret,
      );

      // Calculate new expiry date
      const newExpiresAt = new Date();
      newExpiresAt.setSeconds(
        newExpiresAt.getSeconds() + longLivedResult.expiresIn,
      );

      // Update the connection with the new token
      const { error: updateError } = await this.supabase
        .from("connections")
        .update({
          access_token: longLivedResult.accessToken,
          token_expires_at: newExpiresAt.toISOString(),
          last_refresh_attempt: new Date().toISOString(),
          last_refresh_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", connectionId);

      if (updateError) {
        this.logger.error(
          `Failed to update connection after token refresh: ${updateError.message}`,
        );
        return {
          success: false,
          error: "Failed to save refreshed token",
          errorType: "transient",
        };
      }

      this.logger.log(
        `Successfully refreshed token for connection ${connectionId}, ` +
          `new expiry: ${newExpiresAt.toISOString()} (${Math.round(longLivedResult.expiresIn / 86400)} days)`,
      );

      return {
        success: true,
        newExpiresAt: newExpiresAt.toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to refresh token for connection ${connectionId}: ${errorMessage}`,
      );

      // Determine if error is permanent (token revoked) or transient
      const isPermanent =
        errorMessage.includes("Error validating access token") ||
        errorMessage.includes("Invalid OAuth access token") ||
        errorMessage.includes("Session has expired") ||
        errorMessage.includes("has not authorized application");

      // Update last_refresh_attempt and error
      await this.supabase
        .from("connections")
        .update({
          last_refresh_attempt: new Date().toISOString(),
          last_refresh_error: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", connectionId);

      return {
        success: false,
        error: errorMessage,
        errorType: isPermanent ? "permanent" : "transient",
      };
    }
  }

  /**
   * Get the default Meta app for a specific feature
   */
  async getDefaultMetaApp(
    feature: "messenger" | "ads",
  ): Promise<MetaAppCredentials | null> {
    const { data, error } = await this.supabase
      .from("meta_app_credentials")
      .select("*")
      .eq("is_active", true)
      .eq("is_banned", false)
      .contains("default_for", [feature])
      .limit(1)
      .single();

    if (error) {
      this.logger.warn(
        `No default Meta app found for ${feature}: ${error.message}`,
      );
      return null;
    }

    return data;
  }

  /**
   * Get any active Meta app as fallback
   */
  async getAnyActiveMetaApp(): Promise<MetaAppCredentials | null> {
    const { data, error } = await this.supabase
      .from("meta_app_credentials")
      .select("*")
      .eq("is_active", true)
      .eq("is_banned", false)
      .limit(1)
      .single();

    if (error) {
      this.logger.error(`No active Meta app found: ${error.message}`);
      return null;
    }

    return data;
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
    connectionType: "messages" | "ads",
    redirectUri: string,
    workspaceId?: string,
    reconnectConnectionId?: string,
  ): Promise<{ url: string; metaAppId: string }> {
    // Get the appropriate Meta app
    const feature = connectionType === "messages" ? "messenger" : "ads";
    let metaApp = await this.getDefaultMetaApp(feature);

    if (!metaApp) {
      metaApp = await this.getAnyActiveMetaApp();
    }

    if (!metaApp) {
      throw new BadRequestException(
        "No active Meta app configured. Please contact administrator.",
      );
    }

    // Generate state for CSRF protection
    // Include redirectUri in state to ensure consistency between initiate and exchange
    const state: OAuthState = {
      userId,
      workspaceId,
      connectionName,
      connectionType,
      metaAppId: metaApp.id,
      nonce: crypto.randomBytes(16).toString("hex"),
      timestamp: Date.now(),
      reconnectConnectionId,
      redirectUri, // Store for exchange consistency
    };

    const stateString = this.generateState(state);

    // Select scopes based on connection type
    const scopes =
      connectionType === "messages" ? this.MESSENGER_SCOPES : this.ADS_SCOPES;

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: metaApp.app_id,
      redirect_uri: redirectUri,
      state: stateString,
      scope: scopes.join(","),
      response_type: "code",
    });

    const url = `${this.META_AUTH_URL}?${params.toString()}`;

    this.logger.log(
      `Generated OAuth URL for user ${userId}, type: ${connectionType}, redirectUri: ${redirectUri}`,
    );

    return { url, metaAppId: metaApp.id };
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    code: string,
    state: string,
    fallbackRedirectUri: string,
  ): Promise<{
    connection: any;
    pages: FacebookPage[];
  }> {
    // Parse and validate state
    const stateData = this.parseState(state);
    if (!stateData) {
      throw new BadRequestException("Invalid OAuth state");
    }

    // Check state timestamp (10 minute expiry)
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      throw new BadRequestException("OAuth state expired");
    }

    // Get Meta app credentials
    const { data: metaApp, error: appError } = await this.supabase
      .from("meta_app_credentials")
      .select("*")
      .eq("id", stateData.metaAppId)
      .single();

    if (appError || !metaApp) {
      throw new BadRequestException("Meta app not found");
    }

    // Use redirectUri from state if available (ensures consistency with initiate)
    // Fall back to provided redirectUri for backward compatibility
    const redirectUri = stateData.redirectUri || fallbackRedirectUri;

    // Exchange code for token
    const tokenParams = new URLSearchParams({
      client_id: metaApp.app_id,
      client_secret: metaApp.app_secret,
      redirect_uri: redirectUri,
      code,
    });

    this.logger.log(
      `Exchanging code for token. redirectUri=${redirectUri}, stateRedirectUri=${stateData.redirectUri || "N/A"}, fallbackRedirectUri=${fallbackRedirectUri}, appId=${metaApp.app_id}`,
    );

    let tokenResponse: FacebookTokenResponse;
    try {
      const response = await fetch(
        `${this.META_TOKEN_URL}?${tokenParams.toString()}`,
      );
      if (!response.ok) {
        const errorData = await response.json();
        this.logger.error(
          `Token exchange failed. Status: ${response.status}, Error: ${JSON.stringify(errorData)}, redirectUri: ${redirectUri}`,
        );
        throw new BadRequestException(
          errorData.error?.message || "Failed to exchange code for token",
        );
      }
      tokenResponse = await response.json();
    } catch (error) {
      // Re-throw BadRequestException with the specific Facebook error
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Only wrap network errors as InternalServerErrorException
      this.logger.error("Token exchange network error:", error);
      throw new InternalServerErrorException(
        "Failed to exchange authorization code",
      );
    }

    // Exchange for long-lived token (~60 days instead of 1-2 hours)
    // @feature 20260202-oauth-token-management
    // @requirement FR-001: Convert tokens immediately after OAuth callback
    try {
      const longLivedResult = await this.exchangeForLongLivedToken(
        tokenResponse.access_token,
        metaApp.app_id,
        metaApp.app_secret,
      );
      tokenResponse.access_token = longLivedResult.accessToken;
      tokenResponse.expires_in = longLivedResult.expiresIn;
      this.logger.log(
        `Exchanged short-lived token for long-lived token (~${Math.round(longLivedResult.expiresIn / 86400)} days)`,
      );
    } catch (exchangeError) {
      // Fallback: store short-lived token if exchange fails
      // User can still use the connection until the short-lived token expires
      this.logger.warn(
        `Failed to exchange for long-lived token, using short-lived: ${exchangeError.message}`,
      );
    }

    // Get user info
    let userInfo: FacebookUserResponse;
    try {
      const userResponse = await fetch(
        `${this.META_GRAPH_URL}/me?fields=id,name,email&access_token=${tokenResponse.access_token}`,
      );
      if (!userResponse.ok) {
        throw new Error("Failed to get user info");
      }
      userInfo = await userResponse.json();
    } catch (error) {
      this.logger.error("User info fetch error:", error);
      throw new InternalServerErrorException(
        "Failed to get Facebook user info",
      );
    }

    // Calculate token expiry
    const expiresAt = tokenResponse.expires_in
      ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
      : null;

    // Connection data to save
    const connectionData = {
      user_id: stateData.userId,
      workspace_id: stateData.workspaceId || null,
      connection_name: stateData.connectionName,
      plataform_name: "meta",
      platform_user_id: userInfo.id,
      access_token: tokenResponse.access_token,
      token_expires_at: expiresAt,
      metadata: {
        type: stateData.connectionType,
        user_name: userInfo.name,
        user_email: userInfo.email,
      },
      is_active: true,
      meta_app_id: stateData.metaAppId,
      // Clear reconnection flags on successful (re)connection
      needs_reconnect: false,
      last_refresh_error: null,
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
        `Reconnected Meta connection ${connection.id} for user ${stateData.userId}`,
      );

      // Log meta_token_exchanged event for reconnection
      // @feature 20260202-oauth-token-management
      // @requirement FR-019: Log meta_token_exchanged on successful exchange
      await this.logConnectionEvent(
        connection.id,
        "meta_token_exchanged",
        "success",
        "Meta token exchanged for long-lived token on reconnection",
        { expiresAt: connectionData.token_expires_at },
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
        `Created connection ${connection.id} for user ${stateData.userId}`,
      );

      // Log meta_token_exchanged event for new connection
      // @feature 20260202-oauth-token-management
      // @requirement FR-019: Log meta_token_exchanged on successful exchange
      await this.logConnectionEvent(
        connection.id,
        "meta_token_exchanged",
        "success",
        "Meta token exchanged for long-lived token on new connection",
        { expiresAt: connectionData.token_expires_at },
      );
    }

    // Get user's pages
    let pages: FacebookPage[] = [];
    try {
      pages = await this.fetchUserPages(tokenResponse.access_token);
    } catch (error) {
      this.logger.warn("Failed to fetch pages, will continue without:", error);
    }

    return { connection, pages };
  }

  /**
   * Fetch all pages the user has access to
   */
  async fetchUserPages(accessToken: string): Promise<FacebookPage[]> {
    const allPages: FacebookPage[] = [];
    let url = `${this.META_GRAPH_URL}/me/accounts?fields=id,name,access_token,category,tasks,picture&access_token=${accessToken}`;

    while (url) {
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to fetch pages");
      }

      const data: FacebookPagesResponse = await response.json();
      allPages.push(...data.data);

      url = data.paging?.next || "";
    }

    return allPages;
  }

  /**
   * Save selected pages for a connection
   */
  async saveSelectedPages(
    connectionId: string,
    userId: string,
    pages: Array<{ pageId: string; pageName: string; accessToken: string }>,
  ): Promise<any[]> {
    // First, deactivate all existing pages for this connection
    await this.supabase
      .from("meta_pages")
      .update({ is_active: false })
      .eq("connection_id", connectionId);

    // Insert or update selected pages
    // Note: unique constraint is on (page_id, user_id), not (connection_id, page_id)
    const pagesToSave = pages.map((page) => ({
      user_id: userId,
      connection_id: connectionId,
      page_id: page.pageId,
      page_name: page.pageName,
      access_token: page.accessToken,
      is_active: true,
    }));

    const { data, error } = await this.supabase
      .from("meta_pages")
      .upsert(pagesToSave, {
        onConflict: "page_id,user_id",
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      this.logger.error("Failed to save pages:", error);
      throw new InternalServerErrorException("Failed to save selected pages");
    }

    return data;
  }

  /**
   * Verify connection ownership or workspace membership
   */
  async verifyConnectionOwnership(
    connectionId: string,
    userId: string,
  ): Promise<any> {
    this.logger.log(
      `Verifying connection ownership: connectionId=${connectionId}, userId=${userId}`,
    );

    const { data: connection, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (error) {
      this.logger.error(`Connection query error: ${JSON.stringify(error)}`);
      throw new NotFoundException("Connection not found");
    }

    if (!connection) {
      this.logger.error(`Connection not found for id: ${connectionId}`);
      throw new NotFoundException("Connection not found");
    }

    this.logger.log(
      `Found connection: user_id=${connection.user_id}, workspace_id=${connection.workspace_id}`,
    );

    // Check if user is the owner
    if (connection.user_id === userId) {
      this.logger.log(`User is the owner of connection`);
      return connection;
    }

    // Check if user is a member of the workspace
    if (connection.workspace_id) {
      this.logger.log(
        `Checking workspace membership for workspace_id=${connection.workspace_id}`,
      );
      const { data: membership, error: membershipError } = await this.supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", connection.workspace_id)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (membershipError) {
        this.logger.log(
          `Membership query error: ${JSON.stringify(membershipError)}`,
        );
      }

      if (membership) {
        this.logger.log(`User is a member of the workspace`);
        return connection;
      }
    }

    this.logger.error(
      `User ${userId} does not have access to connection ${connectionId}`,
    );
    throw new ForbiddenException("You do not have access to this connection");
  }

  /**
   * Check if connection token is expired
   */
  isTokenExpired(tokenExpiresAt: string | null): boolean {
    if (!tokenExpiresAt) return false;
    return new Date(tokenExpiresAt) < new Date();
  }

  /**
   * Get pages for a connection (with ownership check)
   */
  async getConnectionPages(
    connectionId: string,
    userId: string,
  ): Promise<any[]> {
    // Verify ownership
    await this.verifyConnectionOwnership(connectionId, userId);

    // Return ALL pages for this connection (not just active ones)
    // so user can toggle them on/off in the config modal
    const { data, error } = await this.supabase
      .from("meta_pages")
      .select("*")
      .eq("connection_id", connectionId)
      .order("page_name", { ascending: true });

    if (error) {
      this.logger.error("Failed to get pages:", error);
      throw new InternalServerErrorException("Failed to get connection pages");
    }

    return data;
  }

  /**
   * Refresh pages list from Facebook for a connection (with ownership check)
   * This fetches pages from Facebook and saves/updates them in the database
   */
  async refreshConnectionPages(
    connectionId: string,
    userId: string,
  ): Promise<FacebookPage[]> {
    // Verify ownership and get connection
    const connection = await this.verifyConnectionOwnership(
      connectionId,
      userId,
    );

    if (!connection.access_token) {
      throw new BadRequestException("Connection has no access token");
    }

    // Check if token is expired
    if (this.isTokenExpired(connection.token_expires_at)) {
      throw new BadRequestException(
        "Token expired. Please reconnect your Meta account.",
      );
    }

    // Fetch pages from Facebook
    const facebookPages = await this.fetchUserPages(connection.access_token);

    // Get existing pages for this connection to preserve is_active state
    const { data: existingPages } = await this.supabase
      .from("meta_pages")
      .select("page_id, is_active")
      .eq("connection_id", connectionId);

    const existingPagesMap = new Map(
      (existingPages || []).map((p) => [p.page_id, p.is_active]),
    );

    // Upsert all fetched pages (new pages will be active by default)
    // Note: meta_pages table has: id, user_id, workspace_id, connection_id, page_id, page_name, access_token, is_active, created_at
    const pagesToSave = facebookPages.map((page) => ({
      user_id: userId,
      workspace_id: connection.workspace_id || null,
      connection_id: connectionId,
      page_id: page.id,
      page_name: page.name,
      access_token: page.access_token,
      // Preserve existing is_active state, new pages default to true
      is_active: existingPagesMap.has(page.id)
        ? existingPagesMap.get(page.id)
        : true,
    }));

    if (pagesToSave.length > 0) {
      const { error } = await this.supabase
        .from("meta_pages")
        .upsert(pagesToSave, {
          onConflict: "page_id,user_id",
          ignoreDuplicates: false,
        });

      if (error) {
        this.logger.error("Failed to save refreshed pages:", error);
        // Don't throw - still return the pages even if save failed
      }
    }

    return facebookPages;
  }

  /**
   * Save selected pages for a connection (with ownership check)
   */
  async saveSelectedPagesWithAuth(
    connectionId: string,
    userId: string,
    pages: Array<{ pageId: string; pageName: string; accessToken: string }>,
  ): Promise<any[]> {
    // Verify ownership
    await this.verifyConnectionOwnership(connectionId, userId);

    // Delegate to existing method
    return this.saveSelectedPages(connectionId, userId, pages);
  }

  /**
   * Check if user has existing connection with same Meta user
   */
  async checkExistingMetaConnection(
    userId: string,
    platformUserId: string,
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("connections")
      .select("id")
      .eq("user_id", userId)
      .eq("plataform_name", "meta")
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
   * Validate Meta app configuration
   */
  async validateMetaAppConfig(): Promise<{
    valid: boolean;
    message: string;
    appName?: string;
  }> {
    const messengerApp = await this.getDefaultMetaApp("messenger");
    const adsApp = await this.getDefaultMetaApp("ads");

    if (!messengerApp && !adsApp) {
      const anyApp = await this.getAnyActiveMetaApp();
      if (!anyApp) {
        return {
          valid: false,
          message: "No Meta app configured. Please contact administrator.",
        };
      }
      return {
        valid: true,
        message: "Using fallback Meta app (no default configured)",
        appName: anyApp.app_name,
      };
    }

    return {
      valid: true,
      message: "Meta app configuration is valid",
      appName: messengerApp?.app_name || adsApp?.app_name,
    };
  }

  /**
   * Fetch ad accounts for a connection
   */
  async fetchAdAccounts(
    connectionId: string,
    userId: string,
  ): Promise<
    {
      id: string;
      name: string;
      account_id: string;
      account_status: number;
      currency: string;
      timezone_name: string;
      business_name?: string;
    }[]
  > {
    // Verify ownership and get connection
    const connection = await this.verifyConnectionOwnership(
      connectionId,
      userId,
    );

    if (!connection.access_token) {
      throw new BadRequestException("Connection has no access token");
    }

    // Check if token is expired
    if (this.isTokenExpired(connection.token_expires_at)) {
      throw new BadRequestException(
        "Token expired. Please reconnect your Meta account.",
      );
    }

    // Circuit breaker check
    // @feature 20260202-oauth-token-management
    // @requirement FR-012: Block requests when circuit is open
    if (!this.circuitBreakerService.canRequest(connectionId)) {
      await this.circuitBreakerService.logRejection(connectionId);
      throw new BadRequestException(
        "Connection is temporarily blocked due to repeated failures. Please try again later.",
      );
    }

    const allAccounts: any[] = [];
    let url = `${this.META_GRAPH_URL}/me/adaccounts?fields=id,name,account_id,account_status,currency,timezone_name,business_name&access_token=${connection.access_token}`;

    this.logger.log(
      `Fetching ad accounts from Meta Graph API for connection ${connectionId}`,
    );

    try {
      while (url) {
        const response = await fetch(url);
        if (!response.ok) {
          const errorData = await response.json();
          this.logger.error("Failed to fetch ad accounts:", errorData);
          // Record failure for circuit breaker
          this.circuitBreakerService.recordFailure(
            connectionId,
            new Error(errorData.error?.message || "API request failed"),
          );
          throw new InternalServerErrorException(
            errorData.error?.message || "Failed to fetch ad accounts",
          );
        }

        const data = await response.json();
        this.logger.log(
          `Meta Graph API response - accounts found: ${data.data?.length || 0}`,
        );

        if (data.data && data.data.length > 0) {
          allAccounts.push(...data.data);
        } else {
          this.logger.warn(
            `No ad accounts in response. Full response: ${JSON.stringify(data)}`,
          );
        }

        url = data.paging?.next || "";
      }

      // Record success for circuit breaker
      this.circuitBreakerService.recordSuccess(connectionId);

      this.logger.log(`Total ad accounts fetched: ${allAccounts.length}`);
      return allAccounts;
    } catch (error) {
      // Record failure for circuit breaker if not already recorded
      if (!(error instanceof InternalServerErrorException)) {
        this.circuitBreakerService.recordFailure(
          connectionId,
          error instanceof Error ? error : new Error(String(error)),
        );
      }
      throw error;
    }
  }

  /**
   * Refresh/validate a connection's access token
   * Meta tokens don't typically need refresh (they're long-lived), but we validate them
   */
  async refreshConnectionToken(
    connectionId: string,
    userId: string,
  ): Promise<{ isValid: boolean; expiresAt: string | null }> {
    // Verify ownership
    const connection = await this.verifyConnectionOwnership(
      connectionId,
      userId,
    );

    if (!connection.access_token) {
      throw new BadRequestException("Connection has no access token");
    }

    // Validate the token by calling the Graph API
    try {
      const response = await fetch(
        `${this.META_GRAPH_URL}/me?access_token=${connection.access_token}`,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new BadRequestException(
          errorData.error?.message ||
            "Token is no longer valid. Please reconnect.",
        );
      }

      // Token is valid, update last_used_at
      await this.supabase
        .from("connections")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", connectionId);

      return {
        isValid: true,
        expiresAt: connection.token_expires_at,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException("Failed to validate token");
    }
  }

  /**
   * Get all ad accounts for a user from all their Meta connections
   */
  async getAllUserAdAccounts(userId: string): Promise<
    {
      connectionId: string;
      connectionName: string;
      adAccounts: {
        id: string;
        name: string;
        account_id: string;
        account_status: number;
        currency: string;
        timezone_name: string;
        business_name?: string;
      }[];
    }[]
  > {
    // Get all active Meta ads connections for the user
    const { data: connections, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("user_id", userId)
      .eq("plataform_name", "meta")
      .eq("is_active", true)
      .is("deleted_at", null);

    if (error) {
      this.logger.error("Failed to get connections:", error);
      throw new InternalServerErrorException("Failed to get connections");
    }

    // Filter to ads connections only
    const adsConnections = (connections || []).filter((c) => {
      const metadata = c.metadata as { type?: string };
      return metadata?.type === "ads";
    });

    const results: {
      connectionId: string;
      connectionName: string;
      adAccounts: any[];
    }[] = [];

    for (const connection of adsConnections) {
      try {
        const adAccounts = await this.fetchAdAccounts(connection.id, userId);
        results.push({
          connectionId: connection.id,
          connectionName: connection.connection_name || "Meta Connection",
          adAccounts,
        });
      } catch (err) {
        this.logger.warn(
          `Failed to fetch ad accounts for connection ${connection.id}:`,
          err,
        );
        // Continue with other connections even if one fails
        results.push({
          connectionId: connection.id,
          connectionName: connection.connection_name || "Meta Connection",
          adAccounts: [],
        });
      }
    }

    return results;
  }

  // ============================================================================
  // Ad Accounts Database Sync
  // ============================================================================

  /**
   * Sync ad accounts from Meta API to meta_ad_accounts table
   */
  async syncAdAccountsToDatabase(
    connectionId: string,
    userId: string,
    _workspaceId?: string,
  ): Promise<{
    success: boolean;
    synced: number;
    accounts: any[];
  }> {
    // Fetch ad accounts from Meta API
    const adAccounts = await this.fetchAdAccounts(connectionId, userId);

    if (adAccounts.length === 0) {
      return {
        success: true,
        synced: 0,
        accounts: [],
      };
    }

    // Get connection to verify workspace_id
    const connection = await this.verifyConnectionOwnership(
      connectionId,
      userId,
    );

    // DEDUPLICATION: Deactivate same accounts in other connections first
    const accountIds = adAccounts.map((a) => a.account_id);
    await this.deactivateDuplicateAdAccountsBeforeSync(
      connectionId,
      connection.workspace_id,
      accountIds,
    );

    // Upsert accounts to database
    const accountsToInsert = adAccounts.map((account) => ({
      connection_id: connectionId,
      user_id: connection.user_id,
      workspace_id: connection.workspace_id,
      account_id: account.account_id,
      account_name: account.name,
      currency: account.currency,
      timezone_name: account.timezone_name,
      business_name: account.business_name,
      account_status: account.account_status,
      is_active: true, // This connection now "owns" the account
      last_synced_at: new Date().toISOString(),
    }));

    const { data, error } = await this.supabase
      .from("meta_ad_accounts")
      .upsert(accountsToInsert, {
        onConflict: "connection_id,account_id",
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      this.logger.error("Failed to sync ad accounts:", error);
      throw new InternalServerErrorException("Failed to sync ad accounts");
    }

    this.logger.log(
      `Synced ${data.length} Meta ad accounts for connection ${connectionId}`,
    );

    return {
      success: true,
      synced: data.length,
      accounts: data,
    };
  }

  /**
   * Get ad accounts list from database
   */
  async getAdAccountsList(
    connectionId: string,
    userId: string,
    options?: { onlyActive?: boolean },
  ): Promise<{
    success: boolean;
    accounts: any[];
  }> {
    // Verify connection ownership
    await this.verifyConnectionOwnership(connectionId, userId);

    // Get accounts from database
    let query = this.supabase
      .from("meta_ad_accounts")
      .select("*")
      .eq("connection_id", connectionId);

    // Filter by is_active if requested
    if (options?.onlyActive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query.order("account_name", {
      ascending: true,
    });

    if (error) {
      this.logger.error("Failed to get ad accounts:", error);
      throw new InternalServerErrorException("Failed to get ad accounts");
    }

    return {
      success: true,
      accounts: data || [],
    };
  }

  /**
   * Update ad account active status (OWNERSHIP PROTECTED)
   */
  async updateAdAccountStatus(
    accountId: string,
    isActive: boolean,
    userId: string,
    adminService: any, // AdminService for ownership check
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    // First get the account to verify ownership
    const { data: account, error: fetchError } = await this.supabase
      .from("meta_ad_accounts")
      .select("*, connections!inner(*)")
      .eq("id", accountId)
      .eq("connections.is_active", true)
      .is("connections.deleted_at", null)
      .single();

    if (fetchError || !account) {
      throw new NotFoundException("Account not found");
    }

    // OWNERSHIP CHECK: Only connection creator OR admin can edit
    const connection = (account as any).connections;
    const isCreator = connection.user_id === userId;
    const isAdmin = await adminService.isAdmin(userId);

    if (!isCreator && !isAdmin) {
      throw new ForbiddenException(
        "Only the connection creator or system administrators can modify account settings",
      );
    }

    // If activating, deactivate duplicates in other connections first
    if (isActive && connection.workspace_id && (account as any).account_id) {
      await this.deactivateDuplicateAdAccountsBeforeSync(
        connection.id,
        connection.workspace_id,
        [(account as any).account_id],
      );
    }

    // Update the account status
    const { error: updateError } = await this.supabase
      .from("meta_ad_accounts")
      .update({ is_active: isActive })
      .eq("id", accountId);

    if (updateError) {
      this.logger.error("Failed to update account:", updateError);
      throw new InternalServerErrorException("Failed to update account");
    }

    this.logger.log(
      `Updated Meta ad account ${accountId} status to ${isActive ? "active" : "inactive"}`,
    );

    return {
      success: true,
      message: `Account ${isActive ? "activated" : "deactivated"} successfully`,
    };
  }

  /**
   * Batch update multiple ad accounts status
   * All accounts must belong to the same connection
   */
  async batchUpdateAdAccountStatus(
    connectionId: string,
    accountIds: string[],
    isActive: boolean,
    userId: string,
    adminService: any,
  ): Promise<{
    success: boolean;
    message: string;
    updated: number;
  }> {
    if (accountIds.length === 0) {
      return {
        success: true,
        message: "No accounts to update",
        updated: 0,
      };
    }

    // Verify connection ownership
    const { data: connection, error: connError } = await this.supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (connError || !connection) {
      throw new NotFoundException("Connection not found");
    }

    // OWNERSHIP CHECK: Only connection creator OR admin can edit
    const isCreator = connection.user_id === userId;
    const isAdmin = await adminService.isAdmin(userId);

    if (!isCreator && !isAdmin) {
      throw new ForbiddenException(
        "Only the connection creator or system administrators can modify account settings",
      );
    }

    // If activating, deactivate duplicates in other connections first
    if (isActive && connection.workspace_id) {
      // Fetch the Meta account_ids (not database UUIDs) for deduplication
      const { data: accountsData } = await this.supabase
        .from("meta_ad_accounts")
        .select("account_id")
        .in("id", accountIds);

      if (accountsData && accountsData.length > 0) {
        const metaAccountIds = accountsData.map((a) => a.account_id);
        await this.deactivateDuplicateAdAccountsBeforeSync(
          connectionId,
          connection.workspace_id,
          metaAccountIds,
        );
      }
    }

    // Update all accounts in batch (accountIds are database UUIDs)
    const { error: updateError, count } = await this.supabase
      .from("meta_ad_accounts")
      .update({ is_active: isActive })
      .eq("connection_id", connectionId)
      .in("id", accountIds);

    if (updateError) {
      this.logger.error("Failed to batch update accounts:", updateError);
      throw new InternalServerErrorException("Failed to update accounts");
    }

    this.logger.log(
      `Batch updated ${count ?? accountIds.length} Meta ad accounts to ${isActive ? "active" : "inactive"}`,
    );

    return {
      success: true,
      message: `${count ?? accountIds.length} account(s) ${isActive ? "activated" : "deactivated"} successfully`,
      updated: count ?? accountIds.length,
    };
  }

  // ============================================================================
  // Pixels Database Sync
  // ============================================================================

  /**
   * Sync pixels from Meta API to meta_pixels table
   */
  async syncPixelsToDatabase(
    connectionId: string,
    adAccountId: string,
    pixels: Array<{ id: string; name: string; isUnavailable?: boolean }>,
    userId: string,
    _workspaceId?: string,
  ): Promise<{
    success: boolean;
    synced: number;
    pixels: any[];
  }> {
    if (pixels.length === 0) {
      return {
        success: true,
        synced: 0,
        pixels: [],
      };
    }

    // Get connection to verify workspace_id
    const connection = await this.verifyConnectionOwnership(
      connectionId,
      userId,
    );

    // Get the meta_ad_account UUID for foreign key reference
    const { data: metaAdAccount, error: accountError } = await this.supabase
      .from("meta_ad_accounts")
      .select("id")
      .eq("connection_id", connectionId)
      .eq("account_id", adAccountId)
      .single();

    if (accountError) {
      this.logger.warn(
        `Meta ad account not found for ${adAccountId}, will create without FK`,
      );
    }

    // Upsert pixels to database
    const pixelsToInsert = pixels.map((pixel) => ({
      connection_id: connectionId,
      ad_account_id: metaAdAccount?.id || null,
      user_id: connection.user_id,
      workspace_id: connection.workspace_id,
      pixel_id: pixel.id,
      pixel_name: pixel.name,
      is_unavailable: pixel.isUnavailable || false,
      last_synced_at: new Date().toISOString(),
    }));

    const { data, error } = await this.supabase
      .from("meta_pixels")
      .upsert(pixelsToInsert, {
        onConflict: "connection_id,pixel_id",
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      this.logger.error("Failed to sync pixels:", error);
      throw new InternalServerErrorException("Failed to sync pixels");
    }

    this.logger.log(
      `Synced ${data.length} Meta pixels for ad account ${adAccountId}`,
    );

    return {
      success: true,
      synced: data.length,
      pixels: data,
    };
  }

  /**
   * Get pixels list from database
   */
  async getPixelsList(
    connectionId: string,
    adAccountId: string,
    userId: string,
  ): Promise<{
    success: boolean;
    pixels: any[];
  }> {
    this.logger.log(
      `getPixelsList called: connectionId=${connectionId}, adAccountId=${adAccountId}`,
    );

    // Verify connection ownership
    await this.verifyConnectionOwnership(connectionId, userId);

    // Get the meta_ad_account UUID
    const { data: metaAdAccount, error: accountError } = await this.supabase
      .from("meta_ad_accounts")
      .select("id, account_id")
      .eq("connection_id", connectionId)
      .eq("account_id", adAccountId)
      .single();

    this.logger.log(
      `meta_ad_account lookup result: ${JSON.stringify(metaAdAccount)}, error: ${JSON.stringify(accountError)}`,
    );

    if (!metaAdAccount) {
      this.logger.warn(
        `No meta_ad_account found for connectionId=${connectionId}, adAccountId=${adAccountId}`,
      );
      return {
        success: true,
        pixels: [],
      };
    }

    // Get pixels from database
    const { data, error } = await this.supabase
      .from("meta_pixels")
      .select("*")
      .eq("connection_id", connectionId)
      .eq("ad_account_id", metaAdAccount.id)
      .order("pixel_name", { ascending: true });

    this.logger.log(
      `meta_pixels query result: found ${data?.length || 0} pixels, error: ${JSON.stringify(error)}`,
    );

    if (error) {
      this.logger.error("Failed to get pixels:", error);
      throw new InternalServerErrorException("Failed to get pixels");
    }

    return {
      success: true,
      pixels: data || [],
    };
  }

  /**
   * Update pixel active status (OWNERSHIP PROTECTED)
   */
  async updatePixelStatus(
    pixelId: string,
    isActive: boolean,
    userId: string,
    adminService: any, // AdminService for ownership check
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    // First get the pixel to verify ownership
    const { data: pixel, error: fetchError } = await this.supabase
      .from("meta_pixels")
      .select("*, connections!inner(*)")
      .eq("id", pixelId)
      .eq("connections.is_active", true)
      .is("connections.deleted_at", null)
      .single();

    if (fetchError || !pixel) {
      throw new NotFoundException("Pixel not found");
    }

    // OWNERSHIP CHECK: Only connection creator OR admin can edit
    const connection = (pixel as any).connections;
    const isCreator = connection.user_id === userId;
    const isAdmin = await adminService.isAdmin(userId);

    if (!isCreator && !isAdmin) {
      throw new ForbiddenException(
        "Only the connection creator or system administrators can modify pixel settings",
      );
    }

    // Update the pixel status
    const { error: updateError } = await this.supabase
      .from("meta_pixels")
      .update({ is_active: isActive })
      .eq("id", pixelId);

    if (updateError) {
      this.logger.error("Failed to update pixel:", updateError);
      throw new InternalServerErrorException("Failed to update pixel");
    }

    this.logger.log(
      `Updated Meta pixel ${pixelId} status to ${isActive ? "active" : "inactive"}`,
    );

    return {
      success: true,
      message: `Pixel ${isActive ? "activated" : "deactivated"} successfully`,
    };
  }

  /**
   * Batch update multiple pixels status
   */
  async batchUpdatePixelStatus(
    pixelIds: string[],
    isActive: boolean,
    userId: string,
    adminService: any,
  ): Promise<{
    success: boolean;
    message: string;
    updated: number;
  }> {
    if (pixelIds.length === 0) {
      return {
        success: true,
        message: "No pixels to update",
        updated: 0,
      };
    }

    // Get first pixel to verify connection ownership
    const { data: pixel, error: fetchError } = await this.supabase
      .from("meta_pixels")
      .select("*, connections!inner(*)")
      .eq("id", pixelIds[0])
      .eq("connections.is_active", true)
      .is("connections.deleted_at", null)
      .single();

    if (fetchError || !pixel) {
      throw new NotFoundException("Pixel not found");
    }

    // OWNERSHIP CHECK: Only connection creator OR admin can edit
    const connection = (pixel as any).connections;
    const isCreator = connection.user_id === userId;
    const isAdmin = await adminService.isAdmin(userId);

    if (!isCreator && !isAdmin) {
      throw new ForbiddenException(
        "Only the connection creator or system administrators can modify pixel settings",
      );
    }

    // Update all pixels in batch (pixelIds are database UUIDs)
    const { error: updateError, count } = await this.supabase
      .from("meta_pixels")
      .update({ is_active: isActive })
      .in("id", pixelIds);

    if (updateError) {
      this.logger.error("Failed to batch update pixels:", updateError);
      throw new InternalServerErrorException("Failed to update pixels");
    }

    this.logger.log(
      `Batch updated ${count ?? pixelIds.length} Meta pixels to ${isActive ? "active" : "inactive"}`,
    );

    return {
      success: true,
      message: `${count ?? pixelIds.length} pixel(s) ${isActive ? "activated" : "deactivated"} successfully`,
      updated: count ?? pixelIds.length,
    };
  }

  /**
   * Sync all Meta resources at once (ad accounts, pages, pixels, instagram)
   * Based on N8N workflow pattern
   */
  async syncAllResources(
    connectionId: string,
    userId: string,
    workspaceId?: string,
  ): Promise<{
    success: boolean;
    adAccounts: any[];
    pages: any[];
    pixels: any[];
    instagram: any[];
    business: any[];
    errors: string[];
  }> {
    // Verify ownership and get connection
    const connection = await this.verifyConnectionOwnership(
      connectionId,
      userId,
    );

    if (!connection.access_token) {
      throw new BadRequestException("Connection has no access token");
    }

    if (this.isTokenExpired(connection.token_expires_at)) {
      throw new BadRequestException(
        "Token expired. Please reconnect your Meta account.",
      );
    }

    const accessToken = connection.access_token;
    const errors: string[] = [];

    // Fetch all resources in parallel (like N8N workflow)
    const [adAccountsResult, pagesResult, instagramResult] =
      await Promise.allSettled([
        // 1. Get Ad Accounts with business info
        this.fetchAdAccountsWithBusiness(accessToken),
        // 2. Get Pages with ADVERTISE permission
        this.fetchPagesForAds(accessToken),
        // 3. Get Instagram accounts
        this.fetchInstagramAccounts(accessToken),
      ]);

    // Process Ad Accounts
    let adAccounts: any[] = [];
    let business: any[] = [];
    if (adAccountsResult.status === "fulfilled") {
      adAccounts = adAccountsResult.value.accounts;
      business = adAccountsResult.value.business;
    } else {
      errors.push(
        `Ad Accounts: ${adAccountsResult.reason?.message || "Failed to fetch"}`,
      );
    }

    // Process Pages
    let pages: any[] = [];
    if (pagesResult.status === "fulfilled") {
      pages = pagesResult.value;
    } else {
      errors.push(`Pages: ${pagesResult.reason?.message || "Failed to fetch"}`);
    }

    // Process Instagram
    let instagram: any[] = [];
    if (instagramResult.status === "fulfilled") {
      instagram = instagramResult.value;
    } else {
      errors.push(
        `Instagram: ${instagramResult.reason?.message || "Failed to fetch"}`,
      );
    }

    // Fetch Pixels from ad accounts (more reliable than business)
    let pixels: any[] = [];
    if (adAccounts.length > 0) {
      try {
        // Fetch pixels for each ad account
        const pixelPromises = adAccounts.map((account) =>
          this.fetchPixelsByAdAccount(accessToken, account.account_id),
        );
        const pixelResults = await Promise.allSettled(pixelPromises);
        pixelResults.forEach((result, index) => {
          if (result.status === "fulfilled" && result.value.length > 0) {
            // Add ad_account_id to each pixel for proper association
            const accountPixels = result.value.map((p: any) => ({
              ...p,
              ad_account_id: adAccounts[index].account_id,
            }));
            pixels.push(...accountPixels);
          }
        });
        // Remove duplicates by pixel_id (same pixel can be shared across accounts)
        pixels = pixels.filter(
          (pixel, index, self) =>
            index === self.findIndex((p) => p.pixel_id === pixel.pixel_id),
        );
        this.logger.log(
          `Fetched ${pixels.length} unique pixels from ${adAccounts.length} ad accounts`,
        );
      } catch (error) {
        errors.push(`Pixels: ${error.message || "Failed to fetch"}`);
      }
    }

    // Save to database
    // Use connection.workspace_id as fallback if header wasn't provided
    const effectiveWorkspaceId = workspaceId || connection.workspace_id;
    await this.saveAllResourcesToDatabase(
      connectionId,
      effectiveWorkspaceId,
      adAccounts,
      pages,
      pixels,
      instagram,
    );

    return {
      success: true,
      adAccounts,
      pages,
      pixels,
      instagram,
      business,
      errors,
    };
  }

  /**
   * Fetch ad accounts with business info (N8N pattern)
   */
  private async fetchAdAccountsWithBusiness(
    accessToken: string,
  ): Promise<{ accounts: any[]; business: any[] }> {
    const accounts: any[] = [];
    const businessMap = new Map<string, any>();

    let url = `${this.META_GRAPH_URL}/me/adaccounts?fields=id,account_id,name,business{id,name},account_status,currency,timezone_name&limit=100&access_token=${accessToken}`;

    while (url) {
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || "Failed to fetch ad accounts",
        );
      }

      const data = await response.json();
      if (data.data) {
        for (const account of data.data) {
          accounts.push({
            account_id: account.account_id,
            account_name: account.name,
            business_id: account.business?.id || null,
            business_name: account.business?.name || null,
            account_status: account.account_status,
            currency: account.currency,
            timezone_name: account.timezone_name,
          });

          // Track unique businesses
          if (account.business?.id && !businessMap.has(account.business.id)) {
            businessMap.set(account.business.id, {
              id: account.business.id,
              name: account.business.name,
            });
          }
        }
      }

      url = data.paging?.next || "";
    }

    return {
      accounts,
      business: Array.from(businessMap.values()),
    };
  }

  /**
   * Fetch pages that have ADVERTISE permission (N8N pattern)
   */
  private async fetchPagesForAds(accessToken: string): Promise<any[]> {
    const pages: any[] = [];

    let url = `${this.META_GRAPH_URL}/me/accounts?fields=id,name,tasks,category,picture{url}&limit=100&access_token=${accessToken}`;

    while (url) {
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to fetch pages");
      }

      const data = await response.json();
      if (data.data) {
        for (const page of data.data) {
          // Filter pages with ADVERTISE permission (like N8N)
          if (page.tasks && page.tasks.includes("ADVERTISE")) {
            pages.push({
              page_id: page.id,
              page_name: page.name,
              category: page.category || null,
              picture_url: page.picture?.data?.url || null,
            });
          }
        }
      }

      url = data.paging?.next || "";
    }

    return pages;
  }

  /**
   * Fetch Instagram accounts linked to pages (N8N pattern)
   */
  private async fetchInstagramAccounts(accessToken: string): Promise<any[]> {
    const instagram: any[] = [];

    let url = `${this.META_GRAPH_URL}/me/accounts?fields=id,name,instagram_business_account{id,username,name,profile_picture_url,followers_count}&limit=100&access_token=${accessToken}`;

    while (url) {
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || "Failed to fetch Instagram accounts",
        );
      }

      const data = await response.json();
      if (data.data) {
        for (const page of data.data) {
          // Filter pages that have Instagram linked (like N8N)
          if (page.instagram_business_account?.username) {
            instagram.push({
              instagram_id: page.instagram_business_account.id,
              instagram_username: page.instagram_business_account.username,
              instagram_name: page.instagram_business_account.name || null,
              profile_picture_url:
                page.instagram_business_account.profile_picture_url || null,
              followers_count:
                page.instagram_business_account.followers_count || null,
              page_id: page.id,
              page_name: page.name,
            });
          }
        }
      }

      url = data.paging?.next || "";
    }

    return instagram;
  }

  /**
   * Fetch pixels owned by a business (N8N pattern)
   */
  private async fetchPixelsByBusiness(
    accessToken: string,
    businessId: string,
  ): Promise<any[]> {
    const pixels: any[] = [];

    try {
      const url = `${this.META_GRAPH_URL}/${businessId}/owned_pixels?fields=id,name,last_firing_time,creation_time&access_token=${accessToken}`;

      const response = await fetch(url);
      if (!response.ok) {
        // Don't throw - just return empty array for this business
        return [];
      }

      const data = await response.json();
      if (data.data) {
        for (const pixel of data.data) {
          pixels.push({
            pixel_id: pixel.id,
            pixel_name: pixel.name,
            last_firing_time: pixel.last_firing_time || null,
            creation_time: pixel.creation_time || null,
            business_id: businessId,
          });
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to fetch pixels for business ${businessId}: ${error.message}`,
      );
    }

    return pixels;
  }

  /**
   * Fetch pixels by ad account ID (more reliable than business)
   */
  private async fetchPixelsByAdAccount(
    accessToken: string,
    adAccountId: string,
  ): Promise<any[]> {
    const pixels: any[] = [];

    try {
      // Clean ad account ID (remove 'act_' prefix if present)
      const cleanAccountId = adAccountId.replace("act_", "");
      const url = `${this.META_GRAPH_URL}/act_${cleanAccountId}/adspixels?fields=id,name,is_unavailable&access_token=${accessToken}`;

      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        this.logger.warn(
          `Failed to fetch pixels for ad account ${adAccountId}: ${JSON.stringify(errorData)}`,
        );
        return [];
      }

      const data = await response.json();
      if (data.data) {
        for (const pixel of data.data) {
          pixels.push({
            pixel_id: pixel.id,
            pixel_name: pixel.name,
            is_unavailable: pixel.is_unavailable || false,
          });
        }
      }

      this.logger.log(
        `Fetched ${pixels.length} pixels for ad account ${adAccountId}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to fetch pixels for ad account ${adAccountId}: ${error.message}`,
      );
    }

    return pixels;
  }

  /**
   * Deactivate duplicate ad accounts in other connections before syncing.
   *
   * When the same Meta ad account (by account_id) exists in multiple connections
   * within the same workspace, only ONE should be active at a time.
   *
   * The LAST synced connection "wins" - activating an account in a new connection
   * automatically deactivates it in the old connection.
   *
   * @param connectionId - The current connection being synced (will be activated)
   * @param workspaceId - The workspace ID (deduplication is per-workspace)
   * @param accountIds - List of Meta account_ids being synced
   */
  private async deactivateDuplicateAdAccountsBeforeSync(
    connectionId: string,
    workspaceId: string | undefined,
    accountIds: string[],
  ): Promise<void> {
    if (!workspaceId || accountIds.length === 0) return;

    // Find and deactivate accounts with same account_id in OTHER connections
    // within the same workspace
    const { data: duplicates, error: findError } = await this.supabase
      .from("meta_ad_accounts")
      .select("id, connection_id, account_id, account_name")
      .eq("workspace_id", workspaceId)
      .neq("connection_id", connectionId)
      .in("account_id", accountIds)
      .eq("is_active", true);

    if (findError) {
      this.logger.warn(
        `Failed to find duplicate accounts: ${findError.message}`,
      );
      return;
    }

    if (duplicates && duplicates.length > 0) {
      const duplicateIds = duplicates.map((d) => d.id);

      const { error: updateError } = await this.supabase
        .from("meta_ad_accounts")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in("id", duplicateIds);

      if (updateError) {
        this.logger.warn(
          `Failed to deactivate duplicate accounts: ${updateError.message}`,
        );
      } else {
        this.logger.log(
          `Deactivated ${duplicates.length} duplicate ad accounts in other connections: ` +
            duplicates
              .map((d) => `${d.account_name} (${d.account_id})`)
              .join(", "),
        );
      }
    }
  }

  /**
   * Save all resources to database
   */
  private async saveAllResourcesToDatabase(
    connectionId: string,
    workspaceId: string | undefined,
    adAccounts: any[],
    pages: any[],
    pixels: any[],
    instagram: any[],
  ): Promise<void> {
    const now = new Date().toISOString();

    // 1. Upsert Ad Accounts
    if (adAccounts.length > 0) {
      // DEDUPLICATION: Deactivate same accounts in other connections first
      const accountIds = adAccounts.map((a) => a.account_id);
      await this.deactivateDuplicateAdAccountsBeforeSync(
        connectionId,
        workspaceId,
        accountIds,
      );

      const accountsToUpsert = adAccounts.map((account) => ({
        connection_id: connectionId,
        workspace_id: workspaceId || null,
        account_id: account.account_id,
        account_name: account.account_name,
        business_name: account.business_name,
        account_status: account.account_status,
        currency: account.currency,
        timezone_name: account.timezone_name,
        is_active: true, // This connection now "owns" the account
        last_synced_at: now,
        updated_at: now,
      }));

      const { error } = await this.supabase
        .from("meta_ad_accounts")
        .upsert(accountsToUpsert, { onConflict: "connection_id,account_id" });

      if (error) {
        this.logger.error("Failed to upsert ad accounts:", error);
      }
    }

    // 2. Upsert Pages
    if (pages.length > 0) {
      const pagesToUpsert = pages.map((page) => ({
        connection_id: connectionId,
        page_id: page.page_id,
        page_name: page.page_name,
        category: page.category,
        picture_url: page.picture_url,
        is_active: true, // Default to active for new pages
        updated_at: now,
      }));

      const { error } = await this.supabase
        .from("meta_pages")
        .upsert(pagesToUpsert, { onConflict: "connection_id,page_id" });

      if (error) {
        this.logger.error("Failed to upsert pages:", error);
      }
    }

    // 3. Upsert Pixels (each pixel already has ad_account_id from fetchPixelsByAdAccount)
    if (pixels.length > 0) {
      const pixelsToUpsert = pixels.map((pixel) => ({
        connection_id: connectionId,
        ad_account_id: pixel.ad_account_id, // Already set by fetchPixelsByAdAccount
        pixel_id: pixel.pixel_id,
        pixel_name: pixel.pixel_name,
        is_active: true,
        is_unavailable: pixel.is_unavailable || false,
        last_synced_at: now,
        updated_at: now,
      }));

      const { error } = await this.supabase
        .from("meta_pixels")
        .upsert(pixelsToUpsert, { onConflict: "connection_id,pixel_id" });

      if (error) {
        this.logger.error("Failed to upsert pixels:", error);
      }
    }

    // 4. Upsert Instagram accounts (store in meta_instagram_accounts or similar)
    // Note: For now, we'll return them but may need a separate table
    this.logger.log(
      `Synced: ${adAccounts.length} accounts, ${pages.length} pages, ${pixels.length} pixels, ${instagram.length} Instagram`,
    );
  }

  // ============================================================================
  // Connection Event Logging
  // ============================================================================

  /**
   * Log a connection event to the connection_logs table.
   *
   * Used for tracking token management events like:
   * - meta_token_exchanged: Token successfully exchanged for long-lived token
   * - meta_token_refreshed: Token successfully refreshed
   * - token_refresh_failed_permanent: Token refresh failed permanently
   *
   * @param connectionId - The connection ID
   * @param action - The action being logged
   * @param status - The status (success, warning, error)
   * @param message - Human-readable message
   * @param metadata - Additional metadata for the log entry
   *
   * @feature 20260202-oauth-token-management
   * @requirement FR-021: Log all token management events
   */
  private async logConnectionEvent(
    connectionId: string,
    action: string,
    status: "success" | "warning" | "error",
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const { error } = await this.supabase.from("connection_logs").insert({
        connection_id: connectionId,
        action,
        status,
        message,
        metadata: metadata || {},
      });

      if (error) {
        this.logger.warn(`Failed to log connection event: ${error.message}`, {
          connectionId,
          action,
        });
      }
    } catch (error) {
      // Logging failures should not break the main flow
      this.logger.warn(
        `Exception while logging connection event: ${error.message}`,
        { connectionId, action },
      );
    }
  }
}
