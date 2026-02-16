import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { CurrentUser } from '../../common/decorators';

interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface CreateWorkflowTemplateDto {
  workspace_id: string;
  project_id?: string;
  name: string;
  description?: string;
  category?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  default_params?: Record<string, unknown>;
  is_system?: boolean;
  is_recommended?: boolean;
  version?: string;
}

interface UpdateWorkflowTemplateDto {
  name?: string;
  description?: string;
  category?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  default_params?: Record<string, unknown>;
  is_recommended?: boolean;
}

@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  async listWorkflowTemplates(
    @Query('workspace_id') workspaceId?: string,
    @Query('project_id') projectId?: string,
    @Query('category') category?: string,
    @Query('is_system') isSystem?: string,
    @Query('is_recommended') isRecommended?: string,
    @CurrentUser() _user?: any,
  ) {
    return this.workflowsService.listTemplates({
      workspaceId,
      projectId,
      category,
      isSystem: isSystem === 'true' ? true : isSystem === 'false' ? false : undefined,
      isRecommended:
        isRecommended === 'true' ? true : isRecommended === 'false' ? false : undefined,
    });
  }

  @Get('system')
  async listSystemTemplates(@CurrentUser() _user: any) {
    return this.workflowsService.listTemplates({ isSystem: true });
  }

  @Get('categories/list')
  async listWorkflowCategories() {
    return {
      categories: [
        {
          id: 'social_media',
          name: 'Social Media',
          description: 'Instagram, Facebook, LinkedIn posts',
        },
        {
          id: 'paid_ads',
          name: 'Paid Advertising',
          description: 'Facebook Ads, Google Ads campaigns',
        },
        {
          id: 'blog',
          name: 'Blog Content',
          description: 'Blog posts, articles, SEO content',
        },
        {
          id: 'email',
          name: 'Email Marketing',
          description: 'Email campaigns, newsletters',
        },
        {
          id: 'seo',
          name: 'SEO',
          description: 'SEO-optimized content, meta descriptions',
        },
        {
          id: 'creative',
          name: 'Creative',
          description: 'Custom creative workflows',
        },
      ],
    };
  }

  @Get(':templateId')
  async getWorkflowTemplate(
    @Param('templateId') templateId: string,
    @CurrentUser() _user: any,
  ) {
    return this.workflowsService.getTemplate(templateId);
  }

  @Post()
  async createWorkflowTemplate(
    @Body() dto: CreateWorkflowTemplateDto,
    @CurrentUser() user: any,
  ) {
    return this.workflowsService.createTemplate(dto, user.id);
  }

  @Put(':templateId')
  async updateWorkflowTemplate(
    @Param('templateId') templateId: string,
    @Body() dto: UpdateWorkflowTemplateDto,
    @CurrentUser() user: any,
  ) {
    return this.workflowsService.updateTemplate(templateId, dto, user.id);
  }

  @Delete(':templateId')
  async deleteWorkflowTemplate(
    @Param('templateId') templateId: string,
    @CurrentUser() user: any,
  ) {
    return this.workflowsService.deleteTemplate(templateId, user.id);
  }

  @Post(':templateId/duplicate')
  async duplicateWorkflowTemplate(
    @Param('templateId') templateId: string,
    @Body('workspace_id') workspaceId: string,
    @Body('project_id') projectId?: string,
    @Body('name') name?: string,
    @CurrentUser() user?: any,
  ) {
    return this.workflowsService.duplicateTemplate(
      templateId,
      workspaceId,
      projectId,
      name,
      user.id,
    );
  }

  @Post('validate')
  async validateWorkflow(
    @Body() workflow: { nodes: WorkflowNode[]; edges: WorkflowEdge[] },
    @CurrentUser() _user: any,
  ) {
    return this.workflowsService.validateWorkflow(workflow);
  }
}
