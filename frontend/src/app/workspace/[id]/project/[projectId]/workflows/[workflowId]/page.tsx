"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { useWorkflowStore } from "@/lib/stores/workflowStore";
import { useWorkflowExecution } from "@/hooks/useWorkflowExecution";
import { WorkflowHeader } from "@/components/workflow/WorkflowHeader";
import WorkflowCanvas from "@/components/workflow/WorkflowCanvas";
import { NodePalette } from "@/components/workflow/NodePalette";
import { NodeConfigPanel } from "@/components/workflow/NodeConfigPanel";
import ExecutionMonitor from "@/components/workflow/ExecutionMonitor";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { cn } from "@/lib/utils";
import { floatingGlassSidebarClasses } from "@/lib/glass-utils";
import { WorkflowNode, WorkflowEdge, NodeType } from "@/lib/workflow-schema";

interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  workspace_id: string;
  project_id?: string;
  nodes?: any[];
  edges?: any[];
  nodes_json?: any[];
  edges_json?: any[];
  is_system: boolean;
}

export default function WorkflowEditorPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const projectId = params.projectId as string;
  const workflowId = params.workflowId as string;

  const [workflow, setWorkflow] = useState<WorkflowTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { session, isLoading: authLoading } = useAuthStore();
  const { toast } = useToast();

  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    selectedNode,
    setWorkflowName,
    workflowName: storeWorkflowName,
  } = useWorkflowStore();

  const {
    executionState,
    startExecution,
    pauseExecution,
    resumeExecution,
    stopExecution,
  } = useWorkflowExecution(workflowId);

  useEffect(() => {
    if (authLoading) return;

    if (!session) {
      router.push("/login");
      return;
    }
    fetchData();
  }, [session, authLoading, workflowId, router]);

  // Track changes
  useEffect(() => {
    if (workflow && (nodes.length > 0 || edges.length > 0)) {
      const savedNodes = workflow.nodes || workflow.nodes_json || [];
      const savedEdges = workflow.edges || workflow.edges_json || [];
      const nodesChanged = JSON.stringify(nodes) !== JSON.stringify(savedNodes);
      const edgesChanged = JSON.stringify(edges) !== JSON.stringify(savedEdges);
      const nameChanged = storeWorkflowName !== workflow.name;
      setHasUnsavedChanges(nodesChanged || edgesChanged || nameChanged);
    }
  }, [nodes, edges, workflow, storeWorkflowName]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch project info
      const projectRes = await api.get(`/workspaces/${workspaceId}/projects`);
      const projects = projectRes.data;
      const currentProject = projects.find((p: any) => p.id === projectId);
      if (currentProject) {
        setProjectName(currentProject.name);
      }

      // Fetch workspace info
      const workspaceRes = await api.get(`/workspaces/`);
      const workspaces = workspaceRes.data;
      const currentWorkspace = workspaces.find((w: any) => w.id === workspaceId);
      if (currentWorkspace) {
        setWorkspaceName(currentWorkspace.name);
      }

      // Fetch workflow
      const workflowRes = await api.get(`/workflows/${workflowId}`);
      const workflowData = workflowRes.data;
      setWorkflow(workflowData);

      // Initialize workflow store with workflow data
      const nodesData = workflowData.nodes || workflowData.nodes_json || [];
      const edgesData = workflowData.edges || workflowData.edges_json || [];
      setNodes(nodesData);
      setEdges(edgesData);
      setWorkflowName(workflowData.name);
    } catch (error) {
      console.error("Failed to fetch data", error);
      toast({
        title: "Error",
        description: "Failed to load workflow",
        variant: "destructive",
      });
      router.push(`/workspace/${workspaceId}/project/${projectId}/workflows`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameChange = useCallback((name: string) => {
    setWorkflowName(name);
  }, [setWorkflowName]);

  const handleSave = useCallback(async () => {
    if (!workflow) return;

    setIsSaving(true);
    try {
      // Transform ReactFlow nodes to backend WorkflowNode format
      const cleanNodes: WorkflowNode[] = nodes
        .filter((n) => n.type)
        .map((node) => ({
          id: node.id,
          type: node.type as NodeType,
          position: { x: node.position.x, y: node.position.y },
          data: node.data,
        }));

      // Transform ReactFlow edges to backend WorkflowEdge format
      const cleanEdges: WorkflowEdge[] = edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle || undefined,
        targetHandle: edge.targetHandle || undefined,
        label: typeof edge.label === "string" ? edge.label : undefined,
        type: edge.type || "smoothstep",
      }));

      await api.put(`/workflows/${workflowId}`, {
        name: storeWorkflowName,
        nodes: cleanNodes,
        edges: cleanEdges,
      });

      setWorkflow((prev) =>
        prev
          ? {
              ...prev,
              name: storeWorkflowName,
              nodes: nodes,
              edges: edges,
            }
          : null
      );

      setHasUnsavedChanges(false);

      toast({
        title: "Saved",
        description: "Workflow saved successfully",
      });
    } catch (error: any) {
      console.error("Failed to save workflow", error);

      let errorMessage = "Failed to save workflow";
      const detail = error.response?.data?.detail;

      if (detail) {
        if (typeof detail === "string") {
          errorMessage = detail;
        } else if (detail.errors && Array.isArray(detail.errors)) {
          errorMessage = detail.errors.join("; ");
        } else if (typeof detail === "object") {
          errorMessage = JSON.stringify(detail);
        }
      }

      toast({
        title: "Validation Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [workflow, workflowId, nodes, edges, storeWorkflowName, toast]);

  const handleValidate = useCallback(async () => {
    setIsValidating(true);
    try {
      const workflowData = {
        nodes: nodes
          .filter((n) => n.type)
          .map((n) => ({
            id: n.id,
            type: n.type as NodeType,
            position: { x: n.position.x, y: n.position.y },
            data: n.data,
          })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle || undefined,
          targetHandle: e.targetHandle || undefined,
          label: typeof e.label === "string" ? e.label : undefined,
          type: e.type || "smoothstep",
        })),
      };

      const response = await api.post("/workflows/validate", workflowData);
      const result = response.data;

      if (result.valid) {
        toast({
          title: "Valid Workflow",
          description: "Workflow structure is valid",
          className: "bg-green-50 border-green-200 text-green-900 dark:bg-green-950 dark:border-green-800 dark:text-green-100",
        });
      } else {
        toast({
          title: "Validation Issues",
          description: (
            <ul className="list-disc pl-4 mt-2 text-sm">
              {result.errors.map((err: string, i: number) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          ),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error validating workflow:", error);
      toast({
        title: "Error",
        description: "Failed to validate workflow",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  }, [nodes, edges, toast]);

  const handleExport = useCallback(() => {
    try {
      const workflowData = {
        name: storeWorkflowName || workflow?.name,
        description: workflow?.description,
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: n.data,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          label: e.label,
          type: e.type,
        })),
        exportedAt: new Date().toISOString(),
        version: "1.0",
      };

      const jsonString = JSON.stringify(workflowData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(storeWorkflowName || "workflow").replace(/[^a-z0-9]/gi, "_")}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Exported",
        description: "Workflow exported successfully",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export workflow",
        variant: "destructive",
      });
    }
  }, [nodes, edges, storeWorkflowName, workflow, toast]);

  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.nodes || !data.edges) {
          throw new Error("Invalid workflow format");
        }

        // Set workflow data
        if (data.name) setWorkflowName(data.name);
        setNodes(data.nodes);
        setEdges(data.edges);

        toast({
          title: "Imported",
          description: `Workflow "${data.name || "Untitled"}" imported successfully`,
        });
      } catch (error) {
        console.error("Import error:", error);
        toast({
          title: "Import Failed",
          description: "Invalid workflow file format",
          variant: "destructive",
        });
      }
    };
    input.click();
  }, [setWorkflowName, setNodes, setEdges, toast]);

  const handleRun = useCallback(async () => {
    if (hasUnsavedChanges) {
      toast({
        title: "Save before running",
        description: "Save changes before running the workflow",
        variant: "destructive",
      });
      return;
    }

    try {
      await startExecution(projectId);
      toast({
        title: "Execution started",
        description: "Workflow is now running",
      });
    } catch (error: any) {
      console.error("Failed to run workflow", error);
      toast({
        title: "Error",
        description: error.message || "Failed to run workflow",
        variant: "destructive",
      });
    }
  }, [hasUnsavedChanges, projectId, startExecution, toast]);

  const handlePause = useCallback(() => {
    if (executionState.executionId) {
      if (executionState.status === "paused") {
        resumeExecution(executionState.executionId);
      } else {
        pauseExecution(executionState.executionId);
      }
    }
  }, [executionState, pauseExecution, resumeExecution]);

  const handleStop = useCallback(() => {
    if (executionState.executionId) {
      stopExecution(executionState.executionId);
    }
  }, [executionState.executionId, stopExecution]);

  const handleDelete = useCallback(async () => {
    if (!confirm("Are you sure you want to delete this workflow?")) return;

    try {
      await api.delete(`/workflows/${workflowId}`);
      toast({
        title: "Deleted",
        description: "Workflow deleted successfully",
      });
      router.push(`/workspace/${workspaceId}/project/${projectId}/workflows`);
    } catch (error: any) {
      console.error("Failed to delete workflow", error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to delete workflow",
        variant: "destructive",
      });
    }
  }, [workflowId, workspaceId, projectId, router, toast]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSkeleton type="card" count={1} />
      </div>
    );
  }

  if (!workflow) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0a0e17]">
      {/* Unified background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0d1424] to-slate-950 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <WorkflowHeader
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        projectId={projectId}
        projectName={projectName}
        workflowId={workflowId}
        workflowName={storeWorkflowName || workflow.name}
        hasUnsavedChanges={hasUnsavedChanges}
        onNameChange={handleNameChange}
        onSave={handleSave}
        onValidate={handleValidate}
        onExport={handleExport}
        onImport={handleImport}
        onDelete={handleDelete}
        executionStatus={executionState.status}
        onRun={handleRun}
        onPause={handlePause}
        onStop={handleStop}
        isSaving={isSaving}
        isValidating={isValidating}
        className="relative z-20"
      />

      {/* Main editor area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Node Palette - Left floating sidebar */}
        <div className="absolute left-3 top-3 bottom-3 z-10">
          <div className={cn(floatingGlassSidebarClasses, "h-full w-64 overflow-hidden")}>
            <NodePalette />
          </div>
        </div>

        {/* Canvas - Full width with margin for left sidebar, dynamic right margin */}
        <div className={cn(
          "flex-1 ml-[280px] transition-all duration-300",
          selectedNode ? "mr-[340px]" : "mr-4"
        )}>
          <WorkflowCanvas
            executionState={{
              status: executionState.status,
              currentNodeId: executionState.currentNodeId,
            }}
          />
        </div>

        {/* Node Config Panel - Right floating sidebar (only when node selected) */}
        <div className={cn(
          "absolute right-3 top-3 bottom-3 z-10 transition-all duration-300",
          selectedNode
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-8 pointer-events-none"
        )}>
          <div className={cn(floatingGlassSidebarClasses, "h-full w-80 overflow-hidden")}>
            <NodeConfigPanel selectedNode={selectedNode} />
          </div>
        </div>

        {/* Execution Monitor Overlay */}
        <ExecutionMonitor
          status={executionState.status}
          progress={executionState.progress}
          logs={executionState.logs}
          outputs={executionState.outputs}
          currentNodeId={executionState.currentNodeId}
          executionId={executionState.executionId}
        />
      </div>
    </div>
  );
}
