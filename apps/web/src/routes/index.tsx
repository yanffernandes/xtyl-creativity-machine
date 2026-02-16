import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores';
import { supabase } from '@/lib/supabase';

/**
 * Index Route (T101)
 *
 * Redirects authenticated users to their default workspace,
 * or sends unauthenticated users to the login page.
 */
export const Route = createFileRoute('/')({
  component: IndexPage,
});

function IndexPage() {
  const navigate = useNavigate();
  const { user, session } = useAuthStore();

  useEffect(() => {
    if (!session) {
      navigate({ to: '/login' });
      return;
    }

    // Fetch user's default workspace and redirect
    const fetchWorkspace = async () => {
      const { data } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', user?.id ?? '')
        .limit(1)
        .single();

      if (data?.workspace_id) {
        navigate({ to: '/workspace/$id', params: { id: data.workspace_id } });
      }
    };

    fetchWorkspace();
  }, [session, user, navigate]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-[#5B8DEF]" />
    </div>
  );
}
