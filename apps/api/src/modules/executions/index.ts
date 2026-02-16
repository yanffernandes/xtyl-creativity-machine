/**
 * Executions module barrel export.
 *
 * Provides workflow execution orchestration:
 * - ExecutionsModule: NestJS module with BullMQ integration
 * - ExecutionsService: Business logic for execution management
 * - ExecutionsController: REST endpoints + SSE streaming
 * - NodeExecutorService: Individual node type handlers
 * - VariableResolverService: {{nodeId.field}} variable resolution
 * - ExecutionProcessor: BullMQ worker for async execution
 */

export * from './executions.module';
export * from './executions.service';
export * from './executions.controller';
export * from './node-executor.service';
export * from './variable-resolver.service';
export * from './execution.processor';
