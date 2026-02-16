import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module';
import {
  workflowTemplates,
  projects,
  workspaceUsers,
} from '../../database/drizzle/schema';

@Injectable()
export class WorkflowAccessGuard implements CanActivate {
  constructor(@Inject(DATABASE) private readonly db: any) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const templateId =
      request.params?.templateId || request.params?.template_id;

    if (!templateId) return true;

    const [template] = await this.db
      .select()
      .from(workflowTemplates)
      .where(eq(workflowTemplates.id, templateId))
      .limit(1);

    if (!template)
      throw new NotFoundException('Workflow template not found');

    if (template.projectId) {
      const [project] = await this.db
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, template.projectId), isNull(projects.deletedAt)),
        )
        .limit(1);

      if (!project) throw new NotFoundException('Project not found');

      const [membership] = await this.db
        .select()
        .from(workspaceUsers)
        .where(
          and(
            eq(workspaceUsers.workspaceId, project.workspaceId),
            eq(workspaceUsers.userId, user.id),
          ),
        )
        .limit(1);

      if (!membership)
        throw new ForbiddenException('Access denied to this workflow');
    }

    request.workflowTemplate = template;
    return true;
  }
}
