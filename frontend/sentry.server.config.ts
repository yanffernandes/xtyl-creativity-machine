import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Tracing
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Only enable in production or when explicitly configured
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
