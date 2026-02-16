# Frontend Architecture Design: Feature-Based Vue 3 Structure

**Date**: 2025-12-04
**Feature**: 002-frontend-modernization
**Status**: Phase 1 Design

---

## Overview

This document defines the precise architecture patterns for the modernized AlvoBot frontend. It covers directory structure, naming conventions, component patterns, state management, and routing architecture.

---

## 1. Directory Structure

### 1.1 Complete Structure

```
frontend/
├── src/
│   ├── features/                    # Feature modules (business domains)
│   │   ├── auth/
│   │   │   ├── components/          # Auth-specific components
│   │   │   │   ├── LoginForm.vue
│   │   │   │   ├── SignupForm.vue
│   │   │   │   └── PasswordResetForm.vue
│   │   │   ├── pages/               # Auth pages (route components)
│   │   │   │   ├── LoginPage.vue
│   │   │   │   ├── SignupPage.vue
│   │   │   │   ├── ForgotPasswordPage.vue
│   │   │   │   └── ResetPasswordPage.vue
│   │   │   ├── stores/              # Auth state (Pinia)
│   │   │   │   └── auth.ts
│   │   │   ├── api/                 # Auth API calls
│   │   │   │   └── auth.ts
│   │   │   ├── composables/         # Auth-specific composables
│   │   │   │   └── useAuthGuard.ts
│   │   │   └── types/               # Auth TypeScript types
│   │   │       └── index.ts
│   │   ├── tasks/                   # Task management feature
│   │   ├── articles/                # Article/content management
│   │   ├── projects/                # Project management
│   │   ├── calendar/                # Calendar/scheduling
│   │   ├── flows/                   # Workflow automation
│   │   ├── runs/                    # Execution history
│   │   ├── keywords/                # Keyword research (10x mining)
│   │   ├── settings/                # User settings
│   │   ├── connections/             # Integration management
│   │   ├── scraper/                 # Ads transparency scraper
│   │   └── users/                   # User management
│   ├── shared/                      # Cross-feature code (3+ uses)
│   │   ├── components/              # Reusable UI components
│   │   │   ├── Button.vue
│   │   │   ├── Input.vue
│   │   │   ├── Card.vue
│   │   │   ├── Modal.vue
│   │   │   └── DataTable.vue
│   │   ├── composables/             # Reusable Vue composables
│   │   │   ├── useForm.ts
│   │   │   ├── useNotifications.ts
│   │   │   └── usePagination.ts
│   │   ├── utils/                   # Utility functions
│   │   │   ├── supabase.ts          # Supabase client
│   │   │   ├── axios.ts             # HTTP client
│   │   │   ├── date.ts              # Date utilities
│   │   │   ├── formulas.ts          # Formula functions
│   │   │   └── validation.ts        # Validation helpers
│   │   ├── constants/               # Global constants
│   │   │   ├── routes.ts            # Route name constants
│   │   │   └── config.ts            # App config
│   │   ├── types/                   # Shared TypeScript types
│   │   │   ├── api.ts               # API response types
│   │   │   └── common.ts            # Common types
│   │   └── layouts/                 # Layout components
│   │       ├── AuthenticatedLayout.vue
│   │       └── PublicLayout.vue
│   ├── router/                      # Vue Router configuration
│   │   ├── index.ts                 # Router setup
│   │   ├── routes.ts                # Route definitions
│   │   └── guards.ts                # Navigation guards
│   ├── stores/                      # Global Pinia stores
│   │   ├── index.ts                 # Store registration
│   │   ├── app.ts                   # App-level state
│   │   └── notifications.ts         # Notification system
│   ├── assets/                      # Static assets
│   │   ├── css/
│   │   │   ├── main.css
│   │   │   └── variables.css
│   │   ├── images/
│   │   └── icons/
│   ├── App.vue                      # Root component
│   └── main.ts                      # Application entry point
├── public/                          # Public static files
├── index.html                       # Single HTML entry point
├── ARCHITECTURE.md                  # Architecture documentation
├── .env.example                     # Environment variables template
├── vite.config.ts                   # Vite configuration
├── tsconfig.json                    # TypeScript configuration
├── package.json                     # Dependencies
└── vitest.config.ts                 # Test configuration
```

### 1.2 Structure Rules

