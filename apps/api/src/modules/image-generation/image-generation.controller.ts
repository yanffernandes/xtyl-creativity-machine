import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators';
import { ImageGenerationService } from './image-generation.service';

/**
 * Image Generation Controller
 *
 * Endpoints for AI-powered image generation and editing operations.
 * All endpoints require authentication via Supabase JWT.
 *
 * Migration from: backend/routers/image_generation.py
 */
@Controller('image-generation')
@UseGuards(AuthGuard)
export class ImageGenerationController {
  constructor(
    private readonly imageGenerationService: ImageGenerationService,
  ) {}

  /**
   * GET /image-generation/models
   *
   * List available image generation models from fal.ai.
   * Returns 8+ hardcoded models (4 text-to-image + 4+ utility models).
   *
   * Query params:
   * - model_type?: 'text-to-image' | 'image-to-image' (optional filter)
   */
  @Get('models')
  async listModels(@Query('model_type') modelType?: string) {
    return this.imageGenerationService.listModels(modelType);
  }

  /**
   * POST /image-generation/batch
   *
   * Generate multiple image variations in parallel (async).
   * Returns batch_id immediately, use SSE stream to monitor progress.
   *
   * Body:
   * - prompt: string (required)
   * - project_id: string (required)
   * - count: number (default: 4, max: 10)
   * - model?: string
   * - aspect_ratio?: string
   * - creativity?: number (0-1, affects variation intensity)
   * - creative_concept?: string (concept slug)
   * - reference_assets?: string[] (manual asset selection)
   * - apply_brand_context?: boolean (default: true)
   * - campaign_id?: string
   * - tags?: string[]
   * - channel?: string
   *
   * Response:
   * - batch_id: string
   * - status: 'processing'
   * - message: string
   */
  @Post('batch')
  async generateBatch(
    @Body() body: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.imageGenerationService.generateBatch(body, userId);
  }

  /**
   * GET /image-generation/batch/:batchId/stream
   *
   * Server-Sent Events stream for batch generation progress.
   * Token passed via query parameter (SSE doesn't support headers).
   *
   * Query params:
   * - token: string (Supabase JWT, required)
   *
   * Events:
   * - variation_started: { index, total }
   * - variation_complete: { index, document_id, file_url, thumbnail_url }
   * - variation_failed: { index, error }
   * - batch_complete: { batch_id, total, completed, failed, images }
   */
  @Get('batch/:batchId/stream')
  @Sse()
  streamBatchProgress(
    @Param('batchId') batchId: string,
    @Query('token') token: string,
  ): Observable<MessageEvent> {
    return this.imageGenerationService.streamBatchProgress(batchId, token);
  }

  /**
   * POST /image-generation/edit
   *
   * Edit image using natural language instructions (no mask needed).
   * Uses fal.ai FLUX Kontext for instruction-based editing.
   *
   * Body:
   * - image_url: string
   * - prompt: string (editing instructions)
   * - project_id: string
   * - model?: string (default: fal-ai/flux-pro/kontext)
   * - guidance_scale?: number
   *
   * Response:
   * - document_id: string
   * - file_url: string
   * - thumbnail_url: string
   * - operation_type: 'edit'
   * - model_used: string
   * - processing_time_ms: number
   */
  @Post('edit')
  async editImage(
    @Body() body: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.imageGenerationService.editImage(body, userId);
  }

  @Post('generate-unified')
  async generateUnified(
    @Body() body: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.imageGenerationService.generateUnified(body, userId);
  }

  @Post('inpaint')
  async inpaintImage(
    @Body() body: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.imageGenerationService.inpaint(body, userId);
  }

  /**
   * POST /image-generation/remove-bg
   *
   * Remove background from image (returns PNG with alpha transparency).
   * Uses fal.ai BRIA RMBG 2.0.
   *
   * Body:
   * - image_url: string
   * - project_id: string
   * - output_format?: 'png' | 'webp' (default: 'png')
   *
   * Response: Same as /edit
   */
  @Post('remove-bg')
  async removeBackground(
    @Body() body: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.imageGenerationService.removeBackground(body, userId);
  }

  /**
   * POST /image-generation/upscale
   *
   * Upscale image resolution (2x or 4x).
   * Uses fal.ai Clarity Upscaler.
   *
   * Body:
   * - image_url: string
   * - project_id: string
   * - scale_factor?: number (2 or 4, default: 2)
   * - model?: string (default: fal-ai/clarity-upscaler)
   *
   * Response: Same as /edit
   */
  @Post('upscale')
  async upscaleImage(
    @Body() body: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.imageGenerationService.upscale(body, userId);
  }

  /**
   * POST /image-generation/enhance
   *
   * Enhance image quality (sharpness, colors, details).
   * Uses fal.ai Clarity Upscaler with enhancement presets.
   *
   * Body:
   * - image_url: string
   * - project_id: string
   * - enhancement_type?: 'auto' | 'faces' | 'details' | 'colors' (default: 'auto')
   *
   * Response: Same as /edit
   */
  @Post('enhance')
  async enhanceImage(
    @Body() body: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.imageGenerationService.enhance(body, userId);
  }

  /**
   * GET /image-generation/concepts
   *
   * List all active creative concepts (compositional templates).
   * Returns concepts ordered by sort_order.
   *
   * Response:
   * - concepts: Array<CreativeConcept>
   * - total: number
   */
  @Get('concepts')
  async listConcepts() {
    return this.imageGenerationService.listConcepts();
  }

  @Get('fal-models')
  async listFalModels(@Query('category') category?: string) {
    return this.imageGenerationService.listFalModels(category);
  }

}
