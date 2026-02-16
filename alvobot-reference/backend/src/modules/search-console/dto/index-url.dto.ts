import {
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  IsIn,
  IsNumber,
} from "class-validator";

export class IndexUrlDto {
  @IsString()
  @IsUrl()
  url: string;

  @IsString()
  @IsUUID()
  connectionId: string;

  @IsOptional()
  @IsNumber()
  articleId?: number;

  @IsOptional()
  @IsIn(["URL_UPDATED", "URL_DELETED"])
  requestType?: "URL_UPDATED" | "URL_DELETED";
}
