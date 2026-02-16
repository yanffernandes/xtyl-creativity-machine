import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  ValidateNested,
  IsDateString,
  Min,
  Max,
  MaxLength,
  MinLength,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";

// ============================================
// Enums
// ============================================

export enum GoogleNetworkType {
  SEARCH = "search",
  DISPLAY = "display",
  SHOPPING = "shopping",
  VIDEO = "video",
  PERFORMANCE_MAX = "performance_max",
}

// Note: Campaign goals (SALES, LEADS, WEBSITE_TRAFFIC) are UI-only concepts in Google Ads.
// The Google Ads API does not support setting marketing objectives directly.
// This enum is kept for backwards compatibility but is not used.
export enum GoogleCampaignGoal {
  SALES = "SALES",
  LEADS = "LEADS",
  WEBSITE_TRAFFIC = "WEBSITE_TRAFFIC",
}

export enum GoogleBiddingStrategy {
  MAXIMIZE_CONVERSIONS = "MAXIMIZE_CONVERSIONS",
  MAXIMIZE_CONVERSION_VALUE = "MAXIMIZE_CONVERSION_VALUE",
  TARGET_CPA = "TARGET_CPA",
  TARGET_ROAS = "TARGET_ROAS",
  MAXIMIZE_CLICKS = "MAXIMIZE_CLICKS",
  MANUAL_CPC = "MANUAL_CPC",
  ENHANCED_CPC = "ENHANCED_CPC",
}

export enum KeywordMatchType {
  BROAD = "BROAD",
  PHRASE = "PHRASE",
  EXACT = "EXACT",
}

export enum KeywordStatus {
  ENABLED = "ENABLED",
  PAUSED = "PAUSED",
  REMOVED = "REMOVED",
}

export enum BudgetType {
  DAILY = "daily",
  TOTAL = "total",
}

// ============================================
// Nested DTOs
// ============================================

export class GoogleKeywordDto {
  @IsString()
  id: string;

  @IsString()
  @MinLength(1)
  text: string;

  @IsEnum(KeywordMatchType)
  matchType: KeywordMatchType;

  @IsEnum(KeywordStatus)
  status: KeywordStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxCpc?: number;
}

export class NegativeKeywordDto {
  @IsString()
  id: string;

  @IsString()
  @MinLength(1)
  text: string;

  @IsEnum(KeywordMatchType)
  matchType: KeywordMatchType;

  @IsEnum(["campaign", "ad_group"])
  level: "campaign" | "ad_group";
}

export class ResponsiveSearchAdDto {
  @IsString()
  id: string;

  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(15)
  @IsString({ each: true })
  headlines: string[]; // max 30 chars each

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  descriptions: string[]; // max 90 chars each

  @IsString()
  finalUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  path1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  path2?: string;
}

export class SitelinkDto {
  @IsString()
  id: string;

  @IsString()
  @MaxLength(25)
  text: string;

  @IsOptional()
  @IsString()
  @MaxLength(35)
  description1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(35)
  description2?: string;

  @IsString()
  finalUrl: string;
}

export class CalloutDto {
  @IsString()
  id: string;

  @IsString()
  @MaxLength(25)
  text: string;
}

export class StructuredSnippetDto {
  @IsString()
  id: string;

  @IsString()
  header: string;

  @IsArray()
  @ArrayMinSize(1) // Relaxed from 3 to allow AI-generated snippets with fewer values
  @ArrayMaxSize(10)
  @IsString({ each: true })
  values: string[];
}

export class CallExtensionDto {
  @IsString()
  phoneNumber: string;

  @IsString()
  countryCode: string;
}

// ============================================
// Step DTOs
// ============================================

export class GoogleAccountStepDto {
  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  connectionId?: string;

  @IsString()
  currency: string;

  @IsString()
  timezone: string;

  @IsOptional()
  @IsBoolean()
  isManager?: boolean;
}

export class GoogleCampaignStepDto {
  @IsString()
  name: string;

  @IsEnum(GoogleNetworkType)
  networkType: GoogleNetworkType;

  // Note: goal is deprecated - Google Ads API does not support marketing objectives
  @IsOptional()
  @IsEnum(GoogleCampaignGoal)
  goal?: GoogleCampaignGoal;

