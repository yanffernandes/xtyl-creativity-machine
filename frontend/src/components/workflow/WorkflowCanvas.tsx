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

import StartNode from "./nodes/StartNode";
import FinishNode from "./nodes/FinishNode";
import TextGenerationNode from "./nodes/TextGenerationNode";
import ImageGenerationNode from "./nodes/ImageGenerationNode";
import ConditionalNode from "./nodes/ConditionalNode";
import LoopNode from "./nodes/LoopNode";
import ContextRetrievalNode from "./nodes/ContextRetrievalNode";
import ProcessingNode from "./nodes/ProcessingNode";
import AttachNode from "./nodes/AttachNode";

const nodeTypes: NodeTypes = {
    start: StartNode,
    finish: FinishNode,
    text_generation: TextGenerationNode,
    image_generation: ImageGenerationNode,
    conditional: ConditionalNode,
    loop: LoopNode,
    context_retrieval: ContextRetrievalNode,
    processing: ProcessingNode,
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

            // Prevent connecting Loop output back to Start (example rule)
            // We can add more complex rules here based on node types
            // const sourceNode = nodes.find((n) => n.id === connection.source);
            // const targetNode = nodes.find((n) => n.id === connection.target);

            return true;
        },
        [nodes]
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
                className="bg-gray-50 dark:bg-gray-950"
            >
                <Background color={theme === "dark" ? "#333" : "#ddd"} gap={15} />
                <Controls className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 fill-gray-600 dark:fill-gray-400" />
                <MiniMap
                    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    nodeColor={theme === "dark" ? "#4b5563" : "#e5e7eb"}
                    maskColor={theme === "dark" ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.6)"}
                />
                <Panel position="top-right" className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md p-2 rounded-lg border border-gray-200 dark:border-gray-800 text-xs text-gray-500">
                    {nodes.length} nodes • {edges.length} edges
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
