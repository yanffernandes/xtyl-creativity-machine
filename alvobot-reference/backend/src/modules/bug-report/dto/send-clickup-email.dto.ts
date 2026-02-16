import { IsUUID } from "class-validator";

export class SendClickUpEmailDto {
  @IsUUID()
  bugReportId: string;
}
