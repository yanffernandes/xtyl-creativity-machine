import { Injectable, Inject } from '@nestjs/common';
import { eq, and, gte, lte, desc, count, sum, sql } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module';
import { aiUsageLog } from '../../database/drizzle/schema';

interface UsageFilter {
  userId?: string;
  workspaceId?: string;
  projectId?: string;
  model?: string;
  startDate?: Date;
  endDate?: Date;
}

interface UsageStatsOptions extends UsageFilter {
  limit?: number;
  offset?: number;
}

@Injectable()
export class AiUsageService {
  constructor(@Inject(DATABASE) private readonly db: any) {}

  async getUsageStats(options: UsageFilter) {
    const conditions = this.buildConditions(options);

    // Get aggregated stats
    const [stats] = await this.db
      .select({
        totalRequests: count(),
        totalTokens: sum(aiUsageLog.totalTokens),
        totalInputTokens: sum(aiUsageLog.inputTokens),
        totalOutputTokens: sum(aiUsageLog.outputTokens),
        totalCost: sum(aiUsageLog.totalCost),
      })
      .from(aiUsageLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get model breakdown
    const modelBreakdown = await this.db
      .select({
        model: aiUsageLog.model,
        requests: count(),
        tokens: sum(aiUsageLog.totalTokens),
        cost: sum(aiUsageLog.totalCost),
      })
      .from(aiUsageLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(aiUsageLog.model)
      .orderBy(desc(sum(aiUsageLog.totalCost)));

    // Get request type breakdown
    const requestTypeBreakdown = await this.db
      .select({
        requestType: aiUsageLog.requestType,
        requests: count(),
        tokens: sum(aiUsageLog.totalTokens),
        cost: sum(aiUsageLog.totalCost),
      })
      .from(aiUsageLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(aiUsageLog.requestType);

    return {
      totalRequests: Number(stats?.totalRequests ?? 0),
      totalTokens: Number(stats?.totalTokens ?? 0),
      totalInputTokens: Number(stats?.totalInputTokens ?? 0),
      totalOutputTokens: Number(stats?.totalOutputTokens ?? 0),
      totalCost: parseFloat(stats?.totalCost ?? '0'),
      modelBreakdown: modelBreakdown.map((m: any) => ({
        model: m.model,
        requests: Number(m.requests),
        tokens: Number(m.tokens ?? 0),
        cost: parseFloat(m.cost ?? '0'),
      })),
      requestTypeBreakdown: requestTypeBreakdown.map((r: any) => ({
        requestType: r.requestType,
        requests: Number(r.requests),
        tokens: Number(r.tokens ?? 0),
        cost: parseFloat(r.cost ?? '0'),
      })),
    };
  }

  async getUsageLogs(options: UsageStatsOptions) {
    const { limit = 100, offset = 0, ...filter } = options;
    const conditions = this.buildConditions(filter);

    const logs = await this.db
      .select()
      .from(aiUsageLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(aiUsageLog.createdAt))
      .limit(limit)
      .offset(offset);

    return logs.map((log: any) => ({
      id: log.id,
      userId: log.userId,
      workspaceId: log.workspaceId,
      projectId: log.projectId,
      model: log.model,
      provider: log.provider,
      requestType: log.requestType,
      inputTokens: log.inputTokens,
      outputTokens: log.outputTokens,
      totalTokens: log.totalTokens,
      inputCost: parseFloat(log.inputCost),
      outputCost: parseFloat(log.outputCost),
      totalCost: parseFloat(log.totalCost),
      promptPreview: log.promptPreview,
      responsePreview: log.responsePreview,
      toolCalls: log.toolCalls,
      durationMs: log.durationMs,
      createdAt: log.createdAt,
    }));
  }

  async getCostBreakdown(options: UsageFilter) {
    const conditions = this.buildConditions(options);

    // Cost by model
    const byModel = await this.db
      .select({
        model: aiUsageLog.model,
        cost: sum(aiUsageLog.totalCost),
        requests: count(),
      })
      .from(aiUsageLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(aiUsageLog.model)
      .orderBy(desc(sum(aiUsageLog.totalCost)));

    // Cost by request type
    const byRequestType = await this.db
      .select({
        requestType: aiUsageLog.requestType,
        cost: sum(aiUsageLog.totalCost),
        requests: count(),
      })
      .from(aiUsageLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(aiUsageLog.requestType);

    // Cost by provider
    const byProvider = await this.db
      .select({
        provider: aiUsageLog.provider,
        cost: sum(aiUsageLog.totalCost),
        requests: count(),
      })
      .from(aiUsageLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(aiUsageLog.provider);

    // Total cost
    const [total] = await this.db
      .select({
        totalCost: sum(aiUsageLog.totalCost),
      })
      .from(aiUsageLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return {
      totalCost: parseFloat(total?.totalCost ?? '0'),
      byModel: byModel.map((m: any) => ({
        model: m.model,
        cost: parseFloat(m.cost ?? '0'),
        requests: Number(m.requests),
      })),
      byRequestType: byRequestType.map((r: any) => ({
        requestType: r.requestType,
        cost: parseFloat(r.cost ?? '0'),
        requests: Number(r.requests),
      })),
      byProvider: byProvider.map((p: any) => ({
        provider: p.provider,
        cost: parseFloat(p.cost ?? '0'),
        requests: Number(p.requests),
      })),
    };
  }

  async getUsageSummary(options: UsageFilter) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get stats for each period
    const today = await this.getUsageStats({
      ...options,
      startDate: todayStart,
      endDate: now,
    });

    const thisWeek = await this.getUsageStats({
      ...options,
      startDate: weekStart,
      endDate: now,
    });

    const thisMonth = await this.getUsageStats({
      ...options,
      startDate: monthStart,
      endDate: now,
    });

    const allTime = await this.getUsageStats(options);

    return {
      today,
      thisWeek,
      thisMonth,
      allTime,
    };
  }

  async getDailyUsageTrend(options: UsageFilter & { days?: number }) {
    const { days = 30, ...filter } = options;
    const conditions = this.buildConditions(filter);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const additionalConditions = [...conditions];
    additionalConditions.push(gte(aiUsageLog.createdAt, startDate));

    // Group by date
    const trend = await this.db
      .select({
        date: sql`DATE(${aiUsageLog.createdAt})`,
        requests: count(),
        tokens: sum(aiUsageLog.totalTokens),
        cost: sum(aiUsageLog.totalCost),
      })
      .from(aiUsageLog)
      .where(and(...additionalConditions))
      .groupBy(sql`DATE(${aiUsageLog.createdAt})`)
      .orderBy(sql`DATE(${aiUsageLog.createdAt})`);

    return trend.map((t: any) => ({
      date: t.date,
      requests: Number(t.requests),
      tokens: Number(t.tokens ?? 0),
      cost: parseFloat(t.cost ?? '0'),
    }));
  }

  private buildConditions(filter: UsageFilter) {
    const conditions: any[] = [];

    if (filter.userId) {
      conditions.push(eq(aiUsageLog.userId, filter.userId));
    }

    if (filter.workspaceId) {
      conditions.push(eq(aiUsageLog.workspaceId, filter.workspaceId));
    }

    if (filter.projectId) {
      conditions.push(eq(aiUsageLog.projectId, filter.projectId));
    }

    if (filter.model) {
      conditions.push(eq(aiUsageLog.model, filter.model));
    }

    if (filter.startDate) {
      conditions.push(gte(aiUsageLog.createdAt, filter.startDate));
    }

    if (filter.endDate) {
      conditions.push(lte(aiUsageLog.createdAt, filter.endDate));
    }

    return conditions;
  }
}
