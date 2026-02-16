// Admin Types for Menu Visibility (Feature 029)

import type { MenuVisibilityConfig, MenuVisibilityStatus, UpdateMenuVisibilityDto } from '@/shared/types/menu'

/**
 * Config with plan details for admin display
 */
export interface MenuVisibilityConfigWithPlans extends MenuVisibilityConfig {
  plans: Array<{
    id: number
    name: string
  }>
}

/**
 * Table row for admin list
 */
export interface MenuVisibilityTableRow {
  menu_item_key: string
  label: string
  section: string
  is_public: boolean
  plan_names: string[]
  show_as_coming_soon: boolean
  is_essential: boolean
}

/**
 * Form data for edit modal
 */
export interface MenuVisibilityFormData {
  accessType: 'public' | 'by_plan'
  plan_ids: number[]
  hiddenBehavior: 'hidden' | 'coming_soon'
  coming_soon_text: string
  redirect_url: string
}

/**
 * Preview item for admin
 */
export interface MenuVisibilityPreviewItem {
  menu_item_key: string
  label: string
  section: string
  visibility_status: MenuVisibilityStatus
  coming_soon_text: string | null
}

/**
 * Preview response
 */
export interface MenuVisibilityPreviewResponse {
  plan: {
    id: number
    name: string
  } | null
  items: MenuVisibilityPreviewItem[]
}

/**
 * Filters for admin table
 */
export interface MenuVisibilityFilters {
  section?: string
  planId?: number
  status?: 'all' | 'public' | 'restricted' | 'coming_soon' | 'hidden'
}

// Re-export for convenience
export type { MenuVisibilityConfig, MenuVisibilityStatus, UpdateMenuVisibilityDto }
