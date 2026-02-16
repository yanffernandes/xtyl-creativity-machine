import {
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsIn,
  ValidateNested,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

class ArticleDto {
  @ApiProperty({ description: "ID único do artigo" })
  @IsString()
  id: string;

  @ApiProperty({ description: "Título do artigo" })
  @IsString()
  title: string;

  @ApiProperty({ description: "Nome da categoria do artigo" })
  @IsString()
  category: string;
}

export class SaveBaseStructureDto {
  @ApiProperty({ description: "ID do projeto" })
  @IsNumber()
  projectId: number;

  @ApiProperty({ description: "ID do usuário" })
  @IsString()
  userId: string;

  @ApiProperty({ description: "Lista de categorias a serem criadas" })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  categories: string[];

  @ApiProperty({
    description: "Lista de artigos a serem salvos",
    type: [ArticleDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArticleDto)
  @ArrayMinSize(1)
  articles: ArticleDto[];

  @ApiProperty({
    description: "Tipo de instalação",
    enum: ["fast", "custom"],
  })
  @IsIn(["fast", "custom"])
  installationType: "fast" | "custom";

  @ApiProperty({ description: "Habilitar configuração de autor" })
  @IsBoolean()
  authorToggle: boolean;

  @ApiProperty({ description: "Habilitar configuração de logo" })
  @IsBoolean()
  logoToggle: boolean;

  @ApiProperty({ description: "Habilitar configuração de título" })
  @IsBoolean()
  titleToggle: boolean;

  @ApiProperty({ description: "Nicho do projeto" })
  @IsString()
  niche: string;
}
