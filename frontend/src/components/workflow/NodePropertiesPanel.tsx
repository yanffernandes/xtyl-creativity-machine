"use client";

/**
 * Node Properties Panel
 *
 * Sidebar panel for editing selected node properties.
 * Uses VariableInput for prompt fields to support variable references.
 * Updated with Apple Liquid Glass design pattern.
 */

import { Node, Edge } from "reactflow";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { glassPanelHeaderClasses } from "@/lib/glass-utils";
import VariableInput from "./VariableInput";
import ModelSelector from "./ModelSelector";
import { useWorkflowVariables } from "@/hooks/useWorkflowVariables";

interface NodePropertiesPanelProps {
  node: Node | null;
  nodes: Node[];
  edges: Edge[];
  onClose: () => void;
  onUpdate: (nodeId: string, data: any) => void;
  className?: string;
}

export default function NodePropertiesPanel({
  node,
  nodes,
  edges,
  onClose,
  onUpdate,
  className,
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
        <Label className="text-foreground/80">Nome do Nó</Label>
        <Input
          value={node.data.label || ""}
          onChange={(e) => handleUpdate("label", e.target.value)}
          placeholder="Gerar Texto"
          className="bg-white/[0.04] border-white/[0.1] focus:border-primary/50"
        />
      </div>

      <div>
        <Label className="text-foreground/80">Modelo</Label>
        <ModelSelector
          value={node.data.model || "anthropic/claude-3.5-sonnet"}
          onChange={(value) => handleUpdate("model", value)}
          type="text"
        />
      </div>

      <div>
        <Label className="text-foreground/80">Prompt</Label>
        <VariableInput
          value={node.data.prompt || ""}
          onChange={(value) => handleUpdate("prompt", value)}
          availableVariables={availableVariables}
          placeholder="Escreva seu prompt aqui... Use {{node.field}} para variáveis"
          rows={8}
        />
      </div>

      <div>
        <Label className="text-foreground/80">Formato de Saída</Label>
        <Select
          value={node.data.outputFormat || "text"}
          onValueChange={(value) => handleUpdate("outputFormat", value)}
        >
          <SelectTrigger className="bg-white/[0.04] border-white/[0.1]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Texto Simples</SelectItem>
            <SelectItem value="json">JSON (Estruturado)</SelectItem>
            <SelectItem value="markdown">Markdown</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-foreground/80">Max Tokens</Label>
          <Input
            type="number"
            value={node.data.maxTokens || 1000}
            onChange={(e) => handleUpdate("maxTokens", parseInt(e.target.value))}
            min={100}
            max={4000}
            className="bg-white/[0.04] border-white/[0.1]"
          />
        </div>
        <div>
          <Label className="text-foreground/80">Temperatura</Label>
          <Input
            type="number"
            value={node.data.temperature || 0.7}
            onChange={(e) => handleUpdate("temperature", parseFloat(e.target.value))}
            min={0}
            max={2}
            step={0.1}
            className="bg-white/[0.04] border-white/[0.1]"
          />
        </div>
      </div>

      {/* Save as Document Toggle */}
      <div className="pt-2 border-t border-white/[0.08]">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-foreground/80">Salvar como Documento</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Se desativado, o conteúdo só será passado para o próximo nó
            </p>
          </div>
          <input
            type="checkbox"
            checked={node.data.save_as_document !== false}
            onChange={(e) => handleUpdate("save_as_document", e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-white/[0.04] text-primary focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Document Title - only show if save_as_document is true */}
      {node.data.save_as_document !== false && (
        <div>
          <Label className="text-foreground/80">Título do Documento</Label>
          <Input
            value={node.data.title || ""}
            onChange={(e) => handleUpdate("title", e.target.value)}
            placeholder="Deixe vazio para título automático"
            className="bg-white/[0.04] border-white/[0.1] focus:border-primary/50"
          />
        </div>
      )}
    </div>
  );

  const renderImageGenerationProperties = () => (
    <div className="space-y-4">
      <div>
        <Label className="text-foreground/80">Nome do Nó</Label>
        <Input
          value={node.data.label || ""}
          onChange={(e) => handleUpdate("label", e.target.value)}
          placeholder="Gerar Imagem"
          className="bg-white/[0.04] border-white/[0.1] focus:border-primary/50"
        />
      </div>

      <div>
        <Label className="text-foreground/80">Modelo</Label>
        <ModelSelector
          value={node.data.model || "black-forest-labs/flux-1.1-pro"}
          onChange={(value) => handleUpdate("model", value)}
          type="image"
        />
      </div>

      <div>
        <Label className="text-foreground/80">Prompt da Imagem</Label>
        <VariableInput
          value={node.data.prompt || ""}
          onChange={(value) => handleUpdate("prompt", value)}
          availableVariables={availableVariables}
          placeholder="Descreva a imagem... Use {{node.field}} para variáveis"
          rows={6}
        />
      </div>

      <div>
        <Label className="text-foreground/80">Tamanho</Label>
        <Select
          value={node.data.size || "1024x1024"}
          onValueChange={(value) => handleUpdate("size", value)}
        >
          <SelectTrigger className="bg-white/[0.04] border-white/[0.1]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1024x1024">Quadrado (1024x1024)</SelectItem>
            <SelectItem value="1024x1792">Retrato (1024x1792)</SelectItem>
            <SelectItem value="1792x1024">Paisagem (1792x1024)</SelectItem>
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
          placeholder='{"status": "art_ok", "type": "document"}'
        />
      </div>
    </div>
  );

  return (
    <div className={cn(
      "h-full flex flex-col overflow-hidden",
      className
    )}>
      {/* Header with gradient */}
      <div className={cn("p-4 flex items-center justify-between", glassPanelHeaderClasses)}>
        <div>
          <h3 className="font-semibold text-foreground">Propriedades</h3>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{node.type?.replace("_", " ")}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 hover:bg-white/[0.08] rounded-lg"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Properties with scroll */}
      <ScrollArea className="flex-1">
        <div className="p-4">{renderPropertiesForType()}</div>
      </ScrollArea>
    </div>
  );
}
