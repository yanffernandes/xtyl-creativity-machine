import {
  Injectable,
  Logger,
  OnModuleDestroy,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModelType = 'text-to-image' | 'image-to-image';

/**
 * Configuration for a single fal.ai model.
 * Mirrors the Python `ModelConfig` dataclass from fal_ai_service.py.
 */
export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  provider: string;
  modelType: ModelType;
  supportsMask: boolean;
  maxImages: number;
  defaultParams: Record<string, unknown>;
}

/**
 * Parameters for the unified generateImage / submitJob call.
 */
export interface GenerateImageParams {
  /** Text prompt describing the image to generate or the edit instruction. */
  prompt: string;
  /** fal.ai model endpoint id. */
  modelId?: string;
  /** Reference image URLs (required for image-to-image models). */
  imageUrls?: string[];
  /** Mask image URL (only GPT-Image 1.5/edit). */
  maskUrl?: string;
  /** Additional model-specific parameters. */
  params?: Record<string, unknown>;
}

/**
 * Result of a fal.ai image generation job.
 */
export interface FalAiResult {
  /** Generated image URLs. */
  images?: { url: string; content_type?: string }[];
  /** Single image URL (used by some utility models). */
  image?: { url: string; content_type?: string };
  /** Raw response data. */
  [key: string]: unknown;
}

/**
 * Status returned by the fal.ai queue polling endpoint.
 */
export interface QueueStatus {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  request_id?: string;
  response_url?: string;
  status_url?: string;
  error?: string;
  data?: Record<string, unknown>;
  output?: Record<string, unknown>;
  result?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Model Catalogue (mirrors fal_ai_service.py)
// ---------------------------------------------------------------------------

const TEXT_TO_IMAGE_MODELS: ModelConfig[] = [
  {
    id: 'fal-ai/gpt-image-1.5',
    name: 'GPT-Image 1.5',
    description: 'OpenAI multimodal model with high fidelity',
    provider: 'OpenAI',
    modelType: 'text-to-image',
    supportsMask: false,
    maxImages: 4,
    defaultParams: {
      num_images: 1,
      image_size: '1024x1024',
      quality: 'medium',
      background: 'auto',
    },
  },
  {
    id: 'fal-ai/gemini-3-pro-image-preview',
    name: 'Gemini 3 Pro',
    description: 'Advanced Google model with spatial and semantic reasoning',
    provider: 'Google',
    modelType: 'text-to-image',
    supportsMask: false,
    maxImages: 4,
    defaultParams: { num_images: 1, aspect_ratio: '1:1', resolution: '1K' },
  },
  {
    id: 'fal-ai/gemini-25-flash-image',
    name: 'Gemini 2.5 Flash',
    description: 'Fast Google model with multi-image reasoning',
    provider: 'Google',
    modelType: 'text-to-image',
    supportsMask: false,
    maxImages: 4,
    defaultParams: { num_images: 1, aspect_ratio: '1:1' },
  },
  {
    id: 'fal-ai/bytedance/seedream/v4.5/text-to-image',
    name: 'Seedream 4.5',
    description: 'Bytedance model optimized for speed and quality',
    provider: 'Bytedance',
    modelType: 'text-to-image',
    supportsMask: false,
    maxImages: 6,
    defaultParams: {
      num_images: 1,
      image_size: 'square',
      enable_safety_checker: true,
    },
  },
];

const IMAGE_TO_IMAGE_MODELS: ModelConfig[] = [
  {
    id: 'fal-ai/gpt-image-1.5/edit',
    name: 'GPT-Image 1.5 Edit',
    description: 'High fidelity editing - SUPPORTS MASK (brush)',
    provider: 'OpenAI',
    modelType: 'image-to-image',
    supportsMask: true,
    maxImages: 4,
    defaultParams: {
      num_images: 1,
      image_size: '1024x1024',
      quality: 'medium',
      input_fidelity: 'high',
    },
  },
  {
    id: 'fal-ai/gemini-3-pro-image-preview/edit',
    name: 'Gemini 3 Pro Edit',
    description: 'Advanced editing with spatial understanding',
    provider: 'Google',
    modelType: 'image-to-image',
    supportsMask: false,
    maxImages: 4,
    defaultParams: { num_images: 1, aspect_ratio: '1:1', resolution: '1K' },
  },
  {
    id: 'fal-ai/gemini-25-flash-image/edit',
    name: 'Gemini 2.5 Flash Edit',
    description: 'Fast editing with multi-image reasoning',
    provider: 'Google',
    modelType: 'image-to-image',
    supportsMask: false,
    maxImages: 4,
    defaultParams: { num_images: 1, aspect_ratio: '1:1' },
  },
  {
    id: 'fal-ai/bytedance/seedream/v4.5/edit',
    name: 'Seedream 4.5 Edit',
    description: 'Fast editing with up to 10 reference images',
    provider: 'Bytedance',
    modelType: 'image-to-image',
    supportsMask: false,
    maxImages: 6,
    defaultParams: {
      num_images: 1,
      image_size: 'square',
      enable_safety_checker: true,
    },
  },
];

const ALL_MODELS: ModelConfig[] = [
  ...TEXT_TO_IMAGE_MODELS,
  ...IMAGE_TO_IMAGE_MODELS,
];

const MODEL_BY_ID = new Map<string, ModelConfig>(
  ALL_MODELS.map((m) => [m.id, m]),
);

const DEFAULT_TEXT_MODEL = TEXT_TO_IMAGE_MODELS[0]; // GPT-Image 1.5
const DEFAULT_EDIT_MODEL = IMAGE_TO_IMAGE_MODELS[0]; // GPT-Image 1.5 Edit

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * FalAiService wraps the fal.ai queue-based REST API.
 *
 * Ported from backend/services/fal_ai_service.py.
 *
 * Environment variables:
 *   - FAL_KEY  (required) -- the fal.ai API key
 */
@Injectable()
export class FalAiService implements OnModuleDestroy {
  private readonly logger = new Logger(FalAiService.name);
  private readonly client: AxiosInstance;

