# Quickstart: Hybrid Supabase Architecture Migration

**Feature**: 007-hybrid-supabase-architecture | **Date**: 2025-11-28

## Overview

This guide walks through migrating XTYL Creativity Machine from Python backend CRUD to direct Supabase Client access. After migration:

- **CRUD operations** (Workspaces, Projects, Documents, Folders, Templates, Preferences, Conversations) → Supabase Client (~500ms)
- **AI operations** (Chat, Image Generation, Workflows, RAG) → Python Backend (unchanged)

## Prerequisites

- [ ] Supabase project with PostgreSQL database
- [ ] Supabase Auth configured (already in use)
- [ ] Access to Supabase SQL Editor (for RLS policies)
- [ ] Environment variables configured

## Migration Steps

### Step 1: Apply RLS Policies to Database

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of [contracts/rls-policies.sql](./contracts/rls-policies.sql)
3. Execute the script in order:
   - Enable RLS on tables
   - Create helper functions
   - Create indexes
   - Apply policies

**Verification:**
```sql
-- List all policies to verify
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
```

### Step 2: Install Frontend Dependencies

```bash
cd frontend
npm install @supabase/ssr @supabase/supabase-js
```

### Step 3: Configure Environment Variables

Add to `frontend/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Step 4: Create Supabase Client

Create `frontend/src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getSupabaseClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return browserClient
}
```

### Step 5: Generate TypeScript Types

```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Generate types from database schema
supabase gen types typescript --project-id your-project-id > frontend/src/types/supabase.ts
```

### Step 6: Implement Supabase Services

Create service files in `frontend/src/lib/supabase/`:

**Example: workspaces.ts**
```typescript
import { getSupabaseClient } from './client'
import type { Workspace, WorkspaceInsert, WorkspaceUpdate, ServiceResult } from '@/types/supabase-services'

export const workspaceService = {
  async list(): Promise<ServiceResult<Workspace[]>> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: false })

    return { data, error }
  },

  async create(workspace: WorkspaceInsert): Promise<ServiceResult<Workspace>> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('workspaces')
      .insert(workspace)
      .select()
      .single()

    if (data && !error) {
      // Add creator as owner
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('workspace_users').insert({
          workspace_id: data.id,
          user_id: user.id,
          role: 'owner'
        })
      }
    }

    return { data, error }
  },

  async update(id: string, workspace: WorkspaceUpdate): Promise<ServiceResult<Workspace>> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('workspaces')
      .update(workspace)
      .eq('id', id)
      .select()
      .single()

    return { data, error }
  },

  async delete(id: string): Promise<ServiceResult<void>> {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', id)

    return { data: null, error }
  }
}
```

### Step 7: Create React Query Hooks

**Example: use-workspaces.ts**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workspaceService } from '@/lib/supabase/workspaces'
import { toast } from 'sonner'

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const { data, error } = await workspaceService.list()
      if (error) throw error
      return data
    }
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: workspaceService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      toast.success('Workspace created')
    },
    onError: (error) => {
      toast.error('Failed to create workspace')
      console.error(error)
    }
  })
}
```

### Step 8: Update Components

Replace API calls with Supabase service calls:

**Before (Python Backend):**
```typescript
const response = await fetch('/api/workspaces')
const workspaces = await response.json()
```

**After (Supabase Client):**
```typescript
const { data: workspaces } = useWorkspaces()
```

### Step 9: Remove Python Backend CRUD Routes

After frontend migration is complete:

1. Delete/comment out CRUD routes in Python backend:
   - `backend/routers/workspaces.py` (keep members endpoint if needed)
   - `backend/routers/projects.py` (entire file)
   - `backend/routers/documents.py` (keep upload/export endpoints)
   - `backend/routers/folders.py` (entire file)
   - `backend/routers/templates.py` (entire file)
   - `backend/routers/preferences.py` (entire file)
   - `backend/routers/conversations.py` (keep if chat history stored in backend)

2. Update `backend/main.py` to remove router imports

### Step 10: Test Migration

**Performance Tests:**
```typescript
// Measure CRUD latency
const start = performance.now()
const { data } = await workspaceService.list()
console.log(`Workspaces loaded in ${performance.now() - start}ms`)
// Target: < 500ms
```

**RLS Tests:**
```sql
-- Test as different users
SET request.jwt.claims TO '{"sub": "user-id-1"}';
SELECT * FROM workspaces; -- Should only return user-1's workspaces

SET request.jwt.claims TO '{"sub": "user-id-2"}';
SELECT * FROM workspaces; -- Should only return user-2's workspaces
```

## Service Implementation Checklist

| Service | File | Status |
|---------|------|--------|
| Workspace CRUD | `lib/supabase/workspaces.ts` | ⬜ |
| Workspace Members | `lib/supabase/workspaces.ts` | ⬜ |
| Project CRUD | `lib/supabase/projects.ts` | ⬜ |
| Document CRUD | `lib/supabase/documents.ts` | ⬜ |
| Document Sharing | `lib/supabase/documents.ts` | ⬜ |
| Folder CRUD | `lib/supabase/folders.ts` | ⬜ |
| Template CRUD | `lib/supabase/templates.ts` | ⬜ |
| User Preferences | `lib/supabase/preferences.ts` | ⬜ |
| Conversations | `lib/supabase/conversations.ts` | ⬜ |

## Rollback Plan

If migration fails:

1. **Frontend**: Revert to API calls by changing imports
2. **Backend**: Uncomment CRUD routes in `main.py`
3. **Database**: RLS policies can remain (they don't affect backend access with service role)

## Post-Migration

After successful migration:

1. Monitor Supabase Dashboard for query performance
2. Check error logs for RLS policy violations
3. Verify real-time subscriptions (if enabled)
4. Update API documentation to reflect new architecture
5. Remove deprecated Python CRUD code permanently

## Troubleshooting

### "Permission denied" errors
- Check RLS policies are applied correctly
- Verify user JWT contains valid `sub` claim
- Test with `user_is_workspace_member()` function

### Slow queries
- Ensure indexes are created (especially `idx_workspace_users_user_workspace`)
- Check Supabase Dashboard → Database → Query Performance

### Auth issues
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Check browser console for auth errors
- Ensure user is signed in before making queries
