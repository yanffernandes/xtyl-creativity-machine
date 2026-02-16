import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { randomUUID } from 'crypto';
import { DATABASE } from '../../database/database.module';
import { aiUsageLog } from '../../database/drizzle/schema';

/**
 * Job payload for the usage-logging queue.
 *
 * Field names mirror the ai_usage_log table columns so the processor
 * can insert rows with minimal transformation.
 */
export interface UsageLogJob {
  userId: string;
  workspaceId: string;
  projectId?: string;
  model: string;
  provider: string;
  /** Maps to request_type column (e.g. 'chat', 'vision', 'tool_call'). */
  requestType: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  /** Cost in USD (precision 10, scale 6). */
  inputCost: number;
  outputCost: number;
  totalCost: number;
  /** Optional context fields. */
  promptPreview?: string;
  responsePreview?: string;
  toolCalls?: unknown;
  durationMs?: number;
}

/**
 * Usage Logging Processor
 *
 * BullMQ worker that persists AI usage telemetry to the ai_usage_log table.
 * High concurrency (10) because each job is a simple INSERT with no external I/O.
 *
 * Migration from: backend usage-tracking middleware (Python).
 */
@Processor('usage-logging', { concurrency: 10 })
@Injectable()
export class UsageLoggingProcessor extends WorkerHost {
  private readonly logger = new Logger(UsageLoggingProcessor.name);

  constructor(@Inject(DATABASE) private readonly db: any) {
    super();
  }

  async process(job: Job<UsageLogJob>): Promise<void> {
    const {
      userId,
      workspaceId,
      projectId,
      model,
      provider,
      requestType,
      inputTokens,
      outputTokens,
      totalTokens,
      inputCost,
      outputCost,
      totalCost,
      promptPreview,
      responsePreview,
      toolCalls,
      durationMs,
    } = job.data;

    try {
      await this.db.insert(aiUsageLog).values({
        id: randomUUID(),
        userId,
        workspaceId,
        projectId: projectId ?? null,
        model,
        provider,
        requestType,
        inputTokens,
        outputTokens,
        totalTokens,
        inputCost: inputCost.toString(),
        outputCost: outputCost.toString(),
        totalCost: totalCost.toString(),
        promptPreview: promptPreview ?? null,
        responsePreview: responsePreview ?? null,
        toolCalls: toolCalls ?? null,
        durationMs: durationMs ?? null,
        createdAt: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to log usage for model=${model}: ${error}`);
      throw error;
    }
  }
}
