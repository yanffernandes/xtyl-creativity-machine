import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

/**
 * Options for sending a generic email.
 */
export interface SendEmailOptions {
  /** Recipient email address. */
  to: string;
  /** Recipient display name (optional, defaults to the local part of the email). */
  toName?: string;
  /** Email subject line. */
  subject: string;
  /** HTML body content. */
  htmlContent: string;
  /** Plain-text alternative body (optional). */
  textContent?: string;
}

/**
 * BrevoService wraps the Brevo (formerly SendinBlue) transactional email API.
 *
 * Ported from backend/email_service.py.
 *
 * Environment variables:
 *   - BREVO_API_KEY   (required)
 *   - FROM_EMAIL      (optional, default: noreply@xtyl.com)
 *   - FROM_NAME       (optional, default: XTYL Creativity Machine)
 *   - FRONTEND_URL    (optional, default: http://localhost:3000)
 */
@Injectable()
export class BrevoService {
  private readonly logger = new Logger(BrevoService.name);
  private readonly client: AxiosInstance;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly frontendUrl: string;

  private static readonly BASE_URL = 'https://api.brevo.com/v3';

  constructor() {
    const apiKey = process.env.BREVO_API_KEY ?? '';

    this.fromEmail = process.env.FROM_EMAIL ?? 'noreply@xtyl.com';
    this.fromName = process.env.FROM_NAME ?? 'XTYL Creativity Machine';
    this.frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

    this.client = axios.create({
      baseURL: BrevoService.BASE_URL,
      timeout: 15_000,
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
    });

    if (!apiKey) {
      this.logger.warn(
        'BREVO_API_KEY is not set. Emails will be logged but not sent.',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Core send method
  // ---------------------------------------------------------------------------

  /**
   * Send a transactional email via the Brevo API.
   *
   * When BREVO_API_KEY is not configured the email details are logged and the
   * method returns `false` (mirrors the Python behaviour).
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    const { to, toName, subject, htmlContent, textContent } = options;

    if (!process.env.BREVO_API_KEY) {
      this.logger.warn(
        `BREVO_API_KEY not configured. Would send to: ${to} | Subject: ${subject}`,
      );
      return false;
    }

    const payload: Record<string, unknown> = {
      sender: {
        name: this.fromName,
        email: this.fromEmail,
      },
      to: [
        {
          email: to,
          name: toName ?? to.split('@')[0],
        },
      ],
      subject,
      htmlContent,
    };

    if (textContent) {
      payload.textContent = textContent;
    }

    try {
      await this.client.post('/smtp/email', payload);
      this.logger.log(`Email sent to ${to}: ${subject}`);
      return true;
    } catch (error) {
      const detail = axios.isAxiosError(error)
        ? error.response?.data ?? error.message
        : error;
      this.logger.error(`Failed to send email to ${to}: ${JSON.stringify(detail)}`);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Pre-built email templates (ported from email_service.py)
  // ---------------------------------------------------------------------------

  /**
   * Send a workspace invitation email to a non-registered user.
   *
   * Mirrors `send_workspace_invite_email()` from email_service.py.
   */
  async sendInviteEmail(
    email: string,
    inviterName: string,
    workspaceName: string,
    inviteToken: string,
    tempPassword?: string,
  ): Promise<boolean> {
    const signupLink = `${this.frontendUrl}/signup?invite=${inviteToken}&email=${encodeURIComponent(email)}`;
    const year = new Date().getFullYear();

    const credentialsBlock = tempPassword
      ? `
      <div style="background: white; padding: 20px; border-radius: 5px; margin: 30px 0; border-left: 4px solid #5B8DEF;">
        <h3 style="margin-top: 0; color: #5B8DEF;">Your temporary credentials:</h3>
        <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 10px 0;"><strong>Temporary password:</strong> <code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${tempPassword}</code></p>
        <p style="font-size: 12px; color: #666; margin-top: 15px;">
          We recommend changing your password after your first login.
        </p>
      </div>`
      : '';

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #5B8DEF 0%, #4A7AD9 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">You've been invited!</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;"><strong>${inviterName}</strong> invited you to join workspace <strong>"${workspaceName}"</strong> on <strong>XTYL Creativity Machine</strong>.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${signupLink}" style="background: #5B8DEF; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">Accept Invite</a>
    </div>
    <p style="font-size: 12px; color: #5B8DEF; word-break: break-all; background: white; padding: 10px; border-radius: 5px;">${signupLink}</p>
    ${credentialsBlock}
    <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">This invite expires in <strong>7 days</strong>.</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
    <p>&copy; ${year} XTYL Creativity Machine. All rights reserved.</p>
  </div>
</body>
</html>`;

    return this.sendEmail({
      to: email,
      subject: `${inviterName} invited you to workspace "${workspaceName}" - XTYL`,
      htmlContent: html,
    });
  }

  /**
   * Send a password reset email.
   *
   * Mirrors `send_password_reset_email()` from email_service.py.
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    userName?: string,
  ): Promise<boolean> {
    const resetLink = `${this.frontendUrl}/reset-password?token=${resetToken}`;
    const year = new Date().getFullYear();
    const greeting = userName ? `Hello ${userName}` : 'Hello';

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Password Recovery</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${greeting},</p>
    <p style="font-size: 16px;">You requested a password reset for your <strong>XTYL Creativity Machine</strong> account.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">Reset Password</a>
    </div>
    <p style="font-size: 12px; color: #667eea; word-break: break-all; background: white; padding: 10px; border-radius: 5px;">${resetLink}</p>
    <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      This link expires in <strong>1 hour</strong>.<br>
      If you did not request this reset, please ignore this email.
    </p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
    <p>&copy; ${year} XTYL Creativity Machine. All rights reserved.</p>
  </div>
</body>
</html>`;

    return this.sendEmail({
      to: email,
      toName: userName,
      subject: 'Password Recovery - XTYL',
      htmlContent: html,
    });
  }

  /**
   * Send a welcome email when a user is added to a workspace.
   *
   * Mirrors `send_welcome_email()` from email_service.py.
   */
  async sendWelcomeEmail(
    email: string,
    workspaceName: string,
    invitedBy: string,
    userName?: string,
  ): Promise<boolean> {
    const loginLink = `${this.frontendUrl}/login`;
    const year = new Date().getFullYear();
    const greeting = userName ? `Hello ${userName}` : 'Hello';

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to XTYL!</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${greeting},</p>
    <p style="font-size: 16px;">You've been added to workspace <strong>"${workspaceName}"</strong> by <strong>${invitedBy}</strong>.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${loginLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">Open Platform</a>
    </div>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
    <p>&copy; ${year} XTYL Creativity Machine. All rights reserved.</p>
  </div>
</body>
</html>`;

    return this.sendEmail({
      to: email,
      toName: userName,
      subject: `You've been added to workspace "${workspaceName}" - XTYL`,
      htmlContent: html,
    });
  }
}
