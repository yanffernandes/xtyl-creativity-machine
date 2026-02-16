/**
 * Ads Expand DTOs
 * Request/Response DTOs for the unified ads expand (drill-down) endpoint
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsDateString,
} from "class-validator";
import { Type } from "class-transformer";
import { AdsSourceDto } from "./ads-search.dto";
import { AdsOrderBy } from "../types/unified-ad-object";

// ============================================
// Expand Request DTO
// ============================================

export class AdsExpandRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdsSourceDto)
  sources: AdsSourceDto[];

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsEnum(["campaign", "adset"])
  parentLevel: "campaign" | "adset";

  @IsString()
  parentId: string;

  @IsEnum(["adset", "ad"])
  childLevel: "adset" | "ad";

  @IsOptional()
  @IsEnum([
    "cost",
    "impressions",
    "clicks",
    "conversions",
    "ctr",
    "cpa",
    "roas",
    "name",
    "budget",
    "cpc",
    "reach",
    "frequency",
  ])
  orderBy?: AdsOrderBy;

  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder?: "asc" | "desc";
}
