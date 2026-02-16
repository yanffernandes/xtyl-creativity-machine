import { create } from 'zustand';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
}

interface UIState {
  /** Whether the sidebar is collapsed */
  sidebarCollapsed: boolean;

  /** Current theme ('light' | 'dark' | 'system') */
  theme: 'light' | 'dark' | 'system';

  /** Active toast notifications */
  toasts: Toast[];

  /** Toggle sidebar collapsed state */
  toggleSidebar: () => void;

  /** Set sidebar collapsed state explicitly */
  setSidebarCollapsed: (collapsed: boolean) => void;

  /** Set the theme */
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  /** Add a toast notification */
  addToast: (toast: Omit<Toast, 'id'>) => void;

  /** Remove a toast by id */
  removeToast: (id: string) => void;

  /** Clear all toasts */
  clearToasts: () => void;
}

let toastCounter = 0;

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  theme: 'system',
  toasts: [],

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) =>
    set({ sidebarCollapsed: collapsed }),

  setTheme: (theme) => {
    set({ theme });
    // Apply theme class to document root
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      if (theme === 'system') {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.add(systemDark ? 'dark' : 'light');
      } else {
        root.classList.add(theme);
      }
    }
  },

  addToast: (toast) => {
    const id = `toast-${++toastCounter}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));

    // Auto-remove after duration (default 5 seconds)
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clearToasts: () => set({ toasts: [] }),
}));
