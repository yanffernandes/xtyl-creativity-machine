# Research: Frontend Modernization - WeWeb to Native Vue Migration

**Date**: 2025-12-04
**Feature**: 002-frontend-modernization
**Purpose**: Resolve all technical unknowns for migrating from WeWeb-based frontend to native Vue 3 architecture

---

## Executive Summary

This research document provides comprehensive strategies for replacing ~11,668 lines of WeWeb-specific code with native Vue 3 implementations. All We Web dependencies (wwLib services, plugins, environment variables) can be replaced with existing packages or native Vue patterns. No new dependencies are required beyond what's already in package.json.

**Key Findings**:
- All 6 WeWeb plugins have direct replacements (Supabase, Day.js, Axios, Chart.js)
- All wwLib services map to Pinia stores + Vue composables
- UUID components can be systematically renamed using directory structure analysis
- Vuex → Pinia migration is straightforward (similar API)
- 28 HTML entry points consolidate to 1 SPA with Vue Router lazy loading
- Vitest recommended for automated smoke tests (native Vite support)

---

## 1. WeWeb Service Replacement Strategy

### 1.1 wwAuth Service → Supabase Auth Direct

**Current (WeWeb)**:
```javascript
// wwLib/services/wwAuth.js
wwLib.wwAuth.login(email, password)
wwLib.wwAuth.signUp(email, password)
wwLib.wwAuth.logout()
wwLib.wwAuth.getUser()
```

**Decision**: Replace with Supabase Auth SDK directly

**Rationale**:
- Supabase JS 2.50.3 already in package.json
- Direct API calls eliminate WeWeb middleware overhead
- Better TypeScript support with native Supabase types
- Access to full Supabase Auth feature set (MFA, OAuth, magic links)

**Implementation**:
```typescript
// src/features/auth/api/auth.ts
import { supabase } from '@/shared/utils/supabase'

export const authApi = {
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data
  },

  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })
    if (error) throw error
    return data
  },

  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }
}
```

**Alternatives Considered**:
- Custom auth service: Rejected (unnecessary abstraction, Supabase API is already clean)
- Keep WeWeb wrapper: Rejected (maintains dependency, no benefit)

---

### 1.2 wwCollection Service → Pinia Stores + Supabase Queries

**Current (WeWeb)**:
```javascript
// wwLib/services/wwCollection.js
wwLib.wwCollection.fetch('tasks')
wwLib.wwCollection.create('tasks', data)
wwLib.wwCollection.update('tasks', id, data)
wwLib.wwCollection.delete('tasks', id)
```

**Decision**: Replace with Pinia stores containing Supabase query logic

**Rationale**:
- Pinia provides reactive state management (already in package.json)
- Supabase client handles CRUD operations natively
- Pinia stores offer better dev tools and debugging
- Aligns with Vue 3 ecosystem standards

**Implementation**:
```typescript
// src/features/tasks/stores/tasks.ts
import { defineStore } from 'pinia'
import { supabase } from '@/shared/utils/supabase'

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])
  const loading = ref(false)

  async function fetchTasks() {
    loading.value = true
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    tasks.value = data
    loading.value = false
  }

  async function createTask(task: Partial<Task>) {
    const { data, error } = await supabase
      .from('tasks')
      .insert(task)
      .select()
      .single()

    if (error) throw error
    tasks.value.unshift(data)
    return data
  }

  return { tasks, loading, fetchTasks, createTask }
})
```

**Alternatives Considered**:
- TanStack Query (React Query for Vue): Rejected (adds dependency, Pinia sufficient)
- Vuex modules: Rejected (migrating away from Vuex per spec)
- Global composables: Rejected (harder to test, Pinia preferred)

---

### 1.3 wwVariable Service → Pinia Reactive State

**Current (WeWeb)**:
```javascript
// wwLib/services/wwVariable.js
wwLib.wwVariable.updateValue('userId', 123)
wwLib.wwVariable.getValue('userId')
```

**Decision**: Replace with Pinia stores for global state

**Rationale**:
- Pinia provides same reactivity with better TypeScript support
- Centralized state management in feature stores
- Composables for computed derived state
- Better dev tools integration

**Implementation**:
```typescript
// src/stores/variables.ts
import { defineStore } from 'pinia'

export const useVariablesStore = defineStore('variables', () => {
  const userId = ref<number | null>(null)
  const theme = ref<'light' | 'dark'>('light')
  const locale = ref<string>('pt')

  function setUserId(id: number) {
    userId.value = id
  }

  return { userId, theme, locale, setUserId }
})
```

