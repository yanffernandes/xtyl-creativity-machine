-- Migration 040: Add is_default flag to board_columns
-- Date: 2026-03-15
-- Description:
--   - Adds is_default boolean to board_columns so the system knows where to
--     place new documents when no column is explicitly chosen.
--   - Backfills existing boards: the column with the lowest position becomes default.
--   - Updates the auto-create trigger to mark the first column (Backlog) as default.

BEGIN;

-- 1) Add column
ALTER TABLE public.board_columns
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

-- 2) Backfill: mark lowest-position column per board as default
UPDATE public.board_columns bc
SET is_default = true
WHERE bc.id IN (
  SELECT DISTINCT ON (board_id) id
  FROM public.board_columns
  ORDER BY board_id, position ASC, created_at ASC
);

-- 3) Update trigger to mark Backlog (first column) as default on new boards
CREATE OR REPLACE FUNCTION public.create_default_board_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.board_columns (board_id, name, color, position, is_default)
  VALUES
    (NEW.id, 'Backlog',      '#64748b', 0, true),
    (NEW.id, 'Em Progresso', '#3b82f6', 1, false),
    (NEW.id, 'Concluido',    '#22c55e', 2, false);
  RETURN NEW;
END;
$$;

COMMIT;
