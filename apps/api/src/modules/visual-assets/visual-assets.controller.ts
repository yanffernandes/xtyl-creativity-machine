import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { VisualAssetsService } from './visual-assets.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ProjectAccessGuard } from '../../common/guards/project-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface AssetMetadataUpdateDto {
  category?: string;
  tags?: string[];
  aiDescription?: string;
}

interface VisualSettingsUpdateDto {
  isEnabled?: boolean;
  mode?: 'manual' | 'auto';
  assetsPerCategory?: number;
}

interface AssetSelectionUpdateDto {
  assetIds: string[];
}

interface AssetUsageDto {
  assetIds: string[];
  generationId?: string;
}

@Controller()
@UseGuards(AuthGuard)
export class VisualAssetsController {
  constructor(private readonly visualAssetsService: VisualAssetsService) {}

  // ============================================================================
  // Asset Management
  // ============================================================================

  @Post('projects/:projectId/visual-assets/upload')
  @UseGuards(ProjectAccessGuard)
  async uploadAsset(
    @Param('projectId') projectId: string,
    @CurrentUser('id') userId: string,
    @Req() req: FastifyRequest,
  ) {
    const data = await (req as any).file();
    if (!data) {
      throw new BadRequestException('No file uploaded');
    }

    const body = data?.fields as Record<string, any>;
    const assetType = body?.assetType?.value as string | undefined;
    const name = body?.name?.value as string | undefined;
    const folderId = body?.folderId?.value as string | undefined;

    return this.visualAssetsService.uploadAsset(projectId, userId, data, {
      assetType,
      name,
      folderId,
    });
  }

  @Get('projects/:projectId/visual-assets')
  @UseGuards(ProjectAccessGuard)
  async listAssets(
    @Param('projectId') projectId: string,
    @Query('classification') classification?: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    return this.visualAssetsService.listAssets(projectId, {
      classification: classification || category,
      limit: limitNum,
      offset: offsetNum,
    });
  }

  @Get('visual-assets/:assetId')
  async getAsset(@Param('assetId') assetId: string) {
    return this.visualAssetsService.getAsset(assetId);
  }

  @Put('visual-assets/:assetId')
  async updateAsset(
    @Param('assetId') assetId: string,
    @Body() data: Partial<{ title: string; assetType: string; folderId: string }>,
  ) {
    return this.visualAssetsService.updateAsset(assetId, data);
  }

  @Delete('visual-assets/:assetId')
  async deleteAsset(
    @Param('assetId') assetId: string,
    @Query('hard') hard?: string,
  ) {
    const hardDelete = hard === 'true';
    await this.visualAssetsService.deleteAsset(assetId, hardDelete);
    return { success: true, message: 'Asset deleted' };
  }

  @Post('visual-assets/:assetId/classify')
  async classifyAsset(
    @Param('assetId') assetId: string,
    @Query('force') force?: string,
  ) {
    const forceClassify = force === 'true';
    return this.visualAssetsService.classifyAsset(assetId, forceClassify);
  }

  @Put('visual-assets/:assetId/metadata')
  async updateAssetMetadata(
    @Param('assetId') assetId: string,
    @Body() data: AssetMetadataUpdateDto,
  ) {
    return this.visualAssetsService.updateAssetMetadata(assetId, data);
  }

  @Post('visual-assets/:assetId/usage')
  async trackUsage(
    @Param('assetId') assetId: string,
    @Body() data: { generationId?: string },
  ) {
    await this.visualAssetsService.trackUsage(assetId, data.generationId);
    return { success: true, message: 'Usage tracked' };
  }

  // ============================================================================
  // Visual Context Settings
  // ============================================================================

  @Put('projects/:projectId/visual-context/settings')
  @UseGuards(ProjectAccessGuard)
  async updateVisualSettings(
    @Param('projectId') projectId: string,
    @Body() data: VisualSettingsUpdateDto,
  ) {
    return this.visualAssetsService.updateVisualSettings(projectId, data);
  }

  @Get('projects/:projectId/visual-context/settings')
  @UseGuards(ProjectAccessGuard)
  async getVisualSettings(@Param('projectId') projectId: string) {
    return this.visualAssetsService.getOrCreateVisualSettings(projectId);
  }

  @Put('projects/:projectId/visual-context/selections')
  @UseGuards(ProjectAccessGuard)
  async updateAssetSelections(
    @Param('projectId') projectId: string,
    @Body() data: AssetSelectionUpdateDto,
  ) {
    return this.visualAssetsService.updateAssetSelections(projectId, data.assetIds);
  }

  @Get('projects/:projectId/visual-context/selections')
  @UseGuards(ProjectAccessGuard)
  async getAssetSelections(@Param('projectId') projectId: string) {
    return this.visualAssetsService.getAssetSelections(projectId);
  }

  @Get('projects/:projectId/visual-context/resolve')
  @UseGuards(ProjectAccessGuard)
  async getVisualContext(
    @Param('projectId') projectId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    return this.visualAssetsService.getVisualContext(projectId, limitNum);
  }

  @Post('projects/:projectId/visual-context/usage')
  @UseGuards(ProjectAccessGuard)
  async recordAssetUsage(
    @Param('projectId') _projectId: string,
    @Body() data: AssetUsageDto,
  ) {
    const count = await this.visualAssetsService.recordAssetUsage(
      data.assetIds,
      data.generationId,
    );

    return {
      success: true,
      message: `Recorded usage for ${count} assets`,
      count,
    };
  }
}
