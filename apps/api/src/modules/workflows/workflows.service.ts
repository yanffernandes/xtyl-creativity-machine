import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, or, desc, isNull } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module';
import {
  workflowTemplates,
  workflowExecutions,
  workspaces,
  projects,
} from '../../database/drizzle/schema';

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

interface ListTemplatesFilters {
  workspaceId?: string;
  projectId?: string;
  category?: string;
  isSystem?: boolean;
  isRecommended?: boolean;
}

@Injectable()
export class WorkflowsService {
  constructor(@Inject(DATABASE) private readonly db: any) {}

  /**
   * List workflow templates with optional filters
   */
  async listTemplates(filters: ListTemplatesFilters = {}) {
    const conditions = [];

    // Filter by workspace
    if (filters.workspaceId) {
      conditions.push(
        or(
          eq(workflowTemplates.workspaceId, filters.workspaceId),
          eq(workflowTemplates.isSystem, true),
        ),
      );
    }

    // Filter by project
    if (filters.projectId) {
      conditions.push(
        or(
          eq(workflowTemplates.projectId, filters.projectId),
          isNull(workflowTemplates.projectId),
        ),
      );
    }

    // Filter by category
    if (filters.category) {
      conditions.push(eq(workflowTemplates.category, filters.category));
    }

    // Filter by is_system
    if (filters.isSystem !== undefined) {
      conditions.push(eq(workflowTemplates.isSystem, filters.isSystem));
    }

    // Filter by is_recommended
    if (filters.isRecommended !== undefined) {
      conditions.push(
        eq(workflowTemplates.isRecommended, filters.isRecommended),
      );
    }

    // Only show non-deleted templates
    conditions.push(isNull(workflowTemplates.deletedAt));

    const templates = await this.db
      .select()
      .from(workflowTemplates)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(
        desc(workflowTemplates.isRecommended),
        desc(workflowTemplates.isSystem),
        desc(workflowTemplates.usageCount),
        desc(workflowTemplates.createdAt),
      );

    return templates;
  }

  /**
   * Get a specific workflow template
   */
  async getTemplate(templateId: string) {
    const [template] = await this.db
      .select()
      .from(workflowTemplates)
      .where(
        and(
          eq(workflowTemplates.id, templateId),
          isNull(workflowTemplates.deletedAt),
        ),
      )
      .limit(1);

    if (!template) {
      throw new NotFoundException('Workflow template not found');
    }

    return template;
  }

