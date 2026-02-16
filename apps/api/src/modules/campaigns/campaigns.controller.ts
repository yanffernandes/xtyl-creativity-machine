import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CurrentUser } from '../../common/decorators';

interface CreateCampaignDto {
  name: string;
  channel?: string;
  metadata?: Record<string, any>;
}

interface UpdateCampaignDto {
  name?: string;
  channel?: string;
  metadata?: Record<string, any>;
}

@Controller('projects/:projectId/campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  async listCampaigns(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Query('channel') channel?: string,
  ) {
    return this.campaignsService.listCampaigns(userId, projectId, channel);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCampaign(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.campaignsService.createCampaign(userId, projectId, dto);
  }

  @Get(':campaignId')
  async getCampaign(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Param('campaignId') campaignId: string,
  ) {
    return this.campaignsService.getCampaign(userId, projectId, campaignId);
  }

  @Put(':campaignId')
  async updateCampaign(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Param('campaignId') campaignId: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.updateCampaign(
      userId,
      projectId,
      campaignId,
      dto,
    );
  }

  @Delete(':campaignId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCampaign(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Param('campaignId') campaignId: string,
  ) {
    await this.campaignsService.deleteCampaign(userId, projectId, campaignId);
  }
}
