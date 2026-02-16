# Tasks: Full-Stack Migration

**Input**: Design documents from `/specs/032-full-stack-migration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-modules.md, quickstart.md

**Tests**: Phase 10 covers integration and E2E tests per constitution VII.

**Organization**: Tasks grouped by user story. 6 user stories (US1-US6), 10 phases.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Paths use monorepo convention: `apps/api/`, `apps/web/`, `apps/admin/`, `packages/shared/`, `packages/observability/`

---

## Phase 1: Setup (Monorepo Skeleton)

**Purpose**: Create the bare monorepo structure so all workspace packages resolve and compile. No business logic yet.

- [x] T001 Create root monorepo config files: `pnpm-workspace.yaml`, `turbo.json`, `package.json`, `tsconfig.base.json`, `.env.example`, `.gitignore`, `.npmrc`
- [x] T002 [P] Create `packages/shared/` internal package with `package.json` (main: ./src/index.ts), `tsconfig.json`, and `src/index.ts` barrel export
- [x] T003 [P] Create `packages/observability/` internal package with `package.json`, `tsconfig.json`, and `src/index.ts` barrel export
- [x] T004 [P] Scaffold `apps/api/` NestJS app with Fastify adapter: `package.json`, `tsconfig.json`, `nest-cli.json`, `src/main.ts`, `src/app.module.ts`
- [x] T005 [P] Scaffold `apps/web/` Vite + React 19 app: `package.json`, `tsconfig.json`, `vite.config.ts`, `src/main.tsx`, `index.html`
- [x] T006 [P] Scaffold `apps/admin/` Vite + React 19 app: `package.json`, `tsconfig.json`, `vite.config.ts`, `src/main.tsx`, `index.html`
- [x] T007 Configure Turborepo pipeline in `turbo.json` with `dev`, `build`, `lint`, `typecheck`, `test` tasks and dependency graph
- [x] T008 Verify cross-workspace imports: import a type from `@repo/shared` in both `apps/api` and `apps/web`, run `pnpm build` to confirm all workspaces compile

**Checkpoint**: `pnpm install && pnpm build` succeeds. Shared package imports work in all apps.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented. Database connection, auth, common patterns.

**CRITICAL**: No user story work can begin until this phase is complete.

### Database & ORM

- [x] T009 Run `drizzle-kit pull` to introspect existing Supabase schema into `apps/api/src/database/drizzle/schema.ts`
- [x] T010 Add manual Drizzle relation declarations in `apps/api/src/database/drizzle/relations.ts` per data-model.md (all 30 tables)
- [x] T011 Create `apps/api/src/database/database.module.ts` as global NestJS module providing Drizzle client with postgres.js (`prepare: false` for PgBouncer)
- [x] T012 Create soft-delete helper utility in `apps/api/src/database/helpers.ts` (isNotDeleted filter, softDelete update)

### Authentication & Authorization

- [x] T013 Implement Supabase JWT auth guard in `apps/api/src/common/guards/auth.guard.ts` (validate Bearer token, extract user)
- [x] T014 [P] Create `@CurrentUser()` param decorator in `apps/api/src/common/decorators/current-user.decorator.ts`
- [x] T015 [P] Implement admin guard in `apps/api/src/common/guards/admin.guard.ts` (check `is_super_admin` flag)
- [x] T016 [P] Implement project access guard in `apps/api/src/common/guards/project-access.guard.ts` (workspace membership check)
- [x] T017 [P] Implement document access guard in `apps/api/src/common/guards/document-access.guard.ts`
- [x] T018 [P] Implement workflow access guard in `apps/api/src/common/guards/workflow-access.guard.ts`

### Common Infrastructure

- [x] T019 Create Zod validation pipe in `apps/api/src/common/pipes/zod-validation.pipe.ts`
- [x] T020 [P] Create HTTP exception filter in `apps/api/src/common/filters/http-exception.filter.ts`
- [x] T021 [P] Create all-exceptions filter in `apps/api/src/common/filters/all-exceptions.filter.ts`
- [x] T022 [P] Create logging interceptor in `apps/api/src/common/interceptors/logging.interceptor.ts` (request ID, duration, status)
- [x] T023 [P] Create timeout interceptor in `apps/api/src/common/interceptors/timeout.interceptor.ts`
- [x] T024 Configure CORS, global pipes, filters, and interceptors in `apps/api/src/main.ts`
- [x] T025 Implement health check endpoint (`GET /health`) in `apps/api/src/app.controller.ts`

### Shared Schemas (foundation set)

- [x] T026 [P] Create user schemas in `packages/shared/src/schemas/user.schema.ts` (signup, login, profile update, user response)
- [x] T027 [P] Create workspace schemas in `packages/shared/src/schemas/workspace.schema.ts` (create, update, invite, response)
- [x] T028 [P] Create project schemas in `packages/shared/src/schemas/project.schema.ts` (create, update, settings, response)
- [x] T029 [P] Create document schemas in `packages/shared/src/schemas/document.schema.ts` (create, update, share, response, list)
- [x] T030 [P] Create workflow schemas in `packages/shared/src/schemas/workflow.schema.ts` (template create/update, execution create, node config, response)
- [x] T031 [P] Create image-generation schemas in `packages/shared/src/schemas/image-generation.schema.ts` (generate, batch, models, response)
- [x] T032 [P] Create chat schemas in `packages/shared/src/schemas/chat.schema.ts` (message, completion request, stream events)
- [x] T033 [P] Create admin schemas in `packages/shared/src/schemas/admin.schema.ts` (user management, model config, audit log, system config)
- [x] T034 Create barrel exports in `packages/shared/src/schemas/index.ts` and `packages/shared/src/index.ts`

### External Integration Modules

- [x] T035 [P] Create OpenRouter integration module in `apps/api/src/integrations/openrouter/openrouter.module.ts` and `openrouter.service.ts` (chat completions, streaming, embeddings)
- [x] T036 [P] Create fal.ai integration module in `apps/api/src/integrations/fal-ai/fal-ai.module.ts` and `fal-ai.service.ts` (queue-based image generation, polling, all 8 models)
- [x] T037 [P] Create Brevo email integration module in `apps/api/src/integrations/brevo/brevo.module.ts` and `brevo.service.ts` (send_email, invite, password reset)
- [x] T038 [P] Create Cloudflare R2 storage module in `apps/api/src/modules/storage/storage.module.ts` and `storage.service.ts` (upload, delete, presigned URLs via @aws-sdk/client-s3)

### Job Queue Infrastructure

- [x] T039 Configure BullMQ in `apps/api/src/app.module.ts` with Redis connection (`maxRetriesPerRequest: null`, `removeOnComplete`/`removeOnFail`)
- [x] T040 [P] Create Bull Board dashboard module in `apps/api/src/modules/queue-ui/queue-ui.module.ts` for dev/staging at `/admin/queues`

### Frontend Foundation

- [x] T041 Configure TanStack Router with Vite plugin in `apps/web/vite.config.ts` and create root layout `apps/web/src/routes/__root.tsx`
- [x] T042 [P] Set up TanStack Query client in `apps/web/src/lib/query-client.ts`
- [x] T043 [P] Set up Supabase client in `apps/web/src/lib/supabase.ts`
- [x] T044 [P] Create API client (axios) with auth interceptor in `apps/web/src/lib/api.ts`
- [x] T045 [P] Configure react-i18next in `apps/web/src/lib/i18n.ts` and migrate translation files from next-intl format to `apps/web/public/locales/pt-BR/` and `en/`
- [x] T046 [P] Port design tokens to `apps/web/src/lib/design-tokens.ts` and glassmorphism CSS to `apps/web/src/styles/glass.css`
- [x] T047 [P] Initialize shadcn/ui components in `apps/web/src/components/ui/` (button, input, dialog, toast, card, dropdown-menu, command, etc.)
- [x] T048 [P] Set up Zustand stores in `apps/web/src/lib/stores/` (workflowStore, authStore, uiStore)

**Checkpoint**: API boots with Drizzle, auth guard validates JWT, shared schemas compile, frontend shell renders with router. `pnpm dev` starts all services.

---

## Phase 3: User Story 1 - Monorepo Scaffolding & Shared Packages (P1) MVP

**Goal**: Establish the complete monorepo foundation with validated cross-workspace type sharing.

**Independent Test**: `pnpm install` resolves all deps. Import a Zod schema from `@repo/shared` in both apps, compile succeeds. `pnpm build` completes without errors.

> **Note**: This story is largely completed by Phase 1 + Phase 2. The tasks below cover remaining validation and Docker setup.

- [x] T049 [US1] Create `docker-compose.dev.yml` with Redis 7-alpine service for local development
- [x] T050 [US1] Create `docker-compose.yml` for production with multi-stage Dockerfiles for api, web, and admin apps
- [x] T051 [P] [US1] Create `apps/api/Dockerfile` with multi-stage build (node:20-alpine, pnpm fetch, build, prune)
- [x] T052 [P] [US1] Create `apps/web/Dockerfile` with multi-stage build (node:20-alpine, build static assets, nginx serve)
- [x] T053 [P] [US1] Create `apps/admin/Dockerfile` with multi-stage build (same pattern as web)
- [x] T054 [US1] Add Drizzle config file `apps/api/drizzle.config.ts` pointing to DATABASE_URL for `drizzle-kit pull` and `drizzle-kit studio`
- [x] T055 [US1] Validate end-to-end: run `pnpm install`, import shared schema in both apps, run `pnpm build`, verify Docker images build successfully

**Checkpoint**: Monorepo fully operational. Docker images build. Shared types flow from packages/shared to both apps.

---

## Phase 4: User Story 2 - Backend Migration: Core API (P1)

**Goal**: Rewrite all 171 API endpoints across 23 NestJS modules with identical request/response contracts.

**Independent Test**: Run the existing Next.js frontend against the new NestJS backend. All API calls return identical responses.

### Auth & User Management (5 endpoints)

- [x] T056 [US2] Implement auth module: `apps/api/src/modules/auth/auth.module.ts`, `auth.controller.ts`, `auth.service.ts` (signup, login, password reset request/confirm, me)
- [x] T057 [US2] Implement rate limiting on password reset with `@nestjs/throttler` (5/min) in auth controller

### Workspaces (3 endpoints)

- [x] T058 [US2] Implement workspaces module: `apps/api/src/modules/workspaces/workspaces.module.ts`, `workspaces.controller.ts`, `workspaces.service.ts` (get workspace, invite user, accept invite)

### Projects (7 endpoints)

- [x] T059 [US2] Implement projects module: `apps/api/src/modules/projects/projects.module.ts`, `projects.controller.ts`, `projects.service.ts` (list, create, get, update, delete/soft-delete, restore, bootstrap)

### Documents (18 endpoints)

- [x] T060 [US2] Implement documents module: `apps/api/src/modules/documents/documents.module.ts`, `documents.controller.ts`, `documents.service.ts` (full CRUD, sharing, variations, refinement, export, version history, move, batch operations)

### Chat (9 endpoints)

- [x] T061 [US2] Implement chat module: `apps/api/src/modules/chat/chat.module.ts`, `chat.controller.ts`, `chat.service.ts` (conversations CRUD, completion stream SSE, models list, tool approval)
- [x] T062 [US2] Implement SSE streaming for chat completions in `chat.controller.ts` using `@Sse()` decorator with event types: content, tool_call, tool_approval_required, tool_result, memory_update, error, done

### Workflows & Executions (17 endpoints)

- [x] T063 [US2] Implement workflows module: `apps/api/src/modules/workflows/workflows.module.ts`, `workflows.controller.ts`, `workflows.service.ts` (CRUD, duplicate, system templates)
- [x] T064 [US2] Implement project-workflows module: `apps/api/src/modules/project-workflows/project-workflows.module.ts`, `project-workflows.controller.ts` (list by project, create for project)
- [x] T065 [US2] Implement executions module: `apps/api/src/modules/executions/executions.module.ts`, `executions.controller.ts`, `executions.service.ts` (create, get, list, cancel, delete, outputs)
- [x] T066 [US2] Implement node executor service in `apps/api/src/modules/executions/node-executor.service.ts` (8 node types: start, text_generation, image_generation, processing, context_retrieval, conditional, loop, finish)
- [x] T067 [US2] Implement variable resolver service in `apps/api/src/modules/executions/variable-resolver.service.ts` (`{{nodeId.field}}` syntax resolution)
- [x] T068 [US2] Implement SSE streaming for workflow execution in `executions.controller.ts` (token-based auth via query param, progress/node_complete/error/complete events)
- [x] T069 [US2] Create workflow execution BullMQ processor in `apps/api/src/modules/executions/execution.processor.ts` with queue `workflow-execution` (concurrency: 2, retry with exponential backoff)

### Image Generation (14 endpoints)

- [x] T070 [US2] Implement image-generation module: `apps/api/src/modules/image-generation/image-generation.module.ts`, `image-generation.controller.ts`, `image-generation.service.ts` (generate single, batch, variations, edit, inpaint, remove-bg, upscale, enhance, models list)
- [x] T071 [US2] Create image-generation BullMQ processor in `apps/api/src/modules/image-generation/image-generation.processor.ts` with queue `image-generation` (concurrency: 3)
- [x] T072 [US2] Implement SSE streaming for batch image generation in `image-generation.controller.ts` (progress, image_complete, image_failed, batch_complete events via Redis pub/sub)
- [x] T073 [US2] Implement prompt enrichment service in `apps/api/src/modules/image-generation/prompt-enrichment.service.ts` (brand context integration, fallback template)

### Templates (7 endpoints)

- [x] T074 [US2] Implement templates module: `apps/api/src/modules/templates/templates.module.ts`, `templates.controller.ts`, `templates.service.ts` (list, get, create, update, delete, system templates, featured)

### Memories (7 endpoints)

- [x] T075 [US2] Implement memories module: `apps/api/src/modules/memories/memories.module.ts`, `memories.controller.ts`, `memories.service.ts` (list, get, create, update, delete, search with pgvector cosine similarity, extract facts from conversation)
- [x] T076 [US2] Create memory extraction BullMQ processor in `apps/api/src/modules/memories/memory.processor.ts` with queue `memory-extraction` (concurrency: 2)

### Visual Assets (15 endpoints)

- [x] T077 [US2] Implement visual-assets module: `apps/api/src/modules/visual-assets/visual-assets.module.ts`, `visual-assets.controller.ts`, `visual-assets.service.ts` (upload, list, get, update, delete, classify, metadata update, visual context settings, selections, context resolution, usage tracking)

### Copies & Campaigns (10 endpoints)

- [x] T078 [P] [US2] Implement copies module: `apps/api/src/modules/copies/copies.module.ts`, `copies.controller.ts`, `copies.service.ts` (CRUD for copy library items, workspace-scoped)
- [x] T079 [P] [US2] Implement campaigns module: `apps/api/src/modules/campaigns/campaigns.module.ts`, `campaigns.controller.ts`, `campaigns.service.ts` (CRUD for campaign packages, project-scoped)

### Supporting Modules (16 endpoints)

- [x] T080 [P] [US2] Implement models module: `apps/api/src/modules/models/models.module.ts`, `models.controller.ts`, `models.service.ts` (list text/image models from OpenRouter, model config service with caching)
- [x] T081 [P] [US2] Implement AI usage module: `apps/api/src/modules/ai-usage/ai-usage.module.ts`, `ai-usage.controller.ts`, `ai-usage.service.ts` (usage stats, logs, costs by user/model)
- [x] T082 [P] [US2] Implement activity module: `apps/api/src/modules/activity/activity.module.ts`, `activity.controller.ts`, `activity.service.ts` (activity log CRUD)
- [x] T083 [P] [US2] Implement conversations module: `apps/api/src/modules/conversations/conversations.module.ts`, `conversations.controller.ts` (list/delete conversations)
- [x] T084 [P] [US2] Implement prompts module: `apps/api/src/modules/prompts/prompts.module.ts`, `prompts.controller.ts` (prompt enrichment endpoint)
- [x] T085 [P] [US2] Implement validation module: `apps/api/src/modules/validation/validation.module.ts`, `validation.controller.ts` (validate project name, email, workspace name, document title)
- [x] T086 [P] [US2] Implement system module: `apps/api/src/modules/system/system.module.ts`, `system.controller.ts` (system messages endpoint)

### Admin Module (31 endpoints)

- [x] T087 [US2] Implement admin module: `apps/api/src/modules/admin/admin.module.ts`, `admin.controller.ts`, `admin.service.ts` (dashboard stats, user management, workspace management, model config, system settings, audit log, system messages, memory management)

### Usage Logging Queue

- [x] T088 [US2] Create usage logging BullMQ processor in `apps/api/src/modules/ai-usage/usage-logging.processor.ts` with queue `usage-logging` (concurrency: 10, fire-and-forget)

### Email Queue

- [x] T089 [US2] Create email sending BullMQ processor in `apps/api/src/integrations/brevo/email.processor.ts` with queue `email-sending` (concurrency: 5, retry: 3 attempts)

### Register All Modules

- [x] T090 [US2] Register all modules in `apps/api/src/app.module.ts` with proper imports, global modules (database, storage, openrouter), and BullMQ queue registrations
- [x] T160 [US2] Configure `@nestjs/throttler` rate limits on AI-intensive endpoints: chat completion (20/min per user), image generation (10/min per user), workflow execution (5/min per user) via `@Throttle()` decorator

### API Verification

- [ ] T091 [US2] Verify all 171 endpoints respond correctly: start both old and new backends, compare responses for key endpoints across all modules (auth, projects, documents, workflows, chat, image generation)

**Checkpoint**: New NestJS backend is API-compatible with the current FastAPI backend. Existing frontend can connect to it without changes.

---

## Phase 5: User Story 6 - Data Continuity & Zero-Downtime Migration (P1)

**Goal**: Ensure the new backend reads and writes existing data identically. Create cutover validation scripts.

**Independent Test**: Compare record counts, run key queries, verify file URLs resolve, confirm all user data accessible via new backend.

- [ ] T092 [US6] Create data validation script in `apps/api/scripts/validate-data.ts` that compares record counts across all 30 tables between old and new backend queries
- [ ] T093 [US6] Create cutover checklist document in `specs/032-full-stack-migration/cutover-checklist.md` (stop old system, verify no in-flight jobs, run validation, start new system, verify health, monitor logs)
- [ ] T094 [US6] Verify JSONB field parsing: confirm all JSONB columns (generation_metadata, nodes_json, execution_context, messages_json, etc.) read correctly through Drizzle
- [ ] T095 [US6] Verify pgvector operations: confirm `user_memories` embedding search via `cosineDistance()` returns identical results to current SQLAlchemy implementation
- [ ] T096 [US6] Verify `celery_task_id` column in `workflow_executions` is gracefully handled (read-only, not used by new BullMQ system)
- [ ] T097 [US6] Verify R2 storage URLs: confirm all file_url and thumbnail_url values in documents table resolve correctly through the new backend
- [ ] T159 [US6] Verify RLS policies: test frontend Supabase client direct table access with user JWT for key tables (documents, projects, workflow_templates, chat_conversations, user_memories), confirm row-level filtering matches current behavior

**Checkpoint**: Data validation script passes. All existing records accessible through new backend. RLS policies verified. Cutover procedure documented.

---

## Phase 6: User Story 3 - Frontend Migration: App Shell & Routing (P2)

**Goal**: Rebuild all 36+ frontend routes with identical UX using React 19 + Vite + TanStack Router.

**Independent Test**: Navigate every route, perform key flows (login, create project, generate image, run workflow), visually compare with current app.

### App Shell & Auth

- [x] T098 [US3] Create root layout in `apps/web/src/routes/__root.tsx` with Supabase auth context, TanStack Query provider, i18n provider, and Toaster
- [x] T099 [US3] Create login page in `apps/web/src/routes/login.tsx` with Supabase auth (email/password)
- [x] T100 [US3] Create signup page in `apps/web/src/routes/signup.tsx`
- [x] T101 [US3] Create index route `apps/web/src/routes/index.tsx` (redirect to workspace or login)

### Workspace Routes

- [x] T102 [US3] Create workspace layout in `apps/web/src/routes/workspace/$id/route.tsx` with sidebar navigation (projects, workflows, templates, settings, profile)
- [x] T103 [US3] Create workspace dashboard in `apps/web/src/routes/workspace/$id/index.tsx`
- [x] T104 [P] [US3] Create workspace settings page in `apps/web/src/routes/workspace/$id/settings.tsx`
- [x] T105 [P] [US3] Create profile page in `apps/web/src/routes/workspace/$id/profile.tsx`
- [x] T106 [P] [US3] Create AI usage page in `apps/web/src/routes/workspace/$id/ai-usage.tsx`
- [x] T107 [P] [US3] Create templates listing page in `apps/web/src/routes/workspace/$id/templates.tsx`

### Project Routes

- [x] T108 [US3] Create project layout in `apps/web/src/routes/workspace/$id/project/$projectId/route.tsx` with project-level navigation
- [x] T109 [US3] Create project overview page in `apps/web/src/routes/workspace/$id/project/$projectId/index.tsx`
- [x] T110 [P] [US3] Create project settings page in `apps/web/src/routes/workspace/$id/project/$projectId/settings/index.tsx`
- [ ] T111 [P] [US3] Create visual context settings page in `apps/web/src/routes/workspace/$id/project/$projectId/settings/visual-context.tsx`

### Image Studio

- [ ] T112 [US3] Port Image Studio to `apps/web/src/routes/workspace/$id/project/$projectId/studio/index.tsx` with all generation modes (text-to-image, image-to-image, edit, inpaint, remove-bg, upscale, enhance)
- [ ] T113 [US3] Port ConceptSelector component to `apps/web/src/features/image-studio/ConceptSelector.tsx` (88 creative concepts grid with search and selection)
- [ ] T114 [US3] Port BrushCanvas component to `apps/web/src/features/image-studio/BrushCanvas.tsx` (HTML5 Canvas for mask painting)
- [ ] T115 [US3] Port GenerationSummary component to `apps/web/src/features/image-studio/GenerationSummary.tsx`
- [ ] T116 [US3] Port all image studio hooks: `useImageStudio`, `useCreativePromptGenerator`, `useVisualAssets` to `apps/web/src/hooks/`

### Workflow Builder

- [ ] T117 [US3] Port WorkflowCanvas component to `apps/web/src/features/workflow/WorkflowCanvas.tsx` using ReactFlow (nodes, edges, drag-and-drop)
- [ ] T118 [US3] Port NodeConfigPanel to `apps/web/src/features/workflow/NodeConfigPanel.tsx` (8 node types with unique configuration)
- [ ] T119 [US3] Port VariableAutocomplete to `apps/web/src/features/workflow/VariableAutocomplete.tsx` (`{{nodeId.field}}` syntax)
- [ ] T120 [US3] Port workflow execution viewer to `apps/web/src/features/workflow/ExecutionViewer.tsx` with SSE streaming progress
- [ ] T121 [US3] Create workflow routes: `apps/web/src/routes/workspace/$id/project/$projectId/workflows/index.tsx`, `new.tsx`, `$workflowId.tsx`
- [ ] T122 [US3] Create workspace-level workflow routes: `apps/web/src/routes/workspace/$id/workflows/index.tsx`, `templates.tsx`, `executions/$executionId.tsx`

### Chat

- [ ] T123 [US3] Port Chat component to `apps/web/src/features/chat/ChatPanel.tsx` with SSE streaming, tool approval UI, document context selection
- [ ] T124 [US3] Port chat hooks: `useChat`, `useChatStream` to `apps/web/src/hooks/` with SSE event parsing

### Copy Library & Campaigns

- [ ] T125 [P] [US3] Port copy library feature to `apps/web/src/features/copy-library/CopyLibrary.tsx` (list, create, edit, delete workspace-scoped copies)
- [ ] T126 [P] [US3] Port campaigns feature to `apps/web/src/features/campaigns/Campaigns.tsx` (campaign packages, create, manage)

### Shared Components

- [ ] T127 [US3] Port all shared UI components from current frontend to `apps/web/src/components/` (sidebar, command palette, breadcrumbs, document list, folder tree, rich text editor, etc.)
- [ ] T128 [US3] Port design system: Ethereal Blue + Liquid Glass theme to Tailwind CSS v4 config in `apps/web/tailwind.config.ts` and `apps/web/src/styles/glass.css`

### Public Routes

- [ ] T129 [US3] Create shared document route in `apps/web/src/routes/shared/$token.tsx` (public document sharing without auth)

**Checkpoint**: All 36+ routes render with identical layout and functionality. Key user flows work end-to-end (login, create project, generate image, run workflow, manage copies).

---

## Phase 7: User Story 4 - Observability & Monitoring (P2)

**Goal**: Structured logging, distributed tracing, and error tracking across all layers.

**Independent Test**: Trigger API requests and verify structured JSON logs with correlation IDs. Trigger errors and verify Sentry captures them with full context.

### Observability Package

- [ ] T130 [US4] Implement Pino logger wrapper in `packages/observability/src/logger.ts` (structured JSON, log levels, child loggers with context)
- [ ] T131 [P] [US4] Implement OpenTelemetry tracer setup in `packages/observability/src/tracer.ts` (HTTP instrumentation, Drizzle instrumentation, BullMQ spans)
- [ ] T132 [P] [US4] Implement Sentry integration in `packages/observability/src/sentry.ts` (error capture, performance monitoring, user context)
- [ ] T133 [P] [US4] Implement request correlation ID utility in `packages/observability/src/correlation.ts` (generate/propagate X-Request-ID)
- [ ] T134 [US4] Create barrel export in `packages/observability/src/index.ts`

### Backend Integration

- [ ] T135 [US4] Integrate Pino logger into NestJS via custom LoggerService in `apps/api/src/modules/observability/observability.module.ts`
- [ ] T136 [US4] Update logging interceptor in `apps/api/src/common/interceptors/logging.interceptor.ts` to emit structured JSON with request ID, user ID, duration, status
- [ ] T137 [US4] Add OpenTelemetry initialization to `apps/api/src/main.ts` (must run before NestJS bootstrap)
- [ ] T138 [US4] Add Sentry NestJS integration via `@sentry/nestjs` in `apps/api/src/main.ts` and exception filters

### Frontend Integration

- [ ] T139 [US4] Add Sentry browser SDK to `apps/web/src/main.tsx` for client-side error capture with session context
- [ ] T140 [US4] Add error boundary component in `apps/web/src/components/ErrorBoundary.tsx` that reports to Sentry

**Checkpoint**: Every API request generates structured JSON log with correlation ID. Errors captured in Sentry within 5 seconds. OpenTelemetry traces visible for request lifecycle.

---

## Phase 8: User Story 5 - Admin Dashboard Migration (P3)

**Goal**: Migrate admin dashboard as a separate Vite app with all 31 admin endpoints functional.

**Independent Test**: Login as admin, navigate all sections (users, models, settings, messages, workspaces, memory), perform CRUD operations, verify audit log entries.

### Admin App Setup

- [ ] T141 [US5] Configure TanStack Router in `apps/admin/vite.config.ts` and create root layout `apps/admin/src/routes/__root.tsx` with admin auth check
- [ ] T142 [US5] Create admin dashboard overview in `apps/admin/src/routes/index.tsx` (system stats: users, workspaces, projects, documents, conversations)

### Admin Routes

- [ ] T143 [P] [US5] Create user management pages: `apps/admin/src/routes/users/index.tsx` (list with search, block/unblock) and `apps/admin/src/routes/users/$id.tsx` (user detail, role management)
- [ ] T144 [P] [US5] Create model configuration page: `apps/admin/src/routes/models.tsx` (default models, fallback models, visible text/image models)
- [ ] T145 [P] [US5] Create system settings page: `apps/admin/src/routes/settings.tsx` (system_config CRUD)
- [ ] T146 [P] [US5] Create system messages page: `apps/admin/src/routes/messages.tsx` (maintenance/announcement/warning/info messages CRUD)
- [ ] T147 [P] [US5] Create workspace management pages: `apps/admin/src/routes/workspaces/index.tsx` and `$id.tsx` (list, transfer ownership, delete)
- [ ] T148 [P] [US5] Create memory management page: `apps/admin/src/routes/memory.tsx` (user memories search, view, delete)

### Admin Shared Components

- [ ] T149 [US5] Port admin design system components to `apps/admin/src/components/` (data tables, stat cards, audit log viewer, configuration forms)

**Checkpoint**: Admin dashboard fully functional. All 31 admin endpoints accessible. Audit log records all admin actions.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories. Deployment preparation.

- [ ] T150 [P] Configure `X-Accel-Buffering: no` header on all SSE endpoints for reverse proxy compatibility
- [ ] T151 [P] Add OpenAPI/Swagger documentation via `@nestjs/swagger` in `apps/api/src/main.ts` (available at `/api/docs`)
- [ ] T152 Verify all 3 SSE streams work end-to-end: chat completion, workflow execution, batch image generation
- [ ] T153 [P] Create asset classification BullMQ processor in `apps/api/src/modules/visual-assets/asset-classification.processor.ts` with queue `asset-classification` (concurrency: 2)
- [ ] T154 Verify Docker Compose production setup: build all images, start with `docker-compose up`, verify health checks, test key flows
- [ ] T155 [P] Update `.env.example` with all required environment variables (see quickstart.md section 2)
- [ ] T156 Validate quickstart.md: fresh clone, follow all steps, verify local dev environment works within 15 minutes
- [ ] T157 Run full cross-story validation: login, create workspace, create project, generate images, run workflow, chat, manage copies, admin operations
- [ ] T158 Performance spot-check: compare API response times of key endpoints (list documents, generate image, chat completion) between old and new backends

---

## Phase 10: Testing (Constitution VII Compliance)

**Purpose**: Integration and E2E tests for critical user journeys per constitution mandate.

**Independent Test**: `pnpm test` at root runs all test suites. All pass.

### Backend Tests

- [ ] T161 [P] Create Vitest unit tests for auth service in `apps/api/test/unit/auth.service.spec.ts` (signup, login, JWT validation, password reset)
- [ ] T162 [P] Create Vitest unit tests for documents service in `apps/api/test/unit/documents.service.spec.ts` (CRUD, sharing, soft-delete)
- [ ] T163 [P] Create Vitest unit tests for workflow executor in `apps/api/test/unit/node-executor.service.spec.ts` (8 node types, variable resolution)
- [ ] T164 Create integration tests for critical API flows in `apps/api/test/integration/` (auth flow, document CRUD, chat completion, image generation request, workflow execution)

### E2E Tests

- [ ] T165 Configure Playwright in `apps/web/playwright.config.ts` and create E2E test suite for critical flows: login, create project, generate image, run workflow, manage copies
- [ ] T166 Verify all tests pass in CI-compatible mode: `pnpm test` at root runs Vitest + Playwright successfully

**Checkpoint**: Unit tests cover auth, documents, workflow execution. Integration tests cover critical API flows. E2E tests cover login → project → image generation → workflow execution.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion - BLOCKS all user stories
- **Phase 3 (US1 - Monorepo)**: Depends on Phase 1 + Phase 2
- **Phase 4 (US2 - Backend)**: Depends on Phase 2
- **Phase 5 (US6 - Data Continuity)**: Depends on Phase 4 (needs working backend)
- **Phase 6 (US3 - Frontend)**: Depends on Phase 4 (needs working backend API)
- **Phase 7 (US4 - Observability)**: Can start after Phase 2, but best after Phase 4
- **Phase 8 (US5 - Admin)**: Depends on Phase 4 (needs admin API endpoints)
- **Phase 9 (Polish)**: Depends on Phases 3-8
- **Phase 10 (Testing)**: Depends on Phases 4, 6, 8 (needs working backend + frontend + admin)

### User Story Dependencies

```
US1 (Monorepo) ──────> Phase 2 (no other story deps)
US2 (Backend API) ───> Phase 2 (no other story deps)
US6 (Data Continuity) > US2 (needs working backend)
US3 (Frontend) ──────> US2 (needs API to call)
US4 (Observability) ──> Phase 2 (independent, but integrate into US2/US3)
US5 (Admin) ─────────> US2 (needs admin API endpoints)
```

### Critical Path

```
Phase 1 → Phase 2 → Phase 4 (US2) → Phase 5 (US6) → Phase 6 (US3) → Phase 9 → Phase 10
                  └→ Phase 3 (US1) ─────────────────────────────────→ Phase 9
                  └→ Phase 7 (US4) ─────────────────────────────────→ Phase 9
                  └→ Phase 8 (US5, after US2) ──────────────────────→ Phase 9 → Phase 10
