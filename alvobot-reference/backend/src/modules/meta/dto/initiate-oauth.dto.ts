import { IsString, IsOptional, IsIn, IsUUID } from "class-validator";

export class InitiateOAuthDto {
  @IsString()
  connectionName: string;

  @IsString()
  @IsIn(["messages", "ads"])
  connectionType: "messages" | "ads";

  @IsOptional()
  @IsString()
  redirectUri?: string;

  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsOptional()
  @IsUUID()
  reconnectConnectionId?: string;
}

export class OAuthCallbackDto {
  @IsString()
  code: string;

  @IsString()
  state: string;
}
