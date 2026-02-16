import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { eq, and, or, desc, inArray } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module';
import { activityLog, documents, folders } from '../../database/drizzle/schema';

interface CreateActivityDto {
  entityType: string;
  entityId: string;
  action: string;
  actorType: string;
  changes?: Record<string, any>;
}

@Injectable()
export class ActivityService {
  constructor(@Inject(DATABASE) private readonly db: any) {}

  async listActivityLogs(options: {
    projectId?: string;
    userId?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }) {
    const { projectId, userId, action, limit = 50, offset = 0 } = options;

    const conditions: any[] = [];

    if (userId) {
      conditions.push(eq(activityLog.userId, userId));
    }

    if (action) {
      conditions.push(eq(activityLog.action, action));
    }

    // If filtering by project, we need to join with documents/folders
    let query = this.db.select().from(activityLog);

    if (projectId) {
      // Get all entity IDs in the project
      const docs = await this.db
        .select({ id: documents.id })
        .from(documents)
        .where(eq(documents.projectId, projectId));

      const folds = await this.db
        .select({ id: folders.id })
        .from(folders)
        .where(eq(folders.projectId, projectId));

      const docIds = docs.map((d: any) => d.id);
      const folderIds = folds.map((f: any) => f.id);

      conditions.push(
        or(
          and(
            eq(activityLog.entityType, 'document'),
            inArray(activityLog.entityId, docIds.length > 0 ? docIds : ['']),
          ),
          and(
            eq(activityLog.entityType, 'folder'),
            inArray(activityLog.entityId, folderIds.length > 0 ? folderIds : ['']),
          ),
        ),
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const logs = await query
      .orderBy(desc(activityLog.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      activities: logs,
      count: logs.length,
    };
  }

  async createActivityLog(dto: CreateActivityDto, userId?: string) {
    const id = `act_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    const [log] = await this.db
      .insert(activityLog)
      .values({
        id,
        entityType: dto.entityType,
        entityId: dto.entityId,
        action: dto.action,
        actorType: dto.actorType,
        userId,
        changes: dto.changes ?? null,
        createdAt: new Date(),
      })
      .returning();

    return log;
  }

  async getEntityActivity(entityType: string, entityId: string) {
    if (!['document', 'folder'].includes(entityType)) {
      throw new BadRequestException(
        "entity_type must be 'document' or 'folder'",
      );
    }

    const activities = await this.db
      .select()
      .from(activityLog)
      .where(
        and(
          eq(activityLog.entityType, entityType),
          eq(activityLog.entityId, entityId),
        ),
      )
      .orderBy(desc(activityLog.createdAt));

    return {
      entityType,
      entityId,
      activities: activities.map((a: any) => ({
        id: a.id,
        action: a.action,
        actorType: a.actorType,
        userId: a.userId,
        changes: a.changes,
        createdAt: a.createdAt,
      })),
      count: activities.length,
    };
  }

  async getRecentProjectActivity(projectId: string, limit: number) {
    // Get all document IDs in the project
    const docs = await this.db
      .select()
      .from(documents)
      .where(eq(documents.projectId, projectId));

    const docIds = docs.map((d: any) => d.id);

    // Get all folder IDs in the project
    const folds = await this.db
      .select()
      .from(folders)
      .where(eq(folders.projectId, projectId));

    const folderIds = folds.map((f: any) => f.id);

    // Get activities for all entities
    const activities = await this.db
      .select()
      .from(activityLog)
      .where(
        or(
          and(
            eq(activityLog.entityType, 'document'),
            inArray(activityLog.entityId, docIds.length > 0 ? docIds : ['']),
          ),
          and(
            eq(activityLog.entityType, 'folder'),
            inArray(activityLog.entityId, folderIds.length > 0 ? folderIds : ['']),
          ),
        ),
      )
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);

    // Enrich with entity names
    const enrichedActivities = activities.map((activity: any) => {
      const activityData: any = {
        id: activity.id,
        entityType: activity.entityType,
        entityId: activity.entityId,
        action: activity.action,
        actorType: activity.actorType,
        userId: activity.userId,
        changes: activity.changes,
        createdAt: activity.createdAt,
      };

      // Add entity name
      if (activity.entityType === 'document') {
        const doc = docs.find((d: any) => d.id === activity.entityId);
        if (doc) {
          activityData.entityName = doc.title;
        }
      } else if (activity.entityType === 'folder') {
        const folder = folds.find((f: any) => f.id === activity.entityId);
        if (folder) {
          activityData.entityName = folder.name;
        }
      }

      return activityData;
    });

    return {
      projectId,
      activities: enrichedActivities,
      count: enrichedActivities.length,
    };
  }

  async getUserRecentActivity(userId: string, limit: number) {
    const activities = await this.db
      .select()
      .from(activityLog)
      .where(eq(activityLog.userId, userId))
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);

    return {
      userId,
      activities: activities.map((a: any) => ({
        id: a.id,
        entityType: a.entityType,
        entityId: a.entityId,
        action: a.action,
        actorType: a.actorType,
        changes: a.changes,
        createdAt: a.createdAt,
      })),
      count: activities.length,
    };
  }

  async getAiHumanStats(projectId: string) {
    // Get all entity IDs in the project
    const docs = await this.db
      .select({ id: documents.id })
      .from(documents)
      .where(eq(documents.projectId, projectId));

    const docIds = docs.map((d: any) => d.id);

    const folds = await this.db
      .select({ id: folders.id })
      .from(folders)
      .where(eq(folders.projectId, projectId));

    const folderIds = folds.map((f: any) => f.id);

    // Get all activities
    const activities = await this.db
      .select()
      .from(activityLog)
      .where(
        or(
          and(
            eq(activityLog.entityType, 'document'),
            inArray(activityLog.entityId, docIds.length > 0 ? docIds : ['']),
          ),
          and(
            eq(activityLog.entityType, 'folder'),
            inArray(activityLog.entityId, folderIds.length > 0 ? folderIds : ['']),
          ),
        ),
      );

    // Calculate stats
    const aiCount = activities.filter((a: any) => a.actorType === 'ai').length;
    const humanCount = activities.filter(
      (a: any) => a.actorType === 'human',
    ).length;

    const actionCounts: Record<string, number> = {};
    for (const activity of activities) {
      actionCounts[activity.action] = (actionCounts[activity.action] || 0) + 1;
    }

    return {
      projectId,
      totalActivities: activities.length,
      aiActions: aiCount,
      humanActions: humanCount,
      actionBreakdown: actionCounts,
    };
  }
}
