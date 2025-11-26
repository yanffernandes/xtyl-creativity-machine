"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Plus } from "lucide-react";
import api from "@/lib/api";
import StartNode from "@/components/workflow/nodes/StartNode";
import FinishNode from "@/components/workflow/nodes/FinishNode";
import TextGenerationNode from "@/components/workflow/nodes/TextGenerationNode";
import ImageGenerationNode from "@/components/workflow/nodes/ImageGenerationNode";
import ConditionalNode from "@/components/workflow/nodes/ConditionalNode";
import LoopNode from "@/components/workflow/nodes/LoopNode";
import ContextRetrievalNode from "@/components/workflow/nodes/ContextRetrievalNode";
import ProcessingNode from "@/components/workflow/nodes/ProcessingNode";

// Register custom node types (schema-compliant)
const nodeTypes: NodeTypes = {
  start: StartNode,
  finish: FinishNode,
  text_generation: TextGenerationNode,
  image_generation: ImageGenerationNode,
  conditional: ConditionalNode,
  loop: LoopNode,
  context_retrieval: ContextRetrievalNode,
  processing: ProcessingNode,
};

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes_json: Node[];
  edges_json: Edge[];
  default_params_json: Record<string, any>;
  is_system: boolean;
  is_recommended?: boolean;
  usage_count?: number;
  version?: string;
  created_by?: string;
}

