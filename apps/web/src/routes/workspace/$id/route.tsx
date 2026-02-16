import { createFileRoute, Outlet, Link, useNavigate, useParams } from '@tanstack/react-router';
import { useAuthStore, useUIStore } from '@/lib/stores';
import { useEffect } from 'react';
import {
  LayoutDashboard, FolderKanban, FileText, Settings,
  User, BarChart3, ChevronLeft, ChevronRight, LogOut, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

/**
 * Workspace Layout (T102)
 *
 * Main authenticated layout with:
 * - Collapsible sidebar with navigation and project list
 * - Glassmorphism + Ethereal Blue design system
 * - Auth guard (redirects to /login if no session)
 * - Workspace data fetching
 */
function WorkspaceLayout() {
  const { id: workspaceId } = useParams({ from: '/workspace/$id' });
  const navigate = useNavigate();
  const { user, session } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  // Redirect if not authenticated
  useEffect(() => {
    if (!session) {
      navigate({ to: '/login' });
    }
  }, [session, navigate]);

  // Fetch workspace projects
  const { data: projects } = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, name, created_at')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const { data: workspace } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();
      return data;
    },
    enabled: !!workspaceId,
  });

  if (!session) return null;

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/workspace/$id', params: { id: workspaceId } },
    { label: 'Templates', icon: FileText, to: '/workspace/$id/templates', params: { id: workspaceId } },
    { label: 'AI Usage', icon: BarChart3, to: '/workspace/$id/ai-usage', params: { id: workspaceId } },
    { label: 'Settings', icon: Settings, to: '/workspace/$id/settings', params: { id: workspaceId } },
    { label: 'Profile', icon: User, to: '/workspace/$id/profile', params: { id: workspaceId } },
  ];

  const initials = user?.email?.substring(0, 2).toUpperCase() ?? 'U';

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-slate-200/50 bg-white/80 backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-900/80 transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between px-3">
          {!sidebarCollapsed && (
            <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {workspace?.name ?? 'Workspace'}
            </span>
          )}
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8 shrink-0">
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <Separator />

        <ScrollArea className="flex-1 px-2 py-3">
          {/* Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.to as string}
                params={item.params}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white [&.active]:bg-[#5B8DEF]/10 [&.active]:text-[#5B8DEF]"
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>

          {/* Projects */}
          {!sidebarCollapsed && (
            <>
              <Separator className="my-3" />
              <div className="flex items-center justify-between px-3 mb-2">
                <span className="text-xs font-medium uppercase text-slate-400">Projects</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() =>
                    navigate({ to: '/workspace/$id', params: { id: workspaceId } })
                  }
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <nav className="space-y-0.5">
                {projects?.map((project: { id: string; name: string; created_at: string }) => (
                  <Link
                    key={project.id}
                    to="/workspace/$id/project/$projectId"
                    params={{ id: workspaceId, projectId: project.id }}
                    className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 [&.active]:bg-[#5B8DEF]/10 [&.active]:text-[#5B8DEF]"
                  >
                    <FolderKanban className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{project.name}</span>
                  </Link>
                ))}
              </nav>
            </>
          )}
        </ScrollArea>

        {/* User footer */}
        <div className="border-t border-slate-200/50 p-3 dark:border-slate-800/50">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-[#5B8DEF]/20 text-[#5B8DEF]">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate text-slate-900 dark:text-white">
                  {user?.email}
                </p>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => {
                supabase.auth.signOut();
                navigate({ to: '/login' });
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

export const Route = createFileRoute('/workspace/$id')({
  component: WorkspaceLayout,
});
