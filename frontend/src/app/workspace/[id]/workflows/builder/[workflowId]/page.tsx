"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Play, Settings, CheckCircle, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import WorkflowCanvas from "@/components/workflow/WorkflowCanvas";
import NodePalette from "@/components/workflow/NodePalette";
import NodeConfigPanel from "@/components/workflow/NodeConfigPanel";
import ExecutionControls from "@/components/workflow/ExecutionControls";
import ExecutionMonitor from "@/components/workflow/ExecutionMonitor";
import { useWorkflowExecution } from "@/hooks/useWorkflowExecution";
import { useWorkflowStore } from "@/lib/stores/workflowStore";
import api from "@/lib/api";
import { WorkflowTemplateCreate, WorkflowTemplateUpdate } from "@/lib/workflow-schema";

export default function WorkflowBuilderPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const workspaceId = params.id as string;
    const workflowId = params.workflowId as string;
    const isNew = workflowId === "new";

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [validating, setValidating] = useState(false);
    const [projectName, setProjectName] = useState<string | null>(null);

    const {
        nodes,
        edges,
        workflowName,
        workflowDescription,
        isDirty,
        selectedNode,
        setNodes,
        setEdges,
        setWorkflowId,
        setWorkflowName,
        setWorkflowDescription,
        loadWorkflow,
        clearWorkflow,
        markSaved,
        onNodesChange,
        onEdgesChange,
        onConnect,
        updateNodeData,
        removeNode
    } = useWorkflowStore();

    const { executionState, startExecution, pauseExecution, resumeExecution, stopExecution } = useWorkflowExecution(workflowId as string);

    const handleRun = async () => {
        if (workflowId === "new") {
            toast({
                title: "Save Required",
                description: "Please save the workflow before running.",
                variant: "destructive",
            });
            return;
        }

        // Get first project for the workspace
        try {
            const response = await api.get(`/workspaces/${workspaceId}/projects`);
            if (response.data && response.data.length > 0) {
                await startExecution(response.data[0].id);
            } else {
                toast({
                    title: "No Project Found",
                    description: "Please create a project first to run workflows.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error fetching projects:", error);
        }
    };

    // Load workflow data
    useEffect(() => {
        if (isNew) {
            clearWorkflow();
            setWorkflowId("new");
            return;
        }

        const fetchWorkflow = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/workflows/${workflowId}`);
                const template = response.data;

                setWorkflowId(template.id);
                setWorkflowName(template.name);
                setWorkflowDescription(template.description || "");

                if (template.project) {
                    setProjectName(template.project.name);
                } else if (template.project_id) {
                    try {
                        const projRes = await api.get(`/workspaces/${workspaceId}/projects/${template.project_id}`);
                        setProjectName(projRes.data.name);
                    } catch (e) {
                        console.error("Error fetching project details", e);
                    }
                }

                loadWorkflow({
                    nodes: template.nodes || [],
                    edges: template.edges || [],
                });
            } catch (error) {
                console.error("Error loading workflow:", error);
                toast({
                    title: "Error",
                    description: "Failed to load workflow template",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchWorkflow();
    }, [workflowId, isNew, clearWorkflow, setWorkflowId, setWorkflowName, setWorkflowDescription, loadWorkflow, toast, workspaceId]);

    const handleSave = async () => {
        if (!workflowName.trim()) {
            toast({
                title: "Validation Error",
                description: "Workflow name is required",
                variant: "destructive",
            });
            return;
        }

        try {
            setSaving(true);

            // Convert ReactFlow nodes/edges to Workflow format
            const workflowData = {
                name: workflowName,
                description: workflowDescription,
                nodes: nodes.map(n => ({
                    id: n.id,
                    type: n.type as any, // Cast to any to avoid NodeType mismatch
                    position: n.position,
                    data: n.data
                })),
                edges: edges.map(e => ({
                    id: e.id,
                    source: e.source,
                    target: e.target,
                    sourceHandle: e.sourceHandle || undefined,
                    targetHandle: e.targetHandle || undefined,
                    label: typeof e.label === 'string' ? e.label : undefined,
                    type: e.type
                })),
            };

            if (isNew) {
                const createData: WorkflowTemplateCreate = {
                    ...workflowData,
                    workspace_id: workspaceId,
                    category: "creative", // Default category
                    default_params: {},
                    is_system: false,
                    is_recommended: false,
                    version: "1.0"
                };

                const response = await api.post("/workflows/", createData);
                const newWorkflow = response.data;

                setWorkflowId(newWorkflow.id);
                markSaved();
                toast({
                    title: "Success",
                    description: "Workflow created successfully",
                });

                // Redirect to edit URL instead of 'new'
                router.replace(`/workspace/${workspaceId}/workflows/builder/${newWorkflow.id}`);
            } else {
                const updateData: WorkflowTemplateUpdate = {
                    ...workflowData,
                };

                await api.put(`/workflows/${workflowId}`, updateData);
                markSaved();
                toast({
                    title: "Success",
                    description: "Workflow saved successfully",
                });
            }
        } catch (error: any) {
            console.error("Error saving workflow:", error);
            toast({
                title: "Error",
                description: error.response?.data?.detail || "Failed to save workflow",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleValidate = async () => {
        try {
            setValidating(true);
            const workflowData = {
                nodes: nodes.map(n => ({
                    id: n.id,
                    type: n.type,
                    position: n.position,
                    data: n.data
                })),
                edges: edges.map(e => ({
                    id: e.id,
                    source: e.source,
                    target: e.target,
                    sourceHandle: e.sourceHandle,
                    targetHandle: e.targetHandle,
                    label: e.label,
                    type: e.type
                })),
            };

            const response = await api.post("/workflows/validate", workflowData);
            const result = response.data;

            if (result.valid) {
                toast({
                    title: "Valid Workflow",
                    description: "Workflow structure is valid",
                    className: "bg-green-50 border-green-200 text-green-900",
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
            setValidating(false);
        }
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 z-10">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <ExecutionControls
                            status={executionState.status}
                            onStart={handleRun}
                            onPause={() => {
                                if (executionState.executionId) {
                                    if (executionState.status === 'paused') {
                                        resumeExecution(executionState.executionId);
                                    } else {
                                        pauseExecution(executionState.executionId);
                                    }
                                }
                            }}
                            onStop={() => {
                                if (executionState.executionId) {
                                    stopExecution(executionState.executionId);
                                }
                            }}
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/workspace/${workspaceId}/workflows`)}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </div>

                    <div className="flex flex-col">
                        <Input
                            value={workflowName}
                            onChange={(e) => setWorkflowName(e.target.value)}
                            className="h-8 text-lg font-semibold border-none bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 px-2 -ml-2 w-64 focus-visible:ring-0"
                            placeholder="Untitled Workflow"
                        />
                        <div className="flex items-center gap-2 px-2">
                            {projectName && (
                                <span className="text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                                    {projectName}
                                </span>
                            )}
                            <span className="text-xs text-gray-500">
                                {isDirty ? "Unsaved changes" : "All changes saved"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleValidate}
                        disabled={validating}
                        className="gap-2"
                    >
                        {validating ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                        ) : (
                            <CheckCircle className="w-4 h-4" />
                        )}
                        Validate
                    </Button>

                    {selectedNode && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeNode(selectedNode.id)}
                            className="gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Node
                        </Button>
                    )}

                    <Button
                        variant="default"
                        size="sm"
                        onClick={handleSave}
                        disabled={saving || !isDirty}
                        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {saving ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden relative">
                <NodePalette />
                {/* Canvas Area */}
                <div className="flex-1 relative">
                    <WorkflowCanvas
                        className="h-full w-full"
                        executionState={executionState}
                    />

                    {/* Execution Monitor Overlay */}
                    <ExecutionMonitor
                        status={executionState.status}
                        progress={executionState.progress}
                        logs={executionState.logs}
                        currentNodeId={executionState.currentNodeId}
                        executionId={executionState.executionId}
                    />
                </div>
                <NodeConfigPanel />
            </div>
        </div>
    );
}

