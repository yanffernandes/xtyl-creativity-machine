# Quickstart: Project Deletion with Soft Delete

**Feature**: 020-project-delete
**Date**: 2025-12-05

## Overview

This feature adds the ability to delete projects from the project settings page. Deletion uses a soft delete pattern (setting `deleted_at` timestamp) and cascades to all child entities.

## Key Components

### Backend

1. **Migration** (`backend/migrations/023_add_project_soft_delete.sql`)
   - Adds `deleted_at` column to: projects, workflow_templates, workflow_executions
   - Creates indexes for efficient filtering

2. **CRUD Functions** (`backend/crud.py`)
   - `soft_delete_project(db, project_id)` - Main delete function with cascade
   - Updates to existing queries to filter `deleted_at IS NULL`

3. **API Endpoint** (`backend/routers/projects.py`)
   - `DELETE /projects/{project_id}` - Soft delete endpoint
   - Authorization check for owner/admin role
   - Returns cascade summary

### Frontend

1. **Delete Dialog** (`frontend/src/components/project/DeleteProjectDialog.tsx`)
   - Two-step confirmation (warning → type name)
   - Uses Shadcn AlertDialog

2. **Settings Form** (`frontend/src/components/project/ProjectSettingsForm.tsx`)
   - New "Danger Zone" section at bottom
   - Red-styled delete button

3. **API Client** (`frontend/src/lib/api.ts`)
   - `deleteProject(projectId)` - Calls backend DELETE endpoint

4. **React Query Hook** (`frontend/src/hooks/use-projects.ts`)
   - Updated `useDeleteProject` mutation
   - Cache invalidation on success

## Testing the Feature

### Manual Testing

1. Navigate to any project settings page
2. Scroll to "Danger Zone" section
3. Click "Delete Project" button
4. Verify warning dialog shows project name
5. Click "Continue" to proceed
6. Type project name in confirmation input
7. Click "Delete" (should be disabled until name matches)
8. Verify redirect to workspace home
9. Verify project no longer appears in sidebar

### Database Verification

```sql
-- Check project is soft-deleted
SELECT id, name, deleted_at FROM projects WHERE id = '<project_id>';

-- Check cascade to documents
SELECT COUNT(*) FROM documents WHERE project_id = '<project_id>' AND deleted_at IS NOT NULL;

-- Check cascade to workflows
SELECT COUNT(*) FROM workflow_templates WHERE project_id = '<project_id>' AND deleted_at IS NOT NULL;
```

## Important Notes

- **No hard delete**: Data remains in database for recovery
- **No R2 cleanup**: Visual assets are NOT deleted from storage
- **Authorization**: Only workspace owners/admins can delete
- **Cache**: Frontend cache is invalidated immediately after delete

## Rollback

To restore a soft-deleted project (admin/database access required):

```sql
-- Restore project
UPDATE projects SET deleted_at = NULL WHERE id = '<project_id>';

-- Restore documents
UPDATE documents SET deleted_at = NULL WHERE project_id = '<project_id>';

-- Restore folders
UPDATE folders SET deleted_at = NULL WHERE project_id = '<project_id>';

-- Restore workflows
UPDATE workflow_templates SET deleted_at = NULL WHERE project_id = '<project_id>';

-- Restore executions
UPDATE workflow_executions SET deleted_at = NULL
WHERE workflow_template_id IN (
    SELECT id FROM workflow_templates WHERE project_id = '<project_id>'
);
```
