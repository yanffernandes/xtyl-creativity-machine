import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MemoriesController } from './memories.controller';
import { MemoriesService } from './memories.service';
import { MemoryProcessor } from './memory.processor';
import { DatabaseModule } from '../../database/database.module';
import { OpenRouterModule } from '../../integrations/openrouter/openrouter.module';

@Module({
  imports: [
    DatabaseModule,
    OpenRouterModule,
    BullModule.registerQueue({
      name: 'memory-extraction',
    }),
  ],
  controllers: [MemoriesController],
  providers: [MemoriesService, MemoryProcessor],
  exports: [MemoriesService],
})
export class MemoriesModule {}
