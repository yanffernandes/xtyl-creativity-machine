import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiUsageController } from './ai-usage.controller';
import { AiUsageService } from './ai-usage.service';
import { UsageLoggingProcessor } from './usage-logging.processor';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [
    DatabaseModule,
    // Register BullMQ queue for async usage logging
    BullModule.registerQueue({
      name: 'usage-logging',
    }),
  ],
  controllers: [AiUsageController],
  providers: [AiUsageService, UsageLoggingProcessor],
  exports: [AiUsageService],
})
export class AiUsageModule {}
