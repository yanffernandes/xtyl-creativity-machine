# Quickstart: Local Development Setup

**Feature**: 032-full-stack-migration | **Date**: 2026-02-07

This guide covers local development for the **new monorepo architecture** (NestJS + React/Vite). It replaces the previous `dev.sh` / `start.sh` workflow that ran a Python/FastAPI backend and Next.js frontend separately.

---

## Prerequisites

| Tool | Version | Check | Notes |
|------|---------|-------|-------|
| Node.js | 20+ (LTS) | `node --version` | Required for all apps and packages |
| pnpm | 9.x | `pnpm --version` | Workspace-aware package manager |
| Docker & Docker Compose | Latest | `docker --version` | Required for Redis; optional for local Supabase |
| Git | Any recent | `git --version` | |

### Install pnpm via Corepack

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

If Corepack is not available (older Node.js distributions), install pnpm directly:

```bash
npm install -g pnpm@9
```

---

## 1. Clone & Install

```bash
git clone <repo-url>
cd xtyl-creativity-machine
pnpm install
```

This installs dependencies for all workspace packages in a single operation:
- `apps/api` (NestJS backend)
- `apps/web` (React + Vite frontend)
- `packages/shared` (Zod schemas, types, constants)
- `packages/observability` (Pino, OpenTelemetry, Sentry)

---

## 2. Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

### `.env.example` (adapted for new stack)

```bash
# ==================================
# XTYL Creativity Machine (Monorepo)
# Environment Variables
# ==================================

# ============ SUPABASE DATABASE ============
# Get from: Supabase Dashboard > Settings > Database > Connection string
# Used by: Drizzle ORM in apps/api
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# ============ SUPABASE AUTH ============
# Get from: Supabase Dashboard > Settings > API
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase

# ============ REDIS (BullMQ + Cache) ============
# Development: local Docker container
# Production: managed Redis or Docker service
REDIS_URL=redis://localhost:6379

# ============ CLOUDFLARE R2 STORAGE ============
# Get from: Cloudflare Dashboard > R2 > Manage R2 API Tokens
R2_ENDPOINT=https://[ACCOUNT_ID].r2.cloudflarestorage.com
R2_ACCESS_KEY=your-r2-access-key
R2_SECRET_KEY=your-r2-secret-key
R2_BUCKET=xtyl-storage
R2_PUBLIC_URL=https://pub-[HASH].r2.dev

# ============ AI PROVIDERS ============
# OpenRouter (LLM / text generation)
OPENROUTER_API_KEY=your-openrouter-key

# fal.ai (Image Studio operations)
# Get from: https://fal.ai/dashboard/keys
FAL_KEY=your-fal-api-key

# Optional AI providers
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
TAVILY_API_KEY=

# ============ EMAIL (BREVO) ============
BREVO_API_KEY=your-brevo-api-key
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=XTYL Creativity Machine

# ============ APPLICATION ============
# API server
API_PORT=3000
API_HOST=0.0.0.0

# Frontend (Vite dev server)
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://[PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key

# CORS (comma-separated origins allowed by the API)
ALLOWED_ORIGINS=http://localhost:5173

# Application metadata (used in OpenRouter HTTP-Referer header)
APP_URL=https://xtyl.app
APP_TITLE=XTYL Creativity Machine

# ============ SENTRY ERROR TRACKING (OPTIONAL) ============
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=your-sentry-project
SENTRY_AUTH_TOKEN=your-sentry-auth-token
```

### Key differences from the old `.env.example`

| Old (Python/Next.js) | New (NestJS/Vite) | Why |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `VITE_API_URL` | Vite uses `VITE_` prefix for client-exposed vars |
| `NEXT_PUBLIC_SUPABASE_URL` | `VITE_SUPABASE_URL` | Same reason |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `VITE_SUPABASE_ANON_KEY` | Same reason |
| `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` | `REDIS_URL` | BullMQ uses a single Redis connection, no Celery |
| `FAL_API_KEY` | `FAL_KEY` | Aligned with fal.ai SDK convention |
| `NEXT_PUBLIC_SENTRY_DSN` | `SENTRY_DSN` | No Next.js prefix needed |

---

## 3. Database Setup

The existing Supabase PostgreSQL database (30+ tables, 35+ migrations) remains unchanged. Drizzle ORM connects to it as a **query-only layer** -- it does not manage the schema.

### Introspect the existing schema into TypeScript

```bash
pnpm --filter @repo/api drizzle-kit pull
```

This generates typed table definitions in `apps/api/src/database/drizzle/schema.ts` by reading your Supabase database schema.

**Important notes**:
- Run this command after every new Supabase migration to keep the TypeScript schema in sync.
- `drizzle-kit pull` does NOT generate relation declarations. Relations between tables must be added manually in `apps/api/src/database/drizzle/relations.ts`.
- Use `prepare: false` on the postgres.js client configuration for Supabase PgBouncer compatibility.

### Schema changes

Schema changes continue to go through Supabase SQL migrations in the `supabase/migrations/` directory. Drizzle is never used for DDL (CREATE/ALTER/DROP). The workflow is:

