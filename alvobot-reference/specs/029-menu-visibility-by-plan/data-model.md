# Data Model: Menu Visibility by Plan

**Feature**: 029-menu-visibility-by-plan
**Date**: 2025-01-16

## Entities

### MenuVisibilityConfig

Configuration for each menu item's visibility based on user plans.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, auto-generated | Unique identifier |
| `menu_item_key` | VARCHAR(100) | UNIQUE, NOT NULL | Identifier matching frontend menu item (e.g., 'dashboard', 'alvoads-meta') |
| `plan_ids` | INTEGER[] | DEFAULT '{}' | Array of plan IDs with full access |
| `is_public` | BOOLEAN | DEFAULT FALSE | If true, visible to all authenticated users (ignores plan_ids) |
| `show_as_coming_soon` | BOOLEAN | DEFAULT FALSE | If true, shows as "Em Breve" for users without access; if false, completely hidden |
| `coming_soon_text` | VARCHAR(255) | DEFAULT 'Disponível em breve' | Custom tooltip text for "Coming Soon" items |
| `redirect_url` | VARCHAR(255) | NULL | Optional redirect URL when access denied |
| `is_essential` | BOOLEAN | DEFAULT FALSE | Essential items cannot be completely hidden |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

### Relationships

```
MenuVisibilityConfig
    └── plan_ids[] ──> Plan (many-to-many via array)
```

**Note**: Uses PostgreSQL array type instead of junction table for simplicity. The `plan_ids` array references `plans.id`.

---

## Database Schema

### Table: menu_visibility_config

```sql
-- Migration: 029_menu_visibility_config.sql

CREATE TABLE IF NOT EXISTS public.menu_visibility_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_key VARCHAR(100) NOT NULL UNIQUE,
    plan_ids INTEGER[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT FALSE,
    show_as_coming_soon BOOLEAN DEFAULT FALSE,
    coming_soon_text VARCHAR(255) DEFAULT 'Disponível em breve',
    redirect_url VARCHAR(255),
    is_essential BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_menu_visibility_menu_item
    ON public.menu_visibility_config(menu_item_key);
CREATE INDEX IF NOT EXISTS idx_menu_visibility_public
    ON public.menu_visibility_config(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_menu_visibility_essential
    ON public.menu_visibility_config(is_essential) WHERE is_essential = TRUE;

-- Trigger for updated_at
CREATE TRIGGER set_menu_visibility_updated_at
    BEFORE UPDATE ON public.menu_visibility_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.menu_visibility_config IS 'Menu item visibility configuration based on user plans';
COMMENT ON COLUMN public.menu_visibility_config.menu_item_key IS 'Unique key matching frontend NavItem (e.g., dashboard, alvoads-meta)';
COMMENT ON COLUMN public.menu_visibility_config.plan_ids IS 'Array of plan IDs with access. Empty = no specific plans have access';
COMMENT ON COLUMN public.menu_visibility_config.is_public IS 'If true, all authenticated users see this item (ignores plan_ids)';
COMMENT ON COLUMN public.menu_visibility_config.show_as_coming_soon IS 'If true, shows disabled with "Em Breve" badge; if false, completely hidden';
COMMENT ON COLUMN public.menu_visibility_config.is_essential IS 'Essential items cannot be completely hidden (validation enforced)';
```

### Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE public.menu_visibility_config ENABLE ROW LEVEL SECURITY;

-- Admins can manage all configs
CREATE POLICY "menu_visibility_admins_all" ON public.menu_visibility_config
    FOR ALL
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

-- Service role has full access (for backend operations)
CREATE POLICY "menu_visibility_service_role" ON public.menu_visibility_config
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated users can read (for menu rendering)
CREATE POLICY "menu_visibility_authenticated_read" ON public.menu_visibility_config
    FOR SELECT
    USING (auth.role() = 'authenticated');
