-- Migration 031: Agency-Scale Studio Flow
-- Feature 028: Agency Studio Flow + Brush Selection
-- Date: 2025-01-14

-- ============================================================================
-- Copy Library (workspace-level reusable copies)
-- ============================================================================
CREATE TABLE IF NOT EXISTS copy_library_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id VARCHAR(255) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_copy_library_workspace ON copy_library_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_copy_library_tags ON copy_library_items USING GIN(tags);

-- ============================================================================
-- Campaign Packages (project-level campaign grouping)
-- ============================================================================
CREATE TABLE IF NOT EXISTS campaign_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    channel VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_project ON campaign_packages(project_id);
CREATE INDEX IF NOT EXISTS idx_campaign_channel ON campaign_packages(channel);

-- ============================================================================
-- Image Masks (for inpainting refinements)
-- ============================================================================
CREATE TABLE IF NOT EXISTS image_masks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id VARCHAR(255) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    mask_url VARCHAR(512) NOT NULL,
    prompt TEXT,
    result_document_id VARCHAR(255) REFERENCES documents(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mask_document ON image_masks(document_id);

-- ============================================================================
-- Extend Documents table for campaigns, tags, versioning
-- ============================================================================
ALTER TABLE documents ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaign_packages(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS channel VARCHAR(100);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version_history JSONB DEFAULT '[]';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_document_campaign ON documents(campaign_id);
CREATE INDEX IF NOT EXISTS idx_document_tags ON documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_document_channel ON documents(channel);

-- ============================================================================
-- RLS Policies
-- ============================================================================
ALTER TABLE copy_library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_masks ENABLE ROW LEVEL SECURITY;

-- Copy Library: Users can access copies in their workspaces
DROP POLICY IF EXISTS "copy_library_workspace_access" ON copy_library_items;
CREATE POLICY "copy_library_workspace_access" ON copy_library_items
    FOR ALL
    USING (workspace_id IN (
        SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()::text
    ));

-- Campaign Packages: Users can access campaigns in their projects
DROP POLICY IF EXISTS "campaign_project_access" ON campaign_packages;
CREATE POLICY "campaign_project_access" ON campaign_packages
    FOR ALL
    USING (project_id IN (
        SELECT id FROM projects WHERE workspace_id IN (
            SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()::text
        )
    ));

-- Image Masks: Users can access masks for documents they can access
DROP POLICY IF EXISTS "mask_document_access" ON image_masks;
CREATE POLICY "mask_document_access" ON image_masks
    FOR ALL
    USING (document_id IN (
        SELECT id FROM documents WHERE project_id IN (
            SELECT id FROM projects WHERE workspace_id IN (
                SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()::text
            )
        )
    ));

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE copy_library_items IS 'Feature 028: Reusable copy library at workspace level';
COMMENT ON TABLE campaign_packages IS 'Feature 028: Campaign grouping for documents';
COMMENT ON TABLE image_masks IS 'Feature 028: Mask data for inpainting refinements';
COMMENT ON COLUMN documents.campaign_id IS 'Feature 028: Campaign association';
COMMENT ON COLUMN documents.tags IS 'Feature 028: Searchable tags array';
COMMENT ON COLUMN documents.channel IS 'Feature 028: Target channel (instagram, facebook, etc)';
COMMENT ON COLUMN documents.version_history IS 'Feature 028: JSONB array of past versions (max 10, FIFO)';
COMMENT ON COLUMN documents.current_version IS 'Feature 028: Current version number';
