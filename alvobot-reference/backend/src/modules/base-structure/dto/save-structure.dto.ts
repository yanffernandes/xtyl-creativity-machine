import {
  IsNumber,
  IsString,
  IsArray,
  IsBoolean,
  IsIn,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class ArticleInput {
  @ApiProperty({ example: "Orquídea Phalaenopsis Para Iniciantes em Casa" })
  @IsString()
  title: string;

  @ApiProperty({ example: "espécies de orquídeas" })
  @IsString()
  category: string;

  @ApiProperty({ example: "uuid-123" })
  @IsString()
  id: string;
}

export class SaveStructureDto {
  @ApiProperty({
    description: "Project ID to save structure for",
    example: 123,
  })
  @IsNumber()
  projectId: number;

  @ApiProperty({
    description: "Selected niche",
    example: "Cultivo de Orquídeas em Apartamentos",
  })
  @IsString()
  niche: string;

  @ApiProperty({
    description: "Selected categories",
    example: [
      "espécies de orquídeas",
      "cuidados básicos",
      "vasos e substratos",
    ],
  })
  @IsArray()
  @IsString({ each: true })
  categories: string[];

  @ApiProperty({
    description: "Selected article titles to save",
    type: [ArticleInput],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArticleInput)
  articles: ArticleInput[];

  @ApiProperty({
    description: "Installation type",
    enum: ["fast", "custom"],
    example: "fast",
  })
  @IsIn(["fast", "custom"])
  installationType: "fast" | "custom";

  @ApiProperty({
    description: "Whether to create author on WordPress",
    example: true,
  })
  @IsBoolean()
  authorToggle: boolean;

  @ApiProperty({
    description: "Whether to create logo on WordPress",
    example: true,
  })
  @IsBoolean()
  logoToggle: boolean;

  @ApiProperty({
    description: "Whether to update blog title/description on WordPress",
    example: true,
  })
  @IsBoolean()
  titleToggle: boolean;
}

export class SaveStructureResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 35 })
  articlesCreated: number;

  @ApiProperty({ example: 3 })
  categoriesCreated: number;

  @ApiProperty({ example: true, required: false })
  authorCreated?: boolean;

  @ApiProperty({ example: true, required: false })
  logoCreated?: boolean;

  @ApiProperty({ example: true, required: false })
  titleUpdated?: boolean;
}
