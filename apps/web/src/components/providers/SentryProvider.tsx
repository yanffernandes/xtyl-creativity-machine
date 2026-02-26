"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/react";

// Initialize Sentry
Sentry.init({
  dsn: "https://080afdb3aea0fc2422660ec54468d4b5@o4510519308648448.ingest.us.sentry.io/4510519309828096",
  integrations: [Sentry.browserTracingIntegration()],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,

  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ["localhost", /^https:\/\/.*\.xtyl\.app/],
});

export function SentryProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
