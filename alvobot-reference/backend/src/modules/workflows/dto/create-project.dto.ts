import { IsString, IsOptional, IsUrl } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateProjectDto {
  @ApiProperty({ description: "Nome do projeto" })
  @IsString()
  name: string;

  @ApiProperty({
    description: "URL/domínio do WordPress",
    example: "https://meublog.com.br",
  })
  @IsUrl()
  domain: string;

  @ApiProperty({ description: "Idioma padrão do projeto", required: false })
  @IsString()
  @IsOptional()
  defaultLanguage?: string;

  @ApiProperty({
    description: "Login do usuário no WordPress (criado pelo plugin)",
    default: "alvobot",
  })
  @IsString()
  @IsOptional()
  login?: string;
}
