# Implementation Plan: Complete Workflow System with Enhanced Node Types and Variable Passing

**Branch**: `003-workflow-enhancement` | **Date**: 2025-11-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-workflow-enhancement/spec.md`

## Summary

This feature implements a complete visual workflow automation system enabling users to create, execute, and monitor multi-step AI-powered creative workflows. The system provides a drag-and-drop ReactFlow-based editor with 8 node types (Start, Finish, Text Generation, Image Generation, Conditional, Loop, Context Retrieval, Processing), standardized variable passing using `{{node.field}}` syntax, and asynchronous execution with real-time progress tracking via Server-Sent Events.

**Key Technical Approaches**:
- ReactFlow 11.11.4 for visual workflow builder
- JSONB storage for workflow definitions (ReactFlow-compatible format)
- Regex-based variable resolution with topological sort for execution ordering
- Hybrid Redis + PostgreSQL state management (fast active state + durable snapshots)
- Single Celery task per workflow execution with SSE progress streaming
- OutputParser service for structured output field extraction (JSON/Markdown)
- OpenRouter model filtering with Redis caching (1 hour TTL)

## Technical Context

**Language/Version**:
- Frontend: TypeScript 5.x + Next.js 16 (App Router with Turbopack)
- Backend: Python 3.11+ with FastAPI

**Primary Dependencies**:
- Frontend: ReactFlow 11.11.4, Zustand, Socket.IO client (for SSE)
- Backend: Celery 5.3+, Redis 7+, SQLAlchemy 2.0+, Pydantic V2, jsonschema

**Storage**:
- PostgreSQL 15+ with JSONB columns for workflow definitions
- Redis 7+ for execution state caching (24h TTL)
- MinIO for generated images/documents

**Testing**:
- Backend: pytest with integration tests for workflow execution
- Frontend: Vitest + React Testing Library for component tests
- E2E: Playwright for full workflow creation → execution → completion flows

**Target Platform**:
- Web application (Docker Compose deployment)
- Easypanel-compatible (no container_name, configurable ports)

**Project Type**: Web (backend + frontend monorepo)

**Performance Goals**:
- Workflow editor supports 50+ nodes without lag
- Execution state updates <100ms (Redis caching)
- Variable resolution <50ms for typical workflow (10 nodes, 20 variables)
- SSE latency <1s for progress updates
- Workflow save/load <500ms

**Constraints**:
- Execution history auto-cleanup: keep last 5000 executions per workflow
- No rate limiting on OpenRouter API (assume sufficient limits)
- No concurrent execution throttling initially
- Sequential node execution (no parallel branches in MVP)

**Scale/Scope**:
- Support 100 workflows per workspace
- Support 1000 executions per workflow (before auto-cleanup)
- 8 node types with individual configuration panels
- Average workflow: 5-15 nodes
- Edge case: up to 50 nodes supported

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ Principle I: AI-First Development

- **Pass**: All 8 node types treat AI as core functionality (text/image generation, context retrieval, processing)
- **Pass**: OpenRouter integration provides multi-provider LLM access
- **Pass**: Streaming responses via SSE for real-time feedback during execution
- **Pass**: Tool approval not applicable (workflows execute AI calls automatically, user controls via workflow design)
- **Pass**: Processing nodes enable intermediate AI operations without document creation
- **Pass**: Model selection UI prioritizes recommended models (expert-curated)

### ✅ Principle II: API-First Architecture

- **Pass**: All workflow operations exposed via REST APIs (see contracts/workflows-api.yaml, executions-api.yaml)
- **Pass**: OpenAPI 3.0.3 documentation generated for all endpoints
- **Pass**: Business logic in backend services (WorkflowExecutor, VariableResolver, NodeExecutor)
- **Pass**: Frontend consumes typed API clients
- **Pass**: JWT authentication inherited from existing auth system
- **Pass**: CORS properly configured in existing FastAPI setup

### ✅ Principle III: User Experience Excellence

**Premium Visual Design**:
- **Pass**: ReactFlow provides premium visual workflow editor (nodes, connections, minimap)
- **Pass**: Custom node components with configuration panels avoid generic appearance
- **Pass**: Animations: smooth drag, connection validation, execution progress indicators
- **Pass**: Glassmorphism design system applies to workflow editor cards and panels

**Progressive Complexity**:
- **Pass**: Simple mode: Start → Text Gen → Finish (3 clicks to first workflow)
- **Pass**: Intermediate: Variable autocomplete, model selection, conditional logic
- **Pass**: Expert: Loop execution, nested conditionals, structured outputs with field extraction
- **Pass**: Contextual help: Inline validation errors with fix suggestions

**Interaction & Feedback**:
- **Pass**: Loading states: Skeleton loaders for workflow list, spinner during execution
- **Pass**: Errors: User-friendly messages ("Node X not found" vs stack traces)
- **Pass**: Success: Toast notification on workflow save/execution complete
- **Pass**: Optimistic UI: Workflow saves immediately, sync to backend async
- **Pass**: Real-time progress: SSE updates show current node, percentage complete

**Performance as UX**:
- **Pass**: Initial workflow editor load <2s (ReactFlow lazy-loaded)
- **Pass**: Interactions feel instant: Drag node, add connection, update config
- **Pass**: Progress updates: 1s polling interval via SSE (non-blocking)
- **Pass**: Background execution: Users can navigate away, execution continues

### ✅ Principle IV: Production-Ready Deployments

- **Pass**: Multi-stage Docker builds for frontend/backend (existing Dockerfile.prod files)
- **Pass**: Health check endpoints: /health on backend (existing)
- **Pass**: depends_on with health conditions in docker-compose.yml (existing pattern)
- **Pass**: Environment variables follow 12-factor: CELERY_BROKER_URL, REDIS_URL, DATABASE_URL
- **Pass**: Build-time NEXT_PUBLIC_* variables passed as Docker args (existing)
- **Pass**: Network binding 0.0.0.0 in containers (existing)
- **Pass**: Easypanel-compatible: no container_name, ports configurable via .env

### ✅ Principle V: Data Integrity & Security

- **Pass**: Workflow execution permission inherits project document permissions (bcrypt-hashed passwords)
- **Pass**: No sensitive data in workflow definitions (user-provided prompts only)
- **Pass**: SQL injection prevented: SQLAlchemy ORM with parameterized queries
- **Pass**: Generated images stored in MinIO with public bucket policies (existing pattern)
- **Pass**: HTTPS enforced in production (existing)
- **Pass**: Input validation: jsonschema validates workflow definitions against workflow-schema-v1.json

### ✅ Principle VI: Scalability & Performance

- **Pass**: Workflow execution asynchronous via Celery (no blocking API requests)
- **Pass**: Redis caching: OpenRouter models (1h TTL), execution state (24h TTL)
- **Pass**: Database indexes: workspace_id, project_id, status, created_at on workflow_executions
- **Pass**: Image storage in MinIO (not database BLOBs)
- **Pass**: No pgvector needed (workflows don't use RAG, but Context Retrieval nodes fetch existing documents)
- **Pass**: SSE streaming for long-running execution updates (non-blocking)
- **Pass**: Resource limits in docker-compose.yml (existing pattern)

### ✅ Principle VII: Testing & Quality Assurance

- **Pass**: Integration tests planned: workflow creation, execution, variable resolution (see quickstart.md)
- **Pass**: API endpoint tests: success (200) and error cases (400, 404, 500)
- **Pass**: TypeScript enforced on frontend (strict mode)
- **Pass**: Python type hints on backend (mypy-compatible)
- **Pass**: Error handling: Execution failures logged without exposing secrets
- **Pass**: Database migration: 008_create_workflow_tables.sql (versioned with Alembic pattern)
- **Pass**: Race condition fix: Snapshots after each node prevent resume-from-failure races

### Constitution Check Summary

**Status**: ✅ **PASS** - All 7 principles satisfied with no violations

**Notes**:
- Existing infrastructure (FastAPI, Celery, Redis, PostgreSQL, MinIO) reused for workflow system
- Premium design system (glassmorphism, Ethereal Blue) extends to workflow editor
- API-first architecture maintained with comprehensive OpenAPI contracts
- No architectural compromises required

## Project Structure

### Documentation (this feature)

```text
specs/003-workflow-enhancement/
├── plan.md                      # This file (/speckit.plan command output)
├── research.md                  # Phase 0: Technical decisions (complete)
├── data-model.md                # Phase 1: Database schema (complete)
├── quickstart.md                # Phase 1: Developer guide (complete)
├── contracts/                   # Phase 1: API contracts (complete)
│   ├── workflows-api.yaml       # Workflow CRUD endpoints
│   ├── executions-api.yaml      # Execution management + SSE
│   └── workflow-schema-v1.json  # Workflow definition JSON Schema
├── spec.md                      # Feature specification (input)
└── tasks.md                     # Phase 2: Implementation tasks (/speckit.tasks command - already exists)
```

### Source Code (repository root)

```text
backend/
├── routers/
│   ├── workflows.py             # NEW: Workflow CRUD endpoints
│   └── executions.py            # NEW: Execution management + SSE
├── services/
│   ├── workflow_executor.py     # NEW: Main execution orchestrator
│   ├── node_executor.py         # NEW: Individual node execution logic
│   ├── variable_resolver.py     # NEW: {{variable}} parsing and resolution
│   ├── workflow_validator.py    # NEW: Workflow structure validation
│   ├── execution_state_manager.py # NEW: Redis + PostgreSQL state sync
│   ├── output_parser.py         # NEW: Structured output field extraction
│   ├── conditional_evaluator.py # NEW: Conditional expression evaluation
│   └── model_service.py         # NEW: OpenRouter model filtering
├── models.py                    # UPDATED: Add Workflow, WorkflowExecution, NodeOutput models
├── schemas.py                   # UPDATED: Add Workflow/Execution Pydantic schemas
├── migrations/
│   └── 008_create_workflow_tables.sql # EXISTING: Workflow tables (may need updates)
├── tasks/
│   └── workflow_tasks.py        # NEW: Celery tasks for async execution
└── tests/
    ├── test_variable_resolver.py # NEW: Unit tests
    ├── test_workflow_executor.py # NEW: Integration tests
    └── test_workflow_api.py      # NEW: API endpoint tests

