import { createFileRoute, useParams } from '@tanstack/react-router';
import { useWorkflowStore } from '@/lib/stores/workflowStore';
import { WorkflowCanvas } from '@/components/workflow';
import { NodePalette } from '@/components/workflow';
import { NodeConfigPanel } from '@/components/workflow';
import { WorkflowHeader } from '@/components/workflow';

function WorkflowsPage() {
  const { id: workspaceId, projectId } = useParams({
    from: '/workspace/$id/project/$projectId/workflows/',
  });

  const {
    selectedNode,
    isDirty,
    workflowName,
    setWorkflowName,
  } = useWorkflowStore();

  return (
    <div className="flex flex-col h-full">
      <WorkflowHeader
        workspaceId={workspaceId}
        projectId={projectId}
        workflowName={workflowName}
        hasUnsavedChanges={isDirty}
        onNameChange={setWorkflowName}
      />
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
  '/workspace/$id/project/$projectId/workflows/',
)({
  component: WorkflowsPage,
});
