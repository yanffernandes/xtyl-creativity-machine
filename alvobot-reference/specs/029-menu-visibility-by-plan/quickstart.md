# Quickstart: Menu Visibility by Plan

**Feature**: 029-menu-visibility-by-plan
**Date**: 2025-01-16

## Overview

This feature adds plan-based visibility control for sidebar menu items. Users see only the menu items their plan allows, with options to show restricted items as "Coming Soon" or hide them completely.

## Quick Setup

### 1. Database Migration

Run the migration to create the `menu_visibility_config` table and `user_menu_visibility` view:

```bash
# Apply migration
supabase db push

# Or manually run
psql $DATABASE_URL < specs/029-menu-visibility-by-plan/migrations/029_menu_visibility_config.sql
```

### 2. Add Query Keys

In `frontend/src/shared/utils/queryKeys.ts`:

```typescript
export const queryKeys = {
  // ... existing keys

  menuVisibility: {
    all: ['menu-visibility'] as const,
    config: () => [...queryKeys.menuVisibility.all, 'config'] as const,
    configList: () => [...queryKeys.menuVisibility.config(), 'list'] as const,
    userVisibility: () => [...queryKeys.menuVisibility.all, 'user'] as const,
  },
}
```

### 3. Create Menu Visibility Hook

Create `frontend/src/shared/hooks/useMenuVisibility.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/utils/supabase'
import { queryKeys } from '@/shared/utils/queryKeys'
import { UserMenuVisibility } from '@/shared/types/menu'

export function useMenuVisibility() {
  return useQuery({
    queryKey: queryKeys.menuVisibility.userVisibility(),
    queryFn: async (): Promise<UserMenuVisibility[]> => {
      const { data, error } = await supabase
        .from('user_menu_visibility')
        .select('*')

      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useMenuItemVisibility(menuItemKey: string) {
  const { data, isLoading } = useMenuVisibility()

  const item = data?.find(v => v.menu_item_key === menuItemKey)

  return {
    isVisible: item?.visibility_status === 'visible',
    isComingSoon: item?.visibility_status === 'coming_soon',
    isHidden: !item || item.visibility_status === 'hidden',
    comingSoonText: item?.coming_soon_text ?? null,
    redirectUrl: item?.redirect_url ?? null,
    isLoading,
  }
}
```

### 4. Update Sidebar

Add `menuItemKey` to each item in `Sidebar.tsx`:

```typescript
const navSections: NavSection[] = [
  {
    title: 'PRINCIPAL',
    items: [
      { icon: Home, label: 'Início', path: '/dashboard', menuItemKey: 'dashboard' },
      { icon: Globe, label: 'Meus Blogs', path: '/projects', menuItemKey: 'projects' },
      // ... more items
    ],
  },
  // ... more sections
]
```

Then filter items based on visibility:

```typescript
const { data: visibility, isLoading } = useMenuVisibility()

if (isLoading) {
  return <SidebarSkeleton />
}

const getVisibility = (key: string) =>
  visibility?.find(v => v.menu_item_key === key)?.visibility_status ?? 'hidden'

// In render
{navSections.map(section => {
  const visibleItems = section.items.filter(item =>
    getVisibility(item.menuItemKey) !== 'hidden'
  )

  if (visibleItems.length === 0) return null

  return (
    <div key={section.title}>
      {/* Section header */}
      {visibleItems.map(item => {
        const status = getVisibility(item.menuItemKey)
        if (status === 'coming_soon') {
          return <MenuItemComingSoon key={item.path} {...item} />
        }
        return <NavLink key={item.path} {...item} />
      })}
    </div>
  )
})}
```

## Key Files

| File | Purpose |
|------|---------|
| `frontend/src/shared/hooks/useMenuVisibility.ts` | Main visibility hook |
| `frontend/src/shared/types/menu.ts` | TypeScript types |
| `frontend/src/shared/components/MenuItemComingSoon/` | "Coming Soon" item |
| `frontend/src/shared/components/ProtectedFeatureRoute/` | Route protection |
| `frontend/src/shared/layouts/MainLayout/Sidebar.tsx` | Integrate visibility |
| `frontend/src/features/admin/pages/AdminMenuVisibilityPage.tsx` | Admin config |

## Testing

### Manual Testing

1. **As admin**: Go to `/admin/menu-visibility`, configure an item to be restricted to a specific plan
2. **As user without plan**: Verify item is hidden or shows "Coming Soon"
3. **As user with plan**: Verify item is visible
4. **Direct URL access**: Try accessing restricted URL directly, verify redirect

### Key Scenarios

- [ ] User with no plan sees only public/essential items
- [ ] User with plan sees items configured for that plan
- [ ] "Coming Soon" items show badge and are not clickable
- [ ] Hidden items don't appear in menu at all
- [ ] Direct URL access to restricted routes redirects
- [ ] Essential items cannot be hidden (validation error)
- [ ] Menu shows skeleton while loading

## Admin Configuration

Access the admin page at `/admin/menu-visibility`:

1. **View all items**: See current configuration for all menu items
2. **Edit item**: Click to open modal
3. **Set access type**:
   - Public: All authenticated users
   - By Plan: Select specific plans
4. **Set hidden behavior**:
   - Hidden: Completely invisible
   - Coming Soon: Shows disabled with badge
5. **Preview**: See how menu looks for each plan

## Troubleshooting

### Menu not updating after config change
- Cache lasts 5 minutes
- User can hard refresh or wait
- In dev, use React Query DevTools to invalidate

### All items hidden for user
- Check user has active plan (via `user_transactions_view`)
- Verify workspace plan if in workspace
- Check RLS policies are correct

### Essential item hidden
- Backend validation should prevent this
- Check `is_essential` flag in database
- Manually update if needed

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
├─────────────────────────────────────────────────────────────┤
│  Sidebar.tsx                                                 │
│    └── useMenuVisibility()                                   │
│          └── Supabase: user_menu_visibility view             │
│                 └── Computes visibility based on user plan   │
│                                                              │
│  ProtectedFeatureRoute                                       │
│    └── useMenuItemVisibility(key)                            │
│          └── Redirects if not visible                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                         Database                             │
├─────────────────────────────────────────────────────────────┤
│  menu_visibility_config (table)                              │
│    - Stores configuration per menu item                      │
│    - RLS: admins write, all read                             │
│                                                              │
│  user_menu_visibility (view)                                 │
│    - Computes visibility_status per item for current user    │
│    - Uses effective plan (workspace or personal)             │
└─────────────────────────────────────────────────────────────┘
```
