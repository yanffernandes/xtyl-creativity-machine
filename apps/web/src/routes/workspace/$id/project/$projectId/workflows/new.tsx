import { createFileRoute, useParams, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { WorkflowCanvas } from '@/components/workflow';
import { NodePalette } from '@/components/workflow';
import { NodeConfigPanel } from '@/components/workflow';
import { useWorkflowStore } from '@/lib/stores/workflowStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';
import { Link } from '@tanstack/react-router';

/**
 * New Workflow Page
 *
 * Create a new workflow from scratch with ReactFlow canvas.
 */
function NewWorkflowPage() {
  const { id: workspaceId, projectId } = useParams({
    from: '/workspace/$id/project/$projectId/workflows/new',
  });
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  const {
    nodes,
    edges,
    selectedNode,
    workflowName,
    setWorkflowName,
    workflowDescription,
    setWorkflowDescription,
  } = useWorkflowStore();

  const handleSave = async () => {
    if (!workflowName.trim()) {
      toast.error('Please enter a workflow name');
      return;
    }

    if (nodes.length === 0) {
      toast.error('Please add at least one node to the workflow');
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('workflow_templates')
        .insert({
          workspace_id: workspaceId,
          project_id: projectId,
          name: workflowName,
          description: workflowDescription || null,
          nodes_json: nodes,
          edges_json: edges,
          is_template: false,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Workflow created successfully');
      navigate({
        to: '/workspace/$id/project/$projectId/workflows/$workflowId',
        params: {
          id: workspaceId,
          projectId,
          workflowId: data.id,
        },
      });
    } catch (error) {
      console.error('Failed to save workflow:', error);
      toast.error('Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };

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
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Workflow'}
          </Button>
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
  '/workspace/$id/project/$projectId/workflows/new',
)({
  component: NewWorkflowPage,
});
