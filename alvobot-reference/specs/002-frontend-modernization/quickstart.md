# Quickstart: Frontend Modernization Migration

**Date**: 2025-12-04
**Feature**: 002-frontend-modernization
**Branch**: `002-frontend-modernization`

This guide provides step-by-step instructions for executing the frontend modernization migration.

---

## Pre-Migration Checklist

- [ ] Review [spec.md](./spec.md), [research.md](./research.md), and [data-model.md](./data-model.md)
- [ ] Ensure on branch `002-frontend-modernization`
- [ ] Create pre-migration backup tag: `git tag pre-migration-002-complete`
- [ ] Verify all tests pass: `cd frontend && npm test`
- [ ] Verify build works: `cd frontend && npm run build`
- [ ] Document current environment: `git status > pre-migration-status.txt`

---

## Migration Phases

### Phase A: Foundation Setup (Week 1)

**Objective**: Create new directory structure and core utilities

#### A1: Create Directory Structure

```bash
cd frontend/src

# Create feature directories
mkdir -p features/{auth,tasks,articles,projects,calendar,flows,runs,keywords,settings,connections,scraper,users}/{components,pages,stores,api,composables,types}

# Create shared directories
mkdir -p shared/{components,composables,utils,constants,types,layouts,pages}

# Create router directory
mkdir -p router

# Create global stores directory
mkdir -p stores
```

#### A2: Set Up Core Utilities

**Create Supabase client**:
```bash
cat > src/shared/utils/supabase.ts << 'EOF'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})
EOF
```

**Create axios client**:
```bash
cat > src/shared/utils/axios.ts << 'EOF'
import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('supabase.auth.token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default apiClient
EOF
```

#### A3: Set Up Router Skeleton

```bash
cat > src/router/index.ts << 'EOF'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { setupNavigationGuards } from './guards'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

setupNavigationGuards(router)

export default router
EOF

cat > src/router/routes.ts << 'EOF'
import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/features/auth/pages/LoginPage.vue')
  },
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/features/dashboard/pages/DashboardPage.vue'),
    meta: { requiresAuth: true }
  }
]
EOF

cat > src/router/guards.ts << 'EOF'
import type { Router } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth'

export function setupNavigationGuards(router: Router) {
  router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      next({ name: 'login', query: { redirect: to.fullPath } })
      return
    }

    next()
  })
}
EOF
```

#### A4: Create Root App Files

```bash
cat > src/App.vue << 'EOF'
<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>
EOF

cat > src/main.ts << 'EOF'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/css/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')
EOF
```

#### A5: Update index.html

```bash
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AlvoBot</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
EOF
```

#### A6: Test Foundation

```bash
npm run dev
# Should see app loading (even if broken routes)
```

**Checkpoint**: Tag progress
```bash
git add .
git commit -m "feat: Phase A - Foundation setup complete"
git tag migration-002-phase-a
```

---

### Phase B: Migrate Auth Feature (Week 1-2)

**Objective**: Migrate authentication as first complete feature

#### B1: Create Auth Store

```bash
cat > src/features/auth/stores/auth.ts << 'EOF'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/shared/utils/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const session = ref(null)
  const initialized = ref(false)

  const isAuthenticated = computed(() => !!session.value)

  async function initialize() {
    const { data: { session: currentSession } } = await supabase.auth.getSession()
    session.value = currentSession
    user.value = currentSession?.user ?? null
    initialized.value = true

    supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession
      user.value = newSession?.user ?? null
    })
  }

  async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data
  }

  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return {
    user,
    session,
    initialized,
    isAuthenticated,
    initialize,
    login,
    logout
  }
})
EOF
```

#### B2: Create Login Page

Copy and adapt existing login logic from `login/index.html` to new structure.

#### B3: Test Auth Flow

```bash
npm run dev
# Test login/logout functionality
```

**Checkpoint**:
```bash
git add .
git commit -m "feat: Phase B - Auth feature migrated"
git tag migration-002-phase-b
```

---

### Phase C: Migrate Remaining Features (Week 2-4)

**For each feature (tasks, articles, projects, etc.)**:

1. **Create store** in `features/{feature}/stores/{feature}.ts`
2. **Create API module** in `features/{feature}/api/{feature}.ts`
3. **Migrate components** from UUID names to semantic names
4. **Create pages** from old HTML entry points
5. **Add routes** to `src/router/routes.ts`
6. **Test feature** thoroughly

**Order of migration** (by priority):
1. Auth ✅ (Phase B)
2. Dashboard
3. Tasks
4. Articles
5. Projects
6. Calendar
7. Flows
8. Runs
9. Keywords (10x mining)
10. Settings
11. Connections
12. Scraper
13. Users

**Checkpoint after each feature**:
```bash
git add .
git commit -m "feat: Migrate {feature} feature"
git tag migration-002-{feature}
```

---

### Phase D: WeWeb Removal (Week 4)

#### D1: Remove WeWeb Directories

```bash
cd frontend/src

# Remove WeWeb code
rm -rf wwLib/
rm -rf _common/
rm -rf _front/

# Remove old HTML entry points
cd ..
rm -rf login/ tasks/ articles/ projects/ calendar/ flows/ runs/ runs-old/ runs_old2/
rm -rf settings/ users/ keywords/ locations/ base-articles/ base-structure/
rm -rf author-profile-images/ create/ forgot-password/ reset-password/ email-sent/
rm -rf connections/ scraper/ triggers/ alvoads-meta/ callback_meta/
rm -rf style-guide/ test/

# Keep only index.html
ls *.html | grep -v '^index.html$' | xargs rm -f
```

