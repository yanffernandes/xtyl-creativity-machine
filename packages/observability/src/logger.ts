import pino from 'pino';

export type Logger = pino.Logger;

/**
 * Create a structured Pino logger with support for child loggers.
 *
 * - In production: outputs JSON for log aggregation
 * - In development: uses pino-pretty for human-readable output
 */
export function createLogger(name: string, context?: Record<string, unknown>): Logger {
  const baseConfig: pino.LoggerOptions = {
    name,
    level: process.env.LOG_LEVEL ?? 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    ...(context ? { base: { ...context } } : {}),
  };

  if (process.env.NODE_ENV !== 'production') {
    return pino({
      ...baseConfig,
      transport: { target: 'pino-pretty', options: { colorize: true } },
    });
  }

  return pino(baseConfig);
}

/**
 * Create a child logger that inherits the parent's config and adds extra context.
 */
export function createChildLogger(parent: Logger, bindings: Record<string, unknown>): Logger {
  return parent.child(bindings);
}
