import { IsString, IsArray, ArrayMinSize } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class GenerateTitlesDto {
  @ApiProperty({
    description: "The niche for title generation",
    example: "Cultivo de Orquídeas em Apartamentos",
  })
  @IsString()
  niche: string;

  @ApiProperty({
    description: "Selected categories (must be exactly 3)",
    example: [
      "espécies de orquídeas",
      "cuidados básicos",
      "vasos e substratos",
    ],
  })
  @IsArray()
  @ArrayMinSize(3)
  @IsString({ each: true })
  categories: string[];
}

export class GeneratedTitle {
  @ApiProperty({ example: "Orquídea Phalaenopsis Para Iniciantes em Casa" })
  title: string;

  @ApiProperty({ example: "espécies de orquídeas" })
  category: string;
}

export class GenerateTitlesResponseDto {
  @ApiProperty({
    description: "Generated article titles (30-45 titles)",
    type: [GeneratedTitle],
  })
  titles: GeneratedTitle[];

  @ApiProperty({
    description: "Processing time in milliseconds",
    example: 8500,
  })
  processingTime: number;
}
