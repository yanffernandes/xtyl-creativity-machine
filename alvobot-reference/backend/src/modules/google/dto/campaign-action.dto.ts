import {
  IsString,
  IsUUID,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
} from "class-validator";

export class CampaignActionDto {
  @IsUUID()
  connectionId: string;
}

export class UpdateBudgetDto extends CampaignActionDto {
  @IsNumber()
  @Min(1)
  newBudget: number;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  loginCustomerId?: string;
}

export class DuplicateCampaignDto extends CampaignActionDto {
  @IsString()
  newName: string;

  @IsOptional()
  @IsEnum(["ENABLED", "PAUSED"])
  status?: "ENABLED" | "PAUSED" = "PAUSED";
}

export class UpdateBidDto extends CampaignActionDto {
  @IsNumber()
  @Min(0.01)
  newBid: number;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  loginCustomerId?: string;
}

// Response types
export interface CampaignActionResponseDto {
  success: boolean;
  campaignId: string;
  previousStatus?: "ENABLED" | "PAUSED" | "REMOVED";
  newStatus?: "ENABLED" | "PAUSED";
  previousBudget?: number;
  newBudget?: number;
  actionLogId: string;
}

export interface DuplicateCampaignResponseDto {
  success: boolean;
  originalCampaignId: string;
  newCampaignId: string;
  newName: string;
  actionLogId: string;
}

export interface BidActionResponseDto {
  success: boolean;
  campaignId: string;
  previousBid?: number;
  newBid?: number;
  actionLogId?: string;
  error?: string;
}
