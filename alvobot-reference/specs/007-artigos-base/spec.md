# Feature Specification: Artigos de Base ✅ FINALIZADO

**Feature Branch**: `007-artigos-base`
**Created**: 2025-12-11
**Status**: ✅ **Implementado**
**Priority**: P2

## Overview

The "Artigos de Base" (Base Articles) feature provides users with a comprehensive management interface for foundational blog articles. These are template articles that serve as pillars for content strategy and can be reused across multiple blogs.

This feature allows users to:
- List and filter base articles
- Create new base articles
- View, edit, and duplicate existing articles
- Delete articles (soft delete)
- Publish articles to WordPress
- Track publication status
- Manage articles by project and category

### Architecture Pattern

Following the **simplified BaaS architecture**:
- **Frontend → Supabase**: Direct access for all CRUD operations (create, read, update, delete, duplicate)
- **Frontend → Backend → WordPress API**: Only for WordPress publication (requires external API integration)
- **RLS Security**: Row Level Security policies ensure users only access their own articles

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View and Filter Base Articles (Priority: P1)

Users can view all their base articles with filtering by project, status, and search terms.

**Why this priority**: Viewing and filtering is the core functionality. Users need to quickly find specific articles among potentially hundreds.

**Independent Test**: Can be tested by creating several articles across different projects with different statuses, then verifying filters work correctly.

**Acceptance Scenarios**:

1. **Given** a user has 50 base articles across 3 projects, **When** they visit the base articles page, **Then** they see all articles sorted by creation date (newest first)
2. **Given** a user applies a project filter, **When** they select "Project A", **Then** only articles from Project A are displayed
3. **Given** a user types in the search box, **When** they search for "SEO", **Then** only articles with "SEO" in title or keyword are shown
4. **Given** a user applies a status filter, **When** they select "Published", **Then** only published articles are displayed
5. **Given** a user has 100 articles, **When** they view the list, **Then** pagination controls are displayed with 25 articles per page by default

---

### User Story 2 - Create New Base Article (Priority: P1)

Users can create a new base article by providing a title and selecting a project, then continue editing in the full editor.

**Why this priority**: Creating articles is essential. Without this, users cannot add new content to their strategy.

**Independent Test**: Can be tested by creating a new article with minimal data and verifying it appears in the list and can be edited.

**Acceptance Scenarios**:

1. **Given** a user clicks "Novo Artigo de Base", **When** a modal opens, **Then** they see a form with Title and Project fields
2. **Given** a user fills in the title and selects a project, **When** they submit the form, **Then** a new article is created with status "draft" and is_approval_article = true
3. **Given** a new article is created, **When** the modal closes, **Then** the user is redirected to the article editor page
4. **Given** a user tries to create an article without a title, **When** they submit, **Then** they see a validation error
5. **Given** a user has no projects, **When** they try to create an article, **Then** they are prompted to create a project first

---

### User Story 3 - View and Edit Article (Priority: P1)

Users can click on any article to view and edit its full content, including title, content, excerpt, and metadata.

**Why this priority**: Editing is core functionality. Users need to refine their base articles over time.

**Independent Test**: Can be tested by clicking an article and verifying the editor loads with all existing data, then making changes and saving.

**Acceptance Scenarios**:

1. **Given** a user clicks "Visualizar" or "Editar" on an article, **When** the editor loads, **Then** they see the rich text editor with the article content
2. **Given** a user edits the article content, **When** they save, **Then** changes are persisted to Supabase
3. **Given** a user edits the title, **When** they save, **Then** the title updates in both the editor and the article list
4. **Given** a user changes the status to "published", **When** they save, **Then** the status badge updates in the list view
5. **Given** a user navigates away without saving, **When** there are unsaved changes, **Then** they see a confirmation dialog

---

### User Story 4 - Duplicate Article (Priority: P2)

Users can duplicate an existing base article to create a new version with the same content, making it easier to create variations.

**Why this priority**: Duplication saves time when creating similar articles or variations. It's a common workflow optimization.

**Independent Test**: Can be tested by duplicating an article and verifying a new article is created with " (cópia)" appended to the title.

**Acceptance Scenarios**:

1. **Given** a user clicks "Duplicar" on an article, **When** the duplication completes, **Then** a new article appears with the same content and " (cópia)" in the title
2. **Given** a duplicated article, **When** created, **Then** it has status "draft" regardless of the original status
3. **Given** a duplicated article, **When** created, **Then** it retains the same project_id, keyword_used, content, and excerpt as the original
4. **Given** a user duplicates an article, **When** the operation completes, **Then** they see a success message and the article list refreshes