  /**
   * Create a new workflow template
   */
  async createTemplate(dto: CreateWorkflowTemplateDto, userId: string) {
    // Validate workspace exists
    const [workspace] = await this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, dto.workspace_id))
      .limit(1);

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Validate project exists if provided
    if (dto.project_id) {
      const [project] = await this.db
        .select()
        .from(projects)
        .where(eq(projects.id, dto.project_id))
        .limit(1);

      if (!project) {
        throw new NotFoundException('Project not found');
      }
    }

    // Validate workflow structure
    const validation = this.validateWorkflow({
      nodes: dto.nodes,
      edges: dto.edges,
    });

    if (!validation.valid) {
      throw new BadRequestException({
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    // Generate ID
    const templateId = crypto.randomUUID();

    // Create template
    const [template] = await this.db
      .insert(workflowTemplates)
      .values({
        id: templateId,
        workspaceId: dto.workspace_id,
        projectId: dto.project_id,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        nodesJson: dto.nodes,
        edgesJson: dto.edges,
        defaultParamsJson: dto.default_params || {},
        isSystem: dto.is_system || false,
        isRecommended: dto.is_recommended || false,
        version: dto.version || '1.0',
        usageCount: 0,
        createdBy: userId,
      })
      .returning();

    return template;
  }

  /**
   * Update an existing workflow template
   */
  async updateTemplate(
    templateId: string,
    dto: UpdateWorkflowTemplateDto,
    userId: string,
  ) {
    // Get template
    const [template] = await this.db
      .select()
      .from(workflowTemplates)
      .where(eq(workflowTemplates.id, templateId))
      .limit(1);

    if (!template) {
      throw new NotFoundException('Workflow template not found');
    }

    // Only allow updating custom templates (not system templates)
    if (template.isSystem) {
      throw new ForbiddenException('Cannot modify system templates');
    }

    // Only allow creator to update
    if (template.createdBy !== userId) {
      throw new ForbiddenException('Only template creator can update it');
    }

    // Validate workflow structure if nodes/edges are being updated
    if (dto.nodes || dto.edges) {
      const nodes = dto.nodes || template.nodesJson;
      const edges = dto.edges || template.edgesJson;

      const validation = this.validateWorkflow({ nodes, edges });

      if (!validation.valid) {
        throw new BadRequestException({
          errors: validation.errors,
          warnings: validation.warnings,
        });
      }
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.nodes !== undefined) updateData.nodesJson = dto.nodes;
    if (dto.edges !== undefined) updateData.edgesJson = dto.edges;
    if (dto.default_params !== undefined)
      updateData.defaultParamsJson = dto.default_params;
    if (dto.is_recommended !== undefined)
      updateData.isRecommended = dto.is_recommended;

    // Update template
    const [updatedTemplate] = await this.db
      .update(workflowTemplates)
      .set(updateData)
      .where(eq(workflowTemplates.id, templateId))
      .returning();

    return updatedTemplate;
  }

  /**
   * Delete a workflow template
   */
  async deleteTemplate(templateId: string, userId: string) {
    // Get template
    const [template] = await this.db
      .select()
      .from(workflowTemplates)
      .where(eq(workflowTemplates.id, templateId))
      .limit(1);

    if (!template) {
      throw new NotFoundException('Workflow template not found');
    }

    // Only allow deleting custom templates
    if (template.isSystem) {
      throw new ForbiddenException('Cannot delete system templates');
    }

    // Only allow creator to delete
    if (template.createdBy !== userId) {
      throw new ForbiddenException('Only template creator can delete it');
    }

    // Check for active executions
    const activeExecutions = await this.db
      .select()
      .from(workflowExecutions)
      .where(
        and(
          eq(workflowExecutions.templateId, templateId),
          or(
            eq(workflowExecutions.status, 'running'),
            eq(workflowExecutions.status, 'pending'),
            eq(workflowExecutions.status, 'queued'),
          ),
        ),
      );

    if (activeExecutions.length > 0) {
      throw new BadRequestException(
        'Cannot delete workflow with active executions',
      );
    }

    // Soft delete
    await this.db
      .update(workflowTemplates)
      .set({ deletedAt: new Date() })
      .where(eq(workflowTemplates.id, templateId));

    return {
      message: 'Workflow template deleted successfully',
      id: templateId,
    };
  }

  /**
   * Duplicate an existing workflow template
   */
  async duplicateTemplate(
    templateId: string,
    workspaceId: string,
    projectId: string | undefined,
    name: string | undefined,
    userId: string,
  ) {
    // Get source template
    const [sourceTemplate] = await this.db
      .select()
      .from(workflowTemplates)
      .where(eq(workflowTemplates.id, templateId))
      .limit(1);

    if (!sourceTemplate) {
      throw new NotFoundException('Workflow template not found');
    }

    // Validate workspace exists
    const [workspace] = await this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Generate new ID and name
    const newId = crypto.randomUUID();
    const newName = name || `${sourceTemplate.name} (Copy)`;

    // Create duplicated template
    const [duplicatedTemplate] = await this.db
      .insert(workflowTemplates)
      .values({
        id: newId,
        workspaceId,
        projectId,
        name: newName,
        description: sourceTemplate.description,
        category: sourceTemplate.category,
        nodesJson: sourceTemplate.nodesJson,
        edgesJson: sourceTemplate.edgesJson,
        defaultParamsJson: sourceTemplate.defaultParamsJson,
        isSystem: false, // Duplicated templates are never system templates
        isRecommended: false,
        version: sourceTemplate.version,
        usageCount: 0,
        createdBy: userId,
      })
      .returning();

    return duplicatedTemplate;
  }

  /**
   * Validate workflow structure
   */
  validateWorkflow(workflow: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if workflow has at least one node
    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push('Workflow must have at least one node');
    }

    // Check if workflow has a start node
    const hasStartNode = workflow.nodes.some((node) => node.type === 'start');
    if (!hasStartNode) {
      errors.push('Workflow must have a start node');
    }

    // Check if workflow has a finish node
    const hasFinishNode = workflow.nodes.some(
      (node) => node.type === 'finish',
    );
    if (!hasFinishNode) {
      warnings.push('Workflow should have a finish node');
    }

    // Check for orphaned nodes (nodes with no incoming or outgoing edges)
    const nodeIds = new Set(workflow.nodes.map((n) => n.id));
    const connectedNodes = new Set<string>();

    for (const edge of workflow.edges || []) {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    }

    for (const node of workflow.nodes) {
      if (
        !connectedNodes.has(node.id) &&
        node.type !== 'start' &&
        node.type !== 'finish'
      ) {
        warnings.push(`Node "${node.id}" is not connected to the workflow`);
      }
    }

    // Check for invalid edge references
    for (const edge of workflow.edges || []) {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge "${edge.id}" references invalid source node`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge "${edge.id}" references invalid target node`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
