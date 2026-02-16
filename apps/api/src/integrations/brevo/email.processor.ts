import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BrevoService } from './brevo.service';

/**
 * Job payload for the email-sending queue.
 *
 * Mirrors the {@link SendEmailOptions} interface from brevo.service.ts with
 * all fields required by the Brevo transactional email API.
 */
export interface EmailJob {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

/**
 * Email Processor
 *
 * BullMQ worker that sends transactional emails via the Brevo API.
 * Concurrency set to 5 to respect Brevo rate limits while maintaining
 * reasonable throughput.
 *
 * Migration from: backend/email_service.py (async email dispatch).
 */
@Processor('email-sending', { concurrency: 5 })
@Injectable()
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly brevoService: BrevoService) {
    super();
  }

  async process(job: Job<EmailJob>): Promise<void> {
    const { to, toName, subject, htmlContent, textContent } = job.data;

    try {
      const sent = await this.brevoService.sendEmail({
        to,
        toName,
        subject,
        htmlContent,
        textContent,
      });

      if (sent) {
        this.logger.log(`Email sent to ${to} (job ${job.id})`);
      } else {
        this.logger.warn(
          `Email to ${to} was not sent (API key missing or error) (job ${job.id})`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error}`);
      throw error;
    }
  }
}
