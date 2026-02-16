import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Observable } from 'rxjs';
import { eq, and, isNull } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module';
import { documents, creativeConcepts, projects } from '../../database/drizzle/schema';
import { FalAiService } from '../../integrations/fal-ai/fal-ai.service';
import { StorageService } from '../storage/storage.service';
import { PromptEnrichmentService } from './prompt-enrichment.service';
import { randomUUID } from 'crypto';

/**
 * Image Generation Service
 *
 * Core business logic for AI-powered image generation and editing.
 * Handles single generation, batch operations, and various image utilities.
 *
 * Migration from: backend/routers/image_generation.py + backend/image_generation_service.py
 */
@Injectable()
export class ImageGenerationService {
  private batchProgressStore = new Map<string, any>(); // In-memory fallback for batch progress

  constructor(
    @Inject(DATABASE) private readonly db: any,
    private readonly falAiService: FalAiService,
    private readonly storageService: StorageService,
    private readonly promptEnrichmentService: PromptEnrichmentService,
    @InjectQueue('image-generation') private readonly imageQueue: Queue,
  ) {}

  /**
   * List available image generation models.
   * Returns hardcoded fal.ai models (follows CLAUDE.md "No Hardcoded Data" principle
   * but these are API endpoints, not dynamic data).
   */
  async listModels(modelType?: string) {
    const allModels = [
      // Text-to-image models
      {
        id: 'fal-ai/flux-pro/v1.1',
        name: 'FLUX Pro 1.1',
        description: 'State-of-the-art image generation with best quality',
        top_provider: 'fal.ai',
        model_type: 'text-to-image',
        supports_mask: false,
        max_images: 4,
        default_params: { aspect_ratio: '1:1' },
      },
      {
        id: 'fal-ai/flux-pro/v1.1-ultra',
        name: 'FLUX Pro 1.1 Ultra',
        description: 'Ultra-high quality image generation',
        top_provider: 'fal.ai',
        model_type: 'text-to-image',
        supports_mask: false,
        max_images: 4,
        default_params: { aspect_ratio: '1:1' },
      },
      {
        id: 'fal-ai/flux/dev',
        name: 'FLUX Dev',
        description: 'Fast and efficient open-source image generation',
        top_provider: 'fal.ai',
        model_type: 'text-to-image',
        supports_mask: false,
        max_images: 4,
        default_params: { aspect_ratio: '1:1' },
      },
      {
        id: 'fal-ai/flux/schnell',
        name: 'FLUX Schnell',
        description: 'Ultra-fast image generation (4 steps)',
        top_provider: 'fal.ai',
        model_type: 'text-to-image',
        supports_mask: false,
        max_images: 4,
        default_params: { aspect_ratio: '1:1' },
      },
      // Image-to-image / editing models
      {
        id: 'fal-ai/flux-pro/v1/fill',
        name: 'FLUX Fill Pro',
        description: 'Precise inpainting with mask-based editing',
        top_provider: 'fal.ai',
        model_type: 'image-to-image',
        supports_mask: true,
        max_images: 1,
        default_params: {},
      },
      {
        id: 'fal-ai/flux-pro/kontext',
        name: 'FLUX Kontext',
        description: 'Natural language image editing',
        top_provider: 'fal.ai',
        model_type: 'image-to-image',
        supports_mask: false,
        max_images: 1,
        default_params: {},
      },
      {
        id: 'fal-ai/gpt-image-1.5/edit',
        name: 'GPT-Image 1.5 Edit',
        description: 'Instruction-based image editing (supports mask)',
        top_provider: 'fal.ai',
        model_type: 'image-to-image',
        supports_mask: true,
        max_images: 1,
        default_params: {},
      },
      {
        id: 'fal-ai/flux-realism',
        name: 'FLUX Realism',
        description: 'Photorealistic image generation',
        top_provider: 'fal.ai',
        model_type: 'text-to-image',
        supports_mask: false,
        max_images: 4,
        default_params: { aspect_ratio: '1:1' },
      },
      // Utility models
      {
        id: 'fal-ai/bria-rmbg-2.0',
        name: 'BRIA RMBG 2.0',
        description: 'State-of-the-art background removal',
        top_provider: 'fal.ai',
        model_type: 'utility',
        supports_mask: false,
        max_images: 1,
        default_params: {},
      },
      {
        id: 'fal-ai/clarity-upscaler',
        name: 'Clarity Upscaler',
        description: 'High-quality image upscaling up to 4x',
        top_provider: 'fal.ai',
        model_type: 'utility',
        supports_mask: false,
        max_images: 1,
        default_params: {},
      },
    ];

    // Filter by model type if specified
    if (modelType === 'text-to-image') {
      return allModels.filter((m) => m.model_type === 'text-to-image');
    } else if (modelType === 'image-to-image') {
      return allModels.filter((m) => m.model_type === 'image-to-image');
    }

    return allModels;
  }

