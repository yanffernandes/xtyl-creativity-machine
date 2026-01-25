# Data Model: Performance Optimization

**Feature**: 030-performance-optimization
**Date**: 2026-01-25

## Overview

This feature does not introduce new database tables. It optimizes existing data access patterns through:
1. Database indexes for common query patterns
2. Redis schemas for distributed batch progress tracking
3. Frontend state store for UI optimization

---

## Database Indexes

### New Indexes (Migration: 034_performance_indexes.sql)

| Index Name | Table | Columns | Condition | Purpose |
|------------|-------|---------|-----------|---------|
| `idx_documents_context` | documents | (project_id, is_context) | deleted_at IS NULL | FR-013: Context file queries |
| `idx_documents_original_image` | documents | (original_image_id) | deleted_at IS NULL | FR-014: Image relationship lookups |
| `idx_documents_reference_asset` | documents | (project_id, is_reference_asset) | deleted_at IS NULL | FR-015: Visual asset queries |
| `idx_attachments_image` | document_attachments | (image_id) | - | FR-016: Attachment lookups |
| `idx_documents_share_token` | documents | (share_token) | is_public = TRUE AND deleted_at IS NULL | FR-017: Public document access |

### Index Design Rationale

- **Partial indexes** (WHERE clause): Exclude soft-deleted rows, reducing index size by ~10-20%
- **Column order**: Most selective column first for optimal index usage
- **CONCURRENTLY**: All indexes created with CONCURRENTLY to avoid table locks

### Migration SQL

```sql
-- Migration: 034_performance_indexes.sql
-- Feature: 030-performance-optimization
-- Created: 2026-01-25

-- FR-013: Optimize context file queries
-- Query pattern: WHERE project_id = ? AND is_context = TRUE AND deleted_at IS NULL
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_context
ON documents(project_id, is_context)
WHERE deleted_at IS NULL;

-- FR-014: Optimize image relationship lookups
-- Query pattern: WHERE original_image_id = ? AND deleted_at IS NULL
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_original_image
ON documents(original_image_id)
WHERE deleted_at IS NULL;

-- FR-015: Optimize visual asset queries
-- Query pattern: WHERE project_id = ? AND is_reference_asset = TRUE AND deleted_at IS NULL
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_reference_asset
ON documents(project_id, is_reference_asset)
WHERE deleted_at IS NULL;

-- FR-016: Optimize attachment image lookups
-- Query pattern: WHERE image_id = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attachments_image
ON document_attachments(image_id);

-- FR-017: Optimize share token lookups
-- Query pattern: WHERE share_token = ? AND is_public = TRUE AND deleted_at IS NULL
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_share_token
ON documents(share_token)
WHERE is_public = TRUE AND deleted_at IS NULL;
```

---

## Redis Schemas

### Connection Configuration

```python
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
```

### Key Patterns

#### Batch Progress (FR-026)

**Key**: `batch:{batch_id}:progress`
**Type**: HASH
**TTL**: 3600 seconds (1 hour)

| Field | Type | Description |
|-------|------|-------------|
| total | int | Total number of images in batch |
| completed | int | Successfully completed count |
| failed | int | Failed generation count |
| status | string | "pending" \| "processing" \| "completed" \| "failed" |
| created_at | string | ISO 8601 timestamp |
| updated_at | string | ISO 8601 timestamp |

**Operations**:
```
HSET batch:{batch_id}:progress total 4 completed 0 failed 0 status "pending"
EXPIRE batch:{batch_id}:progress 3600
HINCRBY batch:{batch_id}:progress completed 1
HSET batch:{batch_id}:progress status "completed" updated_at "2026-01-25T..."
HGETALL batch:{batch_id}:progress
```

#### Batch Images (FR-026)

**Key**: `batch:{batch_id}:images`
**Type**: LIST
**TTL**: 3600 seconds (1 hour)

**Item Structure** (JSON):
```json
{
  "index": 0,
  "status": "completed",
  "document_id": "uuid",
  "file_url": "https://...",
  "thumbnail_url": "https://...",
  "error": null,
  "completed_at": "2026-01-25T..."
}
```

**Operations**:
```
RPUSH batch:{batch_id}:images '{"index": 0, "status": "pending"}'
LSET batch:{batch_id}:images 0 '{"index": 0, "status": "completed", ...}'
LRANGE batch:{batch_id}:images 0 -1
```

---

## Frontend State Schemas

### UI Store (Zustand)

**File**: `frontend/src/lib/stores/ui-store.ts`

```typescript
interface ModalState {
  assets: boolean
  archive: boolean
  activity: boolean
  settings: boolean
  imageGenerator: boolean
  share: boolean
  attachImage: boolean
  unsavedChanges: boolean
}

interface UIStore {
  // Modal management
  modals: ModalState
  openModal: (name: keyof ModalState) => void
  closeModal: (name: keyof ModalState) => void
  closeAllModals: () => void

  // Title editing state
  editingTitle: string | null
  tempTitle: string
  setEditingTitle: (id: string | null) => void
  setTempTitle: (title: string) => void

  // Navigation state (for unsaved changes)
  pendingNavigation: string | null
  pendingDocument: any | null
  setPendingNavigation: (path: string | null, doc?: any) => void
  clearPendingNavigation: () => void
}
```

**Selector Pattern** (prevents unnecessary re-renders):
```typescript
// Only re-render when specific modal changes
const isAssetsOpen = useUIStore(state => state.modals.assets)

// Multiple selectors with shallow comparison
const { openModal, closeModal } = useUIStore(
  useShallow(state => ({
    openModal: state.openModal,
    closeModal: state.closeModal
  }))
)
```

---

## Query Key Schema

### Consolidated Query Keys

**File**: `frontend/src/lib/query-keys.ts`

All document-related queries MUST use these keys (FR-002):

```typescript
export const queryKeys = {
  documents: {
    all: ['documents'] as const,
    lists: () => [...queryKeys.documents.all, 'list'] as const,
    byProject: (projectId: string) =>
      [...queryKeys.documents.lists(), 'project', projectId] as const,
    byFolder: (projectId: string, folderId: string | null) =>
      [...queryKeys.documents.lists(), 'project', projectId, 'folder', folderId] as const,
    detail: (id: string) =>
      [...queryKeys.documents.all, 'detail', id] as const,
  },
  // ... other keys
}
```

**Invalidation Patterns**:

| Action | Invalidation Key | Scope |
|--------|------------------|-------|
| Create document | `queryKeys.documents.byProject(projectId)` | Project only |
| Update document | `queryKeys.documents.detail(id)` + `byProject` | Single + list |
| Delete document | `queryKeys.documents.byProject(projectId)` | Project only |
| Attach image | `queryKeys.documents.byProject(projectId)` | Project only |
| Move document | `queryKeys.documents.lists()` | All lists (folder change) |

---

## Entity Relationships (Unchanged)

This feature does not modify entity relationships. Existing relationships:

```
Project 1:N Document
Document 1:N DocumentAttachment
DocumentAttachment N:1 Document (image)
Document 0:1 Document (original_image_id - self-reference)
```

---

## Performance Targets by Entity

| Entity | Current | Target | Mechanism |
|--------|---------|--------|-----------|
| Document list (100 items) | ~500ms | <200ms | Index + cache |
| Document list (500 items) | ~2s | <500ms | Index + virtualization |
| Context file query | ~100ms | <50ms | Partial index |
| Attachment lookup | ~80ms | <20ms | Index |
| Batch progress check | ~50ms | <5ms | Redis |
