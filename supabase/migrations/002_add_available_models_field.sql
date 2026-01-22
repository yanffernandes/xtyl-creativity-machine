-- Add available_models field to workspaces table
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS available_models JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN workspaces.available_models IS 'List of model IDs available in this workspace';
