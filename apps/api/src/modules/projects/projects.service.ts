import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module';
import {
  projects,
  documents,
  workflowTemplates,
  creativeConcepts,
  userMemories,
  workspaceUsers,
  folders,
  workflowExecutions,
} from '../../database/drizzle/schema';
import type {
  ProjectSettingsUpdate,
  ProjectContext,
  CascadeSummary,
  BootstrapData,
  VisualAsset,
  MemoryResponse,
  ModelsConfig,
} from './projects.dto';

@Injectable()
export class ProjectsService {
  constructor(@Inject(DATABASE) private readonly db: any) {}

  /**
   * Get project settings from settings JSONB column
   */
  async getSettings(projectId: string): Promise<any> {
    const [project] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project.settings || {};
  }

  /**
   * Update project settings and sync project name with client_name
   */
  async updateSettings(
    projectId: string,
    settings: ProjectSettingsUpdate,
  ): Promise<{ settings: any; project_name: string }> {
    const [project] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!settings.client_name || !settings.client_name.trim()) {
      throw new Error('client_name is required');
    }

    // Update settings and sync name
    await this.db
      .update(projects)
      .set({
        settings: settings,
        name: settings.client_name.trim(),
      })
      .where(eq(projects.id, projectId));

    return {
      settings,
      project_name: settings.client_name.trim(),
    };
  }

  /**
   * Get formatted AI context from project settings
   */
  async getContext(projectId: string): Promise<ProjectContext> {
    const [project] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const settings = project.settings || {};
    const hasSettings = Boolean(settings.client_name);

    return {
      formatted_context: this.formatProjectContext(settings),
      has_settings: hasSettings,
      missing_fields: this.getMissingFields(settings),
    };
  }

  /**
   * Soft delete project with cascade to related entities
   */
  async deleteProject(
    projectId: string,
    _userId: string,
    _hardDelete = false,
  ): Promise<{
    deleted_at: string;
    cascade_summary: CascadeSummary;
  }> {
    const now = new Date();

    // Soft delete documents
    const [docResult] = await this.db
      .update(documents)
      .set({ deletedAt: now })
      .where(
        and(eq(documents.projectId, projectId), isNull(documents.deletedAt)),
      )
      .returning({ count: sql`count(*)` });

    // Soft delete folders
    const [folderResult] = await this.db
      .update(folders)
      .set({ deletedAt: now })
      .where(and(eq(folders.projectId, projectId), isNull(folders.deletedAt)))
      .returning({ count: sql`count(*)` });

    // Soft delete workflow templates
    const [templateResult] = await this.db
      .update(workflowTemplates)
      .set({ deletedAt: now })
      .where(
        and(
          eq(workflowTemplates.projectId, projectId),
          isNull(workflowTemplates.deletedAt),
        ),
      )
      .returning({ count: sql`count(*)` });

    // Soft delete workflow executions
    const [executionResult] = await this.db
      .update(workflowExecutions)
      .set({ deletedAt: now })
      .where(
        and(
          eq(workflowExecutions.projectId, projectId),
          isNull(workflowExecutions.deletedAt),
        ),
      )
      .returning({ count: sql`count(*)` });

    // Hard delete user memories (no deletedAt column)
    const deletedMemories = await this.db
      .delete(userMemories)
      .where(eq(userMemories.projectId, projectId))
      .returning({ id: userMemories.id });

    // Finally, soft delete the project itself
    await this.db
      .update(projects)
      .set({ deletedAt: now })
      .where(eq(projects.id, projectId));

    return {
      deleted_at: now.toISOString(),
      cascade_summary: {
        documents_deleted: docResult?.count || 0,
        folders_deleted: folderResult?.count || 0,
        workflow_templates_deleted: templateResult?.count || 0,
        workflow_executions_deleted: executionResult?.count || 0,
        user_memories_deleted: deletedMemories?.length || 0,
      },
    };
  }

  /**
   * Get aggregated bootstrap data for project page
   */
  async getBootstrap(projectId: string, userId: string): Promise<BootstrapData> {
    // Get project
    const [project] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Verify user has access to this project's workspace
    const [membership] = await this.db
      .select()
      .from(workspaceUsers)
      .where(
        and(
          eq(workspaceUsers.workspaceId, project.workspaceId),
          eq(workspaceUsers.userId, userId),
        ),
      )
      .limit(1);

    if (!membership) {
      throw new Error('Access denied to this project');
    }

    // Get visual context assets (reference images)
    const visualAssets = await this.db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.projectId, projectId),
          eq(documents.isReferenceAsset, true),
          isNull(documents.deletedAt),
        ),
      )
      .orderBy(desc(documents.createdAt));

    const visual_context: VisualAsset[] = visualAssets.map((a: any) => ({
      id: a.id,
      project_id: a.projectId,
      name: a.title || `Asset ${a.id}`,
      file_url: a.fileUrl,
      thumbnail_url: a.thumbnailUrl,
      category: a.assetCategory,
      tags: a.assetTags || [],
      ai_description: a.aiDescription,
      is_classified: Boolean(a.assetCategory),
      created_at: a.createdAt,
      updated_at: a.updatedAt,
    }));

    // Get user memories for this project (no deletedAt column)
    const memories = await this.db
      .select()
      .from(userMemories)
      .where(
        and(
          eq(userMemories.userId, userId),
          eq(userMemories.projectId, projectId),
        ),
      )
      .orderBy(desc(userMemories.createdAt))
      .limit(10);

    const memories_response: MemoryResponse[] = memories.map((m: any) => ({
      id: m.id,
      user_id: m.userId,
      project_id: m.projectId,
      content: m.content,
      category: m.category,
      source_conversation_id: m.sourceConversationId,
      created_at: m.createdAt,
      updated_at: m.updatedAt,
    }));

    // Get recent copies (text documents)
    const recentCopies = await this.db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.projectId, projectId),
          eq(documents.isReferenceAsset, false),
          isNull(documents.deletedAt),
          eq(documents.mediaType, 'text'),
        ),
      )
      .orderBy(desc(documents.createdAt))
      .limit(10);

    // Get recent media (images, videos)
    const recentMedia = await this.db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.projectId, projectId),
          eq(documents.isReferenceAsset, false),
          isNull(documents.deletedAt),
          sql`${documents.mediaType} IN ('image', 'video')`,
        ),
      )
      .orderBy(desc(documents.createdAt))
      .limit(10);

    // Get active creative concepts
    const concepts = await this.db
      .select()
      .from(creativeConcepts)
      .where(eq(creativeConcepts.isActive, true))
      .orderBy(creativeConcepts.sortOrder);

    // Models config - stub for now
    const models: ModelsConfig = {
      text: [],
      image: [],
      default_image_model: undefined,
    };

    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        settings: project.settings,
        created_at: project.createdAt,
      },
      settings: project.settings,
      models,
      visual_context,
      memories: memories_response,
      recent_copies: this.mapDocuments(recentCopies),
      recent_media: this.mapDocuments(recentMedia),
      recent_documents: [
        ...this.mapDocuments(recentCopies),
        ...this.mapDocuments(recentMedia),
      ],
      creative_concepts: concepts.map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        thumbnail_url: c.thumbnailUrl,
        prompt_template: c.promptTemplate,
        category: c.category,
        tags: c.tags || [],
        is_active: c.isActive,
        sort_order: c.sortOrder,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
      })),
    };
  }

  /**
   * Extract colors from uploaded image - STUB
   */
  async extractColors(
    _projectId: string,
    _fileContent: Buffer,
    _nColors: number,
  ): Promise<{ colors: string[] }> {
    // TODO: Implement color extraction using sharp or similar
    // For now, return empty array
    return { colors: [] };
  }

  /**
   * Extract colors from existing asset - STUB
   */
  async extractColorsFromAsset(
    _projectId: string,
    _assetId: string,
    _nColors: number,
  ): Promise<{ colors: string[]; asset_name: string }> {
    // TODO: Implement color extraction from asset
    // For now, return empty array
    return { colors: [], asset_name: '' };
  }

  // ===== Private helper methods =====

  private mapDocuments(docs: any[]): any[] {
    return docs.map((d: any) => ({
      id: d.id,
      title: d.title,
      content: d.content,
      status: d.status,
      project_id: d.projectId,
      folder_id: d.folderId,
      media_type: d.mediaType,
      file_url: d.fileUrl,
      thumbnail_url: d.thumbnailUrl,
      generation_metadata: d.generationMetadata,
      is_reference_asset: d.isReferenceAsset,
      asset_type: d.assetType,
      created_at: d.createdAt,
      updated_at: d.updatedAt,
      deleted_at: d.deletedAt,
    }));
  }

  /**
   * Format project settings as context for AI prompts
   */
  private formatProjectContext(settings: any): string {
    if (!settings || !settings.client_name) {
      return '';
    }

    const contextParts: string[] = [];

    // Basic info
    contextParts.push(`Client/Company: ${settings.client_name}`);

    if (settings.description) {
      contextParts.push(`Project Description: ${settings.description}`);
    }

    if (settings.target_audience) {
      contextParts.push(`Target Audience: ${settings.target_audience}`);
    }

    // Brand voice
    if (settings.brand_voice) {
      const voiceLabels: Record<string, string> = {
        professional_formal: 'Professional and Formal',
        casual_friendly: 'Casual and Friendly',
        technical_precise: 'Technical and Precise',
        creative_playful: 'Creative and Playful',
        authoritative_expert: 'Authoritative and Expert',
        custom: settings.brand_voice_custom || 'Custom',
      };
      contextParts.push(
        `Brand Voice/Tone: ${voiceLabels[settings.brand_voice] || settings.brand_voice}`,
      );
    }

    // Key messages
    if (settings.key_messages && settings.key_messages.length > 0) {
      contextParts.push(`Key Messages: ${settings.key_messages.join('; ')}`);
    }

    // Competitors
    if (settings.competitors && settings.competitors.length > 0) {
      contextParts.push(`Competitors: ${settings.competitors.join(', ')}`);
    }

    // Custom notes
    if (settings.custom_notes) {
      contextParts.push(`Additional Context: ${settings.custom_notes}`);
    }

    // Brand Identity
    const brandIdentity = settings.brand_identity;
    if (brandIdentity) {
      // Color palette
      if (brandIdentity.color_palette && brandIdentity.color_palette.length > 0) {
        const colorStr = brandIdentity.color_palette.join(', ');
        contextParts.push(
          `Brand Colors: ${colorStr} (ordered by priority: primary, secondary, accent)`,
        );
      }

      // Typography
      const typography = brandIdentity.typography;
      if (typography) {
        const fonts: string[] = [];
        if (typography.primary) {
          fonts.push(`Primary/Headlines: ${typography.primary}`);
        }
        if (typography.secondary) {
          fonts.push(`Secondary/Body: ${typography.secondary}`);
        }
        if (typography.tertiary) {
          fonts.push(`Tertiary/Accents: ${typography.tertiary}`);
        }
        if (fonts.length > 0) {
          contextParts.push(`Brand Fonts: ${fonts.join('; ')}`);
        }
      }
    }

    return contextParts.join('\n');
  }

  /**
   * Get list of missing fields that would improve AI responses
   */
  private getMissingFields(settings: any): string[] {
    const missing: string[] = [];

    if (!settings) {
      return [
        'client_name',
        'description',
        'target_audience',
        'brand_voice',
        'brand_identity',
      ];
    }

    if (!settings.description) missing.push('description');
    if (!settings.target_audience) missing.push('target_audience');
    if (!settings.brand_voice) missing.push('brand_voice');
    if (!settings.key_messages) missing.push('key_messages');

    // Brand Identity
    const brandIdentity = settings.brand_identity;
    if (
      !brandIdentity ||
      (!brandIdentity.color_palette && !brandIdentity.typography)
    ) {
      missing.push('brand_identity');
    }

    return missing;
  }
}
