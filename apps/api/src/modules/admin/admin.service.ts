import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, sql, ilike, gte, count, sum } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module';
import { OpenRouterService } from '../../integrations/openrouter';
import { FalAiService } from '../../integrations/fal-ai/fal-ai.service';
import {
  users,
  workspaces,
  workspaceUsers,
  projects,
  documents,
  chatConversations,
  systemConfig,
  systemMessages,
  adminAuditLog,
  aiUsageLog,
} from '../../database/drizzle/schema';

@Injectable()
export class AdminService {
  constructor(
    @Inject(DATABASE) private readonly db: any,
    private readonly openRouterService: OpenRouterService,
    private readonly falAiService: FalAiService,
  ) {}

  // ============================================================================
  // Dashboard
  // ============================================================================

  async getDashboardStats(periodDays: number = 30) {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    // Total counts
    const [totalUsers] = await this.db
      .select({ count: count() })
      .from(users);

    const [totalWorkspaces] = await this.db
      .select({ count: count() })
      .from(workspaces);

    const [totalDocuments] = await this.db
      .select({ count: count() })
      .from(documents);

    const [totalConversations] = await this.db
      .select({ count: count() })
      .from(chatConversations);

    // Period counts
    const [periodUsers] = await this.db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, periodStart));

    const [periodDocuments] = await this.db
      .select({ count: count() })
      .from(documents)
      .where(gte(documents.createdAt, periodStart));

    const [periodConversations] = await this.db
      .select({ count: count() })
      .from(chatConversations)
      .where(gte(chatConversations.createdAt, periodStart));

    // AI Usage
    const [aiUsage] = await this.db
      .select({
        totalCost: sum(aiUsageLog.totalCost),
        totalTokens: sum(aiUsageLog.totalTokens),
      })
      .from(aiUsageLog)
      .where(gte(aiUsageLog.createdAt, periodStart));

    return {
      users: {
        total: totalUsers.count,
        period: periodUsers.count,
      },
      workspaces: {
        total: totalWorkspaces.count,
      },
      documents: {
        total: totalDocuments.count,
        period: periodDocuments.count,
      },
      conversations: {
        total: totalConversations.count,
        period: periodConversations.count,
      },
      aiUsage: {
        totalCost: aiUsage.totalCost || 0,
        totalTokens: aiUsage.totalTokens || 0,
      },
      periodDays,
    };
  }

  async getActivityTrends(periodDays: number = 30) {
    const trends: { date: string; conversations: number; documents: number; imageGenerations: number }[] = [];

    for (let i = periodDays - 1; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const [convCount] = await this.db
        .select({ count: count() })
        .from(chatConversations)
        .where(and(gte(chatConversations.createdAt, dayStart), sql`${chatConversations.createdAt} < ${dayEnd}`));

      const [docCount] = await this.db
        .select({ count: count() })
        .from(documents)
        .where(and(gte(documents.createdAt, dayStart), sql`${documents.createdAt} < ${dayEnd}`));

      const [imgCount] = await this.db
        .select({ count: count() })
        .from(documents)
        .where(and(
          gte(documents.createdAt, dayStart),
          sql`${documents.createdAt} < ${dayEnd}`,
          eq(documents.mediaType, 'image'),
        ));

      trends.push({
        date: dayStart.toISOString().split('T')[0],
        conversations: Number(convCount.count),
        documents: Number(docCount.count),
        imageGenerations: Number(imgCount.count),
      });
    }

    return trends;
  }

  async getRecentActivity() {
    const recentUsers = await this.db
      .select({ id: users.id, email: users.email, fullName: users.fullName, createdAt: users.createdAt })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(5);

    const recentConversations = await this.db
      .select({ id: chatConversations.id, title: chatConversations.title, userId: chatConversations.userId, createdAt: chatConversations.createdAt })
      .from(chatConversations)
      .orderBy(desc(chatConversations.createdAt))
      .limit(5);

    return {
      users: recentUsers,
      conversations: recentConversations,
      documents: [],
    };
  }

  async getAvailableModels() {
    const [openRouterModels, falPlatformModels] = await Promise.all([
      this.openRouterService.listModels(),
      this.falAiService.listAvailableModels(),
    ]);

    const textModels = openRouterModels
      .filter((m) => m.architecture?.output_modalities?.includes('text'))
      .map((m) => ({
        id: m.id,
        name: m.name,
        provider: m.id.split('/')[0] ?? 'unknown',
        type: 'text' as const,
        hasVision: m.architecture?.input_modalities?.includes('image') ?? false,
        contextLength: m.context_length ?? null,
        pricing: m.pricing
          ? { prompt: parseFloat(m.pricing.prompt), completion: parseFloat(m.pricing.completion) }
          : null,
      }));

    // Use dynamic fal.ai platform models if available, fall back to hardcoded list
    const falSource = falPlatformModels.length > 0
      ? falPlatformModels.map((m) => ({
          id: m.endpoint_id,
          name: m.metadata?.display_name ?? m.endpoint_id,
          provider: m.endpoint_id.split('/')[0] ?? 'fal-ai',
          type: 'image' as const,
          hasVision: false,
          contextLength: null,
          pricing: null,
          category: m.metadata?.category,
        }))
      : this.falAiService.listModels()
          .filter((m) => m.modelType === 'text-to-image')
          .map((m) => ({
            id: m.id,
            name: m.name,
            provider: m.provider,
            type: 'image' as const,
            hasVision: false,
            contextLength: null,
            pricing: null,
          }));

    return [...textModels, ...falSource];
  }

  // ============================================================================
  // User Management
  // ============================================================================

  async listUsers(options: {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const { search, status, limit = 50, offset = 0 } = options;

    let query = this.db.select().from(users);

    // Apply filters
    if (search) {
      query = query.where(
        sql`${users.email} ILIKE ${`%${search}%`} OR ${users.fullName} ILIKE ${`%${search}%`}`,
      );
    }

    if (status === 'blocked') {
      query = query.where(eq(users.isBlocked, true));
    } else if (status === 'active') {
      query = query.where(eq(users.isBlocked, false));
    }

    // Count total
    const [{ count: total }] = await this.db
      .select({ count: count() })
      .from(users)
      .where(
        search
          ? sql`${users.email} ILIKE ${`%${search}%`} OR ${users.fullName} ILIKE ${`%${search}%`}`
          : undefined,
      );

    // Apply pagination
    query = query.orderBy(desc(users.createdAt)).limit(limit).offset(offset);

    const userList = await query;

    return {
      users: userList,
      total,
      limit,
      offset,
    };
  }

  async getUserDetails(userId: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user statistics
    const [workspaceCount] = await this.db
      .select({ count: count() })
      .from(workspaceUsers)
      .where(eq(workspaceUsers.userId, userId));

    const [conversationCount] = await this.db
      .select({ count: count() })
      .from(chatConversations)
      .where(eq(chatConversations.userId, userId));

    const [documentCount] = await this.db
      .select({ count: count() })
      .from(documents)
      .innerJoin(projects, eq(documents.projectId, projects.id))
      .innerJoin(workspaces, eq(projects.workspaceId, workspaces.id))
      .innerJoin(workspaceUsers, eq(workspaces.id, workspaceUsers.workspaceId))
      .where(eq(workspaceUsers.userId, userId));

    return {
      ...user,
      stats: {
        workspaces: workspaceCount.count,
        conversations: conversationCount.count,
        documents: documentCount.count,
      },
    };
  }

  async updateUser(
    userId: string,
    adminId: string,
    data: { role?: string; isBlocked?: boolean },
  ) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: any = {};

    if (data.isBlocked !== undefined) {
      updateData.isBlocked = data.isBlocked;
      if (data.isBlocked) {
        updateData.blockedAt = new Date();
        updateData.blockedBy = adminId;
      } else {
        updateData.blockedAt = null;
        updateData.blockedBy = null;
      }
    }

    const [updated] = await this.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    // Log audit
    await this.logAudit(adminId, 'user.update', 'user', userId, user, updated);

    return updated;
  }

  async blockUser(userId: string, adminId: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isBlocked) {
      throw new BadRequestException('User is already blocked');
    }

    const [updated] = await this.db
      .update(users)
      .set({
        isBlocked: true,
        blockedAt: new Date(),
        blockedBy: adminId,
      })
      .where(eq(users.id, userId))
      .returning();

    // Log audit
    await this.logAudit(adminId, 'user.block', 'user', userId, user, updated);

    return updated;
  }

  async unblockUser(userId: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isBlocked) {
      throw new BadRequestException('User is not blocked');
    }

    const [updated] = await this.db
      .update(users)
      .set({
        isBlocked: false,
        blockedAt: null,
        blockedBy: null,
      })
      .where(eq(users.id, userId))
      .returning();

    return updated;
  }

  // ============================================================================
  // Workspace Management
  // ============================================================================

  async listWorkspaces(options: {
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const { search, limit = 50, offset = 0 } = options;

    let query = this.db.select().from(workspaces);

    if (search) {
      query = query.where(ilike(workspaces.name, `%${search}%`));
    }

    const [{ count: total }] = await this.db
      .select({ count: count() })
      .from(workspaces)
      .where(search ? ilike(workspaces.name, `%${search}%`) : undefined);

    query = query.orderBy(desc(workspaces.createdAt)).limit(limit).offset(offset);

    const workspaceList = await query;

    return {
      workspaces: workspaceList,
      total,
      limit,
      offset,
    };
  }

  async getWorkspaceDetails(workspaceId: string) {
    const [workspace] = await this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Get members
    const members = await this.db
      .select()
      .from(workspaceUsers)
      .innerJoin(users, eq(workspaceUsers.userId, users.id))
      .where(eq(workspaceUsers.workspaceId, workspaceId));

    // Get project count
    const [projectCount] = await this.db
      .select({ count: count() })
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId));

    return {
      ...workspace,
      members: members.map((m: any) => ({
        userId: m.workspace_users.userId,
        role: m.workspace_users.role,
        email: m.users.email,
        fullName: m.users.fullName,
      })),
      stats: {
        memberCount: members.length,
        projectCount: projectCount.count,
      },
    };
  }

  // ============================================================================
  // Model Configuration
  // ============================================================================

  async getModelConfig() {
    const configs = await this.db
      .select()
      .from(systemConfig)
      .where(
        sql`${systemConfig.key} IN ('ai_models', 'visible_text_models', 'visible_image_models')`,
      );

    const result: any = {
      defaults: {},
      fallbacks: {},
      visibleTextModels: [],
      visibleImageModels: [],
    };

    for (const config of configs) {
      if (config.key === 'ai_models') {
        result.defaults = config.value?.defaults ?? {};
        result.fallbacks = config.value?.fallbacks ?? {};
      } else if (config.key === 'visible_text_models') {
        result.visibleTextModels = config.value ?? [];
      } else if (config.key === 'visible_image_models') {
        result.visibleImageModels = config.value ?? [];
      }
    }

    return result;
  }

  async getModelSchema(modelId: string) {
    return this.falAiService.getModelSchema(modelId);
  }

  async updateModelConfig(
    adminId: string,
    data: {
      defaults?: Record<string, string>;
      fallbacks?: Record<string, string>;
      visibleTextModels?: string[];
      visibleImageModels?: any[];
    },
  ) {
    const upsert = async (key: string, value: any) => {
      const [existing] = await this.db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.key, key))
        .limit(1);

      if (existing) {
        await this.db
          .update(systemConfig)
          .set({ value, updatedAt: new Date(), updatedBy: adminId })
          .where(eq(systemConfig.id, existing.id));
      } else {
        await this.db.insert(systemConfig).values({ key, value, updatedBy: adminId });
      }
    };

    // Update ai_models if defaults or fallbacks changed
    if (data.defaults || data.fallbacks) {
      const [existing] = await this.db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.key, 'ai_models'))
        .limit(1);

      const current = existing?.value ?? { defaults: {}, fallbacks: {} };
      await upsert('ai_models', {
        defaults: data.defaults ?? current.defaults ?? {},
        fallbacks: data.fallbacks ?? current.fallbacks ?? {},
      });
    }

    if (data.visibleTextModels !== undefined) {
      await upsert('visible_text_models', data.visibleTextModels);
    }

    if (data.visibleImageModels !== undefined) {
      await upsert('visible_image_models', data.visibleImageModels);
    }

    await this.logAudit(adminId, 'models.config.update', 'model_config', 'ai_models', {}, data);

    return this.getModelConfig();
  }

  // ============================================================================
  // System Settings
  // ============================================================================

  async getSystemSettings() {
    const configs = await this.db
      .select()
      .from(systemConfig)
      .where(sql`${systemConfig.key} LIKE 'settings.%'`);

    const settings: any = {
      limits: {},
      features: {},
      api: {},
    };

    for (const config of configs) {
      const category = config.key.replace('settings.', '');
      settings[category] = config.value;
    }

    return settings;
  }

  async updateSystemSettings(adminId: string, data: Record<string, any>) {
    for (const [category, value] of Object.entries(data)) {
      const key = `settings.${category}`;

      const [existing] = await this.db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.key, key))
        .limit(1);

      if (existing) {
        await this.db
          .update(systemConfig)
          .set({
            value,
            updatedAt: new Date(),
            updatedBy: adminId,
          })
          .where(eq(systemConfig.id, existing.id));
      } else {
        await this.db.insert(systemConfig).values({
          key,
          value,
          updatedBy: adminId,
        });
      }
    }

    // Log audit
    await this.logAudit(adminId, 'settings.update', 'system_settings', 'global', {}, data);

    return this.getSystemSettings();
  }

  // ============================================================================
  // Audit Log
  // ============================================================================

  async getAuditLog(options: {
    userId?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }) {
    const { userId, action, limit = 50, offset = 0 } = options;

    let query = this.db.select().from(adminAuditLog);

    if (userId) {
      query = query.where(eq(adminAuditLog.adminId, userId));
    }

    if (action) {
      query = query.where(eq(adminAuditLog.action, action));
    }

    const [{ count: total }] = await this.db
      .select({ count: count() })
      .from(adminAuditLog)
      .where(
        and(
          userId ? eq(adminAuditLog.adminId, userId) : undefined,
          action ? eq(adminAuditLog.action, action) : undefined,
        ),
      );

    query = query.orderBy(desc(adminAuditLog.createdAt)).limit(limit).offset(offset);

    const logs = await query;

    return {
      logs,
      total,
      limit,
      offset,
    };
  }

  // ============================================================================
  // System Messages
  // ============================================================================

  async getSystemMessages(includeInactive: boolean = false) {
    let query = this.db.select().from(systemMessages);

    if (!includeInactive) {
      // Filter to active messages only (you could add date range filtering here)
      query = query.orderBy(desc(systemMessages.priority), desc(systemMessages.createdAt));
    } else {
      query = query.orderBy(desc(systemMessages.createdAt));
    }

    const messages = await query;

    return {
      messages,
      total: messages.length,
    };
  }

  async createSystemMessage(
    adminId: string,
    data: {
      type: string;
      title: string;
      content: string;
      priority?: number;
      dismissible?: boolean;
      startsAt?: string;
      endsAt?: string;
    },
  ) {
    const validTypes = ['maintenance', 'announcement', 'warning', 'info'];
    if (!validTypes.includes(data.type)) {
      throw new BadRequestException(
        `Invalid type. Must be one of: ${validTypes.join(', ')}`,
      );
    }

    const [message] = await this.db
      .insert(systemMessages)
      .values({
        type: data.type,
        title: data.title,
        content: data.content,
        priority: data.priority || 0,
        dismissible: data.dismissible ?? true,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
      })
      .returning();

    // Log audit
    await this.logAudit(adminId, 'system_message.create', 'system_message', message.id, null, message);

    return message;
  }

  async updateSystemMessage(
    messageId: string,
    adminId: string,
    data: Partial<{
      type: string;
      title: string;
      content: string;
      priority: number;
      dismissible: boolean;
      startsAt: string;
      endsAt: string;
    }>,
  ) {
    const [existing] = await this.db
      .select()
      .from(systemMessages)
      .where(eq(systemMessages.id, messageId))
      .limit(1);

    if (!existing) {
      throw new NotFoundException('System message not found');
    }

    if (data.type) {
      const validTypes = ['maintenance', 'announcement', 'warning', 'info'];
      if (!validTypes.includes(data.type)) {
        throw new BadRequestException(
          `Invalid type. Must be one of: ${validTypes.join(', ')}`,
        );
      }
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.type !== undefined) updateData.type = data.type;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.dismissible !== undefined) updateData.dismissible = data.dismissible;
    if (data.startsAt !== undefined) updateData.startsAt = data.startsAt ? new Date(data.startsAt) : null;
    if (data.endsAt !== undefined) updateData.endsAt = data.endsAt ? new Date(data.endsAt) : null;

    const [updated] = await this.db
      .update(systemMessages)
      .set(updateData)
      .where(eq(systemMessages.id, messageId))
      .returning();

    // Log audit
    await this.logAudit(adminId, 'system_message.update', 'system_message', messageId, existing, updated);

    return updated;
  }

  async deleteSystemMessage(messageId: string, adminId: string) {
    const [existing] = await this.db
      .select()
      .from(systemMessages)
      .where(eq(systemMessages.id, messageId))
      .limit(1);

    if (!existing) {
      throw new NotFoundException('System message not found');
    }

    await this.db.delete(systemMessages).where(eq(systemMessages.id, messageId));

    // Log audit
    await this.logAudit(adminId, 'system_message.delete', 'system_message', messageId, existing, null);

    return true;
  }

  // ============================================================================
  // AI Usage Analytics
  // ============================================================================

  async getAiUsageSummary(periodDays: number = 30) {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    const [summary] = await this.db
      .select({
        totalRequests: count(),
        totalTokens: sum(aiUsageLog.totalTokens),
        totalCost: sum(aiUsageLog.totalCost),
      })
      .from(aiUsageLog)
      .where(gte(aiUsageLog.createdAt, periodStart));

    return {
      periodDays,
      totalRequests: summary.totalRequests,
      totalTokens: summary.totalTokens || 0,
      totalCost: summary.totalCost || 0,
    };
  }

  async getAiUsageByUser(periodDays: number = 30, limit: number = 20) {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    const results = await this.db
      .select({
        userId: aiUsageLog.userId,
        totalRequests: count(),
        totalTokens: sum(aiUsageLog.totalTokens),
        totalCost: sum(aiUsageLog.totalCost),
      })
      .from(aiUsageLog)
      .where(gte(aiUsageLog.createdAt, periodStart))
      .groupBy(aiUsageLog.userId)
      .orderBy(desc(sum(aiUsageLog.totalCost)))
      .limit(limit);

    return {
      periodDays,
      usage: results,
    };
  }

  async getAiUsageByModel(periodDays: number = 30, limit: number = 20) {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    const results = await this.db
      .select({
        model: aiUsageLog.model,
        totalRequests: count(),
        totalTokens: sum(aiUsageLog.totalTokens),
        totalCost: sum(aiUsageLog.totalCost),
      })
      .from(aiUsageLog)
      .where(gte(aiUsageLog.createdAt, periodStart))
      .groupBy(aiUsageLog.model)
      .orderBy(desc(count()))
      .limit(limit);

    return {
      periodDays,
      usage: results,
    };
  }

  // ============================================================================
  // Internal Helpers
  // ============================================================================

  private async logAudit(
    adminId: string,
    action: string,
    entityType: string,
    entityId: string,
    oldValue: any,
    newValue: any,
  ) {
    await this.db.insert(adminAuditLog).values({
      adminId,
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
    });
  }
}
