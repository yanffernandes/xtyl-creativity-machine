import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module';
import { projects, workspaceUsers } from '../../database/drizzle/schema';

@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(@Inject(DATABASE) private readonly db: any) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const projectId =
      request.params?.projectId ||
      request.params?.project_id ||
      request.body?.projectId;

    if (!projectId) return true;

    const [project] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
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
      throw new ForbiddenException('Access denied to this project');

    request.project = project;
    return true;
  }
}
