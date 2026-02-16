import { IsString, IsOptional, IsIn } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { VALID_COUNTRY_CODES } from "../../../common/constants/countries";
import { VALID_LANGUAGE_CODES } from "../../../common/constants/languages";

export class MineKeywordsDto {
  @ApiPropertyOptional({
    description: "Keyword seed for mining. Leave empty for AI suggestions.",
    example: "celular",
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({
    description: "Country code (ISO 3166-1 alpha-2)",
    example: "BR",
    default: "BR",
  })
  @IsString()
  @IsIn(VALID_COUNTRY_CODES)
  country: string = "BR";

  @ApiProperty({
    description: "Language code (ISO 639-1)",
    example: "pt",
    default: "pt",
  })
  @IsString()
  @IsIn(VALID_LANGUAGE_CODES)
  language: string = "pt";
}

export class MiningResultDto {
  @ApiProperty({ description: "Keyword text" })
  keyword: string;

  @ApiProperty({ description: "Monthly search volume" })
  search_volume: number;

  @ApiProperty({ description: "Minimum CPC in local currency" })
  cpc_min: number;

  @ApiProperty({ description: "Maximum CPC in local currency" })
  cpc_max: number;

  @ApiProperty({ description: "Discrepancy ratio (cpc_max/cpc_min)" })
  discrepancy: number;

  @ApiProperty({
    description: "Quality indicator",
    enum: ["high", "medium", "low"],
  })
  quality: "high" | "medium" | "low";

  @ApiProperty({
    description: "Trend indicator (positive = rising, negative = falling)",
  })
  trend: number;
}

// Internal response from service
export class MineKeywordsServiceResponseDto {
  @ApiProperty({ description: "Mining was successful" })
  success: boolean;

  @ApiProperty({
    description: "List of mined keywords",
    type: [MiningResultDto],
  })
  results: MiningResultDto[];

  @ApiPropertyOptional({ description: "Error message if failed" })
  error?: string;
}

// API response format expected by frontend
export class MineKeywordsResponseDto {
  @ApiProperty({
    description: "List of mined keywords",
    type: [MiningResultDto],
  })
  keywords: MiningResultDto[];

  @ApiProperty({ description: "Total number of keywords found" })
  total: number;

  @ApiProperty({ description: "Seed keyword used for mining" })
  seed_keyword: string;
}
