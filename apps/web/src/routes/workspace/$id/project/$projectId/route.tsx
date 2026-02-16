import { createFileRoute, Outlet, useParams, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { FolderKanban, Image, Workflow, Settings, ArrowLeft } from 'lucide-react';

function ProjectLayout() {
  const { id: workspaceId, projectId } = useParams({ from: '/workspace/$id/project/$projectId' });

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      return data;
    },
    enabled: !!projectId,
  });

  return (
    <div className="flex flex-col h-full">
      {/* Project header */}
      <div className="border-b border-slate-200/50 bg-white/50 backdrop-blur-sm dark:border-slate-800/50 dark:bg-slate-900/50 px-6 py-3">
        <div className="flex items-center gap-4">
          <Link
            to="/workspace/$id"
            params={{ id: workspaceId }}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h2 className="font-semibold text-slate-900 dark:text-white truncate">
            {project?.name ?? 'Project'}
          </h2>
        </div>
        <nav className="flex items-center gap-1 mt-3 -mb-[13px]">
          {[
            { label: 'Overview', to: '/workspace/$id/project/$projectId', icon: FolderKanban },
            { label: 'Studio', to: '/workspace/$id/project/$projectId/studio', icon: Image },
            { label: 'Workflows', to: '/workspace/$id/project/$projectId/workflows', icon: Workflow },
            { label: 'Settings', to: '/workspace/$id/project/$projectId/settings', icon: Settings },
          ].map((tab) => (
            <Link
              key={tab.label}
              to={tab.to as any}
              params={{ id: workspaceId, projectId } as any}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border-b-2 border-transparent transition-colors hover:text-slate-700 [&.active]:text-[#5B8DEF] [&.active]:border-[#5B8DEF]"
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/workspace/$id/project/$projectId')({
  component: ProjectLayout,
});
