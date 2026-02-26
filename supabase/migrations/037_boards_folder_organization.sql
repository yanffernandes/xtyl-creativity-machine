-- Migration 037: Allow boards to be organized by folders
-- Date: 2026-02-26
-- Safe to run even if column already exists.

BEGIN;

ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS folder_id VARCHAR REFERENCES public.folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_boards_folder_id ON public.boards(folder_id);

COMMENT ON COLUMN public.boards.folder_id IS 'Optional folder that organizes this board inside the project tree';

COMMIT;
