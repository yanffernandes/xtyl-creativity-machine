import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Workspaces Controller - Workspace management endpoints.
 *
 * Ported from backend/routers/workspaces.py.
 */
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  /**
   * POST /workspaces/:workspaceId/members
   * Invite a member to workspace by email.
   */
  @Post(':workspaceId/members')
  async inviteWorkspaceMember(
    @Param('workspaceId') workspaceId: string,
    @Body() data: { email: string; role?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.workspacesService.inviteUser(workspaceId, data, userId);
  }

  /**
   * GET /workspaces/:workspaceId/invites
   * List pending workspace invitations.
   */
  @Get(':workspaceId/invites')
  async listPendingInvites(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
  ) {
    return this.workspacesService.listInvites(workspaceId, userId, status);
  }

  /**
   * DELETE /workspaces/:workspaceId/invites/:inviteId
   * Cancel a pending workspace invitation.
   */
  @Delete(':workspaceId/invites/:inviteId')
  async cancelWorkspaceInvite(
    @Param('workspaceId') workspaceId: string,
    @Param('inviteId') inviteId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workspacesService.cancelInvite(workspaceId, inviteId, userId);
  }
}
