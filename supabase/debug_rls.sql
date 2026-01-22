-- Debug script to test RLS policies
-- Run this in Supabase SQL Editor to understand what's blocking workspace creation

-- 1. Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('workspaces', 'workspace_users')
ORDER BY tablename;

-- 2. List all policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('workspaces', 'workspace_users')
ORDER BY tablename, policyname;

-- 3. Check helper functions exist
SELECT
  proname,
  pronargs,
  prorettype::regtype
FROM pg_proc
WHERE proname LIKE 'user_is_%'
ORDER BY proname;

-- 4. Test workspace INSERT policy (should return true for authenticated users)
-- This simulates what happens when you try to create a workspace
SELECT
  'Workspace INSERT policy check' as test_name,
  auth.uid() IS NOT NULL as can_insert_workspace;

-- 5. Check current user
SELECT
  'Current user' as info,
  auth.uid() as user_id,
  auth.role() as role;
