import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '../../database/database.module';
import { OpenRouterModule } from '../../integrations/openrouter/openrouter.module';
import { FalAiModule } from '../../integrations/fal-ai/fal-ai.module';
import { StorageModule } from '../storage/storage.module';
import { ExecutionsController } from './executions.controller';
import { ExecutionsService } from './executions.service';
import { NodeExecutorService } from './node-executor.service';
import { VariableResolverService } from './variable-resolver.service';
import { ExecutionProcessor } from './execution.processor';

/**
 * ExecutionsModule provides workflow execution orchestration.
 *
 * Ported from backend/routers/executions.py and backend/services/workflow_executor.py.
 *
 * Key components:
 * - ExecutionsController: REST endpoints for execution management + SSE streaming
 * - ExecutionsService: Business logic for creating/managing executions
 * - NodeExecutorService: Individual node type handlers
 * - VariableResolverService: {{nodeId.field}} variable resolution
 * - ExecutionProcessor: BullMQ worker for async execution
 */
@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'workflow-execution',
    }),
    OpenRouterModule,
    FalAiModule,
    StorageModule,
  ],
  controllers: [ExecutionsController],
  providers: [
    ExecutionsService,
    NodeExecutorService,
    VariableResolverService,
    ExecutionProcessor,
  ],
  exports: [ExecutionsService],
})
export class ExecutionsModule {}
