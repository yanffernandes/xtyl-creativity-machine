import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SupabaseService } from "../../common/supabase/supabase.service";
import { EmailService } from "../email/email.service";
import { SendClickUpEmailDto } from "./dto/send-clickup-email.dto";

interface BugReportData {
  id: string;
  title: string;
  description: string;
  severity: string;
  bug_type: string;
  page_url: string;
  browser_info: Record<string, unknown>;
  console_errors: Array<{ type: string; message: string; timestamp: number }>;
  created_at: string;
  clickup_sent_at: string | null;
  user_id: string;
}

interface BugReportAttachment {
  storage_path: string;
  attachment_type: string;
  is_primary_screenshot: boolean;
}

@Injectable()
export class BugReportService {
  private readonly logger = new Logger(BugReportService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Send bug report to ClickUp via email
   */
  async sendToClickUp(
    dto: SendClickUpEmailDto,
    userId: string,
  ): Promise<{ success: boolean; message: string; sentAt?: string }> {
    // Get ClickUp email from environment variable (fixed for the entire app)
    const clickupEmail = this.configService.get<string>("CLICKUP_LIST_EMAIL");
    if (!clickupEmail) {
      throw new BadRequestException(
        "ClickUp integration is not configured. Please set CLICKUP_LIST_EMAIL environment variable.",
      );
    }

    const supabase = this.supabaseService.getServiceRoleClient();

    // Fetch bug report
    const { data: bugReport, error: fetchError } = await supabase
      .from("bug_reports")
      .select("*")
      .eq("id", dto.bugReportId)
      .single();

    if (fetchError || !bugReport) {
      throw new NotFoundException("Bug report not found");
    }

    const report = bugReport as BugReportData;

    // Verify ownership
    if (report.user_id !== userId) {
      throw new BadRequestException(
        "You can only send your own bug reports to ClickUp",
      );
    }

    // Check if already sent
    if (report.clickup_sent_at) {
      throw new BadRequestException(
        "This bug report has already been sent to ClickUp",
      );
    }

    // Fetch user email for the report
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const userEmail = userData?.user?.email || "Unknown";

    // Fetch primary screenshot URL if available
    const { data: attachments } = await supabase
      .from("bug_report_attachments")
      .select("storage_path, attachment_type, is_primary_screenshot")
      .eq("bug_report_id", dto.bugReportId);

    let screenshotUrl: string | undefined;
    const primaryScreenshot = (
      attachments as BugReportAttachment[] | null
    )?.find(
      (a) => a.is_primary_screenshot && a.attachment_type === "screenshot",
    );

    if (primaryScreenshot) {
      const { data: urlData } = supabase.storage
        .from("bug-reports")
        .getPublicUrl(primaryScreenshot.storage_path);
      screenshotUrl = urlData?.publicUrl;
    }

    // Format email content
    const subject = `[BUG] ${report.severity.toUpperCase()}: ${report.title}`;
    const htmlContent = this.formatBugReportEmail(
      report,
      userEmail,
      screenshotUrl,
    );

    // Send email
    const emailSent = await this.emailService.sendEmail({
      to: clickupEmail,
      subject,
      htmlContent,
      textContent: this.formatBugReportTextEmail(
        report,
        userEmail,
        screenshotUrl,
      ),
      tags: ["bug-report", "clickup"],
    });

    if (!emailSent) {
      throw new BadRequestException("Failed to send email to ClickUp");
    }

    // Update bug report with sent timestamp
    const sentAt = new Date().toISOString();
    await supabase
      .from("bug_reports")
      .update({ clickup_sent_at: sentAt })
      .eq("id", dto.bugReportId);

    this.logger.log(
      `Bug report ${dto.bugReportId} sent to ClickUp: ${clickupEmail}`,
    );

    return {
      success: true,
      message: "Bug report sent to ClickUp successfully",
      sentAt,
    };
  }

  /**
   * Format bug report as HTML email for ClickUp
   */
  private formatBugReportEmail(
    report: BugReportData,
    userEmail: string,
    screenshotUrl?: string,
  ): string {
    const browserInfo = report.browser_info;
    const consoleErrors = report.console_errors || [];

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 24px;">
    <h1 style="color: #1a1a2e; margin-bottom: 16px;">🐛 Bug Report from AlvoBot</h1>

    <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
      <p style="margin: 0 0 8px;"><strong>Severity:</strong> <span style="color: ${this.getSeverityColor(report.severity)}; text-transform: uppercase;">${report.severity}</span></p>
      <p style="margin: 0 0 8px;"><strong>Type:</strong> ${report.bug_type}</p>
      <p style="margin: 0;"><strong>Page:</strong> <a href="${report.page_url}">${report.page_url}</a></p>
    </div>

    <h2 style="color: #344054; font-size: 16px;">Description</h2>
    <p style="color: #4a5568; line-height: 1.6;">${report.description}</p>

    ${
      screenshotUrl
        ? `
    <h2 style="color: #344054; font-size: 16px;">Screenshot</h2>
    <img src="${screenshotUrl}" alt="Bug Screenshot" style="max-width: 100%; border-radius: 8px; border: 1px solid #e2e8f0;">
    `
        : ""
    }

    <h2 style="color: #344054; font-size: 16px;">Browser Info</h2>
    <pre style="background: #f8f9fa; padding: 12px; border-radius: 4px; font-size: 12px; overflow-x: auto;">${JSON.stringify(browserInfo, null, 2)}</pre>

    ${
      consoleErrors.length > 0
        ? `
    <h2 style="color: #344054; font-size: 16px;">Console Errors (${consoleErrors.length})</h2>
    <div style="background: #fef2f2; padding: 12px; border-radius: 4px; font-size: 12px;">
      ${consoleErrors
        .slice(0, 10)
        .map(
          (err) => `
        <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #fecaca;">
          <strong style="color: ${err.type === "error" ? "#dc2626" : "#d97706"};">[${err.type.toUpperCase()}]</strong>
          <code>${err.message}</code>
        </div>
      `,
        )
        .join("")}
      ${consoleErrors.length > 10 ? `<p style="color: #6b7280;">...and ${consoleErrors.length - 10} more errors</p>` : ""}
    </div>
    `
        : ""
    }

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">

    <p style="color: #6b7280; font-size: 12px;">
      Reported by: ${userEmail}<br>
      Reported at: ${new Date(report.created_at).toLocaleString("pt-BR")}
    </p>
  </div>
</body>
</html>
`;
  }

  /**
   * Format bug report as plain text email
   */
  private formatBugReportTextEmail(
    report: BugReportData,
    userEmail: string,
    screenshotUrl?: string,
  ): string {
    const consoleErrors = report.console_errors || [];

    return `
🐛 Bug Report from AlvoBot

Severity: ${report.severity.toUpperCase()}
Type: ${report.bug_type}
Page: ${report.page_url}

---

Description:
${report.description}

${screenshotUrl ? `Screenshot: ${screenshotUrl}` : ""}

Browser Info:
${JSON.stringify(report.browser_info, null, 2)}

${
  consoleErrors.length > 0
    ? `
Console Errors (${consoleErrors.length}):
${consoleErrors
  .slice(0, 10)
  .map((err) => `[${err.type.toUpperCase()}] ${err.message}`)
  .join("\n")}
${consoleErrors.length > 10 ? `...and ${consoleErrors.length - 10} more errors` : ""}
`
    : ""
}

---
Reported by: ${userEmail}
Reported at: ${new Date(report.created_at).toLocaleString("pt-BR")}
`.trim();
  }

  /**
   * Get severity color for email formatting
   */
  private getSeverityColor(severity: string): string {
    const colors: Record<string, string> = {
      critical: "#dc2626",
      high: "#ea580c",
      medium: "#d97706",
      low: "#65a30d",
    };
    return colors[severity] || "#6b7280";
  }
}
