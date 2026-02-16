import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";

export class ListUrlsDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  connectionId?: string;

  @IsOptional()
  @IsEnum(["indexed", "in_progress", "not_indexed", "error", "not_checked"])
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sitemapId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

export class StatsQueryDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  connectionId?: string;
}

export class StatsHistoryDto extends StatsQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
