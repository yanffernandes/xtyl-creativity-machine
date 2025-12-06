# Feature Specification: Project Deletion with Soft Delete

**Feature Branch**: `020-project-delete`
**Created**: 2025-12-05
**Status**: Draft
**Input**: User description: "Add project deletion option to project settings page with clear project identification, multiple confirmations, soft delete approach, and cascade to internal documents"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Delete a Project with Confirmation (Priority: P1)

A user wants to permanently remove a project they no longer need. They navigate to the project settings page, see which project they're editing, and initiate the deletion process. The system requires multiple confirmations to prevent accidental deletion.

**Why this priority**: This is the core functionality - users must be able to delete projects they own. Without this, the feature has no value.

**Independent Test**: Can be fully tested by navigating to project settings, clicking delete, completing confirmations, and verifying the project is no longer visible in the workspace.

**Acceptance Scenarios**:

1. **Given** a user is on the project settings page, **When** they view the page, **Then** they see the project name prominently displayed to confirm which project is being edited
2. **Given** a user clicks the "Delete Project" button, **When** the first confirmation dialog appears, **Then** it displays the project name and warns about the consequences of deletion
3. **Given** a user confirms the first dialog, **When** the second confirmation appears, **Then** they must type the project name to proceed
4. **Given** a user correctly types the project name and confirms, **When** deletion completes, **Then** they are redirected to the workspace home and the project no longer appears in the sidebar

---

### User Story 2 - Recover from Accidental Deletion (Priority: P2)

An admin or system operator needs to recover a project that was accidentally deleted. Using soft delete, the data remains in the database with a deletion timestamp, allowing potential recovery through administrative tools or future UI features.

**Why this priority**: Data recovery is critical for business continuity, but the initial implementation focuses on the delete action itself. Recovery can be handled through database access initially.

**Independent Test**: Can be tested by deleting a project, then querying the database to verify the project record still exists with a `deleted_at` timestamp, and that associated documents also have `deleted_at` set.

**Acceptance Scenarios**:

1. **Given** a project is deleted via the UI, **When** an admin queries the database, **Then** the project record exists with a non-null `deleted_at` timestamp
2. **Given** a project is soft-deleted, **When** its documents are queried directly from the database, **Then** all documents have a non-null `deleted_at` timestamp matching or after the project's deletion time

---

### User Story 3 - Cancel Deletion Mid-Process (Priority: P3)

A user starts the deletion process but changes their mind. They should be able to cancel at any confirmation step without any changes being made.

**Why this priority**: Important for user experience and preventing mistakes, but lower priority than the core delete and data preservation flows.

**Independent Test**: Can be tested by initiating deletion, clicking cancel at any confirmation step, and verifying the project remains unchanged.

**Acceptance Scenarios**:

1. **Given** a user is on the first confirmation dialog, **When** they click "Cancel" or close the dialog, **Then** no changes are made and they return to the settings page
2. **Given** a user is on the type-to-confirm dialog, **When** they click "Cancel" or close the dialog, **Then** no changes are made and they return to the settings page

---

### Edge Cases

- What happens when a user tries to delete a project while another user is editing a document in it? (Soft delete proceeds; the editing user sees an error on next save)
- How does the system handle deletion when the database connection fails mid-operation? (Transaction rollback; no partial deletions)
- What happens if a user types the project name with different casing? (Case-insensitive comparison for user convenience)
- What happens to workflows associated with the project? (Cascading soft delete to workflow templates and executions)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST add a "Danger Zone" section at the bottom of the project settings page containing the delete option
- **FR-002**: System MUST display the project name prominently in the settings page header to clearly identify which project is being edited
- **FR-003**: System MUST require a two-step confirmation process for project deletion
- **FR-004**: System MUST display a warning in the first confirmation dialog explaining that deletion will remove all documents, workflows, and associated data
- **FR-005**: System MUST require the user to type the exact project name in the second confirmation step (case-insensitive comparison)
- **FR-006**: System MUST implement soft delete by setting a `deleted_at` timestamp instead of physically removing records
- **FR-007**: System MUST cascade soft delete to all documents belonging to the project
- **FR-008**: System MUST cascade soft delete to all folders belonging to the project
- **FR-009**: System MUST filter out soft-deleted projects from all user-facing queries (workspace project lists, sidebar, etc.)
- **FR-010**: System MUST redirect the user to the workspace home page after successful deletion
- **FR-011**: System MUST show a success notification confirming the project was deleted
- **FR-012**: System MUST invalidate relevant caches (project list, sidebar) after deletion to reflect changes immediately
- **FR-013**: System MUST use a destructive visual style (red color scheme) for the delete button and danger zone
- **FR-014**: System MUST restrict project deletion to the project owner OR workspace admin only
- **FR-015**: System MUST cascade soft delete to all WorkflowTemplates belonging to the project
- **FR-016**: System MUST cascade soft delete to all WorkflowExecutions associated with the project's workflows

### Key Entities

- **Project**: The main entity being deleted. Currently has: id, name, description, workspace_id, settings, created_at. Will add: deleted_at (nullable timestamp)
- **Document**: Child entity of Project. Currently has: deleted_at field (based on existing soft delete pattern). Will cascade soft delete from project
- **Folder**: Child entity of Project. Currently has: deleted_at field. Will cascade soft delete from project
- **WorkflowTemplate**: Associated with Project through project_id. Will cascade soft delete from project
- **WorkflowExecution**: Associated with WorkflowTemplate. Will cascade soft delete when parent workflow is soft-deleted

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete the full project deletion flow in under 30 seconds
- **SC-002**: 100% of deleted projects and their associated documents remain recoverable from the database for a minimum of 30 days
- **SC-003**: Zero instances of partial deletions (either full cascade completes or nothing changes)
- **SC-004**: Deleted projects disappear from all user interfaces within 2 seconds of confirmation
- **SC-005**: 95% of users successfully complete deletion on first attempt without errors
- **SC-006**: Zero accidental deletions reported due to UI ambiguity (measured by support tickets)

## Clarifications

### Session 2025-12-05

- Q: Who can delete a project? → A: Project owner OR workspace admin can delete
- Q: Should WorkflowTemplates be cascade soft-deleted with the project? → A: Yes, cascade soft delete to WorkflowTemplates and their executions

## Assumptions

- The existing `deleted_at` pattern used by Folder and Document entities will be extended to the Project model
- The backend already filters queries by `deleted_at IS NULL` for other entities, so this pattern is established
- No automated data purge will be implemented in this feature (soft-deleted data remains indefinitely until a future cleanup feature)
- The user performing deletion must be either the project owner or a workspace admin - the delete button should be hidden or disabled for users without these permissions
- Visual assets stored in R2 will NOT be deleted (only database references are soft-deleted)
