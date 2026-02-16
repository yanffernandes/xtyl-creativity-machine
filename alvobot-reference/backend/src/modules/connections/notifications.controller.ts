import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Req,
  UseGuards,
  Logger,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { NotificationsService } from "./notifications.service";

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@Controller("notifications")
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Get notifications for the authenticated user
   * GET /notifications
   */
  @Get()
  @UseGuards(AuthGuard("jwt"))
  async getNotifications(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("unread_only") unreadOnly?: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    this.logger.log(`Getting notifications for user ${userId}`);

    const result = await this.notificationsService.getUserNotifications(
      userId,
      {
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
        unreadOnly: unreadOnly === "true",
      },
    );

    return {
      success: true,
      notifications: result.notifications,
      total: result.total,
      unreadCount: result.unreadCount,
    };
  }

  /**
   * Get unread count only
   * GET /notifications/unread-count
   */
  @Get("unread-count")
  @UseGuards(AuthGuard("jwt"))
  async getUnreadCount(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;

    const result = await this.notificationsService.getUserNotifications(
      userId,
      {
        limit: 1,
        unreadOnly: true,
      },
    );

    return {
      success: true,
      unreadCount: result.unreadCount,
    };
  }

  /**
   * Mark a notification as read
   * POST /notifications/:id/read
   */
  @Post(":id/read")
  @UseGuards(AuthGuard("jwt"))
  async markAsRead(
    @Param("id") notificationId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    this.logger.log(
      `Marking notification ${notificationId} as read for user ${userId}`,
    );

    const notification = await this.notificationsService.markAsRead(
      notificationId,
      userId,
    );

    return {
      success: true,
      notification,
    };
  }

  /**
   * Mark all notifications as read
   * POST /notifications/read-all
   */
  @Post("read-all")
  @UseGuards(AuthGuard("jwt"))
  async markAllAsRead(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    this.logger.log(`Marking all notifications as read for user ${userId}`);

    const count = await this.notificationsService.markAllAsRead(userId);

    return {
      success: true,
      count,
      message: `${count} notificação(ões) marcada(s) como lida(s)`,
    };
  }

  /**
   * Delete a notification
   * DELETE /notifications/:id
   */
  @Delete(":id")
  @UseGuards(AuthGuard("jwt"))
  async deleteNotification(
    @Param("id") notificationId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    this.logger.log(
      `Deleting notification ${notificationId} for user ${userId}`,
    );

    await this.notificationsService.deleteNotification(notificationId, userId);

    return {
      success: true,
      message: "Notificação removida com sucesso",
    };
  }
}
