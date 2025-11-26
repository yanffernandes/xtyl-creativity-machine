"use client";

/**
 * Node Properties Panel
 *
 * Sidebar panel for editing selected node properties.
 * Uses VariableInput for prompt fields to support variable references.
 */

import { Node, Edge } from "reactflow";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import VariableInput from "./VariableInput";
import { useWorkflowVariables } from "@/hooks/useWorkflowVariables";

interface NodePropertiesPanelProps {
  node: Node | null;
  nodes: Node[];
  edges: Edge[];
  onClose: () => void;
  onUpdate: (nodeId: string, data: any) => void;
}

export default function NodePropertiesPanel({
  node,
  nodes,
  edges,
  onClose,
  onUpdate,
}: NodePropertiesPanelProps) {
  if (!node) return null;

  const { availableVariables } = useWorkflowVariables(nodes, edges, node.id);

  const handleUpdate = (field: string, value: any) => {
    onUpdate(node.id, {
      ...node.data,
      [field]: value,
    });
  };

  const renderPropertiesForType = () => {
    switch (node.type) {
      case "start":
        return renderStartNodeProperties();
      case "finish":
        return renderFinishNodeProperties();
      case "text_generation":
        return renderTextGenerationProperties();
      case "image_generation":
        return renderImageGenerationProperties();
      case "processing":
        return renderProcessingProperties();
      case "conditional":
        return renderConditionalProperties();
      case "loop":
        return renderLoopProperties();
      case "context_retrieval":
        return renderContextRetrievalProperties();
      default:
        return <div className="text-sm text-gray-500">No properties available</div>;
    }
  };

  const renderStartNodeProperties = () => (
    <div className="space-y-4">
      <div>
        <Label>Node Label</Label>
        <Input
          value={node.data.label || ""}
          onChange={(e) => handleUpdate("label", e.target.value)}
          placeholder="Start"
        />
      </div>
    </div>
  );

  const renderFinishNodeProperties = () => (
    <div className="space-y-4">
      <div>
        <Label>Node Label</Label>
        <Input
          value={node.data.label || ""}
          onChange={(e) => handleUpdate("label", e.target.value)}
          placeholder="Finish"
        />
      </div>
      <div>
        <Label>Document Title (Optional)</Label>
        <Input
          value={node.data.documentTitle || ""}
          onChange={(e) => handleUpdate("documentTitle", e.target.value)}
          placeholder="Generated Content"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={node.data.saveToProject !== false}
          onChange={(e) => handleUpdate("saveToProject", e.target.checked)}
          className="rounded border-gray-300"
        />
        <Label>Save to project</Label>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={node.data.notifyUser || false}
          onChange={(e) => handleUpdate("notifyUser", e.target.checked)}
          className="rounded border-gray-300"
        />
        <Label>Notify user on completion</Label>
      </div>
    </div>
  );

  const renderTextGenerationProperties = () => (
    <div className="space-y-4">
      <div>
        <Label>Node Label</Label>
        <Input
          value={node.data.label || ""}
          onChange={(e) => handleUpdate("label", e.target.value)}
          placeholder="Generate Text"
        />
      </div>

      <div>
        <Label>Model</Label>
        <Select
          value={node.data.model || "anthropic/claude-3.5-sonnet"}
          onValueChange={(value) => handleUpdate("model", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</SelectItem>
            <SelectItem value="anthropic/claude-3-haiku">Claude 3 Haiku</SelectItem>
            <SelectItem value="openai/gpt-4o">GPT-4o</SelectItem>
            <SelectItem value="openai/gpt-4o-mini">GPT-4o Mini</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Prompt</Label>
        <VariableInput
          value={node.data.prompt || ""}
          onChange={(value) => handleUpdate("prompt", value)}
          availableVariables={availableVariables}
          placeholder="Write your prompt here... Use {{node.field}} for variables"
          rows={8}
        />
      </div>

      <div>
        <Label>Output Format</Label>
        <Select
          value={node.data.outputFormat || "text"}
          onValueChange={(value) => handleUpdate("outputFormat", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Plain Text</SelectItem>
            <SelectItem value="json">JSON (Structured)</SelectItem>
            <SelectItem value="markdown">Markdown</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Max Tokens</Label>
          <Input
            type="number"
            value={node.data.maxTokens || 1000}
            onChange={(e) => handleUpdate("maxTokens", parseInt(e.target.value))}
            min={100}
            max={4000}
          />
        </div>
        <div>
          <Label>Temperature</Label>
          <Input
            type="number"
            value={node.data.temperature || 0.7}
            onChange={(e) => handleUpdate("temperature", parseFloat(e.target.value))}
            min={0}
            max={2}
            step={0.1}
          />
        </div>
      </div>
    </div>
  );

  const renderImageGenerationProperties = () => (
    <div className="space-y-4">
      <div>
        <Label>Node Label</Label>
        <Input
          value={node.data.label || ""}
          onChange={(e) => handleUpdate("label", e.target.value)}
          placeholder="Generate Image"
        />
      </div>

      <div>
        <Label>Model</Label>
        <Select
          value={node.data.model || "black-forest-labs/flux-1.1-pro"}
          onValueChange={(value) => handleUpdate("model", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="black-forest-labs/flux-1.1-pro">FLUX 1.1 Pro</SelectItem>
            <SelectItem value="black-forest-labs/flux-pro">FLUX Pro</SelectItem>
            <SelectItem value="stability-ai/stable-diffusion-3">Stable Diffusion 3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Image Prompt</Label>
        <VariableInput
          value={node.data.prompt || ""}
          onChange={(value) => handleUpdate("prompt", value)}
          availableVariables={availableVariables}
          placeholder="Describe the image... Use {{node.field}} for variables"
          rows={6}
        />
      </div>

      <div>
        <Label>Size</Label>
        <Select
          value={node.data.size || "1024x1024"}
          onValueChange={(value) => handleUpdate("size", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1024x1024">Square (1024x1024)</SelectItem>
            <SelectItem value="1024x1792">Portrait (1024x1792)</SelectItem>
            <SelectItem value="1792x1024">Landscape (1792x1024)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderProcessingProperties = () => (
    <div className="space-y-4">
      <div>
        <Label>Node Label</Label>
        <Input
          value={node.data.label || ""}
          onChange={(e) => handleUpdate("label", e.target.value)}
          placeholder="Processing"
        />
      </div>

      <div>
        <Label>Processing Prompt</Label>
        <VariableInput
          value={node.data.prompt || ""}
          onChange={(value) => handleUpdate("prompt", value)}
          availableVariables={availableVariables}
          placeholder="How should the content be processed?"
          rows={6}
        />
      </div>

      <div>
        <Label>Model</Label>
        <Select
          value={node.data.model || "anthropic/claude-3-haiku"}
          onValueChange={(value) => handleUpdate("model", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="anthropic/claude-3-haiku">Claude 3 Haiku (Fast)</SelectItem>
            <SelectItem value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</SelectItem>
            <SelectItem value="openai/gpt-4o-mini">GPT-4o Mini</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderConditionalProperties = () => (
    <div className="space-y-4">
      <div>
        <Label>Node Label</Label>
        <Input
          value={node.data.label || ""}
          onChange={(e) => handleUpdate("label", e.target.value)}
          placeholder="Conditional"
        />
      </div>

      <div>
        <Label>Condition</Label>
        <VariableInput
          value={node.data.condition || ""}
          onChange={(value) => handleUpdate("condition", value)}
          availableVariables={availableVariables}
          placeholder="e.g., {{previous.sentiment}} == 'positive'"
          rows={3}
        />
        <p className="text-xs text-gray-500 mt-1">
          Use Python-like expressions with variables
        </p>
      </div>
    </div>
  );

  const renderLoopProperties = () => (
    <div className="space-y-4">
      <div>
        <Label>Node Label</Label>
        <Input
          value={node.data.label || ""}
          onChange={(e) => handleUpdate("label", e.target.value)}
          placeholder="Loop"
        />
      </div>

      <div>
        <Label>Iterations (Optional)</Label>
        <Input
          type="number"
          value={node.data.iterations || ""}
          onChange={(e) => handleUpdate("iterations", e.target.value ? parseInt(e.target.value) : null)}
          placeholder="Leave empty for condition-based loop"
          min={1}
          max={100}
        />
      </div>

      <div>
        <Label>Condition (Optional)</Label>
        <VariableInput
          value={node.data.condition || ""}
          onChange={(value) => handleUpdate("condition", value)}
          availableVariables={availableVariables}
          placeholder="e.g., {{loop.iteration}} < 10"
          rows={3}
        />
      </div>

      <div>
        <Label>Max Iterations (Safety)</Label>
        <Input
          type="number"
          value={node.data.maxIterations || 100}
          onChange={(e) => handleUpdate("maxIterations", parseInt(e.target.value))}
          min={1}
          max={1000}
        />
      </div>
    </div>
  );

  const renderContextRetrievalProperties = () => (
    <div className="space-y-4">
      <div>
        <Label>Node Label</Label>
        <Input
          value={node.data.label || ""}
          onChange={(e) => handleUpdate("label", e.target.value)}
          placeholder="Context Retrieval"
        />
      </div>

      <div>
        <Label>Max Results</Label>
        <Input
          type="number"
          value={node.data.maxResults || 10}
          onChange={(e) => handleUpdate("maxResults", parseInt(e.target.value))}
          min={1}
          max={50}
        />
      </div>

      <div>
        <Label>Filters (JSON)</Label>
        <textarea
          value={JSON.stringify(node.data.filters || {}, null, 2)}
          onChange={(e) => {
            try {
              const filters = JSON.parse(e.target.value);
              handleUpdate("filters", filters);
            } catch (error) {
              // Invalid JSON, ignore
            }
          }}
          className="w-full font-mono text-xs p-2 border rounded-md"
          rows={5}
          placeholder='{"status": "approved", "type": "document"}'
        />
      </div>
    </div>
  );

  return (
    <div className="w-96 h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Node Properties</h3>
          <p className="text-xs text-gray-500 mt-0.5">{node.type?.replace("_", " ")}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto p-4">{renderPropertiesForType()}</div>
    </div>
  );
}
