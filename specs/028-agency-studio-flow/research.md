# Research: Agency-Scale Studio Flow + Brush Selection

**Feature**: 028-agency-studio-flow
**Date**: 2025-01-14

## Research Topics

### 1. Inpainting/Mask Integration with Gemini 3 Pro

**Decision**: OpenRouter-first approach; fallback to direct Google API if mask support is incomplete

**Rationale**:
- OpenRouter provides unified API compatible with existing codebase
- Gemini 3 Pro (Nano Banana Pro) supports localized edits per [OpenRouter docs](https://openrouter.ai/google/gemini-3-pro-image-preview/api)
- If OpenRouter doesn't expose mask parameter, Google Vertex AI has full inpainting support with `edit_mode: inpainting`

**Alternatives Considered**:
- Direct Google Vertex AI only: More control but requires separate auth flow and SDK
- DALL-E inpainting: Limited to OpenAI, less flexible
- Stable Diffusion inpainting: Requires self-hosted model or Replicate

**Implementation Notes**:
- Mask format: PNG base64 (white = edit region, black = preserve)
- Mask resolution: Match source image dimensions
- Store mask in R2 if needed for history/debugging

### 2. Canvas-based Brush Tool

**Decision**: HTML5 Canvas API with touch support

**Rationale**:
- Native browser API, no external dependencies
- Supports pointer events (mouse + touch + stylus)
- Easy to export as PNG base64 for API
- Well-documented with many reference implementations

**Alternatives Considered**:
- Fabric.js: Overkill for simple brush, adds 300KB+ bundle
- Konva: Good but unnecessary complexity for single brush tool
- SVG-based: Harder to rasterize for API consumption

**Implementation Notes**:
```typescript
// Core brush state
interface BrushState {
  isDrawing: boolean;
  brushSize: number; // 5-50px
  paths: Path2D[];   // For undo support
}

// Export mask
function exportMask(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png').split(',')[1]; // base64 without prefix
}
```

### 3. Document Versioning Strategy

**Decision**: JSONB array in Document table with FIFO limit of 10

**Rationale**:
- Simple implementation without new tables
- PostgreSQL JSONB is efficient for small arrays
- FIFO with 10 versions balances history vs storage

**Alternatives Considered**:
- Separate `document_versions` table: More normalized but adds JOIN complexity
- Git-like branching: Overkill for simple linear versioning
- Event sourcing: Complex and unnecessary for this use case

**Implementation Notes**:
```sql
-- Add to documents table
ALTER TABLE documents ADD COLUMN version_history JSONB DEFAULT '[]';
ALTER TABLE documents ADD COLUMN current_version INTEGER DEFAULT 1;

-- Version entry structure
{
  "version": 1,
  "content": "...",
  "title": "...",
  "created_at": "2025-01-14T10:00:00Z",
  "created_by": "user-uuid"
}
```

### 4. Copy Library Scope

**Decision**: Workspace-level (shared across all projects in workspace)

**Rationale**:
- Agencies reuse copies across multiple campaigns/projects
- Workspace is the natural organizational boundary
- Avoids duplicate copies per project

**Alternatives Considered**:
- Project-level: Too restrictive for agency workflow
- Global (user-level): Crosses organizational boundaries inappropriately
- Hybrid with copy-on-use: Adds complexity without clear benefit

**Implementation Notes**:
- `copy_library_items.workspace_id` as foreign key
- RLS policy: `workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())`

### 5. Campaign Package Structure

**Decision**: Project-scoped with flexible metadata

**Rationale**:
- Campaigns are specific to a project/client
- Flexible JSONB for channel-specific metadata
- Simple many-to-many via document metadata

**Alternatives Considered**:
- Workspace-level campaigns: Cross-project campaigns are rare
- Rigid channel enum: Too restrictive, channels vary by industry
- Separate campaign_documents junction table: Over-normalized for MVP

**Implementation Notes**:
```sql
CREATE TABLE campaign_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  channel VARCHAR(100), -- 'instagram', 'facebook', 'email', etc.
  metadata JSONB DEFAULT '{}', -- flexible: formats, objectives, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents link via metadata
ALTER TABLE documents ADD COLUMN campaign_id UUID REFERENCES campaign_packages(id);
```

### 6. Batch Generation with Visual Context

**Decision**: Extend existing generate-batch endpoint with optional asset references

**Rationale**:
- Reuses existing batch infrastructure
- Visual context already exists in project settings
- Optional parameter doesn't break existing clients

**Alternatives Considered**:
- New endpoint: Fragments API unnecessarily
- Always include visual context: May not always be desired
- Separate pre-processing step: Adds latency and complexity

**Implementation Notes**:
```python
# Extend ImageBatchRequest schema
class ImageBatchRequest(BaseModel):
    # existing fields...
    reference_assets: Optional[List[str]] = None  # asset UUIDs
    asset_mode: Optional[str] = "style"  # style/compose/base
    apply_brand_context: bool = True
    campaign_id: Optional[str] = None
```

## Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| Canvas API | Native | Brush/mask drawing |
| OpenRouter | Current | Image generation with inpainting |
| PostgreSQL JSONB | 15+ | Version history storage |
| R2 | Current | Mask image storage |

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| OpenRouter mask support incomplete | Fallback to Google Vertex AI for inpainting endpoint |
| Large mask images slow API | Compress PNG, limit resolution to source image |
| Version history bloat | FIFO limit of 10, no full content for images (just metadata) |
| Batch timeout with 20 copies | Async processing with SSE progress, no SLA |

## Open Questions (Resolved)

All questions resolved in clarification session:
- ✅ Inpainting integration: OpenRouter first, Google fallback
- ✅ Copy library scope: Workspace-level
- ✅ Version limit: 10 per document (FIFO)
- ✅ Batch limit: 20 copies max
- ✅ Performance SLA: None defined, metrics only
