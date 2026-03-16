# xtyl-creativity-machine Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-28

## Active Technologies
- Python 3.11 (Backend), TypeScript 5.x (Frontend) + FastAPI, SQLAlchemy, Next.js 14, React 18, Shadcn/UI (009-project-settings)
- Supabase PostgreSQL (extends existing Project model) (009-project-settings)
- Python 3.11 (Backend), TypeScript 5.x (Frontend) + FastAPI, SQLAlchemy, Next.js 14, React 18, Shadcn/UI, Radix UI (010-system-bugfixes)
- Supabase PostgreSQL (existing tables: ChatConversation, Document, ActivityLog, Project, User) (010-system-bugfixes)
- Supabase PostgreSQL (extends existing Project/Document models), Cloudflare R2 (011-smart-visual-assets)
- TypeScript 5.x (Frontend only) + @tanstack/react-query 5.x, zustand 5.x, Next.js 16 (App Router) (013-sidebar-cache)
- localStorage (browser) for cache persistence (013-sidebar-cache)
- TypeScript 5.x (Frontend only) + React 18, Radix UI (AlertDialog, Toast), Framer Motion (014-custom-alerts)
- N/A (frontend-only, no data persistence) (014-custom-alerts)
- Python 3.11 (Backend), TypeScript 5.x (Frontend) + FastAPI, SQLAlchemy, Pydantic (Backend); Next.js 14, React 18, Shadcn/UI, Tailwind CSS (Frontend) (015-admin-panel)
- Supabase PostgreSQL with pgvector extension; JSONB for flexible configurations (015-admin-panel)
- Python 3.11 (Backend), TypeScript 5.x (Frontend) + FastAPI, SQLAlchemy, Next.js 14, React 18, Shadcn/UI, Framer Motion (016-v1-polish)
- Supabase PostgreSQL, Cloudflare R2 (images) (016-v1-polish)
- Python 3.11 (Backend), TypeScript 5.x (Frontend) + pytest, pytest-asyncio, pytest-cov, httpx (Backend); Vitest, @testing-library/react, msw (Frontend) (017-automated-testing)
- PostgreSQL (test database with transaction rollback isolation) (017-automated-testing)
- Supabase PostgreSQL (existing system_config table) (018-admin-model-visibility)
- Python 3.11 (Backend migration script) + Alembic (database migrations), SQLAlchemy (ORM), uuid (deterministic ID generation) (019-default-templates)
- PostgreSQL (Supabase) - tables: `templates`, `workflow_templates` (019-default-templates)
- Python 3.11 (Backend), TypeScript 5.x (Frontend) + FastAPI, SQLAlchemy, Next.js 14, React 18, Shadcn/UI, Supabase (direct client) (020-project-delete)
- Supabase PostgreSQL (existing Project, Document, Folder, WorkflowTemplate, WorkflowExecution tables) (020-project-delete)
- Python 3.11 (Backend), TypeScript 5.x (Frontend) + FastAPI, SQLAlchemy (Backend); Next.js 14, React 18, Shadcn/UI, Framer Motion (Frontend) (021-voice-input-assistant)
- N/A (audio is processed in memory, not persisted) (021-voice-input-assistant)
- Python 3.11 (Backend), TypeScript 5.x (Frontend) + FastAPI, SQLAlchemy, pgvector, Next.js 14, React 18, Shadcn/UI, Framer Motion (024-user-memory)
- PostgreSQL (Supabase) with pgvector extension for embeddings (024-user-memory)
- Python 3.11 (Backend), TypeScript 5.x (Frontend) + FastAPI, SQLAlchemy, Next.js 14, React 18, Shadcn/UI, pgvector (024-user-memory)
- Supabase PostgreSQL with pgvector extension, Cloudflare R2 (024-user-memory)
- Python 3.11 (Backend), TypeScript 5.x (Frontend) + FastAPI, SQLAlchemy, OpenRouter API (Backend); Next.js 14, React 18, Shadcn/UI (Frontend) (026-smart-image-generation)
- Supabase PostgreSQL (system_config table for global settings), Cloudflare R2 (images) (026-smart-image-generation)
- Python 3.11 (Backend), TypeScript 5.x (Frontend) + FastAPI, SQLAlchemy, Next.js 14, React 18, Shadcn/UI, React Query (028-image-architecture-refactor)
- PostgreSQL (Supabase) + Cloudflare R2 (arquivos de imagem) (028-image-architecture-refactor)
- Python 3.11 (Backend), TypeScript 5.x (Frontend) + FastAPI, SQLAlchemy, Next.js 14, React 18, Shadcn/UI, React Query, Canvas API (brush) (028-image-architecture-refactor)
- PostgreSQL (Supabase) with pgvector, Cloudflare R2 (images, masks) (028-image-architecture-refactor)
- Python 3.11 (Backend), TypeScript 5.x (Frontend) + FastAPI, SQLAlchemy, httpx, tenacity (Backend); Next.js 14, React 18, Shadcn/UI, HTML5 Canvas API (Frontend) (029-fal-ai-migration)
- Supabase PostgreSQL + Cloudflare R2 (images/masks) (029-fal-ai-migration)
- Python 3.11 (Backend), TypeScript 5.x (Frontend) + FastAPI, SQLAlchemy, Pydantic (Backend); Next.js 14, React 18, Shadcn/UI (Frontend) (031-creative-concepts-migration)
- Supabase PostgreSQL, Cloudflare R2 (thumbnails) (031-creative-concepts-migration)
- TypeScript 5.7 (all apps and packages) (032-full-stack-migration)
- Supabase PostgreSQL 16 (existing, no schema changes) + Cloudflare R2 (S3-compatible, existing) + Redis 7.x (cache + BullMQ) (032-full-stack-migration)
- TypeScript 5.7 (NestJS 10 backend + Vite/React 19 frontend) + BullMQ (job processor), fal.ai SDK, NestJS, TanStack Query, Framer Motion (033-studio-image-quality-improvements)
- Supabase PostgreSQL — no schema changes needed (033-studio-image-quality-improvements)

