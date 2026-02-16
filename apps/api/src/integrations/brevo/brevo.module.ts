import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BrevoService } from './brevo.service';
import { EmailProcessor } from './email.processor';

@Global()
@Module({
  imports: [
    // Register BullMQ queue for async email sending
    BullModule.registerQueue({
      name: 'email-sending',
    }),
  ],
  providers: [BrevoService, EmailProcessor],
  exports: [BrevoService],
})
export class BrevoModule {}
