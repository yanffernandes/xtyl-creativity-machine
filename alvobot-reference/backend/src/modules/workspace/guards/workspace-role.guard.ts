import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { WorkspaceService } from "../workspace.service";
import { WorkspaceRole } from "../interfaces/workspace.interface";

export const WORKSPACE_ROLES_KEY = "workspace_roles";

/**
 * Guard that checks if user has required role in workspace
 *
 * Usage:
 * @UseGuards(WorkspaceRoleGuard)
 * @WorkspaceRoles('owner', 'admin')
 * @Patch(':id')
 * async updateWorkspace() { ... }
 */
@Injectable()
export class WorkspaceRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private workspaceService: WorkspaceService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(
      WORKSPACE_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles specified, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;
    const workspaceId = request.params?.id || request.params?.workspaceId;

    if (!userId) {
      throw new ForbiddenException("Usuário não autenticado");
    }

    if (!workspaceId) {
      throw new ForbiddenException("Workspace não especificado");
    }

    // Check user's role in workspace
    const userRole = await this.workspaceService.getUserRole(
      workspaceId,
      userId,
    );

    if (!userRole) {
      throw new ForbiddenException("Acesso negado ao workspace");
    }

    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException("Permissão insuficiente");
    }

    // Attach workspace role to request for later use
    request.workspaceRole = userRole;

    return true;
  }
}
