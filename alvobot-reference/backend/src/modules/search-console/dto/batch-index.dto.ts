import {
  IsArray,
  IsNumber,
  IsString,
  IsUrl,
  IsUUID,
  ValidateNested,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";

export class BatchIndexItemDto {
  @IsString()
  @IsUrl()
  url: string;

  @IsOptional()
  @IsNumber()
  articleId?: number;
}

export class BatchIndexDto {
  @IsString()
  @IsUUID()
  connectionId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchIndexItemDto)
  items: BatchIndexItemDto[];
}
