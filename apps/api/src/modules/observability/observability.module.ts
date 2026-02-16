import { Global, Module, LoggerService as NestLoggerService } from '@nestjs/common';
import { createLogger } from '@repo/observability';
import type { Logger } from '@repo/observability';

/**
 * NestJS LoggerService backed by Pino (via @repo/observability).
 * Replaces the default NestJS logger so all framework logs are structured JSON.
 */
export class PinoLoggerService implements NestLoggerService {
  private readonly logger: Logger;

  constructor() {
    this.logger = createLogger('nestjs');
  }

  log(message: string, context?: string) {
    this.logger.info({ context }, message);
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error({ context, trace }, message);
  }

  warn(message: string, context?: string) {
    this.logger.warn({ context }, message);
  }

  debug(message: string, context?: string) {
    this.logger.debug({ context }, message);
  }

  verbose(message: string, context?: string) {
    this.logger.trace({ context }, message);
  }
}

export const PINO_LOGGER = 'PINO_LOGGER';

@Global()
@Module({
  providers: [
    {
      provide: PINO_LOGGER,
      useFactory: () => createLogger('api'),
    },
    {
      provide: PinoLoggerService,
      useClass: PinoLoggerService,
    },
  ],
  exports: [PINO_LOGGER, PinoLoggerService],
})
export class ObservabilityModule {}
