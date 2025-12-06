# Research: Project Deletion with Soft Delete

**Feature**: 020-project-delete
**Date**: 2025-12-05

## Research Questions

### 1. Existing Soft Delete Pattern in Codebase

**Decision**: Follow the established `deleted_at` column pattern already used by Document and Folder models.

**Rationale**: The codebase already has a consistent soft delete implementation:
- Column: `deleted_at = Column(DateTime(timezone=True), nullable=True)`
- Active records: `deleted_at == None` (SQLAlchemy) / `deleted_at IS NULL` (SQL)
- Archived records: `deleted_at != None`
- Activity logging exists via `log_activity()` function

**Alternatives considered**:
- `is_deleted` boolean flag: Rejected - timestamp provides audit trail and enables time-based queries
- Status enum with "deleted" value: Rejected - more complex, doesn't align with existing pattern

### 2. Models Requiring `deleted_at` Column

**Decision**: Add `deleted_at` to Project, WorkflowTemplate, and WorkflowExecution models.

**Current state**:
| Model | Has `deleted_at` | Has `project_id` |
|-------|------------------|------------------|
| Document | ✅ Yes | ✅ Yes |
| Folder | ✅ Yes | ✅ Yes |
| Project | ❌ No (needs adding) | N/A |
| WorkflowTemplate | ❌ No (needs adding) | ✅ Yes (nullable) |
| WorkflowExecution | ❌ No (needs adding) | ✅ Yes (not null) |

**Rationale**: All project-related entities should support soft delete for consistent recovery capabilities.

### 3. Cascade Delete Strategy

**Decision**: Use batch UPDATE within a single database transaction.

**Rationale**:
- SQLAlchemy cascade delete is for hard deletes, not soft deletes
- Batch UPDATE is more efficient than individual updates
- Single transaction ensures atomicity (all-or-nothing)

**Implementation pattern**:
```python
def soft_delete_project(db: Session, project_id: str) -> None:
    now = datetime.now(timezone.utc)

    # Single transaction wraps all updates
    db.query(Document).filter(Document.project_id == project_id).update({"deleted_at": now})
    db.query(Folder).filter(Folder.project_id == project_id).update({"deleted_at": now})
    db.query(WorkflowTemplate).filter(WorkflowTemplate.project_id == project_id).update({"deleted_at": now})

    # Executions via join on workflow_template_id
    template_ids = db.query(WorkflowTemplate.id).filter(WorkflowTemplate.project_id == project_id).subquery()
    db.query(WorkflowExecution).filter(WorkflowExecution.workflow_template_id.in_(template_ids)).update({"deleted_at": now}, synchronize_session=False)

    db.query(Project).filter(Project.id == project_id).update({"deleted_at": now})
    db.commit()
```

**Alternatives considered**:
- ON DELETE CASCADE trigger: Rejected - only works for hard deletes
- Async background job: Rejected - adds complexity, user expects immediate result
- Individual row updates: Rejected - inefficient for large datasets

### 4. Frontend API Pattern

**Decision**: Route delete through backend API instead of direct Supabase call.

**Current state**: Frontend uses direct Supabase client for project CRUD:
```typescript
// Current: Hard delete via Supabase
await supabase.from('projects').delete().eq('id', id)
```

**New pattern**:
```typescript
// New: Soft delete via backend API
await api.delete(`/projects/${projectId}`)
```

**Rationale**:
- Backend can handle cascade logic atomically
- Centralizes authorization checks
- Enables activity logging
- Aligns with API-First Architecture principle

### 5. Query Filtering for Soft-Deleted Records

**Decision**: Add `deleted_at IS NULL` filter to all project list queries.

**Affected queries**:
1. `get_workspace_projects()` in crud.py
2. Supabase RLS policies (if project filtering happens there)
3. Frontend `useProjects` hook queries

**Rationale**: Users should not see deleted projects in any list view.

### 6. Authorization Model

**Decision**: Check user is project owner OR workspace admin before allowing delete.

**Implementation**:
```python
def can_delete_project(user_id: str, project_id: str, db: Session) -> bool:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return False

    # Check if user is workspace admin
    workspace_user = db.query(WorkspaceUser).filter(
        WorkspaceUser.workspace_id == project.workspace_id,
        WorkspaceUser.user_id == user_id
    ).first()

    return workspace_user and workspace_user.role in ['owner', 'admin']
```

**Note**: Project model doesn't have `owner_id` field, so we rely on workspace role.

### 7. UI Component Pattern

**Decision**: Use Shadcn AlertDialog for two-step confirmation.

**Step 1 - Warning Dialog**:
- Title: "Delete Project?"
- Shows project name prominently
- Warning text about consequences
- Cancel / Continue buttons

**Step 2 - Type-to-Confirm Dialog**:
- Title: "Type project name to confirm"
- Input field with case-insensitive validation
- Cancel / Delete buttons (Delete disabled until name matches)

**Rationale**: Matches GitHub's dangerous action pattern (delete repository flow).

### 8. Cache Invalidation Strategy

**Decision**: Invalidate React Query cache keys after successful delete.

**Cache keys to invalidate**:
```typescript
queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] })
queryClient.invalidateQueries({ queryKey: ['project', projectId] })
```

**Rationale**: Ensures sidebar and project lists update immediately after deletion.

## Summary of Decisions

| Area | Decision |
|------|----------|
| Soft delete column | `deleted_at: DateTime(timezone=True), nullable=True` |
| Models to update | Project, WorkflowTemplate, WorkflowExecution |
| Cascade strategy | Batch UPDATE in single transaction |
| API pattern | Backend DELETE endpoint (not direct Supabase) |
| Query filtering | Add `deleted_at IS NULL` to all project queries |
| Authorization | Workspace owner or admin role |
| UI pattern | Two-step AlertDialog confirmation |
| Cache invalidation | React Query invalidateQueries |
