/**
 * Sentry configuration for frontend error tracking
 * Feature 032: Observability & Monitoring
 */

import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.warn('Sentry DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || 'development',
    release: import.meta.env.VITE_APP_VERSION,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    // Session Replay
    replaysSessionSampleRate: parseFloat(import.meta.env.VITE_SENTRY_REPLAY_SESSION_RATE || '0.1'),
    replaysOnErrorSampleRate: parseFloat(import.meta.env.VITE_SENTRY_REPLAY_ERROR_RATE || '1.0'),

    beforeSend(event, hint) {
      // Don't send errors in development
      if (import.meta.env.DEV) {
        console.error('Sentry would send:', event, hint);
        return null;
      }
      return event;
    },
  });
}

export function setUser(user: { id: string; email?: string }) {
  Sentry.setUser(user);
}

export function clearUser() {
  Sentry.setUser(null);
}

export function captureError(error: Error | string, context?: Record<string, unknown>) {
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
