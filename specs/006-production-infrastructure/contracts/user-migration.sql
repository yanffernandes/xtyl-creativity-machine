-- =============================================================================
-- User Table Migration for Supabase Auth
-- =============================================================================
-- Run this BEFORE the Supabase trigger to prepare the users table
-- Run in: Supabase Dashboard > SQL Editor
-- =============================================================================

-- Step 1: Alter users table to use UUID and remove auth columns
-- Note: This assumes no existing data (fresh production deployment)

-- If table exists with old schema, drop auth-related columns
ALTER TABLE public.users DROP COLUMN IF EXISTS hashed_password;
ALTER TABLE public.users DROP COLUMN IF EXISTS is_active;

-- Add updated_at column if not exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

-- Alter id column to UUID if it's VARCHAR (for existing table)
-- Note: If you have existing data, you'll need to handle the conversion
-- For fresh deployment, this should work:
DO $$
BEGIN
    -- Check if id column is not already UUID
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'id'
        AND data_type = 'character varying'
    ) THEN
        -- For fresh table, we can recreate with proper type
        -- This will fail if there's data - which is expected for migration
        ALTER TABLE public.users ALTER COLUMN id TYPE uuid USING id::uuid;
    END IF;
END $$;

-- Ensure email has NOT NULL constraint
ALTER TABLE public.users ALTER COLUMN email SET NOT NULL;

-- =============================================================================
-- Verify the schema
-- =============================================================================
-- Run this query to verify the table structure:
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'users'
-- ORDER BY ordinal_position;
--
-- Expected output:
-- | column_name | data_type                | is_nullable |
-- |-------------|--------------------------|-------------|
-- | id          | uuid                     | NO          |
-- | email       | character varying        | NO          |
-- | full_name   | character varying        | YES         |
-- | created_at  | timestamp with time zone | YES         |
-- | updated_at  | timestamp with time zone | YES         |
