# ============================================
# Bun-based Multi-stage Dockerfile for API
# 3-4x faster than Node.js, native TypeScript
# ============================================

FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY bun.lock bunfig.toml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/admin/package.json apps/admin/
COPY packages/shared/package.json packages/shared/
COPY packages/observability/package.json packages/observability/
RUN bun install

# Build shared packages and API
FROM deps AS build
COPY tsconfig.base.json turbo.json ./
COPY packages/ packages/
COPY apps/api/ apps/api/
RUN bun run --filter @repo/shared build
RUN bun run --filter @repo/observability build
RUN bun run --filter @repo/api build

# Production image (smaller, only runtime)
FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy node_modules and built artifacts
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/packages/observability/dist ./packages/observability/dist
COPY --from=build /app/packages/observability/package.json ./packages/observability/

EXPOSE 3000

# Use Bun runtime (much faster startup)
CMD ["bun", "--bun", "apps/api/dist/main.js"]
