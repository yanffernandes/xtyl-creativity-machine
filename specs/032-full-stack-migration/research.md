# Research: Full-Stack Migration

**Feature**: 032-full-stack-migration
**Date**: 2026-02-07

## 1. ORM for Existing PostgreSQL Schema

**Decision**: Drizzle ORM
**Rationale**: Native pgvector support with `vector()` column type and `cosineDistance()` operator. `drizzle-kit pull` introspects the existing 30+ table schema into TypeScript in seconds. Minimal runtime overhead (compiles to raw SQL). TypeScript-first with `$inferSelect`/`$inferInsert` per table.
**Alternatives considered**:
- **Prisma**: Rejected. pgvector columns become `Unsupported("vector")` -- cannot read/write vector data through Prisma client. Forces raw SQL for all RAG/embedding operations, defeating the ORM purpose. External `.prisma` DSL adds a secondary type generation step.
- **TypeORM**: Rejected. No introspection tooling -- would require manually writing 30+ entity classes. In maintenance mode with slower releases. Decorator-based with weaker TypeScript inference.

**Critical gotcha**: `drizzle-kit pull` does NOT generate relation declarations. Relations must be added manually after introspection. Use `prepare: false` on postgres.js client for Supabase PgBouncer compatibility.

**Migration strategy**: Use Supabase migrations for DDL (schema changes). Use Drizzle purely as a query layer. Run `drizzle-kit pull` after each Supabase migration to sync TypeScript schema.

## 2. SSE Streaming in NestJS

**Decision**: Hybrid approach -- NestJS `@Sse()` decorator for simple streams + raw Fastify reply for workflow execution
**Rationale**: The `@Sse()` decorator handles connection setup and keep-alive automatically but lacks control for long-running job progress (emitted from BullMQ processors via EventEmitter2). Raw Fastify reply allows writing SSE events triggered by async events from the job queue.
**Alternatives considered**:
- **WebSockets**: Rejected. Current system uses SSE; changing protocol would break frontend compatibility.
- **@Sse() only**: Insufficient. Cannot emit progress events from separate BullMQ worker context into the RxJS Observable.

**Critical gotcha**: When using raw Fastify `@Res()`, NestJS no longer manages response lifecycle -- must call `reply.raw.end()` manually. Set `X-Accel-Buffering: no` header for reverse proxy compatibility.

## 3. Job Queue (BullMQ)

**Decision**: @nestjs/bullmq with separate processor modules per queue
**Rationale**: Official NestJS integration. Same Redis backend as current Celery setup. Supports job priorities, rate limiting, delayed jobs, retries with exponential backoff, and progress tracking -- all features used by current image generation, RAG indexing, and email services.
**Alternatives considered**:
- **Agenda/Bee-Queue**: Smaller ecosystem, fewer features.
- **Custom Redis pub/sub**: Too low-level for retry logic, progress tracking, dead letter queues.

**Configuration notes**: Set `maxRetriesPerRequest: null` in Redis connection (required by BullMQ's blocking commands). Use `removeOnComplete`/`removeOnFail` to prevent Redis memory buildup. Add @bull-board/nestjs for dev/staging dashboard.

## 4. i18n Solution

**Decision**: react-i18next + i18next-http-backend
**Rationale**: Largest ecosystem (6M+ weekly downloads). Plugin architecture supports namespace-based lazy loading per route. Direct migration path from next-intl (same key-value JSON format -- rename files and update imports). TypeScript type safety via declaration merging.
**Alternatives considered**:
- **Lingui**: Smaller bundle (~10KB vs ~22KB) but much smaller ecosystem (80K downloads). ICU message format requires learning new syntax.
- **Format.js/react-intl**: More verbose API. Less flexible namespace lazy loading.

**Migration approach**: Convert next-intl JSON message files to react-i18next format (minimal changes). Place translation files in `public/locales/` for Vite. Use route-level `beforeLoad` to pre-load namespaces.

## 5. Frontend Routing

**Decision**: TanStack Router with @tanstack/router-plugin/vite
**Rationale**: Full type safety on params, search params, and loader data. File-based routing via Vite plugin generates typed route tree at build time. Automatic code splitting per route. Layout nesting via `route.tsx` files (equivalent to Next.js `layout.tsx`). Loading/error states via `pendingComponent`/`errorComponent`.
**Alternatives considered**:
- **React Router v7**: Less type safety. No file-based routing with Vite without extra tooling.
- **TanStack Start**: SSR framework still in alpha. Overkill for SPA.

**Key mapping from Next.js App Router**:
- `layout.tsx` -> `route.tsx` with `<Outlet />`
- `loading.tsx` -> `pendingComponent` on route config
- `error.tsx` -> `errorComponent` on route config
- `[id]` folders -> `$id` folders
- `page.tsx` -> `index.tsx`

## 6. Monorepo Structure

**Decision**: pnpm workspaces + Turborepo + Internal Packages pattern
**Rationale**: Internal Packages pattern eliminates build step for shared packages -- `main` points directly to `.ts` source files. Consuming apps transpile and typecheck them. Turborepo provides dependency-aware task runner with caching. `turbo prune --scope=@repo/api --docker` generates minimal Docker contexts.
**Alternatives considered**:
- **npm workspaces**: Slower, no strict isolation, no built-in caching.
- **Nx**: More complex configuration, steeper learning curve for a 3-app monorepo.
- **TypeScript project references**: Turborepo's Internal Packages pattern makes these unnecessary for Vite apps. NestJS may need them since it uses `tsc` directly.

**Critical gotcha**: NestJS compiles with `tsc`, not a bundler. The `api` app may need TypeScript project references OR use `tsup`/`swc` for bundling to handle workspace imports correctly.