1. Write a new SQL migration in `supabase/migrations/`
2. Apply it via `supabase db push` or the Supabase dashboard
3. Re-run `pnpm --filter @repo/api drizzle-kit pull` to update TypeScript types

---

## 4. Start Development Services

### Option A: Docker Compose (recommended)

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts **Redis** (for BullMQ job queues and caching). The API and web apps run locally with hot reload outside Docker for faster iteration.

Then start the apps:

```bash
pnpm dev
```

This uses Turborepo to start all apps in parallel with dependency-aware ordering.

### Option B: Individual Services

```bash
# Terminal 1: Redis
docker run -d --name xtyl-redis -p 6379:6379 redis:7-alpine

# Terminal 2: API (NestJS + Fastify)
pnpm --filter @repo/api dev

# Terminal 3: Web (React + Vite)
pnpm --filter @repo/web dev
```

### Verify services are running

| Service | URL | Health check |
|---------|-----|-------------|
| Web (Vite) | http://localhost:5173 | Open in browser |
| API (NestJS) | http://localhost:3000 | `curl http://localhost:3000/health` |
| Redis | localhost:6379 | `docker exec xtyl-redis redis-cli ping` |
| Database | Supabase (cloud) | Verified by API startup |
| Storage | Cloudflare R2 (cloud) | Verified on first upload |

---

## 5. Turborepo Commands

Run from the repository root. Turborepo handles dependency ordering and caching.

```bash
# Development
pnpm dev              # Start all apps in dev mode (API + Web)
pnpm dev --filter @repo/api   # Start only the API
pnpm dev --filter @repo/web   # Start only the web app

# Build
pnpm build            # Build all apps and packages
pnpm build --filter @repo/api  # Build only the API

# Quality
pnpm lint             # Lint all packages (ESLint)
pnpm typecheck        # TypeScript type checking across all packages
pnpm test             # Run Vitest tests across all packages
pnpm test:e2e         # Run Playwright E2E tests

# Utilities
pnpm clean            # Remove node_modules and build artifacts
pnpm format           # Format code with Prettier
```

### Turborepo caching

Turborepo caches build and lint outputs. When source files have not changed, subsequent runs are near-instant. To force a fresh run:

```bash
pnpm build --force
```

---

## 6. Project URLs

| Service | URL | Description |
|---------|-----|-------------|
| Web app | http://localhost:5173 | Main application (React + Vite) |
| API | http://localhost:3000 | Backend REST API (NestJS + Fastify) |
| API docs (Swagger) | http://localhost:3000/api/docs | Auto-generated OpenAPI documentation |
| Bull Board | http://localhost:3000/admin/queues | BullMQ job queue dashboard (dev only) |
| Drizzle Studio | Launched via CLI | Visual database explorer |

---

## 7. Key Development Workflows

### Adding a new API endpoint

1. **Define the schema** in `packages/shared/src/schemas/`:
   ```typescript
   // packages/shared/src/schemas/project.schema.ts
   import { z } from 'zod';

   export const createProjectSchema = z.object({
     name: z.string().min(1).max(100),
     description: z.string().optional(),
   });

   export type CreateProjectInput = z.infer<typeof createProjectSchema>;
   ```

2. **Create the controller method** in `apps/api/src/modules/`:
   ```typescript
   // apps/api/src/modules/projects/projects.controller.ts
   @Post()
   @UsePipes(new ZodValidationPipe(createProjectSchema))
   async create(@Body() body: CreateProjectInput, @CurrentUser() user: User) {
     return this.projectsService.create(body, user.id);
   }
   ```

3. **The frontend automatically gets types** from `@repo/shared`:
   ```typescript
   // apps/web/src/features/project/api.ts
   import type { CreateProjectInput } from '@repo/shared';

   export function createProject(data: CreateProjectInput) {
     return apiClient.post('/projects', data);
   }
   ```

The shared Zod schema is the single source of truth -- validated on the API side, typed on the frontend side, no duplication.

### Adding a new frontend route

1. **Create the route file** in `apps/web/src/routes/` following TanStack Router conventions:
   ```
   src/routes/workspace/$id/project/$projectId/analytics.tsx
   ```

2. **The route tree auto-generates** on save (via the TanStack Router Vite plugin). No manual registration needed.

3. **Use typed params and search** from the generated route:
   ```typescript
   import { createFileRoute } from '@tanstack/react-router';

   export const Route = createFileRoute(
     '/workspace/$id/project/$projectId/analytics'
   )({
     component: AnalyticsPage,
   });

   function AnalyticsPage() {
     const { id, projectId } = Route.useParams();
     // id and projectId are fully typed strings
   }
   ```

**Key mapping from Next.js App Router**:

| Next.js | TanStack Router | Purpose |
|---------|----------------|---------|
| `layout.tsx` | `route.tsx` with `<Outlet />` | Layout wrapping |
| `page.tsx` | `index.tsx` | Route component |
| `loading.tsx` | `pendingComponent` on route config | Loading state |
| `error.tsx` | `errorComponent` on route config | Error boundary |
| `[id]` folder | `$id` folder | Dynamic segment |

### Running Drizzle Studio (DB explorer)

