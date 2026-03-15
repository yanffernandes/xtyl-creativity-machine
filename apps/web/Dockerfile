# ============================================
# Bun-based Dockerfile for Web App
# Build with Bun, serve with nginx
# ============================================

FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY bun.lock bunfig.toml package.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY apps/admin/package.json apps/admin/
COPY packages/shared/package.json packages/shared/
COPY packages/observability/package.json packages/observability/
RUN bun install --frozen-lockfile

# Build static assets with Bun
FROM deps AS build
COPY tsconfig.base.json turbo.json ./
COPY packages/ packages/
COPY apps/web/ apps/web/
RUN bun run --filter @repo/shared build
RUN bun run --filter @repo/observability build
RUN bun run --filter @repo/web build

# Serve with nginx (production)
FROM nginx:alpine AS runner
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