**Alternatives Considered**:
- Vue provide/inject: Rejected (not reactive by default, Pinia better)
- Global reactive object: Rejected (no dev tools, harder to debug)

---

### 1.4 wwWorkflow Service → Vue Composables

**Current (WeWeb)**:
```javascript
// wwLib/services/wwWorkflow.js
wwLib.wwWorkflow.execute('createTaskWorkflow', params)
```

**Decision**: Replace with Vue composables containing business logic

**Rationale**:
- Workflows are just orchestrated function calls
- Composables provide reusable logic with reactivity
- Better testability (unit test composables)
- Clear separation of concerns

**Implementation**:
```typescript
// src/features/tasks/composables/useTaskWorkflow.ts
import { useTasksStore } from '../stores/tasks'
import { useNotificationsStore } from '@/stores/notifications'

export function useTaskWorkflow() {
  const tasksStore = useTasksStore()
  const notifications = useNotificationsStore()

  async function createTaskWorkflow(taskData: Partial<Task>) {
    try {
      // Step 1: Validate
      if (!taskData.title) {
        throw new Error('Title is required')
      }

      // Step 2: Create task
      const task = await tasksStore.createTask(taskData)

      // Step 3: Show success notification
      notifications.success('Task created successfully')

      // Step 4: Navigate to task
      return task
    } catch (error) {
      notifications.error('Failed to create task')
      throw error
    }
  }

  return { createTaskWorkflow }
}
```

**Alternatives Considered**:
- Class-based workflows: Rejected (not idiomatic Vue 3, composables preferred)
- Saga pattern: Rejected (over-engineering for current needs)

---

### 1.5 wwFormula Service → Utility Functions

**Current (WeWeb)**:
```javascript
// wwLib/services/wwFormula.js
wwLib.wwFormula.calculate('dateISO', date)
wwLib.wwFormula.calculate('sum', array)
```

**Decision**: Replace with pure utility functions

**Rationale**:
- Formulas are just pure functions
- No need for special framework
- Easy to test and maintain
- Tree-shakable (only import what's used)

**Implementation**:
```typescript
// src/shared/utils/formulas.ts
import { format, parseISO } from 'date-fns'

export function toDateISO(date: Date | string): string {
  const parsed = typeof date === 'string' ? parseISO(date) : date
  return format(parsed, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
}

export function sum(numbers: number[]): number {
  return numbers.reduce((acc, n) => acc + n, 0)
}

export function average(numbers: number[]): number {
  return sum(numbers) / numbers.length
}
```

**Alternatives Considered**:
- Formula DSL/parser: Rejected (unnecessary complexity)
- Lodash for all utils: Rejected (already in package.json, use selectively)

---

### 1.6 wwElement Service → Native Vue Components

**Current (WeWeb)**:
```vue
<!-- _front/components/wwElement.vue -->
<wwElement :config="elementConfig" />
```

**Decision**: Replace with standard Vue components

**Rationale**:
- Vue components are the native primitive
- No need for WeWeb element wrapper
- Better performance (no wrapper overhead)
- Full access to Vue ecosystem

**Implementation**:
```vue
<!-- src/features/tasks/components/TaskCard.vue -->
<script setup lang="ts">
interface Props {
  task: Task
}

const props = defineProps<Props>()
</script>

<template>
  <div class="task-card">
    <h3>{{ task.title }}</h3>
    <p>{{ task.description }}</p>
  </div>
</template>
```

**Alternatives Considered**:
- Keep element wrapper: Rejected (unnecessary abstraction)
- Component library (Vuetify, Element Plus): Rejected (add complexity, custom design)

---

### 1.7 wwPageHelper Service → Vue Router Navigation

**Current (WeWeb)**:
```javascript
// wwLib/services/wwPageHelper.js
wwLib.wwPageHelper.goTo('/tasks')
wwLib.wwPageHelper.goToPage('taskDetails', { id: 123 })
```

**Decision**: Replace with Vue Router directly

**Rationale**:
- Vue Router 4.5.1 already in package.json
- Native SPA navigation
- Built-in navigation guards for auth
- Better TypeScript support

**Implementation**:
```typescript
// In component
import { useRouter } from 'vue-router'

const router = useRouter()

function navigateToTasks() {
  router.push('/tasks')
}

function navigateToTaskDetails(id: number) {
  router.push({ name: 'task-details', params: { id } })
}
```

**Alternatives Considered**:
- Navigation helper composable: Considered but rejected (Vue Router API already clean)

---

### 1.8 wwPluginHelper Service → Remove

**Current (WeWeb)**:
```javascript
// wwLib/services/wwPluginHelper.js
wwLib.wwPluginHelper.registerPlugin(plugin)
```

**Decision**: Remove entirely (no native equivalent needed)

**Rationale**:
- Plugin system not needed in non-WeWeb architecture
- Plugins become standard imports
- Simpler dependency graph

**Implementation**: N/A - just remove, use standard imports

---

## 2. WeWeb Plugin Migration Strategy

### 2.1 Plugin: Supabase (plugin-f9ef41c3)

**Decision**: Use @supabase/supabase-js directly

**Rationale**:
- Already in package.json (2.50.3)
- WeWeb plugin was just a wrapper around this
- Direct access to full Supabase API
- Better TypeScript types

**Implementation**:
```typescript
// src/shared/utils/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Migration Steps**:
1. Create supabase.ts utility
2. Replace all plugin imports with direct imports
3. Update API calls to use native Supabase syntax
4. Remove plugin configuration

---

### 2.2 Plugin: Supabase Auth (plugin-1fa0dd68)

**Decision**: Use Supabase Auth API directly (same client)

**Rationale**: Same as 2.1 - Auth is part of main Supabase client

**Implementation**: See section 1.1 (wwAuth replacement)

---

### 2.3 Plugin: Charts (plugin-9c40819b)

**Decision**: Use Chart.js directly (remove WeWeb wrapper)

**Rationale**:
- Chart.js is industry standard
- WeWeb plugin adds no value
- Better customization options

**Implementation**:
```vue
<!-- src/features/analytics/components/ChartComponent.vue -->
<script setup lang="ts">
import { Chart, registerables } from 'chart.js'
import { onMounted, ref } from 'vue'

Chart.register(...registerables)

const chartRef = ref<HTMLCanvasElement>()

onMounted(() => {
  if (!chartRef.value) return

  new Chart(chartRef.value, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar'],
      datasets: [{
        label: 'Tasks',
        data: [12, 19, 3]
      }]
    }
  })
})
</script>