```bash
pnpm --filter @repo/api drizzle-kit studio
```

This opens a visual database explorer at `https://local.drizzle.studio` where you can browse tables, run queries, and inspect data. It connects directly to your Supabase database using the `DATABASE_URL` from `.env`.

### Adding a BullMQ job queue

1. **Register the queue** in the relevant NestJS module:
   ```typescript
   // apps/api/src/modules/image-generation/image-generation.module.ts
   @Module({
     imports: [
       BullModule.registerQueue({ name: 'image-generation' }),
     ],
     providers: [ImageGenerationService, ImageGenerationProcessor],
   })
   export class ImageGenerationModule {}
   ```

2. **Create a processor** to handle jobs:
   ```typescript
   // apps/api/src/modules/image-generation/image-generation.processor.ts
   @Processor('image-generation')
   export class ImageGenerationProcessor extends WorkerHost {
     async process(job: Job<ImageGenerationJobData>) {
       // Process the job, report progress
       await job.updateProgress(50);
       // ...
       return result;
     }
   }
   ```

3. **Add jobs from the service**:
   ```typescript
   @InjectQueue('image-generation')
   private readonly queue: Queue;

   async generateImage(data: ImageGenerationJobData) {
     const job = await this.queue.add('generate', data, {
       attempts: 3,
       backoff: { type: 'exponential', delay: 1000 },
     });
     return { jobId: job.id };
   }
   ```

The Bull Board dashboard at `http://localhost:3000/admin/queues` shows all queues, jobs, and their statuses.

---

## 8. Troubleshooting

### `pnpm install` fails with workspace resolution errors

Ensure you are using pnpm 9.x. Older versions may not support the Internal Packages pattern correctly.

```bash
pnpm --version
# Should be 9.x

# If not:
corepack prepare pnpm@latest --activate
```

### `drizzle-kit pull` fails to connect

- Verify `DATABASE_URL` in `.env` is correct and uses the **pooler** connection string (port 6543, not 5432).
- If using Supabase with PgBouncer (default), ensure the connection string includes `?pgbouncer=true` or configure `prepare: false` in the Drizzle config.
- Check that your IP is allowed in Supabase network restrictions (Dashboard > Settings > Database > Network).

### Port conflicts

If ports 3000 or 5173 are already in use:

```bash
# Find and kill processes on a port
lsof -ti :3000 | xargs kill -9
lsof -ti :5173 | xargs kill -9
```

Or configure alternative ports:

```bash
# API: set in .env
API_PORT=3001

# Web: pass to Vite
pnpm --filter @repo/web dev -- --port 5174
```

### Redis connection refused

```bash
# Check if Redis container is running
docker ps | grep redis

# If not running, start it
docker run -d --name xtyl-redis -p 6379:6379 redis:7-alpine

# Verify connectivity
docker exec xtyl-redis redis-cli ping
# Expected: PONG
```

### NestJS cannot resolve `@repo/shared` imports

This happens when the Internal Packages pattern is not configured correctly. Verify:

1. `packages/shared/package.json` has `"main": "./src/index.ts"` (points to source, not built output).
2. `apps/api/tsconfig.json` includes a path alias or project reference for `@repo/shared`.
3. If NestJS uses `tsc` for compilation, you may need TypeScript project references or `tsup`/`swc` bundling. See `research.md` section 6 for details.

### Vite HMR not working

- Ensure you are accessing the app at `http://localhost:5173`, not a proxied URL.
- Check that `VITE_API_URL` is set correctly (should point to the API, not the Vite server).
- If running inside a VM or container, you may need to set `server.host: true` in `vite.config.ts`.

### TypeScript errors after pulling latest changes

```bash
# Regenerate the route tree (TanStack Router)
pnpm --filter @repo/web dev
# The route tree auto-generates on Vite startup

# Re-introspect the database schema (if migrations changed)
pnpm --filter @repo/api drizzle-kit pull

# Full type check
pnpm typecheck
```

### Migrating from the old dev workflow

| Old command | New equivalent |
|---|---|
| `./dev.sh setup` | `pnpm install` |
| `./dev.sh start` | `docker compose -f docker-compose.dev.yml up -d && pnpm dev` |
| `./dev.sh stop` | `Ctrl+C` + `docker compose -f docker-compose.dev.yml down` |
| `./dev.sh redis` | `docker run -d --name xtyl-redis -p 6379:6379 redis:7-alpine` |
| `./dev.sh backend` | `pnpm --filter @repo/api dev` |
| `./dev.sh frontend` | `pnpm --filter @repo/web dev` |
| `./dev.sh status` | `curl http://localhost:3000/health` + `docker ps` |

---

## 9. Workspace Package Reference

| Package | Name | Path | Purpose |
|---------|------|------|---------|
| API | `@repo/api` | `apps/api/` | NestJS + Fastify backend |
| Web | `@repo/web` | `apps/web/` | React + Vite + TanStack Router frontend |
| Shared | `@repo/shared` | `packages/shared/` | Zod schemas, TypeScript types, constants |
| Observability | `@repo/observability` | `packages/observability/` | Pino logger, OpenTelemetry tracing, Sentry |
