import { SetMetadata } from "@nestjs/common";
import { WorkspaceRole } from "../interfaces/workspace.interface";
import { WORKSPACE_ROLES_KEY } from "../guards/workspace-role.guard";

/**
 * Decorator to specify required workspace roles for an endpoint
 *
 * Usage:
 * @WorkspaceRoles('owner', 'admin')
 * @Patch(':id')
 * async updateWorkspace() { ... }
 */
export const WorkspaceRoles = (...roles: WorkspaceRole[]) =>
  SetMetadata(WORKSPACE_ROLES_KEY, roles);
