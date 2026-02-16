import { IsArray, IsUUID } from "class-validator";

export class ValidateConnectionsDto {
  @IsArray()
  @IsUUID("4", { each: true })
  connectionIds: string[];
}

export interface ConnectionValidationResult {
  connectionId: string;
  hasActiveNetworks: boolean;
  activeNetworkCount: number;
}

export interface ValidateConnectionsResponse {
  success: boolean;
  validations: ConnectionValidationResult[];
}