### Core Stack (Post-Migration 032)
- **Runtime**: **Bun 1.x** (3-4x faster than Node.js, native TypeScript)
- **Backend**: NestJS 10 + Fastify, Drizzle ORM, TypeScript 5.7
- **Frontend**: Vite 6 + React 19, TanStack Router/Query, Shadcn/UI, Tailwind CSS 4, Framer Motion
- **Database**: Supabase PostgreSQL 16 with pgvector extension
- **Authentication**: Supabase Auth (JWT)
- **Storage**: Cloudflare R2 (S3-compatible)
- **Cache/Queue**: Redis 7.x + BullMQ
- **Monorepo**: Turborepo 2.x + Bun workspaces
- **Architecture**: Hybrid (API for complex ops, direct Supabase for CRUD)

**Note**: Migrated from Python/FastAPI to TypeScript/NestJS + Bun for unified language and massive performance gains.

## Design System

### **Ethereal Blue + Liquid Glass (2025)**

#### Color Palette
- **Primary Accent**: #5B8DEF (Ethereal Blue)
- **Secondary Accent**: #4A7AD9 (Darker Blue)
- **Tertiary Accent**: #7AA5F5 (Lighter Blue)
- **Background (Light)**: Gradient from blue-50 via indigo-50 to purple-50
- **Background (Dark)**: #0A0E14 with animated gradient orbs

