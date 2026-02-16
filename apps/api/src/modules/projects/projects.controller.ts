import {
  Controller,
  Get,
  Put,
  Delete,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ProjectAccessGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { ProjectsService } from './projects.service';
import type {
  ProjectSettingsUpdate,
  ProjectContext,
  AssetColorExtractionRequest,
  DeleteProjectResponse,
  BootstrapData,
} from './projects.dto';

interface User {
  id: string;
  email: string;
}

@Controller('projects')
@UseGuards(ProjectAccessGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * GET /projects/:projectId/settings
   * Get project settings
   */
  @Get(':projectId/settings')
  async getSettings(@Param('projectId') projectId: string) {
    return this.projectsService.getSettings(projectId);
  }

  /**
   * PUT /projects/:projectId/settings
   * Update project settings and sync project name with client_name
   */
  @Put(':projectId/settings')
  async updateSettings(
    @Param('projectId') projectId: string,
    @Body() settings: ProjectSettingsUpdate,
  ) {
    if (!settings.client_name || !settings.client_name.trim()) {
      throw new BadRequestException('client_name is required');
    }

    return this.projectsService.updateSettings(projectId, settings);
  }

  /**
   * GET /projects/:projectId/settings/context
   * Get formatted AI context from project settings
   */
  @Get(':projectId/settings/context')
  async getContext(
    @Param('projectId') projectId: string,
  ): Promise<ProjectContext> {
    return this.projectsService.getContext(projectId);
  }

  /**
   * POST /projects/:projectId/extract-colors
   * Extract dominant colors from an uploaded image (STUB)
   */
  @Post(':projectId/extract-colors')
  async extractColors(
    @Param('projectId') _projectId: string,
    @Query('n_colors') _nColors: number = 6,
  ) {
    // TODO: Implement file upload handling
    // For now, return stub response
    return {
      colors: [],
      source_filename: '',
      processing_time_ms: 0,
      message: 'Color extraction not yet implemented',
    };
  }

  /**
   * POST /projects/:projectId/extract-colors-from-asset
   * Extract dominant colors from an existing visual asset (STUB)
   */
  @Post(':projectId/extract-colors-from-asset')
  async extractColorsFromAsset(
    @Param('projectId') _projectId: string,
    @Body() request: AssetColorExtractionRequest,
    @Query('n_colors') _nColors: number = 6,
  ) {
    // TODO: Implement color extraction from asset
    // For now, return stub response
    return {
      colors: [],
      source_filename: '',
      processing_time_ms: 0,
      message: 'Color extraction from asset not yet implemented',
      source_asset_id: request.asset_id,
      source_asset_name: '',
    };
  }

  /**
   * DELETE /projects/:projectId
   * Soft delete a project and cascade to all child entities
   * Requires workspace owner or admin role
   */
  @Delete(':projectId')
  async deleteProject(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
  ): Promise<DeleteProjectResponse> {
    // TODO: Add authorization check (workspace owner/admin)
    // For now, allow any authenticated user with project access

    const result = await this.projectsService.deleteProject(projectId, user.id);

    return {
      success: true,
      message: `Project has been deleted`,
      deleted_at: result.deleted_at,
      cascade_summary: result.cascade_summary,
    };
  }

  /**
   * GET /projects/:projectId/bootstrap
   * Get all data needed to load the project page in a single request
   * Aggregates: project info, settings, models, visual assets, memories, recent docs, creative concepts
   */
  @Get(':projectId/bootstrap')
  async getBootstrap(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
  ): Promise<BootstrapData> {
    return this.projectsService.getBootstrap(projectId, user.id);
  }
}
