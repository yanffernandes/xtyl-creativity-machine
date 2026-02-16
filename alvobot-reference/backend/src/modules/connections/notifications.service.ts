import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export type NotificationType =
  | "token_expiring"
  | "token_expired"
  | "connection_error"
  | "connection_success"
  | "system"
  // PageSpeed notification types
  | "pagespeed_poor_performance"
  | "pagespeed_degraded"
  | "pagespeed_cwv_failed"
  | "pagespeed_improved";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private supabase: SupabaseClient;

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
   * Create a notification for a user
   */
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<Notification> {
    const { data, error } = await this.supabase
      .from("notifications")
      .insert({
        user_id: userId,
        type,
        title,
        message,
        metadata,
      })
      .select()
      .single();

    if (error) {
      this.logger.error("Failed to create notification:", error);
      throw new InternalServerErrorException("Falha ao criar notificação");
    }

    return data;
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
    },
  ): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }> {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    let query = this.supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (options?.unreadOnly) {
      query = query.eq("is_read", false);
    }

    const { data, error, count } = await query;

    if (error) {
      // Se a tabela não existe, retorna vazio em vez de erro
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        this.logger.warn("Notifications table does not exist yet");
        return { notifications: [], total: 0, unreadCount: 0 };
      }
      this.logger.error("Failed to get notifications:", error);
      throw new InternalServerErrorException("Falha ao buscar notificações");
    }

    // Get unread count
    const { count: unreadCount, error: unreadError } = await this.supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (unreadError) {
      this.logger.warn("Failed to get unread count:", unreadError);
    }

    return {
      notifications: data || [],
      total: count || 0,
      unreadCount: unreadCount || 0,
    };
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<Notification> {
    const { data, error } = await this.supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", notificationId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      this.logger.error("Failed to mark notification as read:", error);
      throw new InternalServerErrorException(
        "Falha ao marcar notificação como lida",
      );
    }

    return data;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("is_read", false)
      .select("id");

    if (error) {
      this.logger.error("Failed to mark all notifications as read:", error);
      throw new InternalServerErrorException(
        "Falha ao marcar notificações como lidas",
      );
    }

    return data?.length || 0;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", userId);

    if (error) {
      this.logger.error("Failed to delete notification:", error);
      throw new InternalServerErrorException("Falha ao deletar notificação");
    }
  }

  /**
   * Clear old notifications (keep last 100)
   */
  async clearOldNotifications(userId: string): Promise<number> {
    // Get IDs of notifications to keep (most recent 100)
    const { data: toKeep } = await this.supabase
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!toKeep || toKeep.length < 100) {
      return 0;
    }

    const keepIds = toKeep.map((n) => n.id);

    // Delete notifications not in keep list
    const { data: deleted, error } = await this.supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .not("id", "in", `(${keepIds.join(",")})`)
      .select("id");

    if (error) {
      this.logger.error("Failed to clear old notifications:", error);
      return 0;
    }

    return deleted?.length || 0;
  }

  /**
   * Send token expiring notification
   */
  async notifyTokenExpiring(
    userId: string,
    connectionName: string,
    connectionId: string,
    platform: string,
    daysUntilExpiry: number,
  ): Promise<Notification> {
    return this.createNotification(
      userId,
      "token_expiring",
      "Token expirando em breve",
      `A conexão "${connectionName}" (${platform}) irá expirar em ${daysUntilExpiry} dia(s). Reconecte para evitar interrupções.`,
      {
        connection_id: connectionId,
        platform,
        days_until_expiry: daysUntilExpiry,
      },
    );
  }

  /**
   * Send token expired notification
   */
  async notifyTokenExpired(
    userId: string,
    connectionName: string,
    connectionId: string,
    platform: string,
  ): Promise<Notification> {
    return this.createNotification(
      userId,
      "token_expired",
      "Token expirado",
      `A conexão "${connectionName}" (${platform}) expirou. Reconecte para continuar usando.`,
      { connection_id: connectionId, platform },
    );
  }

  /**
   * Send connection needs reconnect notification
   * This is for permanent failures (token revoked, access denied, etc.)
   * Follows Nielsen's Heuristic #9: Help users recognize, diagnose, and recover from errors
   */
  async notifyConnectionNeedsReconnect(
    userId: string,
    connectionName: string,
    connectionId: string,
    platform: string,
    serviceType: string,
    errorReason?: string,
  ): Promise<Notification> {
    // User-friendly service type names
    const serviceTypeNames: Record<string, string> = {
      ads: "Google Ads",
      adsense: "AdSense",
      ad_manager: "Ad Manager",
      search_console: "Search Console",
      analytics: "Analytics",
    };

    const serviceName = serviceTypeNames[serviceType] || serviceType;

    // Provide specific, actionable message based on error
    let message = `A conexão "${connectionName}" (${serviceName}) precisa ser reconectada.`;

    if (errorReason) {
      if (
        errorReason.includes("revoked") ||
        errorReason.includes("invalid_grant")
      ) {
        message += ` O acesso foi revogado ou expirou permanentemente.`;
      } else if (errorReason.includes("access_denied")) {
        message += ` O acesso foi negado pelo Google.`;
      }
    }

    message += ` Vá para Conexões e clique em "Reconectar" para restaurar o acesso.`;

    return this.createNotification(
      userId,
      "connection_error",
      "Ação necessária: Reconectar conta",
      message,
      {
        connection_id: connectionId,
        platform,
        service_type: serviceType,
        error_reason: errorReason,
        action_required: "reconnect",
      },
    );
  }

  /**
   * Check for duplicate recent notification
   */
  async hasRecentNotification(
    userId: string,
    type: NotificationType,
    connectionId: string,
    withinHours: number = 24,
  ): Promise<boolean> {
    const since = new Date();
    since.setHours(since.getHours() - withinHours);

    const { data, error } = await this.supabase
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("type", type)
      .gte("created_at", since.toISOString())
      .contains("metadata", { connection_id: connectionId })
      .limit(1);

    if (error) {
      this.logger.warn("Error checking recent notifications:", error);
      return false;
    }

    return data && data.length > 0;
  }
}
