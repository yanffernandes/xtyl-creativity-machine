# Implementation Plan: Autonomous Workflow System for Content Creation

**Branch**: `002-autonomous-workflow-system` | **Date**: 2025-11-25 | **Spec**: [spec.md](./spec.md)

## Summary

Build a visual workflow automation system that allows users to create multi-step AI-powered content generation processes using a drag-and-drop node editor (ReactFlow). The system enables batch creation of copies and images through autonomous agents, with pre-built templates for common marketing scenarios, human-in-the-loop review nodes, and a robust document-image attachment system. Primary technical approach: Extend existing backend with workflow execution engine using async job queues, create React Flow-based frontend editor with real-time execution monitoring, and enhance document model to support multi-image attachments.

## Technical Context

**Language/Version**:
- Frontend: TypeScript 5.x, Node.js 20+ (Next.js 14 App Router)
- Backend: Python 3.11+ (FastAPI)

**Primary Dependencies**:
- Frontend: React 18, ReactFlow 11+, Framer Motion 10+, Shadcn/UI, Tailwind CSS 3.4+
- Backend: FastAPI, SQLAlchemy ORM, Pydantic, Celery (async task queue), Redis (task broker + state storage)

**Storage**:
- PostgreSQL 15+ (workflow definitions, execution state, document-image relationships)
- Redis 7+ (Celery broker, execution state caching, real-time progress)
- MinIO (existing - for generated images and document attachments)

**Testing**:
- Frontend: Jest + React Testing Library
- Backend: pytest with async support
- Integration: End-to-end workflow execution tests

**Target Platform**:
- Web application (responsive desktop/tablet, read-only mobile)
- Docker Compose deployment (Easypanel-compatible)

**Project Type**: Web (frontend + backend)

**Performance Goals**:
- Workflow launch < 500ms (validation + queue submission)
- Support 20 parallel agent executions per workflow
- Handle 10 concurrent workflow executions per workspace
- Real-time progress updates with <2s latency (polling-based)
- Visual workflow editor loads <1s for workflows up to 50 nodes

**Constraints**:
- Maximum workflow execution time: 30 minutes (hard timeout)
- Maximum nodes per workflow: 100
- Maximum image attachment per document: 20
- Workflow state persistence every node completion (enable pause/resume)
- No WebSocket requirement (polling sufficient for v1)

**Scale/Scope**:
- Support 1000+ users with 50+ workflows per workspace
- 10k+ workflow executions per month
- ~25 UI components (workflow editor, node configurator, execution monitor, template gallery)
- ~15 backend endpoints (workflow CRUD, execution control, node operations)
- ~8 new database tables (workflows, nodes, executions, document_attachments)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. AI-First Development
- **Pass**: Workflows orchestrate AI agents (LLM for copy, image generation) as core functionality
- **Pass**: Streaming not required for batch workflows, but progress updates provided
- **Pass**: Tool approval extended to workflow launch (user reviews configuration before execution)
- **Pass**: AI failures handled at node level with retry/skip options

### ✅ II. API-First Architecture
- **Pass**: All workflow operations exposed via REST API (`/api/workflows`, `/api/executions`)
- **Pass**: Business logic (node validation, execution orchestration) in backend services
- **Pass**: OpenAPI documentation auto-generated for new endpoints
- **Pass**: Frontend uses typed API client with axios + generated types

### ✅ III. User Experience Excellence

