import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsObject,
} from "class-validator";
import { WorkspaceSettings } from "../interfaces/workspace.interface";

export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: "Nome deve ter pelo menos 2 caracteres" })
  @MaxLength(100, { message: "Nome deve ter no máximo 100 caracteres" })
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: "Slug deve ter pelo menos 2 caracteres" })
  @MaxLength(50, { message: "Slug deve ter no máximo 50 caracteres" })
  @Matches(/^[a-z0-9-]+$/, {
    message: "Slug deve conter apenas letras minúsculas, números e hífens",
  })
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "Descrição deve ter no máximo 500 caracteres" })
  description?: string;

  @IsOptional()
  @IsString()
  logo_url?: string;

  @IsOptional()
  @IsObject()
  settings?: WorkspaceSettings;
}
