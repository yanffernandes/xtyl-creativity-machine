import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { inArray } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module';
import { documents } from '../../database/drizzle/schema';
import { FalAiService } from '../../integrations/fal-ai/fal-ai.service';
import { StorageService } from '../storage/storage.service';
import { PromptEnrichmentService } from './prompt-enrichment.service';
import { ImageGenerationService } from './image-generation.service';
import { AdminService } from '../admin/admin.service';

/**
 * Image Generation Processor
 *
 * BullMQ worker that processes async image generation jobs.
 * Handles batch generation with concurrent processing (max 3 concurrent jobs).
 *
 * Migration from: backend/routers/image_generation.py (generate_batch_variation function)
 */
@Processor('image-generation', { concurrency: 3 })
@Injectable()
export class ImageGenerationProcessor extends WorkerHost {
  constructor(
    @Inject(DATABASE) private readonly db: any,
    private readonly falAiService: FalAiService,
    private readonly storageService: StorageService,
    private readonly promptEnrichmentService: PromptEnrichmentService,
    private readonly imageGenerationService: ImageGenerationService,
    private readonly adminService: AdminService,
  ) {
    super();
  }

  /**
   * Process a single variation job from the queue.
   *
   * Job data:
   * - batchId: string
   * - variationIndex: number
   * - prompt: string
   * - project_id: string
   * - model: string
   * - aspect_ratio: string
   * - creativity: number
   * - creative_concept?: string (concept slug)
   * - reference_assets?: string[]
   * - apply_brand_context?: boolean
   * - campaign_id?: string
   * - tags?: string[]
   * - channel?: string
   * - userId: string
   */
  async process(job: Job): Promise<any> {
    const {
      batchId,
      variationIndex,
      prompt,
      project_id,
      model,
      aspect_ratio,
      creativity,
      apply_brand_context = true,
      campaign_id,
      tags = [],
      channel,
      reference_asset_modes = [],
    } = job.data;

    try {
      await this.imageGenerationService.updateBatchProgress(batchId, {
        started: {
          index: variationIndex,
          total_variations: job.data.count || undefined,
        },
      });

      // Build style modifier based on creativity level and variation index
      const styleModifier = this.buildStyleModifier(variationIndex, creativity);

      // Enrich prompt if brand context is enabled
      let enrichedPrompt = prompt;
      if (apply_brand_context) {
        enrichedPrompt = await this.promptEnrichmentService.enrichPrompt(
          prompt,
          project_id,
        );
      }

      // Resolve visual context assets
      let imageUrls: string[] = [];
      let effectiveModel = model;

      if (reference_asset_modes.length > 0) {
        const assetIds: string[] = reference_asset_modes.map((a: any) => a.id);

        const assetRecords = await this.db
          .select({
            id: documents.id,
            title: documents.title,
            fileUrl: documents.fileUrl,
            aiDescription: documents.aiDescription,
            assetCategory: documents.assetCategory,
            assetTags: documents.assetTags,
          })
          .from(documents)
          .where(inArray(documents.id, assetIds));

        // Merge mode into each asset record
        const assetsWithModes = reference_asset_modes
          .map((am: any) => {
            const record = assetRecords.find((r: any) => r.id === am.id);
            return record ? { ...record, mode: am.mode } : null;
          })
          .filter((a: any): a is NonNullable<typeof a> => a !== null && !!a.fileUrl);

        // Enrich prompt with visual context instructions
        const visualContextAddition =
          this.promptEnrichmentService.buildVisualContextAddition(assetsWithModes);
        if (visualContextAddition) {
          enrichedPrompt = `${enrichedPrompt}. ${visualContextAddition}`;
        }

        // Collect image URLs for base/compose assets (need image-to-image model)
        imageUrls = assetsWithModes
          .filter((a: any) => a.mode === 'base' || a.mode === 'compose')
          .map((a: any) => a.fileUrl as string);

        // Auto-switch to edit model if we have reference images
        // editModelId is stored in system_config per model — no hardcoded mapping
        if (imageUrls.length > 0) {
          const baseModelConfig = await this.adminService.getEnabledImageModelConfig(model);
          const editModelId = baseModelConfig?.editModelId ?? model;
          if (editModelId !== model) {
            effectiveModel = editModelId;

            // Emit model_switched event only once (first variation)
            if (variationIndex === 0) {
              await this.imageGenerationService.updateBatchProgress(batchId, {
                model_switched: {
                  index: variationIndex,
                  original_model: model,
                  new_model: editModelId,
                },
              });
            }
          }
        }
      }

      // Combine prompt with style modifier
      const rawPrompt = `${enrichedPrompt}. ${styleModifier}`;

      // LLM refinement: polish the assembled prompt into coherent prose if model is configured
      const modelConfigForEnrichment = await this.adminService.getModelConfig();
      const enrichmentModelId: string = modelConfigForEnrichment?.defaults?.prompt_enrichment || '';
      const finalPrompt = enrichmentModelId
        ? await this.promptEnrichmentService.refineWithLLM(rawPrompt, enrichmentModelId)
        : rawPrompt;

      // Read model capabilities from system_config (DB-driven, no hardcoding)
      const modelConfig = await this.adminService.getEnabledImageModelConfig(effectiveModel);
      const falParams: Record<string, unknown> = {
        aspect_ratio,
        num_images: 1,
        ...(modelConfig?.supportsQuality && modelConfig.qualityValue && { quality: modelConfig.qualityValue }),
        ...(modelConfig?.supportsResolution && modelConfig.resolutionValue && { resolution: modelConfig.resolutionValue }),
      };

      // Apply negative prompt if model supports it
      const DEFAULT_NEGATIVE_PROMPT =
        'blurry, low quality, distorted, watermark, text artifacts, oversaturated, noisy, pixelated, bad anatomy, ugly, duplicate';
      const negativePrompt: string = job.data.negative_prompt || DEFAULT_NEGATIVE_PROMPT;
      if (modelConfig?.supportsNegativePrompt && negativePrompt) {
        falParams.negative_prompt = negativePrompt;
      }

      // Generate image via fal.ai
      const result = await this.falAiService.generateImage({
        prompt: finalPrompt,
        modelId: effectiveModel,
        params: falParams,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      });

      // Extract image URL
      const imageUrl = this.extractImageUrl(result);
      if (!imageUrl) {
        throw new Error('No image returned from fal.ai');
      }

      // Download and store image in R2
      const response = await fetch(imageUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      const key = `projects/${project_id}/images/batch_${batchId}_${variationIndex}_${randomUUID()}.png`;
      const fileUrl = await this.storageService.upload(key, buffer, 'image/png');
      const thumbnailUrl = fileUrl; // Use same URL for now

      // Create document record
      const documentId = randomUUID();
      const title = `${prompt.substring(0, 50)} - Variation ${variationIndex + 1}`;

      await this.db.insert(documents).values({
        id: documentId,
        title,
        content: prompt,
        mediaType: 'image',
        status: 'art_ok',
        projectId: project_id,
        fileUrl,
        thumbnailUrl,
        generationMetadata: {
          prompt,
          raw_enriched_prompt: rawPrompt,
          enriched_prompt: finalPrompt,
          model: effectiveModel,
          original_model: effectiveModel !== model ? model : undefined,
          aspect_ratio,
          style_modifier: styleModifier,
          batch_id: batchId,
          variation_index: variationIndex,
          visual_assets_applied: reference_asset_modes.length > 0,
          quality_param_sent: modelConfig?.supportsQuality ? modelConfig.qualityValue : null,
          resolution_param_sent: modelConfig?.supportsResolution ? modelConfig.resolutionValue : null,
          negative_prompt_applied: modelConfig?.supportsNegativePrompt ?? false,
        },
        campaignId: campaign_id || null,
        tags: tags || [],
        channel: channel || null,
        variationSetId: batchId,
        variationIndex,
        variationModifier: styleModifier,
      });

      // Update batch progress
      await this.imageGenerationService.updateBatchProgress(batchId, {
        completed: 1,
        enriched_prompt: finalPrompt,
        image: {
          index: variationIndex,
          document_id: documentId,
          file_url: fileUrl,
          thumbnail_url: thumbnailUrl,
          title,
          modifier: styleModifier,
        },
      });

      return {
        success: true,
        index: variationIndex,
        document_id: documentId,
        file_url: fileUrl,
        thumbnail_url: thumbnailUrl,
        title,
        modifier: styleModifier,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Batch variation ${variationIndex} failed:`, error);

      // Update batch progress with failure
      await this.imageGenerationService.updateBatchProgress(batchId, {
        failed: 1,
        error: {
          index: variationIndex,
          error: errorMessage,
        },
      });

      return {
        success: false,
        index: variationIndex,
        error: errorMessage,
      };
    }
  }

  /**
   * Build style modifier based on variation index and creativity level.
   * Maps creativity 0-100 to a 4×4 matrix (bucket × index).
   */
  private buildStyleModifier(index: number, creativity: number): string {
    // Map creativity 0-100 to bucket 0-3
    const creativityBucket = Math.min(3, Math.floor((creativity / 100) * 4));

    const modifierMatrix: string[][] = [
      // bucket 0 — low creativity (0–24)
      [
        'faithful to the original concept, exact style match',
        'faithful composition with subtle color variation',
        'faithful style with minor framing adjustment',
        'true to the original with mood adaptation only',
      ],
      // bucket 1 — medium-low (25–49)
      [
        'faithful composition with a subtle creative flourish',
        'largely faithful with expressive lighting treatment',
        'moderate stylistic variation on the core concept',
        'faithful base with artistic color grading',
      ],
      // bucket 2 — medium-high (50–74)
      [
        'creative interpretation with strong visual identity',
        'bold composition maintaining concept intent',
        'expressive stylistic approach with artistic freedom',
        'experimental color grade and framing',
      ],
      // bucket 3 — high creativity (75–100)
      [
        'bold creative reimagination of the concept',
        'avant-garde composition with full artistic license',
        'dramatic stylistic departure, abstract expression',
        'radical artistic reinterpretation',
      ],
    ];

    const row = modifierMatrix[creativityBucket] ?? modifierMatrix[1];
    return row[Math.min(index, row.length - 1)];
  }

  /**
   * Extract image URL from fal.ai result.
   */
  private extractImageUrl(result: any): string | null {
    if (result.images && result.images.length > 0) {
      return result.images[0].url || result.images[0];
    }
    if (result.image && result.image.url) {
      return result.image.url;
    }
    if (result.output && result.output.url) {
      return result.output.url;
    }
    return null;
  }
}
