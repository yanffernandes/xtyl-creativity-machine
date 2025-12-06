"use client";

import { useWorkflowStore } from "@/lib/stores/workflowStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { glassPanelHeaderClasses } from "@/lib/glass-utils";
import VariableAutocomplete from "./VariableAutocomplete";
import { Node } from "reactflow";
import ModelSelector from "./ModelSelector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTranslations } from "next-intl";

interface NodeConfigPanelProps {
    selectedNode?: Node | null;
    className?: string;
}

export function NodeConfigPanel({ selectedNode: propSelectedNode, className }: NodeConfigPanelProps) {
    const { selectedNode: storeSelectedNode, updateNodeData, selectNode } = useWorkflowStore();
    const t = useTranslations("workflow");

    // Use prop if provided, otherwise use store
    const selectedNode = propSelectedNode !== undefined ? propSelectedNode : storeSelectedNode;

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
                            <Label>{t("label")}</Label>
                            <Input
                                value={selectedNode.data.label || ""}
                                onChange={(e) => handleUpdate("label", e.target.value)}
                            />
                        </div>
                        <div className="text-sm text-gray-500">
                            {t("startNodeDescription")}
                        </div>
                    </div>
                );

            case "text_generation":
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t("label")}</Label>
                            <Input
                                value={selectedNode.data.label || ""}
                                onChange={(e) => handleUpdate("label", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("model")}</Label>
                            <ModelSelector
                                value={selectedNode.data.model || ""}
                                onChange={(value) => handleUpdate("model", value)}
                                type="text"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("prompt")}</Label>
                            <VariableAutocomplete
                                nodeId={selectedNode.id}
                                value={selectedNode.data.prompt || ""}
                                onChange={(value) => handleUpdate("prompt", value)}
                                placeholder={t("promptPlaceholder")}
                                multiline
                                className="min-h-[100px]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("temperature")} ({selectedNode.data.temperature || 0.7})</Label>
                            <Input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={selectedNode.data.temperature || 0.7}
                                onChange={(e) => handleUpdate("temperature", parseFloat(e.target.value))}
                            />
                        </div>
                        <div className="pt-2 border-t border-white/[0.08]">
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={selectedNode.data.save_as_document !== false}
                                    onCheckedChange={(checked) => handleUpdate("save_as_document", checked)}
                                />
                                <Label>{t("saveAsDocument")}</Label>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t("saveAsDocumentHint")}
                            </p>
                        </div>
                        {selectedNode.data.save_as_document !== false && (
                            <div className="space-y-2">
                                <Label>{t("documentTitle")}</Label>
                                <Input
                                    value={selectedNode.data.title || ""}
                                    onChange={(e) => handleUpdate("title", e.target.value)}
                                    placeholder={t("documentTitlePlaceholder")}
                                />
                            </div>
                        )}
                    </div>
                );

            case "image_generation":
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t("label")}</Label>
                            <Input
                                value={selectedNode.data.label || ""}
                                onChange={(e) => handleUpdate("label", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("model")}</Label>
                            <ModelSelector
                                value={selectedNode.data.model || ""}
                                onChange={(value) => handleUpdate("model", value)}
                                type="image"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("prompt")}</Label>
                            <VariableAutocomplete
                                nodeId={selectedNode.id}
                                value={selectedNode.data.prompt || ""}
                                onChange={(value) => handleUpdate("prompt", value)}
                                placeholder={t("imageDescription")}
                                multiline
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("size")}</Label>
                            <Select
                                value={selectedNode.data.size || "1024x1024"}
                                onValueChange={(value) => handleUpdate("size", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t("selectSize")} />
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
                            <Label>{t("label")}</Label>
                            <Input
                                value={selectedNode.data.label || ""}
                                onChange={(e) => handleUpdate("label", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("condition")}</Label>
                            <VariableAutocomplete
                                nodeId={selectedNode.id}
                                value={selectedNode.data.condition || ""}
                                onChange={(value) => handleUpdate("condition", value)}
                                placeholder="e.g. len({{text.content}}) > 100"
                            />
                            <p className="text-xs text-gray-500">
                                {t("conditionHint")}
                            </p>
                        </div>
                    </div>
                );

            case "loop":
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t("label")}</Label>
                            <Input
                                value={selectedNode.data.label || ""}
                                onChange={(e) => handleUpdate("label", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("iterations")}</Label>
                            <Input
                                type="number"
                                value={selectedNode.data.iterations || 1}
                                onChange={(e) => handleUpdate("iterations", parseInt(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("exitCondition")}</Label>
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
                            <Label>{t("label")}</Label>
                            <Input
                                value={selectedNode.data.label || ""}
                                onChange={(e) => handleUpdate("label", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("searchQuery")}</Label>
                            <VariableAutocomplete
                                nodeId={selectedNode.id}
                                value={selectedNode.data.query || ""}
                                onChange={(value) => handleUpdate("query", value)}
                                placeholder="Search terms..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("maxResults")}</Label>
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
                            <Label>{t("useRag")}</Label>
                        </div>
                    </div>
                );

            case "attach_creative":
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t("label")}</Label>
                            <Input
                                value={selectedNode.data.label || ""}
                                onChange={(e) => handleUpdate("label", e.target.value)}
                            />
                        </div>

                        {/* Document Source */}
                        <div className="space-y-2">
                            <Label>{t("documentSource")}</Label>
                            <Select
                                value={selectedNode.data.documentSource || "from_node"}
                                onValueChange={(value) => handleUpdate("documentSource", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t("selectSource")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="from_node">{t("fromConnectedNode")}</SelectItem>
                                    <SelectItem value="from_project">{t("fromProject")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedNode.data.documentSource === "from_project" && (
                            <div className="space-y-2">
                                <Label>{t("documentId")}</Label>
                                <Input
                                    value={selectedNode.data.documentId || ""}
                                    onChange={(e) => handleUpdate("documentId", e.target.value)}
                                    placeholder={t("documentIdPlaceholder")}
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t("documentIdHint")}
                                </p>
                            </div>
                        )}

                        {/* Image Source */}
                        <div className="space-y-2">
                            <Label>{t("imageSource")}</Label>
                            <Select
                                value={selectedNode.data.imageSource || "from_node"}
                                onValueChange={(value) => handleUpdate("imageSource", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t("selectSource")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="from_node">{t("fromConnectedNode")}</SelectItem>
                                    <SelectItem value="from_project">{t("fromProject")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedNode.data.imageSource === "from_project" && (
                            <div className="space-y-2">
                                <Label>{t("imageId")}</Label>
                                <Input
                                    value={selectedNode.data.imageId || ""}
                                    onChange={(e) => handleUpdate("imageId", e.target.value)}
                                    placeholder={t("imageIdPlaceholder")}
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t("imageIdHint")}
                                </p>
                            </div>
                        )}

                        <div className="text-xs text-muted-foreground p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                            <p className="font-medium mb-1">{t("howItWorks")}</p>
                            <p>{t("attachNodeDescription")}</p>
                        </div>
                    </div>
                );

            case "finish":
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t("label")}</Label>
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
                            <Label>{t("saveToProject")}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                checked={selectedNode.data.notifyUser || false}
                                onCheckedChange={(checked) => handleUpdate("notifyUser", checked)}
                            />
                            <Label>{t("notifyOnCompletion")}</Label>
                        </div>
                    </div>
                );

            default:
                return <div>{t("noConfigAvailable")}</div>;
        }
    };

    return (
        <div className={cn(
            "flex flex-col h-full overflow-hidden",
            className
        )}>
            <div className={cn("p-3 flex items-center justify-between", glassPanelHeaderClasses)}>
                <h2 className="text-sm font-semibold text-foreground">{t("configuration")}</h2>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => selectNode(null)}
                    className="h-7 w-7 hover:bg-white/[0.08] rounded-lg"
                >
                    <X className="w-3.5 h-3.5" />
                </Button>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-4">{renderConfig()}</div>
            </ScrollArea>
        </div>
    );
}

// Default export for backwards compatibility
export default NodeConfigPanel;
