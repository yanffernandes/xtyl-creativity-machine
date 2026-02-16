# Research: Menu Visibility by Plan

**Feature**: 029-menu-visibility-by-plan
**Date**: 2025-01-16

## Research Questions Resolved

### 1. Sidebar Menu Structure

**Decision**: Extend existing `NavItem` interface with visibility metadata

**Rationale**: The current Sidebar uses a hardcoded `navSections` array with `NavItem` objects. Adding an optional `menuItemKey` to each item allows mapping to database configuration without breaking existing structure.

**Current Structure** (`Sidebar.tsx`):
```typescript
interface NavItem {
  icon: React.ComponentType<{ size?: number }>
  label: string
  path: string
}

interface NavSection {
  title: string
  color?: string
  items: NavItem[]
  collapsible?: boolean
  defaultOpen?: boolean
}
```

**Extended Structure**:
```typescript
interface NavItem {
  icon: React.ComponentType<{ size?: number }>
  label: string
  path: string
  menuItemKey: string  // NEW: Maps to menu_visibility_config.menu_item_key
}
```

**Alternatives Considered**:
- Store entire menu structure in database: Rejected - adds complexity, harder to maintain, slower initial load
- Use route path as key: Rejected - paths can change, less explicit

---

### 2. Plan Detection Strategy

**Decision**: Use workspace plan if active, otherwise user's personal plan

**Rationale**: Per clarification, users in a workspace should see features based on workspace's plan. The existing `useWorkspaceStore` provides current workspace, and `useUserPlan` provides personal plan.

**Implementation Pattern**:
```typescript
export function useEffectivePlanId(): number | null {
  const currentWorkspace = useCurrentWorkspace()
  const { data: userPlan } = useUserPlan()

  // Workspace plan takes priority
  if (currentWorkspace?.plan_id) {
    return currentWorkspace.plan_id
  }

  // Fallback to personal plan
  if (userPlan?.active_plan_id) {
    return userPlan.active_plan_id
  }

  return null // No plan
}
```

**Alternatives Considered**:
- Always use personal plan: Rejected - doesn't support workspace-based access
- Use highest plan between personal and workspace: Rejected - spec says workspace active takes priority

---

### 3. Admin UI Pattern

**Decision**: Follow AdminPlansPage pattern with modal-based editing

**Rationale**: Existing admin pages use consistent patterns: table listing, modal for edit, action menu, permission checks. Following this ensures consistency.

**Key Files to Reference**:
- `AdminPlansPage.tsx` - Modal CRUD pattern
- `AdminUsersPage.tsx` - Table with filters and action menus
- `adminStore.ts` - Permission checking via `hasPermission('settings', 'edit')`

**Pattern Summary**:
```typescript
// Query
const { data: configs, refetch } = useMenuVisibilityConfigs()

// Mutations
const updateConfig = useUpdateMenuVisibilityConfig()

// Permission
const canEdit = hasPermission('settings', 'edit')

// State
const [editingItem, setEditingItem] = useState<MenuVisibilityConfig | null>(null)
const [showModal, setShowModal] = useState(false)
```

---

### 4. Query Keys Pattern

**Decision**: Add `menuVisibility` namespace to existing queryKeys

**Rationale**: The codebase uses a centralized `queryKeys.ts` with namespaced keys. Adding a new namespace maintains consistency.

**Implementation**:
```typescript
// In queryKeys.ts
menuVisibility: {
  all: ['menu-visibility'] as const,
  config: () => [...queryKeys.menuVisibility.all, 'config'] as const,
  configList: () => [...queryKeys.menuVisibility.config(), 'list'] as const,
  userVisibility: (userId: string) =>
    [...queryKeys.menuVisibility.all, 'user', userId] as const,
}
```

---

### 5. RLS Policy Strategy

**Decision**: Public read, admin-only write, service_role full access

**Rationale**: Menu visibility config must be readable by all authenticated users (to render menu) but only modifiable by admins. Service role needed for backend operations.

**Pattern from codebase** (`admin_system.sql`):
```sql
-- Admins can manage via is_admin() function
CREATE POLICY "menu_config_admins_all" ON public.menu_visibility_config
    FOR ALL USING (is_admin(auth.uid()));

-- Service role for backend
CREATE POLICY "menu_config_service_role" ON public.menu_visibility_config
    FOR ALL TO service_role USING (true);

-- Public read for menu rendering
CREATE POLICY "menu_config_public_read" ON public.menu_visibility_config
    FOR SELECT USING (auth.role() = 'authenticated');
```

