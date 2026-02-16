import { IsString, IsUUID } from "class-validator";

export class AutoRunDto {
  @IsString()
  @IsUUID()
  connectionId: string;
}
