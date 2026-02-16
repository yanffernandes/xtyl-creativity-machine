# Feature Specification: Full-Stack Migration

**Feature Branch**: `032-full-stack-migration`
**Created**: 2026-02-07
**Status**: Draft
**Input**: Migrate the entire system (backend and frontend) to a new monorepo architecture with TypeScript-based backend (NestJS), modern frontend (React + Vite + TanStack Router), pnpm workspaces, shared packages, and built-in observability.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Monorepo Scaffolding & Shared Packages (Priority: P1)

As a developer, I need the new monorepo structure established with shared packages (schemas, types, observability) and build tooling so that all subsequent migration work has a stable foundation.

**Why this priority**: Nothing else can proceed without the monorepo skeleton. This is the structural foundation that enables parallel work on backend and frontend migration. It also establishes the shared validation schemas and types that both apps consume.

**Independent Test**: Can be verified by installing dependencies at the root, importing a shared schema in both web and API apps, and confirming compilation succeeds across all workspaces.

**Acceptance Scenarios**:

1. **Given** a fresh clone of the repository, **When** I run the install command at the root, **Then** all workspace dependencies are resolved and linked correctly.
2. **Given** the monorepo is set up, **When** I create a validation schema in the shared package, **Then** I can import and use it in both web and API apps without duplication.
3. **Given** the monorepo is set up, **When** I run the build command, **Then** all packages and apps compile without errors and respect dependency order.

---

### User Story 2 - Backend Migration: Core API (Priority: P1)

As an end user, I need the backend API to be fully rewritten while preserving all existing endpoints, business logic, and data contracts so that the application continues to function identically from the user's perspective.

**Why this priority**: The backend is the data and logic layer that the frontend depends on. All 20+ route modules, 27 services, and 80+ data schemas must be re-implemented with identical behavior. Without a working backend, no frontend feature works.

**Independent Test**: Can be tested by running the existing frontend against the new backend and verifying all API calls return identical responses. Also verifiable via API integration tests comparing old vs. new responses for the same inputs.

**Acceptance Scenarios**:

1. **Given** the new backend is running, **When** I call any existing API endpoint with the same request, **Then** I receive a response with the same structure and data as the current backend.
2. **Given** the new backend is deployed, **When** workflow execution is triggered, **Then** SSE streaming delivers real-time progress events identically to the current system.
3. **Given** the new backend handles image generation, **When** a generation request is submitted, **Then** the system processes it via the same external AI providers and stores results in the same storage locations.
4. **Given** the new backend is running, **When** background jobs (image processing, RAG indexing, email) are queued, **Then** they execute reliably with retry logic and progress tracking.

---

### User Story 3 - Frontend Migration: App Shell & Routing (Priority: P2)

As an end user, I need the web application rebuilt with the new frontend stack while preserving every existing page, interaction, and visual design so that the user experience remains identical.

**Why this priority**: The frontend defines the user experience. All 36+ routes, 100+ components, 30+ hooks, and the complete design system (Ethereal Blue + Liquid Glass) must be faithfully reproduced. This depends on having a working backend (P1).

**Independent Test**: Can be tested by navigating every route, performing key user flows (login, create project, generate image, run workflow, manage copies), and visually comparing with the current app.

**Acceptance Scenarios**:

1. **Given** the new frontend is running, **When** I navigate to any existing route, **Then** the page loads with the same layout, components, and functionality.
2. **Given** the new frontend is running, **When** I use the workflow builder canvas, **Then** I can create, configure, and execute workflows identically.
3. **Given** the new frontend is running, **When** I use the image studio, **Then** all generation modes, concept selection, brush canvas, and variation tools work identically.
4. **Given** the new frontend uses the new router, **When** I navigate between pages, **Then** transitions are smooth, code-splitting works, and deep links resolve correctly.

---

### User Story 4 - Observability & Monitoring (Priority: P2)

As a developer/operator, I need structured logging, distributed tracing, and error tracking built into every layer of the application so that I can diagnose issues, track performance, and monitor system health in real time.

**Why this priority**: Observability is a core principle of the new architecture. Without it, operating the migrated system in production is flying blind. This should be woven into the migration rather than bolted on after.

**Independent Test**: Can be tested by triggering various operations and verifying that structured logs appear in the log aggregator, traces show end-to-end request flow, and errors are captured with full context.

**Acceptance Scenarios**:

1. **Given** an API request is made, **When** it flows through the backend, **Then** structured JSON logs (request ID, user ID, duration, status) are emitted at each stage.
2. **Given** a request spans multiple services (API to queue to external API), **When** I view the trace, **Then** I can see the full distributed trace with timing for each segment.
3. **Given** an unhandled error occurs anywhere, **When** the error tracking service captures it, **Then** the error includes full stack trace, request context, user context, and breadcrumbs.
4. **Given** the frontend is running, **When** a user encounters a client-side error, **Then** it is captured with session context and reported automatically.

