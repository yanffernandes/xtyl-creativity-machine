import { Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { Jimp, intToRGBA } from 'jimp';
import { DATABASE } from '../../database/database.module';
import {
  projects,
  documents,
  workflowTemplates,
  creativeConcepts,
  workspaceUsers,
  folders,
  workflowExecutions,
  systemConfig,
} from '../../database/drizzle/schema';
import { OpenRouterService } from '../../integrations/openrouter';
import { ImageGenerationService } from '../image-generation/image-generation.service';
import type {
  ProjectSettingsUpdate,
  ProjectContext,
  CascadeSummary,
  BootstrapData,
  VisualAsset,
  ModelsConfig,
  ProjectBootstrapQuery,
} from './projects.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(DATABASE) private readonly db: any,
    private readonly openRouterService: OpenRouterService,
    private readonly imageGenerationService: ImageGenerationService,
  ) {}

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
    userId: string,
    _hardDelete = false,
  ): Promise<{
    deleted_at: string;
    cascade_summary: CascadeSummary;
  }> {
    const now = new Date();
    const [project] = await this.db
      .select({
        id: projects.id,
        workspaceId: projects.workspaceId,
      })
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const [membership] = await this.db
      .select({
        role: workspaceUsers.role,
      })
      .from(workspaceUsers)
      .where(
        and(
          eq(workspaceUsers.workspaceId, project.workspaceId),
          eq(workspaceUsers.userId, userId),
        ),
      )
      .limit(1);

    if (!membership || !['owner', 'admin'].includes(membership.role || '')) {
      throw new ForbiddenException(
        'Only workspace owners or admins can delete projects',
      );
    }

    // Count then soft delete documents
    const [{ docCount }] = await this.db
      .select({ docCount: sql<number>`count(*)` })
      .from(documents)
      .where(and(eq(documents.projectId, projectId), isNull(documents.deletedAt)));
    await this.db
      .update(documents)
      .set({ deletedAt: now })
      .where(and(eq(documents.projectId, projectId), isNull(documents.deletedAt)));

    // Count then soft delete folders
    const [{ folderCount }] = await this.db
      .select({ folderCount: sql<number>`count(*)` })
      .from(folders)
      .where(and(eq(folders.projectId, projectId), isNull(folders.deletedAt)));
    await this.db
      .update(folders)
      .set({ deletedAt: now })
      .where(and(eq(folders.projectId, projectId), isNull(folders.deletedAt)));

    // Count then soft delete workflow templates
    const [{ templateCount }] = await this.db
      .select({ templateCount: sql<number>`count(*)` })
      .from(workflowTemplates)
      .where(and(eq(workflowTemplates.projectId, projectId), isNull(workflowTemplates.deletedAt)));
    await this.db
      .update(workflowTemplates)
      .set({ deletedAt: now })
      .where(and(eq(workflowTemplates.projectId, projectId), isNull(workflowTemplates.deletedAt)));

    // Count then soft delete workflow executions
    const [{ executionCount }] = await this.db
      .select({ executionCount: sql<number>`count(*)` })
      .from(workflowExecutions)
      .where(and(eq(workflowExecutions.projectId, projectId), isNull(workflowExecutions.deletedAt)));
    await this.db
      .update(workflowExecutions)
      .set({ deletedAt: now })
      .where(and(eq(workflowExecutions.projectId, projectId), isNull(workflowExecutions.deletedAt)));

    // Finally, soft delete the project itself
    await this.db
      .update(projects)
      .set({ deletedAt: now })
      .where(eq(projects.id, projectId));

    return {
      deleted_at: now.toISOString(),
      cascade_summary: {
        documents_deleted: Number(docCount) || 0,
        folders_deleted: Number(folderCount) || 0,
        workflow_templates_deleted: Number(templateCount) || 0,
        workflow_executions_deleted: Number(executionCount) || 0,
      },
    };
  }

  /**
   * Get aggregated bootstrap data for project page
   */
  async getBootstrap(
    projectId: string,
    userId: string,
    query?: ProjectBootstrapQuery,
  ): Promise<BootstrapData> {
    const options = this.normalizeBootstrapQuery(query);

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

    const models = await this.getBootstrapModels(options.include_models);

    let visual_context: VisualAsset[] = [];
    if (options.include_visual_context) {
      let visualAssetsQuery = this.db
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

      if (options.visual_context_limit > 0) {
        visualAssetsQuery = visualAssetsQuery.limit(options.visual_context_limit);
      }

      const visualAssets = await visualAssetsQuery;
      visual_context = visualAssets.map((a: any) => ({
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
    }

    let recentCopies: any[] = [];
    if (options.include_recent_copies && options.recent_copies_limit > 0) {
      recentCopies = await this.db
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
        .limit(options.recent_copies_limit);
    }

    let recentMedia: any[] = [];
    if (options.include_recent_media && options.recent_media_limit > 0) {
      recentMedia = await this.db
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
        .limit(options.recent_media_limit);
    }

    let concepts: any[] = [];
    if (options.include_creative_concepts) {
      concepts = await this.db
        .select()
        .from(creativeConcepts)
        .where(eq(creativeConcepts.isActive, true))
        .orderBy(creativeConcepts.sortOrder);
    }

    const mappedCopies = this.mapDocuments(recentCopies).map((doc) =>
      options.include_copy_content ? doc : { ...doc, content: null },
    );
    const mappedMedia = this.mapDocuments(recentMedia);

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
      recent_copies: mappedCopies,
      recent_media: mappedMedia,
      recent_documents: [
        ...mappedCopies,
        ...mappedMedia,
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
   * Extract colors from uploaded image.
   */
  async extractColors(
    _projectId: string,
    fileContent: Buffer,
    nColors: number,
  ): Promise<{
    colors: string[];
    processing_time_ms: number;
    message: string | null;
  }> {
    const startedAt = Date.now();
    const colors = await this.extractDominantColors(fileContent, nColors);

    return {
      colors,
      processing_time_ms: Date.now() - startedAt,
      message:
        colors.length < 3
          ? 'Limited colors found - image may be monochrome or low-contrast'
          : null,
    };
  }

  /**
   * Extract colors from existing asset.
   */
  async extractColorsFromAsset(
    projectId: string,
    assetId: string,
    nColors: number,
  ): Promise<{
    colors: string[];
    asset_name: string;
    processing_time_ms: number;
    message: string | null;
  }> {
    const [asset] = await this.db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, assetId),
          eq(documents.projectId, projectId),
          isNull(documents.deletedAt),
        ),
      )
      .limit(1);

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    if (!asset.fileUrl) {
      throw new BadRequestException('Asset does not have a file URL');
    }

    const response = await fetch(asset.fileUrl);
    if (!response.ok) {
      throw new BadRequestException('Unable to fetch asset image');
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const result = await this.extractColors(projectId, buffer, nColors);

    return {
      colors: result.colors,
      asset_name: asset.title || 'Asset',
      processing_time_ms: result.processing_time_ms,
      message: result.message,
    };
  }

  // ===== Private helper methods =====

  private normalizeBootstrapQuery(query?: ProjectBootstrapQuery) {
    return {
      include_models: this.parseBoolean(query?.include_models, true),
      include_visual_context: this.parseBoolean(
        query?.include_visual_context,
        true,
      ),
      include_recent_copies: this.parseBoolean(
        query?.include_recent_copies,
        true,
      ),
      include_recent_media: this.parseBoolean(
        query?.include_recent_media,
        true,
      ),
      include_copy_content: this.parseBoolean(
        query?.include_copy_content,
        true,
      ),
      include_creative_concepts: this.parseBoolean(
        query?.include_creative_concepts,
        true,
      ),
      recent_copies_limit: this.parseInteger(query?.recent_copies_limit, 10, 0, 50),
      recent_media_limit: this.parseInteger(query?.recent_media_limit, 10, 0, 100),
      visual_context_limit: this.parseInteger(
        query?.visual_context_limit,
        0,
        0,
        500,
      ),
    };
  }

  private parseBoolean(
    value: boolean | string | undefined,
    defaultValue: boolean,
  ): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(normalized)) {
        return true;
      }
      if (['false', '0', 'no', 'off'].includes(normalized)) {
        return false;
      }
    }
    return defaultValue;
  }

  private parseInteger(
    value: number | string | undefined,
    defaultValue: number,
    min: number,
    max: number,
  ): number {
    const parsed =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? parseInt(value, 10)
          : Number.NaN;

    if (!Number.isFinite(parsed)) {
      return defaultValue;
    }

    return Math.min(Math.max(parsed, min), max);
  }

  private async getBootstrapModels(includeModels: boolean): Promise<ModelsConfig> {
    const configs = await this.db
      .select({
        key: systemConfig.key,
        value: systemConfig.value,
      })
      .from(systemConfig)
      .where(
        sql`${systemConfig.key} IN ('ai_models', 'model_defaults', 'visible_text_models', 'visible_image_models')`,
      );

    let defaultImageModel: string | undefined;
    let visibleTextModels: string[] = [];
    let visibleImageModels: string[] = [];

    for (const config of configs) {
      if (config.key === 'ai_models') {
        const defaults = (config.value as any)?.defaults;
        if (typeof defaults?.image_generation === 'string') {
          defaultImageModel = defaults.image_generation;
        }
      } else if (config.key === 'model_defaults') {
        const defaults = config.value as Record<string, unknown>;
        if (
          !defaultImageModel &&
          typeof defaults?.image_generation === 'string'
        ) {
          defaultImageModel = defaults.image_generation;
        }
      } else if (
        config.key === 'visible_text_models' &&
        Array.isArray(config.value)
      ) {
        visibleTextModels = config.value.filter(
          (modelId: unknown): modelId is string => typeof modelId === 'string',
        );
      } else if (
        config.key === 'visible_image_models' &&
        Array.isArray(config.value)
      ) {
        visibleImageModels = config.value.filter(
          (modelId: unknown): modelId is string => typeof modelId === 'string',
        );
      }
    }

    if (!includeModels) {
      return {
        text: [],
        image: [],
        default_image_model: defaultImageModel,
      };
    }

    const [textModelsResult, imageModelsResult] = await Promise.allSettled([
      this.openRouterService.listModels(),
      this.imageGenerationService.listModels('text-to-image'),
    ]);

    const textModels =
      textModelsResult.status === 'fulfilled'
        ? textModelsResult.value
            .filter(
              (model: any) =>
                visibleTextModels.length === 0 ||
                visibleTextModels.includes(model.id),
            )
            .map((model: any) => ({
              id: model.id,
              name: model.name || model.id,
              description: model.description,
              top_provider:
                model.top_provider ||
                (typeof model.id === 'string' ? model.id.split('/')[0] : undefined),
              output_modalities: ['text'],
            }))
        : [];

    const imageModels =
      imageModelsResult.status === 'fulfilled'
        ? imageModelsResult.value
            .filter(
              (model: any) =>
                visibleImageModels.length === 0 ||
                visibleImageModels.includes(model.id),
            )
            .map((model: any) => ({
              id: model.id,
              name: model.name || model.id,
              description: model.description,
              top_provider: model.top_provider,
              output_modalities: ['image'],
            }))
        : [];

    return {
      text: textModels,
      image: imageModels,
      default_image_model: defaultImageModel || imageModels[0]?.id,
    };
  }

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

  private async extractDominantColors(
    fileContent: Buffer,
    requestedColors: number,
  ): Promise<string[]> {
    const nColors = Math.max(1, Math.min(requestedColors || 6, 6));
    const image = await Jimp.read(fileContent);
    image.scaleToFit({ w: 150, h: 150 });

    const pixels: Array<[number, number, number]> = [];
    const step = Math.max(1, Math.floor(Math.max(image.bitmap.width, image.bitmap.height) / 75));

    for (let y = 0; y < image.bitmap.height; y += step) {
      for (let x = 0; x < image.bitmap.width; x += step) {
        const rgba = intToRGBA(image.getPixelColor(x, y));
        if (rgba.a < 128) continue;

        const brightness = (rgba.r + rgba.g + rgba.b) / 3;
        if (brightness <= 15 || brightness >= 245) continue;

        pixels.push([rgba.r, rgba.g, rgba.b]);
      }
    }

    const sampledPixels = pixels.length > 0 ? pixels : [[255, 255, 255]];
    const initialCentroids = sampledPixels
      .slice(0, nColors)
      .map((pixel) => [...pixel] as [number, number, number]);

    while (initialCentroids.length < nColors) {
      initialCentroids.push([
        ...sampledPixels[initialCentroids.length % sampledPixels.length],
      ] as [number, number, number]);
    }

    let centroids = initialCentroids;

    for (let iteration = 0; iteration < 8; iteration += 1) {
      const groups = centroids.map(() => ({
        total: [0, 0, 0],
        count: 0,
      }));

      for (const pixel of sampledPixels) {
        let closestIndex = 0;
        let closestDistance = Number.POSITIVE_INFINITY;

        for (let index = 0; index < centroids.length; index += 1) {
          const centroid = centroids[index];
          const distance =
            (pixel[0] - centroid[0]) ** 2 +
            (pixel[1] - centroid[1]) ** 2 +
            (pixel[2] - centroid[2]) ** 2;

          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        }

        groups[closestIndex].total[0] += pixel[0];
        groups[closestIndex].total[1] += pixel[1];
        groups[closestIndex].total[2] += pixel[2];
        groups[closestIndex].count += 1;
      }

      centroids = centroids.map((centroid, index) => {
        const group = groups[index];
        if (group.count === 0) {
          return centroid;
        }

        return [
          Math.round(group.total[0] / group.count),
          Math.round(group.total[1] / group.count),
          Math.round(group.total[2] / group.count),
        ] as [number, number, number];
      });
    }

    const ranked = centroids
      .map((centroid) => ({
        centroid,
        count: sampledPixels.filter((pixel) => {
          const distance =
            (pixel[0] - centroid[0]) ** 2 +
            (pixel[1] - centroid[1]) ** 2 +
            (pixel[2] - centroid[2]) ** 2;
          return distance < 2500;
        }).length,
      }))
      .sort((a, b) => b.count - a.count);

    return ranked
      .slice(0, nColors)
      .map(({ centroid }) =>
        `#${centroid
          .map((value) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0'))
          .join('')
          .toUpperCase()}`,
      );
  }
}