---

### User Story 5 - Delete Article (Priority: P2)

Users can delete base articles they no longer need, with soft delete to allow potential recovery.

**Why this priority**: Cleanup functionality is important for organization but not as critical as creation/editing.

**Independent Test**: Can be tested by deleting an article and verifying it no longer appears in the active list (but exists in database with deleted_at timestamp).

**Acceptance Scenarios**:

1. **Given** a user clicks "Excluir" on an article, **When** a confirmation modal appears, **Then** they can confirm or cancel the deletion
2. **Given** a user confirms deletion, **When** the operation completes, **Then** the article is soft deleted (deleted_at set, status = archived)
3. **Given** a deleted article, **When** the operation completes, **Then** it no longer appears in the article list
4. **Given** a user selects multiple articles, **When** they click "Excluir selecionados", **Then** all selected articles are deleted after confirmation
5. **Given** a user cancels the deletion, **When** they click "Cancelar", **Then** no changes are made and the modal closes

---

### User Story 6 - Publish to WordPress (Priority: P3)

Users can publish base articles directly to their WordPress blogs via the backend integration.

**Why this priority**: Publishing is important but requires backend integration and is a more advanced workflow. Core CRUD operations are higher priority.

**Independent Test**: Can be tested by publishing an article to a test WordPress site and verifying the wpPost_id is saved.

**Acceptance Scenarios**:

1. **Given** a user clicks "Publicar no WordPress" on an article, **When** the backend processes the request, **Then** the article is posted to WordPress
2. **Given** an article is published, **When** the operation completes, **Then** wpPost_id is saved and status changes to "published"
3. **Given** a WordPress API error occurs, **When** publishing fails, **Then** the user sees an error message with details
4. **Given** an article is already published (has wpPost_id), **When** the user views it, **Then** they see an "External Link" badge
5. **Given** an article is published, **When** the user clicks the WordPress badge, **Then** they can open the article in WordPress (future enhancement)

---

### User Story 7 - Bulk Selection and Actions (Priority: P3)

Users can select multiple articles and perform bulk actions like delete.

**Why this priority**: Bulk operations improve efficiency but are not essential for core workflows.

**Independent Test**: Can be tested by selecting multiple articles and performing a bulk delete action.

**Acceptance Scenarios**:

1. **Given** a user views the article list, **When** they click the header checkbox, **Then** all articles on the current page are selected
2. **Given** articles are selected, **When** the selection changes, **Then** a bulk actions bar appears showing the count
3. **Given** articles are selected, **When** the user clicks "Excluir selecionados", **Then** a confirmation modal shows the number to be deleted
4. **Given** the user confirms bulk delete, **When** the operation completes, **Then** all selected articles are soft deleted
5. **Given** the user clicks "Limpar seleção", **When** executed, **Then** all checkboxes are unchecked and the bulk actions bar disappears

---

### User Story 8 - Pagination and Page Size (Priority: P3)

Users can navigate through large lists of articles with pagination controls and adjust the number of items per page.

**Why this priority**: Pagination is important for performance with large datasets but secondary to core CRUD operations.

**Independent Test**: Can be tested by creating 100+ articles and verifying pagination works correctly with different page sizes.

**Acceptance Scenarios**:

1. **Given** a user has 100 articles, **When** they view the list, **Then** they see pagination controls at the bottom
2. **Given** pagination is shown, **When** the user clicks "Next", **Then** they see the next 25 articles
3. **Given** pagination is shown, **When** the user clicks a page number, **Then** they jump to that page
4. **Given** a user changes the page size to 50, **When** the dropdown updates, **Then** they see 50 articles per page and the current page resets to 1
5. **Given** a user applies a filter, **When** the filter changes the total count, **Then** pagination controls update accordingly and reset to page 1

---

### Edge Cases

