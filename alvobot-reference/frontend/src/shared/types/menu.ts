// Menu Visibility Types for Feature 029

export type MenuVisibilityStatus = 'visible' | 'coming_soon' | 'hidden'

/**
 * Raw configuration from database
 */
export interface MenuVisibilityConfig {
  id: string
  menu_item_key: string
  plan_ids: number[]
  is_public: boolean
  show_as_coming_soon: boolean
  coming_soon_text: string
  redirect_url: string | null
  is_essential: boolean
  created_at: string
  updated_at: string
}

/**
 * Computed visibility for current user (from view)
 */
export interface UserMenuVisibility {
  menu_item_key: string
  visibility_status: MenuVisibilityStatus
  coming_soon_text: string
  redirect_url: string | null
  is_essential: boolean
}

/**
 * DTO for updating menu visibility config
 */
export interface UpdateMenuVisibilityDto {
  plan_ids?: number[]
  is_public?: boolean
  show_as_coming_soon?: boolean
  coming_soon_text?: string
  redirect_url?: string | null
}

/**
 * Extended NavItem with visibility key
 */
export interface NavItemWithKey {
  icon: React.ComponentType<{ size?: number }>
  label: string
  path: string
  menuItemKey: string
}

/**
 * NavItem with computed visibility
 */
export interface NavItemWithVisibility extends NavItemWithKey {
  visibility: MenuVisibilityStatus
  comingSoonText?: string
}

/**
 * NavSection with items that have visibility keys
 */
export interface NavSectionWithKeys {
  title: string
  color?: string
  items: NavItemWithKey[]
  collapsible?: boolean
  defaultOpen?: boolean
}
