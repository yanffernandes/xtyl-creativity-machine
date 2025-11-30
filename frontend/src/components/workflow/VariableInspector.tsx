"use client";

import { useWorkflowStore } from "@/lib/stores/workflowStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Database, Play } from "lucide-react";
import { ExecutionStatus } from "@/hooks/useWorkflowExecution";

interface VariableInspectorProps {
    nodeId: string | null;
    executionState?: {
        status: ExecutionStatus;
        outputs: Record<string, any>;
        logs: string[];
        currentNodeId: string | null;
    };
}

export default function VariableInspector({ nodeId, executionState }: VariableInspectorProps) {
    const { nodes } = useWorkflowStore();
    const selectedNode = nodes.find((n) => n.id === nodeId);

    const nodeOutput = nodeId && executionState?.outputs?.[nodeId];
    const isExecuting = executionState?.status === 'running';
    const isCurrentNode = nodeId === executionState?.currentNodeId;

    // In a real implementation, we would subscribe to execution state
    // For now, we'll just show the static structure and potential variables

    return (
        <div className="h-full flex flex-col">
            {nodeId && (
                <>
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Execution Monitor
                        </h2>
                    </div>

                    <Tabs defaultValue="variables" className="flex-1 flex flex-col">
                        <div className="px-4 pt-2">
                            <TabsList className="w-full">
                                <TabsTrigger value="variables" className="flex-1">Variables</TabsTrigger>
                                <TabsTrigger value="logs" className="flex-1">Logs</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="variables" className="flex-1 p-0">
                            <ScrollArea className="h-full p-4">
                                <div className="space-y-4">
                                    {nodes.map(node => (
                                        <Card key={node.id} className="overflow-hidden">
                                            <CardHeader className="p-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                        <Badge variant="outline" className="text-xs font-normal">
                                                            {node.type}
                                                        </Badge>
                                                        {node.data.label || node.id}
                                                    </CardTitle>
                                                    <span className="text-xs text-gray-500 font-mono">{node.id}</span>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-3 space-y-2">
                                                {/* Mock Output Variables based on type */}
                                                {node.type === 'start' && (
                                                    <div className="text-xs">
                                                        <div className="font-mono text-blue-600 dark:text-blue-400 mb-1">
                                                            {`{{${node.id}.input}}`}
                                                        </div>
                                                        <div className="text-gray-500 italic">Waiting for input...</div>
                                                    </div>
                                                )}
                                                {node.type === 'text_generation' && (
                                                    <div className="text-xs">
                                                        <div className="font-mono text-blue-600 dark:text-blue-400 mb-1">
                                                            {`{{${node.id}.content}}`}
                                                        </div>
                                                        <div className="text-gray-500 italic">Pending execution...</div>
                                                    </div>
                                                )}
                                                {/* Add other types... */}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="logs" className="flex-1 p-0">
                            <ScrollArea className="h-full p-4">
                                <div className="text-sm text-gray-500 text-center mt-10">
                                    No execution logs available.
                                    <br />
                                    Run the workflow to see logs.
                                </div>
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
                </>
            )}

            {/* Execution Output */}
            {executionState && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Execution Output
                    </h4>

                    {isCurrentNode && (
                        <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            Currently Executing...
                        </div>
                    )}

                    {nodeOutput ? (
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-3 border border-gray-200 dark:border-gray-800 overflow-x-auto">
                            <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {typeof nodeOutput === 'object' ? JSON.stringify(nodeOutput, null, 2) : String(nodeOutput)}
                            </pre>
                        </div>
                    ) : (
                        <div className="text-xs text-gray-500 italic">
                            {isExecuting ? "Waiting for output..." : "No output available"}
                        </div>
                    )}
                </div>
            )}        </div>
    );
}
