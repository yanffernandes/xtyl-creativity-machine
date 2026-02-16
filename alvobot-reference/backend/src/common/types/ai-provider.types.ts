/**
 * Shared AI Provider Types
 * Used across OpenRouter and OpenAI integrations
 */

export type AIProvider = "openai" | "openrouter" | "google" | "replicate";

export interface ProviderConfig {
  provider: AIProvider;
  model: string;
}

export interface OpenRouterModel {
  id: string; // e.g., "openai/gpt-4o"
  name: string; // e.g., "GPT-4o"
  description?: string;
  context_length: number;
  pricing: {
    prompt: string; // USD per token
    completion: string;
  };
  architecture: {
    input_modalities: string[]; // ["text", "image"]
    output_modalities: string[]; // ["text"] or ["text", "image"]
  };
}

export interface OpenRouterModelListResponse {
  data: OpenRouterModel[];
}

export interface DefaultImageModelConfig {
  provider: AIProvider;
  model: string;
}

export interface TestPromptRequest {
  system_prompt: string;
  user_prompt_template: string;
  variables: Record<string, string>;
  provider?: AIProvider;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface TestPromptResponse {
  output: string;
  processingTime: number;
  provider: AIProvider;
  model: string;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
}
