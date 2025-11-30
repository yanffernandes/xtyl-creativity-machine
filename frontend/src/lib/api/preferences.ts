/**
 * Preferences API Client
 *
 * Client for user AI assistant preferences operations.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface UserPreferences {
  id: string;
  user_id: string;
  autonomous_mode: boolean;
  max_iterations: number;
  default_model: string | null;
  use_rag_by_default: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

export interface UserPreferencesUpdate {
  autonomous_mode?: boolean;
  max_iterations?: number;
  default_model?: string | null;
  use_rag_by_default?: boolean;
  settings?: Record<string, unknown>;
}

/**
 * Get user preferences
 */
export async function getPreferences(token: string): Promise<UserPreferences> {
  const response = await fetch(`${API_BASE_URL}/preferences`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch preferences');
  }

  return response.json();
}

/**
 * Update user preferences
 */
export async function updatePreferences(
  token: string,
  updates: UserPreferencesUpdate
): Promise<UserPreferences> {
  const response = await fetch(`${API_BASE_URL}/preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update preferences');
  }

  return response.json();
}
