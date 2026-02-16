import { IsString, IsOptional, IsNotEmpty } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class GenerateBaseArticleDto {
  @ApiProperty({
    description: "Title of the article to generate content for",
    example: "Guia Completo de Jardinagem Urbana",
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: "Optional excerpt/description to guide content generation",
    example:
      "Aprenda tudo sobre como criar um jardim urbano em espaços pequenos...",
  })
  @IsString()
  @IsOptional()
  excerpt?: string;
}

export class GenerateBaseArticleResponseDto {
  @ApiProperty({
    description: "Generated HTML content for the article",
    example: "<p>Introdução...</p><h2>Subtítulo</h2><p>Conteúdo...</p>",
  })
  content: string;

  @ApiProperty({
    description: "Generated or provided excerpt",
    example:
      "Descubra como criar um jardim urbano funcional em espaços pequenos...",
  })
  excerpt: string;

  @ApiProperty({
    description: "Processing time in milliseconds",
    example: 5500,
  })
  processingTime: number;
}
