import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import * as crypto from 'crypto';
import { DATABASE } from '../../database/database.module';
import { BrevoService } from '../../integrations/brevo/brevo.service';
import {
  users,
  workspaces,
  workspaceUsers,
  workspaceInvites,
} from '../../database/drizzle/schema';

export interface InviteMemberDto {
  email: string;
  role?: string;
}

export interface InviteMemberResponse {
  success: boolean;
  message: string;
  userExists: boolean;
  inviteSent: boolean;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: string;
  invitedBy: string;
  createdAt: Date;
  expiresAt: Date;
  status: string;
}

/**
 * Workspaces Service - Workspace management.
 *
 * Ported from backend/routers/workspaces.py.
 */
@Injectable()
export class WorkspacesService {
  constructor(
    @Inject(DATABASE) private readonly db: any,
    private readonly brevoService: BrevoService,
  ) {}

  /**
   * Generate a secure random token for invitations.
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generate a secure temporary password.
   */
  private generateTempPassword(): string {
    return crypto.randomBytes(12).toString('base64url');
  }

  /**
   * Verify that the current user has admin/owner role in the workspace.
   */
  private async verifyWorkspaceAdmin(
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const [workspace] = await this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const [membership] = await this.db
      .select()
      .from(workspaceUsers)
      .where(
        and(
          eq(workspaceUsers.workspaceId, workspaceId),
          eq(workspaceUsers.userId, userId),
        ),
      )
      .limit(1);

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new ForbiddenException(
        'Only workspace owners and admins can invite members',
      );
    }
  }

  /**
   * Invite a member to workspace by email.
   *
   * If user exists: adds them directly and sends welcome email.
   * If user doesn't exist: creates invitation and sends invite email with signup link.
   */
  async inviteUser(
    workspaceId: string,
    data: InviteMemberDto,
    inviterId: string,
  ): Promise<InviteMemberResponse> {
    // Verify workspace and permissions
    await this.verifyWorkspaceAdmin(workspaceId, inviterId);

    const [workspace] = await this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    const [inviter] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, inviterId))
      .limit(1);

    const inviterName = inviter?.fullName || inviter?.email || 'Someone';

    // Check if user already exists
    const [existingUser] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existingUser) {
      // User exists - check if already a member
      const [existingMembership] = await this.db
        .select()
        .from(workspaceUsers)
        .where(
          and(
            eq(workspaceUsers.workspaceId, workspaceId),
            eq(workspaceUsers.userId, existingUser.id),
          ),
        )
        .limit(1);

      if (existingMembership) {
        throw new BadRequestException(
          'User is already a member of this workspace',
        );
      }

      // Add user to workspace
      await this.db.insert(workspaceUsers).values({
        workspaceId,
        userId: existingUser.id,
        role: data.role || 'member',
      });

      // Send welcome email
      await this.brevoService.sendWelcomeEmail(
        data.email,
        workspace.name,
        inviterName,
        existingUser.fullName,
      );

      return {
        success: true,
        message: `User ${data.email} added to workspace`,
        userExists: true,
        inviteSent: false,
      };
    } else {
      // User doesn't exist - check if already invited
      const [existingInvite] = await this.db
        .select()
        .from(workspaceInvites)
        .where(
          and(
            eq(workspaceInvites.workspaceId, workspaceId),
            eq(workspaceInvites.email, data.email),
            eq(workspaceInvites.status, 'pending'),
          ),
        )
        .limit(1);

      if (existingInvite) {
        // Update expiry and resend
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const tempPassword =
          existingInvite.tempPassword || this.generateTempPassword();

        await this.db
          .update(workspaceInvites)
          .set({
            expiresAt,
            createdAt: new Date(),
            tempPassword,
          })
          .where(eq(workspaceInvites.id, existingInvite.id));

        await this.brevoService.sendInviteEmail(
          data.email,
          inviterName,
          workspace.name,
          existingInvite.token,
          tempPassword,
        );

        return {
          success: true,
          message: `Invitation resent to ${data.email}`,
          userExists: false,
          inviteSent: true,
        };
      }

      // Create new invitation with temporary password
      const inviteToken = this.generateToken();
      const tempPassword = this.generateTempPassword();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Generate a unique ID (uuid_generate_v4()::text equivalent)
      const inviteId = crypto.randomUUID();

      await this.db.insert(workspaceInvites).values({
        id: inviteId,
        workspaceId,
        email: data.email,
        role: data.role || 'member',
        invitedById: inviterId,
        token: inviteToken,
        tempPassword,
        expiresAt,
        status: 'pending',
      });

      // Send invitation email
      await this.brevoService.sendInviteEmail(
        data.email,
        inviterName,
        workspace.name,
        inviteToken,
        tempPassword,
      );

      return {
        success: true,
        message: `Invitation sent to ${data.email}`,
        userExists: false,
        inviteSent: true,
      };
    }
  }

  /**
   * List pending workspace invitations.
   */
  async listInvites(
    workspaceId: string,
    userId: string,
    status?: string,
  ): Promise<PendingInvite[]> {
    // Verify workspace exists and user is member
    const [workspace] = await this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const [membership] = await this.db
      .select()
      .from(workspaceUsers)
      .where(
        and(
          eq(workspaceUsers.workspaceId, workspaceId),
          eq(workspaceUsers.userId, userId),
        ),
      )
      .limit(1);

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    // Get pending invites
    const conditions = [eq(workspaceInvites.workspaceId, workspaceId)];
    if (status) {
      conditions.push(eq(workspaceInvites.status, status));
    } else {
      conditions.push(eq(workspaceInvites.status, 'pending'));
    }

    const invites = await this.db
      .select()
      .from(workspaceInvites)
      .where(and(...conditions));

    // Fetch inviter info for each invite
    const result: PendingInvite[] = [];
    for (const invite of invites) {
      const [inviter] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, invite.invitedById))
        .limit(1);

      result.push({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        invitedBy: inviter?.fullName || inviter?.email || 'Unknown',
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
        status: invite.status,
      });
    }

    return result;
  }

  /**
   * Cancel a pending workspace invitation.
   */
  async cancelInvite(
    workspaceId: string,
    inviteId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    // Verify workspace and permissions
    await this.verifyWorkspaceAdmin(workspaceId, userId);

    // Find the invitation
    const [invite] = await this.db
      .select()
      .from(workspaceInvites)
      .where(
        and(
          eq(workspaceInvites.id, inviteId),
          eq(workspaceInvites.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (!invite) {
      throw new NotFoundException('Invitation not found');
    }

    // Delete the invitation
    await this.db
      .delete(workspaceInvites)
      .where(eq(workspaceInvites.id, inviteId));

    return {
      success: true,
      message: 'Invitation cancelled successfully',
    };
  }
}
