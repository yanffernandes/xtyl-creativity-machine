/**
 * Replicate Service - Image generation via Replicate API
 * FR-005: Fallback to Replicate models when OpenRouter fails
 */

import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface ReplicateImageResponse {
  imageBase64: string;
  mimeType: string;
}

// Result when image generation times out but is still processing
export interface ReplicatePendingResponse {
  status: "pending";
  predictionId: string;
  message: string;
}

// Union type for generate image results
export type ReplicateGenerateResult =
  | (ReplicateImageResponse & { status: "completed" })
  | ReplicatePendingResponse;

export interface ReplicateImageOptions {
  aspectRatio?: "1:1" | "4:3" | "3:4" | "16:9" | "9:16";
  resolution?: "1K" | "2K";
  outputFormat?: "png" | "jpg" | "webp";
  safetyFilterLevel?:
    | "block_low_and_above"
    | "block_medium_and_above"
    | "block_only_high";
  quality?: "auto" | "high" | "medium" | "low";
  background?: "auto" | "transparent" | "opaque";
  moderation?: "auto" | "low" | "medium" | "high";
  inputFidelity?: "low" | "high";
  numberOfImages?: number;
  outputCompression?: number;
  imageInput?: string[];
  inputImages?: string[];
}

// Available models on Replicate for image generation
export const REPLICATE_MODELS = {
  NANO_BANANA_PRO: "google/nano-banana-pro",
  GPT_IMAGE_1_5: "openai/gpt-image-1.5",
} as const;

