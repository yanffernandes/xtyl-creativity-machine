import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
} from '@nestjs/common';
import { ActivityService } from './activity.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface CreateActivityDto {
  entityType: string;
  entityId: string;
  action: string;
  actorType: string;
  changes?: Record<string, any>;
}

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  async listActivityLogs(
    @Query('project_id') projectId?: string,
    @Query('user_id') userId?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.activityService.listActivityLogs({
      projectId,
      userId,
      action,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Post()
  async createActivityLog(
    @Body() dto: CreateActivityDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.activityService.createActivityLog(dto, userId);
  }

  @Get('entity/:entityType/:entityId')
  async getEntityActivity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.activityService.getEntityActivity(entityType, entityId);
  }

  @Get('project/:projectId/recent')
  async getRecentProjectActivity(
    @Param('projectId') projectId: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityService.getRecentProjectActivity(
      projectId,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('user/:userId/recent')
  async getUserRecentActivity(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityService.getUserRecentActivity(
      userId,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('stats/ai-vs-human/:projectId')
  async getAiHumanStats(@Param('projectId') projectId: string) {
    return this.activityService.getAiHumanStats(projectId);
  }
}
