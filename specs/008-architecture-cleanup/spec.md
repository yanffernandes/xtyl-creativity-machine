# Feature Specification: Architecture Cleanup for Hybrid Supabase Migration

**Feature Branch**: `008-architecture-cleanup`
**Created**: 2025-11-28
**Status**: Completed
**Completed**: 2025-11-28
**Input**: User description: "Review and clean up project files for new hybrid architecture (Supabase, Cloudflare R2) - remove outdated MD files, shell scripts, docker compose configurations, and other files that no longer align with the hybrid Supabase architecture"

## Clarifications

### Session 2025-11-28

- Q: Should MinIO configurations be completely removed, or kept as an optional legacy/local development fallback? → A: Remove completely - Delete all MinIO references from active configs and docs

## Problem Statement

Following the migration to the hybrid Supabase architecture (feature 007), the codebase contains numerous outdated files, configurations, and documentation that reference the old architecture:

- **MinIO references**: Multiple files still reference MinIO storage (replaced by Cloudflare R2 in production, Supabase Storage for files)
- **Old authentication patterns**: References to custom Python JWT authentication (replaced by Supabase Auth)
- **Outdated docker-compose files**: Development and infrastructure compose files still configure local PostgreSQL and MinIO
- **Stale documentation**: README, QUICKSTART, DEPLOYMENT guides contain outdated setup instructions
- **Inconsistent environment templates**: `.env.example` missing Supabase configuration, contains deprecated MinIO variables

This creates confusion for developers, increases onboarding friction, and risks incorrect deployments.

## Proposed Solution

Perform a comprehensive cleanup of the codebase to align all configuration files, documentation, and scripts with the hybrid Supabase architecture:

1. Update or remove outdated docker-compose configurations
2. Consolidate environment variable templates
3. Update all user-facing documentation
4. Mark historical specification files appropriately
5. Remove deprecated shell scripts or update them for new architecture

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Clean Development Environment Setup (Priority: P1)

As a new developer joining the project, I want clear and accurate setup instructions, so I can get the development environment running without confusion from outdated references.

**Why this priority**: Onboarding efficiency directly impacts team productivity. Every new developer will encounter these files.

**Independent Test**: Follow the updated README/QUICKSTART from scratch on a clean machine and successfully run the application without encountering MinIO or deprecated service errors.

**Acceptance Scenarios**:

1. **Given** a new developer with no prior context, **When** they follow README instructions, **Then** they successfully run the application using Supabase and the correct storage backend
2. **Given** a developer running `./dev.sh`, **When** they execute the script, **Then** only relevant services start without errors about missing MinIO or deprecated auth
3. **Given** a developer checking `.env.example`, **When** they copy it to `.env`, **Then** all required Supabase variables are documented and MinIO variables are removed or marked as deprecated

---

### User Story 2 - Accurate Production Deployment (Priority: P1)

As a DevOps engineer, I want deployment documentation and docker-compose files that accurately reflect the production architecture, so I can deploy without risk of misconfiguration.

**Why this priority**: Incorrect production deployments can cause outages and data loss. Critical path documentation must be accurate.

**Independent Test**: Deploy to production using updated documentation and verify all services connect correctly to Supabase and R2.

**Acceptance Scenarios**:

1. **Given** a DevOps engineer using `docker-compose.prod.yml`, **When** they deploy, **Then** the application connects to Supabase PostgreSQL and Cloudflare R2 (not MinIO)
2. **Given** a DevOps engineer reading DEPLOYMENT.md, **When** they follow the checklist, **Then** all environment variables mentioned exist and are necessary for the hybrid architecture
3. **Given** a production deployment, **When** checking service dependencies, **Then** no MinIO or local PostgreSQL containers are required

---

### User Story 3 - Clear Project History (Priority: P2)

As a developer reviewing project history, I want historical specification files clearly marked, so I understand which documents are current versus archived.

**Why this priority**: Prevents developers from implementing based on outdated specifications. Important but less critical than active documentation.

**Independent Test**: Browse specs folder and immediately identify which specifications are current, completed, or superseded.

**Acceptance Scenarios**:

1. **Given** a developer exploring `specs/` folder, **When** they open any historical spec, **Then** the status clearly indicates "Completed" or "Superseded by [newer spec]"
2. **Given** a developer searching for architecture guidance, **When** they look for current documentation, **Then** only `007-hybrid-supabase-architecture` and newer are marked as active

---

### User Story 4 - Consistent Development Scripts (Priority: P2)

As a developer, I want development scripts that work consistently with the new architecture, so I don't accidentally start deprecated services.

**Why this priority**: Script consistency prevents wasted debugging time. Important for daily development workflow.

