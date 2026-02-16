import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FastifyRequest, FastifyReply } from 'fastify';
import {
  createLogger,
  extractOrGenerateCorrelationId,
  CORRELATION_HEADER,
  setSentryUser,
} from '@repo/observability';
import type { Logger } from '@repo/observability';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger: Logger;

  constructor() {
    this.logger = createLogger('http');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();
    const { method, url } = request;

    const requestId = extractOrGenerateCorrelationId(
      request.headers as Record<string, string | string[] | undefined>,
    );
    const startTime = Date.now();

    // Attach request ID to request for downstream use
    (request as unknown as Record<string, unknown>).requestId = requestId;

    // Set correlation header on response
    void response.header(CORRELATION_HEADER, requestId);

    // Extract user ID if present (set by auth guard)
    const userId = (request as unknown as Record<string, unknown>).userId as string | undefined;

    if (userId) {
      setSentryUser({ id: userId });
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.info({
            requestId,
            method,
            url,
            statusCode: response.statusCode,
            duration,
            userId,
          }, `${method} ${url} ${response.statusCode} ${duration}ms`);
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          this.logger.error({
            requestId,
            method,
            url,
            duration,
            userId,
            error: error.message,
          }, `${method} ${url} ERROR ${duration}ms`);
        },
      }),
    );
  }
}
