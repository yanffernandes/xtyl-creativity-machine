import { IsString, IsNotEmpty, IsEnum } from "class-validator";
import { AIProvider } from "../../../common/types/ai-provider.types";

/**
 * DTO for default image model configuration
 */
export class DefaultImageModelDto {
  @IsNotEmpty()
  @IsEnum(["openai", "openrouter", "google"])
  provider: AIProvider;

  @IsNotEmpty()
  @IsString()
  model: string;
}

export interface DefaultImageModelResponse {
  provider: AIProvider;
  model: string;
  updated_at?: string;
}
