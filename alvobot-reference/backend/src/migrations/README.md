# Database Migrations

This directory contains SQL migrations for the AlvoBot database (Supabase PostgreSQL).

## How to Run Migrations

Since this project uses Supabase, migrations should be run through the Supabase SQL Editor:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the migration SQL file contents
5. Click **Run** to execute the migration

## Migration Files

Migrations are numbered sequentially and should be run in order:

- `001_add_projects_connection_fields.sql` - Adds connection status tracking fields to projects table

## Verifying Migrations

After running a migration, verify the changes:

```sql
-- Check columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'projects'
AND column_name IN ('connection_status', 'last_connection_test', 'connection_error_message', 'articles_count', 'last_sync_at');

-- Check constraints
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'connection_status_check';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'projects';
```

## Rollback

To rollback migration 001:

```sql
-- Remove added columns
ALTER TABLE projects
DROP COLUMN IF EXISTS connection_status,
DROP COLUMN IF EXISTS last_connection_test,
DROP COLUMN IF EXISTS connection_error_message,
DROP COLUMN IF EXISTS articles_count,
DROP COLUMN IF EXISTS last_sync_at;

-- Remove constraint
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS connection_status_check;
```
