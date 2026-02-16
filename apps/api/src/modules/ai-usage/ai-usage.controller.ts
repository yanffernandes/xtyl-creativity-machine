import { Controller, Get, Query } from '@nestjs/common';
import { AiUsageService } from './ai-usage.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('ai-usage')
export class AiUsageController {
  constructor(private readonly aiUsageService: AiUsageService) {}

  @Get('stats')
  async getUsageStats(
    @Query('user_id') userId?: string,
    @Query('workspace_id') workspaceId?: string,
    @Query('project_id') projectId?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @CurrentUser('id') currentUserId?: string,
  ) {
    return this.aiUsageService.getUsageStats({
      userId: userId ?? currentUserId,
      workspaceId,
      projectId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('logs')
  async getUsageLogs(
    @Query('user_id') userId?: string,
    @Query('workspace_id') workspaceId?: string,
    @Query('project_id') projectId?: string,
    @Query('model') model?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @CurrentUser('id') currentUserId?: string,
  ) {
    return this.aiUsageService.getUsageLogs({
      userId: userId ?? currentUserId,
      workspaceId,
      projectId,
      model,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('costs')
  async getCostBreakdown(
    @Query('user_id') userId?: string,
    @Query('workspace_id') workspaceId?: string,
    @Query('project_id') projectId?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @CurrentUser('id') currentUserId?: string,
  ) {
    return this.aiUsageService.getCostBreakdown({
      userId: userId ?? currentUserId,
      workspaceId,
      projectId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('summary')
  async getUsageSummary(
    @Query('user_id') userId?: string,
    @Query('workspace_id') workspaceId?: string,
    @Query('project_id') projectId?: string,
    @CurrentUser('id') currentUserId?: string,
  ) {
    return this.aiUsageService.getUsageSummary({
      userId: userId ?? currentUserId,
      workspaceId,
      projectId,
    });
  }

  @Get('trend')
  async getDailyUsageTrend(
    @Query('days') days?: string,
    @Query('user_id') userId?: string,
    @Query('workspace_id') workspaceId?: string,
    @Query('project_id') projectId?: string,
    @CurrentUser('id') currentUserId?: string,
  ) {
    return this.aiUsageService.getDailyUsageTrend({
      userId: userId ?? currentUserId,
      workspaceId,
      projectId,
      days: days ? parseInt(days, 10) : 30,
    });
  }
}
