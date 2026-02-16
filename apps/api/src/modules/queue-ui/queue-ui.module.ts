import { Module } from '@nestjs/common';

/**
 * Bull Board UI for queue monitoring.
 * Configured in main.ts after app creation since it requires
 * access to the Fastify instance for route registration.
 *
 * Available at /admin/queues in development/staging.
 */
@Module({})
export class QueueUiModule {}
