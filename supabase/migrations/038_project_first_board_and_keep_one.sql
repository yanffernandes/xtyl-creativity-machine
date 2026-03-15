-- Migration 038: First board on project creation + keep at least one board per project
-- Date: 2026-03-14
-- Description:
--   1) When a project is created, automatically create its first board ("Quadro Principal").
--   2) Prevent deleting/archiving the last board of a project (project must always have at least one board).

BEGIN;

-- ============================================================================
-- 1) CREATE FIRST BOARD WHEN PROJECT IS CREATED
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_first_board_for_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.boards (id, project_id, name, description, position, created_at)
  VALUES (
    gen_random_uuid()::text,
    NEW.id,
    'Quadro Principal',
    'Quadro inicial do projeto',
    0,
    NOW()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_first_board_for_project ON public.projects;
CREATE TRIGGER trg_create_first_board_for_project
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.create_first_board_for_project();

COMMENT ON FUNCTION public.create_first_board_for_project() IS 'Creates the first board (Quadro Principal) when a new project is inserted. Default columns are created by trg_create_default_board_columns on boards.';

-- ============================================================================
-- 1b) BACKFILL: projects that have no active board get one
-- ============================================================================

INSERT INTO public.boards (id, project_id, name, description, position, created_at)
SELECT
  gen_random_uuid()::text,
  p.id,
  'Quadro Principal',
  'Quadro inicial do projeto',
  0,
  NOW()
FROM public.projects p
WHERE p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.boards b
    WHERE b.project_id = p.id
      AND b.deleted_at IS NULL
  );

-- ============================================================================
-- 2) PREVENT ARCHIVING THE LAST BOARD OF A PROJECT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_archive_last_board()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  active_count INTEGER;
BEGIN
  -- Only run when we are setting deleted_at (archiving the board)
  IF NEW.deleted_at IS NOT NULL AND (OLD.deleted_at IS NULL OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at) THEN
    SELECT COUNT(*)::INTEGER
    INTO active_count
    FROM public.boards
    WHERE project_id = OLD.project_id
      AND deleted_at IS NULL
      AND id != OLD.id;

    IF active_count = 0 THEN
      RAISE EXCEPTION 'cannot_archive_last_board'
        USING MESSAGE = 'Um projeto deve ter sempre pelo menos um quadro. Crie outro quadro antes de remover este.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_archive_last_board ON public.boards;
CREATE TRIGGER trg_prevent_archive_last_board
  BEFORE UPDATE OF deleted_at ON public.boards
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_archive_last_board();

COMMENT ON FUNCTION public.prevent_archive_last_board() IS 'Prevents archiving the last active board of a project. Projects must always have at least one board.';

COMMIT;
