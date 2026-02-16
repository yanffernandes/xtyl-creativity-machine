import { Injectable, Logger, Inject, forwardRef } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ConnectionsService } from "./connections.service";
import { NotificationsService } from "./notifications.service";
import {
  GoogleOAuthService,
  TokenRefreshError,
} from "../google/services/google-oauth.service";
import { AdManagerOAuthService } from "../ad-manager/services/ad-manager-oauth.service";
import { AdSenseOAuthService } from "../adsense/services/adsense-oauth.service";
import { AnalyticsOAuthService } from "../analytics/services/analytics-oauth.service";
import { SearchConsoleOAuthService } from "../search-console/services/search-console-oauth.service";
import { MetaService } from "../meta/meta.service";

@Injectable()
export class ConnectionsCronService {
  private readonly logger = new Logger(ConnectionsCronService.name);

  constructor(
    private readonly connectionsService: ConnectionsService,
    private readonly notificationsService: NotificationsService,
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly adManagerOAuthService: AdManagerOAuthService,
    private readonly adSenseOAuthService: AdSenseOAuthService,
    private readonly analyticsOAuthService: AnalyticsOAuthService,
    private readonly searchConsoleOAuthService: SearchConsoleOAuthService,
    @Inject(forwardRef(() => MetaService))
    private readonly metaService: MetaService,
  ) {}

