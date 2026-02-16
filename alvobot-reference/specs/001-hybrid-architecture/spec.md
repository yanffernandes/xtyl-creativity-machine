# Feature Specification: Hybrid Architecture Migration

**Feature Branch**: `001-hybrid-architecture`
**Created**: 2025-12-04
**Status**: ✅ Implementado
**Input**: User description: "Migração para arquitetura híbrida com monorepo frontend/backend mantendo funcionalidades existentes do WeWeb"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Existing Features Continue Working (Priority: P1)

As a user of the AlvoBot system, I need all current features (blogs, projects, articles, keyword mining, auth) to continue working exactly as they do today without any interruption or changes to my workflow.

**Why this priority**: This is the foundation - if existing features break, the entire migration fails. Zero downtime and zero feature regression is critical for user trust and business continuity.

**Independent Test**: Can be fully tested by running through all existing user workflows (create blog, manage projects, write articles, run keyword mining) and verifying identical behavior before and after migration.

**Acceptance Scenarios**:

1. **Given** the system is migrated to monorepo structure, **When** I log in with existing credentials, **Then** authentication works identically to before
2. **Given** I have existing blogs and projects, **When** I access the dashboard, **Then** all data displays correctly
3. **Given** I create a new blog post, **When** I save it, **Then** it saves to Supabase directly without backend involvement
4. **Given** I run keyword mining (10x), **When** the process completes, **Then** results are identical to pre-migration behavior
5. **Given** I use Artigos Flecha feature, **When** I generate content, **Then** it functions exactly as before
6. **Given** I upload files to storage, **When** upload completes, **Then** files are accessible via Supabase Storage as before

---

### User Story 2 - Monorepo Structure Established (Priority: P1)

As a developer, I need the codebase organized into a monorepo with separate frontend and backend directories so that I can develop and deploy both parts independently while maintaining code organization.

**Why this priority**: This is the structural foundation required before any new backend features can be added. Without this, the hybrid architecture cannot exist.

**Independent Test**: Can be fully tested by verifying directory structure exists, both frontend and backend can run independently, and Docker Compose orchestrates all services correctly.

**Acceptance Scenarios**:

1. **Given** the monorepo structure is created, **When** I navigate to the project root, **Then** I see frontend/, backend/, and docker-compose.yml directories
2. **Given** the frontend code is moved to /frontend, **When** I run the frontend in development mode, **Then** it starts without errors
3. **Given** the backend structure exists, **When** I run backend health check, **Then** it responds successfully
4. **Given** Docker Compose is configured, **When** I run docker-compose up, **Then** all services (frontend, backend, redis) start successfully
5. **Given** environment variables are documented, **When** I review .env.example, **Then** all required variables for both frontend and backend are listed

---

### User Story 3 - Backend Foundation Ready (Priority: P2)

As a developer, I need a functional NestJS backend with health checks, Supabase connection, and authentication validation so that I can start building complex integrations and features.

**Why this priority**: This enables future development of complex features like OAuth integrations, webhooks, and automated workflows. It's the platform for all future enhancements.

**Independent Test**: Can be fully tested by calling backend health endpoint, validating a Supabase JWT token, and confirming Supabase SDK connection works.

**Acceptance Scenarios**:

1. **Given** backend is running, **When** I call GET /health, **Then** I receive a 200 OK response
2. **Given** I have a valid Supabase JWT token, **When** I call POST /auth/validate with the token, **Then** the backend validates it successfully
3. **Given** backend connects to Supabase, **When** backend queries the database, **Then** it retrieves data successfully
4. **Given** Redis is configured, **When** backend attempts to connect to Redis, **Then** connection succeeds
5. **Given** Swagger/OpenAPI is configured, **When** I navigate to /api/docs, **Then** API documentation displays correctly
6. **Given** BullMQ is configured, **When** I check queue connections, **Then** Redis queue is accessible

---

### User Story 4 - Production Deployment Configured (Priority: P2)

As a DevOps engineer, I need Docker Compose configuration for EasyPanel deployment so that I can deploy the application to production with frontend, backend, and Redis running reliably.

**Why this priority**: Production readiness is essential before adding new features. This ensures the infrastructure can support the hybrid architecture in production.

**Independent Test**: Can be fully tested by deploying to EasyPanel, verifying all services are running, and confirming frontend and backend are accessible via their respective domains.

**Acceptance Scenarios**:

1. **Given** Docker Compose is configured, **When** I deploy to EasyPanel, **Then** all services start successfully
2. **Given** frontend is deployed, **When** I access app.alvobot.ai, **Then** the application loads correctly
3. **Given** backend is deployed, **When** I access api.alvobot.ai/health, **Then** health check responds successfully
4. **Given** Redis is deployed, **When** backend connects to Redis, **Then** connection is established
5. **Given** environment variables are set, **When** services start, **Then** all configuration is loaded correctly
6. **Given** volumes are configured, **When** Redis stores data, **Then** data persists across container restarts