```

### View: user_menu_visibility

Computed view that calculates visibility status for current user.

```sql
CREATE OR REPLACE VIEW public.user_menu_visibility AS
WITH effective_plan AS (
    -- Get user's effective plan (workspace plan if active, else personal plan)
    SELECT
        COALESCE(
            -- First try workspace plan
            (SELECT w.plan_id
             FROM workspaces w
             INNER JOIN workspace_members wm ON wm.workspace_id = w.id
             WHERE wm.user_id = auth.uid()
             AND wm.status = 'active'
             ORDER BY wm.updated_at DESC
             LIMIT 1),
            -- Fallback to personal plan from transactions
            (SELECT t.plan_id
             FROM transactions t
             WHERE t.user_id = auth.uid()
             AND t.status IN ('approved', 'completed')
             AND t.timestamp_approved IS NOT NULL
             AND (t.timestamp_approved + (t.duration || ' months')::INTERVAL) > NOW()
             ORDER BY t.timestamp_approved DESC
             LIMIT 1)
        ) AS plan_id
)
SELECT
    mvc.menu_item_key,
    mvc.coming_soon_text,
    mvc.redirect_url,
    mvc.is_essential,
    CASE
        -- Public items: always visible
        WHEN mvc.is_public THEN 'visible'
        -- User has matching plan: visible
        WHEN ep.plan_id IS NOT NULL AND ep.plan_id = ANY(mvc.plan_ids) THEN 'visible'
        -- No access but show as coming soon
        WHEN mvc.show_as_coming_soon THEN 'coming_soon'
        -- No access, completely hidden
        ELSE 'hidden'
    END AS visibility_status
FROM public.menu_visibility_config mvc
CROSS JOIN effective_plan ep;

COMMENT ON VIEW public.user_menu_visibility IS 'Computed menu visibility for current authenticated user';
```

### Seed Data

```sql
-- Initial seed with all current menu items (all public by default)
INSERT INTO public.menu_visibility_config
    (menu_item_key, is_public, is_essential, show_as_coming_soon)
VALUES
    -- Essential items (always visible, cannot be hidden)
    ('dashboard', TRUE, TRUE, FALSE),
    ('projects', TRUE, TRUE, FALSE),
    ('tasks', TRUE, TRUE, FALSE),
    ('settings', TRUE, TRUE, FALSE),
    ('connections', TRUE, TRUE, FALSE),

    -- Feature items (configurable)
    ('courses', TRUE, FALSE, FALSE),
    ('base-structure', TRUE, FALSE, FALSE),
    ('base-articles', TRUE, FALSE, FALSE),
    ('keywords', TRUE, FALSE, FALSE),
    ('arrow-articles', TRUE, FALSE, FALSE),
    ('alvoads-meta', TRUE, FALSE, FALSE),
    ('alvoads-meta-library', TRUE, FALSE, FALSE),
    ('alvoads-google', TRUE, FALSE, FALSE),
    ('receita', TRUE, FALSE, FALSE),
    ('google-ads', TRUE, FALSE, FALSE),
    ('flows', TRUE, FALSE, FALSE),
    ('runs', TRUE, FALSE, FALSE),
    ('triggers', TRUE, FALSE, FALSE)
ON CONFLICT (menu_item_key) DO NOTHING;
```

---

## TypeScript Types

### Frontend Types

```typescript
// frontend/src/shared/types/menu.ts

export type MenuVisibilityStatus = 'visible' | 'coming_soon' | 'hidden';

/**
 * Raw configuration from database
 */