**Independent Test**: Run each development script and verify they start only the services needed for hybrid architecture.

**Acceptance Scenarios**:

1. **Given** a developer running `./dev.sh`, **When** they use any documented command, **Then** MinIO services do not start unless explicitly requested for legacy testing
2. **Given** a developer using `start-dev.sh`, **When** they execute it, **Then** it either works with current architecture or is removed/marked deprecated

---

### Edge Cases

- What happens if a developer needs to run the old architecture for testing? Old architecture is no longer supported; developers must use the hybrid Supabase architecture. Historical git commits can be referenced if needed.
- How does the system handle partially migrated environments? Clear migration guide should document the transition path; partial states are not supported after cleanup.
- What if Supabase is unreachable during development? Documentation should include instructions for Supabase local development setup (supabase CLI) as the fallback, not MinIO.

## Requirements *(mandatory)*

### Functional Requirements

#### Docker/Compose Configuration

- **FR-001**: System MUST completely remove MinIO service definitions from all docker-compose files
- **FR-002**: System MUST update `docker-compose.dev.yml` to reference Supabase for database operations
- **FR-003**: System MUST mark `docker-compose.infra.yml` as deprecated/legacy with clear documentation
- **FR-004**: System MUST ensure `docker-compose.prod.yml` remains the canonical production configuration (already correct)

#### Environment Configuration

- **FR-005**: System MUST update `.env.example` to include all Supabase configuration variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
- **FR-006**: System MUST completely remove MinIO variables (MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY) from all environment templates
- **FR-007**: System MUST document R2 configuration variables for production storage

#### Documentation Updates

- **FR-008**: README.md MUST be updated to remove MinIO references and document Supabase-first development
- **FR-009**: QUICKSTART.md MUST reflect the hybrid architecture setup process
- **FR-010**: DEPLOYMENT.md MUST be updated with correct production architecture (Supabase + R2)
- **FR-011**: TROUBLESHOOTING.md MUST remove MinIO troubleshooting and add Supabase-specific guidance
- **FR-012**: WORKFLOW_SETUP.md MUST update prerequisites to reflect current architecture
- **FR-013**: CLAUDE.md MUST be updated to remove outdated MinIO references and reflect current architecture

#### Shell Scripts

- **FR-014**: `dev.sh` MUST clearly separate legacy infrastructure commands from current development workflow
- **FR-015**: `start-dev.sh` MUST be either updated for hybrid architecture or removed if redundant
- **FR-016**: All scripts MUST include comments indicating which architecture they support

#### Specification Files

- **FR-017**: Historical specifications (002-006) MUST have their status updated to "Completed" or "Superseded"
- **FR-018**: Each superseded spec MUST reference the succeeding specification
- **FR-019**: Active specifications MUST be clearly identifiable by status field

### Key Entities

- **Configuration File**: Docker-compose, environment template, or config file that defines service setup. Belongs to a specific architecture version.
- **Documentation File**: User-facing markdown file explaining setup, deployment, or troubleshooting. Must accurately reflect current architecture.
- **Specification File**: Feature specification document with status (Draft, Active, Completed, Superseded). Defines implementation requirements.
- **Development Script**: Shell script automating development tasks. Must work with current architecture without errors.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: New developers can set up development environment in under 30 minutes following documentation
- **SC-002**: Zero mentions of MinIO in active configuration files (docker-compose.prod.yml, .env.production.example)
- **SC-003**: All user-facing documentation (README, QUICKSTART, DEPLOYMENT) accurately reflects hybrid Supabase architecture
- **SC-004**: 100% of historical specifications (002-006) have clear status indicating completion or supersession
- **SC-005**: Development scripts execute without errors related to missing MinIO or deprecated services
- **SC-006**: Production deployment checklist in DEPLOYMENT.md matches actual requirements (Supabase, R2, no MinIO)
- **SC-007**: Environment template completeness: all required variables for hybrid architecture are documented

## Assumptions

- The hybrid Supabase architecture (007) is the canonical target architecture
- MinIO will be completely removed from all active configurations (no legacy fallback retained)
- Cloudflare R2 is the production object storage solution
- Supabase provides authentication, database, and optional file storage
- Historical specification files should be preserved for reference but clearly marked
- `docker-compose.prod.yml` already correctly reflects production architecture

## Dependencies

- Completion of 007-hybrid-supabase-architecture migration
- Access to current Supabase project configuration
- Knowledge of Cloudflare R2 configuration requirements
- Understanding of which development scripts are actively used

## Out of Scope

- Implementing new features beyond cleanup
- Changes to application code or business logic
- Database schema modifications
- New integrations or service additions
- Performance optimizations
- CI/CD pipeline changes (unless documentation-only)