**Feature Module Rules**:
1. Each feature is self-contained in `features/{feature-name}/`
2. Feature can only import from:
   - Its own directory
   - `shared/`
   - `stores/` (global stores)
3. Features CANNOT import from other features (enforce with ESLint rule)

**Shared Module Rules**:
1. Component promoted to `shared/` when used by 3+ features
2. Shared code must have no feature-specific logic
3. Shared utils must be pure functions when possible

---

## 2. Naming Conventions

### 2.1 Files

**Components**: PascalCase with descriptive name + `Component` suffix where ambiguous
```
TaskCard.vue
ArticleEditor.vue
LoginForm.vue
Button.vue  (shared component, no suffix needed)
```

**Pages**: PascalCase + `Page` suffix
```
LoginPage.vue
TasksPage.vue
ArticleEditPage.vue
```

**Stores**: camelCase + feature name
```
auth.ts  (useAuthStore)
tasks.ts (useTasksStore)
app.ts   (useAppStore)
```

**Utilities**: camelCase, descriptive
```
supabase.ts
formulas.ts
validation.ts
```

**Types**: PascalCase interfaces/types
```
interface Task { ... }
type Article = { ... }
```

### 2.2 Directories

- Feature names: lowercase, singular (e.g., `auth`, `task`, `article`)
- Subdirectories: lowercase, plural (e.g., `components`, `stores`, `pages`)
- Shared: lowercase, plural

---

## 3. Component Architecture Patterns

### 3.1 Component Structure (Script Setup + TypeScript)

```vue
<script setup lang="ts">
// 1. Imports (grouped)
import { ref, computed, onMounted } from 'vue'
import { useTasksStore } from '../stores/tasks'
import Button from '@/shared/components/Button.vue'

// 2. Props interface
interface Props {
  taskId: number
  editable?: boolean
}

// 3. Props definition
const props = withDefaults(defineProps<Props>(), {
  editable: false
})

// 4. Emits definition
const emit = defineEmits<{
  save: [task: Task]
  cancel: []
}>()

// 5. Composables & stores
const tasksStore = useTasksStore()

// 6. Local reactive state
const loading = ref(false)
const task = ref<Task | null>(null)

// 7. Computed properties
const isValid = computed(() =>
  task.value?.title && task.value?.title.length > 0
)

// 8. Methods
async function save() {
  if (!task.value) return
  loading.value = true
  try {
    await tasksStore.updateTask(props.taskId, task.value)
    emit('save', task.value)
  } finally {
    loading.value = false
  }
}

// 9. Lifecycle hooks
onMounted(async () => {
  task.value = await tasksStore.fetchTask(props.taskId)
})
</script>

<template>
  <div class="task-edit">
    <input
      v-model="task.title"
      :disabled="!editable"
      placeholder="Task title"
    />

    <Button
      @click="save"
      :loading="loading"
      :disabled="!isValid"
    >
      Save
    </Button>
  </div>
</template>

<style scoped>
.task-edit {
  /* Component-specific styles */
}
</style>
```

### 3.2 Component Categories

**Presentation Components** (dumb/stateless):
- Receive all data via props
- Emit events for interactions
- No direct API calls or store access
- Example: Button, Input, Card

**Container Components** (smart/stateful):
- Access stores and composables
- Handle business logic
- Pass data to presentation components
- Example: TaskList, ArticleEditor

**Page Components**:
- Top-level route components
- Orchestrate container components
- Handle route parameters
- Example: TasksPage, LoginPage

**Layout Components**:
- Structure wrapping multiple pages
- Global navigation, headers, footers
- Example: AuthenticatedLayout

---

## 4. State Management Architecture (Pinia)

### 4.1 Store Pattern (Composition API Style)

