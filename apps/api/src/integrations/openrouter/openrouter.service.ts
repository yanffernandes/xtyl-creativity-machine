import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

/**
 * OpenRouter chat completion options.
 */
export interface ChatCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  tools?: Record<string, unknown>[];
  stream?: boolean;
}

/**
 * A single message in a chat conversation.
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | Record<string, unknown>[];
  tool_calls?: Record<string, unknown>[];
  tool_call_id?: string;
}

/**
 * OpenRouter API response for chat completions.
 */
export interface ChatCompletionResponse {
  id: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: Record<string, unknown>[];
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

/**
 * A single streamed chunk from OpenRouter.
 */
export interface ChatCompletionChunk {
  id: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: Record<string, unknown>[];
    };
    finish_reason: string | null;
  }[];
}

/**
 * OpenRouter model metadata returned by the /models endpoint.
 */
export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
  created?: number;
}

/**
 * OpenRouterService wraps the OpenRouter REST API.
 *
 * Ported from backend/llm_service.py and backend/config.py.
 *
 * Environment variables:
 *   - OPENROUTER_API_KEY  (required)
 *   - OPENROUTER_BASE_URL (optional, default https://openrouter.ai/api/v1)
 *   - APP_URL             (optional, used for HTTP-Referer header)
 *   - APP_TITLE           (optional, used for X-Title header)
 */
@Injectable()
export class OpenRouterService implements OnModuleDestroy {
  private readonly logger = new Logger(OpenRouterService.name);
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl =
      process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 60_000,
      headers: this.buildHeaders(),
    });

    if (!process.env.OPENROUTER_API_KEY) {
      this.logger.warn(
        'OPENROUTER_API_KEY is not set. OpenRouter calls will fail.',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  onModuleDestroy() {
    // axios does not hold open connections, nothing to clean up
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Send a non-streaming chat completion request to OpenRouter.
   *
   * Mirrors `chat_completion()` in llm_service.py.
   */
  async chatCompletion(
    messages: ChatMessage[],
    model: string,
    options: ChatCompletionOptions = {},
  ): Promise<ChatCompletionResponse> {
    const payload: Record<string, unknown> = {
      model,
      messages,
      temperature: options.temperature ?? 0.7,
    };

    if (options.maxTokens) {
      payload.max_tokens = options.maxTokens;
    }
    if (options.tools && options.tools.length > 0) {
      payload.tools = options.tools;
    }

    try {
      const response = await this.client.post<ChatCompletionResponse>(
        '/chat/completions',
        payload,
      );
      return response.data;
    } catch (error) {
      this.handleAxiosError(error, 'chatCompletion');
      throw error; // unreachable, handleAxiosError always throws
    }
  }

  /**
   * Send a streaming chat completion request to OpenRouter.
   *
   * Yields parsed SSE chunks as they arrive. Mirrors
   * `chat_completion_stream()` in llm_service.py.
   */
  async *streamChatCompletion(
    messages: ChatMessage[],
    model: string,
    options: ChatCompletionOptions = {},
  ): AsyncGenerator<ChatCompletionChunk> {
    const payload: Record<string, unknown> = {
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      stream: true,
    };

    if (options.maxTokens) {
      payload.max_tokens = options.maxTokens;
    }
    if (options.tools && options.tools.length > 0) {
      payload.tools = options.tools;
    }

    try {
      const response = await this.client.post('/chat/completions', payload, {
        responseType: 'stream',
        timeout: 300_000, // 5 minutes for streaming
      });

      const stream = response.data as NodeJS.ReadableStream;
      let buffer = '';

      for await (const rawChunk of stream) {
        buffer += rawChunk.toString();
        const lines = buffer.split('\n');

        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6); // strip "data: "
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data) as ChatCompletionChunk;
            yield parsed;
          } catch {
            // skip malformed JSON chunks
            continue;
          }
        }
      }
    } catch (error) {
      this.handleAxiosError(error, 'streamChatCompletion');
    }
  }

  /**
   * Generate an embedding vector for the given text.
   *
   * Uses the OpenRouter /embeddings endpoint (compatible with OpenAI format).
   */
  async generateEmbedding(
    text: string,
    model = 'openai/text-embedding-3-small',
  ): Promise<number[]> {
    try {
      const response = await this.client.post('/embeddings', {
        model,
        input: text,
      });

      const data = response.data;
      if (data?.data?.[0]?.embedding) {
        return data.data[0].embedding as number[];
      }

      throw new Error('Unexpected embedding response format');
    } catch (error) {
      this.handleAxiosError(error, 'generateEmbedding');
      throw error;
    }
  }

  /**
   * List all available models from OpenRouter.
   *
   * Mirrors `list_models()` in llm_service.py.
   */
  async listModels(): Promise<OpenRouterModel[]> {
    try {
      const response = await this.client.get('/models', { timeout: 30_000 });
      return (response.data?.data ?? []) as OpenRouterModel[];
    } catch (error) {
      this.logger.error(`Failed to fetch OpenRouter models: ${error}`);
      return [];
    }
  }

  /**
   * List embedding models from OpenRouter.
   *
   * Mirrors `list_embedding_models()` in llm_service.py.
   */
  async listEmbeddingModels(): Promise<OpenRouterModel[]> {
    try {
      const response = await this.client.get('/embeddings/models', {
        timeout: 30_000,
      });
      return (response.data?.data ?? []) as OpenRouterModel[];
    } catch (error) {
      this.logger.error(`Failed to fetch embedding models: ${error}`);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Build the standard headers required by OpenRouter.
   * Mirrors `get_openrouter_headers()` from config.py.
   */
  private buildHeaders(): Record<string, string> {
    const apiKey = process.env.OPENROUTER_API_KEY ?? '';
    const appUrl = process.env.APP_URL ?? 'https://xtyl.app';
    const appTitle = process.env.APP_TITLE ?? 'XTYL Creativity Machine';

    return {
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': appUrl,
      'X-Title': appTitle,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Translate axios errors into NestJS-friendly exceptions with clear
   * messages. Mirrors the HTTP error handling in llm_service.py.
   */
  private handleAxiosError(error: unknown, context: string): never {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500;
      const body = error.response?.data;
      const message =
        typeof body === 'object'
          ? (body as Record<string, unknown>)?.error?.toString() ??
            JSON.stringify(body)
          : String(body ?? error.message);

      this.logger.error(`OpenRouter ${context} error (${status}): ${message}`);

      // Provide descriptive messages for known status codes
      switch (status) {
        case 401:
          throw new Error(
            'OpenRouter authentication failed. Check OPENROUTER_API_KEY.',
          );
        case 402:
          throw new Error(
            'Insufficient OpenRouter credits. Add credits at https://openrouter.ai/settings/credits.',
          );
        case 429:
          throw new Error(
            'OpenRouter rate limit exceeded. Please wait and retry.',
          );
        default:
          throw new Error(`OpenRouter API error (${status}): ${message}`);
      }
    }

    this.logger.error(`OpenRouter ${context} unexpected error: ${error}`);
    throw error instanceof Error ? error : new Error(String(error));
  }
}
