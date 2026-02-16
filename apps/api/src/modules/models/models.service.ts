import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module';
import { systemConfig } from '../../database/drizzle/schema';
import { OpenRouterService } from '../../integrations/openrouter/openrouter.service';

interface ModelVisibilityConfig {
  hiddenModels?: string[];
  visibleModels?: string[];
  mode?: 'whitelist' | 'blacklist';
}

interface FalAiModelConfig {
  models: Array<{
    id: string;
    name: string;
    description?: string;
    capabilities?: string[];
    pricing?: {
      prompt?: string;
      completion?: string;
    };
  }>;
}

@Injectable()
export class ModelsService {
  private readonly logger = new Logger(ModelsService.name);
  private textModelsCache: any[] | null = null;
  private textModelsCacheTime = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @Inject(DATABASE) private readonly db: any,
    private readonly openRouterService: OpenRouterService,
  ) {}

  async listTextModels() {
    const now = Date.now();

    // Return cached models if still valid
    if (
      this.textModelsCache &&
      now - this.textModelsCacheTime < this.CACHE_TTL
    ) {
      return this.textModelsCache;
    }

    // Fetch from OpenRouter
    const allModels = await this.openRouterService.listModels();

    // Get visibility config from system_config
    const visibilityConfig = await this.getVisibilityConfig();

    // Filter models based on admin visibility settings
    let filteredModels = allModels;

    if (visibilityConfig.mode === 'whitelist' && visibilityConfig.visibleModels) {
      filteredModels = allModels.filter((model) =>
        visibilityConfig.visibleModels!.includes(model.id),
      );
    } else if (visibilityConfig.mode === 'blacklist' && visibilityConfig.hiddenModels) {
      filteredModels = allModels.filter(
        (model) => !visibilityConfig.hiddenModels!.includes(model.id),
      );
    }

    // Transform to frontend format
    const models = filteredModels.map((model) => ({
      id: model.id,
      name: model.name,
      description: model.description,
      contextLength: model.context_length,
      pricing: model.pricing
        ? {
            prompt: model.pricing.prompt,
            completion: model.pricing.completion,
          }
        : undefined,
      architecture: model.architecture,
      created: model.created,
    }));

    // Update cache
    this.textModelsCache = models;
    this.textModelsCacheTime = now;

    return models;
  }

  async listImageModels() {
    // Get fal.ai models from system_config
    const [config] = await this.db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, 'fal_ai_models'))
      .limit(1);

    if (!config) {
      // Return default fal.ai models if not configured
      return this.getDefaultFalAiModels();
    }

    const falConfig = config.value as FalAiModelConfig;
    return falConfig.models ?? this.getDefaultFalAiModels();
  }

  async getModelConfig() {
    const configs = await this.db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, 'model_visibility'))
      .limit(1);

    if (configs.length === 0) {
      return {
        mode: 'blacklist',
        hiddenModels: [],
        visibleModels: [],
      };
    }

    return configs[0].value;
  }

  async updateModelConfig(config: Record<string, any>) {
    // Check if config exists
    const [existing] = await this.db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, 'model_visibility'))
      .limit(1);

    if (existing) {
      // Update existing config
      const [updated] = await this.db
        .update(systemConfig)
        .set({
          value: config,
          updatedAt: new Date(),
        })
        .where(eq(systemConfig.key, 'model_visibility'))
        .returning();

      // Clear cache
      this.textModelsCache = null;

      return updated;
    } else {
      // Insert new config
      const [inserted] = await this.db
        .insert(systemConfig)
        .values({
          key: 'model_visibility',
          value: config,
          description: 'Model visibility configuration for text models',
          updatedAt: new Date(),
        })
        .returning();

      // Clear cache
      this.textModelsCache = null;

      return inserted;
    }
  }

  private async getVisibilityConfig(): Promise<ModelVisibilityConfig> {
    try {
      const [config] = await this.db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.key, 'model_visibility'))
        .limit(1);

      if (!config) {
        return { mode: 'blacklist', hiddenModels: [], visibleModels: [] };
      }

      return config.value as ModelVisibilityConfig;
    } catch (error) {
      this.logger.error(`Failed to fetch visibility config: ${error}`);
      return { mode: 'blacklist', hiddenModels: [], visibleModels: [] };
    }
  }

  private getDefaultFalAiModels() {
    return [
      {
        id: 'fal-ai/flux/dev',
        name: 'FLUX.1 [dev]',
        description: 'High-quality image generation model',
        capabilities: ['text-to-image'],
        pricing: {
          prompt: '0.025',
          completion: '0',
        },
      },
      {
        id: 'fal-ai/flux/schnell',
        name: 'FLUX.1 [schnell]',
        description: 'Fast image generation model',
        capabilities: ['text-to-image'],
        pricing: {
          prompt: '0.003',
          completion: '0',
        },
      },
      {
        id: 'fal-ai/flux-pro',
        name: 'FLUX.1 [pro]',
        description: 'Professional image generation model',
        capabilities: ['text-to-image'],
        pricing: {
          prompt: '0.055',
          completion: '0',
        },
      },
      {
        id: 'fal-ai/flux-lora',
        name: 'FLUX LoRA',
        description: 'Fine-tunable image generation with LoRA support',
        capabilities: ['text-to-image', 'lora'],
        pricing: {
          prompt: '0.025',
          completion: '0',
        },
      },
      {
        id: 'fal-ai/stable-diffusion-v3-medium',
        name: 'Stable Diffusion 3 Medium',
        description: 'Stable Diffusion v3 medium model',
        capabilities: ['text-to-image'],
        pricing: {
          prompt: '0.035',
          completion: '0',
        },
      },
      {
        id: 'fal-ai/aura-flow',
        name: 'AuraFlow',
        description: 'Fast and high-quality image generation',
        capabilities: ['text-to-image'],
        pricing: {
          prompt: '0.015',
          completion: '0',
        },
      },
    ];
  }
}
