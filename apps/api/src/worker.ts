import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { createLogger } from '@repo/observability';
import { AppModule } from './app.module';
import { PinoLoggerService } from './modules/observability/observability.module';

const logger = createLogger('api-worker');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
    logger: new PinoLoggerService(),
  });

  logger.info('Worker runtime started');

  const shutdown = async () => {
    logger.info('Shutting down worker runtime');
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap();
