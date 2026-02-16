import { createFileRoute, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WorkflowList } from '@/components/workflow';
import { Workflow } from 'lucide-react';
import { Link } from '@tanstack/react-router';

/**
 * Workspace-level Workflows Page
 *
 * Lists all workflows across all projects in the workspace.
 * Allows navigation to templates and individual workflow executions.
 */
function WorkspaceWorkflowsPage() {
  const { id: workspaceId } = useParams({ from: '/workspace/$id/workflows/' });

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workspace-workflows', workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from('workflow_templates')
        .select(`
          *,
          project:projects(id, name)
        `)
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false });
      return data || [];
    },
  });

  const { data: recentExecutions } = useQuery({
    queryKey: ['workspace-executions', workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from('workflow_executions')
        .select(`
          *,
          workflow:workflow_templates(id, name),
          project:projects(id, name)
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Workflow className="h-6 w-6 text-[#5B8DEF]" />
            Workflows
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage workflows across all projects
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/workspace/$id/workflows/templates"
            params={{ id: workspaceId }}
          >
            <Button variant="outline">
              Browse Templates
            </Button>
          </Link>
        </div>
      </div>

      {/* Workflows Grid */}
      <Card>
        <CardHeader>
          <CardTitle>All Workflows</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : workflows && workflows.length > 0 ? (
            <WorkflowList workflows={workflows} />
          ) : (
            <div className="text-center py-8 text-slate-500">
              No workflows yet. Create one in a project.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Executions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentExecutions && recentExecutions.length > 0 ? (
            <div className="space-y-2">
              {recentExecutions.map((execution: any) => (
                <Link
                  key={execution.id}
                  to="/workspace/$id/workflows/executions/$executionId"
                  params={{ id: workspaceId, executionId: execution.id }}
                  className="block p-4 rounded-lg border border-slate-200 hover:border-[#5B8DEF] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {execution.workflow?.name || 'Untitled Workflow'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {execution.project?.name} •{' '}
                        {new Date(execution.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          execution.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : execution.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : execution.status === 'running'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {execution.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              No executions yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute('/workspace/$id/workflows/')({
  component: WorkspaceWorkflowsPage,
});