  @IsNumber()
  @Min(1)
  budget: number;

  @IsEnum(BudgetType)
  budgetType: BudgetType;

  @IsEnum(GoogleBiddingStrategy)
  biddingStrategy: GoogleBiddingStrategy;

  @IsOptional()
  @IsNumber()
  @Min(0)
  targetCpa?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  targetRoas?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxCpc?: number;

  @IsArray()
  @IsString({ each: true })
  locations: string[];

  @IsArray()
  @IsString({ each: true })
  languages: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  searchPartners?: boolean;

  @IsOptional()
  @IsBoolean()
  displayNetwork?: boolean;
}

export class GoogleAdGroupStepDto {
  @IsString()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoogleKeywordDto)
  keywords: GoogleKeywordDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NegativeKeywordDto)
  negativeKeywords: NegativeKeywordDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResponsiveSearchAdDto)
  ads: ResponsiveSearchAdDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultBid?: number;
}

export class GoogleExtensionsStepDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SitelinkDto)
  sitelinks: SitelinkDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalloutDto)
  callouts: CalloutDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StructuredSnippetDto)
  structuredSnippets: StructuredSnippetDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CallExtensionDto)
  callExtension?: CallExtensionDto;

  @IsOptional()
  @IsBoolean()
  locationExtension?: boolean;
}

// ============================================
// Main DTOs
// ============================================

export class CreateGoogleCampaignDto {
  @IsString()
  templateName: string;

  @ValidateNested()
  @Type(() => GoogleAccountStepDto)
  account: GoogleAccountStepDto;

  @ValidateNested()
  @Type(() => GoogleCampaignStepDto)
  campaign: GoogleCampaignStepDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoogleAdGroupStepDto)
  adGroups: GoogleAdGroupStepDto[];

  @ValidateNested()
  @Type(() => GoogleExtensionsStepDto)
  extensions: GoogleExtensionsStepDto;
}

export class SaveGoogleTemplateDto extends CreateGoogleCampaignDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsNumber()
  source_article_id?: number;
}

export class PublishGoogleCampaignDto {
  @IsString()
  templateId: string;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

// ============================================
// AI Generation DTOs
// ============================================

export class GenerateKeywordsDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  seedKeywords: string[];

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsString()
  productDescription?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  count?: number;

  @IsString()
  language: string;

  @IsOptional()
  @IsString()
  workspaceId?: string;
}

export class GenerateGoogleAdCopyDto {
  @IsString()
  productName: string;

  @IsOptional()
  @IsString()
  productDescription?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(15)
  headlineCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  descriptionCount?: number;

  @IsOptional()
  @IsString()
  tone?: string;

  @IsString()
  language: string;

  @IsOptional()
  @IsString()
  workspaceId?: string;
}

// ============================================
// Generate from Article DTO
// ============================================

export class GenerateFromArticleDto {
  @Type(() => Number)
  @IsNumber()
  articleId: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsNumber()
  @Min(3)
  @Max(15)
  headlineCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(4)
  descriptionCount?: number;

  @IsOptional()
  @IsString()
  tone?: string;

  @IsOptional()
  @IsString()
  articleUrl?: string;

  @IsString()
  language: string;

  @IsOptional()
  @IsString()
  workspaceId?: string;
}

// ============================================
// Keyword Metrics DTOs
// ============================================

export class GetKeywordMetricsDto {
  @IsString()
  connectionId: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  keywords: string[];

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  loginCustomerId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  geoTargetConstants?: string[];

  @IsOptional()
  @IsString()
  languageId?: string;
}

export class GenerateKeywordIdeasDto {
  @IsString()
  connectionId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seedKeywords?: string[];

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  loginCustomerId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  geoTargetConstants?: string[];

  @IsOptional()
  @IsString()
  languageId?: string;
}

// ============================================
// Keyword Expansion DTO (for fallback when too few keywords)
// ============================================

export class ExpandKeywordDto {
  @IsString()
  originalKeyword: string;

  @IsNumber()
  @Min(0)
  currentCount: number;

  @IsOptional()
  @IsString()
  articleTitle?: string;

  @IsOptional()
  @IsString()
  articleExcerpt?: string;

  @IsString()
  language: string;
}
