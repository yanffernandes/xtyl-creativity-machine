import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ============================================================================
  // Dashboard
  // ============================================================================

  @Get('dashboard')
  async getDashboard(@Query('period_days') periodDays?: string) {
    const days = periodDays ? parseInt(periodDays, 10) : 30;
    return this.adminService.getDashboardStats(days);
  }

  // ============================================================================
  // User Management
  // ============================================================================

  @Get('users')
  async listUsers(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    return this.adminService.listUsers({
      search,
      status,
      limit: limitNum,
      offset: offsetNum,
    });
  }

  @Get('users/:userId')
  async getUserDetails(@Param('userId') userId: string) {
    return this.adminService.getUserDetails(userId);
  }

  @Put('users/:userId')
  async updateUser(
    @Param('userId') userId: string,
    @CurrentUser('id') adminId: string,
    @Body() data: { role?: string; isBlocked?: boolean },
  ) {
    return this.adminService.updateUser(userId, adminId, data);
  }

  @Post('users/:userId/block')
  async blockUser(
    @Param('userId') userId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.blockUser(userId, adminId);
  }

  @Post('users/:userId/unblock')
  async unblockUser(@Param('userId') userId: string) {
    return this.adminService.unblockUser(userId);
  }

  // ============================================================================
  // Workspace Management
  // ============================================================================

  @Get('workspaces')
  async listWorkspaces(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    return this.adminService.listWorkspaces({
      search,
      limit: limitNum,
      offset: offsetNum,
    });
  }

  @Get('workspaces/:workspaceId')
  async getWorkspaceDetails(@Param('workspaceId') workspaceId: string) {
    return this.adminService.getWorkspaceDetails(workspaceId);
  }

  // ============================================================================
  // Model Configuration
  // ============================================================================

  @Get('models/config')
  async getModelConfig() {
    return this.adminService.getModelConfig();
  }

  @Put('models/config')
  async updateModelConfig(
    @CurrentUser('id') adminId: string,
    @Body()
    data: {
      defaults?: Record<string, string>;
      fallbacks?: Record<string, string>;
      visibleModels?: string[];
      visibleTextModels?: string[];
      visibleImageModels?: string[];
    },
  ) {
    return this.adminService.updateModelConfig(adminId, data);
  }

  // ============================================================================
  // System Settings
  // ============================================================================

  @Get('system/settings')
  async getSystemSettings() {
    return this.adminService.getSystemSettings();
  }

  @Put('system/settings')
  async updateSystemSettings(
    @CurrentUser('id') adminId: string,
    @Body() data: Record<string, any>,
  ) {
    return this.adminService.updateSystemSettings(adminId, data);
  }

  // ============================================================================
  // Audit Log
  // ============================================================================

  @Get('audit-log')
  async getAuditLog(
    @Query('user_id') userId?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    return this.adminService.getAuditLog({
      userId,
      action,
      limit: limitNum,
      offset: offsetNum,
    });
  }

  // ============================================================================
  // System Messages
  // ============================================================================

  @Get('system-messages')
  async getSystemMessages(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true';
    return this.adminService.getSystemMessages(include);
  }

  @Post('system-messages')
  async createSystemMessage(
    @CurrentUser('id') adminId: string,
    @Body()
    data: {
      type: string;
      title: string;
      content: string;
      priority?: number;
      dismissible?: boolean;
      startsAt?: string;
      endsAt?: string;
    },
  ) {
    return this.adminService.createSystemMessage(adminId, data);
  }

  @Put('system-messages/:messageId')
  async updateSystemMessage(
    @Param('messageId') messageId: string,
    @CurrentUser('id') adminId: string,
    @Body() data: Partial<{
      type: string;
      title: string;
      content: string;
      priority: number;
      dismissible: boolean;
      startsAt: string;
      endsAt: string;
    }>,
  ) {
    return this.adminService.updateSystemMessage(messageId, adminId, data);
  }

  @Delete('system-messages/:messageId')
  async deleteSystemMessage(
    @Param('messageId') messageId: string,
    @CurrentUser('id') adminId: string,
  ) {
    await this.adminService.deleteSystemMessage(messageId, adminId);
    return { success: true, message: 'Message deleted' };
  }

  // ============================================================================
  // Global Memories (Admin View)
  // ============================================================================

  @Get('memories')
  async getAllMemories(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    return this.adminService.getAllMemories({
      limit: limitNum,
      offset: offsetNum,
    });
  }

  @Delete('memories/:memoryId')
  async deleteMemory(
    @Param('memoryId') memoryId: string,
    @CurrentUser('id') adminId: string,
  ) {
    await this.adminService.deleteMemory(memoryId, adminId);
    return { success: true, message: 'Memory deleted' };
  }

  // ============================================================================
  // AI Usage Analytics
  // ============================================================================

  @Get('ai-usage/summary')
  async getAiUsageSummary(@Query('period_days') periodDays?: string) {
    const days = periodDays ? parseInt(periodDays, 10) : 30;
    return this.adminService.getAiUsageSummary(days);
  }

  @Get('ai-usage/by-user')
  async getAiUsageByUser(
    @Query('period_days') periodDays?: string,
    @Query('limit') limit?: string,
  ) {
    const days = periodDays ? parseInt(periodDays, 10) : 30;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    return this.adminService.getAiUsageByUser(days, limitNum);
  }

  @Get('ai-usage/by-model')
  async getAiUsageByModel(
    @Query('period_days') periodDays?: string,
    @Query('limit') limit?: string,
  ) {
    const days = periodDays ? parseInt(periodDays, 10) : 30;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    return this.adminService.getAiUsageByModel(days, limitNum);
  }
}
