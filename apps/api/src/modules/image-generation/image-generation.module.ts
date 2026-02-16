import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ImageGenerationController } from './image-generation.controller';
import { ImageGenerationService } from './image-generation.service';
import { ImageGenerationProcessor } from './image-generation.processor';
import { PromptEnrichmentService } from './prompt-enrichment.service';
import { DatabaseModule } from '../../database/database.module';
import { FalAiModule } from '../../integrations/fal-ai/fal-ai.module';
import { StorageModule } from '../storage/storage.module';
import { OpenRouterModule } from '../../integrations/openrouter/openrouter.module';

/**
 * Image Generation Module
 *
 * Handles AI-powered image generation using fal.ai and OpenRouter integrations.
 * Supports text-to-image, image-to-image, inpainting, editing, and batch operations.
 *
 * Features:
 * - Single image generation (text-to-image)
 * - Batch generation with SSE progress streaming
 * - Image editing (inpaint, edit, remove-bg, upscale, enhance)
 * - Creative concepts (compositional templates)
 * - Prompt enrichment with brand context
 * - BullMQ queue for async batch processing
 *
 * Migration from: backend/routers/image_generation.py
 */
@Module({
  imports: [
    DatabaseModule,
    StorageModule,
    FalAiModule,
    OpenRouterModule,
    // Register BullMQ queue for async batch image generation
    BullModule.registerQueue({
      name: 'image-generation',
    }),
  ],
  controllers: [ImageGenerationController],
  providers: [
    ImageGenerationService,
    ImageGenerationProcessor,
    PromptEnrichmentService,
  ],
  exports: [ImageGenerationService, PromptEnrichmentService],
})
export class ImageGenerationModule {}