frontend/
├── src/
│   ├── app/
│   │   └── workspace/[id]/
│   │       └── workflows/
│   │           ├── page.tsx                 # NEW: Workflow list page
│   │           └── [workflowId]/
│   │               └── page.tsx             # NEW: Workflow editor page
│   ├── components/
│   │   └── workflow/
│   │       ├── WorkflowCanvas.tsx           # NEW: ReactFlow wrapper
│   │       ├── NodePalette.tsx              # NEW: Draggable node types
│   │       ├── VariableAutocomplete.tsx     # NEW: {{variable}} autocomplete
│   │       ├── WorkflowValidator.tsx        # NEW: Inline validation errors
│   │       ├── ExecutionMonitor.tsx         # NEW: Real-time progress display
│   │       └── nodes/
│   │           ├── StartNode.tsx            # NEW: Start node component
│   │           ├── FinishNode.tsx           # NEW: Finish node component
│   │           ├── TextGenerationNode.tsx   # NEW: Text gen node
│   │           ├── ImageGenerationNode.tsx  # NEW: Image gen node
│   │           ├── ConditionalNode.tsx      # NEW: Conditional node
│   │           ├── LoopNode.tsx             # NEW: Loop node
│   │           ├── ContextRetrievalNode.tsx # NEW: Context retrieval node
│   │           └── ProcessingNode.tsx       # NEW: Processing node
│   ├── lib/
│   │   ├── stores/
│   │   │   └── workflowStore.ts             # NEW: Zustand workflow state
│   │   ├── api/
│   │   │   ├── workflows.ts                 # NEW: Workflow API client
│   │   │   └── executions.ts                # NEW: Execution API client
│   │   └── workflow-schema.ts               # NEW: TypeScript types for workflow
│   └── hooks/
│       ├── useWorkflowExecution.ts          # NEW: SSE execution tracking
│       └── useVariableAutocomplete.ts       # NEW: Variable autocomplete logic
└── tests/
    └── components/
        └── workflow/
            └── WorkflowCanvas.test.tsx       # NEW: Component tests
