import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  Min,
  Max,
  IsEnum,
} from "class-validator";
import type { AIProvider } from "../../../common/types/ai-provider.types";

export class TestPromptDto {
  @IsString()
  system_prompt: string;

  @IsString()
  user_prompt_template: string;

  @IsObject()
  variables: Record<string, string>;

  @IsOptional()
  @IsEnum(["openai", "openrouter", "google"])
  provider?: AIProvider;

  @IsString()
  @IsOptional()
  model?: string;

  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  temperature?: number;

  @IsNumber()
  @Min(1)
  @Max(128000)
  @IsOptional()
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
