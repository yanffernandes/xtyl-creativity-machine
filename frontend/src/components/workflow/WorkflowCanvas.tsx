"use client";

import { useCallback, useRef, useState } from "react";
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    ReactFlowProvider,
    Panel,
    Node,
    Edge,
    Connection,
    NodeTypes,
} from "reactflow";
import "reactflow/dist/style.css";
import { useWorkflowStore } from "@/lib/stores/workflowStore";
import { useTheme } from "next-themes";
import { useValidateConnection } from "@/hooks/useValidateConnection";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

import StartNode from "./nodes/StartNode";
import FinishNode from "./nodes/FinishNode";
import TextGenerationNode from "./nodes/TextGenerationNode";
import ImageGenerationNode from "./nodes/ImageGenerationNode";
import ConditionalNode from "./nodes/ConditionalNode";
import LoopNode from "./nodes/LoopNode";
import ContextRetrievalNode from "./nodes/ContextRetrievalNode";
import AttachNode from "./nodes/AttachNode";

const nodeTypes: NodeTypes = {
    start: StartNode,
    finish: FinishNode,
    text_generation: TextGenerationNode,
    image_generation: ImageGenerationNode,
    conditional: ConditionalNode,
    loop: LoopNode,
    context_retrieval: ContextRetrievalNode,
    attach_creative: AttachNode,
};

import { ExecutionStatus } from "@/hooks/useWorkflowExecution";

interface WorkflowCanvasProps {
    className?: string;
    executionState?: {
        status: ExecutionStatus;
        currentNodeId: string | null;
    };
}

function WorkflowCanvasContent({ className, executionState }: WorkflowCanvasProps) {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { theme } = useTheme();
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    const { toast } = useToast();

    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        addNode,
        selectNode,
        deselectAll,
    } = useWorkflowStore();

    // Connection validation hook
    const { isValidConnection: validateTypeConnection, connectionError } = useValidateConnection();

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            if (!reactFlowWrapper.current || !reactFlowInstance) {
                return;
            }

            const type = event.dataTransfer.getData("application/reactflow");
            const label = event.dataTransfer.getData("application/reactflow/label");

            // check if the dropped element is valid
            if (typeof type === "undefined" || !type) {
                return;
            }

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode: Node = {
                id: `${type}-${Date.now()}`,
                type,
                position,
                data: { label: label || `${type} node` },
            };

            addNode(newNode);
        },
        [reactFlowInstance, addNode]
    );

    const onNodeClick = useCallback(
        (_: React.MouseEvent, node: Node) => {
            selectNode(node);
        },
        [selectNode]
    );

    const onPaneClick = useCallback(() => {
        deselectAll();
    }, [deselectAll]);

    const isValidConnection = useCallback(
        (connection: Connection) => {
            // Prevent self-connections
            if (connection.source === connection.target) return false;

            // Validate type compatibility using the hook
            const isTypeValid = validateTypeConnection(connection);

            if (!isTypeValid && connectionError) {
                // Show error toast for invalid connections
                toast({
                    title: "Conexão inválida",
                    description: connectionError,
                    variant: "destructive",
                });
            }

            return isTypeValid;
        },
        [validateTypeConnection, connectionError, toast]
    );

    // Effect to highlight active node
    const nodesWithHighlight = nodes.map(node => {
        if (executionState?.currentNodeId === node.id) {
            return {
                ...node,
                className: `${node.className || ''} ring-2 ring-blue-500 ring-offset-2 shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-300`,
                style: {
                    ...node.style,
                    borderColor: "#3b82f6",
                }
            };
        }
        return node;
    });

    return (
        <div className={`w-full h-full ${className}`} ref={reactFlowWrapper}>
            <ReactFlow
                nodes={nodesWithHighlight}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onInit={setReactFlowInstance}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                isValidConnection={isValidConnection}
                nodeTypes={nodeTypes}
                fitView
                snapToGrid
                snapGrid={[15, 15]}
                defaultEdgeOptions={{ type: "smoothstep", animated: true }}
                deleteKeyCode={["Backspace", "Delete"]}
                className="!bg-transparent"
            >
                <Background
                    color={theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)"}
                    gap={20}
                    size={1}
                />
                <Controls
                    className={cn(
                        "!bg-white/[0.03] !backdrop-blur-2xl !backdrop-saturate-150",
                        "!border !border-white/[0.1] !rounded-xl",
                        "!shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.03)_inset]",
                        "[&>button]:!bg-transparent [&>button]:!border-0 [&>button]:!border-b [&>button]:!border-white/[0.06]",
                        "[&>button]:!rounded-none [&>button:first-child]:!rounded-t-xl [&>button:last-child]:!rounded-b-xl [&>button:last-child]:!border-b-0",
                        "[&>button]:!fill-white/60 [&>button:hover]:!bg-white/[0.08] [&>button:hover]:!fill-white/90",
                        "[&>button]:!transition-all [&>button]:!duration-200"
                    )}
                />
                <MiniMap
                    className={cn(
                        "!bg-white/[0.03] !backdrop-blur-2xl !backdrop-saturate-150",
                        "!border !border-white/[0.1] !rounded-xl",
                        "!shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.03)_inset]"
                    )}
                    nodeColor="rgba(91,141,239,0.4)"
                    maskColor="rgba(0,0,0,0.6)"
                />
                <Panel
                    position="top-right"
                    className={cn(
                        "!bg-white/[0.03] !backdrop-blur-2xl !backdrop-saturate-150",
                        "!border !border-white/[0.1] !rounded-xl !p-2.5 !px-3",
                        "!shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.03)_inset]",
                        "!text-xs !text-white/60"
                    )}
                >
                    {nodes.length} nós • {edges.length} conexões
                </Panel>
            </ReactFlow>
        </div>
    );
}

export default function WorkflowCanvas(props: WorkflowCanvasProps) {
    return (
        <ReactFlowProvider>
            <WorkflowCanvasContent {...props} />
        </ReactFlowProvider>
    );
}