@Injectable()
export class ReplicateService {
  private readonly logger = new Logger(ReplicateService.name);
  private readonly apiKey: string | undefined;
  private readonly baseUrl = "https://api.replicate.com/v1";

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>("REPLICATE_API_KEY");
    if (this.apiKey) {
      this.logger.log("Replicate service initialized");
    } else {
      this.logger.warn(
        "REPLICATE_API_KEY not configured - Replicate features will not work",
      );
    }
  }

  /**
   * Check if Replicate is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Generate an image using Replicate API
   * Returns a pending result with prediction_id if the request times out
   * (image may still complete on Replicate's side)
   *
   * @param model Model identifier (e.g., "google/nano-banana-pro")
   * @param prompt Image generation prompt
   * @param options Additional options
   */
  async generateImage(
    model: string,
    prompt: string,
    options: ReplicateImageOptions = {},
  ): Promise<ReplicateGenerateResult> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException("Replicate API key not configured");
    }

    const {
      aspectRatio = "1:1",
      resolution = "2K",
      outputFormat = "png",
      safetyFilterLevel = "block_only_high",
      quality = "auto",
      background = "auto",
      moderation = "auto",
      inputFidelity = "low",
      numberOfImages = 1,
      outputCompression = 90,
      imageInput = [],
      inputImages = [],
    } = options;

    // Retry configuration for transient errors (cold starts, deployment timeouts)
    const maxRetries = 3;
    const retryableErrors = [
      "deployment deadline exceeded",
      "cold boot",
      "model is starting",
      "temporarily unavailable",
    ];

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(
          `[Replicate] Starting image generation - model: ${model}, prompt_length: ${prompt.length}, attempt: ${attempt}/${maxRetries}`,
        );
        const startTime = Date.now();

        // Build model-specific input parameters
        const input = this.buildModelInput(model, prompt, {
          aspectRatio,
          resolution,
          outputFormat,
          safetyFilterLevel,
          quality,
          background,
          moderation,
          inputFidelity,
          numberOfImages,
          outputCompression,
          imageInput,
          inputImages,
        });

        // Create prediction using the models endpoint (no version hash needed)
        // Format: POST /models/{owner}/{name}/predictions
        // Note: Removed "Prefer: wait" header to use polling instead,
        // which gives us more control over timeout behavior
        const createResponse = await fetch(
          `${this.baseUrl}/models/${model}/predictions`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ input }),
          },
        );

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          this.logger.error(
            `[Replicate] Failed to create prediction: ${createResponse.status} - ${errorText}`,
          );
          throw new ServiceUnavailableException(
            `Replicate error: ${createResponse.status}`,
          );
        }

        const prediction = await createResponse.json();
        const predictionId = prediction.id;

        this.logger.debug(
          `[Replicate] Prediction created: ${predictionId}, status: ${prediction.status}`,
        );

        // Helper function to process completed prediction
        const processCompletedPrediction = async (status: {
          output?: string | string[];
          error?: string;
          status: string;
        }): Promise<ReplicateGenerateResult | null> => {
          if (status.status === "succeeded") {
            const duration = Date.now() - startTime;
            this.logger.log(
              `[Replicate] Image generation SUCCESS - model: ${model}, elapsed_ms: ${duration}`,
            );

            // Get the output URL
            const outputUrl = this.extractOutputUrl(status.output);
            if (!outputUrl) {
              throw new ServiceUnavailableException(
                "No image in Replicate output",
              );
            }

            // Fetch the image and convert to base64
            const imageResponse = await fetch(outputUrl);
            if (!imageResponse.ok) {
              throw new ServiceUnavailableException(
                "Failed to fetch generated image",
              );
            }

            const imageBuffer = await imageResponse.arrayBuffer();
            const imageBase64 = Buffer.from(imageBuffer).toString("base64");

            const mimeType = this.getMimeType(outputUrl, outputFormat);

            return {
              status: "completed" as const,
              imageBase64,
              mimeType,
            };
          }

          if (status.status === "failed" || status.status === "canceled") {
            const duration = Date.now() - startTime;
            const errorMsg = status.error || "Unknown error";
            this.logger.error(
              `[Replicate] Image generation FAILED - model: ${model}, elapsed_ms: ${duration}, error: ${errorMsg}`,
            );

            // Check if this is a retryable error (cold start / deployment timeout)
            const isRetryable = retryableErrors.some((re) =>
              errorMsg.toLowerCase().includes(re.toLowerCase()),
            );

            if (isRetryable && attempt < maxRetries) {
              // Signal that we should retry
              const retryError = new Error(errorMsg);
              (retryError as any).isRetryable = true;
              throw retryError;
            }

            throw new ServiceUnavailableException(errorMsg);
          }

          return null; // Still processing
        };

        // Check if prediction already completed (immediate response)
        const immediateResult = await processCompletedPrediction(prediction);
        if (immediateResult) {
          return immediateResult;
        }

        // Poll for completion (max 120 seconds - increased from 60s for cold starts)
        const maxWaitTime = 120000;
        const pollInterval = 3000; // 3 seconds between polls
        let elapsedTime = 0;

        while (elapsedTime < maxWaitTime) {
          await this.sleep(pollInterval);
          elapsedTime += pollInterval;

          const statusResponse = await fetch(
            `${this.baseUrl}/predictions/${predictionId}`,
            {
              headers: {
                Authorization: `Bearer ${this.apiKey}`,
              },
            },
          );

          if (!statusResponse.ok) {
            throw new ServiceUnavailableException(
              "Failed to check prediction status",
            );
          }

          const status = await statusResponse.json();
          const result = await processCompletedPrediction(status);
          if (result) {
            return result;
          }

          this.logger.debug(
            `[Replicate] Prediction ${predictionId} status: ${status.status}, elapsed: ${elapsedTime}ms`,
          );
        }

        // Timeout - return pending instead of throwing
        // The image may still complete on Replicate's side
        this.logger.warn(
          `[Replicate] Image generation TIMEOUT - model: ${model}, elapsed_ms: ${elapsedTime}, predictionId: ${predictionId}`,
        );
        return {
          status: "pending" as const,
          predictionId,
          message:
            "A geração está demorando mais que o esperado. Você pode verificar o status posteriormente.",
        };
      } catch (error) {
        // Check if this is a retryable error
        if ((error as any).isRetryable && attempt < maxRetries) {
          const backoffMs = Math.min(5000 * Math.pow(2, attempt - 1), 30000); // 5s, 10s, 20s max 30s
          this.logger.warn(
            `[Replicate] Retryable error on attempt ${attempt}/${maxRetries}. Waiting ${backoffMs}ms before retry...`,
          );
          await this.sleep(backoffMs);
          continue; // Retry
        }

        if (error instanceof ServiceUnavailableException) {
          throw error;
        }
        this.logger.error(
          `[Replicate] Unexpected error: ${error instanceof Error ? error.message : error}`,
        );
        throw new ServiceUnavailableException(
          "Failed to generate image with Replicate",
        );
      }
    }

    // Should not reach here, but just in case
    throw new ServiceUnavailableException(
      "Failed to generate image with Replicate after all retries",
    );
  }

  /**
   * Build model-specific input parameters
   * Each Replicate model has different required/optional parameters
   */
  private buildModelInput(
    model: string,
    prompt: string,
    options: ReplicateImageOptions,
  ): Record<string, unknown> {
    const {
      aspectRatio = "1:1",
      resolution = "2K",
      outputFormat = "png",
      safetyFilterLevel = "block_only_high",
      quality = "auto",
      background = "auto",
      moderation = "auto",
      inputFidelity = "low",
      numberOfImages = 1,
      outputCompression = 90,
      imageInput = [],
      inputImages = [],
    } = options;

    // Nano Banana Pro (Google's model)
    if (model === REPLICATE_MODELS.NANO_BANANA_PRO) {
      return {
        prompt,
        resolution,
        image_input: imageInput,
        aspect_ratio: aspectRatio,
        output_format: outputFormat,
        safety_filter_level: safetyFilterLevel,
      };
    }

    // GPT Image 1.5 (OpenAI's model via Replicate)
    if (model === REPLICATE_MODELS.GPT_IMAGE_1_5) {
      const includeCompression =
        outputFormat.toLowerCase() === "webp" ? outputCompression : undefined;

      return {
        prompt,
        quality,
        background,
        moderation,
        aspect_ratio: aspectRatio,
        output_format: outputFormat,
        input_fidelity: inputFidelity,
        number_of_images: numberOfImages,
        ...(includeCompression !== undefined
          ? { output_compression: includeCompression }
          : {}),
        input_images: inputImages,
      };
    }

    // Default fallback for unknown models
    this.logger.warn(
      `[Replicate] Unknown model: ${model}, using generic params`,
    );
    return {
      prompt,
      aspect_ratio: aspectRatio,
    };
  }

  private extractOutputUrl(
    output: string | string[] | undefined,
  ): string | null {
    if (!output) return null;
    if (Array.isArray(output)) {
      return output[0] || null;
    }
    if (typeof output === "string") {
      return output;
    }
    return null;
  }

  private getMimeType(outputUrl: string, outputFormat?: string): string {
    const format = outputFormat?.toLowerCase();
    if (format === "webp") return "image/webp";
    if (format === "jpg" || format === "jpeg") return "image/jpeg";
    if (format === "png") return "image/png";

    if (outputUrl.includes(".webp")) return "image/webp";
    if (outputUrl.includes(".jpg") || outputUrl.includes(".jpeg"))
      return "image/jpeg";
    return "image/png";
  }

  /**
   * Helper to sleep for polling
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check the status of a pending prediction and retrieve the image if completed
   * @param predictionId The prediction ID from a previous generateImage call that returned 'pending'
   */
  async checkPrediction(
    predictionId: string,
  ): Promise<ReplicateGenerateResult> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException("Replicate API key not configured");
    }

    try {
      this.logger.debug(
        `[Replicate] Checking prediction status: ${predictionId}`,
      );

      const statusResponse = await fetch(
        `${this.baseUrl}/predictions/${predictionId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!statusResponse.ok) {
        if (statusResponse.status === 404) {
          throw new ServiceUnavailableException(
            "Prediction not found. It may have expired.",
          );
        }
        throw new ServiceUnavailableException(
          `Failed to check prediction status: ${statusResponse.status}`,
        );
      }

      const prediction = await statusResponse.json();

      if (prediction.status === "succeeded") {
        this.logger.log(
          `[Replicate] Prediction ${predictionId} completed successfully`,
        );

        const outputUrl = this.extractOutputUrl(prediction.output);
        if (!outputUrl) {
          throw new ServiceUnavailableException("No image in Replicate output");
        }

        // Fetch the image and convert to base64
        const imageResponse = await fetch(outputUrl);
        if (!imageResponse.ok) {
          throw new ServiceUnavailableException(
            "Failed to fetch generated image",
          );
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        const imageBase64 = Buffer.from(imageBuffer).toString("base64");

        // Try to determine mime type from URL
        const mimeType = this.getMimeType(outputUrl);

        return {
          status: "completed",
          imageBase64,
          mimeType,
        };
      }

      if (prediction.status === "failed" || prediction.status === "canceled") {
        this.logger.error(
          `[Replicate] Prediction ${predictionId} failed: ${prediction.error || "Unknown error"}`,
        );
        throw new ServiceUnavailableException(
          prediction.error || "Image generation failed",
        );
      }

      // Still processing
      this.logger.debug(
        `[Replicate] Prediction ${predictionId} still processing: ${prediction.status}`,
      );
      return {
        status: "pending",
        predictionId,
        message: `A imagem ainda está sendo gerada. Status: ${prediction.status}`,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logger.error(
        `[Replicate] Error checking prediction: ${error instanceof Error ? error.message : error}`,
      );
      throw new ServiceUnavailableException(
        "Failed to check prediction status",
      );
    }
  }
}
