# Feature Specification: Performance Optimization & System Speed Improvements

**Feature Branch**: `030-performance-optimization`
**Created**: 2026-01-25
**Status**: Draft
**Input**: Comprehensive performance optimization across frontend and backend to improve system responsiveness, reduce unnecessary re-renders, optimize database queries, and implement proper caching strategies.

## Clarifications

### Session 2026-01-25

- Q: Is Redis a hard requirement for distributed progress tracking (FR-026), or optional with fallback? → A: Redis is a hard requirement for this feature
- Q: How will performance improvements be measured and monitored? → A: Use existing Sentry integration for performance monitoring (transactions, query timing, Web Vitals)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Faster Page Navigation (Priority: P1)

As a user navigating between project views (Kanban, Studio, Documents), I want page transitions to feel instant so that my workflow is not interrupted by loading states.

**Why this priority**: Page navigation is the most frequent user action. Slow transitions cause frustration and reduce productivity. This impacts every user on every session.

**Independent Test**: Can be fully tested by navigating between Kanban and Studio views repeatedly and measuring perceived load time. Delivers immediate value by eliminating loading spinners on common navigation paths.

**Acceptance Scenarios**:

1. **Given** a user is on the project Kanban view with cached data, **When** they switch to the Studio tab, **Then** the view renders within 200ms using cached data while fresh data loads in background
2. **Given** a user has previously visited a project, **When** they return to that project after navigating elsewhere, **Then** the previous view state is restored instantly from cache
3. **Given** a user attaches an image in the Studio, **When** they navigate back to the Kanban, **Then** the updated document shows the new attachment without requiring manual refresh

---

### User Story 2 - Responsive Image Generation Interface (Priority: P1)

As a user generating images in the Studio, I want the interface to remain responsive while images are being generated so that I can continue working without UI freezing.

**Why this priority**: Image generation is a core feature. UI freezes during generation severely impact user experience and can cause users to think the application has crashed.

**Independent Test**: Can be fully tested by initiating a batch of 4+ images and interacting with the UI (scrolling, clicking, typing) during generation. Delivers value by maintaining usability during the most resource-intensive operation.

**Acceptance Scenarios**:

1. **Given** a user initiates generation of 4 images, **When** the generation is in progress, **Then** the UI remains responsive (scrolling, button clicks work without delay)
2. **Given** multiple image batches are queued, **When** the system processes them, **Then** batches are handled with controlled concurrency (max 3 parallel API calls) to prevent rate limiting
3. **Given** a user has generated 50+ images in a session, **When** they scroll through the variation history, **Then** the list scrolls smoothly without frame drops

---

### User Story 3 - Fast Document List Loading (Priority: P2)

As a user opening a project with many documents, I want the document list to load quickly so that I can start working immediately.

**Why this priority**: Document list is shown on every project load. Slow loading with many documents (50+) creates a poor first impression and delays actual work.

**Independent Test**: Can be fully tested by opening a project with 100+ documents and measuring time to interactive. Delivers value by improving project load experience.

**Acceptance Scenarios**:

1. **Given** a project with 100+ documents, **When** the user opens the project, **Then** the document list becomes interactive within 2 seconds
2. **Given** the user has visited a project before, **When** they reopen it, **Then** cached documents appear immediately while fresh data syncs in background
3. **Given** a user updates a document status, **When** the update completes, **Then** only the affected document re-renders, not the entire list

---

### User Story 4 - Efficient Image Display (Priority: P2)

As a user viewing image galleries or grids, I want images to load progressively so that I see content quickly without waiting for all images to download.

**Why this priority**: Image-heavy views (Studio gallery, attachments) can be slow if all images load at once. Progressive loading improves perceived performance.

**Independent Test**: Can be fully tested by scrolling through a gallery of 20+ images and observing load behavior. Delivers value by making image-heavy views feel faster.

**Acceptance Scenarios**:

1. **Given** a gallery with 20+ images, **When** the user opens it, **Then** visible images load first while off-screen images load lazily as user scrolls
2. **Given** an image is loading, **When** the browser supports it, **Then** a low-quality placeholder or blur effect is shown until the full image loads
3. **Given** images are displayed, **When** thumbnails are available, **Then** thumbnails are used for lists/grids and full images only for expanded views

---

### User Story 5 - Reliable Batch Progress Tracking (Priority: P3)

As a user generating images, I want accurate progress updates even when running multiple browser tabs or after page refresh so that I always know the status of my generations.

**Why this priority**: Current in-memory progress tracking fails with multiple workers/tabs. While not critical for single-user scenarios, reliability builds trust.

**Independent Test**: Can be fully tested by initiating generation, opening a new tab, and verifying both tabs show consistent progress. Delivers value by improving reliability in edge cases.

**Acceptance Scenarios**:

1. **Given** a user starts image generation, **When** they open the same project in a new tab, **Then** both tabs show the same generation progress
2. **Given** a generation is in progress, **When** the user refreshes the page, **Then** they can see the ongoing generation status (not starting from zero)
3. **Given** the backend restarts during generation, **When** the user reconnects, **Then** they see accurate status (completed, failed, or in-progress)

---

### Edge Cases

- What happens when a user has 500+ documents in a project? System must paginate or virtualize to prevent memory issues.
- How does the system handle image generation when the external API is rate-limited? System must queue requests and retry with backoff.
- What happens when localStorage cache becomes stale or corrupted? System must gracefully fall back to fresh fetch.
- How does the system behave when network is slow or intermittent? Loading states must be clear and operations should be resilient.
- What happens when thumbnail generation fails? System must fall back to original image or placeholder.

