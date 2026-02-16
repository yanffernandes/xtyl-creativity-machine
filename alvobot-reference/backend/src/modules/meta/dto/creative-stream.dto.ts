/**
 * DTOs for Real-time Creative Generation Streaming (SSE)
 * POST /meta/creatives/generate/init - Initialize session
 * GET /meta/creatives/generate/stream - SSE endpoint
 */

import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { ImageFormat } from "./generate-image.dto";
import {
  GenerationMode,
  ArticleContextForGenerationDto,
  ConceptSelectionDto,
  TargetingInfoDto,
} from "./generate-creative.dto";

// ============================================
// Request DTOs
// ============================================

/**
 * Request to initialize streaming generation session
 */
export class InitCreativeGenerationDto {
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
}

/**
 * Request to retry a failed image
 */
export class RetryGenerationDto {
  @IsString()
  sessionId: string;

  @IsString()
  imageId: string;

  @IsOptional()
  @IsString()
  workspaceId?: string;
}

// ============================================
// Response DTOs
// ============================================

/**
 * Status of an individual image slot
 */
export type CreativeSlotStatus =
  | "queued"
  | "generating"
  | "completed"
  | "failed"
  | "retrying";

/**
 * Individual creative slot in a session
 */
export interface CreativeSlotDto {
  imageId: string;
  index: number;
  status: CreativeSlotStatus;
  articleId: number;
  conceptName?: string;
  conceptSlug?: string;
  // Populated when generating
  modelUsed?: string;
  // Populated when completed
  imageUrl?: string;
  storagePath?: string;
  backgroundStyle?: string;
  promptUsed?: string;
  libraryId?: string;
  conceptUsed?: {
    id: string;
    slug: string;
    name: string;
  };
  // Error info
  error?: string;
  canRetry?: boolean;
  isPending?: boolean;
  pendingId?: string;
  // Retry tracking
  retryAttempt?: number;
  maxRetryAttempts?: number;
}

/**
 * Response from init endpoint
 */
export interface InitCreativeGenerationResponseDto {
  sessionId: string;
  totalImages: number;
  estimatedTimeSeconds: number;
  images: CreativeSlotDto[];
}

// ============================================
// SSE Event Types
// ============================================

export type CreativeStreamEventType =
  | "sync"
  | "started"
  | "queued"
  | "generating"
  | "completed"
  | "failed"
  | "retrying"
  | "done";

/**
 * Base event interface
 */
export interface CreativeStreamEventBase {
  type: CreativeStreamEventType;
  sessionId: string;
  timestamp: string;
}

/**
 * Sync event - sent on connection to provide current state
 */
export interface SyncEvent extends CreativeStreamEventBase {
  type: "sync";
  slots: CreativeSlotDto[];
}

/**
 * Started event - generation session has begun
 */
export interface StartedEvent extends CreativeStreamEventBase {
  type: "started";
  totalImages: number;
}

/**
 * Queued event - image added to generation queue
 */
export interface QueuedEvent extends CreativeStreamEventBase {
  type: "queued";
  imageId: string;
  index: number;
  articleId: number;
  conceptName?: string;
  conceptSlug?: string;
}

/**
 * Generating event - image is being generated
 */
export interface GeneratingEvent extends CreativeStreamEventBase {
  type: "generating";
  imageId: string;
  index: number;
  model: string;
}

/**
 * Completed event - image successfully generated
 */
export interface CompletedEvent extends CreativeStreamEventBase {
  type: "completed";
  imageId: string;
  index: number;
  imageUrl: string;
  storagePath: string;
  modelUsed: string;
  conceptUsed?: {
    id: string;
    slug: string;
    name: string;
  };
  backgroundStyle?: string;
  promptUsed: string;
  libraryId: string;
}

/**
 * Failed event - image generation failed
 */
export interface FailedEvent extends CreativeStreamEventBase {
  type: "failed";
  imageId: string;
  index: number;
  error: string;
  canRetry: boolean;
  isPending: boolean;
  pendingId?: string;
}

/**
 * Retrying event - image is being retried
 */
export interface RetryingEvent extends CreativeStreamEventBase {
  type: "retrying";
  imageId: string;
  index: number;
  attempt: number;
  maxAttempts: number;
}

/**
 * Done event - all images have been processed
 */
export interface DoneEvent extends CreativeStreamEventBase {
  type: "done";
  totalGenerated: number;
  totalFailed: number;
  totalPending: number;
  creditsConsumed: number;
  diversity?: {
    uniqueConcepts: number;
    uniqueBackgrounds: number;
    uniqueModels: number;
    diversityScore: number;
  };
}

/**
 * Union type of all SSE events
 */
export type AnyCreativeStreamEvent =
  | SyncEvent
  | StartedEvent
  | QueuedEvent
  | GeneratingEvent
  | CompletedEvent
  | FailedEvent
  | RetryingEvent
  | DoneEvent;
