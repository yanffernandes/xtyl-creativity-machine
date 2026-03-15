#!/bin/sh
# Generate runtime env config from environment variables
# This allows Easypanel/Docker to inject env vars at container startup
# instead of requiring them at build time
cat > /usr/share/nginx/html/env.js << EOF
window.__ENV__ = {
  VITE_SUPABASE_URL: "${VITE_SUPABASE_URL:-}",
  VITE_SUPABASE_ANON_KEY: "${VITE_SUPABASE_ANON_KEY:-}",
  VITE_API_URL: "${VITE_API_URL:-/api}",
  VITE_SENTRY_DSN: "${VITE_SENTRY_DSN:-}"
};
EOF

exec nginx -g "daemon off;"