## Requirements *(mandatory)*

### Functional Requirements

#### Frontend - React Query & Caching

- **FR-001**: System MUST configure garbage collection time (gcTime) of 30 minutes for all React Query hooks to retain cached data longer
- **FR-002**: System MUST use a single, consistent query key factory (consolidate `documentKeys` and `queryKeys.documents` into one)
- **FR-003**: System MUST invalidate only specific project/document caches on mutations, not entire query families
- **FR-004**: System MUST use stale-while-revalidate pattern: show cached data immediately while fetching fresh data in background

#### Frontend - Component Optimization

- **FR-005**: System MUST wrap frequently-rendered list item components (VariationCard, StylePresetCard, DocumentFilters) with React.memo()
- **FR-006**: System MUST use dynamic imports (lazy loading) for modal components and heavy panels not needed on initial render
- **FR-007**: System MUST extract modal and UI state from the main page component into a dedicated state store to reduce re-renders
- **FR-008**: System MUST reduce useState calls in the main project page by consolidating related state into objects or custom hooks

#### Frontend - Image Optimization

- **FR-009**: System MUST use Next.js Image component for all user-facing images with proper width/height attributes
- **FR-010**: System MUST implement lazy loading for images not visible in the viewport
- **FR-011**: System MUST use thumbnail URLs for list/grid views and full URLs only for expanded/detail views
- **FR-012**: System MUST implement virtualization for image grids exceeding 50 items

#### Backend - Database Optimization

- **FR-013**: System MUST add composite database index on documents(project_id, is_context) for context file queries
- **FR-014**: System MUST add database index on documents(original_image_id) for image relationship lookups
- **FR-015**: System MUST add database index on documents(project_id, is_reference_asset) for visual asset queries
- **FR-016**: System MUST add database index on document_attachments(image_id) for attachment lookups
- **FR-017**: System MUST add database index on documents(share_token) for public document access

#### Backend - Query Optimization

- **FR-018**: System MUST fix N+1 query pattern in document status synchronization by using bulk update instead of iterative queries
- **FR-019**: System MUST combine count and data queries into single database operation where possible
- **FR-020**: System MUST use SQL subqueries instead of fetching IDs into application memory for cascading operations

#### Backend - API Rate Limiting

- **FR-021**: System MUST implement concurrency control for external image generation API calls (maximum 3 parallel requests per batch)
- **FR-022**: System MUST implement exponential backoff retry for rate-limited API responses
- **FR-023**: System MUST queue excess generation requests rather than failing immediately

#### Backend - Async Operations

- **FR-024**: System MUST process thumbnail generation asynchronously to avoid blocking API responses
- **FR-025**: System MUST use non-blocking storage operations for file uploads
- **FR-026**: System MUST implement distributed progress tracking that persists across server restarts and multiple workers

### Key Entities

- **Query Cache**: Represents cached API responses with configurable staleness and garbage collection timing
- **Batch Progress**: Represents the state of an image generation batch including completed count, failed count, and individual image statuses
- **Component Render State**: Represents memoized component props to determine if re-render is necessary
- **Database Index**: Represents optimized lookup paths for frequently-queried column combinations

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Page navigation between cached views completes in under 200ms (measured as time from click to interactive content)
- **SC-002**: The main project page component re-renders less than 5 times during typical user interactions (opening modal, selecting document, changing view)
- **SC-003**: Document list with 100+ items becomes interactive within 2 seconds on standard network connection
- **SC-004**: Image generation UI remains responsive (60fps scrolling, <100ms button response) while 4+ images generate concurrently
- **SC-005**: Database queries for document listings execute in under 50ms for projects with 500+ documents (with indexes applied)
- **SC-006**: Zero rate-limit errors from external image API during normal batch operations (4-10 images)
- **SC-007**: Image grids with 50+ items scroll smoothly (no frame drops visible to user) using virtualization
- **SC-008**: Cached data is retained for 30 minutes, reducing redundant API calls by 70% for returning users
- **SC-009**: Thumbnail generation does not add latency to the image creation API response time
- **SC-010**: Batch progress remains accurate across page refreshes and multiple browser tabs

## Assumptions

- Redis is available in the deployment environment for distributed state (required dependency)
- The external image generation API (fal.ai) has rate limits that require client-side throttling
- Users typically work within a single project for extended periods, making project-level caching effective
- The existing Zustand store infrastructure can be extended for UI state management
- Next.js Image optimization is properly configured in the deployment environment
- Sentry performance monitoring is configured and will be used to validate success criteria metrics

## Out of Scope

- Complete rewrite of state management architecture
- Migration to a different database system
- Changes to the fal.ai API integration patterns beyond rate limiting
- Mobile-specific performance optimizations
- Server-side rendering (SSR) implementation changes
- WebSocket implementation for real-time updates (SSE will continue to be used)

## Dependencies

- React Query v5 (already in use)
- Zustand (already in use)
- Next.js Image component (already available)
- Redis (required for distributed progress tracking - must be added if not present)
- Database migration tooling (already in use via Supabase)
- Sentry (already in use - will leverage for performance monitoring and validation of success criteria)

## Risks

- **Risk**: Adding database indexes may temporarily slow down write operations during index creation
  - **Mitigation**: Apply indexes during low-traffic periods; indexes are small and should build quickly

- **Risk**: Changing cache invalidation patterns may cause stale data bugs
  - **Mitigation**: Implement comprehensive testing for cache scenarios; add cache version/timestamp validation

- **Risk**: Dynamic imports may cause visible loading delays for modals
  - **Mitigation**: Use prefetching for commonly-used modals; keep critical components in main bundle