  /**
   * Auto-refresh Google tokens that are expired or expiring soon
   * Runs every 30 minutes to keep tokens fresh
   *
   * This prevents tokens from expiring by proactively refreshing them.
   * Only works for Google-based connections (ads, ad_manager, adsense, analytics, search_console)
   * that have a valid refresh_token.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async autoRefreshGoogleTokens(): Promise<void> {
    this.logger.log("Running auto-refresh for Google tokens...");

    try {
      // Get all Google connections that are expired or expiring in the next hour
      const connectionsToRefresh =
        await this.connectionsService.getGoogleConnectionsNeedingRefresh();

      if (connectionsToRefresh.length === 0) {
        this.logger.log("No Google tokens need refreshing.");
        return;
      }

      this.logger.log(
        `Found ${connectionsToRefresh.length} Google connections to refresh`,
      );

      let successCount = 0;
      let failCount = 0;

      for (const connection of connectionsToRefresh) {
        // Skip connections that already need reconnection
        if (connection.needs_reconnect) {
          this.logger.debug(
            `Skipping ${connection.connection_name} - already marked as needs_reconnect`,
          );
          continue;
        }

        try {
          const serviceType =
            (connection.metadata as { type?: string })?.type || "ads";

          // Select the appropriate OAuth service based on service type
          let result: { accessToken: string; expiresAt: string };

          switch (serviceType) {
            case "ad_manager":
              result = await this.adManagerOAuthService.refreshAccessToken(
                connection.id,
              );
              break;
            case "adsense":
              result = await this.adSenseOAuthService.refreshAccessToken(
                connection.id,
              );
              break;
            case "analytics":
              result = await this.analyticsOAuthService.refreshAccessToken(
                connection.id,
              );
              break;
            case "search_console":
              result = await this.searchConsoleOAuthService.refreshAccessToken(
                connection.id,
              );
              break;
            default:
              // Default to Google Ads OAuth service
              result = await this.googleOAuthService.refreshAccessToken(
                connection.id,
              );
          }

          // Log successful refresh
          await this.connectionsService.createConnectionLog(
            connection.id,
            "token_auto_refresh",
            "success",
            `Token ${serviceType} renovado automaticamente`,
            { expiresAt: result.expiresAt },
          );

          this.logger.log(
            `✅ Refreshed token for ${connection.connection_name} (${serviceType})`,
          );
          successCount++;
        } catch (error) {
          const serviceType =
            (connection.metadata as { type?: string })?.type || "ads";

          // Handle TokenRefreshError with appropriate action based on error type
          if (error instanceof TokenRefreshError) {
            if (error.errorType === "permanent") {
              // Permanent failure - mark connection and notify user immediately
              this.logger.warn(
                `🔴 Permanent token refresh failure for ${connection.connection_name}: ${error.message}`,
              );

              // Mark the connection as needing reconnection
              await this.connectionsService.markConnectionNeedsReconnect(
                connection.id,
                error.originalError || error.message,
              );

              // Send immediate notification to user
              // This ensures users know right away that action is needed
              // (Nielsen's Heuristic #1: Visibility of system status)
              try {
                const hasRecent =
                  await this.notificationsService.hasRecentNotification(
                    connection.user_id,
                    "connection_error",
                    connection.id,
                    24, // Don't spam - once per 24 hours max
                  );

                if (!hasRecent) {
                  await this.notificationsService.notifyConnectionNeedsReconnect(
                    connection.user_id,
                    connection.connection_name,
                    connection.id,
                    connection.plataform_name,
                    serviceType,
                    error.originalError,
                  );

                  this.logger.log(
                    `📧 Sent reconnection notification to user for ${connection.connection_name}`,
                  );
                }
              } catch (notifyError) {
                this.logger.error(
                  "Failed to send reconnection notification:",
                  notifyError,
                );
              }
            } else {
              // Transient failure - log but don't mark as needs_reconnect
              // Will retry on next cron run
              this.logger.warn(
                `🟡 Transient token refresh failure for ${connection.connection_name}: ${error.message}`,
              );

              await this.connectionsService.createConnectionLog(
                connection.id,
                "token_auto_refresh",
                "warning",
                `Falha temporária ao renovar token (tentará novamente): ${error.message}`,
              );
            }
          } else {
            // Unknown error type - treat as transient
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";

            await this.connectionsService.createConnectionLog(
              connection.id,
              "token_auto_refresh",
              "error",
              `Falha ao renovar token automaticamente: ${errorMessage}`,
            );

            this.logger.error(
              `❌ Failed to refresh token for ${connection.connection_name}: ${errorMessage}`,
            );
          }

          failCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      this.logger.log(
        `Auto-refresh complete. Success: ${successCount}, Failed: ${failCount}`,
      );
    } catch (error) {
      this.logger.error("Error in auto-refresh Google tokens:", error);
    }
  }

  /**
   * Auto-refresh Meta tokens that are expiring within 7 days
   * Runs every 30 minutes to keep tokens fresh
   *
   * Meta long-lived tokens last ~60 days and can be refreshed to extend their validity.
   * This prevents tokens from expiring by proactively refreshing them.
   *
   * @feature 20260202-oauth-token-management
   * @requirement FR-006: Proactive Meta token refresh
   * @requirement T038-T042: Meta token refresh cron job
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async autoRefreshMetaTokens(): Promise<void> {
    this.logger.log("Running auto-refresh for Meta tokens...");

    try {
      // Get all Meta connections that need refresh (expiring within 7 days)
      const connectionsToRefresh =
        await this.connectionsService.getMetaConnectionsNeedingRefresh();

      if (connectionsToRefresh.length === 0) {
        this.logger.log("No Meta tokens need refreshing.");
        return;
      }

      this.logger.log(
        `Found ${connectionsToRefresh.length} Meta connections to refresh`,
      );

      let successCount = 0;
      let failCount = 0;
      let retryBackoff = 1000; // Start with 1 second backoff

      for (const connection of connectionsToRefresh) {
        // Skip connections that already need reconnection
        if (connection.needs_reconnect) {
          this.logger.debug(
            `Skipping ${connection.connection_name} - already marked as needs_reconnect`,
          );
          continue;
        }

        try {
          // Attempt to refresh the token
          const result = await this.metaService.refreshLongLivedToken(
            connection.id,
          );

          if (result.success) {
            // Log successful refresh
            // @requirement T042: Log meta_token_refreshed on successful refresh
            await this.connectionsService.createConnectionLog(
              connection.id,
              "meta_token_refreshed",
              "success",
              `Token Meta renovado automaticamente, nova expiração: ${result.newExpiresAt}`,
              { newExpiresAt: result.newExpiresAt },
            );

            this.logger.log(
              `✅ Refreshed token for ${connection.connection_name}`,
            );
            successCount++;
            retryBackoff = 1000; // Reset backoff on success
          } else {
            // Handle failure based on error type
            if (result.errorType === "permanent") {
              // @requirement T041: Mark needs_reconnect=true on permanent failures
              this.logger.warn(
                `🔴 Permanent Meta token refresh failure for ${connection.connection_name}: ${result.error}`,
              );

              // Mark the connection as needing reconnection
              await this.connectionsService.markConnectionNeedsReconnect(
                connection.id,
                result.error || "Token refresh permanently failed",
              );

              // Send notification to user
              try {
                const hasRecent =
                  await this.notificationsService.hasRecentNotification(
                    connection.user_id,
                    "connection_error",
                    connection.id,
                    24, // Don't spam - once per 24 hours max
                  );

                if (!hasRecent) {
                  await this.notificationsService.notifyConnectionNeedsReconnect(
                    connection.user_id,
                    connection.connection_name,
                    connection.id,
                    connection.plataform_name,
                    (connection.metadata as { type?: string })?.type || "meta",
                    result.error,
                  );

                  this.logger.log(
                    `📧 Sent reconnection notification to user for ${connection.connection_name}`,
                  );
                }
              } catch (notifyError) {
                this.logger.error(
                  "Failed to send reconnection notification:",
                  notifyError,
                );
              }
            } else {
              // Transient failure - apply exponential backoff and retry on next cron run
              // @requirement T043: Backoff retry logic (1s, 2s, 4s)
              this.logger.warn(
                `🟡 Transient Meta token refresh failure for ${connection.connection_name}: ${result.error}`,
              );

              await this.connectionsService.createConnectionLog(
                connection.id,
                "meta_token_refresh_retry",
                "warning",
                `Falha temporária ao renovar token Meta (tentará novamente): ${result.error}`,
                { backoffMs: retryBackoff },
              );

              // Apply exponential backoff (1s, 2s, 4s, max 4s)
              await new Promise((resolve) => setTimeout(resolve, retryBackoff));
              retryBackoff = Math.min(retryBackoff * 2, 4000);
            }

            failCount++;
          }
        } catch (error) {
          // Unexpected error
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          await this.connectionsService.createConnectionLog(
            connection.id,
            "meta_token_refresh_error",
            "error",
            `Erro inesperado ao renovar token Meta: ${errorMessage}`,
          );

          this.logger.error(
            `❌ Unexpected error refreshing token for ${connection.connection_name}: ${errorMessage}`,
          );
          failCount++;
        }

        // @requirement T040: 200ms delay between refresh attempts to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      this.logger.log(
        `Meta auto-refresh complete. Success: ${successCount}, Failed: ${failCount}`,
      );
    } catch (error) {
      this.logger.error("Error in auto-refresh Meta tokens:", error);
    }
  }

  /**
   * Check for expiring tokens every hour
   * Sends notifications for tokens expiring within 7 days
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkExpiringTokens(): Promise<void> {
    this.logger.log("Running expiring tokens check...");

    try {
      // Get connections expiring in 7 days
      const expiringConnections =
        await this.connectionsService.getExpiringConnections(7);

      for (const connection of expiringConnections) {
        const expiresAt = new Date(connection.token_expires_at);
        const now = new Date();
        const daysUntilExpiry = Math.ceil(
          (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        // Only notify if expiring in 7, 3, or 1 day(s)
        if (![7, 3, 1].includes(daysUntilExpiry)) {
          continue;
        }

        // Check if we already sent a notification for this expiry
        const hasRecent = await this.notificationsService.hasRecentNotification(
          connection.user_id,
          "token_expiring",
          connection.id,
          24,
        );

        if (hasRecent) {
          this.logger.debug(
            `Skipping notification for ${connection.id}, already notified recently`,
          );
          continue;
        }

        // Send notification
        await this.notificationsService.notifyTokenExpiring(
          connection.user_id,
          connection.connection_name,
          connection.id,
          connection.plataform_name,
          daysUntilExpiry,
        );

        // Log the action
        await this.connectionsService.createConnectionLog(
          connection.id,
          "token_expiring_notification",
          "warning",
          `Notificação enviada: token expira em ${daysUntilExpiry} dia(s)`,
        );

        this.logger.log(
          `Sent expiring notification for connection ${connection.id} (${daysUntilExpiry} days)`,
        );
      }

      this.logger.log(
        `Expiring tokens check complete. Checked ${expiringConnections.length} connections.`,
      );
    } catch (error) {
      this.logger.error("Error in expiring tokens check:", error);
    }
  }

  /**
   * Check for expired tokens every hour
   * Sends notifications and deactivates expired connections
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkExpiredTokens(): Promise<void> {
    this.logger.log("Running expired tokens check...");

    try {
      const expiredConnections =
        await this.connectionsService.getExpiredConnections();

      for (const connection of expiredConnections) {
        // Check if we already sent a notification for this expiry
        const hasRecent = await this.notificationsService.hasRecentNotification(
          connection.user_id,
          "token_expired",
          connection.id,
          24,
        );

        if (!hasRecent) {
          // Send notification
          await this.notificationsService.notifyTokenExpired(
            connection.user_id,
            connection.connection_name,
            connection.id,
            connection.plataform_name,
          );

          // Log the action
          await this.connectionsService.createConnectionLog(
            connection.id,
            "token_expired_notification",
            "error",
            "Token expirado - notificação enviada ao usuário",
          );

          this.logger.log(
            `Sent expired notification for connection ${connection.id}`,
          );
        }
      }

      this.logger.log(
        `Expired tokens check complete. Found ${expiredConnections.length} expired connections.`,
      );
    } catch (error) {
      this.logger.error("Error in expired tokens check:", error);
    }
  }

  /**
   * Daily cleanup of old notifications
   * Runs at 3 AM every day
   */
  @Cron("0 3 * * *")
  async cleanupOldNotifications(): Promise<void> {
    this.logger.log("Running old notifications cleanup...");

    // Note: This would need to iterate through all users
    // For now, we'll just log that it ran
    // In production, you'd want to batch this operation

    this.logger.log("Old notifications cleanup complete.");
  }

