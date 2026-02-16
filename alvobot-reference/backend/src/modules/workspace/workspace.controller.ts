import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { WorkspaceService } from "./workspace.service";
import { CreateWorkspaceDto } from "./dto/create-workspace.dto";
import { UpdateWorkspaceDto } from "./dto/update-workspace.dto";
import { InviteMemberDto } from "./dto/invite-member.dto";
import { UpdateMemberDto } from "./dto/update-member.dto";

@Controller("workspaces")
@UseGuards(AuthGuard("jwt"))
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  // ===========================
  // STATIC ROUTES (must come before :id routes)
  // ===========================

  /**
   * GET /workspaces/default
   * Get or create the default workspace for the user
   */
  @Get("default")
  async getDefaultWorkspace(@Request() req) {
    const userId = req.user.sub;
    const workspace =
      await this.workspaceService.getOrCreateDefaultWorkspace(userId);
    return { workspace };
  }

  /**
   * GET /workspaces/invitations/:token
   * Get invitation details by token (public - for accept page)
   * NOTE: This must come before :id routes to avoid conflict
   */
  @Get("invitations/:token")
  async getInvitationByToken(@Param("token") token: string) {
    const data = await this.workspaceService.getInvitationByToken(token);
    return data;
  }

  /**
   * POST /workspaces/invitations/:token/accept
   * Accept an invitation
   * NOTE: This must come before :id routes to avoid conflict
   */
  @Post("invitations/:token/accept")
  async acceptInvitation(@Request() req, @Param("token") token: string) {
    const userId = req.user.sub;
    const member = await this.workspaceService.acceptInvitation(token, userId);
    return { member };
  }

  // ===========================
  // WORKSPACE CRUD
  // ===========================

  /**
   * GET /workspaces
   * List all workspaces where user is a member
   */
  @Get()
  async listWorkspaces(@Request() req) {
    const userId = req.user.sub;
    const workspaces = await this.workspaceService.listWorkspaces(userId);
    return { workspaces };
  }

  /**
   * POST /workspaces
   * Create a new workspace
   */
  @Post()
  async createWorkspace(@Request() req, @Body() dto: CreateWorkspaceDto) {
    const userId = req.user.sub;
    const workspace = await this.workspaceService.createWorkspace(userId, dto);
    return { workspace };
  }

  /**
   * GET /workspaces/:id
   * Get workspace details
   */
  @Get(":id")
  async getWorkspace(@Request() req, @Param("id") workspaceId: string) {
    const userId = req.user.sub;
    const workspace = await this.workspaceService.getWorkspace(
      workspaceId,
      userId,
    );
    return { workspace };
  }

  /**
   * PATCH /workspaces/:id
   * Update workspace (owner/admin only)
   */
  @Patch(":id")
  async updateWorkspace(
    @Request() req,
    @Param("id") workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    const userId = req.user.sub;
    const workspace = await this.workspaceService.updateWorkspace(
      workspaceId,
      userId,
      dto,
    );
    return { workspace };
  }

  /**
   * DELETE /workspaces/:id
   * Soft delete workspace (owner only)
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWorkspace(@Request() req, @Param("id") workspaceId: string) {
    const userId = req.user.sub;
    await this.workspaceService.deleteWorkspace(workspaceId, userId);
  }

  // ===========================
  // MEMBER MANAGEMENT
  // ===========================

  /**
   * GET /workspaces/:id/members
   * List members of a workspace
   */
  @Get(":id/members")
  async listMembers(@Request() req, @Param("id") workspaceId: string) {
    const userId = req.user.sub;
    const members = await this.workspaceService.listMembers(
      workspaceId,
      userId,
    );
    return { members };
  }

  /**
   * POST /workspaces/:id/members/invite
   * Invite a new member (owner/admin only)
   */
  @Post(":id/members/invite")
  async inviteMember(
    @Request() req,
    @Param("id") workspaceId: string,
    @Body() dto: InviteMemberDto,
  ) {
    const userId = req.user.sub;
    const invitation = await this.workspaceService.inviteMember(
      workspaceId,
      userId,
      dto,
    );
    return { invitation };
  }

  /**
   * PATCH /workspaces/:id/members/:userId
   * Update member role/permissions (owner/admin only)
   */
  @Patch(":id/members/:userId")
  async updateMember(
    @Request() req,
    @Param("id") workspaceId: string,
    @Param("userId") targetUserId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    const userId = req.user.sub;
    const member = await this.workspaceService.updateMember(
      workspaceId,
      targetUserId,
      userId,
      dto,
    );
    return { member };
  }

  /**
   * DELETE /workspaces/:id/members/:userId
   * Remove member from workspace (owner/admin only, or self)
   */
  @Delete(":id/members/:userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Request() req,
    @Param("id") workspaceId: string,
    @Param("userId") targetUserId: string,
  ) {
    const userId = req.user.sub;
    await this.workspaceService.removeMember(workspaceId, targetUserId, userId);
  }

  // ===========================
  // INVITATIONS
  // ===========================

  /**
   * GET /workspaces/:id/invitations
   * List all invitations for a workspace (owner/admin only)
   */
  @Get(":id/invitations")
  async listInvitations(@Request() req, @Param("id") workspaceId: string) {
    const userId = req.user.sub;
    const invitations = await this.workspaceService.listInvitations(
      workspaceId,
      userId,
    );
    return { invitations };
  }

  /**
   * POST /workspaces/:id/invitations/:invitationId/resend
   * Resend an invitation email (owner/admin only)
   */
  @Post(":id/invitations/:invitationId/resend")
  async resendInvitation(
    @Request() req,
    @Param("id") workspaceId: string,
    @Param("invitationId") invitationId: string,
  ) {
    const userId = req.user.sub;
    const invitation = await this.workspaceService.resendInvitation(
      workspaceId,
      invitationId,
      userId,
    );
    return { invitation };
  }

  /**
   * DELETE /workspaces/:id/invitations/:invitationId
   * Cancel a pending invitation (owner/admin only)
   */
  @Delete(":id/invitations/:invitationId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelInvitation(
    @Request() req,
    @Param("id") workspaceId: string,
    @Param("invitationId") invitationId: string,
  ) {
    const userId = req.user.sub;
    await this.workspaceService.cancelInvitation(
      workspaceId,
      invitationId,
      userId,
    );
  }
}