<template>
  <canvas ref="chartRef"></canvas>
</template>
```

**Alternatives Considered**:
- Vue Chart.js wrapper: Considered but native API sufficient
- ECharts: Rejected (Chart.js already familiar to team)

---

### 2.4 Plugin: Date (plugin-832d6f7a)

**Decision**: Use Day.js directly

**Rationale**:
- Day.js 1.11.0 already in package.json
- date-fns 4.1.0 also available (consider switching)
- WeWeb plugin just wraps Day.js

**Implementation**:
```typescript
// src/shared/utils/date.ts
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'

dayjs.extend(relativeTime)
dayjs.extend(utc)

export { dayjs }

// Usage
import { dayjs } from '@/shared/utils/date'
const formatted = dayjs(date).format('YYYY-MM-DD')
```

**Recommendation**: Consider standardizing on date-fns (better tree-shaking, immutable)

---

### 2.5 Plugin: NPM (plugin-69d4a5bb)

**Decision**: Remove (not needed)

**Rationale**:
- In native Vue app, just import packages directly
- No plugin system needed
- Simpler dependency management

**Implementation**: Just use standard imports
```typescript
import axios from 'axios'
import { useQuery } from '@tanstack/vue-query'
```

---

### 2.6 Plugin: REST API (plugin-2bd1c688)

**Decision**: Use Axios directly

**Rationale**:
- Axios 1.12.2 already in package.json
- WeWeb plugin adds no value
- Native Axios has better interceptors

**Implementation**:
```typescript
// src/shared/utils/axios.ts
import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000
})

