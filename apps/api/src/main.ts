import 'reflect-metadata';

// Initialize OpenTelemetry BEFORE any other imports
import { initTracer, initSentry, createLogger } from '@repo/observability';

initTracer({
  serviceName: 'xtyl-api',
  autoInstrument: !!process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
});

initSentry({
  dsn: process.env.SENTRY_DSN ?? '',
  environment: process.env.NODE_ENV ?? 'development',
  release: process.env.APP_VERSION,
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
});

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { PinoLoggerService } from './modules/observability/observability.module';

const logger = createLogger('api');

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      bufferLogs: true,
      logger: new PinoLoggerService(),
    },
  );

  await app.register(multipart as any);

  // Global prefix
  app.setGlobalPrefix('api', { exclude: ['health'] });

  // CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [
      'http://localhost:5173',
      'http://localhost:5174',
    ],
    credentials: true,
  });

  // Global filters (order matters: AllExceptions catches what HttpException doesn't)
  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new HttpExceptionFilter(),
  );

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TimeoutInterceptor(30_000),
  );

  const port = process.env.API_PORT ?? 3000;
  const host = process.env.API_HOST ?? '0.0.0.0';

  await app.listen(port, host);
  logger.info(`API running on http://${host}:${port}`);
}

bootstrap();
