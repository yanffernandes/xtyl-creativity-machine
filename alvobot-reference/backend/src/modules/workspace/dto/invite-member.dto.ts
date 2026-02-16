import { IsString, IsEmail, IsIn } from "class-validator";
import { WorkspaceRole } from "../interfaces/workspace.interface";

export class InviteMemberDto {
  @IsEmail({}, { message: "Email inválido" })
  email: string;

  @IsString()
  @IsIn(["admin", "member", "viewer"], {
    message: "Role deve ser admin, member ou viewer",
  })
  role: Exclude<WorkspaceRole, "owner">;
}
