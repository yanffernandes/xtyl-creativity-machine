# Data Model: Agency-Scale Studio Flow

**Feature**: 028-agency-studio-flow
**Date**: 2025-01-14

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│   Workspace     │       │    Project      │
│─────────────────│       │─────────────────│
│ id (PK)         │◄──────│ workspace_id(FK)│
│ name            │       │ id (PK)         │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │                         │
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│CopyLibraryItem  │       │CampaignPackage  │
│─────────────────│       │─────────────────│
│ id (PK)         │       │ id (PK)         │
│ workspace_id(FK)│       │ project_id (FK) │
│ title           │       │ name            │
│ content         │       │ channel         │
│ tags[]          │       │ metadata (JSONB)│
│ created_by      │       └────────┬────────┘
│ created_at      │                │
└─────────────────┘                │
                                   │
         ┌─────────────────────────┘
         │
         ▼
┌─────────────────┐       ┌─────────────────┐
│    Document     │       │   ImageMask     │
│─────────────────│       │─────────────────│
│ id (PK)         │◄──────│ document_id(FK) │
│ project_id (FK) │       │ id (PK)         │
│ campaign_id(FK) │       │ mask_url        │
│ tags[]          │       │ prompt          │
│ channel         │       │ created_at      │
│ version_history │       └─────────────────┘
│ current_version │
└─────────────────┘
```

## Entities

### CopyLibraryItem (NEW)

Reusable copy text stored at workspace level.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| workspace_id | UUID | FK → workspaces(id), NOT NULL | Owning workspace |
| title | VARCHAR(255) | NOT NULL | Display name for the copy |
| content | TEXT | NOT NULL | The actual copy text |
| tags | TEXT[] | DEFAULT '{}' | Searchable tags |
| created_by | UUID | FK → users(id) | Creator user |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes**:
- `idx_copy_library_workspace` on (workspace_id)
- `idx_copy_library_tags` GIN on (tags)

**RLS Policy**:
```sql
CREATE POLICY "Users can access workspace copies"
ON copy_library_items FOR ALL
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
));
```

### CampaignPackage (NEW)

Campaign grouping for copies and images within a project.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| project_id | UUID | FK → projects(id) ON DELETE CASCADE, NOT NULL | Owning project |
| name | VARCHAR(255) | NOT NULL | Campaign name |
| channel | VARCHAR(100) | NULL | Target channel (instagram, facebook, email, etc.) |
| metadata | JSONB | DEFAULT '{}' | Flexible metadata (formats, objectives, etc.) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes**:
- `idx_campaign_project` on (project_id)
- `idx_campaign_channel` on (channel)

**RLS Policy**:
```sql
CREATE POLICY "Users can access project campaigns"
ON campaign_packages FOR ALL
USING (project_id IN (
  SELECT id FROM projects WHERE workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
));
```

### ImageMask (NEW)

Stores mask data for inpainting refinements.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| document_id | UUID | FK → documents(id) ON DELETE CASCADE, NOT NULL | Source image document |
| mask_url | VARCHAR(512) | NOT NULL | R2 URL for mask PNG |
| prompt | TEXT | NULL | Refinement prompt used with mask |
| result_document_id | UUID | FK → documents(id) | Resulting refined image |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| created_by | UUID | FK → users(id) | Creator user |

**Indexes**:
- `idx_mask_document` on (document_id)

### Document (EXTEND existing)

Add fields for versioning, campaign association, and metadata.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| campaign_id | UUID | FK → campaign_packages(id) ON DELETE SET NULL | Campaign association |
| tags | TEXT[] | DEFAULT '{}' | Searchable tags |
| channel | VARCHAR(100) | NULL | Target channel |
| version_history | JSONB | DEFAULT '[]' | Array of past versions |
| current_version | INTEGER | DEFAULT 1 | Current version number |

**Version History Entry Structure**:
```json
{
  "version": 1,
  "title": "Original Title",
  "content": "Original content...",
  "created_at": "2025-01-14T10:00:00Z",
  "created_by": "user-uuid"
}
```

**Indexes**:
- `idx_document_campaign` on (campaign_id)
- `idx_document_tags` GIN on (tags)
- `idx_document_channel` on (channel)

## State Transitions

### Document Version Lifecycle

```
┌──────────┐  edit   ┌──────────┐  edit   ┌──────────┐
│ Version 1│ ──────► │ Version 2│ ──────► │ Version 3│ ...
└──────────┘         └──────────┘         └──────────┘
     │                    │                    │
     └────────────────────┴────────────────────┘
                          │
                   version_history[]
                   (max 10, FIFO)
```

**Rules**:
1. On edit: Push current state to version_history, increment current_version
2. If version_history.length > 10: Remove oldest entry (FIFO)
3. On restore: Push current state to history, replace content with selected version

### Image Refinement with Mask

```
┌──────────────┐   mask   ┌──────────────┐   refine   ┌──────────────┐
│ Original     │ ────────►│ ImageMask    │ ──────────►│ Refined      │
│ Document     │          │ (mask_url)   │            │ Document     │
└──────────────┘          └──────────────┘            └──────────────┘
       │                         │                           │
       │                         │                           │
       └─────────────────────────┴───────────────────────────┘
                                 │
                        Linked via result_document_id
```

## Validation Rules

### CopyLibraryItem
- title: 1-255 characters
- content: 1-10000 characters
- tags: Max 20 tags, each max 50 characters

### CampaignPackage
- name: 1-255 characters
- channel: Must be lowercase, alphanumeric with hyphens
- metadata: Max 10KB JSON

### ImageMask
- mask_url: Valid R2 URL
- prompt: Max 2000 characters (same as image generation)

### Document (new fields)
- tags: Max 20 tags, each max 50 characters
- channel: Must be lowercase, alphanumeric with hyphens
- version_history: Max 10 entries (enforced by application)

## Migration Script Reference

```sql
-- 031_agency_studio.sql

-- Copy Library
CREATE TABLE copy_library_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_copy_library_workspace ON copy_library_items(workspace_id);
CREATE INDEX idx_copy_library_tags ON copy_library_items USING GIN(tags);

-- Campaign Packages
CREATE TABLE campaign_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  channel VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaign_project ON campaign_packages(project_id);
CREATE INDEX idx_campaign_channel ON campaign_packages(channel);

-- Image Masks
CREATE TABLE image_masks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  mask_url VARCHAR(512) NOT NULL,
  prompt TEXT,
  result_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mask_document ON image_masks(document_id);

-- Extend Documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaign_packages(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS channel VARCHAR(100);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_history JSONB DEFAULT '[]';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_document_campaign ON documents(campaign_id);
CREATE INDEX IF NOT EXISTS idx_document_tags ON documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_document_channel ON documents(channel);

-- RLS Policies
ALTER TABLE copy_library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_masks ENABLE ROW LEVEL SECURITY;

-- (RLS policy SQL as defined above)
```