- What happens when a user tries to create an article but has no projects? (Show message prompting to create a project first)
- How does the system handle network failures during article creation? (Show error message, allow retry, do not clear form data)
- What happens when navigating away from the create modal with unsaved data? (Prompt user to confirm if they filled in any fields)
- How does the system behave when WordPress API is unreachable? (Show error message with specific details, mark publish as failed)
- What happens when a user tries to delete an article that was already published to WordPress? (Allow deletion but warn user it won't be removed from WordPress)
- How does pagination handle filter changes? (Reset to page 1 when any filter changes)
- What happens when all articles on the current page are deleted? (Navigate to previous page or page 1 if first page)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a list of all base articles (is_approval_article = true) for the authenticated user
- **FR-002**: System MUST allow filtering articles by project, status (draft/published/archived), and search text
- **FR-003**: System MUST provide pagination controls with configurable page size (10, 25, 50, 100 items)
- **FR-004**: System MUST allow creating new base articles with title and project_id (minimum required fields)
- **FR-005**: System MUST redirect users to the article editor after creating a new article
- **FR-006**: System MUST allow viewing and editing full article content including title, content, excerpt, status, and keyword
- **FR-007**: System MUST allow duplicating articles with all content copied and " (cópia)" appended to title
- **FR-008**: System MUST allow soft deleting articles (set deleted_at, status = archived) with confirmation
- **FR-009**: System MUST support bulk selection of articles with bulk delete action
- **FR-010**: System MUST show article statistics (word count, creation date, project name, status badge)
- **FR-011**: System MUST display a WordPress indicator badge for articles with wpPost_id set
- **FR-012**: System MUST allow publishing articles to WordPress via backend API integration
- **FR-013**: System MUST update wpPost_id and status when WordPress publish succeeds
- **FR-014**: System MUST show loading states during async operations (create, update, delete, duplicate, publish)
- **FR-015**: System MUST show error messages with clear details when operations fail
- **FR-016**: System MUST invalidate and refetch article list after any mutation (create, update, delete, duplicate)
- **FR-017**: System MUST preserve selection state during pagination navigation
- **FR-018**: System MUST reset to page 1 when filters change (search, project, status)
- **FR-019**: System MUST show empty state with call-to-action when no articles exist
- **FR-020**: System MUST validate required fields (title, project_id) before creating articles

### Non-Functional Requirements

- **NFR-001**: Article list MUST load within 2 seconds with up to 1000 articles
- **NFR-002**: Search filter MUST provide results within 300ms (client-side filtering)
- **NFR-003**: Pagination MUST support up to 10,000 articles without performance degradation
- **NFR-004**: All mutations MUST provide optimistic updates where appropriate
- **NFR-005**: RLS policies MUST prevent users from accessing articles of other users
- **NFR-006**: Soft delete MUST be used exclusively (no hard deletes) to preserve data integrity
- **NFR-007**: WordPress publish operation MUST timeout after 30 seconds and show error
- **NFR-008**: UI MUST be responsive and work on mobile devices (320px minimum width)
- **NFR-009**: Article content MUST support rich text with formatting, images, and tables
- **NFR-010**: System MUST cache article list data for 30 seconds (staleTime in TanStack Query)

### Key Entities

**BaseArticle** (from `articles` table):
- `id` (number, PK) - Article identifier
- `user_id` (string, FK) - Owner of the article
- `project_id` (number, FK) - Associated project
- `title` (string) - Article title
- `content` (string) - Full article content (rich text HTML)
- `excerpt` (string) - Short description
- `status` (ArticleStatus) - draft | published | scheduled | archived
- `words` (number) - Word count
- `is_approval_article` (boolean) - Flag identifying base articles (must be true)
- `keyword_used` (string) - Target keyword/phrase
- `slug` (string) - URL slug
- `wpPost_id` (number) - WordPress post ID (if published)
- `url_added` (boolean) - Whether URL was added to content
- `created_at` (string) - Creation timestamp
- `updated_at` (string) - Last update timestamp
- `deleted_at` (string) - Soft delete timestamp
- `project` (object) - Joined project data (id, name)

**Filters**:
- `search` (string) - Search in title and keyword_used
- `projectId` (number) - Filter by project
- `status` (ArticleStatus | 'all') - Filter by status

**Stats**:
- `total` (number) - Total article count
- `draft` (number) - Count of draft articles
- `published` (number) - Count of published articles
- `archived` (number) - Count of archived articles

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view a list of all their base articles with correct filtering and pagination
- **SC-002**: Users can create a new base article in under 10 seconds (from click to editor load)
- **SC-003**: Users can edit and save article content without data loss
- **SC-004**: Users can duplicate an article and verify the copy contains identical content
- **SC-005**: Users can delete articles and verify they no longer appear in active list
- **SC-006**: Users can publish articles to WordPress and verify wpPost_id is saved (when backend integration is complete)
- **SC-007**: All CRUD operations complete within 3 seconds on average
- **SC-008**: Pagination works correctly with datasets of 100+ articles
- **SC-009**: Filters (search, project, status) reduce the displayed list accurately
- **SC-010**: RLS policies prevent unauthorized access (verified by test with different user accounts)
- **SC-011**: Soft delete preserves data in database with deleted_at timestamp
- **SC-012**: Bulk selection allows selecting and deleting multiple articles efficiently
- **SC-013**: Loading states and error messages display correctly for all async operations
- **SC-014**: Empty state displays when no articles exist or filters return no results
- **SC-015**: Article list automatically refreshes after any mutation

### Performance Targets

- Initial page load: < 2 seconds
- Article creation: < 1 second
- Article update: < 1 second
- Article deletion: < 500ms
- Duplicate operation: < 1 second
- Search filter response: < 300ms
- WordPress publish: < 10 seconds (depends on external API)

## Technical Implementation

### Frontend Components

**Pages**:
- `BaseArticlesPage.tsx` - Main listing page with filters, table, and pagination (EXISTS)

**Components**:
- `CreateBaseArticleModal.tsx` - Modal for creating new base articles (NEEDS IMPLEMENTATION)
- Shared components: Button, Input, Select, Modal, EmptyState, Spinner, Alert (EXIST)

**API Layer** (TanStack Query + Supabase):
- `useBaseArticles(filters)` - Query hook for fetching articles (EXISTS)
- `useBaseArticle(articleId)` - Query hook for single article (EXISTS)
- `useBaseArticleStats(projectId)` - Query hook for statistics (EXISTS)
- `useCreateBaseArticle()` - Mutation hook for creating (EXISTS)
- `useUpdateBaseArticle()` - Mutation hook for updating (EXISTS)
- `useDeleteBaseArticle()` - Mutation hook for soft deleting (EXISTS)
- `useDuplicateBaseArticle()` - Mutation hook for duplicating (EXISTS)
- `usePublishToWordPress()` - Mutation hook for publishing (EXISTS - needs backend integration)

### Backend Integration

**WordPress Publishing** (NestJS Backend):
- Endpoint: `POST /articles/:id/publish`
- Steps:
  1. Get article from Supabase (service_role)
  2. Call WordPress REST API to create post
  3. Update article with wpPost_id and status = 'published'
  4. Return result

**Status**: NOT YET IMPLEMENTED (backend stub needed)

### Database Schema

**Table**: `articles` (exists)

**Required Columns**:
- All columns exist in schema
- RLS policies exist for user isolation

**Filters**:
- `is_approval_article = true` - Identifies base articles
- `deleted_at IS NULL` - Excludes soft-deleted articles

**Indexes**: Consider adding for performance:
- `(user_id, is_approval_article, deleted_at)` - Filter optimization
- `(project_id, is_approval_article)` - Project filter optimization

### Row Level Security (RLS)

**Policy**: Users can only view/edit their own articles

```sql
-- SELECT: Users see only their own base articles
CREATE POLICY "Users can view own base articles"
  ON articles FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- INSERT: Users can create base articles
CREATE POLICY "Users can create own base articles"
  ON articles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own base articles
CREATE POLICY "Users can update own base articles"
  ON articles FOR UPDATE
  USING (auth.uid() = user_id);

-- DELETE: Prevent hard deletes (soft delete via UPDATE instead)
-- No DELETE policy needed
```

**Note**: RLS policies already exist for articles table. Verify they support the base articles use case.

## Assumptions

- The `articles` table exists with all required columns
- RLS policies are already configured for articles table
- Users have at least one project created before creating base articles
- The rich text editor (Tiptap or similar) is available for content editing
- WordPress credentials are stored in the `projects` table (domain, login, pass)
- The backend has the capability to call WordPress REST API (needs implementation)
- Soft delete is preferred over hard delete for audit and recovery purposes
- Base articles are identified by `is_approval_article = true`
- Pagination is client-side (all articles fetched, paginated in memory) for simplicity
- TanStack Query handles caching and invalidation automatically

## Out of Scope

- Hard deletion of articles (always soft delete)
- Batch publishing to WordPress (one at a time only)
- Article versioning/history (may be future enhancement)
- AI-generated article suggestions (separate feature)
- Category management (uses existing project categories)
- Multi-user collaboration on articles (single-user edit only)
- WordPress post update/sync after initial publish (one-way sync only)
- Export articles to other formats (PDF, DOCX, etc.)
- Article templates beyond duplication (future enhancement)
- Scheduled publishing (status exists but scheduling logic not implemented)
- Article analytics and performance metrics (separate feature)

## Dependencies

**Internal**:
- Auth system (user authentication and session management)
- Projects feature (articles must belong to a project)
- Shared components (Button, Input, Select, Modal, etc.)
- Article editor (for full content editing)

**External**:
- Supabase PostgreSQL (database)
- Supabase Auth (authentication)
- TanStack Query (server state management)
- WordPress REST API (for publishing)
- React Router (navigation)

## Migration Notes

**Current State**:
- Frontend implementation is COMPLETE (BaseArticlesPage exists and functional)
- All query and mutation hooks exist in `/features/base-articles/api/`
- Components use existing shared UI components
- Pagination, filtering, and bulk actions are implemented

**Remaining Work**:
1. Implement `CreateBaseArticleModal` component
2. Implement backend WordPress publish endpoint
3. Test WordPress integration end-to-end
4. Add database indexes for performance (optional optimization)
5. Verify RLS policies cover all use cases
6. Add E2E tests for critical user journeys

## Testing Strategy

### Unit Tests
- Test query hooks with mock Supabase responses
- Test mutation hooks with success and error scenarios
- Test filter logic (search, project, status)
- Test pagination calculations
- Test helper functions (getStatusLabel, formatDate)

### Integration Tests
- Test article creation flow (modal → API → redirect)
- Test article update flow (editor → save → list refresh)
- Test article deletion with confirmation
- Test duplicate functionality
- Test bulk delete with multiple selections

### E2E Tests
1. **Create Base Article Journey**:
   - Login → Navigate to base articles → Click "Novo Artigo" → Fill form → Submit → Verify redirect to editor
2. **Edit Base Article Journey**:
   - Login → Navigate to base articles → Click article → Edit content → Save → Verify changes in list
3. **Delete Base Article Journey**:
   - Login → Navigate to base articles → Click delete → Confirm → Verify article removed from list
4. **Filter Base Articles Journey**:
   - Login → Navigate to base articles → Apply project filter → Verify filtered results → Apply status filter → Verify combined filters
5. **Publish to WordPress Journey** (when backend ready):
   - Login → Navigate to base articles → Click publish → Verify wpPost_id saved → Verify badge appears

### Performance Tests
- Load 1000 articles and verify list renders in < 2 seconds
- Apply filters and verify results appear in < 300ms
- Test pagination with 100+ pages

### Security Tests
- Verify users cannot view articles of other users (test RLS)
- Verify users cannot delete articles of other users
- Verify soft-deleted articles do not appear in queries

## Rollout Plan

### Phase 1: Core CRUD (Week 1)
- Implement CreateBaseArticleModal
- Verify all query and mutation hooks work
- Test article creation, editing, deletion
- Deploy to staging

### Phase 2: Advanced Features (Week 2)
- Test pagination with large datasets
- Test bulk selection and bulk delete
- Test filtering and search
- Optimize performance if needed
- Deploy to staging

### Phase 3: WordPress Integration (Week 3)
- Implement backend WordPress publish endpoint
- Test publishing to test WordPress site
- Handle error cases (invalid credentials, API errors)
- Deploy to staging

### Phase 4: Testing and Polish (Week 4)
- E2E testing of all user journeys
- Security testing (RLS verification)
- Performance testing and optimization
- Deploy to production with feature flag

### Phase 5: Monitoring and Iteration
- Monitor error rates and performance metrics
- Gather user feedback
- Iterate on UX improvements
- Add enhancements based on feedback

## Open Questions

1. Should we add categories/tags to base articles for better organization?
2. Should we implement article versioning to track changes over time?
3. Should we allow users to recover soft-deleted articles (trash/restore feature)?
4. Should we implement scheduled publishing with cron jobs?
5. Should we add article templates beyond duplication (e.g., pre-defined structures)?
6. Should we implement WordPress post updates (edit published posts)?
7. Should we add export functionality (PDF, DOCX)?
8. Should we implement article analytics (views, engagement metrics)?
9. What should happen to base articles when a project is deleted? (Cascade or orphan?)
10. Should we implement multi-user collaboration with locks to prevent conflicts?

## References

- Database Schema: `/DATABASE_SCHEMA.md`
- Architecture Guidelines: `/CLAUDE.md`
- Existing Implementation: `/frontend/src/features/base-articles/`
- Page Documentation: `/pages-docs/05-artigos-de-base.md`
- React Migration Spec: `/specs/003-react-migration/spec.md`

---

**Next Steps**:
1. Review and approve this specification
2. Create implementation tasks in tasks.md
3. Implement CreateBaseArticleModal component
4. Implement backend WordPress publish endpoint
5. Write tests for all user journeys
6. Deploy to staging for QA
7. Deploy to production with monitoring
