import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateNested,
  Min,
  Max,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";

// ============================================
// Enums
// ============================================

export enum ImageModel {
  DALLE_3 = "dall-e-3",
  IMAGEN_3 = "imagen-3",
}

export enum ImageFormat {
  SQUARE = "1:1",
  STORY = "9:16",
  LANDSCAPE = "16:9",
}

export enum ImageStyle {
  PHOTOREALISTIC = "photorealistic",
  ILLUSTRATION = "illustration",
  MINIMALIST = "minimalist",
  CINEMATIC = "cinematic",
  WATERCOLOR = "watercolor",
}

// ============================================
// Nested DTOs
// ============================================

export class ArticleContextDto {
  @IsNumber()
  id: number;

  @IsString()
  title: string;

  @IsString()
  keyword: string;

  @IsOptional()
  @IsString()
  excerpt?: string;
}

// ============================================
// Main DTOs
// ============================================

/**
 * DTO for generating multiple images
 */
export class GenerateImagesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArticleContextDto)
  articles: ArticleContextDto[];

  @IsNumber()
  @Min(1)
  @Max(20)
  count: number;

  @IsOptional()
  @IsEnum(ImageModel)
  model?: ImageModel;

  @IsEnum(ImageFormat)
  format: ImageFormat;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  userDirections?: string;

  @IsOptional()
  @IsString()
  workspaceId?: string;
}

/**
 * DTO for regenerating a single image
 */
export class RegenerateImageDto {
  @IsNumber()
  articleId: number;

  @IsNumber()
  @Min(0)
  adsetIndex: number;

  @IsOptional()
  @IsEnum(ImageModel)
  model?: ImageModel;

  @IsEnum(ImageFormat)
  format: ImageFormat;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  userDirections?: string;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  /**
   * Original prompt to reuse (for "regenerate same" option)
   * When provided, skips prompt generation and uses this directly
   */
  @IsOptional()
  @IsString()
  originalPrompt?: string;

  /**
   * Original model used (provider/model format)
   * When provided, uses this model instead of default
   */
  @IsOptional()
  @IsString()
  originalModel?: string;
}

/**
 * DTO for generating ad copy for an image
 */
export class GenerateAdCopyDto {
  @IsString()
  libraryId: string;

  @IsNumber()
  articleId: number;

  @IsOptional()
  @IsString()
  workspaceId?: string;
}

// ============================================
// Response Interfaces
// ============================================

export interface GeneratedImageResult {
  id: string;
  articleId: number;
  imageUrl: string;
  storagePath: string;
  model: string;
  style: string;
  promptUsed: string;
  format: ImageFormat;
  status: "completed" | "failed";
  error?: string;
  adsetIndex: number;
}

export interface GenerateImagesResponse {
  images: GeneratedImageResult[];
  creditsConsumed: number;
  totalGenerated: number;
  totalFailed: number;
}

export interface GenerateAdCopyResponse {
  primaryText: string;
  headline: string;
  description: string;
  suggestedCta: string;
  creditsConsumed: number;
}