#### Design Principles
1. **Glassmorphism**: All cards, modals, and containers use backdrop-blur (24px-32px) with semi-transparent backgrounds
2. **Liquid Glass**: Inspired by Apple's 2025 design language with translucent surfaces and depth layering
3. **Soft Corners**: Border radius 8px-16px (no sharp 4px corners)
4. **Microanimations**: Framer Motion powered smooth transitions and hover effects
5. **Depth & Layering**: Multiple shadow layers to create 3D depth effect
6. **Professional Blue**: Replaced green (#10B981) with blue (#5B8DEF) for trust and professionalism

#### Typography
- **Headings**: Font-weight 600-700, tracking-tight
- **Body**: Font-weight 400-500
- **Scale**: h1(32px), h2(24px), h3(20px), h4(16px), body(14px), small(12px)

#### Components
- **Buttons**: Primary (solid blue), Secondary (outline blue), Ghost (transparent)
- **Cards**: Glass effect with backdrop-blur-2xl, soft shadows, gradient overlay
- **Inputs**: Translucent with glass borders, focus states in accent blue
- **Sidebar**: macOS style with rounded pills, active state filled
- **Command Palette**: Raycast-inspired with intense glassmorphism

#### Spacing & Layout
- Generous padding (p-6 standard for cards)
- Spacing scale: xs(4px), sm(8px), md(16px), lg(24px), xl(32px), 2xl(48px), 3xl(64px)

## Project Structure

```text
frontend/
  src/
    lib/design-tokens.ts         # Centralized design tokens
    styles/glass.css             # Glassmorphism utilities
    components/ui/               # Shadcn/UI components (customized)

backend/
  routers/                       # FastAPI route handlers
  services/                      # Business logic services
  models.py                      # SQLAlchemy models
  schemas.py                     # Pydantic schemas

supabase/
  migrations/                    # SQL migration files (001-031+)
  functions/                     # Supabase Edge Functions
  seeds/                         # Seed data for templates
  schema.sql                     # Full database schema
```

## Commands

```bash
# Development (uses Turborepo)
bun run dev       # Start all services (API + Web + Admin)
bun run build     # Build all apps and packages
bun run typecheck # Typecheck all workspaces
bun test          # Run tests

# Individual apps
cd apps/api && bun --bun nest start --watch  # NestJS API
cd apps/web && bun run dev                   # Web app (Vite)
cd apps/admin && bun run dev                 # Admin app (Vite)

# Docker
docker-compose -f docker-compose.dev.yml up  # Dev services (Redis)
docker-compose up -d                          # Full production stack
```

## Code Style

TypeScript 5.x (Frontend), Node.js 20+ (Build tools): Follow standard conventions

**Design System Style**:
- Use design tokens from `@/lib/design-tokens`
- Apply glass effects via Tailwind utilities or inline styles
- Maintain accessibility (WCAG AA) with proper contrast ratios
- Use Framer Motion for all animations
- Follow mobile-first responsive design

## Recent Changes
- 033-studio-image-quality-improvements: Added TypeScript 5.7 (NestJS 10 backend + Vite/React 19 frontend) + BullMQ (job processor), fal.ai SDK, NestJS, TanStack Query, Framer Motion
- 032-full-stack-migration: **MIGRATED TO BUN** 🚀 - 10x faster installs, 3-4x faster runtime, native TypeScript
- 032-full-stack-migration: Added TypeScript 5.7 monorepo (NestJS backend + Vite frontend + Turborepo)

## Bun Migration (2026-02-16)
**CRITICAL**: This project uses **Bun** instead of Node.js/npm/pnpm.

### Why Bun?
- **10x faster installs** (~4s vs ~45s with pnpm)
- **3-4x faster runtime** (native performance)
- **Native TypeScript** (no compilation needed)
- **100% Node.js compatible** (drop-in replacement)

### Key Files
- `bunfig.toml` - Workspace configuration (replaces `pnpm-workspace.yaml`)
- `bun.lockb` - Lock file (binary, faster than `pnpm-lock.yaml`)
- `migrate-to-bun.sh` - Automated migration script
- `BUN_MIGRATION.md` - Full migration guide

### Usage
```bash
# First time
curl -fsSL https://bun.sh/install | bash
bun install

# Daily dev
bun run dev    # Start all services
bun run build  # Build all apps
bun test       # Run tests
```

See [BUN_MIGRATION.md](./BUN_MIGRATION.md) for details.


<!-- MANUAL ADDITIONS START -->

## Core Principles

### No Hardcoded Data
**CRITICAL**: Never hardcode lists of models, providers, or similar dynamic data. Always fetch from the appropriate API:
- **Text models**: Use `/chat/models` endpoint
- **Image models**: Use `/image-generation/models` endpoint
- The backend filters models by capability (e.g., `output_modalities` contains "image")
- Display exactly what the API returns - no client-side filtering or hardcoded fallbacks

### API Integration (OpenRouter)
- All LLM/Image generation goes through OpenRouter API
- API key: `OPENROUTER_API_KEY` in `.env` file
- Backend must load dotenv FIRST before any imports in `main.py`
- Use dynamic `get_api_key()` functions, not module-level variables
- Required headers: `Authorization`, `HTTP-Referer`, `X-Title`

## Workflow System Architecture

### Node Types
| Type | Purpose | Outputs |
|------|---------|---------|
| `start` | Entry point | `input_variables` |
| `text_generation` | LLM text generation | `content`, `title` |
| `image_generation` | Image generation | `file_url`, `thumbnail_url`, `title`, `prompt` |
| `processing` | Text processing/transformation | `content`, `title` |
| `context_retrieval` | RAG/document search | `context`, `content`, `documents`, `count` |
| `conditional` | Branching logic | `result`, `branch` |
| `loop` | Iteration | `item`, `current_iteration`, `iterations` |
| `finish` | Workflow end | - |

### Variable System
- Syntax: `{{nodeId.field}}` (e.g., `{{node_abc123.content}}`)
- Variables reference upstream node outputs
- `useVariableAutocomplete` hook provides suggestions based on connected nodes
- Backend resolves variables during execution via `resolve_variable_references()`

### Execution Flow
1. Frontend saves workflow → `POST /workflows/{id}`
2. Execute workflow → `POST /workflows/{id}/execute`
3. Backend streams progress via SSE (Server-Sent Events)
4. Frontend receives updates via `useWorkflowExecution` hook
5. Outputs stored in `execution.execution_context`

### Key Files
- **Frontend**:
  - `components/workflow/WorkflowCanvas.tsx` - ReactFlow canvas
  - `components/workflow/NodeConfigPanel.tsx` - Node configuration
  - `components/workflow/ModelSelector.tsx` - Model selection (API-driven)
  - `components/workflow/VariableAutocomplete.tsx` - Variable insertion
  - `hooks/useVariableAutocomplete.ts` - Variable discovery
  - `hooks/useWorkflowExecution.ts` - Execution state/SSE
  - `lib/stores/workflowStore.ts` - Zustand store

- **Backend**:
  - `routers/workflows.py` - Workflow CRUD
  - `routers/executions.py` - Execution endpoints + SSE
  - `services/workflow_executor.py` - Execution orchestration
  - `services/node_executor.py` - Individual node handlers
  - `image_generation_service.py` - Image generation + model fetching
  - `llm_service.py` - Text generation

### SSE Authentication
- Token passed via query param: `/executions/{id}/stream?token=...`
- Backend validates token in SSE endpoint
- Required for real-time execution updates

## Database

### Key Models
- `WorkflowTemplate` - Workflow definition (nodes_json, edges_json)
- `WorkflowExecution` - Execution instance (status, config_json, execution_context)
- `NodeExecutionJob` - Individual node execution record
- `Document` - Generated content (text/image)
- `Project` - Container for documents and workflows

### Storage
- Cloudflare R2 for file storage (images, assets)
- Supabase PostgreSQL with pgvector for embeddings
- Redis for caching

### Database Resources
All database-related files are in the `supabase/` directory:
- **Migrations**: `supabase/migrations/` - Sequential SQL files (001-031+)
- **Schema**: `supabase/schema.sql` - Complete database schema
- **Seeds**: `supabase/seeds/` - Template and initial data
- **Functions**: `supabase/functions/` - Edge functions (when needed)

## Development Commands

```bash
# Quick start (recommended)
./dev.sh setup   # First time setup
./dev.sh start   # Start all services (Redis + backend + frontend)

# Individual services
./dev.sh redis     # Start Redis only
./dev.sh backend   # Start backend only
./dev.sh frontend  # Start frontend only

# Production deployment
docker-compose up -d
```

<!-- MANUAL ADDITIONS END -->