---

### User Story 5 - Foundation for Complex Features (Priority: P3)

As a product manager, I need the backend infrastructure ready to support complex integrations (Meta Ads, Google Ads, webhooks, automated workflows) so that I can plan and implement advanced features in the future.

**Why this priority**: This is the enabler for future value. While not immediately delivering user value, it sets up the capability to add high-value features that require backend processing.

**Independent Test**: Can be fully tested by implementing a simple proof-of-concept integration (e.g., a test webhook receiver) and confirming the backend can handle OAuth flows, async jobs, and external API calls.

**Acceptance Scenarios**:

1. **Given** backend auth guard is implemented, **When** a request with invalid token is made, **Then** it is rejected with 401 Unauthorized
2. **Given** BullMQ worker is configured, **When** a job is queued, **Then** worker processes it asynchronously
3. **Given** error handling is implemented, **When** an error occurs, **Then** appropriate error response is returned with logging
4. **Given** logging is configured, **When** backend processes requests, **Then** logs are captured and accessible
5. **Given** Prisma is configured, **When** backend queries Supabase via Prisma, **Then** queries execute successfully

---

### Edge Cases

- What happens when frontend tries to call backend endpoints before backend is deployed (during Phase 0)?
- How does the system handle Supabase connection failures during backend initialization?
- What happens if Docker Compose services start in the wrong order (e.g., backend before Redis)?
- How does the system handle environment variables missing during deployment?
- What happens when Redis container restarts and loses in-memory data?
- How does the frontend behave if backend health check fails in production?
- What happens to existing user sessions during the migration to monorepo?
- How does the system handle database schema mismatches between Prisma and actual Supabase schema?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain 100% functionality of all existing features during and after migration (blogs, projects, articles, keyword mining, auth, storage, realtime)
- **FR-002**: Frontend MUST continue connecting directly to Supabase for all CRUD operations without routing through backend
- **FR-003**: Backend MUST provide health check endpoint at /health that returns service status
- **FR-004**: Backend MUST validate Supabase JWT tokens to authenticate requests
- **FR-005**: Backend MUST connect to Supabase PostgreSQL database using Prisma ORM
- **FR-006**: Backend MUST connect to Redis for caching and job queue functionality
- **FR-007**: Backend MUST implement BullMQ for asynchronous job processing
- **FR-008**: Backend MUST generate automatic API documentation via Swagger/OpenAPI
- **FR-009**: Docker Compose MUST orchestrate frontend (Nginx), backend (Node.js), and Redis services
- **FR-010**: Frontend MUST be deployable as static assets served by Nginx
- **FR-011**: Frontend MUST maintain environment variable configuration for Supabase URL and keys
- **FR-012**: Backend MUST implement structured logging for debugging and monitoring
- **FR-013**: Backend MUST implement centralized error handling with appropriate HTTP status codes
- **FR-014**: System MUST support separate development and production environment configurations
- **FR-015**: Frontend MUST remain in JavaScript (no TypeScript migration required in this phase)
- **FR-016**: Backend MUST be implemented in TypeScript with NestJS framework
- **FR-017**: All WeWeb exported code MUST be preserved in the frontend directory as reference
- **FR-018**: Docker Compose MUST configure Redis with persistent volume for data retention
- **FR-019**: Backend MUST expose CORS configuration to allow frontend access
- **FR-020**: System MUST support health check endpoints for monitoring service availability

### Key Entities

- **Monorepo Structure**: Root directory containing frontend/, backend/, docker-compose.yml, and shared configuration
- **Frontend Service**: Vue.js 3 application with WeWeb components, connects directly to Supabase for data operations
- **Backend Service**: NestJS application providing health checks, auth validation, and foundation for future complex features
- **Redis Service**: Cache and queue storage for backend async processing
- **Docker Configuration**: Orchestration definitions for all services with environment variables and networking
- **Environment Configuration**: Centralized environment variable management for Supabase credentials, API URLs, and service configuration

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All existing user workflows complete successfully after migration with identical behavior to pre-migration
- **SC-002**: Frontend application builds and deploys without errors in under 5 minutes
- **SC-003**: Backend health check responds within 200ms with status 200 OK
- **SC-004**: Docker Compose starts all services successfully in under 2 minutes
- **SC-005**: Frontend remains accessible with zero downtime during migration process
- **SC-006**: Backend validates 100 Supabase JWT tokens per second without performance degradation
- **SC-007**: System supports at least 1000 concurrent users with response times under 2 seconds
- **SC-008**: Backend successfully connects to Supabase database and executes queries within 100ms
- **SC-009**: Redis connection establishes successfully within 5 seconds of backend startup
- **SC-010**: All WeWeb components and helpers remain functional post-migration
- **SC-011**: Developers can run both frontend and backend locally with single docker-compose command
- **SC-012**: Backend API documentation is automatically generated and accessible via browser