---

### User Story 5 - Admin Dashboard Migration (Priority: P3)

As an admin, I need the admin dashboard migrated as a separate app within the monorepo with all current admin capabilities (user management, model configuration, system settings, audit logs, memory management) preserved.

**Why this priority**: The admin panel is used by a smaller set of users and can be migrated after the main application is stable. However, it must retain full functionality for system operation.

**Independent Test**: Can be tested by logging in as an admin and performing all current admin operations: viewing users, configuring models, adjusting system settings, and reviewing audit logs.

**Acceptance Scenarios**:

1. **Given** I am logged in as an admin, **When** I access the admin dashboard, **Then** I see all current sections: users, models, settings, messages, workspaces, memory.
2. **Given** I am in the admin panel, **When** I modify a system configuration, **Then** the change takes effect immediately and is logged in the audit trail.

---

### User Story 6 - Data Continuity & Zero-Downtime Migration (Priority: P1)

As a user with existing data (projects, documents, workflows, images, conversations, memories), I need all my data preserved and accessible after the migration with zero data loss. A maintenance window of up to 2 hours is acceptable for the cutover, allowing full validation before the new system goes live.

**Why this priority**: Data loss is unacceptable. The migration must preserve all existing database records, stored files, user preferences, and workflow definitions. The database schema remains the same; the new backend must connect to and operate on the identical database. The 2-hour maintenance window allows stopping the old system, running validation checks, and bringing the new system online with confidence.

**Independent Test**: Can be tested by comparing record counts, file accessibility, and data integrity before and after the migration for a representative sample of users.

**Acceptance Scenarios**:

1. **Given** the migration is complete, **When** a user logs in, **Then** all their projects, documents, conversations, and preferences are intact.
2. **Given** the migration is complete, **When** a user opens a previously created workflow, **Then** all nodes, edges, and configuration are preserved.
3. **Given** the migration is complete, **When** a user views their image gallery, **Then** all previously generated images and their metadata are accessible.

---

### Edge Cases

