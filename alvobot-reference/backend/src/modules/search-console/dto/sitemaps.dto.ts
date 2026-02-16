import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from "class-validator";

export class DetectSitemapsDto {
  @IsString()
  projectId: string;
}

export class CreateSitemapDto {
  @IsUrl()
  url: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateSitemapDto {
  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class SyncSitemapDto {
  @IsOptional()
  @IsUUID()
  connectionId?: string;
}