```typescript
// src/features/tasks/stores/tasks.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/shared/utils/supabase'
import type { Task } from '../types'

export const useTasksStore = defineStore('tasks', () => {
  // ===== STATE =====
  const tasks = ref<Task[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ===== GETTERS (computed) =====
  const completedTasks = computed(() =>
    tasks.value.filter(t => t.completed)
  )

  const pendingTasks = computed(() =>
    tasks.value.filter(t => !t.completed)
  )

  const taskCount = computed(() => tasks.value.length)

  // ===== ACTIONS =====
  async function fetchTasks() {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      tasks.value = data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createTask(task: Partial<Task>) {
    const { data, error: createError } = await supabase
      .from('tasks')
      .insert(task)
      .select()
      .single()

    if (createError) throw createError
    tasks.value.unshift(data)
    return data
  }

  async function updateTask(id: number, updates: Partial<Task>) {
    const { data, error: updateError } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    const index = tasks.value.findIndex(t => t.id === id)
    if (index !== -1) {
      tasks.value[index] = data
    }
    return data
  }

  async function deleteTask(id: number) {
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError
    tasks.value = tasks.value.filter(t => t.id !== id)
  }

  // ===== RESET =====
  function $reset() {
    tasks.value = []
    loading.value = false
    error.value = null
  }

  return {
    // State
    tasks,
    loading,
    error,
    // Getters
    completedTasks,
    pendingTasks,
    taskCount,
    // Actions
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    $reset
  }
})
```

### 4.2 Store Organization Rules

**Feature Stores** (`features/{feature}/stores/`):
- Contains feature-specific state
- Feature-specific API calls
- Feature-specific business logic

**Global Stores** (`stores/`):
- App-level state (theme, locale, user session)
- Notification system
- Global UI state (modals, sidebars)

**Store Communication**:
- Stores can call other stores via composable pattern
- Avoid circular dependencies
- Use events for loose coupling when needed

---

## 5. Routing Architecture

### 5.1 Router Setup

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { setupNavigationGuards } from './guards'
import { routes } from './routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

setupNavigationGuards(router)

export default router
```

### 5.2 Route Definitions

```typescript
// src/router/routes.ts
import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  // ===== PUBLIC ROUTES =====
  {
    path: '/login',
    name: 'login',
    component: () => import('@/features/auth/pages/LoginPage.vue'),
    meta: { layout: 'public' }
  },
  {
    path: '/signup',
    name: 'signup',
    component: () => import('@/features/auth/pages/SignupPage.vue'),
    meta: { layout: 'public' }
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/features/auth/pages/ForgotPasswordPage.vue'),
    meta: { layout: 'public' }
  },

  // ===== AUTHENTICATED ROUTES =====
  {
    path: '/',
    component: () => import('@/shared/layouts/AuthenticatedLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/features/dashboard/pages/DashboardPage.vue'),
        meta: { title: 'Dashboard' }
      },
      {
        path: 'tasks',
        name: 'tasks',
        component: () => import('@/features/tasks/pages/TasksPage.vue'),
        meta: { title: 'Tasks' }
      },
      {
        path: 'articles',
        name: 'articles',
        component: () => import('@/features/articles/pages/ArticlesPage.vue'),
        meta: { title: 'Articles' }
      },
      {
        path: 'articles/edit/:id',
        name: 'article-edit',
        component: () => import('@/features/articles/pages/ArticleEditPage.vue'),
        meta: { title: 'Edit Article' },
        props: true  // Pass route params as props
      },
      {
        path: 'projects',
        name: 'projects',
        component: () => import('@/features/projects/pages/ProjectsPage.vue'),
        meta: { title: 'Projects' }
      },
      {
        path: 'projects/:id',
        name: 'project-detail',
        component: () => import('@/features/projects/pages/ProjectDetailPage.vue'),
        meta: { title: 'Project Details' },
        props: true
      }
    ]
  },

  // ===== 404 =====
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/shared/pages/NotFoundPage.vue')
  }
]
```

### 5.3 Navigation Guards

```typescript
// src/router/guards.ts
import type { Router } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth'

export function setupNavigationGuards(router: Router) {
  // Authentication guard
  router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()

    // Check authentication status
    if (!authStore.initialized) {
      await authStore.initialize()
    }

    // Require auth for protected routes
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      next({
        name: 'login',
        query: { redirect: to.fullPath }
      })
      return
    }

    // Redirect authenticated users away from public pages
    if (to.name === 'login' && authStore.isAuthenticated) {
      next({ name: 'dashboard' })
      return
    }

    next()
  })

  // Page title guard
  router.afterEach((to) => {
    const title = to.meta.title as string | undefined
    document.title = title ? `${title} - AlvoBot` : 'AlvoBot'
  })
}
```

---

## 6. API Layer Patterns

### 6.1 Supabase Client Setup

```typescript
// src/shared/utils/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})
```

### 6.2 API Module Pattern

```typescript
// src/features/tasks/api/tasks.ts
import { supabase } from '@/shared/utils/supabase'
import type { Task, CreateTaskInput, UpdateTaskInput } from '../types'