#### Premium Visual Design
- **Pass**: ReactFlow editor customized with premium node designs (glass morphism cards)
- **Pass**: Workflow gallery with polished template previews
- **Pass**: Execution monitor with elegant progress visualization (color-coded nodes, smooth transitions)
- **Pass**: Follows Ethereal Blue design system (#5B8DEF accent, glass cards, refined animations)

#### Progressive Complexity
- **Pass**: Novice users start with pre-built templates (no custom building required)
- **Pass**: Intermediate users customize templates (adjust prompts, quantities)
- **Pass**: Expert users build custom workflows from scratch with advanced nodes (conditionals, parallel)
- **Pass**: Contextual help tooltips on node configurators

#### Interaction & Feedback
- **Pass**: Real-time execution monitoring with live node status updates
- **Pass**: Clear error messages with recovery options (Retry Node, Skip Node, Stop Workflow)
- **Pass**: Loading states for workflow launches and node executions
- **Pass**: Success toasts when workflow completes
- **Pass**: Optimistic UI: workflow appears in "Active" immediately on launch

### ✅ IV. Production-Ready Deployments
- **Pass**: Celery workers deployed as separate Docker service with health checks
- **Pass**: Redis broker with health check dependency
- **Pass**: Multi-stage Docker builds for backend (Celery worker image shares backend code)
- **Pass**: Environment variables for Celery broker URL, result backend
- **Pass**: No hardcoded localhost, uses Docker service names

### ✅ V. Data Integrity & Security
- **Pass**: Workflow templates scoped to workspace (RBAC enforced)
- **Pass**: Execution history accessible only to workspace members
- **Pass**: Uploaded reference files validated for type/size
- **Pass**: Image attachments use existing MinIO security model
- **Pass**: SQLAlchemy ORM prevents SQL injection

### ✅ VI. Scalability & Performance
- **Pass**: Async workflow execution via Celery (doesn't block API)
- **Pass**: Redis caching for execution state (reduces DB load)
- **Pass**: Database indexes on workflow_id, execution_id, status
- **Pass**: Image attachments stored in MinIO (not database)
- **Pass**: Workflow polling uses efficient queries (status + updated_at only)

### ✅ VII. Testing & Quality Assurance
- **Pass**: Integration tests for full workflow execution (template → launch → completion)
- **Pass**: Unit tests for node validation logic
- **Pass**: API endpoint tests for workflow CRUD operations
- **Pass**: TypeScript for frontend type safety
- **Pass**: Pydantic schemas for backend type validation
- **Pass**: Error handling logs to backend without exposing internals to users

**Gate Result**: ✅ **PASS** - No constitution violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/002-autonomous-workflow-system/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (ReactFlow patterns, Celery best practices)
├── data-model.md        # Phase 1 output (workflow entities, attachments)
├── quickstart.md        # Phase 1 output (local setup, template usage)
├── contracts/           # Phase 1 output (API schemas)
│   ├── workflows.yaml   # Workflow CRUD endpoints
│   ├── executions.yaml  # Execution control endpoints
│   └── nodes.yaml       # Node configuration schemas
├── checklists/
│   └── requirements.md  # Spec validation (already completed)
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── routers/
│   ├── workflows.py        # NEW: Workflow template CRUD
│   ├── workflow_executions.py  # NEW: Execution control (launch, pause, resume, stop)
│   └── workflow_nodes.py   # NEW: Node configuration operations
├── models.py               # EXTEND: Add WorkflowTemplate, WorkflowNode, WorkflowExecution, AgentJob, DocumentAttachment
├── schemas.py              # EXTEND: Add workflow/node/execution Pydantic schemas
├── services/
│   ├── workflow_engine.py  # NEW: Core execution orchestration
│   ├── workflow_validator.py  # NEW: Node connection validation, cycle detection
│   └── node_executor.py    # NEW: Individual node execution logic (copy gen, image gen, attach, review)
├── tasks/
│   └── workflow_tasks.py   # NEW: Celery tasks for async workflow execution
├── migrations/
│   └── 00X_add_workflows.py  # NEW: Alembic migration for workflow tables
└── requirements.txt        # ADD: celery[redis], redis, reactflow (docs only)

frontend/
├── src/
│   ├── app/
│   │   └── workspace/[id]/
│   │       ├── workflows/           # NEW: Workflow pages
│   │       │   ├── page.tsx         # Template gallery
│   │       │   ├── builder/
│   │       │   │   └── [templateId]/page.tsx  # Visual editor
│   │       │   └── executions/
│   │       │       └── [executionId]/page.tsx  # Execution monitor
│   │       └── project/[projectId]/
│   │           └── page.tsx         # EXTEND: Add "Workflows" tab
│   ├── components/
│   │   ├── workflow/                # NEW: Workflow components
│   │   │   ├── WorkflowCanvas.tsx   # ReactFlow canvas wrapper
│   │   │   ├── nodes/               # Custom node components
│   │   │   │   ├── GenerateCopyNode.tsx
│   │   │   │   ├── GenerateImageNode.tsx
│   │   │   │   ├── AttachToDocumentNode.tsx
│   │   │   │   ├── ReviewNode.tsx
│   │   │   │   ├── ConditionalNode.tsx
│   │   │   │   └── ParallelNode.tsx
│   │   │   ├── NodeConfigPanel.tsx  # Right sidebar for node configuration
│   │   │   ├── WorkflowToolbar.tsx  # Top toolbar (save, test, launch)
│   │   │   ├── ExecutionMonitor.tsx # Live execution progress display
│   │   │   └── TemplateCard.tsx     # Template preview card
│   │   └── DocumentAttachments.tsx  # EXTEND: Image attachment UI in document view
│   ├── lib/
│   │   └── api/
│   │       └── workflows.ts         # NEW: Workflow API client
│   └── hooks/
│       ├── useWorkflowExecution.ts  # NEW: Poll execution status
│       └── useWorkflowValidation.ts # NEW: Real-time validation
└── package.json                     # ADD: reactflow, @xyflow/react

docker-compose.yml               # EXTEND: Add celery-worker service, redis service
docker-compose.dev.yml           # EXTEND: Add celery-worker with hot reload
```

**Structure Decision**: This is a web application with existing frontend/backend. New code extends current structure by adding workflow-specific routers, services, and React components. Celery worker runs as separate Docker service but shares backend codebase (same models, services). ReactFlow library chosen for visual editor due to excellent React integration, extensibility, and professional appearance.

## Complexity Tracking

> **No violations - this section intentionally left empty per constitution**

---

## Phase 0: Research & Technical Decisions

**Status**: ✅ Complete (see research.md)

**Deliverable**: [research.md](./research.md)

**Key Research Areas**:
1. **ReactFlow Integration**: Best practices for custom nodes, edge validation, state management
2. **Celery Workflow Patterns**: Chains, groups, chords for multi-agent orchestration
3. **Real-time Progress Tracking**: Polling vs WebSocket trade-offs, optimal polling intervals
4. **Document-Image Attachment Model**: Database schema for many-to-many with metadata

**Decisions Made**:
- ReactFlow 11+ with custom node components (not default styled nodes)
- Celery canvas primitives (chain/group) for workflow orchestration
- Polling-based progress (2-second interval, efficient DB query)
- Junction table `document_attachments` with `is_primary`, `attachment_order` columns

---

## Phase 1: Design & Contracts

**Status**: ✅ Complete

**Deliverables**:
- [data-model.md](./data-model.md) - Entity definitions, relationships, state machines
- [contracts/](./contracts/) - API endpoint specifications (OpenAPI)
- [quickstart.md](./quickstart.md) - Developer setup guide

### Data Model Summary

**New Entities**:
1. **WorkflowTemplate**: Reusable workflow definition (nodes, edges, metadata)
2. **WorkflowNode**: Individual node in template (type, config, position)
3. **WorkflowExecution**: Running instance of template (state, progress)
4. **AgentJob**: Granular task within node execution (for parallel operations)
5. **DocumentAttachment**: Many-to-many link between documents and images

**Key Relationships**:
- WorkflowTemplate 1:N WorkflowNode
- WorkflowTemplate 1:N WorkflowExecution
- WorkflowExecution 1:N AgentJob
- Document M:N Image (via DocumentAttachment)

**State Machines**:
- Workflow Execution: pending → running → (paused ↔ running) → completed/failed/stopped
- Agent Job: pending → running → completed/failed
- Node Status: pending → running → completed/failed/skipped

### API Contract Summary

**Workflow Endpoints** (`/api/workflows`):
- `GET /templates` - List templates (filterable by category)
- `GET /templates/{id}` - Get template detail (includes nodes/edges)
- `POST /templates` - Create custom template
- `PUT /templates/{id}` - Update template
- `POST /templates/{id}/clone` - Clone and customize

**Execution Endpoints** (`/api/executions`):
- `POST /launch` - Launch workflow execution
- `GET /{id}` - Get execution status and progress
- `POST /{id}/pause` - Pause running execution
- `POST /{id}/resume` - Resume paused execution
- `POST /{id}/stop` - Stop execution permanently
- `POST /{id}/retry-node` - Retry failed node

**Node Endpoints** (`/api/nodes`):
- `POST /validate` - Validate node configuration
- `POST /validate-connections` - Check for cycles, invalid edges

**Attachment Endpoints** (extend `/api/documents`):
- `POST /{docId}/attachments` - Attach images to document
- `DELETE /{docId}/attachments/{imageId}` - Detach image
- `PUT /{docId}/attachments/{imageId}/primary` - Set primary image

---

## Phase 2: Implementation Tasks

**Status**: ⏳ Pending - Use `/speckit.tasks` to generate task list

**Next Command**: `/speckit.tasks` will break this plan into dependency-ordered implementation tasks.

**Expected Task Categories**:
1. **Database Schema**: Migrations for new tables, indexes
2. **Backend Core**: Workflow engine, validator, node executors
3. **Celery Integration**: Task definitions, worker configuration
4. **API Layer**: Routers for workflow operations
5. **Frontend Core**: ReactFlow canvas, custom nodes
6. **Frontend UI**: Template gallery, execution monitor
7. **Document Attachments**: Enhanced document view with images
8. **Integration**: End-to-end workflow execution
9. **Pre-built Templates**: Seed 10+ workflow templates
10. **Testing**: Unit, integration, E2E tests
11. **Documentation**: API docs, user guides

---

## Post-Phase 1 Constitution Re-check

*Verify design decisions still comply with constitution*

### ✅ All Gates Still Pass

**Notable Confirmations**:
- **API-First**: All workflow operations have well-defined REST endpoints (contracts/ folder)
- **Premium UX**: ReactFlow customization plan ensures premium look (not generic flowchart)
- **Scalability**: Celery + Redis architecture supports concurrent workflows
- **Data Integrity**: Foreign keys enforce referential integrity between workflows/executions/jobs
- **Testing**: Integration test plan covers critical workflow execution paths

**No new violations introduced**. Design is constitution-compliant.

---

## Implementation Notes

### Critical Path Items

1. **Document-Image Attachment System** (Priority P1 dependency):
   - Required by "Attach to Document" node
   - Affects document viewer UI (show attached images)
   - Must complete before workflow builder

2. **Workflow Engine Core** (Foundation):
   - Node validation (cycle detection, connection rules)
   - Execution state machine
   - Celery task orchestration
   - All other features depend on this

3. **Pre-built Templates** (User-facing value):
   - Must be ready for launch
   - Requires workflow engine to be functional
   - Templates define user's first impression

### Risk Mitigation

**Risk 1**: ReactFlow learning curve for complex node interactions
- **Mitigation**: Start with simple nodes (Generate Copy), incrementally add complexity
- **Fallback**: Use ReactFlow examples/docs extensively, community support available

**Risk 2**: Celery workflow orchestration complexity (chains, groups, error handling)
- **Mitigation**: Prototype simple workflow first (linear chain), then add parallelism
- **Fallback**: Celery has mature error handling patterns, extensive documentation

**Risk 3**: Real-time progress polling performance at scale
- **Mitigation**: Optimize DB queries (index on execution_id + status), Redis caching
- **Fallback**: If polling becomes bottleneck, can add WebSocket layer later (not v1)

**Risk 4**: Workflow state persistence/recovery complexity
- **Mitigation**: Persist state after every node completion, atomic DB updates
- **Fallback**: If recovery fails, provide partial results + manual cleanup tools

### Development Workflow

1. **Backend-First Approach**: Build workflow engine + API first (testable in isolation)
2. **Celery Integration**: Add async execution layer (test with simple workflows)
3. **Frontend Editor**: Build ReactFlow canvas once backend is stable
4. **Template Seeding**: Create pre-built templates as backend matures
5. **Polish**: Execution monitoring, error handling, edge cases

### Testing Strategy

- **Unit Tests**: Node validators, execution state transitions, attachment logic
- **Integration Tests**: Full workflow execution (template → launch → agents → completion)
- **API Tests**: Workflow CRUD, execution control endpoints
- **UI Tests**: ReactFlow node rendering, configuration panels (visual regression)
- **Load Tests**: 10 concurrent workflows, 20 parallel agents (verify no deadlocks)

---

**Plan Complete**: Ready for `/speckit.tasks` to generate implementation task list.
