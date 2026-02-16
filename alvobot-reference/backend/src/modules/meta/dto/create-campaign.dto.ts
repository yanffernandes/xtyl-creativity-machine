import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  ValidateNested,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

// ============================================
// Enums matching frontend types
// ============================================

/**
 * Campaign Objectives (ODAX Framework - v22.0+)
 * These are the actual Meta API values.
 * Legacy values (BRAND_AWARENESS, REACH, etc.) are no longer accepted.
 */
export enum CampaignObjective {
  // New ODAX values (direct API values)
  OUTCOME_AWARENESS = "OUTCOME_AWARENESS",
  OUTCOME_TRAFFIC = "OUTCOME_TRAFFIC",
  OUTCOME_ENGAGEMENT = "OUTCOME_ENGAGEMENT",
  OUTCOME_LEADS = "OUTCOME_LEADS",
  OUTCOME_APP_PROMOTION = "OUTCOME_APP_PROMOTION",
  OUTCOME_SALES = "OUTCOME_SALES",

  // Legacy values (kept for backward compatibility with existing templates)
  AWARENESS = "awareness",
  ENGAGEMENT = "engagement",
  LEADS = "leads",
  SALES = "sales",
  TRAFFIC = "traffic",
  MESSAGES = "messages",
  APP_PROMOTION = "app_promotion",
}

export enum ScheduleType {
  CONTINUOUS = "continuous",
  SCHEDULED = "scheduled",
}

export enum PlacementType {
  ADVANTAGE_PLUS = "advantage_plus",
  MANUAL = "manual",
}

export enum ConversionLocation {
  WEBSITE = "website",
  APP = "app",
}

/**
 * Destination types (where the conversion happens)
 * Maps to `destination_type` in the Meta API.
 */
export enum DestinationType {
  WEBSITE = "WEBSITE",
  APP = "APP",
  MESSENGER = "MESSENGER",
  WHATSAPP = "WHATSAPP",
  INSTAGRAM_DIRECT = "INSTAGRAM_DIRECT",
  PHONE_CALL = "PHONE_CALL",
  ON_AD = "ON_AD",
  ON_POST = "ON_POST",
  ON_VIDEO = "ON_VIDEO",
  ON_EVENT = "ON_EVENT",
  SHOP_AUTOMATIC = "SHOP_AUTOMATIC",
  UNDEFINED = "UNDEFINED",
}

/**
 * Bid strategies - actual Meta API values
 */
export enum BidStrategy {
  // New API values
  LOWEST_COST_WITHOUT_CAP = "LOWEST_COST_WITHOUT_CAP",
  COST_CAP = "COST_CAP",
  LOWEST_COST_WITH_BID_CAP = "LOWEST_COST_WITH_BID_CAP",
  LOWEST_COST_WITH_MIN_ROAS = "LOWEST_COST_WITH_MIN_ROAS",

  // Legacy values (kept for backward compatibility)
  LOWEST_COST = "lowest_cost",
  COST_PER_RESULT = "cost_per_result",
  BID_CAP = "bid_cap",
}

export enum BudgetType {
  DAILY = "daily",
  LIFETIME = "lifetime",
}

export enum CreativeSourceType {
  UPLOAD = "upload",
  GOOGLE_DRIVE = "google_drive",
  AI_GENERATED = "ai_generated",
}

export enum MessageDestination {
  WHATSAPP = "WHATSAPP",
  MESSENGER = "MESSENGER",
  INSTAGRAM_DIRECT = "INSTAGRAM_DIRECT",
}

export enum MessageOptimization {
  CONVERSATIONS = "CONVERSATIONS",
  LINK_CLICKS = "LINK_CLICKS",
  LEAD_GENERATION = "LEAD_GENERATION",
}

// ============================================
// Nested DTOs
// ============================================

export class MessageConfigDto {
  @IsOptional()
  @IsEnum(MessageDestination)
  destination?: MessageDestination;

  @IsOptional()
  @IsEnum(MessageOptimization)
  optimization?: MessageOptimization;

  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @IsOptional()
  @IsString()
  greetingMessage?: string;
}

export class MediaFileDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsEnum(["image", "video"])
  type: "image" | "video";

  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsNumber()
  size?: number;

  @IsOptional()
  @IsEnum(CreativeSourceType)
  source?: CreativeSourceType;
}

export class AdCreativeDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  imageId?: string; // Reference to mediaFile.id for matching

  @IsOptional()
  @IsNumber()
  articleId?: number; // Reference to article for URL lookup

  @IsOptional()
  @IsString()
  mediaId?: string;

  @IsOptional()
  @IsString()
  headline?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  primaryText?: string;

  @IsOptional()
  @IsString()
  callToAction?: string;

  @IsOptional()
  @IsString()
  destinationUrl?: string;

  @IsOptional()
  @IsString()
  linkUrl?: string; // Alternative to destinationUrl

  @IsOptional()
  @IsEnum(CreativeSourceType)
  source?: CreativeSourceType;
}