// Add auth interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('supabase.auth.token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export { apiClient }
```

---

## 3. UUID Component Semantic Naming Strategy

### 3.1 Naming Discovery Process

**Method**: Analyze component file contents to determine purpose

**Process**:
1. Read each UUID component file
2. Extract component name from exported name or comments
3. Identify feature domain from imports and prop types
4. Map to feature directory

### 3.2 Example Mappings (To Be Completed During Implementation)

Based on exploration, components should be mapped like:

```
components/elements/
├── [uuid-1].vue → src/features/tasks/components/TaskCard.vue
├── [uuid-2].vue → src/features/tasks/components/TaskList.vue
├── [uuid-3].vue → src/features/articles/components/ArticleEditor.vue
├── [uuid-4].vue → src/shared/components/Button.vue (used >3 times)
├── [uuid-5].vue → src/shared/components/Input.vue (used >3 times)
...
```

**Decision**: Manual mapping required during implementation phase

**Rationale**:
- Automated mapping risky (could misidentify purpose)
- Manual review ensures correct feature assignment
- Opportunity to apply 3+ feature rule for shared components
- Can identify unused components for removal

---

## 4. State Management Migration: Vuex → Pinia

### 4.1 Store Mappings

**Current Vuex Stores**:
```
store/
├── data.js           → stores/data.ts (Pinia)
├── front.js          → stores/app.ts (Pinia)
├── libraries.js      → DELETE (WeWeb-specific)
└── websiteData.js    → stores/website.ts (Pinia)
```

### 4.2 Migration Pattern

**Vuex Pattern**:
```javascript
// store/data.js
export default {
  namespaced: true,
  state: () => ({
    tasks: []
  }),
  mutations: {
    SET_TASKS(state, tasks) {
      state.tasks = tasks
    }
  },
  actions: {
    async fetchTasks({ commit }) {
      const tasks = await api.getTasks()
      commit('SET_TASKS', tasks)
    }
  },
  getters: {
    completedTasks: (state) => state.tasks.filter(t => t.completed)
  }
}
```

**Pinia Pattern**:
```typescript
// stores/data.ts
import { defineStore } from 'pinia'

export const useDataStore = defineStore('data', () => {
  // State
  const tasks = ref<Task[]>([])

  // Actions
  async function fetchTasks() {
    const data = await api.getTasks()
    tasks.value = data
  }

  // Getters (computed)
  const completedTasks = computed(() =>
    tasks.value.filter(t => t.completed)
  )

  return { tasks, fetchTasks, completedTasks }
})
```

**Decision**: Use Composition API style for Pinia stores

**Rationale**:
- Better TypeScript inference
- More flexible than Options API
- Aligns with Vue 3 Composition API
- Easier to test (plain functions)

**Alternatives Considered**:
- Pinia Options API style: Rejected (similar to Vuex, less type-safe)
- Keep Vuex alongside Pinia: Rejected (duplicate systems per spec)

---

## 5. Routing Consolidation Strategy

### 5.1 HTML Entry Points → Vue Router Routes

**Current**: 28+ separate HTML files, each with own Vite entry
**Target**: Single index.html with Vue Router lazy-loaded routes

### 5.2 Route Mapping

```typescript
// src/router/routes.ts
export const routes = [
  // Auth routes
  {
    path: '/login',
    name: 'login',
    component: () => import('@/features/auth/pages/LoginPage.vue')
  },
  {
    path: '/signup',
    name: 'signup',
    component: () => import('@/features/auth/pages/SignupPage.vue')
  },

  // Protected routes
  {
    path: '/',
    meta: { requiresAuth: true },
    component: () => import('@/shared/layouts/AuthenticatedLayout.vue'),
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/features/dashboard/pages/DashboardPage.vue')
      },
      {
        path: 'tasks',
        name: 'tasks',
        component: () => import('@/features/tasks/pages/TasksPage.vue')
      },
      {
        path: 'articles',
        name: 'articles',
        component: () => import('@/features/articles/pages/ArticlesPage.vue')
      },
      {
        path: 'articles/edit/:id',
        name: 'article-edit',
        component: () => import('@/features/articles/pages/ArticleEditPage.vue')
      },
      {
        path: 'projects',
        name: 'projects',
        component: () => import('@/features/projects/pages/ProjectsPage.vue')
      },
      {
        path: 'projects/:id',
        name: 'project-detail',
        component: () => import('@/features/projects/pages/ProjectDetailPage.vue')
      },
      // ... more routes
    ]
  },

  // 404
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
import { useAuthStore } from '@/features/auth/stores/auth'

export function setupNavigationGuards(router: Router) {
  router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()

    // Check if route requires auth
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      // Redirect to login, preserve intended destination
      next({ name: 'login', query: { redirect: to.fullPath } })
      return
    }

    next()
  })
}
```

**Decision**: Use lazy-loaded routes with authentication layout

**Rationale**:
- Code splitting improves initial load time (SC-008: 20% improvement target)
- Authentication guard prevents unauthorized access
- Layout component reduces duplication
- SEO-friendly (single-page app with proper meta tags)

**Alternatives Considered**:
- Eager-loaded routes: Rejected (worse performance)
- Route-level code splitting without layouts: Rejected (more duplication)

---

## 6. Testing Strategy

### 6.1 Testing Framework Selection

**Decision**: Vitest for automated smoke tests

**Rationale**:
- Native Vite integration (zero config)
- Fast (uses Vite transform pipeline)
- Compatible with Jest API (easy migration)
- Built-in TypeScript support
- Component testing with @vue/test-utils

**Implementation**:
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom'
  }
})
```