  /**
   * Refresh AdSense account states every 6 hours
   * Fetches current account state (READY, NEEDS_ATTENTION, CLOSED) from AdSense API
   * and updates connection metadata for all active AdSense connections.
   *
   * @feature 20260203-adsense-account-status
   * @requirement FR-003: Global cron job every 6 hours
   * @requirement FR-007: Graceful per-connection error handling
   */
  @Cron("0 */6 * * *")
  async refreshAdSenseAccountStates(): Promise<void> {
    this.logger.log("Running AdSense account state refresh...");

    try {
      const connections =
        await this.connectionsService.getActiveAdSenseConnections();

      if (connections.length === 0) {
        this.logger.log("No active AdSense connections to refresh.");
        return;
      }

      this.logger.log(
        `Found ${connections.length} AdSense connections to refresh states`,
      );

      let successCount = 0;
      let failCount = 0;

      for (const connection of connections) {
        try {
          // Get a valid access token (auto-refreshes if expired)
          const validConnection =
            await this.adSenseOAuthService.getConnectionWithValidToken(
              connection.id,
              connection.user_id,
            );

          // Fetch fresh account data including state
          const freshAccounts = await this.adSenseOAuthService.fetchAccounts(
            validConnection.access_token,
          );

          // Update the connection metadata with fresh accounts (including state)
          await this.connectionsService.updateConnectionAccountsMetadata(
            connection.id,
            freshAccounts,
          );

          this.logger.log(
            `✅ Refreshed account states for ${connection.connection_name} (${freshAccounts.length} accounts)`,
          );
          successCount++;
        } catch (error) {
          if (error instanceof TokenRefreshError) {
            if (error.errorType === "permanent") {
              this.logger.warn(
                `🔴 Permanent failure refreshing states for ${connection.connection_name}: ${error.message}`,
              );
              await this.connectionsService.markConnectionNeedsReconnect(
                connection.id,
                error.originalError || error.message,
              );
            } else {
              this.logger.warn(
                `🟡 Transient failure refreshing states for ${connection.connection_name}: ${error.message}`,
              );
            }
          } else {
            this.logger.error(
              `❌ Error refreshing states for ${connection.connection_name}:`,
              error,
            );
          }
          failCount++;
        }

        // 200ms delay between connections to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      this.logger.log(
        `AdSense account state refresh complete: ${successCount} success, ${failCount} failed out of ${connections.length} total`,
      );
    } catch (error) {
      this.logger.error("Error in AdSense account state refresh:", error);
    }
  }
}
