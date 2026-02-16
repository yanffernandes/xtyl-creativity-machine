import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
} from "class-validator";
import { Transform } from "class-transformer";
import { ImageFormat } from "./generate-image.dto";

// ============================================
// Query DTOs
// ============================================

/**
 * DTO for querying creative library
 */
export class LibraryQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  articleId?: number;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  style?: string;

  @IsOptional()
  @IsEnum(ImageFormat)
  format?: ImageFormat;

  @IsOptional()
  @IsString()
  niche?: string;

  @IsOptional()
  @IsString()
  language?: string;
}

/**
 * DTO for credits preview
 */
export class CreditsPreviewDto {
  @IsNumber()
  @Min(1)
  imageCount: number;

  @IsOptional()
  generateAdCopy?: boolean = true;

  @IsOptional()
  @IsString()
  workspaceId?: string;
}

// ============================================
// Response Interfaces
// ============================================

/**
 * Concept info for library item
 */
export interface ConceptInfoDto {
  id: string;
  slug: string;
  name: string;
}

/**
 * Library creative item
 */
export interface LibraryCreativeDto {
  id: string;
  imageUrl: string;
  articleId: number | null;
  articleTitle: string | null;
  model: string;
  style: string | null;
  format: string;
  createdAt: string;
  niche: string | null;
  language: string | null;
  // Andromeda concept tracking
  conceptId: string | null;
  conceptInfo: ConceptInfoDto | null;
  promptUsed: string | null;
}

/**
 * Filter options for creative library dropdowns
 */
export interface LibraryFilterOptionsDto {
  articles: Array<{ id: number; title: string }>;
  niches: string[];
  languages: string[];
  models: string[];
}

/**
 * Pagination info
 */
export interface PaginationDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Library response with pagination
 */
export interface LibraryResponseDto {
  data: LibraryCreativeDto[];
  pagination: PaginationDto;
}

/**
 * Credits preview response
 */
export interface CreditsPreviewResponseDto {
  imageCredits: number;
  textCredits: number;
  totalCredits: number;
  userBalance: number;
  hasSufficientCredits: boolean;
}
