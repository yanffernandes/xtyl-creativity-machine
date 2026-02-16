import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { SupabaseService } from "../../common/supabase/supabase.service";
import { randomBytes } from "crypto";
import OpenAI from "openai";
import { TestPromptDto, TestPromptResponse } from "./dto/test-prompt.dto";
import { DefaultImageModelResponse } from "./dto/image-model.dto";
import { OpenRouterService } from "../openrouter/openrouter.service";
import { AIProvider } from "../../common/types/ai-provider.types";

interface CreateUserDto {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
}

interface UpdateUserDto {
  full_name?: string;
  phone?: string;
}

interface MagicLinkDto {
  target_user_id: string;
  reason?: string;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private openai: OpenAI | null = null;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly openRouterService: OpenRouterService,
  ) {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * Check if a user is an admin
   */
  async isAdmin(userId: string): Promise<boolean> {
    const supabase = this.supabaseService.getServiceRoleClient();

    const { data, error } = await supabase
      .from("admins")
      .select("user_id, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .is("deleted_at", null)
      .single();

    if (error) {
      this.logger.debug(`isAdmin check for ${userId}: error=${error.message}`);
    } else {
      this.logger.debug(`isAdmin check for ${userId}: found=${!!data}`);
    }

    return !error && !!data;
  }

  /**
   * Check if a user is a super admin (full permissions)
   */
  async isSuperAdmin(userId: string): Promise<boolean> {
    const supabase = this.supabaseService.getServiceRoleClient();

    const { data, error } = await supabase
      .from("admin_users_view")
      .select("role, permissions")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      this.logger.debug(
        `isSuperAdmin check for ${userId}: error=${error?.message ?? "no data"}`,
      );
      return false;
    }

    const permissions = data.permissions as Record<string, unknown> | null;
    const hasAllPermissions = permissions?.all === true;
    const isRoleSuperAdmin = data.role === "super_admin";

    this.logger.debug(
      `isSuperAdmin check for ${userId}: role=${data.role}, all=${hasAllPermissions}`,
    );

    return isRoleSuperAdmin || hasAllPermissions;
  }

  /**
   * Check if admin has specific permission
   */
  async hasPermission(
    adminId: string,
    resource: string,
    action: string,
  ): Promise<boolean> {
    const supabase = this.supabaseService.getServiceRoleClient();

    const { data, error } = await supabase
      .from("admin_users_view")
      .select("permissions")
      .eq("user_id", adminId)
      .single();

    if (error || !data) return false;

    const permissions = data.permissions as Record<string, unknown>;

    // Super admin check
    if (permissions.all === true) return true;

    // Specific permission check
    const resourcePerms = permissions[resource] as
      | Record<string, boolean>
      | undefined;
    return resourcePerms?.[action] === true;
  }

  /**
   * Create a new user (admin only)
   */
  async createUser(adminId: string, dto: CreateUserDto) {
    // Verify permission
    if (!(await this.hasPermission(adminId, "users", "create"))) {
      throw new ForbiddenException("Sem permissao para criar usuarios");
    }

    const supabase = this.supabaseService.getServiceRoleClient();

    // Create user via Supabase Auth Admin API
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
        user_metadata: {
          full_name: dto.full_name,
          phone: dto.phone,
        },
      });

    if (authError) {
      throw new BadRequestException(
        `Erro ao criar usuario: ${authError.message}`,
      );
    }

    // Log action
    await this.logAdminAction(
      adminId,
      "user_create",
      "user",
      authData.user.id,
      {
        email: dto.email,
        full_name: dto.full_name,
      },
    );

    return { id: authData.user.id, email: authData.user.email };
  }

  /**
   * Change a user's password (admin only)
   */
  async changeUserPassword(
    adminId: string,
    userId: string,
    newPassword: string,
  ) {
    if (!(await this.hasPermission(adminId, "users", "edit"))) {
      throw new ForbiddenException("Sem permissao para editar usuarios");
    }

    const supabase = this.supabaseService.getServiceRoleClient();

    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      throw new BadRequestException(`Erro ao alterar senha: ${error.message}`);
    }

    await this.logAdminAction(adminId, "user_change_password", "user", userId);

    return { success: true };
  }

  /**
   * Update a user
   */
  async updateUser(adminId: string, userId: string, dto: UpdateUserDto) {
    if (!(await this.hasPermission(adminId, "users", "edit"))) {
      throw new ForbiddenException("Sem permissao para editar usuarios");
    }

    const supabase = this.supabaseService.getServiceRoleClient();

    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        full_name: dto.full_name,
        phone: dto.phone,
      },
    });

    if (error) {
      throw new Error(`Erro ao atualizar usuario: ${error.message}`);
    }

    await this.logAdminAction(
      adminId,
      "user_update",
      "user",
      userId,
      dto as unknown as Record<string, unknown>,
    );

    return { user: data.user };
  }

  /**
   * Ban/unban a user
   */
  async banUser(adminId: string, userId: string, bannedUntil: string | null) {
    if (!(await this.hasPermission(adminId, "users", "edit"))) {
      throw new ForbiddenException("Sem permissao para banir usuarios");
    }

    const supabase = this.supabaseService.getServiceRoleClient();

    const { error } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: bannedUntil ? "none" : undefined, // Supabase uses different format
      user_metadata: {
        banned_until: bannedUntil,
      },
    });

    if (error) {
      throw new Error(`Erro ao banir usuario: ${error.message}`);
    }

    await this.logAdminAction(
      adminId,
      bannedUntil ? "user_ban" : "user_unban",
      "user",
      userId,
      {
        banned_until: bannedUntil,
      },
    );

    return { success: true };
  }

  /**
   * Delete a user (soft delete)
   */
  async deleteUser(adminId: string, userId: string) {
    if (!(await this.hasPermission(adminId, "users", "delete"))) {
      throw new ForbiddenException("Sem permissao para deletar usuarios");
    }

    const supabase = this.supabaseService.getServiceRoleClient();

    // Soft delete - just mark as deleted
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        deleted_at: new Date().toISOString(),
      },
    });

    if (error) {
      throw new Error(`Erro ao deletar usuario: ${error.message}`);
    }

    await this.logAdminAction(adminId, "user_delete", "user", userId);

    return { success: true };
  }

  /**
   * Generate magic link for user impersonation
   */
  async generateMagicLink(adminId: string, dto: MagicLinkDto) {
    if (!(await this.hasPermission(adminId, "users", "impersonate"))) {
      throw new ForbiddenException(
        "Sem permissao para fazer login como outros usuarios",
      );
    }

    const supabase = this.supabaseService.getServiceRoleClient();

    // Verify target user exists
    const { data: targetUser, error: userError } =
      await supabase.auth.admin.getUserById(dto.target_user_id);

    if (userError || !targetUser) {
      throw new NotFoundException("Usuario nao encontrado");
    }

    // Generate secure token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store magic link
    const { error: insertError } = await supabase
      .from("admin_magic_links")
      .insert({
        admin_id: adminId,
        target_user_id: dto.target_user_id,
        token,
        reason: dto.reason,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      throw new Error(`Erro ao gerar magic link: ${insertError.message}`);
    }

    // Log action
    await this.logAdminAction(
      adminId,
      "user_impersonate",
      "user",
      dto.target_user_id,
      {
        reason: dto.reason,
        target_email: targetUser.user.email,
      },
    );

    // Generate the actual login link using Supabase magic link
    const redirectUrl = `${process.env.FRONTEND_URL}/dashboard`;
    this.logger.log(`Generating magic link with redirectTo: ${redirectUrl}`);

    const { data: magicLinkData, error: magicLinkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: targetUser.user.email!,
        options: {
          redirectTo: redirectUrl,
        },
      });

    if (magicLinkError) {
      throw new Error(`Erro ao gerar link de login: ${magicLinkError.message}`);
    }

    return {
      url: magicLinkData.properties.action_link,
      expires_at: expiresAt.toISOString(),
      token,
    };
  }

  /**
   * Log admin action to audit log
   */
  async logAdminAction(
    adminId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: Record<string, unknown>,
  ) {
    const supabase = this.supabaseService.getServiceRoleClient();

    await supabase.from("admin_audit_log").insert({
      admin_id: adminId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details: details || {},
    });
  }

  /**
   * Get audit log entries
   */
  async getAuditLog(page = 1, perPage = 50) {
    const supabase = this.supabaseService.getServiceRoleClient();

    const start = (page - 1) * perPage;
    const end = start + perPage - 1;

    const { data, error, count } = await supabase
      .from("admin_audit_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(start, end);

    if (error) {
      throw new Error(`Erro ao buscar audit log: ${error.message}`);
    }

    return {
      data,
      total: count,
      page,
      per_page: perPage,
    };
  }

  /**
   * Replace template variables with actual values
   */
  private replaceVariables(
    template: string,
    variables: Record<string, string>,
  ): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
    }
    return result;
  }

  /**
   * Test a system prompt by executing it against OpenAI or OpenRouter
   */
  async testPrompt(
    adminId: string,
    dto: TestPromptDto,
  ): Promise<TestPromptResponse> {
    this.logger.log(`Testing prompt for admin: ${adminId}`);

    // Verify user is admin
    const isUserAdmin = await this.isAdmin(adminId);
    this.logger.log(`Is user admin: ${isUserAdmin}`);

    if (!isUserAdmin) {
      this.logger.warn(
        `User ${adminId} is not an admin, denying access to test prompt`,
      );
      throw new ForbiddenException(
        "Apenas administradores podem testar prompts",
      );
    }

    const defaultGeminiModel = "google/gemini-3-flash-preview";
    let provider = dto.provider || "openrouter";
    let model = dto.model || defaultGeminiModel;

    if (!model.includes("gemini") || /gemini-(1|1\\.5|2)/.test(model)) {
      model = defaultGeminiModel;
    }

    if (model.includes("gemini") || model.includes("gpt-4o-mini")) {
      provider = "openrouter";
    }
    const temperature = dto.temperature ?? 0.7;
    const maxTokens = dto.max_tokens ?? 2000;

    // Replace variables in the user prompt template
    const userPrompt = this.replaceVariables(
      dto.user_prompt_template,
      dto.variables,
    );

    // Build messages array
    const messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [];
    if (dto.system_prompt) {
      messages.push({ role: "system", content: dto.system_prompt });
    }
    messages.push({ role: "user", content: userPrompt });

    const startTime = Date.now();

    try {
      this.logger.log(
        `Testing prompt with provider: ${provider}, model: ${model}, temperature: ${temperature}`,
      );

      let output: string;
      let tokensUsed:
        | { prompt: number; completion: number; total: number }
        | undefined;

      if (provider === "openrouter") {
        // Use OpenRouter service
        const response = await this.openRouterService.chatCompletion(
          model,
          messages,
          {
            temperature,
            max_tokens: maxTokens,
            response_format: { type: "json_object" },
          },
        );
        output = response.content;
        tokensUsed = response.tokensUsed;
      } else {
        // Use OpenAI (default)
        if (!this.openai) {
          throw new Error("OpenAI API key not configured");
        }

        const openaiMessages: OpenAI.ChatCompletionMessageParam[] =
          messages.map((m) => ({
            role: m.role,
            content: m.content,
          }));

        const response = await this.openai.chat.completions.create({
          model,
          messages: openaiMessages,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
        });

        output = response.choices[0]?.message?.content || "";
        tokensUsed = response.usage
          ? {
              prompt: response.usage.prompt_tokens,
              completion: response.usage.completion_tokens,
              total: response.usage.total_tokens,
            }
          : undefined;
      }

      const processingTime = Date.now() - startTime;

      // Log the test action
      await this.logAdminAction(
        adminId,
        "system_prompt_test",
        "system_prompt",
        undefined,
        {
          provider,
          model,
          temperature,
          max_tokens: maxTokens,
          processing_time_ms: processingTime,
          variables: Object.keys(dto.variables),
        },
      );

      return {
        output,
        processingTime,
        provider,
        model,
        tokensUsed,
      };
    } catch (error) {
      this.logger.error("Error testing prompt:", error);
      throw new Error(`Erro ao executar prompt: ${error.message}`);
    }
  }

  /**
   * Get default image generation model from platform_settings
   */
  async getDefaultImageModel(
    adminId: string,
  ): Promise<DefaultImageModelResponse> {
    // Verify user is admin
    const isUserAdmin = await this.isAdmin(adminId);
    if (!isUserAdmin) {
      throw new ForbiddenException(
        "Apenas administradores podem acessar configurações",
      );
    }

    const supabase = this.supabaseService.getServiceRoleClient();

    const { data, error } = await supabase
      .from("platform_settings")
      .select("value, updated_at")
      .eq("key", "default_image_model")
      .single();

    if (error) {
      this.logger.error("Error fetching default image model:", error);
      // Return default if not found
      return {
        provider: "openai" as AIProvider,
        model: "dall-e-3",
      };
    }

    const value = data.value as { provider: AIProvider; model: string };
    return {
      provider: value.provider,
      model: value.model,
      updated_at: data.updated_at,
    };
  }

  /**
   * Set default image generation model in platform_settings
   */
  async setDefaultImageModel(
    adminId: string,
    dto: { provider: string; model: string },
  ): Promise<DefaultImageModelResponse> {
    // Verify user is admin
    const isUserAdmin = await this.isAdmin(adminId);
    if (!isUserAdmin) {
      throw new ForbiddenException(
        "Apenas administradores podem alterar configurações",
      );
    }

    // Verify user has settings permission
    if (!(await this.hasPermission(adminId, "settings", "edit"))) {
      throw new ForbiddenException("Sem permissão para editar configurações");
    }

    const supabase = this.supabaseService.getServiceRoleClient();

    const value = {
      provider: dto.provider as AIProvider,
      model: dto.model,
    };

    const { data, error } = await supabase
      .from("platform_settings")
      .upsert(
        {
          key: "default_image_model",
          value,
          description: "Default AI model for image generation in AlvoAds Meta",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      )
      .select("value, updated_at")
      .single();

    if (error) {
      this.logger.error("Error updating default image model:", error);
      throw new Error(`Erro ao atualizar modelo de imagem: ${error.message}`);
    }

    // Log the action
    await this.logAdminAction(
      adminId,
      "settings_update",
      "platform_settings",
      "default_image_model",
      {
        provider: dto.provider,
        model: dto.model,
      },
    );

    const resultValue = data.value as { provider: AIProvider; model: string };
    return {
      provider: resultValue.provider,
      model: resultValue.model,
      updated_at: data.updated_at,
    };
  }
}