```

**Structure Decision**: Web application (Option 2) - Existing monorepo with `backend/` and `frontend/` directories. All workflow-related code follows established patterns: backend services in `services/`, frontend components in `components/workflow/`, API routes in `routers/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: No violations - Table remains empty.

All constitution principles are satisfied without architectural compromises. The workflow system integrates seamlessly with existing infrastructure (Celery, Redis, PostgreSQL, MinIO) and follows established patterns for API-first architecture, premium UX, and production-ready deployments.

---

## Phase 0: Research (Complete)

**Status**: ✅ Complete

**Output**: [research.md](./research.md)

**Key Decisions**:
1. Visual editor: ReactFlow 11.11.4
2. Workflow format: JSON (nodes + edges)
3. Variable resolution: Regex + topological sort
4. Execution state: Redis + PostgreSQL snapshots
5. Real-time updates: Server-Sent Events (SSE)
6. Loop implementation: Context stack + iteration counter
7. Conditional logic: Python eval() sandboxed
8. Model filtering: OpenRouter API + Redis cache (1h TTL)

All technical unknowns resolved. No blocking issues remain.

---

## Phase 1: Design & Contracts (Complete)

**Status**: ✅ Complete

**Outputs**:
- [data-model.md](./data-model.md) - Database schema with 3 core tables
- [contracts/workflows-api.yaml](./contracts/workflows-api.yaml) - 7 workflow CRUD endpoints
- [contracts/executions-api.yaml](./contracts/executions-api.yaml) - 9 execution management endpoints
- [contracts/workflow-schema-v1.json](./contracts/workflow-schema-v1.json) - Workflow definition JSON Schema
- [quickstart.md](./quickstart.md) - Developer getting started guide