export const tasksApi = {
  async getAll(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getById(id: number): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async create(input: CreateTaskInput): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: number, input: UpdateTaskInput): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
```

---

## 7. Composables Patterns

### 7.1 Composable Structure

```typescript
// src/shared/composables/useForm.ts
import { ref, computed } from 'vue'
import type { Ref } from 'vue'

export interface UseFormOptions<T> {
  initialValues: T
  onSubmit: (values: T) => Promise<void> | void
  validate?: (values: T) => Record<string, string>
}

export function useForm<T extends Record<string, any>>(
  options: UseFormOptions<T>
) {
  const values = ref(options.initialValues) as Ref<T>
  const errors = ref<Record<string, string>>({})
  const touched = ref<Record<string, boolean>>({})
  const isSubmitting = ref(false)

  const isValid = computed(() =>
    Object.keys(errors.value).length === 0
  )

  function setFieldValue(field: keyof T, value: any) {
    values.value[field] = value
    validateField(field)
  }

  function validateField(field: keyof T) {
    if (!options.validate) return

    const fieldErrors = options.validate(values.value)
    if (fieldErrors[field as string]) {
      errors.value[field as string] = fieldErrors[field as string]
    } else {
      delete errors.value[field as string]
    }
  }

  async function handleSubmit() {
    // Validate all fields
    if (options.validate) {
      errors.value = options.validate(values.value)
    }

    if (!isValid.value) return

    isSubmitting.value = true
    try {
      await options.onSubmit(values.value)
    } finally {
      isSubmitting.value = false
    }
  }

  function reset() {
    values.value = { ...options.initialValues }
    errors.value = {}
    touched.value = {}
  }

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    setFieldValue,
    handleSubmit,
    reset
  }
}
```

---

## 8. Type System

### 8.1 Feature Types

```typescript
// src/features/tasks/types/index.ts
export interface Task {
  id: number
  title: string
  description: string | null
  completed: boolean
  user_id: string
  created_at: string
  updated_at: string
}

export type CreateTaskInput = Omit<Task, 'id' | 'created_at' | 'updated_at'>

export type UpdateTaskInput = Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>
```

### 8.2 Shared Types

```typescript
// src/shared/types/api.ts
export interface ApiResponse<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: {
    message: string
    status: number
  }
}

export type ApiResult<T> = ApiResponse<T> | ApiError
```

---

## 9. Import Path Conventions

### 9.1 Path Aliases

```typescript
// tsconfig.json / vite.config.ts
{
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

### 9.2 Import Rules

**Within Feature** (relative imports):
```typescript
import { useTasksStore } from '../stores/tasks'
import TaskCard from '../components/TaskCard.vue'
import type { Task } from '../types'
```

**From Shared** (absolute imports):
```typescript
import Button from '@/shared/components/Button.vue'
import { supabase } from '@/shared/utils/supabase'
import { useForm } from '@/shared/composables/useForm'
```

**From Other Feature** (NOT ALLOWED - use shared instead):
```typescript
// ❌ BAD: Direct feature import
import { useTasksStore } from '@/features/tasks/stores/tasks'

// ✅ GOOD: If needed across features, move to shared
import { useSharedData } from '@/shared/composables/useSharedData'
```

---

## 10. CSS Architecture

### 10.1 Global Styles

```css
/* src/assets/css/variables.css */
:root {
  /* Colors */
  --color-primary: #3b82f6;
  --color-secondary: #8b5cf6;
  --color-success: #10b981;
  --color-error: #ef4444;
  --color-warning: #f59e0b;

  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'Fira Code', monospace;
}
```

### 10.2 Component Styles (Scoped)

```vue
<style scoped>
.task-card {
  padding: var(--spacing-md);
  border-radius: 0.5rem;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.task-card__title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-gray-900);
}
</style>
```

---

## Summary

This architecture provides:
- **Clear boundaries**: Features are isolated, shared code is centralized
- **Scalability**: Add new features without touching existing code
- **Type safety**: TypeScript throughout with proper interfaces
- **Testability**: Pure functions, composables, and stores are easily testable
- **Performance**: Lazy-loaded routes, optimized chunks
- **Maintainability**: Consistent patterns, clear naming conventions

**Next Steps**: Proceed to quickstart.md for execution guidance, then update agent context and generate tasks.md.
