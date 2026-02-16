import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  IsBoolean,
} from "class-validator";
import { Transform } from "class-transformer";

export enum DashboardPeriod {
  TODAY = "today",
  YESTERDAY = "yesterday",
  LAST_7D = "last_7d",
  LAST_30D = "last_30d",
  CUSTOM = "custom",
}

export enum CampaignStatusFilter {
  ENABLED = "ENABLED",
  PAUSED = "PAUSED",
  ALL = "all",
}

export class GetCampaignsQueryDto {
  @IsOptional()
  @IsUUID()
  connectionId?: string;

  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsOptional()
  @IsEnum(DashboardPeriod)
  period?: DashboardPeriod = DashboardPeriod.LAST_7D;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(CampaignStatusFilter)
  status?: CampaignStatusFilter;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder?: "asc" | "desc" = "desc";

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  forceRefresh?: boolean = false;
}

// Response types
export type AlertType =
  | "low_ctr"
  | "budget_depleted"
  | "no_conversions"
  | "high_cpa";

export interface CampaignMetricsDto {
  id: string;
  name: string;
  status: "ENABLED" | "PAUSED" | "REMOVED";
  channelType: string;
  budget: number;
  budgetId: string;
  maxBid?: number;
  // Bidding strategy information
  biddingStrategyType?: string;
  targetCpa?: number;
  targetRoas?: number;
  // Performance metrics
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  conversions: number;
  conversionsValue: number;
  cpa: number;
  roas: number;
  budgetSpentPercent: number;
  runtimeHours?: number;
  alerts?: AlertType[];
  // Customer account info for API operations
  customerId?: string;
  loginCustomerId?: string;
  // Connection info for multi-connection support
  connectionId?: string;
  connectionName?: string;
}

export interface CampaignSummaryDto {
  totalCampaigns: number;
  activeCampaigns: number;
  totalImpressions: number;
  totalClicks: number;
  totalCost: number;
  totalConversions: number;
  avgCtr: number;
  avgCpa: number;
}

export interface ConnectionInfo {
  id: string;
  name: string;
  customerIds: string[];
}

export interface GetCampaignsResponseDto {
  campaigns: CampaignMetricsDto[];
  summary: CampaignSummaryDto;
  connections: ConnectionInfo[];
  fetchedAt: string;
}