**Alternatives Considered**:
- Jest: Rejected (slower, requires more config for Vite)
- Playwright only: Rejected (heavier for smoke tests)
- Cypress: Rejected (E2E overkill for smoke tests)

### 6.2 Manual Testing Checklist Structure

**Decision**: Markdown checklist in `checklists/manual-testing.md`

**Format**:
```markdown
# Manual Testing Checklist - Frontend Modernization

## Authentication Flows
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (error handling)
- [ ] Signup with new account
- [ ] Password reset flow
- [ ] Session persistence (refresh page stays logged in)
- [ ] Logout functionality

## Task Management
- [ ] View tasks list
- [ ] Create new task
- [ ] Edit existing task
- [ ] Delete task
- [ ] Mark task as complete
- [ ] Task filtering
- [ ] Task sorting

## Article Management
- [ ] View articles list
- [ ] Create new article
- [ ] Edit article in TipTap editor
- [ ] Save article (auto-save + manual)
- [ ] Delete article
- [ ] Article preview
- [ ] Image upload in article

... (full checklist)
```

### 6.3 Smoke Tests Coverage

**Critical Paths for Automation**:
1. **Authentication**: Login, logout, session check
2. **Dashboard**: Loads without errors
3. **Navigation**: All routes resolve correctly
4. **API Health**: Backend connection works
5. **State Persistence**: Pinia stores persist correctly

**Example Smoke Test**:
```typescript
// tests/smoke/auth.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LoginPage from '@/features/auth/pages/LoginPage.vue'

describe('Auth Smoke Tests', () => {
  it('renders login form', () => {
    const wrapper = mount(LoginPage)
    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
  })

  it('validates email format', async () => {
    const wrapper = mount(LoginPage)
    const emailInput = wrapper.find('input[type="email"]')
    await emailInput.setValue('invalid-email')
    // Assert validation error
  })
})
```

**Decision**: Focus smoke tests on critical paths, manual tests for full coverage

**Rationale**:
- Smoke tests catch immediate breakage
- Manual tests verify user experience
- Balances automation cost vs benefit
- Aligns with clarification decision (manual + smoke)

---

## 7. Environment Variables Cleanup

### 7.1 Current Variables

```env
# WeWeb-specific (TO REMOVE)
VITE_APP_CDN_URL=https://cdn.weweb.io/
VITE_APP_API_URL=https://api.weweb.io/v1
VITE_APP_PLUGINS_URL=https://data.weweb.io
VITE_APP_PREVIEW_URL=weweb-preview.io

# Supabase (KEEP)
VITE_SUPABASE_URL=https://qbmbokpbcyempnaravaw.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_Z4qEXXSvYJsPDN30ZNtPCw_ihG9mQHX

# Backend API (KEEP)
VITE_API_URL=http://localhost:3000
```

### 7.2 Target Variables

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://qbmbokpbcyempnaravaw.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_Z4qEXXSvYJsPDN30ZNtPCw_ihG9mQHX

# Backend API URL (local development)
VITE_API_URL=http://localhost:3000

# Optional: App Configuration
VITE_APP_NAME=AlvoBot
VITE_APP_VERSION=2.0.0
```

### 7.3 .env.example Template

**Decision**: Create comprehensive .env.example

**Content**:
```env
# Supabase Configuration
# Get these from: https://supabase.com/dashboard/project/_/settings/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Backend API URL
# Development: http://localhost:3000
# Production: https://api.alvobot.ai
VITE_API_URL=http://localhost:3000

# App Configuration (optional)
VITE_APP_NAME=AlvoBot
VITE_APP_VERSION=2.0.0
```

**Rationale**:
- Documents all required variables
- Provides context and examples
- Simplifies onboarding (SC-007)
- Meets FR-005 requirement

---

## 8. Build Configuration Updates

### 8.1 Vite Config Changes

**Current**: Multiple entry points in vite.config.js
**Target**: Single entry point with optimized chunking

**Decision**: Update Vite config for single SPA

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'vue-router', 'pinia'],
          'supabase': ['@supabase/supabase-js'],
          'editor': ['@tiptap/vue-3', '@tiptap/starter-kit'],
          'charts': ['chart.js'],
          'utils': ['axios', 'dayjs', 'lodash']
        }
      }
    }
  }
})
```

