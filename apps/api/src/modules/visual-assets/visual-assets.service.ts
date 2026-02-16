import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module';
import {
  documents,
  assistantVisualSettings,
  assistantAssetSelection,
  assetUsageHistory,
} from '../../database/drizzle/schema';
import { OpenRouterService } from '../../integrations/openrouter/openrouter.service';
import { StorageService } from '../storage/storage.service';
import * as crypto from 'crypto';

const ALLOWED_ASSET_TYPES = ['logo', 'background', 'person', 'reference', 'other'];
const ALLOWED_CATEGORIES = ['Logo', 'Pessoa', 'Background', 'Produto', 'Referencia', 'Outro'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ASSETS_PER_PROJECT = 100;

interface UploadOptions {
  assetType?: string;
  name?: string;
  folderId?: string;
}

interface ListOptions {
  classification?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class VisualAssetsService {
  constructor(
    @Inject(DATABASE) private readonly db: any,
    private readonly openRouterService: OpenRouterService,
    private readonly storageService: StorageService,
  ) {}

  async uploadAsset(
    projectId: string,
    _userId: string,
    file: any,
    options: UploadOptions = {},
  ) {
    const { assetType = 'other', name, folderId } = options;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      );
    }

    // Validate asset type
    if (!ALLOWED_ASSET_TYPES.includes(assetType)) {
      throw new BadRequestException(
        `Invalid asset type. Must be one of: ${ALLOWED_ASSET_TYPES.join(', ')}`,
      );
    }

    // Check asset count limit
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(
        and(
          eq(documents.projectId, projectId),
          eq(documents.isReferenceAsset, true),
          isNull(documents.deletedAt),
        ),
      );

    if (Number(count) >= MAX_ASSETS_PER_PROJECT) {
      throw new BadRequestException(
        `Project has reached maximum asset limit (${MAX_ASSETS_PER_PROJECT}). Delete some assets to upload more.`,
      );
    }

    // Generate unique ID
    const assetId = crypto.randomUUID();
    const fileExt = file.originalname.split('.').pop() || 'png';

    // Upload original to R2
    const originalPath = `projects/${projectId}/assets/${assetType}/${assetId}.${fileExt}`;
    const originalUrl = await this.storageService.upload(
      originalPath,
      file.buffer,
      file.mimetype,
    );

    // Generate thumbnail (simplified - in production, use sharp or similar)
    const thumbnailPath = `projects/${projectId}/assets/${assetType}/thumbnails/${assetId}_thumb.webp`;
    const thumbnailUrl = await this.storageService.upload(
      thumbnailPath,
      file.buffer,
      'image/webp',
    );

    // Extract metadata
    const metadata = {
      dimensions: '0x0', // Would use sharp to get real dimensions
      file_size: `${(file.size / 1024).toFixed(1)}KB`,
      file_size_bytes: file.size,
      format: fileExt.toUpperCase(),
      tags: [],
    };

    // Create document record
    const [asset] = await this.db
      .insert(documents)
      .values({
        id: assetId,
        title: name || file.originalname,
        content: '',
        status: 'art_ok',
        mediaType: 'image',
        projectId,
        folderId: folderId || null,
        fileUrl: originalUrl,
        thumbnailUrl,
        isReferenceAsset: true,
        assetType,
        assetMetadata: metadata,
      })
      .returning();

    return asset;
  }

  async listAssets(projectId: string, options: ListOptions = {}) {
    const { classification, limit = 100, offset = 0 } = options;

    let query = this.db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.projectId, projectId),
          eq(documents.isReferenceAsset, true),
          isNull(documents.deletedAt),
        ),
      );

    if (classification) {
      query = query.where(eq(documents.assetCategory, classification));
    }

    query = query.orderBy(desc(documents.createdAt)).limit(limit).offset(offset);

    const assets = await query;

    // Count total
    const [{ count: total }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(
        and(
          eq(documents.projectId, projectId),
          eq(documents.isReferenceAsset, true),
          isNull(documents.deletedAt),
          classification ? eq(documents.assetCategory, classification) : undefined,
        ),
      );

    return {
      assets,
      total: Number(total),
      limit,
      offset,
    };
  }

  async getAsset(assetId: string) {
    const [asset] = await this.db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, assetId),
          eq(documents.isReferenceAsset, true),
          isNull(documents.deletedAt),
        ),
      )
      .limit(1);

    if (!asset) {
      throw new NotFoundException('Visual asset not found');
    }

    return asset;
  }

  async updateAsset(
    assetId: string,
    data: Partial<{ title: string; assetType: string; folderId: string }>,
  ) {
    await this.getAsset(assetId);

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) {
      updateData.title = data.title;
    }

    if (data.assetType !== undefined) {
      if (!ALLOWED_ASSET_TYPES.includes(data.assetType)) {
        throw new BadRequestException(
          `Invalid asset type. Must be one of: ${ALLOWED_ASSET_TYPES.join(', ')}`,
        );
      }
      updateData.assetType = data.assetType;
    }

    if (data.folderId !== undefined) {
      updateData.folderId = data.folderId || null;
    }

    const [updated] = await this.db
      .update(documents)
      .set(updateData)
      .where(eq(documents.id, assetId))
      .returning();

    return updated;
  }

  async deleteAsset(assetId: string, hard: boolean = false) {
    await this.getAsset(assetId);

    if (hard) {
      await this.db.delete(documents).where(eq(documents.id, assetId));
    } else {
      await this.db
        .update(documents)
        .set({ deletedAt: new Date() })
        .where(eq(documents.id, assetId));
    }

    return true;
  }

  async classifyAsset(assetId: string, force: boolean = false) {
    const asset = await this.getAsset(assetId);

    // Skip if already classified and not forcing
    if (
      !force &&
      asset.assetCategory &&
      asset.assetTags &&
      asset.assetTags.length > 0
    ) {
      return {
        assetId,
        category: asset.assetCategory,
        tags: asset.assetTags,
        description: asset.aiDescription,
        alreadyClassified: true,
      };
    }

    if (!asset.fileUrl) {
      throw new BadRequestException('Asset has no file URL');
    }

    // Call OpenRouter vision model for classification
    const systemPrompt = `Analyze this image and classify it into one of these categories:
- Logo: Company or brand logos
- Pessoa: Photos of people
- Background: Background images or textures
- Produto: Product photos
- Referencia: Reference images
- Outro: Other types

Also provide up to 10 descriptive tags and a brief description.

Return a JSON object with:
{
  "category": "one of the categories above",
  "tags": ["tag1", "tag2", ...],
  "description": "brief description"
}`;

    try {
      const response = await this.openRouterService.chatCompletion(
        [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Classify this image:' },
              { type: 'image_url', image_url: { url: asset.fileUrl } },
            ],
          },
        ],
        'anthropic/claude-3.5-sonnet',
        { temperature: 0.3 },
      );

      const content = response.choices[0]?.message?.content || '{}';
      const jsonMatch = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || [
        null,
        content,
      ];
      const classification = JSON.parse(jsonMatch[1]);

      // Update asset with classification
      const [_updated] = await this.db
        .update(documents)
        .set({
          assetCategory: classification.category,
          assetTags: classification.tags || [],
          aiDescription: classification.description,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, assetId))
        .returning();

      return {
        assetId,
        category: classification.category,
        tags: classification.tags || [],
        description: classification.description,
        alreadyClassified: false,
      };
    } catch (error) {
      console.error('Asset classification failed:', error);
      throw new BadRequestException('Failed to classify asset');
    }
  }

  async updateAssetMetadata(
    assetId: string,
    data: { category?: string; tags?: string[]; aiDescription?: string },
  ) {
    await this.getAsset(assetId);

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.category !== undefined) {
      if (!ALLOWED_CATEGORIES.includes(data.category)) {
        throw new BadRequestException(
          `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(', ')}`,
        );
      }
      updateData.assetCategory = data.category;
    }

    if (data.tags !== undefined) {
      updateData.assetTags = data.tags;
    }

    if (data.aiDescription !== undefined) {
      updateData.aiDescription = data.aiDescription;
    }

    const [updated] = await this.db
      .update(documents)
      .set(updateData)
      .where(eq(documents.id, assetId))
      .returning();

    return updated;
  }

  async trackUsage(assetId: string, generationId?: string) {
    await this.db.insert(assetUsageHistory).values({
      id: crypto.randomUUID(),
      assetId,
      generationId: generationId || null,
    });

    return true;
  }

  // ============================================================================
  // Visual Context Settings
  // ============================================================================

  async getOrCreateVisualSettings(projectId: string) {
    const [existing] = await this.db
      .select()
      .from(assistantVisualSettings)
      .where(eq(assistantVisualSettings.projectId, projectId))
      .limit(1);

    if (existing) {
      return existing;
    }

    // Create default settings
    const [settings] = await this.db
      .insert(assistantVisualSettings)
      .values({
        id: crypto.randomUUID(),
        projectId,
        isEnabled: false,
        mode: 'manual',
        assetsPerCategory: 2,
      })
      .returning();

    return settings;
  }

  async updateVisualSettings(
    projectId: string,
    data: {
      isEnabled?: boolean;
      mode?: 'manual' | 'auto';
      assetsPerCategory?: number;
    },
  ) {
    const settings = await this.getOrCreateVisualSettings(projectId);

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.isEnabled !== undefined) {
      updateData.isEnabled = data.isEnabled;
    }

    if (data.mode !== undefined) {
      updateData.mode = data.mode;
    }

    if (data.assetsPerCategory !== undefined) {
      if (data.assetsPerCategory < 1 || data.assetsPerCategory > 5) {
        throw new BadRequestException('assetsPerCategory must be between 1 and 5');
      }
      updateData.assetsPerCategory = data.assetsPerCategory;
    }

    const [updated] = await this.db
      .update(assistantVisualSettings)
      .set(updateData)
      .where(eq(assistantVisualSettings.id, settings.id))
      .returning();

    return updated;
  }

  async getAssetSelections(projectId: string) {
    const settings = await this.getOrCreateVisualSettings(projectId);

    const selections = await this.db
      .select()
      .from(assistantAssetSelection)
      .where(eq(assistantAssetSelection.settingsId, settings.id));

    return {
      selections,
      total: selections.length,
    };
  }

  async updateAssetSelections(projectId: string, assetIds: string[]) {
    const settings = await this.getOrCreateVisualSettings(projectId);

    // Delete existing selections
    await this.db
      .delete(assistantAssetSelection)
      .where(eq(assistantAssetSelection.settingsId, settings.id));

    // Insert new selections
    const selections = [];
    for (const assetId of assetIds) {
      const [selection] = await this.db
        .insert(assistantAssetSelection)
        .values({
          id: crypto.randomUUID(),
          settingsId: settings.id,
          assetId,
          isEnabled: true,
        })
        .returning();

      selections.push(selection);
    }

    return {
      selections,
      total: selections.length,
    };
  }

  async getVisualContext(projectId: string, limit: number = 5) {
    const settings = await this.getOrCreateVisualSettings(projectId);

    if (!settings.isEnabled) {
      return {
        enabled: false,
        assets: [],
      };
    }

    let assets = [];

    if (settings.mode === 'manual') {
      // Get manually selected assets
      const selections = await this.db
        .select()
        .from(assistantAssetSelection)
        .innerJoin(documents, eq(assistantAssetSelection.assetId, documents.id))
        .where(
          and(
            eq(assistantAssetSelection.settingsId, settings.id),
            eq(assistantAssetSelection.isEnabled, true),
          ),
        )
        .limit(limit);

      assets = selections.map((s: any) => s.documents);
    } else {
      // Auto mode: rotate assets based on usage
      assets = await this.db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.projectId, projectId),
            eq(documents.isReferenceAsset, true),
            isNull(documents.deletedAt),
          ),
        )
        .orderBy(desc(documents.createdAt))
        .limit(limit);
    }

    return {
      enabled: true,
      mode: settings.mode,
      assets,
    };
  }

  async recordAssetUsage(assetIds: string[], generationId?: string) {
    let count = 0;

    for (const assetId of assetIds) {
      try {
        await this.db.insert(assetUsageHistory).values({
          id: crypto.randomUUID(),
          assetId,
          generationId: generationId || null,
        });
        count++;
      } catch (error) {
        console.error(`Failed to record usage for asset ${assetId}:`, error);
      }
    }

    return count;
  }
}
