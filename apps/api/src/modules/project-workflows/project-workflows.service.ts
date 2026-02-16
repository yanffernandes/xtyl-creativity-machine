import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, or, desc, isNull, sql, inArray } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module';
import {
  projects,
  workflowTemplates,
  workflowExecutions,
  documents,
} from '../../database/drizzle/schema';

@Injectable()
export class ProjectWorkflowsService {
  constructor(@Inject(DATABASE) private readonly db: any) {}

  /**
   * List workflows available for a specific project
   * Returns both system templates and workspace-specific templates
   */
  async listAvailableWorkflows(projectId: string, category?: string) {
    // Get project to find workspace
    const [project] = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const workspaceId = project.workspaceId;

    // Build query conditions
    const conditions = [
      or(
        eq(workflowTemplates.isSystem, true),
        eq(workflowTemplates.workspaceId, workspaceId),
      ),
      isNull(workflowTemplates.deletedAt),
    ];

    if (category) {
      conditions.push(eq(workflowTemplates.category, category));
    }

    const templates = await this.db
      .select({
        id: workflowTemplates.id,
        name: workflowTemplates.name,
        description: workflowTemplates.description,
        category: workflowTemplates.category,
        isSystem: workflowTemplates.isSystem,
        isRecommended: workflowTemplates.isRecommended,
        usageCount: workflowTemplates.usageCount,
        nodesJson: workflowTemplates.nodesJson,
      })
      .from(workflowTemplates)
      .where(and(...conditions))
      .orderBy(
        desc(workflowTemplates.isRecommended),
        desc(workflowTemplates.usageCount),
      );

    return templates.map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      is_system: t.isSystem,
      is_recommended: t.isRecommended,
      usage_count: t.usageCount,
      node_count: t.nodesJson ? (t.nodesJson as any[]).length : 0,
    }));
  }

  /**
   * Get workflow execution history for a project
   */
  async listExecutionHistory(
    projectId: string,
    limit: number,
    offset: number,
  ) {
    // Verify project exists
    const [project] = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const executions = await this.db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.projectId, projectId))
      .orderBy(desc(workflowExecutions.createdAt))
      .limit(limit)
      .offset(offset);

    return executions;
  }

  /**
   * Save workflow execution output as a document in the project
   */
  async saveOutputToProject(
    projectId: string,
    executionId: string,
    folderId: string | undefined,
    documentTitle: string | undefined,
    _userId: string,
  ) {
    // Verify project exists
    const [project] = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Get execution
    const [execution] = await this.db
      .select()
      .from(workflowExecutions)
      .where(
        and(
          eq(workflowExecutions.id, executionId),
          eq(workflowExecutions.projectId, projectId),
        ),
      )
      .limit(1);

    if (!execution) {
      throw new NotFoundException('Workflow execution not found');
    }

    if (execution.status !== 'completed') {
      throw new BadRequestException(
        `Cannot save output from ${execution.status} execution`,
      );
    }

    // Get final output from execution context
    const executionContext = execution.executionContext as any;
    const finalOutput = executionContext?.final_output || {};
    const content = finalOutput.content || '';

    if (!content) {
      throw new BadRequestException(
        'No content to save from workflow execution',
      );
    }

    // Create document
    const documentId = crypto.randomUUID();

    // Get workflow template name
    const [template] = await this.db
      .select()
      .from(workflowTemplates)
      .where(eq(workflowTemplates.id, execution.templateId))
      .limit(1);

    const workflowName = template?.name || 'Workflow';

    const [doc] = await this.db
      .insert(documents)
      .values({
        id: documentId,
        projectId,
        folderId,
        title: documentTitle || `Workflow Output - ${workflowName}`,
        content,
        status: 'draft',
        mediaType: 'text',
      })
      .returning();

    // Update execution with document link
    const generatedDocs = (execution.generatedDocumentIds as string[]) || [];
    generatedDocs.push(documentId);

    await this.db
      .update(workflowExecutions)
      .set({ generatedDocumentIds: generatedDocs })
      .where(eq(workflowExecutions.id, executionId));

    return {
      document_id: documentId,
      title: doc.title,
      created_at: doc.createdAt,
      message: 'Workflow output saved to project successfully',
    };
  }

  /**
   * List all documents generated by a workflow execution
   */
  async listGeneratedDocuments(projectId: string, executionId: string) {
    // Get execution
    const [execution] = await this.db
      .select()
      .from(workflowExecutions)
      .where(
        and(
          eq(workflowExecutions.id, executionId),
          eq(workflowExecutions.projectId, projectId),
        ),
      )
      .limit(1);

    if (!execution) {
      throw new NotFoundException('Workflow execution not found');
    }

    // Get generated documents
    const docIds = (execution.generatedDocumentIds as string[]) || [];

    if (docIds.length === 0) {
      return [];
    }

    const docs = await this.db
      .select({
        id: documents.id,
        title: documents.title,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        folderId: documents.folderId,
      })
      .from(documents)
      .where(inArray(documents.id, docIds));

    return docs.map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      created_at: doc.createdAt,
      updated_at: doc.updatedAt,
      folder_id: doc.folderId,
    }));
  }

  /**
   * Get workflow usage statistics for a project
   */
  async getWorkflowStats(projectId: string) {
    // Verify project exists
    const [project] = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Count executions by status
    const statusCounts = await this.db
      .select({
        status: workflowExecutions.status,
        count: sql<number>`count(*)::int`,
      })
      .from(workflowExecutions)
      .where(eq(workflowExecutions.projectId, projectId))
      .groupBy(workflowExecutions.status);

    // Count total tokens used
    const totalTokensResult = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${workflowExecutions.totalTokensUsed}), 0)::int`,
      })
      .from(workflowExecutions)
      .where(eq(workflowExecutions.projectId, projectId));

    const totalTokens = totalTokensResult[0]?.total || 0;

    // Count documents generated (this is a simplified count)
    const docCountResult = await this.db
      .select({
        count: sql<number>`count(DISTINCT ${documents.id})::int`,
      })
      .from(documents)
      .where(eq(documents.projectId, projectId));

    const docCount = docCountResult[0]?.count || 0;

    // Most used templates
    const templateUsage = await this.db
      .select({
        templateId: workflowExecutions.templateId,
        count: sql<number>`count(*)::int`,
      })
      .from(workflowExecutions)
      .where(eq(workflowExecutions.projectId, projectId))
      .groupBy(workflowExecutions.templateId)
      .orderBy(sql`count(*) desc`)
      .limit(5);

    // Enrich template usage with template names
    const enrichedTemplateUsage = [];
    for (const usage of templateUsage) {
      const [template] = await this.db
        .select({ name: workflowTemplates.name })
        .from(workflowTemplates)
        .where(eq(workflowTemplates.id, usage.templateId))
        .limit(1);

      enrichedTemplateUsage.push({
        template_id: usage.templateId,
        template_name: template?.name || 'Unknown',
        execution_count: usage.count,
      });
    }

    return {
      project_id: projectId,
      executions_by_status: statusCounts.reduce(
        (acc: Record<string, number>, { status, count }: { status: string; count: number }) => {
          acc[status] = count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      total_tokens_used: totalTokens,
      documents_generated: docCount,
      most_used_templates: enrichedTemplateUsage,
    };
  }
}
