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
import { GoogleOAuthService } from "./services/google-oauth.service";
import { InitiateGoogleOAuthDto } from "./dto/initiate-google-oauth.dto";
import { ConfigService } from "@nestjs/config";

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@Controller("google")
export class GoogleOAuthController {
  private readonly logger = new Logger(GoogleOAuthController.name);

  constructor(
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Initiate OAuth flow - returns authorization URL
   * POST /google/oauth/initiate
   */
  @Post("oauth/initiate")
  @UseGuards(AuthGuard("jwt"))
  async initiateOAuth(
    @Body() dto: InitiateGoogleOAuthDto,
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
      `Initiating Google OAuth for user ${userId}, workspace ${workspaceId}, type: ${dto.connectionType}, reconnect: ${dto.reconnectConnectionId || "no"}, redirectUri: ${redirectUri}`,
    );

    const { url } = await this.googleOAuthService.buildAuthorizationUrl(
      userId,
      dto.connectionName,
      dto.connectionType || "ads",
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
   * GET /google/oauth/callback
   * This is called by Google after user authorizes
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
    const redirectUri = `${backendUrl}/google/oauth/callback`;

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
      const result = await this.googleOAuthService.exchangeCodeForToken(
        code,
        state,
        redirectUri,
      );

      // Redirect to frontend with connection ID
      const params = new URLSearchParams({
        success: "true",
        connection_id: result.connection.id,
        accounts_count: result.accounts.length.toString(),
      });

      // Encode account preview info (limited to prevent URL length issues)
      if (result.accounts.length > 0) {
        const accountsPreview = result.accounts.slice(0, 5).map((a) => ({
          id: a.id,
          name: a.descriptiveName,
        }));
        params.append(
          "accounts_preview",
          Buffer.from(JSON.stringify(accountsPreview)).toString("base64url"),
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
   * Check Google OAuth configuration status
   * GET /google/config/status
   */
  @Get("config/status")
  @UseGuards(AuthGuard("jwt"))
  async checkConfigStatus() {
    const result = this.googleOAuthService.validateGoogleConfig();
    return result;
  }

  /**
   * Refresh access token for a connection
   * POST /google/oauth/refresh/:connectionId
   */
  @Post("oauth/refresh/:connectionId")
  @UseGuards(AuthGuard("jwt"))
  async refreshToken(
    @Req() req: AuthenticatedRequest,
    @Param("connectionId") connectionId: string,
  ) {
    const userId = req.user.sub;

    // Verify ownership first
    await this.googleOAuthService.verifyConnectionOwnership(
      connectionId,
      userId,
    );

    try {
      const result =
        await this.googleOAuthService.refreshAccessToken(connectionId);
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
}
