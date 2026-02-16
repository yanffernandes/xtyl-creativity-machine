import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  replyTo?: string;
  tags?: string[];
}

export interface WorkspaceInviteEmailData {
  inviteeEmail: string;
  inviterName: string;
  workspaceName: string;
  role: string;
  inviteLink: string;
  expiresIn: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly senderEmail: string;
  private readonly senderName: string;
  private readonly isConfigured: boolean;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>("RESEND_API_KEY");
    this.senderEmail =
      this.configService.get<string>("RESEND_SENDER_EMAIL") ||
      "noreply@alvobot.com";
    this.senderName =
      this.configService.get<string>("RESEND_SENDER_NAME") || "AlvoBot";

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.isConfigured = true;
      this.logger.log("Resend email service configured");
    } else {
      this.resend = null;
      this.isConfigured = false;
      this.logger.warn(
        "RESEND_API_KEY not configured - emails will be logged only",
      );
    }
  }

  /**
   * Send a transactional email via Resend
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    if (!this.isConfigured || !this.resend) {
      this.logger.warn(
        `[EMAIL NOT SENT - NO API KEY] To: ${recipients.join(", ")}, Subject: ${options.subject}`,
      );
      this.logger.debug(
        `HTML Content: ${options.htmlContent.substring(0, 500)}...`,
      );
      return false;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: `${this.senderName} <${this.senderEmail}>`,
        to: recipients,
        subject: options.subject,
        html: options.htmlContent,
        text: options.textContent,
        replyTo: options.replyTo,
        tags: options.tags?.map((tag) => ({ name: tag, value: "true" })),
      });

      if (error) {
        this.logger.error(`Failed to send email: ${error.message}`, error);
        return false;
      }

      this.logger.log(
        `Email sent successfully to ${recipients.join(", ")} (ID: ${data?.id})`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Send workspace invitation email
   */
  async sendWorkspaceInvitation(
    data: WorkspaceInviteEmailData,
  ): Promise<boolean> {
    const roleLabels: Record<string, string> = {
      admin: "Administrador",
      member: "Membro",
      viewer: "Visualizador",
    };

    const roleLabel = roleLabels[data.role] || data.role;

    const htmlContent = this.getWorkspaceInviteTemplate(data, roleLabel);
    const textContent = this.getWorkspaceInviteTextTemplate(data, roleLabel);

    return this.sendEmail({
      to: data.inviteeEmail,
      subject: `${data.inviterName} convidou você para o workspace "${data.workspaceName}"`,
      htmlContent,
      textContent,
      tags: ["workspace-invite"],
    });
  }

  /**
   * HTML template for workspace invitation
   */
  private getWorkspaceInviteTemplate(
    data: WorkspaceInviteEmailData,
    roleLabel: string,
  ): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite para Workspace</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #1a1a2e; font-size: 28px; font-weight: 700;">AlvoBot</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #1a1a2e; font-size: 24px; font-weight: 600;">
                Você foi convidado! 🎉
              </h2>

              <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                <strong>${data.inviterName}</strong> convidou você para participar do workspace
                <strong>"${data.workspaceName}"</strong> como <strong>${roleLabel}</strong>.
              </p>

              <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #718096; font-size: 14px;">Workspace:</span>
                      <span style="color: #1a1a2e; font-size: 14px; font-weight: 600; float: right;">${data.workspaceName}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-top: 1px solid #e2e8f0;">
                      <span style="color: #718096; font-size: 14px;">Seu papel:</span>
                      <span style="color: #1a1a2e; font-size: 14px; font-weight: 600; float: right;">${roleLabel}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-top: 1px solid #e2e8f0;">
                      <span style="color: #718096; font-size: 14px;">Convite expira em:</span>
                      <span style="color: #e53e3e; font-size: 14px; font-weight: 600; float: right;">${data.expiresIn}</span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 16px 0;">
                    <a href="${data.inviteLink}"
                       style="display: inline-block; background-color: #fbbf24; color: #1a1a2e; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(251, 191, 36, 0.3);">
                      Aceitar Convite
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; color: #718096; font-size: 14px; text-align: center;">
                Se o botão não funcionar, copie e cole este link no seu navegador:
              </p>
              <p style="margin: 8px 0 0; color: #4a5568; font-size: 12px; word-break: break-all; text-align: center;">
                <a href="${data.inviteLink}" style="color: #fbbf24;">${data.inviteLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #718096; font-size: 12px;">
                Este email foi enviado porque alguém convidou você para um workspace no AlvoBot.
                <br>Se você não reconhece este convite, pode ignorar este email com segurança.
              </p>
              <p style="margin: 16px 0 0; color: #a0aec0; font-size: 11px;">
                © ${new Date().getFullYear()} AlvoBot. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
  }

  /**
   * Plain text template for workspace invitation
   */
  private getWorkspaceInviteTextTemplate(
    data: WorkspaceInviteEmailData,
    roleLabel: string,
  ): string {
    return `
Você foi convidado para o AlvoBot!

${data.inviterName} convidou você para participar do workspace "${data.workspaceName}" como ${roleLabel}.

Detalhes do convite:
- Workspace: ${data.workspaceName}
- Seu papel: ${roleLabel}
- Expira em: ${data.expiresIn}

Para aceitar o convite, acesse o link abaixo:
${data.inviteLink}

Se você não reconhece este convite, pode ignorar este email com segurança.

---
AlvoBot - ${new Date().getFullYear()}
`.trim();
  }
}
