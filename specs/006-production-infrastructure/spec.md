# Feature Specification: Production Infrastructure Migration

**Feature Branch**: `006-production-infrastructure`
**Created**: 2025-11-28
**Status**: Superseded
**Superseded by**: [007-hybrid-supabase-architecture](../007-hybrid-supabase-architecture/spec.md)
**Note**: This specification has been superseded. The hybrid Supabase architecture in spec 007 replaces the infrastructure approach defined here.
**Input**: User description: "Migrar infraestrutura para produção: Supabase (PostgreSQL + Auth), Cloudflare R2 (storage), Docker Compose no Easypanel (backend, frontend, celery, redis)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - System Deployment (Priority: P1)

The development team needs to deploy the entire system to production using Easypanel with external managed services for data persistence. The system must start correctly with all services connected and operational.

**Why this priority**: Without successful deployment, no other feature works. This is the foundation for all production operations.

**Independent Test**: Can be fully tested by deploying the Docker Compose stack to Easypanel and verifying all health checks pass. Delivers production-ready infrastructure.

**Acceptance Scenarios**:

1. **Given** the docker-compose.prod.yml file is configured, **When** deployed to Easypanel, **Then** frontend, backend, celery worker, and redis containers start successfully
2. **Given** environment variables are set for Supabase and R2, **When** backend starts, **Then** it connects to Supabase PostgreSQL and Cloudflare R2 without errors
3. **Given** all services are running, **When** health checks are executed, **Then** all services report healthy status

---

### User Story 2 - User Authentication via Supabase (Priority: P1)

Users need to authenticate using Supabase Auth instead of the custom JWT implementation. This includes login, registration, password reset, and session management.

**Why this priority**: Authentication is critical for all protected features. Must work before any user can access the system.

**Independent Test**: Can be tested by creating a new user via Supabase Auth UI, logging in through the frontend, and accessing protected routes.

**Acceptance Scenarios**:

1. **Given** a user visits the login page, **When** they enter valid credentials, **Then** Supabase Auth authenticates them and the frontend stores the session
2. **Given** a new user visits the registration page, **When** they complete the form, **Then** Supabase creates the user account and grants immediate access (no email verification required)
3. **Given** a logged-in user, **When** their session expires, **Then** the system automatically refreshes the token or redirects to login
4. **Given** a user requests password reset, **When** they click the email link, **Then** they can set a new password via Supabase

---

### User Story 3 - File Storage via Cloudflare R2 (Priority: P1)

The system stores generated images, uploaded documents, and other files in Cloudflare R2 instead of MinIO. All existing storage operations must work seamlessly.

**Why this priority**: File storage is required for core features like image generation and document uploads.

**Independent Test**: Can be tested by uploading an image through the workflow system and verifying it's stored in R2 and accessible via public URL.

**Acceptance Scenarios**:

1. **Given** a workflow generates an image, **When** the image is saved, **Then** it uploads to Cloudflare R2 bucket and returns a public URL
2. **Given** a user uploads a document, **When** the upload completes, **Then** the file is stored in R2 with correct content type
3. **Given** a file exists in R2, **When** accessed via the returned URL, **Then** the file downloads correctly

---

### User Story 4 - Backend Auth Validation (Priority: P2)

The backend needs to validate Supabase JWT tokens on all protected endpoints and associate requests with the correct user.

**Why this priority**: Depends on User Story 2. Backend must validate tokens to secure API endpoints.

**Independent Test**: Can be tested by sending API requests with valid/invalid Supabase tokens and verifying access control.

**Acceptance Scenarios**:

1. **Given** a request with valid Supabase JWT, **When** sent to a protected endpoint, **Then** the backend validates the token and allows access
2. **Given** a request with expired/invalid token, **When** sent to a protected endpoint, **Then** the backend returns 401 Unauthorized
3. **Given** a valid token, **When** the backend extracts user info, **Then** it correctly identifies the user for database operations

---

### User Story 5 - Database Connection to Supabase (Priority: P1)

The backend connects to Supabase PostgreSQL using the provided connection string. All existing database operations work without modification.

**Why this priority**: Database connectivity is foundational for all data operations.

**Independent Test**: Can be tested by running database migrations and performing CRUD operations on existing tables.

**Acceptance Scenarios**:

1. **Given** Supabase DATABASE_URL is configured, **When** backend starts, **Then** SQLAlchemy connects successfully
2. **Given** existing models (User, Project, Workflow, etc.), **When** database migrations run, **Then** tables are created in Supabase PostgreSQL
3. **Given** pgvector extension requirement, **When** connecting to Supabase, **Then** vector operations work correctly for RAG features

