import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DATABASE } from '../../database/database.module';
import { documents } from '../../database/drizzle/schema';
import { FalAiService } from '../../integrations/fal-ai/fal-ai.service';
import { StorageService } from '../storage/storage.service';
import { PromptEnrichmentService } from './prompt-enrichment.service';
import { ImageGenerationService } from './image-generation.service';

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

      // Combine prompt with style modifier
      const finalPrompt = `${enrichedPrompt}. ${styleModifier}`;

      // Build fal.ai params
      const falParams = {
        aspect_ratio,
        num_images: 1,
      };

      // Generate image via fal.ai
      const result = await this.falAiService.generateImage({
        prompt: finalPrompt,
        modelId: model,
        params: falParams,
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
          model,
          aspect_ratio,
          style_modifier: styleModifier,
          batch_id: batchId,
          variation_index: variationIndex,
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
   */
  private buildStyleModifier(index: number, _creativity: number): string {
    const creativityModifiers = [
      'faithful to the original concept',
      'with subtle creative variations',
      'with moderate artistic interpretation',
      'with bold creative expression',
    ];

    const creativityIdx = Math.min(index, creativityModifiers.length - 1);
    return creativityModifiers[creativityIdx];
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