export default function WorkflowBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const templateId = params.templateId as string;

  const [template, setTemplate] = useState<WorkflowTemplate | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load template
  useEffect(() => {
    if (templateId === "new") {
      // Create new template
      setTemplate({
        id: "new",
        name: "New Workflow",
        description: "Describe your workflow",
        category: "custom",
        nodes_json: [],
        edges_json: [],
        default_params_json: {},
        is_system: false,
      });
      setLoading(false);
    } else {
      // Load existing template
      loadTemplate();
    }
  }, [templateId]);

  const loadTemplate = async () => {
    try {
      const response = await api.get(`/workflows/templates/${templateId}`);
      const data = response.data;
      setTemplate(data);

      const loadedNodes = data.nodes_json || [];
      const loadedEdges = data.edges_json || [];

      // Get all valid node IDs
      const validNodeIds = new Set(loadedNodes.map((n: any) => n.id));

      // Filter out edges that reference non-existent nodes
      const validEdges = loadedEdges.filter((edge: any) => {
        const sourceExists = validNodeIds.has(edge.source);
        const targetExists = validNodeIds.has(edge.target);

        if (!sourceExists || !targetExists) {
          console.warn(
            `Removing invalid edge on load: ${edge.id} (source: ${edge.source}, target: ${edge.target})`
          );
          return false;
        }
        return true;
      });

      setNodes(loadedNodes);
      setEdges(validEdges);
      setLoading(false);
    } catch (error) {
      console.error("Error loading template:", error);
      setLoading(false);
    }
  };

  const onConnect = (connection: Connection) => {
    setEdges((eds) => addEdge(connection, eds));
  };

  const onNodeClick = (_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  };

  const handleSave = async () => {
    if (!template) return;

    try {
      setSaving(true);

      // Get all valid node IDs
      const validNodeIds = new Set(nodes.map((n) => n.id));

      // Filter out edges that reference non-existent nodes
      const validEdges = edges.filter((edge) => {
        const sourceExists = validNodeIds.has(edge.source);
        const targetExists = validNodeIds.has(edge.target);

        if (!sourceExists || !targetExists) {
          console.warn(`Removing invalid edge: ${edge.id} (source: ${edge.source}, target: ${edge.target})`);
          return false;
        }
        return true;
      });

      const payload = {
        name: template.name,
        description: template.description,
        category: template.category,
        nodes_json: nodes,
        edges_json: validEdges,
        default_params_json: template.default_params_json,
        workspace_id: workspaceId,
      };

      if (templateId === "new") {
        // Create new template
        await api.post("/workflows/templates", payload);
        alert("Template created successfully!");
        router.push(`/workspace/${workspaceId}/workflows`);
      } else if (template.is_system) {
        // Clone system template instead of updating
        const cloneResponse = await api.post(
          `/workflows/templates/${templateId}/clone`,
          {}, // Empty body
          {
            params: {
              workspace_id: workspaceId,
              name: `${template.name} (Copy)`,
            },
          }
        );

        const clonedTemplateId = cloneResponse.data.id;

        // Update the cloned template with changes
        await api.put(`/workflows/templates/${clonedTemplateId}`, payload);

        alert("System template cloned and saved successfully!");
        router.push(`/workspace/${workspaceId}/workflows`);
      } else {
        // Update existing custom template
        await api.put(`/workflows/templates/${templateId}`, payload);
        alert("Template updated successfully!");
        router.push(`/workspace/${workspaceId}/workflows`);
      }
    } catch (error: any) {
      console.error("Error saving template:", error);
      const errorMessage = error.response?.data?.detail || error.message || "Unknown error";
      alert("Failed to save template: " + errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const addNode = (type: string) => {
    const newNode: Node = {
      id: `${type}_${Date.now()}`,
      type: type,
      position: { x: 250, y: 250 },
      data: {
        label: type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  const updateNodeData = (nodeId: string, key: string, value: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              [key]: value,
            },
          };
        }
        return node;
      })
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5B8DEF] mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading workflow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-[#0A0E14] dark:via-[#0A0E14] dark:to-[#0A0E14] relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#5B8DEF]/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#7AA5F5]/20 rounded-full blur-3xl animate-pulse animation-delay-2000" />
      </div>

      {/* Header */}
      <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border-b border-gray-200/50 dark:border-gray-800/50 px-8 py-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/workspace/${workspaceId}/workflows`)}
              className="hover:bg-[#5B8DEF]/10 hover:text-[#5B8DEF] transition-all"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="h-8 w-px bg-gray-300 dark:bg-gray-700" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {template?.name || "Workflow Builder"}
                </h1>
                {template?.is_system && (
                  <span className="px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-medium">
                    System Template
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {template?.is_system
                  ? "Editing will create a copy in your workspace"
                  : template?.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/workspace/${workspaceId}/workflows`)}
              className="border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-[#5B8DEF] to-[#4A7AD9] text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex relative">
        {/* Node Palette */}
        <div className="relative w-72 bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border-r border-gray-200/50 dark:border-gray-800/50 p-6 overflow-y-auto shadow-xl">
          <div className="mb-6">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
              Node Library
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Drag or click to add nodes to your workflow
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-3">
                Workflow Control
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800 hover:shadow-md hover:scale-105 transition-all"
                onClick={() => addNode("start")}
              >
                <Plus className="w-4 h-4 mr-2 text-green-600" />
                <span className="font-medium">Start</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 border-purple-200 dark:border-purple-800 hover:shadow-md hover:scale-105 transition-all"
                onClick={() => addNode("finish")}
              >
                <Plus className="w-4 h-4 mr-2 text-purple-600" />
                <span className="font-medium">Finish</span>
              </Button>
            </div>

            <div className="space-y-2 pt-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-3">
                AI Generation
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800 hover:shadow-md hover:scale-105 transition-all"
                onClick={() => addNode("text_generation")}
              >
                <Plus className="w-4 h-4 mr-2 text-[#5B8DEF]" />
                <span className="font-medium">Generate Text</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800 hover:shadow-md hover:scale-105 transition-all"
                onClick={() => addNode("image_generation")}
              >
                <Plus className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400" />
                <span className="font-medium">Generate Image</span>
              </Button>
            </div>

            <div className="space-y-2 pt-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-3">
                Logic & Flow
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950 dark:to-amber-950 border-yellow-200 dark:border-yellow-800 hover:shadow-md hover:scale-105 transition-all"
                onClick={() => addNode("conditional")}
              >
                <Plus className="w-4 h-4 mr-2 text-yellow-600" />
                <span className="font-medium">Conditional</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border-orange-200 dark:border-orange-800 hover:shadow-md hover:scale-105 transition-all"
                onClick={() => addNode("loop")}
              >
                <Plus className="w-4 h-4 mr-2 text-orange-600" />
                <span className="font-medium">Loop</span>
              </Button>
            </div>

            <div className="space-y-2 pt-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-3">
                Data & Processing
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-950 dark:to-teal-950 border-cyan-200 dark:border-cyan-800 hover:shadow-md hover:scale-105 transition-all"
                onClick={() => addNode("context_retrieval")}
              >
                <Plus className="w-4 h-4 mr-2 text-cyan-600" />
                <span className="font-medium">Context Retrieval</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950 dark:to-blue-950 border-indigo-200 dark:border-indigo-800 hover:shadow-md hover:scale-105 transition-all"
                onClick={() => addNode("processing")}
              >
                <Plus className="w-4 h-4 mr-2 text-[#5B8DEF]" />
                <span className="font-medium">Processing</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            defaultEdgeOptions={{
              type: "smoothstep",
              animated: true,
              style: {
                stroke: "#5B8DEF",
                strokeWidth: 2,
              },
            }}
            className="workflow-canvas"
          >
            <Background
              gap={16}
              size={1}
              color="#5B8DEF"
              className="opacity-20"
            />
            <Controls
              className="!bg-white/80 !dark:bg-gray-900/80 !backdrop-blur-xl !border !border-gray-200 !dark:border-gray-800 !rounded-xl !shadow-xl"
            />
            <MiniMap
              className="!bg-white/80 !dark:bg-gray-900/80 !backdrop-blur-xl !border !border-gray-200 !dark:border-gray-800 !rounded-xl !shadow-xl"
              nodeColor={(node) => {
                if (node.type === "generate_copy") return "#5B8DEF";
                if (node.type === "generate_image") return "#A855F7";
                return "#6B7280";
              }}
            />
          </ReactFlow>
        </div>

        {/* Node Configuration Panel */}
        {selectedNode && (
          <div className="relative w-96 bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border-l border-gray-200/50 dark:border-gray-800/50 p-6 overflow-y-auto shadow-xl">
            <div className="mb-6">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 tracking-tight">
                Node Configuration
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Configure the selected node properties
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                  Label
                </label>
                <Input
                  value={selectedNode.data.label || ""}
                  onChange={(e) =>
                    updateNodeData(selectedNode.id, "label", e.target.value)
                  }
                  placeholder="Node label"
                  className="bg-white/80 dark:bg-gray-800/80"
                />
              </div>

              {selectedNode.type === "generate_copy" && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                      Prompt Template
                    </label>
                    <Textarea
                      value={selectedNode.data.prompt || ""}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, "prompt", e.target.value)
                      }
                      placeholder="Enter prompt template with {variables}"
                      rows={4}
                      className="bg-white/80 dark:bg-gray-800/80"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                      Model
                    </label>
                    <Input
                      value={selectedNode.data.model || "openai/gpt-4"}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, "model", e.target.value)
                      }
                      placeholder="Model ID"
                      className="bg-white/80 dark:bg-gray-800/80"
                    />
                  </div>
                </>
              )}

              {selectedNode.type === "generate_image" && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                      Prompt Template
                    </label>
                    <Textarea
                      value={selectedNode.data.prompt || ""}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, "prompt", e.target.value)
                      }
                      placeholder="Enter image generation prompt"
                      rows={4}
                      className="bg-white/80 dark:bg-gray-800/80"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                      Model
                    </label>
                    <Input
                      value={
                        selectedNode.data.model ||
                        "google/gemini-2.5-flash-image-preview"
                      }
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, "model", e.target.value)
                      }
                      placeholder="Model ID"
                      className="bg-white/80 dark:bg-gray-800/80"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                      Aspect Ratio
                    </label>
                    <Input
                      value={selectedNode.data.aspect_ratio || "1:1"}
                      onChange={(e) =>
                        updateNodeData(
                          selectedNode.id,
                          "aspect_ratio",
                          e.target.value
                        )
                      }
                      placeholder="1:1, 16:9, etc"
                      className="bg-white/80 dark:bg-gray-800/80"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
