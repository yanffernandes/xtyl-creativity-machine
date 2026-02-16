import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module';
import {
  workflowExecutions,
  workflowTemplates,
  nodeOutputs,
} from '../../database/drizzle/schema';
import { NodeExecutorService } from './node-executor.service';
import { VariableResolverService } from './variable-resolver.service';
import { randomUUID } from 'crypto';

/**
 * ExecutionProcessor is the BullMQ worker that executes workflows.
 *
 * Ported from backend/services/workflow_executor.py.
 *
 * Process:
 * 1. Load workflow template (nodes & edges)
 * 2. Build execution order via topological sort
 * 3. Execute nodes sequentially, resolving variables
 * 4. Store outputs in execution_context
 * 5. Update execution status (completed/failed)
 */
@Processor('workflow-execution', { concurrency: 2 })
export class ExecutionProcessor extends WorkerHost {
  private readonly logger = new Logger(ExecutionProcessor.name);

  constructor(
    @Inject(DATABASE) private readonly db: any,
    private readonly nodeExecutor: NodeExecutorService,
    private readonly variableResolver: VariableResolverService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { executionId, templateId } = job.data;

    this.logger.log(`Processing workflow execution ${executionId}`);

    // Load execution
    const [execution] = await this.db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, executionId))
      .limit(1);

    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    // Load template
    const [template] = await this.db
      .select()
      .from(workflowTemplates)
      .where(eq(workflowTemplates.id, templateId))
      .limit(1);

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const nodes = template.nodesJson ?? [];
    const edges = template.edgesJson ?? [];

    if (nodes.length === 0) {
      throw new Error('Workflow has no nodes');
    }

    try {
      // Update status to running
      await this.db
        .update(workflowExecutions)
        .set({
          status: 'running',
          startedAt: new Date(),
        })
        .where(eq(workflowExecutions.id, executionId));

      // Build execution order
      const executionOrder = this.variableResolver.buildExecutionOrder(
        nodes,
        edges,
      );

      this.logger.log(
        `Execution order: ${executionOrder.join(' → ')}`,
      );

      // Initialize execution context
      const nodeOutputsMap: Record<string, Record<string, any>> = {};

      // Execute nodes in order
      const totalNodes = executionOrder.length;
      for (let i = 0; i < executionOrder.length; i++) {
        const nodeId = executionOrder[i];
        const node = nodes.find((n: any) => n.id === nodeId);

        if (!node) {
          throw new Error(`Node not found: ${nodeId}`);
        }

        // Check if execution was cancelled
        const [currentExecution] = await this.db
          .select()
          .from(workflowExecutions)
          .where(eq(workflowExecutions.id, executionId))
          .limit(1);

        if (currentExecution.status === 'stopped') {
          this.logger.log(`Execution ${executionId} was cancelled`);
          return;
        }

        // Update progress
        const progress = Math.floor((i / totalNodes) * 100);
        await this.db
          .update(workflowExecutions)
          .set({
            progressPercent: progress,
            currentNodeId: nodeId,
          })
          .where(eq(workflowExecutions.id, executionId));

        await job.updateProgress(progress);

        this.logger.log(
          `Executing node ${i + 1}/${totalNodes}: ${node.type} (${nodeId})`,
        );

        // Resolve variables in node configuration
        const resolvedNode = this.variableResolver.resolveNodeVariables(
          node,
          nodeOutputsMap,
        );

        // Execute node
        const output = await this.nodeExecutor.executeNode(
          resolvedNode,
          execution,
        );

        // Store output
        nodeOutputsMap[nodeId] = output;

        // Save to node_outputs table
        await this.db.insert(nodeOutputs).values({
          id: randomUUID(),
          executionId,
          nodeId,
          nodeName: node.data?.label ?? nodeId,
          nodeType: node.type,
          outputs: output,
          executionOrder: i,
          iterationNumber: 0,
          startedAt: new Date(),
          completedAt: new Date(),
          createdAt: new Date(),
        });

        this.logger.log(
          `Node ${nodeId} completed with output keys: ${Object.keys(output).join(', ')}`,
        );
      }

      // Workflow completed successfully
      await this.db
        .update(workflowExecutions)
        .set({
          status: 'completed',
          completedAt: new Date(),
          executionContext: nodeOutputsMap,
          progressPercent: 100,
        })
        .where(eq(workflowExecutions.id, executionId));

      await job.updateProgress(100);

      this.logger.log(`Workflow execution ${executionId} completed successfully`);
    } catch (error) {
      this.logger.error(
        `Workflow execution ${executionId} failed: ${error}`,
      );

      // Update execution status to failed
      await this.db
        .update(workflowExecutions)
        .set({
          status: 'failed',
          completedAt: new Date(),
          errorMessage:
            error instanceof Error ? error.message : String(error),
        })
        .where(eq(workflowExecutions.id, executionId));

      throw error;
    }
  }
}
