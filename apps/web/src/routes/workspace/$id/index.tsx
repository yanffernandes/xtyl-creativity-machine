import { createFileRoute, useParams, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, FolderKanban, Clock } from 'lucide-react';
import api from '@/lib/api';

/**
 * Workspace Dashboard (T103)
 *
 * Shows all projects in the workspace with:
 * - Project grid with glass cards
 * - Create project dialog
 * - Empty state with CTA
 * - Loading skeleton states
 */
function WorkspaceDashboard() {
  const { id: workspaceId } = useParams({ from: '/workspace/$id/' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [projectName, setProjectName] = useState('');

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });
      return data ?? [];
    },
  });

  const createProject = useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post('/projects', {
        name,
        workspace_id: workspaceId,
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] });
      setShowCreate(false);
      setProjectName('');
      if (data?.id) {
        navigate({
          to: '/workspace/$id/project/$projectId',
          params: { id: workspaceId, projectId: data.id },
        });
      }
    },
  });

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Projects
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {projects?.length ?? 0} projects
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Project
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      ) : projects?.length === 0 ? (
        <Card className="glass-subtle">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderKanban className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="font-semibold text-slate-700 dark:text-slate-300">
              No projects yet
            </h3>
            <p className="text-sm text-slate-500 mt-1 mb-4">
              Create your first project to get started
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects?.map((project: { id: string; name: string; updated_at: string }) => (
            <Card
              key={project.id}
              className="cursor-pointer glass-subtle hover:shadow-lg transition-all duration-200"
              onClick={() =>
                navigate({
                  to: '/workspace/$id/project/$projectId',
                  params: { id: workspaceId, projectId: project.id },
                })
              }
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{project.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="h-3 w-3" />
                  <span>
                    {new Date(project.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Project Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new project</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createProject.mutate(projectName);
            }}
          >
            <div className="py-4">
              <Input
                placeholder="Project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                autoFocus
                required
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createProject.isPending || !projectName.trim()}
              >
                {createProject.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute('/workspace/$id/')({
  component: WorkspaceDashboard,
});
