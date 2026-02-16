import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class GenerateCategoriesDto {
  @ApiProperty({
    description: "The niche to generate categories for",
    example: "Cultivo de Orquídeas em Apartamentos",
  })
  @IsString()
  niche: string;
}

export class CategoryItem {
  @ApiProperty({ example: "espécies de orquídeas" })
  title: string;
}

export class GenerateCategoriesResponseDto {
  @ApiProperty({
    description: "Categories organized in 3 groups with 4 categories each",
    type: [[CategoryItem]],
  })
  categories: CategoryItem[][];

  @ApiProperty({
    description: "Processing time in milliseconds",
    example: 3200,
  })
  processingTime: number;
}
