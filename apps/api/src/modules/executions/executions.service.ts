import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module';
import {
  workflowExecutions,
  workflowTemplates,
  agentJobs,
} from '../../database/drizzle/schema';
import { randomUUID } from 'crypto';

export interface CreateExecutionDto {
  templateId: string;
  projectId: string;
  workspaceId: string;
  configJson?: Record<string, any>;
}

export interface ListExecutionsFilters {
  templateId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

/**
 * ExecutionsService manages workflow execution lifecycle.
 *
 * Ported from backend/routers/executions.py.
 *
 * Responsibilities:
 * - Create execution records
 * - Queue execution jobs via BullMQ
 * - Query execution status
 * - Manage execution cancellation
 */
@Injectable()
export class ExecutionsService {
  private readonly logger = new Logger(ExecutionsService.name);

  constructor(
    @Inject(DATABASE) private readonly db: any,
    @InjectQueue('workflow-execution') private readonly executionQueue: Queue,
  ) {}

  /**
   * Create a new workflow execution and queue it for processing.
   *
   * @param userId User initiating the execution
   * @param data   Execution configuration
   * @returns      Created execution record
   */
  async create(
    userId: string,
    data: CreateExecutionDto,
  ): Promise<Record<string, any>> {
    const executionId = randomUUID();

    // Verify template exists
    const [template] = await this.db
      .select()
      .from(workflowTemplates)
      .where(eq(workflowTemplates.id, data.templateId))
      .limit(1);

    if (!template) {
      throw new NotFoundException(
        `Workflow template not found: ${data.templateId}`,
      );
    }

    // Create execution record
    await this.db.insert(workflowExecutions).values({
      id: executionId,
      templateId: data.templateId,
      projectId: data.projectId,
      workspaceId: data.workspaceId,
      userId,
      status: 'pending',
      configJson: data.configJson ?? {},
      executionContext: {},
      progressPercent: 0,
      totalCost: '0',
      totalTokensUsed: 0,
      generatedDocumentIds: [],
      createdAt: new Date(),
    });

    // Increment template usage count
    await this.db
      .update(workflowTemplates)
      .set({
        usageCount: template.usageCount + 1,
      })
      .where(eq(workflowTemplates.id, data.templateId));

    // Queue execution job
    await this.executionQueue.add(
      'execute-workflow',
      {
        executionId,
        templateId: data.templateId,
        config: data.configJson ?? {},
      },
      {
        jobId: executionId,
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500, // Keep last 500 failed jobs
      },
    );

    this.logger.log(`Created execution ${executionId} for template ${data.templateId}`);

    // Fetch and return full execution
    return this.get(executionId);
  }

  /**
   * Get execution by ID with related job data.
   *
   * @param executionId Execution ID
   * @returns           Execution record with jobs
   */
  async get(executionId: string): Promise<Record<string, any>> {
    const [execution] = await this.db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, executionId))
      .limit(1);

    if (!execution) {
      throw new NotFoundException(`Execution not found: ${executionId}`);
    }

    // Fetch related jobs
    const jobs = await this.db
      .select()
      .from(agentJobs)
      .where(eq(agentJobs.executionId, executionId))
      .orderBy(agentJobs.createdAt);

    return {
      ...execution,
      jobs,
    };
  }

  /**
   * List executions with optional filters.
   *
   * @param userId  User ID (filter to user's executions)
   * @param filters Additional filters
   * @returns       Array of execution records
   */
  async list(
    userId: string,
    filters: ListExecutionsFilters = {},
  ): Promise<Record<string, any>[]> {
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    let query = this.db
      .select()
      .from(workflowExecutions)
      .where(and(
        eq(workflowExecutions.userId, userId),
        isNull(workflowExecutions.deletedAt),
      ))
      .orderBy(desc(workflowExecutions.createdAt))
      .limit(limit)
      .offset(offset);

    // Apply optional filters
    const conditions: any[] = [
      eq(workflowExecutions.userId, userId),
      isNull(workflowExecutions.deletedAt),
    ];

    if (filters.templateId) {
      conditions.push(eq(workflowExecutions.templateId, filters.templateId));
    }

    if (filters.status) {
      conditions.push(eq(workflowExecutions.status, filters.status));
    }

    query = this.db
      .select()
      .from(workflowExecutions)
      .where(and(...conditions))
      .orderBy(desc(workflowExecutions.createdAt))
      .limit(limit)
      .offset(offset);

    return query;
  }

  /**
   * Cancel a running execution.
   *
   * @param executionId Execution ID
   * @param userId      User ID (for authorization check)
   */
  async cancel(executionId: string, userId: string): Promise<void> {
    const [execution] = await this.db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, executionId))
      .limit(1);

    if (!execution) {
      throw new NotFoundException(`Execution not found: ${executionId}`);
    }

    if (execution.userId !== userId) {
      throw new Error('Access denied');
    }

    // Update status to cancelled
    await this.db
      .update(workflowExecutions)
      .set({
        status: 'stopped',
        completedAt: new Date(),
      })
      .where(eq(workflowExecutions.id, executionId));

    // Try to remove job from queue
    try {
      const job = await this.executionQueue.getJob(executionId);
      if (job) {
        await job.remove();
      }
    } catch (error) {
      this.logger.warn(`Failed to remove job from queue: ${error}`);
    }

    this.logger.log(`Cancelled execution ${executionId}`);
  }

  /**
   * Delete an execution (soft delete).
   *
   * @param executionId Execution ID
   * @param userId      User ID (for authorization check)
   */
  async delete(executionId: string, userId: string): Promise<void> {
    const [execution] = await this.db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, executionId))
      .limit(1);

    if (!execution) {
      throw new NotFoundException(`Execution not found: ${executionId}`);
    }

    if (execution.userId !== userId) {
      throw new Error('Access denied');
    }

    // Soft delete
    await this.db
      .update(workflowExecutions)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(workflowExecutions.id, executionId));

    this.logger.log(`Deleted execution ${executionId}`);
  }

  /**
   * Get execution outputs (final results).
   *
   * @param executionId Execution ID
   * @param userId      User ID (for authorization check)
   * @returns           Execution context (node outputs)
   */
  async getOutputs(
    executionId: string,
    userId: string,
  ): Promise<Record<string, any>> {
    const [execution] = await this.db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, executionId))
      .limit(1);

    if (!execution) {
      throw new NotFoundException(`Execution not found: ${executionId}`);
    }

    if (execution.userId !== userId) {
      throw new Error('Access denied');
    }

    return {
      executionId,
      status: execution.status,
      outputs: execution.executionContext ?? {},
      completedAt: execution.completedAt,
    };
  }
}
