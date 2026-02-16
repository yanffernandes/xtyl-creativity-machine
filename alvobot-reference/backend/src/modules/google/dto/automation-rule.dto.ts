import {
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsObject,
  Min,
  MaxLength,
} from "class-validator";

// Condition types
export type ConditionOperator = ">" | "<" | ">=" | "<=" | "==" | "!=";
export type LogicalOperator = "AND" | "OR";

export type MetricType =
  | "impressions"
  | "clicks"
  | "ctr"
  | "cost"
  | "conversions"
  | "cpa"
  | "roas"
  | "runtime_hours"
  | "budget_spent_percent";

export type PeriodType = "today" | "last_24h" | "last_7d" | "last_30d";

export interface Condition {
  type: "condition";
  metric: MetricType;
  operator: ConditionOperator;
  value: number;
  period?: PeriodType;
}

export interface ConditionGroup {
  type: "group";
  operator: LogicalOperator;
  children: (ConditionGroup | Condition)[];
}

export type ConditionTree = ConditionGroup | Condition;

// Scope filters
export interface ScopeFilters {
  nameContains?: string;
  nameNotContains?: string;
  status?: "ENABLED" | "PAUSED";
  minBudget?: number;
  maxBudget?: number;
  campaignIds?: string[];
  biddingStrategyType?: string;
}

// Action types
export type ActionType =
  | "pause"
  | "enable"
  | "increase_budget"
  | "decrease_budget"
  | "increase_bid"
  | "decrease_bid"
  | "increase_target_cpa"
  | "decrease_target_cpa"
  | "increase_target_roas"
  | "decrease_target_roas";

export type ActionValueType = "absolute" | "percentage";

// DTOs
export class CreateAutomationRuleDto {
  @IsUUID()
  connectionId: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(["all", "filter"])
  scopeType: "all" | "filter" = "all";

  @IsOptional()
  @IsObject()
  scopeFilters?: ScopeFilters;

  @IsObject()
  conditions: ConditionTree;

  @IsString()
  actionType: ActionType;

  @IsOptional()
  @IsNumber()
  actionValue?: number;

  @IsOptional()
  @IsEnum(["absolute", "percentage"])
  actionValueType?: ActionValueType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  actionLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(15)
  checkFrequencyMinutes?: number = 60;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cooldownMinutes?: number = 360;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxExecutions?: number;
}

export class UpdateAutomationRuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(["all", "filter"])
  scopeType?: "all" | "filter";

  @IsOptional()
  @IsObject()
  scopeFilters?: ScopeFilters;

  @IsOptional()
  @IsObject()
  conditions?: ConditionTree;

  @IsOptional()
  @IsString()
  actionType?: ActionType;

  @IsOptional()
  @IsNumber()
  actionValue?: number;

  @IsOptional()
  @IsEnum(["absolute", "percentage"])
  actionValueType?: ActionValueType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  actionLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(15)
  checkFrequencyMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cooldownMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxExecutions?: number;
}

export class GetAutomationRulesQueryDto {
  @IsOptional()
  @IsUUID()
  connectionId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Response types
export interface AutomationRuleResponseDto {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  scopeType: "all" | "filter";
  scopeFilters?: ScopeFilters;
  conditions: ConditionTree;
  actionType: ActionType;
  actionValue?: number;
  actionValueType?: ActionValueType;
  actionLimit?: number;
  checkFrequencyMinutes: number;
  cooldownMinutes: number;
  maxExecutions?: number;
  currentExecutions: number;
  lastRunAt?: string;
  lastExecutionAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestAutomationResultDto {
  matchingCampaigns: Array<{
    id: string;
    name: string;
    currentMetrics: Record<string, number>;
    wouldExecute: boolean;
    reason: string;
  }>;
  totalMatching: number;
  testedAt: string;
}
