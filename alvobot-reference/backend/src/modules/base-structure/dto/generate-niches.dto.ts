import { IsString, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class GenerateNichesDto {
  @ApiProperty({
    description: "Language for niche generation (e.g., pt, en)",
    example: "pt",
  })
  @IsString()
  language: string;

  @ApiPropertyOptional({
    description: "Domain URL to help contextualize niche suggestions",
    example: "https://example.com",
  })
  @IsOptional()
  @IsString()
  domain?: string;
}

export class GenerateNichesResponseDto {
  @ApiProperty({
    description: "List of suggested niches",
    example: [
      "Cultivo de Orquídeas em Apartamentos",
      "Restauração de Móveis Antigos",
    ],
  })
  niches: string[];

  @ApiProperty({
    description: "Processing time in milliseconds",
    example: 2500,
  })
  processingTime: number;
}
