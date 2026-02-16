/**
 * Frontend Hook Contracts for Menu Visibility
 *
 * These are the TypeScript interfaces and hook signatures that will be
 * implemented in the frontend. This serves as a contract for implementation.
 */

import { UseQueryResult, UseMutationResult } from '@tanstack/react-query';

// =============================================================================
// Types
// =============================================================================

export type MenuVisibilityStatus = 'visible' | 'coming_soon' | 'hidden';

export interface UserMenuVisibility {
  menu_item_key: string;
  visibility_status: MenuVisibilityStatus;
  coming_soon_text: string;
  redirect_url: string | null;
  is_essential: boolean;
}

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

export interface UpdateMenuVisibilityDto {
  plan_ids?: number[];
  is_public?: boolean;
  show_as_coming_soon?: boolean;
  coming_soon_text?: string;
  redirect_url?: string | null;
}

// =============================================================================
// Hook Contracts
// =============================================================================

/**
 * Hook to get current user's effective plan ID
 *
 * Priority:
 * 1. Active workspace's plan_id (if user is in a workspace)
 * 2. User's personal plan_id (from transactions)
 * 3. null (no active plan)
 *
 * @example
 * const planId = useEffectivePlanId();
 * // planId: number | null
 */
export declare function useEffectivePlanId(): number | null;

/**
 * Hook to get menu visibility for current user
 *
 * Returns computed visibility status for all menu items based on
 * the user's effective plan.
 *
 * @example
 * const { data, isLoading, error } = useMenuVisibility();
 * if (isLoading) return <SidebarSkeleton />;
 *
 * const isVisible = (key: string) =>
 *   data?.find(v => v.menu_item_key === key)?.visibility_status === 'visible';
 */
export declare function useMenuVisibility(): UseQueryResult<UserMenuVisibility[], Error>;

/**
 * Hook to check if a specific menu item is visible
 *
 * @example
 * const { isVisible, isComingSoon, comingSoonText } = useMenuItemVisibility('alvoads-meta');
 */
export declare function useMenuItemVisibility(menuItemKey: string): {
  isVisible: boolean;
  isComingSoon: boolean;
  isHidden: boolean;
  comingSoonText: string | null;
  redirectUrl: string | null;
  isLoading: boolean;
};

/**
 * Hook to get all menu visibility configs (admin only)
 *
 * @example
 * const { data: configs } = useMenuVisibilityConfigs();
 */
export declare function useMenuVisibilityConfigs(): UseQueryResult<MenuVisibilityConfig[], Error>;

/**
 * Hook to update menu visibility config (admin only)
 *
 * @example
 * const updateConfig = useUpdateMenuVisibilityConfig();
 *
 * await updateConfig.mutateAsync({
 *   menuItemKey: 'alvoads-meta',
 *   data: {
 *     plan_ids: [2, 3],
 *     show_as_coming_soon: true,
 *     coming_soon_text: 'Disponível no plano Pro'
 *   }
 * });
 */
export declare function useUpdateMenuVisibilityConfig(): UseMutationResult<
  MenuVisibilityConfig,
  Error,
  { menuItemKey: string; data: UpdateMenuVisibilityDto }
>;

// =============================================================================
// Query Keys Contract
// =============================================================================

/**
 * Query keys to be added to queryKeys.ts
 */
export const menuVisibilityQueryKeys = {
  all: ['menu-visibility'] as const,
  config: () => [...menuVisibilityQueryKeys.all, 'config'] as const,
  configList: () => [...menuVisibilityQueryKeys.config(), 'list'] as const,
  userVisibility: () => [...menuVisibilityQueryKeys.all, 'user'] as const,
} as const;

// =============================================================================
// Component Props Contracts
// =============================================================================

/**
 * Props for MenuItemComingSoon component
 */
export interface MenuItemComingSoonProps {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  tooltipText?: string;
}

/**
 * Props for ProtectedFeatureRoute component
 */
export interface ProtectedFeatureRouteProps {
  /** Menu item key to check visibility for */
  menuItemKey: string;
  /** Content to render if user has access */
  children: React.ReactNode;
  /** Path to redirect to if access denied (default: /dashboard) */
  fallbackPath?: string;
  /** Show upgrade page instead of redirect when access denied */
  showUpgradePage?: boolean;
}

/**
 * Props for SidebarSkeleton component
 */
export interface SidebarSkeletonProps {
  /** Number of skeleton items to show (default: 10) */
  itemCount?: number;
}
