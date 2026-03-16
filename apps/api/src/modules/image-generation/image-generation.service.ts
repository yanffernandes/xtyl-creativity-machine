import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Observable } from 'rxjs';
import { eq, and, isNull, sql } from 'drizzle-orm';
import type Redis from 'ioredis';
import { DATABASE } from '../../database/database.module';
import { documents, creativeConcepts, projects, systemConfig } from '../../database/drizzle/schema';
import { FalAiService } from '../../integrations/fal-ai/fal-ai.service';
import { StorageService } from '../storage/storage.service';
import { PromptEnrichmentService } from './prompt-enrichment.service';
import { IMAGE_GEN_REDIS } from './image-generation.constants';
import { randomUUID } from 'crypto';

const BATCH_TTL = 3600; // seconds

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
  constructor(
    @Inject(DATABASE) private readonly db: any,
    private readonly falAiService: FalAiService,
    private readonly storageService: StorageService,
    private readonly promptEnrichmentService: PromptEnrichmentService,
    @InjectQueue('image-generation') private readonly imageQueue: Queue,
    @Inject(IMAGE_GEN_REDIS) private readonly redis: Redis,
  ) {}

  private redisKey(batchId: string) {
    return `image-batch:${batchId}`;
  }

  private async getProgress(batchId: string): Promise<any | null> {
    const raw = await this.redis.get(this.redisKey(batchId));
    return raw ? JSON.parse(raw) : null;
  }

  private async setProgress(batchId: string, progress: any): Promise<void> {
    await this.redis.set(this.redisKey(batchId), JSON.stringify(progress), 'EX', BATCH_TTL);
  }

  /**
   * List available image generation models, filtered by admin-configured visibility.
   * Supports both new format (array of objects with id field) and old format (string[]).
   */
  async listModels(modelType?: string) {
    const [configRow] = await this.db
      .select()
      .from(systemConfig)
      .where(sql`${systemConfig.key} = 'visible_image_models'`)
      .limit(1);

    const stored: any[] = Array.isArray(configRow?.value) ? configRow.value : [];

    // New format: array of objects with id field
    if (stored.length > 0 && typeof stored[0] === 'object' && stored[0]?.id) {
      const mapped = stored.map((m: any) => ({
        id: m.id,
        name: m.name ?? m.id,
        description: m.description ?? '',
        top_provider: m.provider ?? m.top_provider ?? 'fal-ai',
        model_type: m.modelType ?? m.model_type ?? 'text-to-image',
        supports_mask: m.supportsMask ?? m.supports_mask ?? false,
        max_images: m.maxImages ?? m.max_images ?? 4,
        default_params: m.defaultParams ?? m.default_params ?? {},
        parameters: m.parameters ?? [],
      }));

      if (modelType === 'text-to-image') return mapped.filter((m) => m.model_type === 'text-to-image');
      if (modelType === 'image-to-image') return mapped.filter((m) => m.model_type === 'image-to-image');
      return mapped;
    }

    // Fallback: old string[] format or empty — use hardcoded catalogue
    const visibleIds: string[] = stored.filter((s) => typeof s === 'string');
    const allModels = this.falAiService.listModels().map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      top_provider: m.provider,
      model_type: m.modelType,
      supports_mask: m.supportsMask,
      max_images: m.maxImages,
      default_params: m.defaultParams,
      parameters: [],
    }));

    const filtered = visibleIds.length > 0
      ? allModels.filter((m) => visibleIds.includes(m.id))
      : allModels;

    if (modelType === 'text-to-image') return filtered.filter((m) => m.model_type === 'text-to-image');
    if (modelType === 'image-to-image') return filtered.filter((m) => m.model_type === 'image-to-image');
    return filtered;
  }

  /**
   * Generate a single image from text prompt.
   * Creates a document record with media_type='image'.
   */
  async generate(params: any, _userId: string) {
    const {
      prompt,
      project_id,
      model = 'fal-ai/gpt-image-1.5',
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
      model = 'fal-ai/gpt-image-1.5',
      aspect_ratio = '1:1',
      creativity = 0.5,
      creative_concept,
      reference_assets = [],
      reference_asset_modes = [],
      apply_brand_context = true,
      campaign_id,
      tags = [],
      channel,
      negative_prompt,
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

    // Initialize batch progress in Redis
    await this.setProgress(batchId, {
      batch_id: batchId,
      total: count,
      completed: 0,
      failed: 0,
      images: [],
      errors: [],
      events: [],
      status: 'processing',
    });

    // Queue batch jobs
    for (let i = 0; i < count; i++) {
      await this.imageQueue.add('generate-variation', {
        batchId,
        variationIndex: i,
        count,
        prompt,
        project_id,
        model,
        aspect_ratio,
        creativity,
        creative_concept,
        reference_assets,
        reference_asset_modes,
        apply_brand_context,
        campaign_id,
        tags,
        channel,
        userId,
        negative_prompt,
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
   * Polls Redis every 500ms so both API and worker processes can share state.
   */
  streamBatchProgress(batchId: string, _token: string): Observable<any> {
    return new Observable((subscriber) => {
      let emittedEvents = 0;
      let notFoundRetries = 0;
      const MAX_NOT_FOUND_RETRIES = 10; // 5s wait for batch to appear in Redis

      const interval = setInterval(async () => {
        try {
          const progress = await this.getProgress(batchId);

          if (!progress) {
            notFoundRetries++;
            if (notFoundRetries >= MAX_NOT_FOUND_RETRIES) {
              subscriber.next({ data: { type: 'error', message: 'Batch not found' } });
              subscriber.complete();
              clearInterval(interval);
            }
            return;
          }
          notFoundRetries = 0;

          const pendingEvents = Array.isArray(progress.events)
            ? progress.events.slice(emittedEvents)
            : [];

          for (const event of pendingEvents) {
            subscriber.next({ data: event });
            emittedEvents += 1;
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
                data: {
                  batch_id: batchId,
                  total: progress.total,
                  completed: progress.completed,
                  failed: progress.failed,
                  images: progress.images,
                },
              },
            });
            subscriber.complete();
            clearInterval(interval);
            // Clean up Redis key immediately (TTL handles eventual cleanup)
            await this.redis.del(this.redisKey(batchId));
          }
        } catch (err) {
          console.error('SSE polling error:', err);
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
    const progress = await this.getProgress(batchId);

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
      model = 'fal-ai/gpt-image-1.5/edit',
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
      model = 'fal-ai/gpt-image-1.5/edit',
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
   * Preview the final enriched prompt without generating an image.
   * Runs the full enrichment pipeline (brand context + global rules + LLM refinement)
   * and returns the composed prompt for debug/inspection purposes.
   */
  async previewPrompt(params: any, _userId: string): Promise<{ enriched_prompt: string; raw_prompt: string }> {
    const {
      prompt,
      project_id,
      creativity = 50,
      creative_concept,
      apply_brand_context = true,
    } = params;

    // Step 1: Enrich prompt
    // creative_concept is a slug string (not a UUID) — look up by slug
    let conceptObj: any = null;
    if (creative_concept) {
      const concepts = await this.db
        .select()
        .from(creativeConcepts)
        .where(eq(creativeConcepts.slug, creative_concept))
        .limit(1);
      if (concepts?.length > 0) conceptObj = concepts[0];
    }

    let enrichedPrompt = prompt;
    if (apply_brand_context) {
      enrichedPrompt = await this.promptEnrichmentService.enrichPrompt(prompt, project_id, conceptObj);
    }

    // Step 2: Apply style modifier (index=0 — show first variation style)
    const creativityBucket = Math.min(3, Math.floor(((creativity as number) / 100) * 4));
    const modifierMatrix: string[][] = [
      ['faithful to the original concept, exact style match', 'faithful composition with subtle color variation', 'faithful style with minor framing adjustment', 'true to the original with mood adaptation only'],
      ['faithful composition with a subtle creative flourish', 'largely faithful with expressive lighting treatment', 'moderate stylistic variation on the core concept', 'faithful base with artistic color grading'],
      ['creative interpretation with strong visual identity', 'bold composition maintaining concept intent', 'expressive stylistic approach with artistic freedom', 'experimental color grade and framing'],
      ['bold creative reimagination of the concept', 'avant-garde composition with full artistic license', 'dramatic stylistic departure, abstract expression', 'radical artistic reinterpretation'],
    ];
    const styleModifier = (modifierMatrix[creativityBucket] ?? modifierMatrix[1])[0];
    const rawPrompt = `${enrichedPrompt}. ${styleModifier}`;

    // Step 3: LLM refinement if prompt_enrichment model is configured
    const [configRow] = await this.db
      .select()
      .from(systemConfig)
      .where(sql`${systemConfig.key} = 'ai_models'`)
      .limit(1);
    const enrichmentModelId: string = configRow?.value?.defaults?.prompt_enrichment || '';

    let finalPrompt = rawPrompt;
    if (enrichmentModelId) {
      finalPrompt = await this.promptEnrichmentService.refineWithLLM(rawPrompt, enrichmentModelId);
    }

    return { enriched_prompt: finalPrompt, raw_prompt: rawPrompt };
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

  async listFalModels(category?: string) {
    const models = await this.listModels();
    const mappedModels = models.map((model: any) => ({
      id: model.id,
      name: model.name,
      description: model.description,
      model_type: model.model_type,
      top_provider: model.top_provider,
      supports_mask: model.supports_mask,
      max_images: model.max_images,
      default_params: model.default_params,
    }));

    const filteredModels =
      category === 'generation'
        ? mappedModels.filter((model) => model.model_type === 'text-to-image')
        : category === 'editing'
          ? mappedModels.filter((model) => model.model_type === 'image-to-image')
          : category === 'utility'
            ? mappedModels.filter((model) => model.model_type === 'utility')
            : mappedModels;

    return {
      models: filteredModels,
      categories: ['generation', 'editing', 'utility'],
    };
  }

  async generateUnified(params: any, userId: string) {
    const {
      prompt,
      project_id,
      model,
      image_urls = [],
      mask_url,
      params: modelParams = {},
    } = params;

    if (!Array.isArray(image_urls) || image_urls.length === 0) {
      const result = await this.generate(
        {
          prompt,
          project_id,
          model,
          ...modelParams,
        },
        userId,
      );

      return {
        success: true,
        document_id: result.document_id,
        file_url: result.file_url,
        thumbnail_url: result.thumbnail_url,
        title: result.title,
        model_used: model || 'default',
        model_type: 'text-to-image',
        supports_mask: false,
        processing_time_ms: 0,
        generation_metadata: result.generation_metadata || {},
      };
    }

    const startTime = Date.now();
    const result = await this.falAiService.generateImage({
      prompt,
      modelId: model,
      imageUrls: image_urls,
      maskUrl: mask_url,
      params: modelParams,
    });

    const resultImageUrl = this.extractImageUrl(result);
    if (!resultImageUrl) {
      throw new BadRequestException('No image returned from fal.ai');
    }

    const fileUrl = await this.downloadAndStoreImage(
      resultImageUrl,
      project_id,
      mask_url ? 'inpaint' : 'edit',
    );

    const documentId = randomUUID();
    const processingTime = Date.now() - startTime;
    const title = `${mask_url ? 'Inpaint' : 'Edit'}: ${prompt.substring(0, 50)}`;

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
        operation_type: mask_url ? 'inpaint' : 'edit',
        mask_url: mask_url || null,
        processing_time_ms: processingTime,
        ...modelParams,
      },
    });

    return {
      success: true,
      document_id: documentId,
      file_url: fileUrl,
      thumbnail_url: fileUrl,
      title,
      model_used: model || 'default',
      model_type: 'image-to-image',
      supports_mask: Boolean(mask_url),
      processing_time_ms: processingTime,
      generation_metadata: {
        prompt,
        model,
        operation_type: mask_url ? 'inpaint' : 'edit',
        ...modelParams,
      },
    };
  }

  async refine(params: any, userId: string) {
    const [document] = await this.db
      .select()
      .from(documents)
      .where(and(eq(documents.id, params.document_id), isNull(documents.deletedAt)))
      .limit(1);

    if (!document) {
      throw new NotFoundException('Source image not found');
    }

    if (document.mediaType !== 'image' || !document.fileUrl) {
      throw new BadRequestException('Document is not an image');
    }

    return this.editImage(
      {
        image_url: document.fileUrl,
        prompt: params.refinement_prompt,
        project_id: document.projectId,
        model: params.model,
        guidance_scale: params.guidance_scale,
      },
      userId,
    );
  }

  async inpaint(params: any, userId: string) {
    return this.generateUnified(
      {
        prompt: params.prompt,
        project_id: params.project_id,
        model: params.model,
        image_urls: [params.image_url],
        mask_url: params.mask_url,
        params: {
          guidance_scale: params.guidance_scale,
          num_inference_steps: params.num_inference_steps,
        },
      },
      userId,
    );
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
   * Async: reads from Redis, updates, writes back.
   */
  async updateBatchProgress(
    batchId: string,
    update: {
      started?: any;
      completed?: number;
      failed?: number;
      image?: any;
      enriched_prompt?: string;
      error?: string | { index?: number; error: string };
      model_switched?: { index: number; original_model: string; new_model: string };
    },
  ) {
    const progress = await this.getProgress(batchId);
    if (!progress) return;

    if (update.completed !== undefined) {
      progress.completed += update.completed;
    }
    if (update.failed !== undefined) {
      progress.failed += update.failed;
    }
    if (update.image) {
      progress.images.push(update.image);
      progress.events.push({
        type: 'variation_complete',
        data: {
          ...update.image,
          ...(update.enriched_prompt && { enriched_prompt: update.enriched_prompt }),
        },
      });
    }
    if (update.started) {
      progress.events.push({
        type: 'variation_started',
        data: update.started,
      });
    }
    if (update.model_switched) {
      progress.events.push({
        type: 'model_switched',
        data: update.model_switched,
      });
    }
    if (update.error) {
      const errorPayload =
        typeof update.error === 'string'
          ? { error: update.error }
          : update.error;
      progress.errors.push(errorPayload.error);
      progress.events.push({
        type: 'variation_failed',
        data: {
          index:
            typeof errorPayload.index === 'number'
              ? errorPayload.index
              : progress.completed + progress.failed - 1,
          error: errorPayload.error,
        },
      });
    }

    // Update status
    if (progress.completed + progress.failed >= progress.total) {
      progress.status = 'completed';
    }

    await this.setProgress(batchId, progress);
  }
}
