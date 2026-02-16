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
  documents,
  projects,
  workspaceUsers,
} from '../../database/drizzle/schema';

@Injectable()
export class DocumentAccessGuard implements CanActivate {
  constructor(@Inject(DATABASE) private readonly db: any) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const documentId =
      request.params?.documentId || request.params?.document_id;

    if (!documentId) return true;

    const [document] = await this.db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
      .limit(1);

    if (!document) throw new NotFoundException('Document not found');

    if (document.projectId) {
      const [project] = await this.db
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, document.projectId), isNull(projects.deletedAt)),
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
        throw new ForbiddenException('Access denied to this document');
    }

    request.document = document;
    return true;
  }
}
