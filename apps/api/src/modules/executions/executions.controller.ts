import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  Res,
  Logger,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import * as jose from 'jose';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ProjectAccessGuard } from '../../common/guards/project-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ExecutionsService, CreateExecutionDto } from './executions.service';
import { DATABASE } from '../../database/database.module';
import { workflowExecutions } from '../../database/drizzle/schema';

/**
 * ExecutionsController provides REST endpoints for workflow execution management.
 *
 * Ported from backend/routers/executions.py.
 *
 * Key endpoints:
 * - POST /workflows/executions - Create and queue execution
 * - GET /workflows/executions/:id - Get execution status
 * - GET /workflows/executions - List executions
 * - DELETE /workflows/executions/:id - Delete execution
 * - POST /workflows/executions/:id/cancel - Cancel running execution
 * - GET /workflows/executions/:id/outputs - Get execution outputs
 * - GET /workflows/executions/:id/stream - SSE stream of execution progress
 */
@Controller('workflows/executions')
@UseGuards(AuthGuard)
export class ExecutionsController {
  private readonly logger = new Logger(ExecutionsController.name);

  constructor(
    private readonly executionsService: ExecutionsService,
    @Inject(DATABASE) private readonly db: any,
  ) {}

  /**
   * Create a new workflow execution.
   *
   * POST /workflows/executions
   */
  @Post()
  @UseGuards(ProjectAccessGuard)
  async create(
    @CurrentUser('id') userId: string,
    @Body() body: CreateExecutionDto,
  ) {
    return this.executionsService.create(userId, body);
  }

  /**
   * Get execution by ID.
   *
   * GET /workflows/executions/:executionId
   */
  @Get(':executionId')
  async get(
    @Param('executionId') executionId: string,
    @CurrentUser('id') userId: string,
  ) {
    const execution = await this.executionsService.get(executionId);

    // Verify user has access
    if (execution.userId !== userId) {
      throw new UnauthorizedException('Access denied');
    }

    return execution;
  }

  /**
   * List executions with optional filters.
   *
   * GET /workflows/executions
   */
  @Get()
  async list(
    @CurrentUser('id') userId: string,
    @Query('template_id') templateId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.executionsService.list(userId, {
      templateId,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /**
   * Delete an execution (soft delete).
   *
   * DELETE /workflows/executions/:executionId
   */
  @Delete(':executionId')
  async delete(
    @Param('executionId') executionId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.executionsService.delete(executionId, userId);
    return { message: 'Execution deleted successfully' };
  }

  /**
   * Cancel a running execution.
   *
   * POST /workflows/executions/:executionId/cancel
   */
  @Post(':executionId/cancel')
  async cancel(
    @Param('executionId') executionId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.executionsService.cancel(executionId, userId);
    return { message: 'Execution cancelled successfully' };
  }

  /**
   * Get execution outputs (final results).
   *
   * GET /workflows/executions/:executionId/outputs
   */
  @Get(':executionId/outputs')
  async getOutputs(
    @Param('executionId') executionId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.executionsService.getOutputs(executionId, userId);
  }

  /**
   * Stream execution progress via Server-Sent Events (SSE).
   *
   * GET /workflows/executions/:executionId/stream?token=...
   *
   * Token is passed via query param since EventSource doesn't support headers.
   */
  @Get(':executionId/stream')
  async stream(
    @Param('executionId') executionId: string,
    @Query('token') token: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    // Authenticate via query parameter token (SSE doesn't support headers)
    if (!token) {
      throw new UnauthorizedException('Token required');
    }

    // Verify JWT token
    let userId: string;
    try {
      const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET ?? '');
      const { payload } = await jose.jwtVerify(token, secret, {
        audience: 'authenticated',
        algorithms: ['HS256'],
      });

      if (!payload.sub) {
        throw new UnauthorizedException('Invalid token: no subject');
      }
      userId = payload.sub;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error(`Token verification failed: ${error}`);
      throw new UnauthorizedException('Invalid token');
    }

    // Verify execution exists and user has access
    const [execution] = await this.db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, executionId))
      .limit(1);

    if (!execution) {
      return reply.status(404).send({ error: 'Execution not found' });
    }

    if (execution.userId !== userId) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    // Set up SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true',
    });

    // Send initial event
    reply.raw.write(`data: ${JSON.stringify({ type: 'connected', executionId })}\n\n`);

    // Poll execution status and job progress
    const pollInterval = setInterval(async () => {
      try {
        const [currentExecution] = await this.db
          .select()
          .from(workflowExecutions)
          .where(eq(workflowExecutions.id, executionId))
          .limit(1);

        if (!currentExecution) {
          clearInterval(pollInterval);
          reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: 'Execution not found' })}\n\n`);
          reply.raw.end();
          return;
        }

        // Send progress update
        const progressData = {
          type: 'progress',
          status: currentExecution.status,
          progress: currentExecution.progressPercent,
          currentNodeId: currentExecution.currentNodeId,
          message: `Execution ${currentExecution.status} - ${currentExecution.progressPercent}%`,
        };

        reply.raw.write(`data: ${JSON.stringify(progressData)}\n\n`);

        // Check if execution is complete
        if (['completed', 'failed', 'stopped'].includes(currentExecution.status)) {
          clearInterval(pollInterval);

          const finalData = {
            type: currentExecution.status === 'completed' ? 'complete' : 'error',
            status: currentExecution.status,
            progress: 100,
            message: currentExecution.status === 'completed'
              ? 'Workflow completed successfully'
              : currentExecution.errorMessage ?? 'Workflow failed',
            data: {
              outputs: currentExecution.executionContext,
            },
          };

          reply.raw.write(`data: ${JSON.stringify(finalData)}\n\n`);
          reply.raw.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
          reply.raw.end();
        }
      } catch (error) {
        this.logger.error(`SSE polling error: ${error}`);
        clearInterval(pollInterval);
        reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: String(error) })}\n\n`);
        reply.raw.end();
      }
    }, 1000); // Poll every second

    // Clean up on connection close
    request.raw.on('close', () => {
      clearInterval(pollInterval);
      this.logger.log(`SSE connection closed for execution ${executionId}`);
    });
  }
}
