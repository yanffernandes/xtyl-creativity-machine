# Feature Specification: Hybrid Supabase Architecture Migration

**Feature Branch**: `007-hybrid-supabase-architecture`
**Created**: 2025-11-28
**Status**: Draft
**Input**: Migrate to hybrid architecture: Supabase Client for CRUD operations (Workspaces, Projects, Documents, Folders, Templates, User Preferences, Conversations), Python Backend for AI/LLM operations (Chat, Image Generation, Workflow Execution, RAG/Embeddings)

## Clarifications

### Session 2025-11-28

- Q: Migration strategy for transitioning CRUD endpoints? → A: Big-bang migration (all CRUD endpoints migrated at once)
- Q: What to do with deprecated Python backend CRUD routes? → A: Remove immediately after migration

## Problem Statement

The current architecture routes all requests through a Python backend intermediary before reaching the Supabase PostgreSQL database. This creates:

- **High latency** (~seconds) for simple CRUD operations
- **Unnecessary overhead**: JWT validation, user lookup, query execution, serialization for every request
- **Poor user experience**: Project listing and document operations feel sluggish

## Proposed Solution

Implement a hybrid architecture where:
- **Frontend → Supabase Client**: Direct database access for CRUD operations (~50-100ms latency)
- **Frontend → Python Backend**: AI/LLM operations requiring secrets and complex logic
- **Migration Strategy**: Big-bang approach - all CRUD endpoints migrated simultaneously to Supabase Client
- **Backend Cleanup**: Remove deprecated CRUD routes from Python backend immediately after migration

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fast Project Listing (Priority: P1)

As a user, I want to see my projects instantly when I navigate to the workspace, so I don't have to wait several seconds for the page to load.

**Why this priority**: This is the most frequently used operation and the main pain point. Every user session starts with viewing projects.

**Independent Test**: Navigate to workspace page and measure time to display projects. Can be fully tested by logging in and accessing any workspace - delivers immediate performance improvement.

**Acceptance Scenarios**:

1. **Given** a logged-in user with 10+ projects, **When** they navigate to the workspace, **Then** projects display within 500ms
2. **Given** a logged-in user, **When** they refresh the workspace page, **Then** cached data displays immediately while fresh data loads in background
3. **Given** a user on slow connection (3G), **When** they access the workspace, **Then** skeleton loaders show within 100ms and projects load within 2 seconds

---

### User Story 2 - Responsive Document Management (Priority: P1)

As a user, I want to create, edit, and organize documents without noticeable delays, so I can maintain my creative flow.

**Why this priority**: Document operations are core to the product. Users create and edit documents constantly throughout their session.

**Independent Test**: Create a new document and verify it appears in the list immediately. Edit document metadata and confirm instant UI update.

**Acceptance Scenarios**:

1. **Given** a user in a project, **When** they create a new document, **Then** the document appears in the list within 200ms
2. **Given** a user editing a document title, **When** they save changes, **Then** the updated title reflects immediately in all views
3. **Given** a user moving a document to a folder, **When** they complete the drag operation, **Then** the document moves instantly with visual feedback

---

### User Story 3 - Seamless AI Operations (Priority: P2)

As a user, I want AI chat and image generation to work reliably without the system feeling slow or broken, so I can trust the creative AI features.

**Why this priority**: AI features are the product differentiator but depend on external APIs. They should remain performant through the Python backend.

**Independent Test**: Start an AI chat conversation and verify streaming responses. Generate an image and confirm progress feedback.

**Acceptance Scenarios**:

1. **Given** a user in the chat interface, **When** they send a message, **Then** AI response begins streaming within 2 seconds
2. **Given** a user requesting image generation, **When** they submit the request, **Then** progress indicator shows and image appears within expected generation time
3. **Given** a user running a workflow with AI nodes, **When** execution starts, **Then** real-time progress updates via SSE

---

### User Story 4 - Folder Organization (Priority: P2)

As a user, I want to create and manage folders instantly, so I can organize my content efficiently.

**Why this priority**: Folder operations are frequent but secondary to document operations.

**Independent Test**: Create a folder and verify it appears immediately. Move items between folders and confirm instant updates.

**Acceptance Scenarios**:

1. **Given** a user in a project, **When** they create a new folder, **Then** the folder appears within 200ms
2. **Given** a user renaming a folder, **When** they confirm the change, **Then** the new name displays immediately
3. **Given** a user with nested folders, **When** they navigate between folders, **Then** contents load within 300ms

---

### User Story 5 - Template Access (Priority: P3)

As a user, I want to browse and use templates quickly, so I can start new content from proven starting points.

**Why this priority**: Templates are used periodically, not constantly. Performance improvement is valuable but not critical.

**Independent Test**: Open templates panel and verify templates load quickly. Use a template to create a document.

**Acceptance Scenarios**:

1. **Given** a user opening templates, **When** the templates panel loads, **Then** system and user templates display within 400ms
2. **Given** a user selecting a template, **When** they apply it, **Then** new document creates with template content within 500ms