---

### 6. Caching Strategy

**Decision**: 5 minutes staleTime with TanStack Query

**Rationale**: Per clarification, cache for 5 minutes balances performance and update propagation. Same pattern used by `useUserPlan`.

**Implementation**:
```typescript
export function useMenuVisibility() {
  return useQuery({
    queryKey: queryKeys.menuVisibility.configList(),
    queryFn: fetchMenuVisibilityConfig,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
```

---

### 7. Loading State Strategy

**Decision**: Show skeleton loading for entire menu during config load

**Rationale**: Per clarification, skeleton loading is preferred over showing partial menu or all items.

**Implementation Pattern**:
```typescript
// In Sidebar.tsx
const { data: visibility, isLoading } = useMenuVisibility()

if (isLoading) {
  return <SidebarSkeleton />
}

// Filter and render menu items
```

---

### 8. Route Protection Strategy

**Decision**: Use wrapper component `ProtectedFeatureRoute` at route level

**Rationale**: Protects routes even if user navigates directly via URL. Component checks visibility and redirects if needed.

**Implementation**:
```typescript
// In router.tsx
<Route
  path="/alvoads-meta"
  element={
    <ProtectedFeatureRoute menuItemKey="alvoads-meta">
      <AlvoAdsMetaPage />
    </ProtectedFeatureRoute>
  }
/>
```

---

### 9. Essential Items Validation

**Decision**: Validation at save time prevents hiding essential items

**Rationale**: Per clarification, admin cannot save config that would hide essential items. Backend validates before persisting.

**Implementation**:
```typescript
// Backend validation
if (config.is_essential && !config.is_public && config.plan_ids.length === 0) {
  throw new BadRequestException('Essential items cannot be completely hidden')
}
```

---

### 10. New Items Default Behavior

**Decision**: Items without config are hidden by default (security by default)

**Rationale**: Per clarification, new menu items added to code should be hidden until admin explicitly configures them.

**Implementation**:
```typescript
// In useMenuVisibility hook
const getVisibility = (menuItemKey: string): MenuVisibilityStatus => {
  const config = configs.find(c => c.menu_item_key === menuItemKey)

  if (!config) {
    return 'hidden' // New items hidden by default
  }

  // ... visibility logic
}
```

---

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State Management | TanStack Query (no Zustand store) | Menu config is server state, Query handles caching |
| Styling | CSS Modules | Consistent with codebase |
| Icons | Lucide React | Already used in Sidebar |
| Validation | Zod (frontend), class-validator (backend) | Existing patterns |
| Database | PostgreSQL via Supabase | Existing infrastructure |

---

## Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/shared/hooks/useMenuVisibility.ts` | Hook for menu visibility config |
| `frontend/src/shared/hooks/useEffectivePlanId.ts` | Hook to get user's effective plan |
| `frontend/src/shared/types/menu.ts` | Menu visibility types |
| `frontend/src/shared/components/MenuItemComingSoon/` | "Coming Soon" menu item component |
| `frontend/src/shared/components/ProtectedFeatureRoute/` | Route protection wrapper |
| `frontend/src/shared/components/SidebarSkeleton/` | Loading skeleton for sidebar |
| `frontend/src/features/admin/pages/AdminMenuVisibilityPage.tsx` | Admin config page |
| `frontend/src/features/admin/components/menu-visibility/` | Admin components |
| `supabase/migrations/029_menu_visibility_config.sql` | Database migration |

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/shared/layouts/MainLayout/Sidebar.tsx` | Add `menuItemKey` to items, integrate visibility hook |
| `frontend/src/shared/utils/queryKeys.ts` | Add `menuVisibility` namespace |
| `frontend/src/features/admin/api/queries.ts` | Add menu visibility queries |
| `frontend/src/features/admin/api/mutations.ts` | Add menu visibility mutations |
| `frontend/src/app/router.tsx` | Wrap routes with `ProtectedFeatureRoute` |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Config load failure breaks menu | Fail-open: show all items on error |
| Performance impact on page load | 5min cache, small payload (~1KB) |
| Admin misconfigures essential items | Backend validation prevents saving |
| New items accidentally visible | Default to hidden (security by default) |
