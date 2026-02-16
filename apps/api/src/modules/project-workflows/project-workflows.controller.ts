import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProjectWorkflowsService } from './project-workflows.service';
import { ProjectAccessGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';

@Controller('projects/:projectId/workflows')
@UseGuards(ProjectAccessGuard)
export class ProjectWorkflowsController {
  constructor(
    private readonly projectWorkflowsService: ProjectWorkflowsService,
  ) {}

  @Get('available')
  async listAvailableWorkflows(
    @Param('projectId') projectId: string,
    @Query('category') category?: string,
    @CurrentUser() _user?: any,
  ) {
    return this.projectWorkflowsService.listAvailableWorkflows(
      projectId,
      category,
    );
  }

  @Get('history')
  async listProjectWorkflowHistory(
    @Param('projectId') projectId: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
    @CurrentUser() _user?: any,
  ) {
    return this.projectWorkflowsService.listExecutionHistory(
      projectId,
      limit,
      offset,
    );
  }

  @Post(':executionId/save-to-project')
  async saveWorkflowOutputToProject(
    @Param('projectId') projectId: string,
    @Param('executionId') executionId: string,
    @Body('folder_id') folderId?: string,
    @Body('document_title') documentTitle?: string,
    @CurrentUser() _user?: any,
  ) {
    return this.projectWorkflowsService.saveOutputToProject(
      projectId,
      executionId,
      folderId,
      documentTitle,
      _user.id,
    );
  }

  @Get(':executionId/generated-documents')
  async listGeneratedDocuments(
    @Param('projectId') projectId: string,
    @Param('executionId') executionId: string,
    @CurrentUser() _user: any,
  ) {
    return this.projectWorkflowsService.listGeneratedDocuments(
      projectId,
      executionId,
    );
  }

  @Get('stats')
  async getProjectWorkflowStats(
    @Param('projectId') projectId: string,
    @CurrentUser() _user: any,
  ) {
    return this.projectWorkflowsService.getWorkflowStats(projectId);
  }
}
