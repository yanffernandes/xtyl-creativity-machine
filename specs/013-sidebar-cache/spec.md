# Feature Specification: Sidebar Cache with Loading Indicator

**Feature Branch**: `013-sidebar-cache`
**Created**: 2025-11-30
**Status**: Draft
**Input**: User description: "O menu lateral sempre recarrega quando mudo de página. Quero que ele abra uma versão em cache primeiro, com um indicador pequeno de que está atualizando ao lado do nome 'Projetos'"

## Clarifications

### Session 2025-11-30

- Q: When is cache considered "stale" enough to warrant special treatment? → A: Cache never expires - always show cached data immediately and refresh in background, regardless of cache age.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Instant Sidebar Load on Navigation (Priority: P1)

When a user navigates between pages in the workspace, the sidebar should immediately display cached project and document data instead of showing a loading state or empty content. This provides a seamless, instant navigation experience similar to native desktop applications.

**Why this priority**: This is the core value proposition - eliminating the perceived loading delay when switching pages. Users expect sidebar content to remain stable during navigation.

**Independent Test**: Can be tested by navigating between different pages in the workspace and verifying that the sidebar content appears instantly from cache before any network request completes.

**Acceptance Scenarios**:

1. **Given** the user has visited a workspace and the sidebar data is cached, **When** the user navigates to another page within the workspace, **Then** the sidebar displays the cached projects and documents instantly (within 50ms of navigation).

2. **Given** the user has never visited a workspace before, **When** the user first accesses the workspace, **Then** the sidebar shows a subtle loading skeleton until data is fetched.

3. **Given** the user has cached sidebar data, **When** they navigate to a different page, **Then** the cached content is shown immediately while fresh data is fetched in the background.

---

### User Story 2 - Visual Refresh Indicator (Priority: P2)

While the sidebar displays cached data, a small visual indicator next to the "Projetos" header should communicate that fresh data is being loaded in the background. This keeps users informed without disrupting their workflow.

**Why this priority**: Transparency about data freshness builds user trust and prevents confusion when data updates after a brief delay.

**Independent Test**: Can be tested by navigating to a new page and observing that a loading indicator appears next to "Projetos" while background data is being fetched.

**Acceptance Scenarios**:

1. **Given** the sidebar is showing cached data, **When** a background refresh is in progress, **Then** a small spinner or pulsing dot indicator appears next to the "Projetos" heading.

2. **Given** the background refresh completes successfully, **When** fresh data is received, **Then** the indicator disappears smoothly (fade out animation).

3. **Given** the background refresh fails, **When** an error occurs, **Then** the indicator changes to show a subtle error state (optional retry action).

---

### User Story 3 - Seamless Data Updates (Priority: P3)

When new data arrives from the background refresh, the sidebar should update smoothly without jarring visual jumps or content reordering that disrupts the user's focus.

**Why this priority**: Smooth updates maintain user context and prevent the disorienting "content jump" experience.

**Independent Test**: Can be tested by having another user add/remove a document in the same project, then navigating in the main user's session and observing the update happens smoothly.

**Acceptance Scenarios**:

1. **Given** cached data is displayed and new data arrives, **When** the sidebar updates, **Then** existing items remain in place and only the changes are animated in/out.

2. **Given** a new project was added by another user, **When** the background refresh brings the update, **Then** the new project appears with a subtle entrance animation (no full sidebar re-render).

3. **Given** a document was deleted elsewhere, **When** the refresh occurs, **Then** the document is removed with a smooth fade-out animation.

---

### Edge Cases

- What happens when the cache is old (user was offline or didn't visit for a long time)?
  - Cache never expires - always show cached data immediately regardless of age
  - Always attempt background refresh to get fresh data

- How does the system handle cache storage limits?
  - Implement LRU (Least Recently Used) eviction for workspace data
  - Keep only the 10 most recently accessed workspaces cached

- What happens when cache data is corrupted?
  - Fall back to fresh fetch with loading skeleton
  - Clear corrupted cache entry silently

- How does the cache behave across browser tabs?
  - Share cache across tabs for the same workspace
  - Use browser storage for persistence across sessions

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST cache sidebar data (projects and documents) in browser storage when loaded
- **FR-002**: System MUST display cached sidebar data immediately upon page navigation within a workspace
- **FR-003**: System MUST initiate a background data refresh after displaying cached content
- **FR-004**: System MUST show a loading indicator next to "Projetos" header during background refresh
- **FR-005**: System MUST hide the loading indicator when background refresh completes or fails
- **FR-006**: System MUST update the sidebar content when fresh data differs from cached data
- **FR-007**: System MUST animate content changes smoothly without jarring visual jumps
- **FR-008**: System MUST invalidate cache when user performs data-modifying actions (create/edit/delete project or document)
- **FR-009**: System MUST persist cache across browser sessions (survives page refresh and browser close)
- **FR-010**: System MUST handle cache miss gracefully by showing loading state and fetching fresh data

### Key Entities *(include if feature involves data)*

- **SidebarCache**: Stored sidebar state for a workspace
  - workspace_id: Identifier for the workspace
  - projects: List of projects with their documents
  - timestamp: When the cache was last updated
  - version: Cache schema version for migration compatibility

- **RefreshState**: Current state of background data refresh
  - isRefreshing: Boolean indicating if refresh is in progress
  - lastError: Any error from the last refresh attempt
  - lastRefreshAt: Timestamp of last successful refresh

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sidebar content appears within 100 milliseconds of page navigation when cache is available (vs. current 500ms-2000ms with network fetch)
- **SC-002**: Users perceive no loading state during routine workspace navigation 95% of the time
- **SC-003**: Background refresh indicator is visible for the duration of the fetch, providing clear feedback
- **SC-004**: Cache hit rate exceeds 90% for return visits within the same session
- **SC-005**: Memory usage for sidebar cache remains under 1MB per workspace

## Assumptions

- Browser storage (localStorage or equivalent) is available and has sufficient quota
- Cache data format can be versioned for future migration needs
- The existing data fetching hooks (useProjects, useWorkspace) can be extended to support caching behavior
- The sidebar data structure (projects and documents) is relatively stable and doesn't change schema frequently
- Network requests for sidebar data complete within 5 seconds under normal conditions
