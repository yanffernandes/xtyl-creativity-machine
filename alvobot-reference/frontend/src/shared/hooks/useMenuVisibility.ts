import { useQuery } from '@tanstack/react-query'
import type { UserMenuVisibility, MenuVisibilityStatus } from '@/shared/types/menu'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'

/**
 * Fetches menu visibility configuration for the current user.
 * Returns computed visibility status based on user's effective plan.
 */
async function fetchUserMenuVisibility(): Promise<UserMenuVisibility[]> {
  const { data, error } = await supabase
    .from('user_menu_visibility')
    .select('*')

  if (error) {
    console.error('Error fetching menu visibility:', error)
    throw error
  }

  return data || []
}

/**
 * Hook to fetch menu visibility for the current user.
 * Returns visibility status for all menu items based on user's plan.
 * Uses 5-minute cache for performance.
 */
export function useMenuVisibility() {
  return useQuery({
    queryKey: queryKeys.menuVisibility.user(),
    queryFn: fetchUserMenuVisibility,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}

/**
 * Hook to get visibility status for a specific menu item.
 * Returns the visibility status, coming soon text, and redirect URL.
 */
export function useMenuItemVisibility(menuItemKey: string): {
  isLoading: boolean
  isError: boolean
  visibility: MenuVisibilityStatus
  comingSoonText: string | null
  redirectUrl: string | null
  isEssential: boolean
} {
  const { data, isLoading, isError } = useMenuVisibility()

  const item = data?.find((v) => v.menu_item_key === menuItemKey)

  // Fail-open: if no config found or error, treat as visible (security by default on backend)
  // But if specifically not found, treat as hidden (new items hidden by default)
  if (isLoading) {
    return {
      isLoading: true,
      isError: false,
      visibility: 'visible', // Show while loading for UX
      comingSoonText: null,
      redirectUrl: null,
      isEssential: false,
    }
  }

  if (isError) {
    // Fail-open on error: show all items
    return {
      isLoading: false,
      isError: true,
      visibility: 'visible',
      comingSoonText: null,
      redirectUrl: null,
      isEssential: false,
    }
  }

  if (!item) {
    // New items without config are hidden by default
    return {
      isLoading: false,
      isError: false,
      visibility: 'hidden',
      comingSoonText: null,
      redirectUrl: null,
      isEssential: false,
    }
  }

  return {
    isLoading: false,
    isError: false,
    visibility: item.visibility_status,
    comingSoonText: item.coming_soon_text,
    redirectUrl: item.redirect_url,
    isEssential: item.is_essential,
  }
}

/**
 * Hook to get a map of menu item keys to their visibility status.
 * Useful for filtering multiple items at once.
 */
export function useMenuVisibilityMap(): {
  isLoading: boolean
  isError: boolean
  visibilityMap: Map<string, UserMenuVisibility>
  getVisibility: (menuItemKey: string) => MenuVisibilityStatus
} {
  const { data, isLoading, isError } = useMenuVisibility()

  const visibilityMap = new Map<string, UserMenuVisibility>()
  data?.forEach((item) => {
    visibilityMap.set(item.menu_item_key, item)
  })

  const getVisibility = (menuItemKey: string): MenuVisibilityStatus => {
    if (isError) {
      // Fail-open on error
      return 'visible'
    }
    const item = visibilityMap.get(menuItemKey)
    if (!item) {
      // New items hidden by default
      return 'hidden'
    }
    return item.visibility_status
  }

  return {
    isLoading,
    isError,
    visibilityMap,
    getVisibility,
  }
}