export interface MenuVisibilityConfig {
  id: string;
  menu_item_key: string;
  plan_ids: number[];
  is_public: boolean;
  show_as_coming_soon: boolean;
  coming_soon_text: string;
  redirect_url: string | null;
  is_essential: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Computed visibility for current user (from view)
 */
export interface UserMenuVisibility {
  menu_item_key: string;
  visibility_status: MenuVisibilityStatus;
  coming_soon_text: string;
  redirect_url: string | null;
  is_essential: boolean;
}

/**
 * DTO for updating menu visibility config
 */
export interface UpdateMenuVisibilityDto {
  plan_ids?: number[];
  is_public?: boolean;
  show_as_coming_soon?: boolean;
  coming_soon_text?: string;
  redirect_url?: string | null;
}

/**
 * Extended NavItem with visibility key
 */
export interface NavItemWithKey {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  path: string;
  menuItemKey: string;
}

/**
 * NavItem with computed visibility
 */
export interface NavItemWithVisibility extends NavItemWithKey {
  visibility: MenuVisibilityStatus;
  comingSoonText?: string;
}
```

### Admin Types

```typescript
// frontend/src/features/admin/types/menuVisibility.ts

import { MenuVisibilityConfig, UpdateMenuVisibilityDto } from '@/shared/types/menu';

/**
 * Config with plan details for admin display
 */
export interface MenuVisibilityConfigWithPlans extends MenuVisibilityConfig {
  plans: Array<{
    id: number;
    name: string;
  }>;
}

/**
 * Table row for admin list
 */
export interface MenuVisibilityTableRow {
  menu_item_key: string;
  label: string;
  section: string;
  is_public: boolean;
  plan_names: string[];
  show_as_coming_soon: boolean;
  is_essential: boolean;
}

/**
 * Form data for edit modal
 */
export interface MenuVisibilityFormData {
  accessType: 'public' | 'by_plan';
  plan_ids: number[];
  hiddenBehavior: 'hidden' | 'coming_soon';
  coming_soon_text: string;
  redirect_url: string;
}
```

---

## State Transitions

The `visibility_status` is computed, not stored. It depends on:

1. **is_public** = true → `visible`
2. **user's plan_id** in **plan_ids** → `visible`
3. **show_as_coming_soon** = true → `coming_soon`
4. Otherwise → `hidden`

```
┌─────────────────────────────────────────────────────┐
│                  Config State                       │
├─────────────────────────────────────────────────────┤
│  is_public = true                                   │
│      └── visibility: VISIBLE (all users)           │
│                                                     │
│  is_public = false                                  │
│      ├── user.plan_id IN plan_ids                  │
│      │       └── visibility: VISIBLE               │
│      │                                              │
│      └── user.plan_id NOT IN plan_ids              │
│              ├── show_as_coming_soon = true        │
│              │       └── visibility: COMING_SOON   │
│              │                                      │
│              └── show_as_coming_soon = false       │
│                      └── visibility: HIDDEN        │
└─────────────────────────────────────────────────────┘
```

---

## Validation Rules

### Backend Validation

```typescript
// On update/create
class MenuVisibilityValidator {
  validate(config: UpdateMenuVisibilityDto, existing: MenuVisibilityConfig): void {
    // Rule 1: Essential items cannot be completely hidden
    if (existing.is_essential) {
      const wouldBeHidden = !config.is_public &&
                            (config.plan_ids?.length === 0) &&
                            !config.show_as_coming_soon;
      if (wouldBeHidden) {
        throw new Error('Essential items cannot be completely hidden');
      }
    }

    // Rule 2: coming_soon_text required if show_as_coming_soon
    if (config.show_as_coming_soon && !config.coming_soon_text?.trim()) {
      throw new Error('Coming soon text is required when showing as coming soon');
    }

    // Rule 3: redirect_url must be valid if provided
    if (config.redirect_url && !isValidPath(config.redirect_url)) {
      throw new Error('Redirect URL must be a valid path');
    }
  }
}
```

### Frontend Validation (Zod)

```typescript
import { z } from 'zod';

export const menuVisibilityFormSchema = z.object({
  accessType: z.enum(['public', 'by_plan']),
  plan_ids: z.array(z.number()).default([]),
  hiddenBehavior: z.enum(['hidden', 'coming_soon']),
  coming_soon_text: z.string().max(255).default('Disponível em breve'),
  redirect_url: z.string().max(255).optional(),
}).refine(
  (data) => data.accessType === 'public' || data.plan_ids.length > 0 || data.hiddenBehavior === 'coming_soon',
  { message: 'Selecione pelo menos um plano ou marque como "Em Breve"' }
);
```

---

## Indexes & Performance

| Index | Purpose | Expected Usage |
|-------|---------|----------------|
| `idx_menu_visibility_menu_item` | Lookup by menu_item_key | Every menu render |
| `idx_menu_visibility_public` | Filter public items | View computation |
| `idx_menu_visibility_essential` | Filter essential items | Admin validation |

**Estimated Table Size**: ~20 rows (one per menu item)
**Query Frequency**: Once per page load (cached 5 minutes)
**Expected Latency**: <10ms
