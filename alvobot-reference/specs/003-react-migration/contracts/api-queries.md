# API Contracts: Supabase Queries

**Date**: 2025-12-10
**Feature**: 003-react-migration

## Overview

This document defines the TanStack Query hooks that mirror the existing Vue/Pinia data fetching patterns. All queries use the Supabase client directly; the NestJS backend is used only for health checks and complex operations.

## Query Key Conventions

```typescript
// Query keys follow this pattern:
const queryKeys = {
  projects: {
    all: ['projects'] as const,
    list: (filters: ProjectFilters) => ['projects', 'list', filters] as const,
    detail: (id: number) => ['projects', 'detail', id] as const,
  },
  articles: {
    all: ['articles'] as const,
    list: (projectId: number, filters: ArticleFilters) => ['articles', 'list', projectId, filters] as const,
    detail: (id: number) => ['articles', 'detail', id] as const,
  },
  // ... same pattern for other entities
}
```

## Authentication

### useSession

```typescript
// Hook: useSession
// Purpose: Get current session and listen for changes
// Returns: { session, user, isLoading, error }

const useSession = () => {
  return useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      return data.session
    },
    staleTime: Infinity,  // Managed by auth state listener
  })
}
```

### useLogin

```typescript
// Hook: useLogin
// Purpose: Sign in with email/password
// Returns: UseMutationResult

const useLogin = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ email, password }: LoginParams) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['session'], data.session)
    }
  })
}
```

### useLogout

```typescript
// Hook: useLogout
// Purpose: Sign out current user
// Returns: UseMutationResult

const useLogout = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.clear()  // Clear all cached data
    }
  })
}
```

## Projects

### useProjects

```typescript
// Hook: useProjects
// Purpose: Fetch user's projects
// Supabase query: projects table, filtered by user_id

const useProjects = () => {
  return useQuery({
    queryKey: queryKeys.projects.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Project[]
    }
  })
}
```

### useProject

```typescript
// Hook: useProject
// Purpose: Fetch single project by ID
// Params: id: number

const useProject = (id: number) => {
  return useQuery({
    queryKey: queryKeys.projects.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Project
    },
    enabled: !!id
  })
}
```

### useCreateProject

```typescript
// Hook: useCreateProject
// Purpose: Create new project

const useCreateProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (project: Omit<Project, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('projects')
        .insert(project)
        .select()
        .single()

      if (error) throw error
      return data as Project
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
    }
  })
}
```

### useUpdateProject

```typescript
// Hook: useUpdateProject
// Purpose: Update existing project

const useUpdateProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: number }) => {
      const { data, error } = await supabase
        .from('projects')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Project
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
      queryClient.setQueryData(queryKeys.projects.detail(data.id), data)
    }
  })
}
```

### useDeleteProject

```typescript
// Hook: useDeleteProject
// Purpose: Soft delete project (set is_deleted = true)

const useDeleteProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('projects')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
    }
  })
}
```

## Articles

### useArticles

```typescript
// Hook: useArticles
// Purpose: Fetch articles for a project
// Params: projectId: number, filters?: ArticleFilters

interface ArticleFilters {
  status?: string
  search?: string
  limit?: number
  offset?: number
}

const useArticles = (projectId: number, filters?: ArticleFilters) => {
  return useQuery({
    queryKey: queryKeys.articles.list(projectId, filters || {}),
    queryFn: async () => {
      let query = supabase
        .from('articles')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`)
      }
      if (filters?.limit) {
        query = query.limit(filters.limit)
      }
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      const { data, error, count } = await query
      if (error) throw error
      return { data: data as Article[], count }
    },
    enabled: !!projectId
  })
}
```

### useArticle

```typescript
// Hook: useArticle
// Purpose: Fetch single article by ID

const useArticle = (id: number) => {
  return useQuery({
    queryKey: queryKeys.articles.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Article
    },
    enabled: !!id
  })
}
```

### useCreateArticle / useUpdateArticle / useDeleteArticle

```typescript
// Same pattern as Projects - omitted for brevity
// Key difference: articles use project_id for filtering
```

## Tasks

### useTasks

```typescript
// Hook: useTasks
// Purpose: Fetch tasks, optionally filtered by project

interface TaskFilters {
  projectId?: number
  status?: TaskStatus
  categoryId?: number
}

const useTasks = (filters?: TaskFilters) => {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          category:tasks_categories(id, name)
        `)
        .order('sort_order', { ascending: true })

      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Task[]
    }
  })
}
```

### useTasksByDate

```typescript
// Hook: useTasksByDate
// Purpose: Fetch tasks for calendar view
// Params: startDate, endDate

const useTasksByDate = (startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ['tasks', 'calendar', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .or(`started_at.gte.${startDate},completed_at.lte.${endDate}`)
        .order('started_at', { ascending: true })

      if (error) throw error
      return data as Task[]
    },
    enabled: !!startDate && !!endDate
  })
}
```

## Keywords

### useKeywords

```typescript
// Hook: useKeywords
// Purpose: Search/list keywords

interface KeywordFilters {
  search?: string
  language?: string
  country?: string
  limit?: number
}

const useKeywords = (filters?: KeywordFilters) => {
  return useQuery({
    queryKey: ['keywords', filters],
    queryFn: async () => {
      let query = supabase
        .from('keywords')
        .select('*')
        .order('search_volume', { ascending: false })

      if (filters?.search) {
        query = query.ilike('word', `%${filters.search}%`)
      }
      if (filters?.language) {
        query = query.eq('language', filters.language)
      }
      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Keyword[]
    }
  })
}
```

## Connections

### useConnections

```typescript
// Hook: useConnections
// Purpose: Fetch user's third-party connections

const useConnections = () => {
  return useQuery({
    queryKey: ['connections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Connection[]
    }
  })
}
```

## Runs

### useRuns

```typescript
// Hook: useRuns
// Purpose: Fetch execution history

interface RunFilters {
  flowId?: string
  status?: RunStatus
  limit?: number
}

const useRuns = (filters?: RunFilters) => {
  return useQuery({
    queryKey: ['runs', filters],
    queryFn: async () => {
      let query = supabase
        .from('runs')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters?.flowId) {
        query = query.eq('flow_id', filters.flowId)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Run[]
    }
  })
}
```

## Real-time Subscriptions

### useRealtimeRuns

```typescript
// Hook: useRealtimeRuns
// Purpose: Subscribe to run status changes

const useRealtimeRuns = (flowId: string) => {
  const queryClient = useQueryClient()

  useEffect(() => {
    const subscription = supabase
      .channel(`runs:${flowId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'runs',
        filter: `flow_id=eq.${flowId}`
      }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ['runs', { flowId }] })
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [flowId, queryClient])
}
```

## Error Handling

All hooks should use a consistent error wrapper:

```typescript
// utils/supabase-error.ts
export class SupabaseError extends Error {
  code: string
  details: string
  hint: string

  constructor(error: PostgrestError) {
    super(error.message)
    this.code = error.code
    this.details = error.details
    this.hint = error.hint
  }
}

// Usage in hooks
if (error) throw new SupabaseError(error)
```

## Query Client Configuration

```typescript
// app/providers.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,      // 5 minutes
      gcTime: 1000 * 60 * 30,        // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    }
  }
})
```
