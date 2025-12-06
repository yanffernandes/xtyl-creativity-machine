/**
 * Memory Types - User Memory System (Feature 024)
 *
 * TypeScript types for the AI memory system that persists user facts
 * across conversations.
 */

/**
 * Memory category types
 */
export type MemoryCategory =
  | 'personal'
  | 'professional'
  | 'preference'
  | 'plan'
  | 'health'
  | 'other';

/**
 * Category display configuration
 */
export interface CategoryConfig {
  label: string;
  icon: string;
  color: string;
}

/**
 * Category configuration map
 * Note: Labels here are fallbacks. Use i18n `memory.categories.{key}` for translated labels.
 */
export const CATEGORY_CONFIG: Record<MemoryCategory, CategoryConfig> = {
  personal: {
    label: 'Personal',
    icon: '👤',
    color: 'blue',
  },
  professional: {
    label: 'Professional',
    icon: '💼',
    color: 'purple',
  },
  preference: {
    label: 'Preferences',
    icon: '🎯',
    color: 'green',
  },
  plan: {
    label: 'Plans',
    icon: '📅',
    color: 'amber',
  },
  health: {
    label: 'Health',
    icon: '💪',
    color: 'red',
  },
  other: {
    label: 'Other',
    icon: '📝',
    color: 'gray',
  },
};

/**
 * Category options for select dropdowns
 */
export const MEMORY_CATEGORY_OPTIONS: Array<{ value: MemoryCategory; icon: string }> = [
  { value: 'personal', icon: '👤' },
  { value: 'professional', icon: '💼' },
  { value: 'preference', icon: '🎯' },
  { value: 'plan', icon: '📅' },
  { value: 'health', icon: '💪' },
  { value: 'other', icon: '📝' },
];

/**
 * Alias for CATEGORY_CONFIG for backwards compatibility
 */
export const MEMORY_CATEGORIES = CATEGORY_CONFIG;

/**
 * User memory record
 */
export interface Memory {
  id: string;
  user_id: string;
  project_id: string;
  content: string;
  content_hash: string;
  category: MemoryCategory;
  source_conversation_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Memory list response with pagination
 */
export interface MemoryListResponse {
  memories: Memory[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/**
 * Memory search response
 */
export interface MemorySearchResponse {
  memories: Memory[];
  query: string;
}

/**
 * Create memory request
 */
export interface CreateMemoryRequest {
  content: string;
  category?: MemoryCategory;
}

/**
 * Update memory request
 */
export interface UpdateMemoryRequest {
  content?: string;
  category?: MemoryCategory;
}

/**
 * Memory search request
 */
export interface SearchMemoriesRequest {
  query: string;
  category?: MemoryCategory;
  limit?: number;
}

/**
 * Bulk delete response
 */
export interface BulkDeleteResponse {
  deleted_count: number;
}

/**
 * Alias for Memory type for backwards compatibility
 */
export type UserMemory = Memory;
