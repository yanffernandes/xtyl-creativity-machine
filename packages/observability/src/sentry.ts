import * as Sentry from '@sentry/node';

export interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  /** Sample rate for performance monitoring (0.0 - 1.0). Default 0.1 */
  tracesSampleRate?: number;
}

/**
 * Initialize Sentry for server-side error capture and performance monitoring.
 * Call early in app bootstrap (before NestJS init).
 */
export function initSentry(config: SentryConfig): void {
  if (!config.dsn) return;

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    tracesSampleRate: config.tracesSampleRate ?? 0.1,
    integrations: [
      Sentry.httpIntegration(),
    ],
  });
}

/**
 * Capture an error in Sentry with optional extra context.
 */
export function captureError(
  error: Error | string,
  context?: Record<string, unknown>,
): void {
  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      if (typeof error === 'string') {
        Sentry.captureMessage(error, 'error');
      } else {
        Sentry.captureException(error);
      }
    });
  } else {
    if (typeof error === 'string') {
      Sentry.captureMessage(error, 'error');
    } else {
      Sentry.captureException(error);
    }
  }
}

/**
 * Set the user context for Sentry (call after auth).
 */
export function setSentryUser(user: { id: string; email?: string }): void {
  Sentry.setUser(user);
}

/**
 * Flush pending Sentry events (call on shutdown).
 */
export async function flushSentry(timeoutMs = 2000): Promise<void> {
  await Sentry.flush(timeoutMs);
}
