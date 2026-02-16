import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

/**
 * Auth Callback Route
 *
 * Handles OAuth callback from Supabase Auth.
 * Exchanges the auth code for a session and redirects to the app.
 */
function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the auth code from URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          // Set the session
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('Error setting session:', error);
            navigate({ to: '/login', search: { error: 'auth_failed' } });
            return;
          }

          // Get user's default workspace
          const { data: workspaces } = await supabase
            .from('workspaces')
            .select('id')
            .eq('owner_id', data.user?.id)
            .limit(1);

          if (workspaces && workspaces.length > 0) {
            navigate({ to: '/workspace/$id', params: { id: workspaces[0].id } });
          } else {
            navigate({ to: '/' });
          }
        } else {
          // No tokens in URL, redirect to login
          navigate({ to: '/login' });
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate({ to: '/login', search: { error: 'callback_failed' } });
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#5B8DEF]" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Authenticating...
        </p>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/auth/callback/')({
  component: AuthCallback,
});
