# ============================================
# Multi-stage Dockerfile for NestJS Backend
# ============================================
#
# IMPORTANTE: No Easypanel, configure:
# - Dockerfile Path: backend/Dockerfile
# - Build Context: backend
# ============================================

# ============================================
# Stage 1: Build
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate || echo "Prisma generate skipped"

# Copy source code
COPY . .

# Build application
RUN npm run build

# Verify build output exists
RUN ls -la dist/src/ && test -f dist/src/main.js

# ============================================
# Stage 2: Production
# ============================================
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy prisma schema and generate client for production
COPY prisma ./prisma/
RUN npx prisma generate || echo "Prisma generate skipped"

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

USER nestjs

# Expose port (default 3001, can be overridden by BACKEND_PORT env var)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/src/main.js"]
