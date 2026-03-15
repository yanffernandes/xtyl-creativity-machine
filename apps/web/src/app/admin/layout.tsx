'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';

interface AdminVerifyResponse {
  is_admin: boolean;
  user_id: string;
  email: string;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyAdminAccess = async () => {
      // Wait for auth to load
      if (authLoading) return;

      // If not logged in, redirect to login
      if (!user) {
        router.push('/login?redirect=/admin');
        return;
      }

      // Always verify with backend (don't rely on local state which may not be updated yet)
      try {
        const response = await api.get<AdminVerifyResponse>('/admin/verify');
        if (response.data.is_admin) {
          setIsAuthorized(true);
        } else {
          setError('Admin verification failed.');
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to verify admin access. Please try again.';
        if (message.includes('403') || message.includes('permission')) {
          setError('You do not have permission to access the admin panel.');
        } else {
          setError(message);
        }
      } finally {
        setIsVerifying(false);
      }
    };

    verifyAdminAccess();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  // Loading state
  if (authLoading || isVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/20">
            <Shield className="h-8 w-8 text-blue-400" />
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
            <span className="text-white/70">Verifying admin access...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state (not authorized)
  if (error || !isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="mx-4 max-w-md rounded-2xl border border-red-500/20 bg-red-500/10 p-8 backdrop-blur-xl">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/20">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Access Denied</h2>
            <p className="text-white/70">
              {error || 'You do not have permission to access this page.'}
            </p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 rounded-lg bg-white/10 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              Return to App
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authorized - render admin layout
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <AdminSidebar />
      <main className="pl-64">
        <div className="min-h-screen">{children}</div>
      </main>
    </div>
  );
}
