import { createFileRoute, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';

/**
 * Workflow Execution Viewer
 *
 * Displays detailed execution status, logs, and results for a specific workflow execution.
 */
function WorkflowExecutionPage() {
  const { id: workspaceId, executionId } = useParams({
    from: '/workspace/$id/workflows/executions/$executionId/',
  });

  const { data: execution, isLoading } = useQuery({
    queryKey: ['workflow-execution', executionId],
    queryFn: async () => {
      const { data } = await supabase
        .from('workflow_executions')
        .select(`
          *,
          workflow:workflow_templates(id, name, description),
          project:projects(id, name)
        `)
        .eq('id', executionId)
        .single();
      return data;
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-slate-600" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/workspace/$id/workflows" params={{ id: workspaceId }}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {execution?.workflow?.name || 'Workflow Execution'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {execution?.project?.name} •{' '}
            {execution?.created_at &&
              new Date(execution.created_at).toLocaleString()}
          </p>
        </div>
        {execution && (
          <div className="flex items-center gap-2">
            {getStatusIcon(execution.status)}
            <span className="text-sm font-medium capitalize">
              {execution.status}
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center text-slate-500">
            Loading execution details...
          </CardContent>
        </Card>
      ) : execution ? (
        <>
          {/* Execution Info */}
          <Card>
            <CardHeader>
              <CardTitle>Execution Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-slate-500">
                    Execution ID
                  </dt>
                  <dd className="text-sm text-slate-900 dark:text-white font-mono">
                    {execution.id}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500">
                    Started At
                  </dt>
                  <dd className="text-sm text-slate-900 dark:text-white">
                    {new Date(execution.created_at).toLocaleString()}
                  </dd>
                </div>
                {execution.completed_at && (
                  <div>
                    <dt className="text-sm font-medium text-slate-500">
                      Completed At
                    </dt>
                    <dd className="text-sm text-slate-900 dark:text-white">
                      {new Date(execution.completed_at).toLocaleString()}
                    </dd>
                  </div>
                )}
                {execution.execution_time_ms && (
                  <div>
                    <dt className="text-sm font-medium text-slate-500">
                      Duration
                    </dt>
                    <dd className="text-sm text-slate-900 dark:text-white">
                      {(execution.execution_time_ms / 1000).toFixed(2)}s
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Execution Monitor */}
          {execution.status === 'running' && (
            <Card>
              <CardHeader>
                <CardTitle>Real-time Execution</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">
                  Workflow is currently executing...
                </p>
              </CardContent>
            </Card>
          )}

          {/* Input Variables */}
          {execution.config_json?.input_variables && (
            <Card>
              <CardHeader>
                <CardTitle>Input Variables</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-slate-50 dark:bg-slate-900 p-4 rounded-lg overflow-x-auto">
                  {JSON.stringify(
                    execution.config_json.input_variables,
                    null,
                    2,
                  )}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Execution Context (Results) */}
          {execution.execution_context && (
            <Card>
              <CardHeader>
                <CardTitle>Execution Results</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-slate-50 dark:bg-slate-900 p-4 rounded-lg overflow-x-auto max-h-96">
                  {JSON.stringify(execution.execution_context, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="p-12 text-center text-slate-500">
            Execution not found
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export const Route = createFileRoute(
  '/workspace/$id/workflows/executions/$executionId/',
)({
  component: WorkflowExecutionPage,
});