export class UploadStepDto {
  @IsOptional()
  @IsString()
  connectionId?: string; // Connection ID for direct connection lookup

  @IsString()
  adAccountId: string;

  @IsOptional()
  @IsString()
  pageId?: string; // For AI flow

  @IsOptional()
  @IsString()
  instagramAccountId?: string; // For AI flow

  @IsOptional()
  @IsString()
  googleDriveAccountId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaFileDto)
  mediaFiles?: MediaFileDto[];
}

export class CampaignStepDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  objective?: string; // Made string and optional for flexibility with AI flow

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialAdCategories?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialAdCategoryCountry?: string[];

  @IsOptional()
  @IsBoolean()
  advantageBudget?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  campaignBudget?: number;

  @IsOptional()
  @IsEnum(BudgetType)
  campaignBudgetType?: BudgetType;

  @IsOptional()
  @IsString()
  status?: string; // For PAUSED, ACTIVE, etc.
}

export class AdSetStepDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  configType?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  numberOfAdSets?: number;

  @IsOptional()
  @IsString()
  audienceType?: string;

  @IsOptional()
  @IsString()
  audienceId?: string;

  @IsOptional()
  @IsString()
  beneficiary?: string;

  @IsOptional()
  @IsString()
  payer?: string;

  @IsOptional()
  budget?: any; // Made flexible - can be number or object

  @IsOptional()
  @IsString()
  budgetType?: string;

  @IsOptional()
  @IsString()
  scheduleType?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  placementType?: string;

  @IsOptional()
  @IsString()
  conversionLocation?: string;

  @IsOptional()
  @IsString()
  destinationType?: string; // WEBSITE, MESSENGER, WHATSAPP, etc.

  @IsOptional()
  @IsString()
  optimizationGoal?: string;

  @IsOptional()
  @IsString()
  bidStrategy?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bidAmount?: number;

  @IsOptional()
  promotedObject?: Record<string, unknown>; // { pixel_id, custom_event_type, page_id, etc. }

  // AI flow specific fields
  @IsOptional()
  targeting?: any; // Flexible targeting object
}

export class AdStepDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  creativeType?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdCreativeDto)
  creatives?: AdCreativeDto[];

  @IsOptional()
  @IsString()
  facebookPageId?: string;

  @IsOptional()
  @IsString()
  instagramAccountId?: string;

  @IsOptional()
  @IsBoolean()
  pixelEnabled?: boolean;

  @IsOptional()
  @IsString()
  pixelId?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsBoolean()
  appEventsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  offlineEventsEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  offlineEventIds?: string[];

  @IsOptional()
  @IsString()
  urlParameters?: string;

  // AI flow specific fields
  @IsOptional()
  creative?: any; // Flexible creative object for AI flow
}

// ============================================
// Main DTOs
// ============================================

export class CreateCampaignDto {
  @IsString()
  templateName: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UploadStepDto)
  upload?: UploadStepDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CampaignStepDto)
  campaign?: CampaignStepDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdSetStepDto)
  adSet?: AdSetStepDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdStepDto)
  ads?: AdStepDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MessageConfigDto)
  messageConfig?: MessageConfigDto;
}

export class SaveCampaignTemplateDto extends CreateCampaignDto {
  @IsOptional()
  @IsString()
  id?: string; // For updating existing templates

  @IsOptional()
  wizard_state?: Record<string, unknown>; // Full Zustand store snapshot for resume

  @IsOptional()
  @IsString()
  last_wizard_step?: string; // Last wizard step visited
}

export class PublishCampaignDto {
  @IsString()
  templateId: string;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean; // If true, validates but doesn't publish
}

// ============================================
// AI Creative Generation DTOs
// ============================================

export class GenerateCreativeDto {
  @IsString()
  productName: string;

  @IsOptional()
  @IsString()
  productDescription?: string;

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsString()
  tone?: string; // 'professional', 'casual', 'urgent', etc.

  @IsOptional()
  @IsString()
  callToAction?: string;

  @IsOptional()
  @IsString()
  language?: string;
}

export class GenerateAdCopyDto {
  @IsString()
  productName: string;

  @IsOptional()
  @IsString()
  productDescription?: string;

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsString()
  campaignObjective?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  variations?: number; // Number of variations to generate

  @IsOptional()
  @IsString()
  tone?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  workspaceId?: string;
}

export class GenerateImageDto {
  @IsString()
  prompt: string;

  @IsOptional()
  @IsString()
  style?: string; // 'photorealistic', 'illustration', 'minimal', etc.

  @IsOptional()
  @IsString()
  aspectRatio?: string; // '1:1', '16:9', '9:16', etc.

  @IsOptional()
  @IsNumber()
  @Min(1)
  count?: number; // Number of images to generate

  @IsOptional()
  @IsString()
  workspaceId?: string;
}
