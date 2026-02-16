import { IsString, IsOptional, IsNotEmpty } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class GenerateArrowArticleDto {
  @ApiProperty({
    description: "Keyword to generate article content from",
    example: "melhores plantas para apartamento",
  })
  @IsString()
  @IsNotEmpty()
  keyword: string;

  @ApiPropertyOptional({
    description:
      "Optional title for the article (AI will generate if not provided)",
    example: "Guia Completo: Melhores Plantas Para Apartamento",
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: "Optional excerpt/description for the article",
    example: "Descubra as melhores plantas para cultivar em apartamento...",
  })
  @IsString()
  @IsOptional()
  excerpt?: string;

  @ApiPropertyOptional({
    description: "Language code for content generation (ISO 639-1)",
    example: "en",
  })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({
    description: "Country code for content localization (ISO 3166-1 alpha-2)",
    example: "US",
  })
  @IsString()
  @IsOptional()
  country?: string;
}

export class GenerateArrowArticleResponseDto {
  @ApiProperty({
    description: "Generated or provided title",
    example: "Guia Completo: Melhores Plantas Para Apartamento",
  })
  title: string;

  @ApiProperty({
    description: "Generated or provided excerpt",
    example:
      "Descubra as melhores plantas para cultivar em apartamento com pouca luz...",
  })
  excerpt: string;

  @ApiProperty({
    description: "Generated HTML content for the article",
    example: "<p>Introdução...</p><h2>Subtítulo</h2><p>Conteúdo...</p>",
  })
  content: string;

  @ApiProperty({
    description: "Processing time in milliseconds",
    example: 3500,
  })
  processingTime: number;
}
