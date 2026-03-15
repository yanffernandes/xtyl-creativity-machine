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

@Controller()
@UseGuards(AuthGuard)
export class VisualAssetsController {
  constructor(private readonly visualAssetsService: VisualAssetsService) {}

  private async parseAssetUpdatePayload(
    req: FastifyRequest,
    body: Partial<{ title: string; assetType: string; folderId: string }>,
  ) {
    if (!(req as any).isMultipart?.()) {
      return body;
    }

    const parsed: Record<string, string> = {};
    for await (const part of (req as any).parts()) {
      if (part.type === 'file') {
        await part.toBuffer();
        continue;
      }

      parsed[part.fieldname] = String(part.value ?? '');
    }

    return {
      title: parsed.title ?? body.title,
      assetType:
        parsed.assetType ??
        parsed.asset_type ??
        body.assetType,
      folderId:
        parsed.folderId ??
        parsed.folder_id ??
        body.folderId,
    };
  }

  private mapAsset(asset: any) {
    return {
      id: asset.id,
      title: asset.title,
      project_id: asset.projectId,
      folder_id: asset.folderId,
      file_url: asset.fileUrl,
      thumbnail_url: asset.thumbnailUrl,
      asset_type: asset.assetType,
      asset_metadata: asset.assetMetadata,
      category: asset.assetCategory,
      tags: asset.assetTags || [],
      ai_description: asset.aiDescription,
      is_classified: Boolean(asset.assetCategory),
      created_at: asset.createdAt,
      updated_at: asset.updatedAt,
    };
  }

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

    const buffer = await data.toBuffer();

    const body = data?.fields as Record<string, any>;
    const assetType =
      (body?.assetType?.value as string | undefined) ||
      (body?.asset_type?.value as string | undefined);
    const name = body?.name?.value as string | undefined;
    const folderId =
      (body?.folderId?.value as string | undefined) ||
      (body?.folder_id?.value as string | undefined);

    const asset = await this.visualAssetsService.uploadAsset(
      projectId,
      userId,
      {
        buffer,
        size: buffer.length,
        mimetype: data.mimetype,
        originalname: data.filename,
      },
      {
      assetType,
      name,
      folderId,
      },
    );

    return this.mapAsset(asset);
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

    const result = await this.visualAssetsService.listAssets(projectId, {
      classification: classification || category,
      limit: limitNum,
      offset: offsetNum,
    });

    return {
      assets: result.assets.map((asset: any) => this.mapAsset(asset)),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  }

  @Get('projects/:projectId/visual-assets/summary')
  @UseGuards(ProjectAccessGuard)
  async getAssetsSummary(@Param('projectId') projectId: string) {
    return this.visualAssetsService.getAssetsSummary(projectId);
  }

  @Get('visual-assets/:assetId')
  async getAsset(@Param('assetId') assetId: string) {
    const asset = await this.visualAssetsService.getAsset(assetId);
    return this.mapAsset(asset);
  }

  @Put('visual-assets/:assetId')
  async updateAsset(
    @Param('assetId') assetId: string,
    @Req() req: FastifyRequest,
    @Body() data: Partial<{ title: string; assetType: string; folderId: string }>,
  ) {
    const payload = await this.parseAssetUpdatePayload(req, data);
    const asset = await this.visualAssetsService.updateAsset(assetId, payload);
    return this.mapAsset(asset);
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
    const result = await this.visualAssetsService.classifyAsset(assetId, forceClassify);
    return {
      asset_id: result.assetId,
      suggested_category: result.category,
      suggested_tags: result.tags,
      ai_description: result.description,
      confidence: result.alreadyClassified ? 1 : undefined,
    };
  }

  @Put('visual-assets/:assetId/metadata')
  async updateAssetMetadata(
    @Param('assetId') assetId: string,
    @Body() data: { category?: string; tags?: string[]; aiDescription?: string; ai_description?: string },
  ) {
    const asset = await this.visualAssetsService.updateAssetMetadata(assetId, {
      category: data.category,
      tags: data.tags,
      aiDescription: data.aiDescription ?? data.ai_description,
    });
    return this.mapAsset(asset);
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
    @Body() data: { is_enabled?: boolean; isEnabled?: boolean; mode?: 'manual' | 'auto'; assets_per_category?: number; assetsPerCategory?: number },
  ) {
    const result = await this.visualAssetsService.updateVisualSettings(projectId, {
      isEnabled: data.isEnabled ?? data.is_enabled,
      mode: data.mode,
      assetsPerCategory: data.assetsPerCategory ?? data.assets_per_category,
    });
    return {
      id: result.id,
      project_id: result.projectId,
      is_enabled: result.isEnabled,
      mode: result.mode,
      assets_per_category: result.assetsPerCategory,
      created_at: result.createdAt,
      updated_at: result.updatedAt,
    };
  }

  @Get('projects/:projectId/visual-context/settings')
  @UseGuards(ProjectAccessGuard)
  async getVisualSettings(@Param('projectId') projectId: string) {
    const result = await this.visualAssetsService.getOrCreateVisualSettings(projectId);
    return {
      id: result.id,
      project_id: result.projectId,
      is_enabled: result.isEnabled,
      mode: result.mode,
      assets_per_category: result.assetsPerCategory,
      created_at: result.createdAt,
      updated_at: result.updatedAt,
    };
  }

  @Put('projects/:projectId/visual-context/selections')
  @UseGuards(ProjectAccessGuard)
  async updateAssetSelections(
    @Param('projectId') projectId: string,
    @Body() data: { asset_ids?: string[]; assetIds?: string[] },
  ) {
    const ids = data.assetIds ?? data.asset_ids ?? [];
    const result = await this.visualAssetsService.updateAssetSelections(projectId, ids);
    return {
      selections: result.selections.map((selection: any) => ({
        id: selection.id,
        asset_id: selection.assetId,
        is_enabled: selection.isEnabled,
        created_at: selection.createdAt,
      })),
      total_enabled: result.total,
    };
  }

  @Get('projects/:projectId/visual-context/selections')
  @UseGuards(ProjectAccessGuard)
  async getAssetSelections(@Param('projectId') projectId: string) {
    const result = await this.visualAssetsService.getAssetSelections(projectId);
    return {
      selections: result.selections.map((selection: any) => ({
        id: selection.id,
        asset_id: selection.assetId,
        is_enabled: selection.isEnabled,
        created_at: selection.createdAt,
      })),
      total_enabled: result.total,
    };
  }

  @Get('projects/:projectId/visual-context/resolve')
  @UseGuards(ProjectAccessGuard)
  async getVisualContext(
    @Param('projectId') projectId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    const result = await this.visualAssetsService.getVisualContext(projectId, limitNum);
    return {
      is_enabled: result.enabled,
      mode: result.mode,
      assets: result.assets,
      message: result.enabled ? undefined : 'Visual context is disabled',
    };
  }

  @Post('projects/:projectId/visual-context/usage')
  @UseGuards(ProjectAccessGuard)
  async recordAssetUsage(
    @Param('projectId') _projectId: string,
    @Body() data: { asset_ids?: string[]; assetIds?: string[]; generation_id?: string; generationId?: string },
  ) {
    const assetIds = data.assetIds ?? data.asset_ids ?? [];
    const generationId = data.generationId ?? data.generation_id;
    const count = await this.visualAssetsService.recordAssetUsage(assetIds, generationId);
    return {
      success: true,
      message: `Recorded usage for ${count} assets`,
      count,
    };
  }
}