---

### Edge Cases

- What happens when Supabase connection fails? System should fail gracefully with clear error messages
- What happens when R2 upload fails mid-transfer? Backend should retry or return appropriate error
- What happens when Supabase Auth token refresh fails? Frontend should redirect to login
- What happens when pgvector extension is not enabled? Migration should fail with clear instructions
- What happens during deploy if Redis data is lost? System recovers - only cache and queue data affected

## Requirements *(mandatory)*

### Functional Requirements

#### Infrastructure (Docker Compose)
- **FR-001**: System MUST deploy via docker-compose.prod.yml with only: frontend, backend, celery-worker, redis services
- **FR-002**: System MUST NOT include PostgreSQL or MinIO containers in production compose
- **FR-003**: System MUST support environment variable configuration for all external service connections
- **FR-004**: System MUST include health checks for all Docker services

#### Supabase PostgreSQL
- **FR-005**: Backend MUST connect to Supabase PostgreSQL via DATABASE_URL environment variable
- **FR-006**: System MUST support pgvector extension for RAG/embedding features
- **FR-007**: All existing SQLAlchemy models MUST work without modification
- **FR-008**: Database migrations MUST run successfully against Supabase PostgreSQL

#### Supabase Auth
- **FR-009**: Frontend MUST use Supabase Auth SDK for login, registration, and password reset
- **FR-010**: Frontend MUST store Supabase session and handle token refresh automatically
- **FR-011**: Backend MUST validate Supabase JWT tokens on all protected endpoints
- **FR-012**: Backend MUST extract user ID from Supabase token for database operations
- **FR-013**: System MUST remove the custom auth implementation (auth.py, /auth/* endpoints)
- **FR-014**: System MUST use Supabase database trigger to automatically create public.users record when auth.users entry is created (no backend sync logic required)

#### Cloudflare R2 Storage
- **FR-015**: Backend MUST use S3-compatible SDK to connect to Cloudflare R2
- **FR-016**: System MUST configure R2 endpoint, access key, secret key, and bucket via environment variables
- **FR-017**: All file upload operations MUST store files in R2 bucket
- **FR-018**: System MUST configure R2 bucket as public and generate direct public URLs for stored files (no presigned URLs required)
- **FR-019**: System MUST support the same operations as MinIO: upload, download, delete, list, presigned URLs

#### Environment Configuration
- **FR-020**: System MUST document all required environment variables for production
- **FR-021**: System MUST provide example .env.production file with all variables
- **FR-022**: System MUST validate critical environment variables on startup

### Key Entities

- **User**: Authenticated via Supabase Auth, synced to application database for additional fields
- **Session**: Managed by Supabase Auth, tokens validated by backend
- **StoredFile**: File metadata stored in database, actual file in Cloudflare R2
- **Environment Config**: Connection strings and API keys for external services

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: System deploys to Easypanel and all services report healthy within 5 minutes
- **SC-002**: Users can register, login, and logout using Supabase Auth
- **SC-003**: All protected API endpoints correctly validate Supabase tokens
- **SC-004**: File uploads complete successfully and files are accessible via public URLs
- **SC-005**: Existing workflows (text generation, image generation) work without modification to business logic
- **SC-006**: Database queries perform equivalently to local PostgreSQL (response time within 200ms for standard operations)
- **SC-007**: System handles 100 concurrent users without degradation
- **SC-008**: Zero data loss during deployment - all uploads persist in R2, all data persists in Supabase

## Clarifications

### Session 2025-11-28

- Q: How should Supabase Auth users sync with application users table? → A: Supabase trigger on auth.users creates record in public.users automatically (no backend sync needed)
- Q: How should R2 files be accessed? → A: Public bucket - all files publicly accessible via direct URL
- Q: Should email verification be required for registration? → A: Disabled - users can access immediately after registration

## Assumptions

- Supabase project already created with PostgreSQL database
- pgvector extension enabled in Supabase (requires enabling via Supabase dashboard)
- Cloudflare R2 bucket already created with API credentials generated
- Easypanel server provisioned with Docker support
- Domain and SSL certificates managed by Easypanel
- Email service (Brevo) configuration remains unchanged
- OpenRouter and Tavily API keys remain unchanged

## Out of Scope

- Data migration from existing local database (no production data exists yet)
- Multi-region deployment
- Auto-scaling configuration
- CI/CD pipeline setup
- Monitoring and alerting setup (can be added later)
- Rate limiting and DDoS protection (handled by Cloudflare)