  /**
   * Generate a single image from text prompt.
   * Creates a document record with media_type='image'.
   */
  async generate(params: any, _userId: string) {
    const {
      prompt,
      project_id,
      model = 'fal-ai/flux-pro/v1.1',
      aspect_ratio = '1:1',
      quality = 'standard',
      creative_concept_id
    } = params;

    // Verify project exists
    const project = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, project_id), isNull(projects.deletedAt)))
      .limit(1);

    if (!project || project.length === 0) {
      throw new NotFoundException('Project not found');
    }

    // Enrich prompt with creative concept if provided
    let enrichedPrompt = prompt;
    if (creative_concept_id) {
      const concept = await this.db
        .select()
        .from(creativeConcepts)
        .where(eq(creativeConcepts.id, creative_concept_id))
        .limit(1);

      if (concept && concept.length > 0) {
        enrichedPrompt = await this.promptEnrichmentService.enrichPrompt(
          prompt,
          project_id,
          concept[0],
        );
      }
    }

    // Build params for fal.ai
    const falParams = {
      aspect_ratio,
      num_images: 1,
    };

    // Generate image via fal.ai
    const result = await this.falAiService.generateImage({
      prompt: enrichedPrompt,
      modelId: model,
      params: falParams,
    });

    // Extract image URL from result
    const imageUrl = this.extractImageUrl(result);
    if (!imageUrl) {
      throw new BadRequestException('No image returned from fal.ai');
    }

    // Download and store image in R2
    const fileUrl = await this.downloadAndStoreImage(imageUrl, project_id, 'generated');

    // Create document record
    const documentId = randomUUID();
    const title = `Generated: ${prompt.substring(0, 50)}...`;

    await this.db.insert(documents).values({
      id: documentId,
      title,
      content: prompt,
      mediaType: 'image',
      status: 'art_ok',
      projectId: project_id,
      fileUrl,
      thumbnailUrl: fileUrl,
      generationMetadata: {
        prompt,
        model,
        aspect_ratio,
        quality,
        creative_concept_id,
        generated_at: new Date().toISOString(),
      },
    });

    return {
      document_id: documentId,
      file_url: fileUrl,
      thumbnail_url: fileUrl,
      title,
      generation_metadata: {
        prompt,
        model,
        aspect_ratio,
        quality,
      },
    };
  }

  /**
   * Generate batch of image variations (async).
   * Returns batch_id immediately, queues jobs for BullMQ processing.
   */
  async generateBatch(params: any, userId: string) {
    const {
      prompt,
      project_id,
      count = 4,
      model = 'fal-ai/flux-pro/v1.1',
      aspect_ratio = '1:1',
      creativity = 0.5,
      creative_concept,
      reference_assets = [],
      apply_brand_context = true,
      campaign_id,
      tags = [],
      channel,
    } = params;

    // Verify project exists
    const project = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, project_id), isNull(projects.deletedAt)))
      .limit(1);

    if (!project || project.length === 0) {
      throw new NotFoundException('Project not found');
    }

    // Generate batch ID
    const batchId = randomUUID();

    // Initialize batch progress in memory
    this.batchProgressStore.set(batchId, {
      batch_id: batchId,
      total: count,
      completed: 0,
      failed: 0,
      images: [],
      errors: [],
      status: 'processing',
    });

    // Queue batch jobs
    for (let i = 0; i < count; i++) {
      await this.imageQueue.add('generate-variation', {
        batchId,
        variationIndex: i,
        prompt,
        project_id,
        model,
        aspect_ratio,
        creativity,
        creative_concept,
        reference_assets,
        apply_brand_context,
        campaign_id,
        tags,
        channel,
        userId,
      });
    }

    return {
      batch_id: batchId,
      status: 'processing',
      message: `Generating ${count} variations`,
    };
  }

  /**
   * Stream batch generation progress via SSE.
   */
  streamBatchProgress(batchId: string, _token: string): Observable<any> {
    return new Observable((subscriber) => {
      const interval = setInterval(() => {
        const progress = this.batchProgressStore.get(batchId);

        if (!progress) {
          subscriber.next({ data: { type: 'error', message: 'Batch not found' } });
          subscriber.complete();
          clearInterval(interval);
          return;
        }

        // Send progress update
        subscriber.next({
          data: {
            type: 'progress',
            batch_id: batchId,
            total: progress.total,
            completed: progress.completed,
            failed: progress.failed,
          },
        });

        // Check if complete
        if (progress.completed + progress.failed >= progress.total) {
          subscriber.next({
            data: {
              type: 'batch_complete',
              batch_id: batchId,
              total: progress.total,
              completed: progress.completed,
              failed: progress.failed,
              images: progress.images,
            },
          });
          subscriber.complete();
          clearInterval(interval);
          // Clean up
          this.batchProgressStore.delete(batchId);
        }
      }, 500); // Poll every 500ms

      // Cleanup on unsubscribe
      return () => clearInterval(interval);
    });
  }

  /**
   * Get batch status (polling alternative to SSE).
   */
  async getBatchStatus(batchId: string, _userId: string) {
    const progress = this.batchProgressStore.get(batchId);

    if (!progress) {
      throw new NotFoundException('Batch not found or already completed');
    }

    return progress;
  }

  /**
   * Generate variations of existing image (image-to-image).
   */
  async generateVariations(params: any, _userId: string) {
    const {
      image_url,
      prompt,
      count = 3,
      project_id,
      model = 'fal-ai/flux-pro/kontext',
    } = params;

    // Similar to generate() but with image_urls parameter
    const result = await this.falAiService.generateImage({
      prompt,
      modelId: model,
      imageUrls: [image_url],
      params: { num_images: count },
    });

    const imageUrl = this.extractImageUrl(result);
    if (!imageUrl) {
      throw new BadRequestException('No image returned from fal.ai');
    }

    const fileUrl = await this.downloadAndStoreImage(imageUrl, project_id, 'variation');

    const documentId = randomUUID();
    await this.db.insert(documents).values({
      id: documentId,
      title: `Variation: ${prompt.substring(0, 50)}`,
      content: prompt,
      mediaType: 'image',
      status: 'art_ok',
      projectId: project_id,
      fileUrl,
      thumbnailUrl: fileUrl,
      generationMetadata: {
        prompt,
        model,
        operation_type: 'variation',
        base_image: image_url,
      },
    });

    return {
      document_id: documentId,
      file_url: fileUrl,
      thumbnail_url: fileUrl,
    };
  }

  /**
   * Edit image with natural language instructions.
   */
  async editImage(params: any, _userId: string) {
    const {
      image_url,
      prompt,
      project_id,
      model = 'fal-ai/flux-pro/kontext',
      guidance_scale = 7.5,
    } = params;

    const startTime = Date.now();

    const result = await this.falAiService.generateImage({
      prompt,
      modelId: model,
      imageUrls: [image_url],
      params: { guidance_scale },
    });

    const resultImageUrl = this.extractImageUrl(result);
    if (!resultImageUrl) {
      throw new BadRequestException('No image returned from fal.ai');
    }

    const fileUrl = await this.downloadAndStoreImage(resultImageUrl, project_id, 'edit');

    const documentId = randomUUID();
    const processingTime = Date.now() - startTime;

    await this.db.insert(documents).values({
      id: documentId,
      title: `Edit: ${prompt.substring(0, 50)}`,
      content: prompt,
      mediaType: 'image',
      status: 'art_ok',
      projectId: project_id,
      fileUrl,
      thumbnailUrl: fileUrl,
      generationMetadata: {
        prompt,
        model,
        operation_type: 'edit',
        processing_time_ms: processingTime,
      },
    });

    return {
      document_id: documentId,
      file_url: fileUrl,
      thumbnail_url: fileUrl,
      operation_type: 'edit',
      model_used: model,
      processing_time_ms: processingTime,
    };
  }

  /**
   * Remove background from image.
   */
  async removeBackground(params: any, _userId: string) {
    const { image_url, project_id, output_format = 'png' } = params;

    const startTime = Date.now();

    const result = await this.falAiService.generateImage({
      prompt: 'remove background',
      modelId: 'fal-ai/bria-rmbg-2.0',
      imageUrls: [image_url],
      params: { output_format },
    });

    const resultImageUrl = this.extractImageUrl(result);
    if (!resultImageUrl) {
      throw new BadRequestException('No image returned from fal.ai');
    }

    const fileUrl = await this.downloadAndStoreImage(resultImageUrl, project_id, 'rmbg');

    const documentId = randomUUID();
    const processingTime = Date.now() - startTime;

    await this.db.insert(documents).values({
      id: documentId,
      title: 'Background Removed',
      content: '',
      mediaType: 'image',
      status: 'art_ok',
      projectId: project_id,
      fileUrl,
      thumbnailUrl: fileUrl,
      generationMetadata: {
        operation_type: 'remove_bg',
        model: 'fal-ai/bria-rmbg-2.0',
        processing_time_ms: processingTime,
      },
    });

    return {
      document_id: documentId,
      file_url: fileUrl,
      thumbnail_url: fileUrl,
      operation_type: 'remove_bg',
      model_used: 'fal-ai/bria-rmbg-2.0',
      processing_time_ms: processingTime,
    };
  }

  /**
   * Upscale image resolution.
   */
  async upscale(params: any, _userId: string) {
    const {
      image_url,
      project_id,
      scale_factor = 2,
      model = 'fal-ai/clarity-upscaler',
    } = params;

    const startTime = Date.now();

    const result = await this.falAiService.generateImage({
      prompt: `upscale ${scale_factor}x`,
      modelId: model,
      imageUrls: [image_url],
      params: { scale_factor },
    });

    const resultImageUrl = this.extractImageUrl(result);
    if (!resultImageUrl) {
      throw new BadRequestException('No image returned from fal.ai');
    }

    const fileUrl = await this.downloadAndStoreImage(resultImageUrl, project_id, 'upscale');

    const documentId = randomUUID();
    const processingTime = Date.now() - startTime;

    await this.db.insert(documents).values({
      id: documentId,
      title: `Upscaled ${scale_factor}x`,
      content: '',
      mediaType: 'image',
      status: 'art_ok',
      projectId: project_id,
      fileUrl,
      thumbnailUrl: fileUrl,
      generationMetadata: {
        operation_type: 'upscale',
        model,
        scale_factor,
        processing_time_ms: processingTime,
      },
    });

    return {
      document_id: documentId,
      file_url: fileUrl,
      thumbnail_url: fileUrl,
      operation_type: 'upscale',
      model_used: model,
      processing_time_ms: processingTime,
    };
  }

  /**
   * Enhance image quality.
   */
  async enhance(params: any, _userId: string) {
    const { image_url, project_id, enhancement_type = 'auto' } = params;

    const startTime = Date.now();

    const result = await this.falAiService.generateImage({
      prompt: `enhance image (${enhancement_type})`,
      modelId: 'fal-ai/clarity-upscaler',
      imageUrls: [image_url],
      params: { enhancement_type },
    });

    const resultImageUrl = this.extractImageUrl(result);
    if (!resultImageUrl) {
      throw new BadRequestException('No image returned from fal.ai');
    }

    const fileUrl = await this.downloadAndStoreImage(resultImageUrl, project_id, 'enhance');

    const documentId = randomUUID();
    const processingTime = Date.now() - startTime;

    await this.db.insert(documents).values({
      id: documentId,
      title: `Enhanced (${enhancement_type})`,
      content: '',
      mediaType: 'image',
      status: 'art_ok',
      projectId: project_id,
      fileUrl,
      thumbnailUrl: fileUrl,
      generationMetadata: {
        operation_type: 'enhance',
        enhancement_type,
        processing_time_ms: processingTime,
      },
    });

    return {
      document_id: documentId,
      file_url: fileUrl,
      thumbnail_url: fileUrl,
      operation_type: 'enhance',
      model_used: 'fal-ai/clarity-upscaler',
      processing_time_ms: processingTime,
    };
  }

  /**
   * Get job status (for single async jobs).
   */
  async getJobStatus(jobId: string, _userId: string) {
    const job = await this.imageQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const state = await job.getState();
    const result = job.returnvalue;
    const error = job.failedReason;

    return {
      job_id: jobId,
      status: state,
      result,
      error,
    };
  }

  /**
   * Generate with creative concept.
   */
  async generateWithConcept(params: any, userId: string) {
    const { prompt, concept_id, project_id, model, aspect_ratio } = params;

    const concept = await this.db
      .select()
      .from(creativeConcepts)
      .where(eq(creativeConcepts.id, concept_id))
      .limit(1);

    if (!concept || concept.length === 0) {
      throw new NotFoundException('Creative concept not found');
    }

    // Enrich prompt with concept
    const enrichedPrompt = await this.promptEnrichmentService.enrichPrompt(
      prompt,
      project_id,
      concept[0],
    );

    // Generate using enriched prompt
    return this.generate(
      {
        prompt: enrichedPrompt,
        project_id,
        model,
        aspect_ratio,
        creative_concept_id: concept_id,
      },
      userId,
    );
  }

  /**
   * List all active creative concepts.
   */
  async listConcepts() {
    const concepts = await this.db
      .select()
      .from(creativeConcepts)
      .where(eq(creativeConcepts.isActive, true))
      .orderBy(creativeConcepts.sortOrder);

    return {
      concepts,
      total: concepts.length,
    };
  }

  /**
   * Get single creative concept.
   */
  async getConcept(conceptId: string) {
    const concept = await this.db
      .select()
      .from(creativeConcepts)
      .where(eq(creativeConcepts.id, conceptId))
      .limit(1);

    if (!concept || concept.length === 0) {
      throw new NotFoundException('Creative concept not found');
    }

    return concept[0];
  }

  /**
   * Helper: Download an image from a URL and store it in R2.
   * Returns the public URL of the stored image.
   */
  private async downloadAndStoreImage(
    imageUrl: string,
    projectId: string,
    prefix: string,
  ): Promise<string> {
    const response = await fetch(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    const key = `projects/${projectId}/images/${prefix}_${randomUUID()}.png`;
    return this.storageService.upload(key, buffer, 'image/png');
  }

  /**
   * Helper: Extract image URL from fal.ai result.
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

  /**
   * Update batch progress (called by processor).
   */
  updateBatchProgress(
    batchId: string,
    update: { completed?: number; failed?: number; image?: any; error?: string },
  ) {
    const progress = this.batchProgressStore.get(batchId);
    if (!progress) return;

    if (update.completed !== undefined) {
      progress.completed += update.completed;
    }
    if (update.failed !== undefined) {
      progress.failed += update.failed;
    }
    if (update.image) {
      progress.images.push(update.image);
    }
    if (update.error) {
      progress.errors.push(update.error);
    }

    // Update status
    if (progress.completed + progress.failed >= progress.total) {
      progress.status = 'completed';
    }

    this.batchProgressStore.set(batchId, progress);
  }
}