- What happens when the new backend encounters a database record created by the old backend with legacy field formats?
- How does the system handle in-flight workflow executions during the cutover? (Answer: The old system is stopped during the maintenance window; any in-flight executions must complete or be marked as failed before cutover.)
- What happens when a user has cached frontend assets from the old app and loads the new frontend?
- How does the system handle environment variables and secrets that differ between old and new backends?
- What happens if a shared package has a breaking change that affects only one app?
- How does the system handle concurrent requests during the deployment cutover window? (Answer: System is offline during the maintenance window; no concurrent requests expected.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST be organized as a monorepo with three apps (web, admin, api) and two shared packages (shared, observability).
- **FR-002**: System MUST use shared validation schemas as the single source of truth for data validation, consumed by both frontend and backend.
- **FR-003**: The new backend MUST expose all existing API endpoints with identical request/response contracts (20+ route modules, 80+ schemas).
- **FR-004**: The new backend MUST support Server-Sent Events (SSE) for workflow execution streaming with the same event format.
- **FR-005**: The new backend MUST integrate with all current external services: fal.ai (image generation), OpenRouter (LLM), Supabase Auth, Supabase PostgreSQL, and file storage.
- **FR-006**: The new backend MUST implement job queues for background processing (image generation, RAG indexing, email sending) with retry logic, progress tracking, and a visual dashboard in dev/staging.
- **FR-007**: The new frontend MUST reproduce all 36+ existing routes with identical user-facing functionality.
- **FR-008**: The new frontend MUST preserve the complete design system (Ethereal Blue + Liquid Glass theme, glassmorphism, animations).
- **FR-009**: The new frontend MUST use type-safe file-based routing with automatic code-splitting.
- **FR-010**: The new frontend MUST maintain the workflow builder (canvas-based), image studio (with brush canvas, concept selector, generation modes), and rich text editor.
- **FR-011**: Both frontend and backend MUST emit structured JSON logs with request correlation IDs.
- **FR-012**: Both frontend and backend MUST integrate with an error tracking service for error capture and performance monitoring.
- **FR-013**: The backend MUST support distributed tracing across request lifecycle (HTTP to queue to external API).
- **FR-014**: The system MUST connect to the existing database without schema changes, preserving all 35+ migrations and 30+ model entities.
- **FR-015**: The migration MUST preserve all existing data: projects, documents, workflows, images, conversations, user memories, campaign packages, copy library items, and admin configurations.
- **FR-016**: The monorepo MUST include container-based configuration for local development (API + Redis + any required services).
- **FR-017**: The monorepo MUST be deployable via Easypanel (current hosting platform). CI/CD pipeline configuration is out of scope for this migration.
- **FR-018**: The admin dashboard MUST be a separate app within the monorepo with all current admin capabilities.
- **FR-019**: The system MUST maintain internationalization (i18n) support for the current supported locales (pt-BR, en).
- **FR-020**: The system MUST preserve Row Level Security (RLS) policies for direct database client access from the frontend.
- **FR-021**: The backend MUST implement authentication guards that validate JWT tokens from the auth provider, matching current auth behavior.
- **FR-022**: The system MUST maintain the current file storage service (Cloudflare R2). Storage migration to an alternative provider is out of scope and will be planned separately if needed.
- **FR-023**: The system MUST support the same user roles and permissions model (workspace owner, admin, member).
- **FR-024**: The backend MUST implement rate limiting on public-facing endpoints matching current behavior.

### Key Entities

- **Workspace**: Multi-tenant container with roles (owner, admin, member). Contains projects, templates, and configurations.
- **Project**: Container for documents, workflows, and visual assets. Supports soft delete.
- **Document**: Multi-purpose entity (text, image, PDF, reference). Supports versioning, sharing, variations, and refinement history.
- **WorkflowTemplate**: Reusable workflow definition with nodes (8 types) and edges stored as structured data.
- **WorkflowExecution**: Running workflow instance with status tracking and execution context.
- **ChatConversation**: Conversation history with document context and user preferences.
- **UserMemory**: Extracted facts with vector embeddings for personalization.
- **CreativeConcept**: 88 preset creative concepts for image generation with prompt modifiers and metadata.
- **CopyLibraryItem**: Reusable marketing copy text, workspace-scoped.
- **CampaignPackage**: Campaign grouping for copies and images.
- **SystemConfig**: Global configuration store (model visibility, feature flags).
- **AdminAuditLog**: Compliance tracking for all admin actions.
- **AIUsageLog**: Token/cost tracking per user, model, and provider.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All existing user-facing features are accessible and functional in the migrated system with 100% feature parity.
- **SC-002**: All existing API endpoints return identical responses (same structure, same data) when called with the same inputs.
- **SC-003**: Zero data loss: 100% of existing records (projects, documents, workflows, images, conversations, memories) are accessible after migration.
- **SC-004**: Page load times in the migrated frontend are equal to or faster than the current system.
- **SC-005**: Backend API response times are equal to or faster than the current system for equivalent operations, supporting up to 100 concurrent users without degradation.
- **SC-006**: Every API request generates a structured log entry with correlation ID, user context, and timing information.
- **SC-007**: Unhandled errors in both frontend and backend are captured by the error tracking service within 5 seconds of occurrence, with full context.
- **SC-008**: The monorepo builds and deploys successfully to Easypanel with the same container-based workflow used today.
- **SC-009**: A new developer can set up the local development environment and run all services within 15 minutes following documentation.
- **SC-010**: Background jobs (image generation, indexing) complete with the same reliability and throughput as the current queue-based system.
- **SC-011**: The shared schema package eliminates type mismatches between frontend and backend, with zero runtime validation errors caused by contract drift.

## Clarifications

### Session 2026-02-07

- Q: Where will the migrated system be deployed in production? → A: Easypanel (current platform). CI/CD pipelines are out of scope for this migration.
- Q: What downtime is acceptable during the cutover from old to new system? → A: Maintenance window of up to 2 hours, allowing full validation before going live. Old system is stopped, data validated, new system brought online.
- Q: What is the expected number of concurrent users? → A: Less than 100 concurrent users currently. No need for complex horizontal scaling.

## Assumptions

- The existing database schema is kept as-is. No database migration or schema changes are required as part of this feature.
- Supabase Auth continues to be used for authentication. The migration does not change the auth provider.
- The design system (Ethereal Blue + Liquid Glass) is ported faithfully, not redesigned.
- All external service integrations (fal.ai, OpenRouter, Anthropic, Brevo email) maintain the same API contracts.
- Redis continues to be used for caching and job queues, replacing Celery with the new queue system.
- The migration is done on a separate branch and can coexist with the current codebase during development.
- Feature flags or gradual rollout are not needed; the migration is a complete cutover with a maintenance window of up to 2 hours for validation.
- Existing E2E tests can be adapted to run against the new frontend with minimal changes.
- The current reference directories and spec files are documentation only and do not need migration.
- Container orchestration is used for local development; production deploys to Easypanel (current platform).
- CI/CD pipelines (GitHub Actions, automated testing on PR) are out of scope for this migration and will be added as a separate feature.
- The migration strategy is a full rewrite on a parallel branch, not an incremental in-place migration.
- Expected concurrent users is less than 100. Horizontal scaling and complex load balancing are not required.