**Database Schema Summary**:
- `workflow_templates`: Workflow definitions (JSONB format)
- `workflow_executions`: Execution tracking with status, error messages, cost
- `node_outputs`: Individual node results for variable resolution

**API Endpoints Summary**:
- Workflows: POST create, GET list/single, PUT update, DELETE, POST duplicate, POST validate
- Executions: POST execute, GET list/single, GET stream (SSE), POST pause/resume/stop/retry, GET logs

**Agent Context Update**: Pending (Phase 1 final step)

---

## Phase 2: Constitution Re-check (Complete)

**Status**: ✅ Complete

**Result**: All 7 principles satisfied post-design

**Changes from Initial Check**: None - design validated against constitution with no violations introduced.

---

## Next Steps

1. ✅ Phase 0 Research: Complete (research.md generated)
2. ✅ Phase 1 Design: Complete (data-model.md, contracts/, quickstart.md generated)
3. ⏳ Agent Context Update: Run `.specify/scripts/bash/update-agent-context.sh claude` to add ReactFlow, Zustand to CLAUDE.md
4. ✅ Constitution Re-check: Complete (no violations)
5. ⏭️ Phase 2 Tasks: Run `/speckit.tasks` to generate implementation task breakdown (tasks.md already exists but may need refresh)

---

**Plan Status**: ✅ **COMPLETE** - Ready for `/speckit.tasks` command

**Recommended Next Command**: `/speckit.tasks` (or review existing tasks.md if already generated)

**Estimated Implementation**: 140 tasks across 11 phases (based on existing tasks.md)