**Rationale**:
- Optimized chunking improves load time
- Vendor chunk caching
- Feature-based code splitting via lazy routes
- Meets SC-008 (20% build time improvement)

---

## 9. TypeScript Configuration

### 9.1 Current State

TypeScript is configured but not fully utilized (tsconfig.app.json exists)

**Decision**: Gradually strengthen TypeScript strictness

**Initial Config**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": false,  // Start false, gradually enable
    "jsx": "preserve",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Rationale**:
- Avoid type errors blocking migration
- Gradually add types during refactoring
- Full strict mode as future enhancement

---

## 10. Migration Sequence

### 10.1 Recommended Order

**Decision**: Bottom-up migration (utilities → components → features)

**Sequence**:
1. **Phase A: Foundation** (Week 1)
   - Create new directory structure
   - Set up Pinia store templates
   - Create Supabase utility
   - Create router skeleton

2. **Phase B: Shared Layer** (Week 1-2)
   - Migrate utilities (shared/utils/)
   - Migrate composables (shared/composables/)
   - Migrate shared components (3+ feature rule)

3. **Phase C: Feature Migration** (Week 2-4)
   - Migrate auth feature (critical path first)
   - Migrate dashboard
   - Migrate tasks
   - Migrate articles
   - Migrate projects
   - ... (remaining features)

4. **Phase D: WeWeb Removal** (Week 4)
   - Remove wwLib/
   - Remove _common/
   - Remove _front/
   - Remove old HTML files
   - Clean up package.json

5. **Phase E: Testing & Deployment** (Week 5)
   - Execute manual testing checklist
   - Run automated smoke tests
   - Staging deployment
   - Production deployment

**Rationale**:
- Foundation enables all other work
- Shared layer prevents duplication
- Feature order prioritizes critical paths
- WeWeb removal at end reduces risk
- Testing phase validates everything

---

## 11. Rollback Strategy

### 11.1 Git Strategy

**Decision**: Feature branch with tagged checkpoints

**Implementation**:
```bash
# Create migration branch (already done)
git checkout 002-frontend-modernization

# Tag before starting
git tag pre-migration-002

# Tag after each phase
git tag migration-002-phase-a
git tag migration-002-phase-b
...

# If rollback needed
git checkout pre-migration-002
# or
git checkout migration-002-phase-a  # Partial rollback
```

### 11.2 Deployment Rollback

**Decision**: Blue-green deployment with quick switch

**Process**:
1. Deploy new version to green environment
2. Run smoke tests on green
3. Switch traffic to green
4. Monitor for 24 hours
5. If issues: switch back to blue (< 5 minutes)

**Rationale**:
- Minimizes downtime (per spec: 24-hour rollback window)
- Quick rollback if critical issues
- Staging validates before production

---

## 12. Open Questions & Decisions

### 12.1 Resolved in Clarification Session

✅ Migration strategy: Big-bang (all features in one release)
✅ Testing approach: Manual checklist + automated smoke tests
✅ Shared component rule: 3+ features
✅ WeWeb handling: Complete removal (no compatibility layer)
✅ Documentation: Dedicated ARCHITECTURE.md file

### 12.2 To Be Decided During Implementation

- Exact UUID → semantic component name mappings
- Specific Vuex state shape transformations
- Custom composables organization
- Error handling patterns
- Loading state patterns

---

## Summary & Next Steps

### Research Conclusions

1. **All WeWeb dependencies replaceable**: No blockers identified
2. **Zero new dependencies needed**: Everything already in package.json
3. **Clear migration path exists**: Phased approach validated
4. **Risk mitigation strategies defined**: Rollback, testing, staging
5. **Tooling decisions made**: Vitest, Pinia, native Supabase

### Immediate Next Steps

1. **Generate data-model.md**: Define precise architecture patterns
2. **Generate quickstart.md**: Write step-by-step execution guide
3. **Update agent context**: Add frontend technologies
4. **Proceed to tasks**: Generate tasks.md with dependency ordering

### Confidence Level

**HIGH CONFIDENCE** - All technical unknowns resolved. Migration is feasible with existing tooling and team skillset. No external dependencies or tooling gaps identified.

---

**Research Completed**: 2025-12-04
**Status**: ✅ All NEEDS CLARIFICATION items resolved
**Ready for Phase 1**: Design & Contracts