  private static readonly QUEUE_BASE_URL = 'https://queue.fal.run';
  // Synchronous endpoint -- reserved for future non-queued requests:
  // private static readonly SYNC_BASE_URL = 'https://fal.run';

  /** Maximum time (seconds) to poll the queue before giving up. */
  private static readonly MAX_POLL_WAIT = 300;
  /** Seconds between queue polls. */
  private static readonly POLL_INTERVAL = 2;
  /** Maximum number of retries on rate-limit errors. */
  private static readonly MAX_RETRIES = 3;

  constructor() {
    this.client = axios.create({
      timeout: 120_000,
      headers: this.buildHeaders(),
    });

    if (!process.env.FAL_KEY) {
      this.logger.warn('FAL_KEY is not set. fal.ai operations will fail.');
    }
  }

  onModuleDestroy() {
    // axios does not hold connections open
  }

  // ---------------------------------------------------------------------------
  // Public: Job submission / polling
  // ---------------------------------------------------------------------------

  /**
   * Submit a job to the fal.ai queue.
   *
   * @returns The raw queue response containing `request_id`, `status_url`, etc.
   */
  async submitJob(
    modelId: string,
    input: Record<string, unknown>,
  ): Promise<QueueStatus> {
    const url = `${FalAiService.QUEUE_BASE_URL}/${modelId}`;
    this.logger.log(`Submitting job to fal.ai: ${modelId}`);

    const response = await this.requestWithRetry<QueueStatus>(
      () => this.client.post(url, input),
      modelId,
    );

    return response;
  }

