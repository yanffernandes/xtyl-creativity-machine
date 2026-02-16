import { IsString, IsOptional, IsIn, IsObject } from "class-validator";
import {
  WorkspaceRole,
  MemberPermissions,
} from "../interfaces/workspace.interface";

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  @IsIn(["admin", "member", "viewer"], {
    message: "Role deve ser admin, member ou viewer",
  })
  role?: Exclude<WorkspaceRole, "owner">;

  @IsOptional()
  @IsObject()
  permissions?: MemberPermissions;
}