```

### Parallel Opportunities

**After Phase 2 completes:**
- US1 (Monorepo/Docker) can run in parallel with US2 (Backend)
- US4 (Observability package) can start in parallel with US2

**After Phase 4 (US2) completes:**
- US3 (Frontend), US5 (Admin), US6 (Data Continuity) can all start in parallel

**Within Phase 4 (US2):**
- T078-T079 (Copies + Campaigns) are parallel
- T080-T086 (Supporting modules) are all parallel with each other
- All integration modules (T035-T038) are parallel

---

## Parallel Example: Phase 4 Backend Modules

```bash
# These module implementations are independent and can run in parallel:
Task: T078 [P] [US2] Implement copies module
Task: T079 [P] [US2] Implement campaigns module
Task: T080 [P] [US2] Implement models module
Task: T081 [P] [US2] Implement AI usage module
Task: T082 [P] [US2] Implement activity module
Task: T083 [P] [US2] Implement conversations module
Task: T084 [P] [US2] Implement prompts module
Task: T085 [P] [US2] Implement validation module
Task: T086 [P] [US2] Implement system module
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US6)

1. Complete Phase 1: Setup (monorepo skeleton)
2. Complete Phase 2: Foundational (database, auth, schemas, integrations)
3. Complete Phase 3: US1 (Docker, validation)
4. Complete Phase 4: US2 (all 171 API endpoints)
5. Complete Phase 5: US6 (data validation, cutover prep)
6. **STOP and VALIDATE**: Run existing frontend against new backend. All API calls identical.

### Incremental Delivery

1. Setup + Foundational → Monorepo compiles, shared types work
2. US1 (Monorepo) → Docker images build, dev environment works
3. US2 (Backend) → All 171 endpoints work → can test with existing frontend
4. US6 (Data Continuity) → Data validation passes → cutover procedure ready
5. US3 (Frontend) → New frontend works → full system replacement ready
6. US4 (Observability) → Structured logs, tracing, error tracking active
7. US5 (Admin) → Admin dashboard migrated
8. Polish → SSE verification, performance check, deployment validation

### Suggested MVP Scope

**US1 + US2 + US6** (Phases 1-5): This gives a fully functional new backend that the existing frontend can use, with validated data continuity. The frontend migration (US3) and admin dashboard (US5) can follow incrementally.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in same phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate
- The 171 endpoint count comes from contracts/api-modules.md analysis
- The 30 table count comes from data-model.md complete inventory
