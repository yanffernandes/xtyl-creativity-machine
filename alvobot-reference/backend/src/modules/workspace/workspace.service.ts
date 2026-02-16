import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
  WorkspaceRole,
  WorkspaceWithMembership,
} from "./interfaces/workspace.interface";
import { CreateWorkspaceDto } from "./dto/create-workspace.dto";
import { UpdateWorkspaceDto } from "./dto/update-workspace.dto";
import { InviteMemberDto } from "./dto/invite-member.dto";
import { UpdateMemberDto } from "./dto/update-member.dto";
import { EmailService } from "../email/email.service";

@Injectable()
export class WorkspaceService {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(WorkspaceService.name);
  private readonly frontendUrl: string;

  constructor(
    private configService: ConfigService,
    private emailService: EmailService,
  ) {
    const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
    const supabaseServiceKey = this.configService.get<string>(
      "SUPABASE_SERVICE_KEY",
    );

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    this.frontendUrl = this.configService.get<string>("FRONTEND_URL");
  }

  // ===========================
  // WORKSPACE CRUD
  // ===========================

  /**
   * List all workspaces where user is a member
   */
  async listWorkspaces(userId: string): Promise<WorkspaceWithMembership[]> {
    this.logger.log(`Listing workspaces for user ${userId}`);

    const { data, error } = await this.supabase
      .from("workspace_members")
      .select(
        `
        role,
        status,
        workspace:workspaces (
          id,
          name,
          slug,
          description,
          logo_url,
          settings,
          max_projects,
          max_members,
          owner_user_id,
          created_at,
          updated_at,
          deleted_at
        )
      `,
      )
      .eq("user_id", userId)
      .eq("status", "active");

    if (error) {
      this.logger.error(`Failed to list workspaces: ${error.message}`);
      throw new BadRequestException("Falha ao listar workspaces");
    }

    // Transform data to include membership info
    // Filter out null workspaces and deleted workspaces
    return (data || [])
      .filter((item) => item.workspace && !(item.workspace as any).deleted_at)
      .map((item) => ({
        ...(item.workspace as unknown as Workspace),
        membership: {
          role: item.role as WorkspaceRole,
          status: item.status,
        },
      }));
  }

