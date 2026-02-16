/**
 * User Preferences Hook (Stub)
 *
 * TODO: Port full implementation from frontend/src/hooks/useUserPreferences.ts
 * Currently returns defaults for autonomous mode.
 */

import { useState } from 'react';

interface UserPreferences {
  autonomous_mode: boolean;
}

export function useUserPreferences(_token?: string | null) {
  const [preferences] = useState<UserPreferences>({
    autonomous_mode: false,
  });

  const updatePreference = (_key: string, _value: unknown) => {
    // TODO: Implement preference persistence
  };

  return {
    preferences,
    updatePreference,
    isLoading: false,
  };
}
