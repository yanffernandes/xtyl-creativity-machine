# Research: Hybrid Supabase Architecture Migration

**Date**: 2025-11-28 | **Feature**: 007-hybrid-supabase-architecture

## Research Questions

### RQ-001: RLS Policy Patterns for Multi-Tenant Workspace Membership

**Question**: What RLS patterns enforce workspace membership effectively in Supabase PostgreSQL?

**Findings**:

The recommended pattern uses a `workspace_users` junction table with `auth.uid()` to check membership:

```sql
-- Base policy function for workspace membership check
CREATE OR REPLACE FUNCTION public.user_has_workspace_access(workspace_id_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_users
    WHERE workspace_id = workspace_id_param
      AND user_id = auth.uid()::TEXT
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Key Insights**:
1. **SECURITY DEFINER**: Required for function to bypass RLS when checking membership
2. **auth.uid() cast**: Must cast UUID to TEXT when comparing with string columns
3. **Ownership vs Membership**: Separate policies for owners (full access) vs members (read + limited write)
4. **Performance**: Index on `workspace_users(user_id, workspace_id)` critical for query speed

**Decision**: Use workspace membership function with separate owner/member policies.

---

### RQ-002: Supabase Client Initialization Best Practices

**Question**: How should the Supabase client be initialized in Next.js 14 with App Router?

**Findings**:

Two client types needed:
1. **Browser Client**: For client components, uses session from cookies
2. **Server Client**: For server components/actions, uses service role sparingly

```typescript
// lib/supabase/client.ts - Browser singleton
import { createBrowserClient } from '@supabase/ssr'

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return browserClient
}
```

**Key Insights**:
1. **@supabase/ssr**: Preferred over @supabase/auth-helpers-nextjs (deprecated)
2. **Singleton pattern**: Prevents multiple GoTrueClient instances
3. **Environment variables**: Only `NEXT_PUBLIC_*` vars exposed to browser
4. **Auth state**: Automatically syncs with Supabase Auth session

**Decision**: Use `@supabase/ssr` with browser singleton pattern.

---

### RQ-003: Real-time Subscriptions with RLS

**Question**: How do Supabase Realtime subscriptions work with Row Level Security?

**Findings**:

Realtime respects RLS policies but requires explicit enablement:

```sql
-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE documents;
ALTER PUBLICATION supabase_realtime ADD TABLE folders;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
```

```typescript
// Frontend subscription example
supabase
  .channel('documents')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'documents', filter: `project_id=eq.${projectId}` },
    (payload) => handleDocumentChange(payload)
  )
  .subscribe()
```

**Key Insights**:
1. **RLS enforcement**: Users only receive events for rows they can access
2. **Filter parameter**: Reduces bandwidth by server-side filtering
3. **Channel cleanup**: Must unsubscribe on component unmount
4. **Reconnection**: Automatic with exponential backoff

**Decision**: Enable realtime for documents/folders/projects tables initially. Defer to Phase 2 if complexity increases.

---

### RQ-004: Optimistic Updates with React Query

**Question**: What's the best pattern for optimistic updates with Supabase + React Query?

**Findings**:

React Query's mutation callbacks enable smooth optimistic UI:

```typescript
const mutation = useMutation({
  mutationFn: (newDocument) => supabase.from('documents').insert(newDocument),
  onMutate: async (newDocument) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['documents', projectId] })

    // Snapshot previous value
    const previousDocuments = queryClient.getQueryData(['documents', projectId])

    // Optimistically update
    queryClient.setQueryData(['documents', projectId], (old) => [...old, { ...newDocument, id: 'temp-' + Date.now() }])

    return { previousDocuments }
  },
  onError: (err, newDocument, context) => {
    // Rollback on error
    queryClient.setQueryData(['documents', projectId], context.previousDocuments)
  },
  onSettled: () => {
    // Refetch after mutation
    queryClient.invalidateQueries({ queryKey: ['documents', projectId] })
  }
})
```

**Key Insights**:
1. **Temporary IDs**: Use `temp-*` prefix for optimistic entries
2. **Snapshot pattern**: Always save previous state for rollback
3. **Error handling**: Toast notification + rollback
4. **Cache invalidation**: Refetch ensures server/client sync

**Decision**: Implement optimistic updates for create/update operations; immediate invalidation for deletes.

---

### RQ-005: Handling Session Expiration

**Question**: How to gracefully handle JWT token expiration during user sessions?

**Findings**:

Supabase handles refresh automatically, but edge cases need attention:

```typescript
// Auth state listener
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    // Token refreshed successfully - no action needed
  }
  if (event === 'SIGNED_OUT') {
    // Session expired or user signed out
    router.push('/auth/login')
    toast.error('Session expired. Please sign in again.')
  }
})
```

**Key Insights**:
1. **Auto-refresh**: Supabase refreshes tokens ~60s before expiry
2. **Offline handling**: Queue mutations during offline, sync on reconnect
3. **Error boundaries**: Catch 401 errors globally, redirect to login
4. **Local storage**: Session persisted in localStorage by default

**Decision**: Implement global auth state listener with toast notifications for expiration.

---

### RQ-006: Cascade Delete Considerations

**Question**: How should cascade deletes be handled for Workspace → Project → Document hierarchy?

**Findings**:

Two approaches:
1. **Database CASCADE**: Foreign key constraints handle deletion
2. **Application-level**: Explicit deletion in correct order

Current schema uses soft deletes (`deleted_at`) for Documents and Folders, which complicates CASCADE:

```sql
-- Soft delete doesn't trigger CASCADE, must handle in RLS/triggers
CREATE OR REPLACE FUNCTION cascade_soft_delete_project()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE documents SET deleted_at = NEW.deleted_at
    WHERE project_id = NEW.id AND deleted_at IS NULL;
  UPDATE folders SET deleted_at = NEW.deleted_at
    WHERE project_id = NEW.id AND deleted_at IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Key Insights**:
1. **Soft delete preference**: Maintains recoverability, audit trail
2. **Trigger complexity**: Database triggers more reliable than application code
3. **RLS interaction**: Triggers run with SECURITY DEFINER bypass

**Decision**: Use database triggers for cascade soft deletes; hard deletes via manual cleanup.

---

### RQ-007: Supabase Storage Integration

**Question**: Should file uploads remain in Python backend or move to Supabase Storage?

**Findings**:

Current implementation uses MinIO via Python backend. Migration considerations:

| Aspect | Keep Python/MinIO | Move to Supabase Storage |
|--------|-------------------|--------------------------|
| Latency | 2-3s (backend processing) | ~500ms (direct upload) |
| Security | Backend validates file type | Supabase policies + hooks |
| Complexity | Existing code works | Migration required |
| Cost | Self-hosted | Supabase billing |

**Decision**: Defer storage migration. Keep file uploads through Python backend initially. Document as future optimization.

---

## Summary of Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| RLS Pattern | Workspace membership function | Reusable, performant with proper indexing |
| Client Library | @supabase/ssr | Official recommendation for Next.js 14 |
| State Management | React Query + optimistic updates | Familiar pattern, good UX |
| Real-time | Enable for core entities | Improves perceived performance |
| Session Handling | Global auth listener | Graceful degradation |
| Cascade Deletes | Database triggers | Reliability over application code |
| File Storage | Keep Python backend | Defer complexity, working solution |

## Open Questions for Implementation

1. **Performance baseline**: Need to measure current Python backend latency for comparison
2. **Migration testing**: How to test RLS policies before production deployment?
3. **Rollback plan**: If migration fails, can we quickly revert to Python backend?