  /**
   * Get workspace by ID (with membership check)
   */
  async getWorkspace(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceWithMembership> {
    this.logger.log(`Getting workspace ${workspaceId} for user ${userId}`);

    // Get workspace with user's membership
    const { data: membership, error: memberError } = await this.supabase
      .from("workspace_members")
      .select(
        `
        role,
        status,
        workspace:workspaces (*)
      `,
      )
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (memberError || !membership?.workspace) {
      throw new NotFoundException("Workspace não encontrado ou acesso negado");
    }

    const workspace = membership.workspace as unknown as Workspace;
    if (workspace.deleted_at) {
      throw new NotFoundException("Workspace foi excluído");
    }

    return {
      ...workspace,
      membership: {
        role: membership.role as WorkspaceRole,
        status: membership.status,
      },
    };
  }

  /**
   * Create a new workspace
   */
  async createWorkspace(
    userId: string,
    dto: CreateWorkspaceDto,
  ): Promise<Workspace> {
    this.logger.log(`Creating workspace for user ${userId}`);

    // Generate slug if not provided
    const slug = dto.slug || this.generateSlug(dto.name, userId);

    // Check if slug is already taken
    const { data: existing } = await this.supabase
      .from("workspaces")
      .select("id")
      .eq("slug", slug)
      .is("deleted_at", null)
      .single();

    if (existing) {
      throw new BadRequestException("Este slug já está em uso");
    }

    // Create workspace
    const { data: workspace, error: createError } = await this.supabase
      .from("workspaces")
      .insert({
        name: dto.name,
        slug,
        description: dto.description || null,
        owner_user_id: userId,
      })
      .select()
      .single();

    if (createError) {
      this.logger.error(`Failed to create workspace: ${createError.message}`);
      throw new BadRequestException("Falha ao criar workspace");
    }

    // Add owner as member
    const { error: memberError } = await this.supabase
      .from("workspace_members")
      .insert({
        workspace_id: workspace.id,
        user_id: userId,
        role: "owner",
        status: "active",
        accepted_at: new Date().toISOString(),
      });

    if (memberError) {
      this.logger.error(
        `Failed to add owner as member: ${memberError.message}`,
      );
      // Rollback workspace creation
      await this.supabase.from("workspaces").delete().eq("id", workspace.id);
      throw new BadRequestException("Falha ao criar workspace");
    }

    this.logger.log(`Created workspace ${workspace.id}`);
    return workspace;
  }

  /**
   * Update workspace (owner/admin only)
   */
  async updateWorkspace(
    workspaceId: string,
    userId: string,
    dto: UpdateWorkspaceDto,
  ): Promise<Workspace> {
    this.logger.log(`Updating workspace ${workspaceId}`);

    // Check permission
    await this.requireRole(workspaceId, userId, ["owner", "admin"]);

    // Check slug uniqueness if being changed
    if (dto.slug) {
      const { data: existing } = await this.supabase
        .from("workspaces")
        .select("id")
        .eq("slug", dto.slug)
        .neq("id", workspaceId)
        .is("deleted_at", null)
        .single();

      if (existing) {
        throw new BadRequestException("Este slug já está em uso");
      }
    }

    const { data: workspace, error } = await this.supabase
      .from("workspaces")
      .update({
        ...(dto.name && { name: dto.name }),
        ...(dto.slug && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.logo_url !== undefined && { logo_url: dto.logo_url }),
        ...(dto.settings && { settings: dto.settings }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", workspaceId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update workspace: ${error.message}`);
      throw new BadRequestException("Falha ao atualizar workspace");
    }

    return workspace;
  }

  /**
   * Soft delete workspace (owner only)
   */
  async deleteWorkspace(workspaceId: string, userId: string): Promise<void> {
    this.logger.log(`Deleting workspace ${workspaceId}`);

    // Only owner can delete
    await this.requireRole(workspaceId, userId, ["owner"]);

    const { error } = await this.supabase
      .from("workspaces")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", workspaceId)
      .is("deleted_at", null);

    if (error) {
      this.logger.error(`Failed to delete workspace: ${error.message}`);
      throw new BadRequestException("Falha ao excluir workspace");
    }
  }

  // ===========================
  // MEMBER MANAGEMENT
  // ===========================

  /**
   * List members of a workspace
   */
  async listMembers(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember[]> {
    this.logger.log(`Listing members of workspace ${workspaceId}`);

    // Verify user has access to workspace
    await this.requireRole(workspaceId, userId, [
      "owner",
      "admin",
      "member",
      "viewer",
    ]);

    const { data, error } = await this.supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", workspaceId)
      .neq("status", "left");

    if (error) {
      this.logger.error(`Failed to list members: ${error.message}`);
      throw new BadRequestException("Falha ao listar membros");
    }

    // Fetch user details for each member
    const membersWithUsers = await Promise.all(
      (data || []).map(async (member) => {
        const { data: user } = await this.supabase.auth.admin.getUserById(
          member.user_id,
        );
        return {
          ...member,
          user: user?.user
            ? {
                id: user.user.id,
                email: user.user.email,
                raw_user_meta_data: user.user.user_metadata,
              }
            : null,
        };
      }),
    );

    return membersWithUsers;
  }

  /**
   * Invite a new member to workspace
   */
  async inviteMember(
    workspaceId: string,
    userId: string,
    dto: InviteMemberDto,
  ): Promise<WorkspaceInvitation> {
    this.logger.log(`Inviting ${dto.email} to workspace ${workspaceId}`);

    // Only owner/admin can invite
    await this.requireRole(workspaceId, userId, ["owner", "admin"]);

    // Check if user is already a member
    const { data: existingMember } = await this.supabase
      .from("workspace_members")
      .select("id, status")
      .eq("workspace_id", workspaceId)
      .eq(
        "user_id",
        (
          await this.supabase
            .from("auth.users")
            .select("id")
            .eq("email", dto.email)
            .single()
        ).data?.id,
      )
      .single();

    if (existingMember && existingMember.status === "active") {
      throw new BadRequestException("Usuário já é membro deste workspace");
    }

    // Check if there's already a pending invitation
    const { data: existingInvitation } = await this.supabase
      .from("workspace_invitations")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("email", dto.email)
      .eq("status", "pending")
      .single();

    if (existingInvitation) {
      throw new BadRequestException(
        "Já existe um convite pendente para este email",
      );
    }

    // Check member limit
    const workspace = await this.getWorkspaceById(workspaceId);
    const { count } = await this.supabase
      .from("workspace_members")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "active");

    if (count && count >= workspace.max_members) {
      throw new BadRequestException(
        `Limite de membros atingido (${workspace.max_members})`,
      );
    }

    // Create invitation
    const { data: invitation, error } = await this.supabase
      .from("workspace_invitations")
      .insert({
        workspace_id: workspaceId,
        email: dto.email,
        role: dto.role,
        invited_by: userId,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create invitation: ${error.message}`);
      throw new BadRequestException("Falha ao criar convite");
    }

    // Get inviter info and workspace name for email
    const { data: inviter } =
      await this.supabase.auth.admin.getUserById(userId);
    const inviterName =
      inviter?.user?.user_metadata?.name ||
      inviter?.user?.email ||
      "Um usuário";

    // Send invitation email
    const inviteLink = `${this.frontendUrl}/workspace/invitations/${invitation.token}`;
    const expiresAt = new Date(invitation.expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    await this.emailService.sendWorkspaceInvitation({
      inviteeEmail: dto.email,
      inviterName,
      workspaceName: workspace.name,
      role: dto.role,
      inviteLink,
      expiresIn: `${daysUntilExpiry} dias`,
    });

    this.logger.log(
      `Invitation created and email sent. Invite link: ${inviteLink}`,
    );

    return invitation;
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(
    token: string,
    userId: string,
  ): Promise<WorkspaceMember> {
    this.logger.log(
      `Accepting invitation with token ${token.substring(0, 8)}...`,
    );

    // Get invitation
    const { data: invitation, error: invError } = await this.supabase
      .from("workspace_invitations")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (invError || !invitation) {
      throw new NotFoundException("Convite não encontrado ou já utilizado");
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      await this.supabase
        .from("workspace_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);
      throw new BadRequestException("Convite expirado");
    }

    // Get user email
    const { data: user } = await this.supabase.auth.admin.getUserById(userId);
    if (!user?.user?.email) {
      throw new BadRequestException("Usuário não encontrado");
    }

    // Verify email matches
    if (user.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException("Este convite é para outro email");
    }

    // Create membership
    const { data: member, error: memberError } = await this.supabase
      .from("workspace_members")
      .insert({
        workspace_id: invitation.workspace_id,
        user_id: userId,
        role: invitation.role,
        status: "active",
        invited_by: invitation.invited_by,
        accepted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (memberError) {
      this.logger.error(`Failed to create member: ${memberError.message}`);
      throw new BadRequestException("Falha ao aceitar convite");
    }

    // Update invitation status
    await this.supabase
      .from("workspace_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    return member;
  }

  /**
   * Update member role/permissions
   */
  async updateMember(
    workspaceId: string,
    targetUserId: string,
    userId: string,
    dto: UpdateMemberDto,
  ): Promise<WorkspaceMember> {
    this.logger.log(
      `Updating member ${targetUserId} in workspace ${workspaceId}`,
    );

    // Only owner/admin can update members
    const userMembership = await this.requireRole(workspaceId, userId, [
      "owner",
      "admin",
    ]);

    // Get target member
    const { data: targetMember, error: targetError } = await this.supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("user_id", targetUserId)
      .single();

    if (targetError || !targetMember) {
      throw new NotFoundException("Membro não encontrado");
    }

    // Can't modify owner
    if (targetMember.role === "owner") {
      throw new ForbiddenException("Não é possível alterar o owner");
    }

    // Admin can't modify other admins
    if (userMembership.role === "admin" && targetMember.role === "admin") {
      throw new ForbiddenException("Admin não pode alterar outro admin");
    }

    const { data: updated, error } = await this.supabase
      .from("workspace_members")
      .update({
        ...(dto.role && { role: dto.role }),
        ...(dto.permissions && { permissions: dto.permissions }),
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId)
      .eq("user_id", targetUserId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update member: ${error.message}`);
      throw new BadRequestException("Falha ao atualizar membro");
    }

    return updated;
  }

  /**
   * Remove member from workspace
   */
  async removeMember(
    workspaceId: string,
    targetUserId: string,
    userId: string,
  ): Promise<void> {
    this.logger.log(
      `Removing member ${targetUserId} from workspace ${workspaceId}`,
    );

    // Only owner/admin can remove members (or self)
    if (targetUserId !== userId) {
      const userMembership = await this.requireRole(workspaceId, userId, [
        "owner",
        "admin",
      ]);

      // Get target member
      const { data: targetMember } = await this.supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", targetUserId)
        .single();

      if (!targetMember) {
        throw new NotFoundException("Membro não encontrado");
      }

      // Can't remove owner
      if (targetMember.role === "owner") {
        throw new ForbiddenException("Não é possível remover o owner");
      }

      // Admin can't remove other admins
      if (userMembership.role === "admin" && targetMember.role === "admin") {
        throw new ForbiddenException("Admin não pode remover outro admin");
      }
    } else {
      // User removing themselves
      const { data: selfMember } = await this.supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .single();

      if (selfMember?.role === "owner") {
        throw new ForbiddenException("Owner não pode sair do workspace");
      }
    }

    const { error } = await this.supabase
      .from("workspace_members")
      .update({ status: "left", updated_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId)
      .eq("user_id", targetUserId);

    if (error) {
      this.logger.error(`Failed to remove member: ${error.message}`);
      throw new BadRequestException("Falha ao remover membro");
    }
  }

  // ===========================
  // INVITATION MANAGEMENT
  // ===========================

  /**
   * List pending invitations for a workspace
   */
  async listInvitations(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceInvitation[]> {
    this.logger.log(`Listing invitations for workspace ${workspaceId}`);

    // Only owner/admin can list invitations
    await this.requireRole(workspaceId, userId, ["owner", "admin"]);

    const { data, error } = await this.supabase
      .from("workspace_invitations")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      this.logger.error(`Failed to list invitations: ${error.message}`);
      throw new BadRequestException("Falha ao listar convites");
    }

    // Fetch inviter details and mark expired invitations
    const now = new Date();
    const invitationsWithInviters = await Promise.all(
      (data || []).map(async (inv) => {
        const { data: inviter } = await this.supabase.auth.admin.getUserById(
          inv.invited_by,
        );
        const invitation = {
          ...inv,
          inviter: inviter?.user
            ? {
                id: inviter.user.id,
                email: inviter.user.email,
                raw_user_meta_data: inviter.user.user_metadata,
              }
            : null,
        };

        // Mark expired invitations
        if (
          invitation.status === "pending" &&
          new Date(invitation.expires_at) < now
        ) {
          return { ...invitation, status: "expired" };
        }
        return invitation;
      }),
    );

    return invitationsWithInviters;
  }

  /**
   * Resend an invitation email
   */
  async resendInvitation(
    workspaceId: string,
    invitationId: string,
    userId: string,
  ): Promise<WorkspaceInvitation> {
    this.logger.log(`Resending invitation ${invitationId}`);

    // Only owner/admin can resend invitations
    await this.requireRole(workspaceId, userId, ["owner", "admin"]);

    // Get the invitation
    const { data: invitation, error: invError } = await this.supabase
      .from("workspace_invitations")
      .select("*")
      .eq("id", invitationId)
      .eq("workspace_id", workspaceId)
      .single();

    if (invError || !invitation) {
      throw new NotFoundException("Convite não encontrado");
    }

    if (invitation.status === "accepted") {
      throw new BadRequestException("Convite já foi aceito");
    }

    // Generate new token and extend expiration
    const { data: updatedInvitation, error: updateError } = await this.supabase
      .from("workspace_invitations")
      .update({
        status: "pending",
        expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 7 days
      })
      .eq("id", invitationId)
      .select()
      .single();

    if (updateError) {
      this.logger.error(`Failed to update invitation: ${updateError.message}`);
      throw new BadRequestException("Falha ao atualizar convite");
    }

    // Get workspace and inviter info for email
    const workspace = await this.getWorkspaceById(workspaceId);
    const { data: inviter } =
      await this.supabase.auth.admin.getUserById(userId);
    const inviterName =
      inviter?.user?.user_metadata?.name ||
      inviter?.user?.email ||
      "Um usuário";

    // Send invitation email
    const inviteLink = `${this.frontendUrl}/workspace/invitations/${updatedInvitation.token}`;

    await this.emailService.sendWorkspaceInvitation({
      inviteeEmail: updatedInvitation.email,
      inviterName,
      workspaceName: workspace.name,
      role: updatedInvitation.role,
      inviteLink,
      expiresIn: "7 dias",
    });

    this.logger.log(`Invitation resent to ${updatedInvitation.email}`);

    return updatedInvitation;
  }

  /**
   * Cancel a pending invitation
   */
  async cancelInvitation(
    workspaceId: string,
    invitationId: string,
    userId: string,
  ): Promise<void> {
    this.logger.log(`Canceling invitation ${invitationId}`);

    // Only owner/admin can cancel invitations
    await this.requireRole(workspaceId, userId, ["owner", "admin"]);

    // Get the invitation
    const { data: invitation, error: invError } = await this.supabase
      .from("workspace_invitations")
      .select("status")
      .eq("id", invitationId)
      .eq("workspace_id", workspaceId)
      .single();

    if (invError || !invitation) {
      throw new NotFoundException("Convite não encontrado");
    }

    if (invitation.status === "accepted") {
      throw new BadRequestException(
        "Não é possível cancelar um convite já aceito",
      );
    }

    // Delete the invitation
    const { error } = await this.supabase
      .from("workspace_invitations")
      .delete()
      .eq("id", invitationId);

    if (error) {
      this.logger.error(`Failed to cancel invitation: ${error.message}`);
      throw new BadRequestException("Falha ao cancelar convite");
    }

    this.logger.log(`Invitation ${invitationId} canceled`);
  }

  /**
   * Get invitation details by token (public - for accept page)
   */
  async getInvitationByToken(token: string): Promise<{
    invitation: WorkspaceInvitation;
    workspace: { name: string; slug: string };
    inviter: { name: string; email: string };
  }> {
    this.logger.log(`Getting invitation by token ${token.substring(0, 8)}...`);

    const { data: invitation, error } = await this.supabase
      .from("workspace_invitations")
      .select(
        `
        *,
        workspace:workspaces (
          id,
          name,
          slug
        )
      `,
      )
      .eq("token", token)
      .single();

    if (error || !invitation) {
      throw new NotFoundException("Convite não encontrado");
    }

    // Check if expired
    if (
      invitation.status === "pending" &&
      new Date(invitation.expires_at) < new Date()
    ) {
      // Mark as expired
      await this.supabase
        .from("workspace_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);
      invitation.status = "expired";
    }

    // Get inviter info
    const { data: inviter } = await this.supabase.auth.admin.getUserById(
      invitation.invited_by,
    );

    return {
      invitation: {
        ...invitation,
        workspace: undefined, // Remove from invitation object
      },
      workspace: invitation.workspace as { name: string; slug: string },
      inviter: {
        name:
          inviter?.user?.user_metadata?.name ||
          inviter?.user?.email?.split("@")[0] ||
          "Usuário",
        email: inviter?.user?.email || "",
      },
    };
  }

  // ===========================
  // HELPER METHODS
  // ===========================

  /**
   * Get workspace by ID (internal use)
   */
  private async getWorkspaceById(workspaceId: string): Promise<Workspace> {
    const { data, error } = await this.supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      throw new NotFoundException("Workspace não encontrado");
    }

    return data;
  }

  /**
   * Check if user has required role in workspace
   */
  async requireRole(
    workspaceId: string,
    userId: string,
    allowedRoles: WorkspaceRole[],
  ): Promise<WorkspaceMember> {
    const { data: membership, error } = await this.supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (error || !membership) {
      throw new ForbiddenException("Acesso negado ao workspace");
    }

    if (!allowedRoles.includes(membership.role as WorkspaceRole)) {
      throw new ForbiddenException("Permissão insuficiente");
    }

    return membership;
  }

  /**
   * Get user's role in a workspace
   */
  async getUserRole(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceRole | null> {
    const { data } = await this.supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    return data?.role as WorkspaceRole | null;
  }

  /**
   * Generate URL-friendly slug from name
   */
  private generateSlug(name: string, userId: string): string {
    const baseSlug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const suffix = userId.substring(0, 8);
    return `${baseSlug}-${suffix}`;
  }

  /**
   * Get or create default workspace for user (auto-creation)
   */
  async getOrCreateDefaultWorkspace(userId: string): Promise<Workspace> {
    // Check if user already has a workspace
    const workspaces = await this.listWorkspaces(userId);
    if (workspaces.length > 0) {
      return workspaces[0];
    }

    // Get user info
    const { data: user } = await this.supabase.auth.admin.getUserById(userId);
    const userName =
      user?.user?.user_metadata?.name || user?.user?.email || "Meu Workspace";

    // Create default workspace
    return this.createWorkspace(userId, {
      name: userName,
      description: "Workspace criado automaticamente",
    });
  }
}
