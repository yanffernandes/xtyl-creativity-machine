import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ModelType,
  OpenRouterModelResponse,
  ModelsListResponse,
  ValidateKeyResponse,
  ChatCompletionResponse,
  ImageGenerationResponse,
} from "./dto/openrouter.dto";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// T044: Error messages for common OpenRouter errors
const ERROR_MESSAGES: Record<number, string> = {
  400: "Requisição inválida. Verifique os parâmetros enviados.",
  401: "Chave API inválida ou expirada. Verifique suas credenciais OpenRouter.",
  403: "Acesso negado. Verifique as permissões da sua chave API.",
  404: "Modelo não encontrado. O modelo selecionado pode não estar disponível.",
  429: "Limite de requisições excedido. Aguarde um momento e tente novamente.",
  500: "Erro interno do servidor OpenRouter. Tente novamente em alguns minutos.",
  502: "Gateway inválido. O serviço OpenRouter está temporariamente indisponível.",
  503: "Serviço OpenRouter temporariamente indisponível. Tente novamente em alguns minutos.",
  504: "Tempo limite excedido. O serviço OpenRouter está demorando para responder.",
};

@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name);
  private readonly apiKey: string | undefined;
  private readonly baseUrl = "https://openrouter.ai/api/v1";

  // Cache for models (5 minute TTL)
  private modelsCache: CacheEntry<OpenRouterModelResponse[]> | null = null;
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes in ms

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>("OPENROUTER_API_KEY");
    if (this.apiKey) {
      this.logger.log("OpenRouter service initialized");
    } else {
      this.logger.warn(
        "OPENROUTER_API_KEY not configured - OpenRouter features will not work",
      );
    }
  }

  /**
   * Check if OpenRouter is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * T044: Handle HTTP errors with user-friendly messages
   */
  private handleHttpError(
    status: number,
    operation: string,
    errorText?: string,
  ): never {
    const friendlyMessage =
      ERROR_MESSAGES[status] || `Erro ${status} ao ${operation}.`;

    this.logger.error(
      `OpenRouter ${operation} error: ${status} - ${errorText || "No details"}`,
    );

    if (status === 401) {
      throw new UnauthorizedException(friendlyMessage);
    }

    if (status === 400) {
      throw new BadRequestException(friendlyMessage);
    }

    // All other errors are treated as service unavailable
    throw new ServiceUnavailableException(friendlyMessage);
  }

  /**
   * Validate the API key by making a test request
   */
  async validateApiKey(): Promise<ValidateKeyResponse> {
    if (!this.apiKey) {
      return { valid: false, configured: false };
    }

    try {
      // Make a lightweight request to validate the key
      const response = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      return {
        valid: response.ok,
        configured: true,
      };
    } catch (error) {
      this.logger.error("Error validating OpenRouter API key:", error);
      return { valid: false, configured: true };
    }
  }

  /**
   * Fetch available models from OpenRouter API with caching
   */
  async fetchModels(type: ModelType = "all"): Promise<ModelsListResponse> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        "OpenRouter API key not configured",
      );
    }

    // Check cache
    if (
      this.modelsCache &&
      Date.now() - this.modelsCache.timestamp < this.cacheTTL
    ) {
      this.logger.debug("Returning cached models list");
      return {
        models: this.filterModelsByType(this.modelsCache.data, type),
        cached: true,
      };
    }

    try {
      this.logger.debug("Fetching models from OpenRouter API");
      const response = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": "https://alvobot.com",
          "X-Title": "AlvoBot",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.handleHttpError(response.status, "buscar modelos", errorText);
      }

      const data = await response.json();
      const models: OpenRouterModelResponse[] = (data.data || []).map(
        (model: any) => ({
          id: model.id,
          name: model.name,
          description: model.description,
          context_length: model.context_length,
          pricing: model.pricing,
          architecture: model.architecture || {
            input_modalities: ["text"],
            output_modalities: ["text"],
          },
        }),
      );

      // Update cache
      this.modelsCache = {
        data: models,
        timestamp: Date.now(),
      };

      return {
        models: this.filterModelsByType(models, type),
        cached: false,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logger.error("Error fetching models from OpenRouter:", error);
      throw new ServiceUnavailableException(
        "Failed to fetch models from OpenRouter",
      );
    }
  }

  /**
   * Filter models by capability type
   */
  private filterModelsByType(
    models: OpenRouterModelResponse[],
    type: ModelType,
  ): OpenRouterModelResponse[] {
    if (type === "all") {
      return models;
    }

    return models.filter((model) => {
      const outputModalities = model.architecture?.output_modalities || [
        "text",
      ];
      if (type === "text") {
        return (
          outputModalities.includes("text") &&
          !outputModalities.includes("image")
        );
      }
      if (type === "image") {
        return outputModalities.includes("image");
      }
      return true;
    });
  }

  /**
   * Get image-capable models only
   */
  async getImageModels(): Promise<OpenRouterModelResponse[]> {
    const result = await this.fetchModels("image");
    return result.models;
  }

  /**
   * Get text-only models
   */
  async getTextModels(): Promise<OpenRouterModelResponse[]> {
    const result = await this.fetchModels("text");
    return result.models;
  }

  /**
   * Execute a chat completion request
   */
  async chatCompletion(
    model: string,
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    options: {
      temperature?: number;
      max_tokens?: number;
      response_format?: { type: "json_object" | "text" };
    } = {},
  ): Promise<ChatCompletionResponse> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        "OpenRouter API key not configured",
      );
    }

    const { temperature = 0.7, max_tokens = 2000, response_format } = options;

    try {
      this.logger.debug(`Chat completion with model: ${model}`);
      const startTime = Date.now();

      const body: Record<string, unknown> = {
        model,
        messages,
        temperature,
        max_tokens,
      };

      if (response_format) {
        body.response_format = response_format;
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://alvobot.com",
          "X-Title": "AlvoBot",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.handleHttpError(response.status, "completar chat", errorText);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;
      this.logger.debug(`Chat completion completed in ${duration}ms`);

      return {
        content: data.choices?.[0]?.message?.content || "",
        model: data.model || model,
        tokensUsed: data.usage
          ? {
              prompt: data.usage.prompt_tokens,
              completion: data.usage.completion_tokens,
              total: data.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logger.error("Error in chat completion:", error);
      throw new ServiceUnavailableException("Failed to complete chat request");
    }
  }

  /**
   * Generate an image using OpenRouter (chat completions with modalities)
   */
  async generateImage(
    model: string,
    prompt: string,
    options: {
      aspectRatio?: "1:1" | "16:9" | "9:16";
      resolution?: "1K" | "2K" | "4K";
    } = {},
  ): Promise<ImageGenerationResponse> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        "OpenRouter API key not configured",
      );
    }

    const { aspectRatio = "1:1", resolution = "1K" } = options;

    try {
      this.logger.debug(`Generating image with model: ${model}`);
      const startTime = Date.now();

      const body: Record<string, unknown> = {
        model,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      };

      // Add image config for models that support it (e.g., Gemini)
      if (model.includes("gemini")) {
        body.image_config = {
          aspect_ratio: aspectRatio,
          resolution,
        };
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://alvobot.com",
          "X-Title": "AlvoBot",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.handleHttpError(response.status, "gerar imagem", errorText);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;
      this.logger.debug(`Image generation completed in ${duration}ms`);

      // Extract image from response
      const message = data.choices?.[0]?.message;
      const images = message?.images || [];
      const textContent = message?.content || "";

      if (images.length === 0) {
        throw new ServiceUnavailableException("No image generated");
      }

      // Get the base64 image data
      const imageData = images[0]?.image_url?.url || "";

      // Extract base64 from data URL if present
      let imageBase64 = imageData;
      if (imageData.startsWith("data:image")) {
        const base64Match = imageData.match(/base64,(.+)/);
        imageBase64 = base64Match ? base64Match[1] : imageData;
      }

      return {
        imageBase64,
        mimeType: "image/png",
        description: textContent,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logger.error("Error generating image:", error);
      throw new ServiceUnavailableException("Failed to generate image");
    }
  }

  /**
   * Clear the models cache
   */
  clearCache(): void {
    this.modelsCache = null;
    this.logger.debug("Models cache cleared");
  }
}