#### D2: Remove Vuex

```bash
cd src
rm -rf store/  # Old Vuex stores

# Remove Vuex from package.json
npm uninstall vuex
```

#### D3: Clean Environment Variables

```bash
cat > .env.example << 'EOF'
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Backend API URL
VITE_API_URL=http://localhost:3000

# App Configuration
VITE_APP_NAME=AlvoBot
VITE_APP_VERSION=2.0.0
EOF

# Update .env to remove WeWeb variables
vim .env  # Remove VITE_APP_CDN_URL, VITE_APP_API_URL, VITE_APP_PLUGINS_URL, VITE_APP_PREVIEW_URL
```

#### D4: Update Vite Config

```bash
cat > vite.config.ts << 'EOF'
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
          'utils': ['axios', 'dayjs', 'lodash']
        }
      }
    }
  }
})
EOF
```

**Checkpoint**:
```bash
git add .
git commit -m "feat: Phase D - WeWeb removal complete"
git tag migration-002-phase-d
```

---

### Phase E: Testing & Deployment (Week 5)

#### E1: Create Manual Testing Checklist

```bash
cat > ../specs/002-frontend-modernization/checklists/manual-testing.md << 'EOF'
# Manual Testing Checklist - Frontend Modernization

## Authentication
- [ ] Login with valid credentials
- [ ] Login with invalid credentials shows error
- [ ] Signup creates new account
- [ ] Password reset flow works
- [ ] Logout clears session
- [ ] Session persists on refresh

## Features (repeat for each)
- [ ] List view loads
- [ ] Create new item works
- [ ] Edit item works
- [ ] Delete item works
- [ ] Search/filter works
- [ ] Pagination works

(Full checklist in separate file)
EOF
```

#### E2: Set Up Vitest

```bash
npm install -D vitest @vue/test-utils jsdom

cat > vitest.config.ts << 'EOF'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
EOF
```

#### E3: Write Smoke Tests

```bash
mkdir -p tests/smoke

cat > tests/smoke/auth.test.ts << 'EOF'
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LoginPage from '@/features/auth/pages/LoginPage.vue'

describe('Auth Smoke Tests', () => {
  it('renders login form', () => {
    const wrapper = mount(LoginPage)
    expect(wrapper.find('form').exists()).toBe(true)
  })
})
EOF
```

#### E4: Run All Tests

```bash
# Unit/smoke tests
npm run test

# Manual testing
# Follow checklist in checklists/manual-testing.md

# Build test
npm run build
npm run preview  # Test production build
```

#### E5: Create ARCHITECTURE.md

```bash
cat > ARCHITECTURE.md << 'EOF'
# AlvoBot Frontend Architecture

## Overview
Feature-based Vue 3 architecture with Pinia state management and Vue Router.

## Directory Structure
See [specs/002-frontend-modernization/data-model.md](../specs/002-frontend-modernization/data-model.md)

## Key Principles
1. Feature isolation (no cross-feature imports)
2. Shared components promoted at 3+ uses
3. Composition API throughout
4. TypeScript for type safety
5. Lazy-loaded routes for performance

(Full documentation)
EOF
```

#### E6: Staging Deployment

```bash
# Push to staging branch
git checkout staging
git merge 002-frontend-modernization

# Deploy to staging environment
# (Follow existing deployment process)

# Run smoke tests on staging
curl https://staging.alvobot.ai/health

# Execute full manual testing checklist
```

#### E7: Production Deployment

**After 2-3 days of successful staging**:

```bash
# Merge to main
git checkout main
git merge 002-frontend-modernization

# Tag release
git tag v2.0.0-frontend-modernization

# Deploy to production
git push origin main --tags

# Monitor for 24 hours
# Keep rollback ready
```

---

## Rollback Procedures

### Local Rollback

```bash
# Return to pre-migration state
git checkout pre-migration-002-complete

# Or partial rollback to specific phase
git checkout migration-002-phase-b
```

### Production Rollback

```bash
# If critical issues within 24 hours:

# Option 1: Git revert
git revert {commit-hash}
git push origin main

# Option 2: Infrastructure rollback (if using blue-green)
# Switch traffic back to previous deployment

# Option 3: Emergency tag checkout
git checkout v1.x.x  # Previous stable version
# Redeploy
```

---

## Success Validation

After deployment, verify:

- [ ] **SC-001**: Can locate files in <10 seconds via feature structure
- [ ] **SC-003**: Zero WeWeb URLs in environment (check .env)
- [ ] **SC-004**: Only one index.html exists
- [ ] **SC-005**: No Vuex in package.json
- [ ] **SC-010**: All features work identically (manual checklist 100% pass)

---

## Troubleshooting

**Build fails**: Check import paths use `@/` alias correctly
**Routes 404**: Verify route names match navigation calls
**Auth broken**: Check Supabase environment variables
**Stores not working**: Ensure Pinia installed in main.ts

---

**Migration Complete!** 🎉

Frontend now follows modern Vue 3 patterns with feature-based architecture, no WeWeb dependencies, consolidated state management, and single SPA structure.
