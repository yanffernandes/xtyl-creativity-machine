import { IsString, IsOptional, IsEnum, IsUUID } from "class-validator";

export enum GoogleConnectionType {
  ADS = "ads",
}

export class InitiateGoogleOAuthDto {
  @IsString()
  connectionName: string;

  @IsEnum(GoogleConnectionType)
  @IsOptional()
  connectionType?: GoogleConnectionType = GoogleConnectionType.ADS;

  @IsString()
  @IsOptional()
  redirectUri?: string;

  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsOptional()
  @IsUUID()
  reconnectConnectionId?: string;
}
