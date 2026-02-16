import { IsString, IsOptional, IsUUID } from "class-validator";

export class InitiateAnalyticsOAuthDto {
  @IsString()
  connectionName: string;

  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsOptional()
  @IsUUID()
  reconnectConnectionId?: string;
}
