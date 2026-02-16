import { createRootRoute, Outlet } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/lib/stores';
import { Toaster } from '@/components/ui/toaster';
import '@/styles/glass.css';
import '@/lib/i18n';

/**
 * Root Layout (T098)
 *
 * Wraps all pages with:
 * - Auth initialization (Supabase session restore + listener)
 * - React Query provider
 * - Toast notifications
 * - Ethereal Blue gradient background
 */
export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const { initialize, loading } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-[#5B8DEF]" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <Outlet />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}
