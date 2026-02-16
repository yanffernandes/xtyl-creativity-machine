import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsArray,
  IsObject,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ConditionGroup } from './condition.dto';
import { FilterGroup } from './filter.dto';
import { Task } from './task.dto';
import { Schedule } from './schedule.dto';

// ============================================================================
// SHARED ENUMS & TYPES
// ============================================================================

/**
 * Supported ad platforms.
 */
export type Platform = 'meta' | 'google';

export const PLATFORMS: Platform[] = ['meta', 'google'];

/**
 * Rule lifecycle status.
 */
export type RuleStatus = 'active' | 'paused' | 'draft';

export const RULE_STATUSES: RuleStatus[] = ['active', 'paused', 'draft'];

/**
 * Entity hierarchy level the rule operates on.
 */
export type EntityLevel =
  | 'campaign'
  | 'adset' // Meta only
  | 'ad_group' // Google only
  | 'ad'
  | 'keyword' // Google only
  | 'ad_account'; // Notify only

export const ENTITY_LEVELS: EntityLevel[] = [
  'campaign',
  'adset',
  'ad_group',
  'ad',
  'keyword',
  'ad_account',
];

/**
 * Google campaign type — required when platform is 'google'.
 */
export type GoogleCampaignType =
  | 'search'
  | 'display'
  | 'shopping'
  | 'app'
  | 'performance_max'
  | 'demand_gen';

export const GOOGLE_CAMPAIGN_TYPES: GoogleCampaignType[] = [
  'search',
  'display',
  'shopping',
  'app',
  'performance_max',
  'demand_gen',
];

/**
 * Meta attribution windows.
 */
export type MetaAttributionWindow =
  | '1d_click'
  | '7d_click'
  | '1d_click_1d_view'
  | '7d_click_1d_view'
  | '28d_click_1d_view';

/**
 * Google attribution windows.
 */
export type GoogleAttributionWindow =
  | '30_days'
  | '60_days'
  | '90_days'
  | 'data_driven';

/**
 * Attribution configuration for conversion metrics.
 */
export interface AttributionConfig {
  useEntitySetting: boolean;
  window?: MetaAttributionWindow | GoogleAttributionWindow;
}

/**
 * Notification configuration for rule execution events.
 */
export interface NotificationConfig {
  emails: string[];
  notifyOnAction: boolean;
  notifyOnError: boolean;
  notifyOnNoMatch: boolean;
  includeSummary: boolean;
  includeEntityDetails: boolean;
  includeMetricsSnapshot: boolean;
  customSubject?: string;
}

// ============================================================================
// REQUEST DTOs (class-validator decorated)
// ============================================================================

/**
 * DTO for creating a new automation rule.
 * Status defaults to 'draft'.
 */
export class CreateAutomationRuleDto {
  @ApiProperty({ description: 'Rule name', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Rule description', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'Target ad platform', enum: PLATFORMS })
  @IsEnum(PLATFORMS)
  platform: Platform;

  @ApiProperty({
    description: 'Connection IDs for the ad accounts',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  connectionIds: string[];

  @ApiPropertyOptional({
    description: 'Ad account IDs (max 5 for Meta, 1 for Google)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  adAccountIds?: string[];

  @ApiPropertyOptional({
    description: 'Google campaign type (required when platform is google)',
    enum: GOOGLE_CAMPAIGN_TYPES,
  })
  @IsOptional()
  @IsEnum(GOOGLE_CAMPAIGN_TYPES)
  googleCampaignType?: GoogleCampaignType;

  @ApiProperty({
    description: 'Entity level the rule operates on',
    enum: ENTITY_LEVELS,
  })
  @IsEnum(ENTITY_LEVELS)
  level: EntityLevel;

  @ApiPropertyOptional({
    description:
      'Scope filters (array of arrays: AND within group, OR between groups)',
  })
  @IsOptional()
  @IsArray()
  filters?: FilterGroup[];

  @ApiProperty({
    description: 'Tasks (actions with their conditions and frequency caps)',
  })
  @IsArray()
  tasks: Task[];

  @ApiProperty({ description: 'Execution schedule configuration' })
  @IsObject()
  schedule: Schedule;

  @ApiPropertyOptional({
    description: 'IANA timezone (e.g., "America/Sao_Paulo")',
    default: 'America/Sao_Paulo',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Attribution configuration' })
  @IsOptional()
  @IsObject()
  attribution?: AttributionConfig;

  @ApiPropertyOptional({ description: 'Notification configuration' })
  @IsOptional()
  @IsObject()
  notifications?: NotificationConfig;

  @ApiPropertyOptional({
    description: 'Initial rule status (defaults to draft)',
    enum: RULE_STATUSES,
  })
  @IsOptional()
  @IsEnum(RULE_STATUSES)
  status?: RuleStatus;
}

/**
 * DTO for updating an existing automation rule.
 * All fields are optional (PartialType).
 */
export class UpdateAutomationRuleDto extends PartialType(
  CreateAutomationRuleDto,
) {}

/**
 * DTO for toggling a rule's status (activate/pause).
 */
export class ToggleRuleDto {
  @ApiProperty({
    description: 'New rule status',
    enum: ['active', 'paused'],
  })
  @IsEnum(['active', 'paused'])
  status: 'active' | 'paused';
}

/**
 * DTO for list query parameters.
 */
export class GetAutomationRulesQueryDto {
  @ApiPropertyOptional({ description: 'Filter by platform' })
  @IsOptional()
  @IsEnum(PLATFORMS)
  platform?: Platform;

  @ApiPropertyOptional({
    description: 'Filter by rule status',
    enum: RULE_STATUSES,
  })
  @IsOptional()
  @IsEnum(RULE_STATUSES)
  status?: RuleStatus;

  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by workspace ID' })
  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @ApiPropertyOptional({ description: 'Page number (1-indexed)', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

// ============================================================================
// RESPONSE DTOs (plain interfaces — no class-validator)
// ============================================================================

/**
 * Response shape for a single automation rule.
 */
export interface AutomationRuleResponseDto {
  id: string;
  userId: string;
  workspaceId?: string;

  name: string;
  description?: string;
  status: RuleStatus;

  platform: Platform;
  connectionIds: string[];
  adAccountIds?: string[];
  googleCampaignType?: GoogleCampaignType;

  level: EntityLevel;
  filters: FilterGroup[];
  tasks: Task[];
  schedule: Schedule;
  timezone: string;
  attribution?: AttributionConfig;
  notifications?: NotificationConfig;

  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;

  /** Non-blocking warnings about the rule configuration */
  warnings?: string[];
}

/**
 * Paginated list response for automation rules.
 */
export interface AutomationRulesListResponseDto {
  rules: AutomationRuleResponseDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Preview result showing entities that would be affected.
 */
export interface PreviewResultDto {
  matchingEntities: Array<{
    entityId: string;
    entityName: string;
    entityType: EntityLevel;
    platform: Platform;
    currentMetrics: Record<string, number>;
    wouldExecuteTasks: Array<{
      taskIndex: number;
      action: string;
      conditionsMet: boolean;
      skippedByCap: boolean;
    }>;
  }>;
  summary: {
    totalEvaluated: number;
    totalMatchedFilters: number;
    totalMatchedConditions: number;
    totalWouldBeAffected: number;
  };
  previewedAt: string;

  /** Warnings about the preview results (e.g., too many entities) */
  warnings?: string[];
}
