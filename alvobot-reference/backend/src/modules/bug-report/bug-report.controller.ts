import { Controller, Post, Body, UseGuards, Request } from "@nestjs/common";
import { BugReportService } from "./bug-report.service";
import { SendClickUpEmailDto } from "./dto/send-clickup-email.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

interface AuthenticatedRequest {
  user: {
    sub: string;
    email: string;
  };
}

@Controller("bug-report")
@UseGuards(JwtAuthGuard)
export class BugReportController {
  constructor(private readonly bugReportService: BugReportService) {}

  /**
   * Send bug report to ClickUp via email
   * POST /bug-report/send-clickup
   */
  @Post("send-clickup")
  async sendToClickUp(
    @Body() dto: SendClickUpEmailDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.bugReportService.sendToClickUp(dto, req.user.sub);
  }
}
