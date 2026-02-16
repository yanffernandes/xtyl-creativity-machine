import { createFileRoute, useParams, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { WorkflowCanvas } from '@/components/workflow';
import { NodePalette } from '@/components/workflow';
import { NodeConfigPanel } from '@/components/workflow';
import { useWorkflowStore } from '@/lib/stores/workflowStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Save, Play, Trash2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import api from '@/lib/api';

/**
 * Edit Workflow Page
 *
 * Edit an existing workflow with ReactFlow canvas.
 * Supports executing the workflow and viewing results.
 */
function EditWorkflowPage() {
  const { id: workspaceId, projectId, workflowId } = useParams({
    from: '/workspace/$id/project/$projectId/workflows/$workflowId/',
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const {
    nodes,
    edges,
    selectedNode,
    workflowName,
    setWorkflowName,
    workflowDescription,
    setWorkflowDescription,
    loadWorkflow,
    isDirty,
    markSaved,
  } = useWorkflowStore();

  // Load workflow data
  const { data: workflow, isLoading } = useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: async () => {
      const { data } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('id', workflowId)
        .single();
      return data;
    },
  });

  // Load workflow into store
  useEffect(() => {
    if (workflow) {
      setWorkflowName(workflow.name);
      setWorkflowDescription(workflow.description || '');
      loadWorkflow({
        nodes: workflow.nodes_json || [],
        edges: workflow.edges_json || [],
      });
      markSaved();
    }
  }, [workflow, setWorkflowName, setWorkflowDescription, loadWorkflow, markSaved]);

  const handleSave = async () => {
    if (!workflowName.trim()) {
      toast.error('Please enter a workflow name');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('workflow_templates')
        .update({
          name: workflowName,
          description: workflowDescription || null,
          nodes_json: nodes,
          edges_json: edges,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workflowId);

      if (error) throw error;

      markSaved();
      queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] });
      toast.success('Workflow saved successfully');
    } catch (error) {
      console.error('Failed to save workflow:', error);
      toast.error('Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecute = async () => {
    if (isDirty) {
      toast.error('Please save the workflow before executing');
      return;
    }

    setIsExecuting(true);
    try {
      const response = await api.post(`/api/workflows/${workflowId}/execute`, {
        input_variables: {},
      });

      const executionId = response.data.execution_id;
      toast.success('Workflow execution started');
      navigate({
        to: '/workspace/$id/workflows/executions/$executionId',
        params: { id: workspaceId, executionId },
      });
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      toast.error('Failed to execute workflow');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this workflow?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('workflow_templates')
        .delete()
        .eq('id', workflowId);

      if (error) throw error;

      toast.success('Workflow deleted');
      navigate({
        to: '/workspace/$id/project/$projectId/workflows',
        params: { id: workspaceId, projectId },
      });
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      toast.error('Failed to delete workflow');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-slate-500">Loading workflow...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b border-slate-200/50 bg-white/50 backdrop-blur-sm dark:border-slate-800/50 dark:bg-slate-900/50 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/workspace/$id/project/$projectId/workflows"
              params={{ id: workspaceId, projectId }}
            >
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex flex-col gap-1">
              <Input
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="Workflow name"
                className="text-lg font-semibold h-auto border-0 px-0 focus-visible:ring-0"
              />
              <Textarea
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                placeholder="Add a description..."
                className="text-sm h-auto border-0 px-0 py-0 resize-none focus-visible:ring-0"
                rows={1}
              />
            </div>
            {isDirty && (
              <span className="text-xs text-orange-600">Unsaved changes</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={handleExecute}
              disabled={isExecuting || isDirty}
            >
              <Play className="h-4 w-4 mr-2" />
              {isExecuting ? 'Executing...' : 'Execute'}
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !isDirty}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      {/* Workflow Editor */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-60 border-r border-white/[0.08] bg-white/[0.02]">
          <NodePalette />
        </div>
        <div className="flex-1 relative">
          <WorkflowCanvas />
        </div>
        {selectedNode && (
          <div className="w-80 border-l border-white/[0.08] bg-white/[0.02]">
            <NodeConfigPanel />
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute(
  '/workspace/$id/project/$projectId/workflows/$workflowId/',
)({
  component: EditWorkflowPage,
});
