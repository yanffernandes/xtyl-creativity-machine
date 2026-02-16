# Research: React Migration

**Date**: 2025-12-10
**Feature**: 003-react-migration

## Technology Decisions

### 1. React Version & Setup

**Decision**: React 18.2+ with Vite

**Rationale**:
- React 18 provides concurrent features, automatic batching, and Suspense improvements
- Vite offers fast HMR and build times, already used in current Vue project
- TypeScript 5.x for type safety matching existing codebase

**Alternatives Considered**:
- Next.js: Overkill for SPA, adds SSR complexity not needed
- Create React App: Deprecated, slower builds
- Remix: Good but adds routing complexity we don't need

### 2. State Management

**Decision**: Zustand (UI state) + TanStack Query (server state)

**Rationale**:
- Zustand: Minimal API similar to Pinia, ~1KB, no boilerplate
- TanStack Query: Handles caching, refetching, optimistic updates automatically
- Clear separation: Zustand for auth/UI state, Query for API data

**Alternatives Considered**:
- Redux Toolkit: More boilerplate, steeper learning curve
- Jotai: Good for atomic state, but Zustand better for store pattern
- Zustand only: Would require manual cache management
- React Query only: Doesn't handle non-server state well

### 3. Routing

**Decision**: React Router v6

**Rationale**:
- Industry standard for React SPAs
- Supports nested routes matching current Vue Router structure
- Built-in lazy loading with `React.lazy()`

**Migration Notes**:
- Vue Router's `meta.requiresAuth` → React Router's `loader` or custom wrapper
- Route guards implemented via `<ProtectedRoute>` component
- Nested routes map directly from Vue structure

### 4. Rich Text Editor

**Decision**: Tiptap React (same as Vue)

**Rationale**:
- Same Tiptap package, just different framework bindings
- All extensions compatible (markdown, tables, images, etc.)
- Minimal learning curve, existing config reusable

**Migration Notes**:
- Replace `@tiptap/vue-3` with `@tiptap/react`
- `useEditor()` hook instead of Vue composable
- Extension configs remain identical

### 5. Flow Editor

**Decision**: React Flow (reactflow.dev)

**Rationale**:
- Same maintainers as Vue Flow
- Near-identical API
- Mature, well-documented

**Migration Notes**:
- Replace `@vue-flow/*` packages with `reactflow`
- Custom nodes: Vue SFCs → React components
- Event handlers map directly

### 6. Data Grid

**Decision**: AG Grid React

**Rationale**:
- Same AG Grid, different framework binding
- Community edition sufficient
- Existing column configs reusable

**Migration Notes**:
- Replace `ag-grid-vue3` with `ag-grid-react`
- Column definitions remain identical
- Cell renderers: Vue components → React components

### 7. Date Picker

**Decision**: react-datepicker

**Rationale**:
- Most popular React date picker
- Full-featured, accessible
- Good localization support

**Alternatives Considered**:
- @mui/x-date-pickers: Requires MUI dependency
- react-day-picker: More flexible but more setup
- date-fns + custom: Too much work

### 8. CSS Strategy

**Decision**: Keep existing CSS variables + CSS Modules

**Rationale**:
- CSS custom properties are framework-agnostic
- variables.css works unchanged
- CSS Modules for component scoping (replaces Vue scoped styles)

**Migration Notes**:
- Copy `assets/styles/variables.css` unchanged
- Convert Vue `<style scoped>` to `.module.css` files
- Use `clsx` or `cn` for conditional classes

### 9. Form Handling

**Decision**: React Hook Form

**Rationale**:
- Minimal re-renders, performant
- Built-in validation with Zod/Yup
- Uncontrolled by default (better performance)

**Alternatives Considered**:
- Formik: More verbose, more re-renders
- Native React: Too much boilerplate
- Final Form: Less popular, similar to RHF

### 10. Supabase Integration

**Decision**: Direct Supabase client (remove WeWeb dependency)

**Rationale**:
- Current Vue code uses WeWeb's Supabase instance
- React version creates its own client directly
- Simpler, no global window dependencies

**Implementation**:
```typescript
// src/shared/utils/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

## Best Practices Applied

### 1. Component Structure

Each component folder contains:
```
ComponentName/
├── index.tsx          # Main component
├── ComponentName.module.css  # Styles
├── ComponentName.test.tsx    # Tests
└── types.ts           # TypeScript interfaces (if complex)
```

### 2. Feature Module Structure

```
features/auth/
├── pages/             # Route components
├── components/        # Feature-specific UI
├── hooks/             # Custom hooks (useAuth, etc.)
├── stores/            # Zustand stores
├── api/               # TanStack Query hooks
├── types/             # TypeScript types
└── utils/             # Feature-specific utilities
```

### 3. Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `LoginPage.tsx` |
| Hooks | camelCase with `use` | `useAuth.ts` |
| Stores | camelCase with `Store` | `authStore.ts` |
| API hooks | camelCase with `use` + action | `useProjects.ts` |
| Types | PascalCase | `User.ts` |
| Utils | camelCase | `formatDate.ts` |

### 4. Import Aliases

```typescript
// vite.config.ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  }
}
```

### 5. Error Boundaries

Implement at:
- App level (global fallback)
- Feature level (isolated failures)
- Suspense boundaries for lazy loading

## Dependencies List

### Production

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "zustand": "^4.4.7",
  "@tanstack/react-query": "^5.13.0",
  "@supabase/supabase-js": "^2.50.3",
  "@tiptap/react": "^2.8.0",
  "@tiptap/starter-kit": "^2.8.0",
  "@tiptap/extension-*": "^2.8.0",
  "reactflow": "^11.10.0",
  "ag-grid-react": "^33.2.4",
  "react-datepicker": "^4.24.0",
  "react-hook-form": "^7.48.0",
  "zod": "^3.22.0",
  "@hookform/resolvers": "^3.3.0",
  "lucide-react": "^0.294.0",
  "clsx": "^2.0.0",
  "date-fns": "^4.1.0"
}
```

### Development

```json
{
  "@types/react": "^18.2.0",
  "@types/react-dom": "^18.2.0",
  "@vitejs/plugin-react": "^4.2.0",
  "vite": "^5.0.0",
  "typescript": "^5.3.0",
  "vitest": "^1.0.0",
  "@testing-library/react": "^14.1.0",
  "@testing-library/jest-dom": "^6.1.0",
  "@playwright/test": "^1.40.0",
  "eslint": "^8.55.0",
  "eslint-plugin-react": "^7.33.0",
  "eslint-plugin-react-hooks": "^4.6.0",
  "prettier": "^3.1.0"
}
```

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Large migration scope | Prioritize by P1→P2→P3, test each module before next |
| Supabase auth issues | Test auth flow first, before other features |
| Tiptap compatibility | Verify all extensions work in React before full migration |
| React Flow parity | Create sample flow early to validate all node types |
| Performance regression | Benchmark Vue app first, compare after migration |
| WeWeb dependency removal | Test Supabase client independently |
