import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import axios from 'axios';
import { DATABASE } from '../../database/database.module';
import {
  users,
  workspaceInvites,
  workspaceUsers,
  workspaces,
} from '../../database/drizzle/schema';

/**
 * Simple Supabase admin client using axios to avoid package conflicts.
 * Ported from backend/routers/auth.py.
 */
class SupabaseAdminClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(url: string, serviceKey: string) {
    this.baseUrl = url.replace(/\/$/, '');
    this.headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    };
  }

  async getUser(userId: string): Promise<any | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/auth/v1/admin/users/${userId}`,
        { headers: this.headers },
      );
      return response.data;
    } catch {
      return null;
    }
  }

  async updateUser(userId: string, data: any): Promise<any> {
    const response = await axios.put(
      `${this.baseUrl}/auth/v1/admin/users/${userId}`,
      data,
      { headers: this.headers },
    );
    return response.data;
  }

  async createUser(data: any): Promise<any> {
    const response = await axios.post(
      `${this.baseUrl}/auth/v1/admin/users`,
      data,
      { headers: this.headers },
    );
    return response.data;
  }
}

export interface UserProfileDto {
  id: string;
  email: string;
  fullName?: string;
  isSuperAdmin: boolean;
}

export interface UpdateProfileDto {
  fullName?: string;
  avatarUrl?: string;
}

export interface PasswordResetConfirmDto {
  token: string;
  newPassword: string;
}

export interface SignupWithInviteDto {
  email: string;
  password: string;
  fullName: string;
  inviteToken: string;
}

export interface ValidateInviteResponse {
  valid: boolean;
  email?: string;
  workspaceName?: string;
  invitedBy?: string;
  expiresAt?: Date;
  message?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private supabaseAdmin: SupabaseAdminClient | null = null;

  constructor(@Inject(DATABASE) private readonly db: any) {
    const supabaseUrl =
      process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      this.logger.warn('Supabase admin credentials not configured');
    } else {
      this.supabaseAdmin = new SupabaseAdminClient(supabaseUrl, serviceKey);
    }
  }

  /**
   * Get current user profile with workspace info.
   */
  async getProfile(userId: string): Promise<UserProfileDto> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName ?? undefined,
      isSuperAdmin: user.isSuperAdmin ?? false,
    };
  }

  /**
   * Update user profile (full_name, avatar_url).
   */
  async updateProfile(
    userId: string,
    data: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    const updateData: any = {};
    if (data.fullName !== undefined) {
      updateData.fullName = data.fullName;
    }
    // Note: avatarUrl is not in the schema yet, but keeping it for future compatibility
    // if (data.avatarUrl !== undefined) {
    //   updateData.avatarUrl = data.avatarUrl;
    // }

    await this.db.update(users).set(updateData).where(eq(users.id, userId));

    return this.getProfile(userId);
  }

  /**
   * Confirm password reset using Supabase recovery token.
   * Ported from backend/routers/auth.py.
   */
  async confirmPasswordReset(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!this.supabaseAdmin) {
      throw new BadRequestException('Supabase configuration missing');
    }

    if (newPassword.length < 6) {
      throw new BadRequestException(
        'A senha deve ter pelo menos 6 caracteres',
      );
    }

    try {
      // The token is a user ID from the recovery flow
      const userData = await this.supabaseAdmin.getUser(token);

      if (!userData) {
        throw new BadRequestException('Token inválido ou expirado');
      }

      const userId = userData.id || token;

      // Update the user's password using admin API
      await this.supabaseAdmin.updateUser(userId, { password: newPassword });

      return {
        success: true,
        message: 'Senha alterada com sucesso',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Password reset error: ${error}`);
      throw new BadRequestException('Token inválido ou expirado');
    }
  }

  /**
   * Complete signup with workspace invitation.
   * Ported from backend/routers/auth.py.
   */
  async completeInviteSignup(
    data: SignupWithInviteDto,
  ): Promise<{
    success: boolean;
    message: string;
    userId?: string;
    workspaceId?: string;
    workspaceName?: string;
  }> {
    if (!this.supabaseAdmin) {
      throw new BadRequestException('Supabase configuration missing');
    }

    if (data.password.length < 6) {
      throw new BadRequestException(
        'A senha deve ter pelo menos 6 caracteres',
      );
    }

    // Find the invitation
    const [invite] = await this.db
      .select()
      .from(workspaceInvites)
      .where(
        and(
          eq(workspaceInvites.token, data.inviteToken),
          eq(workspaceInvites.status, 'pending'),
        ),
      )
      .limit(1);

    if (!invite) {
      throw new BadRequestException('Convite inválido ou já utilizado');
    }

    // Check if invitation has expired
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      await this.db
        .update(workspaceInvites)
        .set({ status: 'expired' })
        .where(eq(workspaceInvites.id, invite.id));
      throw new BadRequestException(
        'Este convite expirou. Solicite um novo convite.',
      );
    }

    // Verify email matches invitation
    if (invite.email.toLowerCase() !== data.email.toLowerCase()) {
      throw new BadRequestException('O email não corresponde ao convite');
    }

    // Get workspace info
    const [workspace] = await this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, invite.workspaceId))
      .limit(1);

    if (!workspace) {
      throw new BadRequestException('Workspace não encontrado');
    }

    // Check if user already exists
    const [existingUser] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, data.email.toLowerCase()))
      .limit(1);

    if (existingUser) {
      throw new BadRequestException(
        'Este email já está cadastrado. Faça login para acessar o workspace.',
      );
    }

    try {
      // Create user in Supabase Auth
      const authResponse = await this.supabaseAdmin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true, // Auto-confirm email for invited users
        user_metadata: {
          full_name: data.fullName,
        },
      });

      if (!authResponse?.id) {
        throw new BadRequestException('Erro ao criar usuário');
      }

      const userId = authResponse.id;

      // Wait a moment for the database trigger to create the user record
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify user was created in our database
      let [dbUser] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!dbUser) {
        // Create user manually if trigger didn't work
        await this.db.insert(users).values({
          id: userId,
          email: data.email.toLowerCase(),
          fullName: data.fullName,
        });

        [dbUser] = await this.db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
      }

      // Add user to workspace
      await this.db.insert(workspaceUsers).values({
        workspaceId: invite.workspaceId,
        userId: userId,
        role: invite.role,
      });

      // Mark invitation as accepted
      await this.db
        .update(workspaceInvites)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
        })
        .where(eq(workspaceInvites.id, invite.id));

      return {
        success: true,
        message: `Conta criada com sucesso! Você foi adicionado ao workspace '${workspace.name}'.`,
        userId,
        workspaceId: invite.workspaceId,
        workspaceName: workspace.name,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Signup with invite error: ${error}`);
      throw new BadRequestException('Erro ao criar conta. Tente novamente.');
    }
  }

  /**
   * Validate a workspace invitation token.
   */
  async validateInviteToken(token: string): Promise<ValidateInviteResponse> {
    const [invite] = await this.db
      .select()
      .from(workspaceInvites)
      .where(eq(workspaceInvites.token, token))
      .limit(1);

    if (!invite) {
      return {
        valid: false,
        message: 'Convite não encontrado',
      };
    }

    if (invite.status !== 'pending') {
      return {
        valid: false,
        message: 'Este convite já foi utilizado',
      };
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      await this.db
        .update(workspaceInvites)
        .set({ status: 'expired' })
        .where(eq(workspaceInvites.id, invite.id));
      return {
        valid: false,
        message: 'Este convite expirou',
      };
    }

    // Get workspace and inviter info
    const [workspace] = await this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, invite.workspaceId))
      .limit(1);

    const [inviter] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, invite.invitedById))
      .limit(1);

    return {
      valid: true,
      email: invite.email,
      workspaceName: workspace?.name,
      invitedBy: inviter?.fullName || inviter?.email,
      expiresAt: invite.expiresAt,
    };
  }
}
