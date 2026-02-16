import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  Min,
  Max,
  IsEnum,
} from "class-validator";

export type ModelType = "text" | "image" | "all";

export class FetchModelsDto {
  @IsOptional()
  @IsEnum(["text", "image", "all"])
  type?: ModelType = "all";
}

export class ChatCompletionDto {
  @IsString()
  model: string;

  @IsArray()
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(128000)
  max_tokens?: number;
}

export class GenerateImageDto {
  @IsString()
  model: string;

  @IsString()
  prompt: string;

  @IsOptional()
  @IsString()
  aspectRatio?: "1:1" | "16:9" | "9:16";

  @IsOptional()
  @IsString()
  resolution?: "1K" | "2K" | "4K";
}

export interface OpenRouterModelResponse {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  architecture: {
    input_modalities: string[];
    output_modalities: string[];
  };
}

export interface ModelsListResponse {
  models: OpenRouterModelResponse[];
  cached: boolean;
}

export interface ValidateKeyResponse {
  valid: boolean;
  configured: boolean;
}

export interface ChatCompletionResponse {
  content: string;
  model: string;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface ImageGenerationResponse {
  imageBase64: string;
  mimeType: string;
  description?: string;
}
