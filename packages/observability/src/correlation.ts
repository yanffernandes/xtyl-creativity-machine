import { randomUUID } from 'node:crypto';

export const CORRELATION_HEADER = 'x-request-id';

/**
 * Generate a new correlation/request ID (UUID v4).
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Extract correlation ID from an incoming request headers map,
 * or generate a new one if not present.
 */
export function extractOrGenerateCorrelationId(
  headers: Record<string, string | string[] | undefined>,
): string {
  const existing = headers[CORRELATION_HEADER];
  if (typeof existing === 'string' && existing.length > 0) {
    return existing;
  }
  return generateCorrelationId();
}
