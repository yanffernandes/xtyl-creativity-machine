"use client";

import { useWorkflowStore } from "@/lib/stores/workflowStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";
import VariableAutocomplete from "./VariableAutocomplete";
import { ModelSelectorCompact } from "./ModelSelector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function NodeConfigPanel() {
    const { selectedNode, updateNodeData, selectNode } = useWorkflowStore();

    if (!selectedNode) return null;

    const handleUpdate = (key: string, value: any) => {
        updateNodeData(selectedNode.id, { [key]: value });
    };

    const renderConfig = () => {
        switch (selectedNode.type) {
            case "start":
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Label</Label>
                            <Input
                                value={selectedNode.data.label || ""}
                                onChange={(e) => handleUpdate("label", e.target.value)}
                            />
                        </div>
                        <div className="text-sm text-gray-500">
                            This node accepts initial workflow inputs.
                        </div>
                    </div>
                );

            case "text_generation":
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Label</Label>
                            <Input
                                value={selectedNode.data.label || ""}
                                onChange={(e) => handleUpdate("label", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Model</Label>
                            <ModelSelectorCompact
                                value={selectedNode.data.model || "gpt-4-turbo-preview"}
                                onChange={(value) => handleUpdate("model", value)}
                                taskType="text"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Prompt</Label>
                            <VariableAutocomplete
                                nodeId={selectedNode.id}
                                value={selectedNode.data.prompt || ""}
                                onChange={(value) => handleUpdate("prompt", value)}
                                placeholder="Enter prompt (type {{ for variables)"
                                multiline
                                className="min-h-[100px]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Temperature ({selectedNode.data.temperature || 0.7})</Label>
                            <Input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={selectedNode.data.temperature || 0.7}
                                onChange={(e) => handleUpdate("temperature", parseFloat(e.target.value))}
                            />
                        </div>
                    </div>
                );

            case "image_generation":
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Label</Label>
                            <Input
                                value={selectedNode.data.label || ""}
                                onChange={(e) => handleUpdate("label", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Model</Label>
                            <ModelSelectorCompact
                                value={selectedNode.data.model || "dall-e-3"}
                                onChange={(value) => handleUpdate("model", value)}
                                taskType="image"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Prompt</Label>
                            <VariableAutocomplete
                                nodeId={selectedNode.id}
                                value={selectedNode.data.prompt || ""}
                                onChange={(value) => handleUpdate("prompt", value)}
                                placeholder="Image description (type {{ for variables)"
                                multiline
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Size</Label>
                            <Select
                                value={selectedNode.data.size || "1024x1024"}
                                onValueChange={(value) => handleUpdate("size", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select size" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1024x1024">1024x1024</SelectItem>
                                    <SelectItem value="512x512">512x512</SelectItem>
                                    <SelectItem value="1920x1080">1920x1080</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                );

            case "conditional":
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Label</Label>
                            <Input
                                value={selectedNode.data.label || ""}
                                onChange={(e) => handleUpdate("label", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Condition (Python expression)</Label>
                            <VariableAutocomplete
                                nodeId={selectedNode.id}
                                value={selectedNode.data.condition || ""}
                                onChange={(value) => handleUpdate("condition", value)}
                                placeholder="e.g. len({{text.content}}) > 100"
                            />
                            <p className="text-xs text-gray-500">
                                Returns True (top path) or False (bottom path).
                            </p>
                        </div>
                    </div>
                );

            case "loop":
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Label</Label>
                            <Input
                                value={selectedNode.data.label || ""}
                                onChange={(e) => handleUpdate("label", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Iterations</Label>
                            <Input
                                type="number"
                                value={selectedNode.data.iterations || 1}
                                onChange={(e) => handleUpdate("iterations", parseInt(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Exit Condition (Optional)</Label>
                            <VariableAutocomplete
                                nodeId={selectedNode.id}
                                value={selectedNode.data.condition || ""}
                                onChange={(value) => handleUpdate("condition", value)}
                                placeholder="e.g. {{loop.index}} >= 5"
                            />
                        </div>
                    </div>
                );

            case "context_retrieval":
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Label</Label>
                            <Input
                                value={selectedNode.data.label || ""}
                                onChange={(e) => handleUpdate("label", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Search Query</Label>
                            <VariableAutocomplete
                                nodeId={selectedNode.id}
                                value={selectedNode.data.query || ""}
                                onChange={(value) => handleUpdate("query", value)}
                                placeholder="Search terms..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Max Results</Label>
                            <Input
                                type="number"
                                value={selectedNode.data.maxResults || 5}
                                onChange={(e) => handleUpdate("maxResults", parseInt(e.target.value))}
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                checked={selectedNode.data.useRag !== false}
                                onCheckedChange={(checked) => handleUpdate("useRag", checked)}
                            />
                            <Label>Use RAG (Vector Search)</Label>
                        </div>
                    </div>
                );

            case "processing":
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Label</Label>
                            <Input
                                value={selectedNode.data.label || ""}
                                onChange={(e) => handleUpdate("label", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Model</Label>
                            <ModelSelectorCompact
                                value={selectedNode.data.model || "gpt-4-turbo-preview"}
                                onChange={(value) => handleUpdate("model", value)}
                                taskType="text"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Instructions</Label>
                            <VariableAutocomplete
                                nodeId={selectedNode.id}
                                value={selectedNode.data.prompt || ""}
                                onChange={(value) => handleUpdate("prompt", value)}
                                placeholder="Processing instructions..."
                                multiline
                                className="min-h-[100px]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Output Format</Label>
                            <Select
                                value={selectedNode.data.outputFormat || "text"}
                                onValueChange={(value) => handleUpdate("outputFormat", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select format" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="text">Text</SelectItem>
                                    <SelectItem value="json">JSON</SelectItem>
                                    <SelectItem value="markdown">Markdown</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                );

            case "attach_creative":
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Label</Label>
                            <Input
                                value={selectedNode.data.label || ""}
                                onChange={(e) => handleUpdate("label", e.target.value)}
                            />
                        </div>
                        <div className="text-sm text-gray-500">
                            This node combines a document from the "Document" input with an image from the "Image" input.
                            The output is the updated document with the image attached.
                        </div>
                    </div>
                );

            case "finish":
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Label</Label>
                            <Input
                                value={selectedNode.data.label || ""}
                                onChange={(e) => handleUpdate("label", e.target.value)}
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                checked={selectedNode.data.saveToProject || false}
                                onCheckedChange={(checked) => handleUpdate("saveToProject", checked)}
                            />
                            <Label>Save outputs to Project</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                checked={selectedNode.data.notifyUser || false}
                                onCheckedChange={(checked) => handleUpdate("notifyUser", checked)}
                            />
                            <Label>Notify User on Completion</Label>
                        </div>
                    </div>
                );

            default:
                return <div>No configuration available for this node type.</div>;
        }
    };

    return (
        <div className="w-80 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col h-full">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white">Configuration</h2>
                <Button variant="ghost" size="icon" onClick={() => selectNode(null)}>
                    <X className="w-4 h-4" />
                </Button>
            </div>
            <ScrollArea className="flex-1 p-4">
                {renderConfig()}
            </ScrollArea>
        </div>
    );
}
