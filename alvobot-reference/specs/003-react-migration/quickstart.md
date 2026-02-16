# Quickstart: React Migration

**Date**: 2025-12-10
**Feature**: 003-react-migration

## Prerequisites

- Node.js 20 LTS
- npm 10+
- Git
- Access to Supabase project credentials

## Initial Setup

### 1. Create React Project

```bash
# From repository root
cd frontend

# Remove Vue files (backup first)
mv src src-vue-backup
mv package.json package-vue.json

# Initialize new React project with Vite
npm create vite@latest . -- --template react-ts

# Install dependencies
npm install
```

### 2. Install Dependencies

```bash
# Core
npm install react-router-dom@6 zustand @tanstack/react-query

# Supabase
npm install @supabase/supabase-js

# UI Components
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-*
npm install reactflow @reactflow/core @reactflow/controls @reactflow/background
npm install ag-grid-react ag-grid-community
npm install react-datepicker
npm install lucide-react clsx

# Forms
npm install react-hook-form @hookform/resolvers zod

# Dev dependencies
npm install -D @types/react @types/react-dom
npm install -D @testing-library/react @testing-library/jest-dom vitest
npm install -D @playwright/test
npm install -D eslint eslint-plugin-react eslint-plugin-react-hooks
npm install -D prettier
```

### 3. Configure Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
})
```

### 4. Configure TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 5. Environment Variables

```bash
# .env.local
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:3000
```

## Project Structure Setup

```bash
# Create directory structure
mkdir -p src/{app,features,shared}
mkdir -p src/shared/{components,hooks,utils,layouts,types}
mkdir -p src/features/{auth,dashboard,projects,articles,tasks,calendar,flows,runs,keywords,scraper,connections,settings,users}

# Create feature subdirectories
for feature in auth dashboard projects articles tasks calendar flows runs keywords scraper connections settings users; do
  mkdir -p src/features/$feature/{pages,components,hooks,stores,api,types}
done

# Create test directories
mkdir -p tests/{unit,e2e}
```

## Core Files

### 1. Entry Point

```typescript
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './app/App'
import './assets/styles/variables.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### 2. App Component

```typescript
// src/app/App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from './router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
```

### 3. Router

```typescript
// src/app/router.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { MainLayout } from '@/shared/layouts/MainLayout'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import { LoadingSpinner } from '@/shared/components/Spinner'

// Lazy load pages
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
const SignupPage = lazy(() => import('@/features/auth/pages/SignupPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'))
const ProjectsPage = lazy(() => import('@/features/projects/pages/ProjectsPage'))
// ... more pages

export function AppRouter() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            {/* ... more routes */}
          </Route>
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
```

### 4. Supabase Client

```typescript
// src/shared/utils/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 5. Auth Store (Zustand)

```typescript
// src/features/auth/stores/authStore.ts
import { create } from 'zustand'
import { supabase } from '@/shared/utils/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  initialized: boolean
  loading: boolean
  error: string | null

  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  initialized: false,
  loading: false,
  error: null,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    set({
      session,
      user: session?.user ?? null,
      initialized: true,
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null })
    })
  },

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      set({ session: data.session, user: data.user })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Login failed' })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  logout: async () => {
    set({ loading: true })
    await supabase.auth.signOut()
    set({ session: null, user: null, loading: false })
  },

  clearError: () => set({ error: null }),
}))
```

## Running the App

```bash
# Development
npm run dev

# Build
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Run E2E tests
npx playwright test
```

## Verification Checklist

After setup, verify:

- [ ] `npm run dev` starts without errors
- [ ] Login page renders at `/login`
- [ ] Supabase connection works (check console)
- [ ] Protected routes redirect to login
- [ ] CSS variables from `variables.css` are applied

## Next Steps

1. Migrate shared components (Button, Input, etc.)
2. Complete auth pages
3. Implement MainLayout with sidebar
4. Migrate feature modules in priority order (P1 → P2 → P3)