---

### User Story 6 - User Preferences (Priority: P3)

As a user, I want my settings and preferences to save instantly, so I have confidence my customizations are preserved.

**Why this priority**: Settings changes are infrequent but users expect immediate confirmation.

**Independent Test**: Change a preference setting and verify it persists across page refresh.

**Acceptance Scenarios**:

1. **Given** a user changing a preference, **When** they save, **Then** confirmation appears within 200ms
2. **Given** a user with custom preferences, **When** they log in on another device, **Then** preferences apply immediately

---

### Edge Cases

- What happens when Supabase service is temporarily unavailable? System shows graceful error message and retries automatically.
- How does system handle concurrent edits to the same document from different devices? Last-write-wins with conflict notification to user.
- What happens when a user's session expires during a long editing session? System preserves local changes and prompts re-authentication.
- How does the system handle Row Level Security (RLS) policy violations? Clear error message without exposing security details.
- What happens when Python backend is down but CRUD operations still work? AI features show "temporarily unavailable" but CRUD continues functioning.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to perform all workspace operations (list, create, update, delete) directly through Supabase Client
- **FR-002**: System MUST allow users to perform all project operations (list, create, update, delete, archive) directly through Supabase Client
- **FR-003**: System MUST allow users to perform all document CRUD operations (list, create, read, update, delete, move, archive) directly through Supabase Client
- **FR-004**: System MUST allow users to perform all folder operations (create, rename, move, delete, restore) directly through Supabase Client
- **FR-005**: System MUST allow users to manage templates (list, create, update, delete user templates; list system templates) directly through Supabase Client
- **FR-006**: System MUST store and retrieve user preferences directly through Supabase Client
- **FR-007**: System MUST list and manage conversation metadata (list, archive, delete) directly through Supabase Client
- **FR-008**: System MUST route all AI chat operations through Python backend to protect API keys
- **FR-009**: System MUST route all image generation operations through Python backend to protect API keys
- **FR-010**: System MUST route all workflow execution operations through Python backend for complex orchestration and SSE streaming
- **FR-011**: System MUST route all RAG/embedding operations through Python backend for vector search
- **FR-012**: System MUST enforce Row Level Security policies ensuring users can only access their own data
- **FR-013**: System MUST maintain file uploads through Supabase Storage with proper access controls
- **FR-014**: System MUST support real-time updates for collaborative scenarios using Supabase Realtime subscriptions
- **FR-015**: System MUST migrate all CRUD endpoints simultaneously (big-bang migration strategy)
- **FR-016**: System MUST remove deprecated CRUD routes from Python backend immediately after migration

### Security Requirements

- **SR-001**: All Supabase Client operations MUST use authenticated user JWT tokens
- **SR-002**: RLS policies MUST enforce workspace membership for all data access
- **SR-003**: API keys for OpenRouter/LLM services MUST remain exclusively on Python backend
- **SR-004**: Python backend MUST validate JWT tokens for all AI/LLM endpoints
- **SR-005**: File storage MUST enforce access controls matching document ownership

### Key Entities

- **Workspace**: Container for projects and team collaboration. Users access through membership.
- **Project**: Container for documents and folders within a workspace.
- **Document**: Core content entity (text or image). Belongs to project, optionally to folder.
- **Folder**: Organizational container within a project. Supports nesting.
- **Template**: Reusable content starting point. Can be system-wide or user-specific.
- **User Preferences**: User-specific settings for AI assistant behavior and defaults.
- **Conversation**: Chat history metadata. Content tied to project context.
- **Workspace Member**: Association between user and workspace with role/permissions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Project listing displays within 500ms (down from current ~3-5 seconds)
- **SC-002**: Document CRUD operations complete within 300ms average
- **SC-003**: Folder operations complete within 200ms average
- **SC-004**: 95% of CRUD operations succeed without retry
- **SC-005**: Users report satisfaction improvement in app responsiveness (qualitative feedback)
- **SC-006**: AI features maintain current response times (no degradation from architecture change)
- **SC-007**: System supports 100+ concurrent users per workspace without performance degradation
- **SC-008**: Zero security vulnerabilities from data exposure (validated through security audit)

## Assumptions

- Supabase PostgREST and RLS provide sufficient performance for expected load
- Current database schema is compatible with RLS policy enforcement
- Frontend team has experience with Supabase JavaScript client
- Existing JWT tokens from Supabase Auth are valid for direct database access
- File storage migration to Supabase Storage is acceptable
- Real-time features via Supabase Realtime are optional but valuable

## Dependencies

- Supabase project with RLS enabled
- Database schema supports `auth.uid()` references for RLS policies
- Frontend access to Supabase project URL and anon key
- Python backend maintains OpenRouter API key securely

## Out of Scope

- Migration of existing data (schema already in Supabase)
- Changes to AI/LLM functionality or models
- New features beyond architecture migration
- Mobile app changes (if any)
- Analytics or usage tracking changes
