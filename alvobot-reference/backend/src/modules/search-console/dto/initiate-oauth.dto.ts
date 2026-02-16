import { IsString, IsOptional, IsUUID } from "class-validator";

export class InitiateSearchConsoleOAuthDto {
  @IsString()
  connectionName: string;

  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsOptional()
  @IsUUID()
  reconnectConnectionId?: string;
}
