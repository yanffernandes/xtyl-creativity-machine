import { Locale, locales } from './config';

const STORAGE_KEY = 'xtyl-locale';
const COOKIE_NAME = 'NEXT_LOCALE';

export const localeStorage = {
  get: (): Locale | null => {
    if (typeof window === 'undefined') return null;
    try {
      // Try cookie first (synced with server)
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${COOKIE_NAME}=`))
        ?.split('=')[1];
      if (cookieValue && locales.includes(cookieValue as Locale)) {
        return cookieValue as Locale;
      }
      // Fallback to localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      return locales.includes(stored as Locale) ? (stored as Locale) : null;
    } catch {
      return null;
    }
  },

  set: (locale: Locale): void => {
    if (typeof window === 'undefined') return;
    try {
      // Set cookie (accessible by server) - expires in 1 year
      document.cookie = `${COOKIE_NAME}=${locale};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
      // Also set localStorage as backup
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // Storage not available
    }
  },

  remove: (): void => {
    if (typeof window === 'undefined') return;
    try {
      document.cookie = `${COOKIE_NAME}=;path=/;max-age=0`;
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage not available
    }
  }
};