  /**
   * Poll the fal.ai queue for a job's result.
   *
   * @param statusUrl  The `status_url` returned by submitJob.
   */
  async pollResult(statusUrl: string): Promise<FalAiResult> {
    const start = Date.now();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const elapsed = (Date.now() - start) / 1000;
      if (elapsed > FalAiService.MAX_POLL_WAIT) {
        throw new HttpException(
          `fal.ai queue polling timed out after ${FalAiService.MAX_POLL_WAIT}s`,
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }

      try {
        const res = await this.client.get<QueueStatus>(statusUrl);
        const data = res.data;

        this.logger.debug(
          `Queue status: ${data.status} (elapsed: ${elapsed.toFixed(1)}s)`,
        );

        if (data.status === 'COMPLETED') {
          this.logger.log(`Queue job completed in ${elapsed.toFixed(1)}s`);

          // Result might be embedded in the status response
          if (data.data || data.output || data.result) {
            return (data.data ?? data.output ?? data.result) as FalAiResult;
          }

          // Otherwise fetch from response_url
          if (data.response_url) {
            const resultRes = await this.client.get<FalAiResult>(
              data.response_url,
            );
            return resultRes.data;
          }

          // Fallback: return status payload itself
          return data as unknown as FalAiResult;
        }

        if (data.status === 'FAILED') {
          const msg = data.error ?? 'Unknown error';
          throw new HttpException(
            `fal.ai job failed: ${msg}`,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }

        // Still in queue / progress -- wait then retry
        await this.sleep(FalAiService.POLL_INTERVAL * 1000);
      } catch (error) {
        if (error instanceof HttpException) throw error;
        this.logger.warn(`Polling error: ${error}, retrying...`);
        await this.sleep(FalAiService.POLL_INTERVAL * 1000);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Public: Convenience methods
  // ---------------------------------------------------------------------------

  /**
   * Generate an image: submit + poll (convenience wrapper).
   *
   * Mirrors `generate_image()` from fal_ai_service.py.
   */
  async generateImage(params: GenerateImageParams): Promise<FalAiResult> {
    const modelId = params.modelId ?? DEFAULT_TEXT_MODEL.id;
    const model = MODEL_BY_ID.get(modelId);

    if (!model) {
      this.logger.warn(`Unknown model ${modelId}, using default`);
    }

    const config = model ?? this.selectModel(!!params.imageUrls);

    // Build payload starting from model defaults
    const payload: Record<string, unknown> = { ...config.defaultParams };
    payload.prompt = params.prompt;

    // Merge caller-provided params
    if (params.params) {
      Object.assign(payload, params.params);
    }

    // Add reference images for edit models
    if (config.modelType === 'image-to-image' && params.imageUrls?.length) {
      payload.image_urls = params.imageUrls;
    }

    // Add mask for models that support it
    if (config.supportsMask && params.maskUrl) {
      payload.mask_image_url = params.maskUrl;
    }

    this.logger.log(`Generating image with ${config.name} (${config.id})`);

    const queueResponse = await this.submitJob(config.id, payload);

    // If the response already contains the completed result, return it
    if (
      queueResponse.status === 'COMPLETED' ||
      !['IN_QUEUE', 'IN_PROGRESS'].includes(queueResponse.status)
    ) {
      return queueResponse as unknown as FalAiResult;
    }

    if (!queueResponse.status_url) {
      throw new HttpException(
        'fal.ai queue response missing status_url',
        HttpStatus.BAD_GATEWAY,
      );
    }

    return this.pollResult(queueResponse.status_url);
  }

  /**
   * Return the catalogue of supported fal.ai models.
   */
  listModels(): ModelConfig[] {
    return ALL_MODELS;
  }

  /**
   * Look up a model by its id.
   */
  getModelById(modelId: string): ModelConfig | undefined {
    return MODEL_BY_ID.get(modelId);
  }

  /**
   * Check whether a model supports mask / brush editing.
   */
  modelSupportsMask(modelId: string): boolean {
    return MODEL_BY_ID.get(modelId)?.supportsMask ?? false;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildHeaders(): Record<string, string> {
    const apiKey = process.env.FAL_KEY ?? '';
    return {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Execute a request with exponential-backoff retry on 429 errors.
   */
  private async requestWithRetry<T>(
    fn: () => Promise<{ data: T }>,
    context: string,
    attempt = 1,
  ): Promise<T> {
    try {
      const res = await fn();
      return res.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        // Retry on rate-limit
        if (status === 429 && attempt < FalAiService.MAX_RETRIES) {
          const delay = Math.min(2 ** attempt * 1000, 30_000);
          this.logger.warn(
            `fal.ai rate limited (${context}), retrying in ${delay}ms (attempt ${attempt})`,
          );
          await this.sleep(delay);
          return this.requestWithRetry(fn, context, attempt + 1);
        }

        this.handleApiError(error, context);
      }

      throw error;
    }
  }

  /**
   * Translate axios errors into HttpExceptions with descriptive messages.
   */
  private handleApiError(error: unknown, context: string): never {
    if (!axios.isAxiosError(error)) {
      throw error;
    }

    const status = error.response?.status ?? 500;
    let message: string;

    try {
      const body = error.response?.data as Record<string, unknown> | undefined;
      message =
        (body?.message as string) ??
        (body?.error as string) ??
        error.message;
    } catch {
      message = error.message;
    }

    this.logger.error(`fal.ai ${context} error (${status}): ${message}`);

    switch (status) {
      case 401:
        throw new HttpException(
          'Invalid or missing FAL_KEY. Check your fal.ai API key.',
          HttpStatus.UNAUTHORIZED,
        );
      case 402:
        throw new HttpException(
          'Insufficient fal.ai credits. Please add credits to continue.',
          HttpStatus.PAYMENT_REQUIRED,
        );
      case 429:
        throw new HttpException(
          'fal.ai rate limit exceeded. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      default:
        throw new HttpException(
          `fal.ai request failed (${status}): ${message}`,
          status >= 400 && status < 600
            ? status
            : HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }
  }

  /**
   * Select the appropriate default model based on whether reference images
   * are present.
   */
  private selectModel(hasReferenceImage: boolean): ModelConfig {
    return hasReferenceImage ? DEFAULT_EDIT_MODEL : DEFAULT_TEXT_MODEL;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
