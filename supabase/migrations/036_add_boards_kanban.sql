-- Migration 036: Add Boards (Kanban) domain for projects
-- Date: 2026-02-26
-- Description:
--   - Adds project boards and board columns
--   - Links documents to boards/columns
--   - Adds RLS policies for direct frontend access
--   - Creates indexes for sidebar/kanban query performance

BEGIN;

-- ============================================================================
-- 1) BOARDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.boards (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id VARCHAR NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  folder_id VARCHAR REFERENCES public.folders(id) ON DELETE SET NULL,
  name VARCHAR NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS folder_id VARCHAR REFERENCES public.folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_boards_project_id ON public.boards(project_id);
CREATE INDEX IF NOT EXISTS idx_boards_folder_id ON public.boards(folder_id);
CREATE INDEX IF NOT EXISTS idx_boards_deleted_at ON public.boards(deleted_at);
CREATE INDEX IF NOT EXISTS idx_boards_project_position ON public.boards(project_id, position);

COMMENT ON TABLE public.boards IS 'Kanban boards inside a project';
COMMENT ON COLUMN public.boards.folder_id IS 'Optional folder that organizes this board inside the project tree';
COMMENT ON COLUMN public.boards.position IS 'Sort position within project';

-- ============================================================================
-- 2) BOARD COLUMNS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.board_columns (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  board_id VARCHAR NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  color VARCHAR,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_board_columns_board_id ON public.board_columns(board_id);
CREATE INDEX IF NOT EXISTS idx_board_columns_board_position ON public.board_columns(board_id, position);

COMMENT ON TABLE public.board_columns IS 'Columns belonging to a kanban board';
COMMENT ON COLUMN public.board_columns.position IS 'Sort position within board';

-- ============================================================================
-- 3) DOCUMENT LINKS TO BOARD DOMAIN
-- ============================================================================

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS board_id VARCHAR REFERENCES public.boards(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS board_column_id VARCHAR REFERENCES public.board_columns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS board_position INTEGER;

CREATE INDEX IF NOT EXISTS idx_documents_board_id ON public.documents(board_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_board_column_id ON public.documents(board_column_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_project_board ON public.documents(project_id, board_id) WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.documents.board_id IS 'Board where document appears as kanban card';
COMMENT ON COLUMN public.documents.board_column_id IS 'Column where card currently is';
COMMENT ON COLUMN public.documents.board_position IS 'Sort position within the current column';

-- ============================================================================
-- 4) AUTOMATIC DEFAULT COLUMNS FOR NEW BOARDS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_default_board_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.board_columns (board_id, name, color, position)
  VALUES
    (NEW.id, 'Backlog', '#64748b', 0),
    (NEW.id, 'Em Progresso', '#3b82f6', 1),
    (NEW.id, 'Concluido', '#22c55e', 2);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_default_board_columns ON public.boards;
CREATE TRIGGER trg_create_default_board_columns
AFTER INSERT ON public.boards
FOR EACH ROW
EXECUTE FUNCTION public.create_default_board_columns();

-- ============================================================================
-- 5) BACKFILL: EXISTING DOCUMENTS -> FIRST PROJECT BOARD
-- ============================================================================

-- 5.1 Create an initial board for projects that already have documents
-- and still do not have any active board.
INSERT INTO public.boards (project_id, name, description, position)
SELECT
  p.id,
  'Quadro Principal',
  'Quadro inicial criado automaticamente pela migracao de Kanban',
  0
FROM public.projects p
WHERE EXISTS (
  SELECT 1
  FROM public.documents d
  WHERE d.project_id = p.id
    AND d.deleted_at IS NULL
)
AND NOT EXISTS (
  SELECT 1
  FROM public.boards b
  WHERE b.project_id = p.id
    AND b.deleted_at IS NULL
);

-- 5.2 Link existing documents to the first board and first column of each project.
-- Only documents not yet linked to any board are updated.
WITH first_boards AS (
  SELECT DISTINCT ON (b.project_id)
    b.project_id,
    b.id AS board_id
  FROM public.boards b
  WHERE b.deleted_at IS NULL
  ORDER BY b.project_id, b.position ASC, b.created_at ASC, b.id ASC
),
first_columns AS (
  SELECT DISTINCT ON (c.board_id)
    c.board_id,
    c.id AS column_id
  FROM public.board_columns c
  ORDER BY c.board_id, c.position ASC, c.created_at ASC, c.id ASC
),
docs_to_assign AS (
  SELECT
    d.id,
    d.project_id,
    ROW_NUMBER() OVER (
      PARTITION BY d.project_id
      ORDER BY d.created_at ASC, d.id ASC
    ) - 1 AS board_position
  FROM public.documents d
  WHERE d.deleted_at IS NULL
    AND COALESCE(d.is_reference_asset, false) = false
    AND d.board_id IS NULL
)
UPDATE public.documents d
SET
  board_id = fb.board_id,
  board_column_id = fc.column_id,
  board_position = da.board_position,
  updated_at = NOW()
FROM docs_to_assign da
JOIN first_boards fb ON fb.project_id = da.project_id
JOIN first_columns fc ON fc.board_id = fb.board_id
WHERE d.id = da.id;

-- ============================================================================
-- 6) RLS
-- ============================================================================

ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_columns ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'boards' AND policyname = 'boards_select'
  ) THEN
    CREATE POLICY boards_select ON public.boards
      FOR SELECT USING (
        EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id = boards.project_id
            AND user_is_workspace_member(p.workspace_id)
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'boards' AND policyname = 'boards_insert'
  ) THEN
    CREATE POLICY boards_insert ON public.boards
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id = boards.project_id
            AND user_is_workspace_member(p.workspace_id)
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'boards' AND policyname = 'boards_update'
  ) THEN
    CREATE POLICY boards_update ON public.boards
      FOR UPDATE USING (
        EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id = boards.project_id
            AND user_is_workspace_member(p.workspace_id)
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'boards' AND policyname = 'boards_delete'
  ) THEN
    CREATE POLICY boards_delete ON public.boards
      FOR DELETE USING (
        EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id = boards.project_id
            AND user_is_workspace_member(p.workspace_id)
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'board_columns' AND policyname = 'board_columns_select'
  ) THEN
    CREATE POLICY board_columns_select ON public.board_columns
      FOR SELECT USING (
        EXISTS (
          SELECT 1
          FROM public.boards b
          JOIN public.projects p ON p.id = b.project_id
          WHERE b.id = board_columns.board_id
            AND user_is_workspace_member(p.workspace_id)
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'board_columns' AND policyname = 'board_columns_insert'
  ) THEN
    CREATE POLICY board_columns_insert ON public.board_columns
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.boards b
          JOIN public.projects p ON p.id = b.project_id
          WHERE b.id = board_columns.board_id
            AND user_is_workspace_member(p.workspace_id)
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'board_columns' AND policyname = 'board_columns_update'
  ) THEN
    CREATE POLICY board_columns_update ON public.board_columns
      FOR UPDATE USING (
        EXISTS (
          SELECT 1
          FROM public.boards b
          JOIN public.projects p ON p.id = b.project_id
          WHERE b.id = board_columns.board_id
            AND user_is_workspace_member(p.workspace_id)
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'board_columns' AND policyname = 'board_columns_delete'
  ) THEN
    CREATE POLICY board_columns_delete ON public.board_columns
      FOR DELETE USING (
        EXISTS (
          SELECT 1
          FROM public.boards b
          JOIN public.projects p ON p.id = b.project_id
          WHERE b.id = board_columns.board_id
            AND user_is_workspace_member(p.workspace_id)
        )
      );
  END IF;
END $$;

COMMIT;
