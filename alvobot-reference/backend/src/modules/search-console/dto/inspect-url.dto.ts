import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from "class-validator";

export class InspectUrlDto {
  @IsString()
  @IsUrl()
  url: string;

  @IsString()
  @IsUUID()
  connectionId: string;

  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;
}
