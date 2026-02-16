/**
 * DTOs for Andromeda Creative Diversity System
 * POST /meta/creatives/generate endpoint
 */

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
  IsUUID,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";
import { ImageFormat } from "./generate-image.dto";

// ============================================
// Enums
// ============================================

export enum GenerationMode {
  PRESET = "preset",
  FREE = "free",
}

// ============================================
// Nested DTOs
// ============================================

/**
 * Article context for creative generation
 */
export class ArticleContextForGenerationDto {
  @IsNumber()
  id: number;

  @IsString()
  title: string;

  @IsString()
  keyword: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsString()
  language?: string; // Source language of the article (e.g., 'english', 'portugues', 'pt', 'en')

  @IsOptional()
  @IsString()
  country?: string; // Country code (ISO 3166-1 alpha-2) for localization (e.g., 'BR', 'US', 'SA')
}

/**
 * Concept selection for preset mode
 */
export class ConceptSelectionDto {
  @IsUUID()
  conceptId: string;

  @IsNumber()
  @Min(1)
  @Max(20)
  quantity: number;
}

/**
 * Targeting info for localization
 */
export class TargetingInfoDto {
  @IsArray()
  @IsString({ each: true })
  countries: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguageDto)
  languages?: LanguageDto[];
}

export class LanguageDto {
  @IsString()
  key: string;

  @IsString()
  name: string;
}

// ============================================
// Main Request DTO
// ============================================

/**
 * Request body for generating diverse creatives
 */
export class GenerateCreativesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArticleContextForGenerationDto)
  articles: ArticleContextForGenerationDto[];

  @IsNumber()
  @Min(1)
  @Max(50)
  count: number;

  @IsEnum(GenerationMode)
  mode: GenerationMode;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConceptSelectionDto)
  conceptSelections?: ConceptSelectionDto[];

  @IsEnum(ImageFormat)
  format: ImageFormat;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  userDirections?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TargetingInfoDto)
  targeting?: TargetingInfoDto;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;
}

// ============================================
// Response Interfaces
// ============================================

/**
 * Concept info in response
 */
export interface ConceptUsedDto {
  id: string;
  slug: string;
  name: string;
}

/**
 * Visual group info in response
 */
export interface VisualGroupUsedDto {
  code: string;
  name: string;
  variationIndex: number;
}

/**
 * A single generated creative with diversity tracking
 */
export interface GeneratedCreativeResultDto {
  id: string;
  articleId: number;
  imageUrl: string;
  storagePath: string;
  modelUsed: string;
  conceptUsed: ConceptUsedDto;
  visualGroup?: VisualGroupUsedDto;
  backgroundStyle: string;
  promptUsed: string;
  format: string;
  status: "completed" | "failed" | "pending"; // pending = still generating on provider
  error?: string;
  adsetIndex: number;
  libraryId: string;
  createdAt: string;
}

/**
 * Diversity metrics for the session
 */
export interface DiversityMetricsDto {
  uniqueConcepts: number;
  uniqueBackgrounds: number;
  uniqueModels: number;
  totalGenerated: number;
  diversityScore: number;
  meetsThreshold: boolean;
}

/**
 * Response from diverse creative generation
 */
export interface GenerateCreativesResponseDto {
  creatives: GeneratedCreativeResultDto[];
  sessionId: string;
  diversity: DiversityMetricsDto;
  creditsConsumed: number;
  stats: {
    totalRequested: number;
    totalGenerated: number;
    totalFailed: number;
    averageGenerationTime: number;
  };
  detectedNiche?: string;
}

// ============================================
// Niche Detection DTOs
// ============================================

/**
 * Request for niche detection
 */
export class DetectNicheDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArticleContextForGenerationDto)
  articles: ArticleContextForGenerationDto[];
}

/**
 * Keyword match in detection
 */
export interface KeywordMatchDto {
  keyword: string;
  niche: string;
  confidence: number;
  source: "title" | "keyword" | "excerpt" | "category";
}

/**
 * Per-article niche detection result
 */
export interface ArticleNicheResultDto {
  articleId: number;
  detectedNiche: string;
  confidence: number;
  matchedKeywords: KeywordMatchDto[];
}

/**
 * Response from niche detection
 */
export interface DetectNicheResponseDto {
  detectedNiche: string;
  confidence: number;
  applySpecializedTemplate: boolean;
  articleResults: ArticleNicheResultDto[];
  triggerKeywords: string[];
  recommendations: {
    useMasterTemplate: boolean;
    suggestedConcepts: string[];
    suggestedVisualGroups?: string[];
  };
}

// ============================================
// Get Concepts DTOs
// ============================================

/**
 * Query params for getting concepts
 */
export class GetConceptsQueryDto {
  @IsOptional()
  @IsString()
  niche?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;
}
