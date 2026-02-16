import { useWorkflowStore } from '@/lib/stores/workflowStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { glassPanelHeaderClasses } from '@/lib/glass-utils';
import VariableAutocomplete from './VariableAutocomplete';
import type { Node } from 'reactflow';
import WorkflowModelSelector from './ModelSelector';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface NodeConfigPanelProps {
  selectedNode?: Node | null;
  className?: string;
}

export function NodeConfigPanel({
  selectedNode: propSelectedNode,
  className,
}: NodeConfigPanelProps) {
  const {
    selectedNode: storeSelectedNode,
    updateNodeData,
    selectNode,
  } = useWorkflowStore();

  const selectedNode =
    propSelectedNode !== undefined ? propSelectedNode : storeSelectedNode;

  if (!selectedNode) return null;

  const handleUpdate = (key: string, value: unknown) => {
    updateNodeData(selectedNode.id, { [key]: value });
  };

  const renderConfig = () => {
    switch (selectedNode.type) {
      case 'start':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={selectedNode.data.label || ''}
                onChange={(e) => handleUpdate('label', e.target.value)}
              />
            </div>
            <div className="text-sm text-gray-500">
              Entry point of the workflow. Defines input variables.
            </div>
          </div>
        );

      case 'text_generation':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={selectedNode.data.label || ''}
                onChange={(e) => handleUpdate('label', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <WorkflowModelSelector
                value={selectedNode.data.model || ''}
                onChange={(value) => handleUpdate('model', value)}
                type="text"
              />
            </div>
            <div className="space-y-2">
              <Label>Prompt</Label>
              <VariableAutocomplete
                nodeId={selectedNode.id}
                value={selectedNode.data.prompt || ''}
                onChange={(value) => handleUpdate('prompt', value)}
                placeholder="Enter prompt with {{variables}}..."
                multiline
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Temperature ({selectedNode.data.temperature || 0.7})
              </Label>
              <Input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={selectedNode.data.temperature || 0.7}
                onChange={(e) =>
                  handleUpdate('temperature', parseFloat(e.target.value))
                }
              />
            </div>
            <div className="pt-2 border-t border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Switch
                  checked={selectedNode.data.save_as_document !== false}
                  onCheckedChange={(checked) =>
                    handleUpdate('save_as_document', checked)
                  }
                />
                <Label>Save as Document</Label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Save generated text as a project document
              </p>
            </div>
            {selectedNode.data.save_as_document !== false && (
              <div className="space-y-2">
                <Label>Document Title</Label>
                <Input
                  value={selectedNode.data.title || ''}
                  onChange={(e) => handleUpdate('title', e.target.value)}
                  placeholder="Auto-generated if empty"
                />
              </div>
            )}
          </div>
        );

      case 'image_generation':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={selectedNode.data.label || ''}
                onChange={(e) => handleUpdate('label', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <WorkflowModelSelector
                value={selectedNode.data.model || ''}
                onChange={(value) => handleUpdate('model', value)}
                type="image"
              />
            </div>
            <div className="space-y-2">
              <Label>Prompt</Label>
              <VariableAutocomplete
                nodeId={selectedNode.id}
                value={selectedNode.data.prompt || ''}
                onChange={(value) => handleUpdate('prompt', value)}
                placeholder="Describe the image..."
                multiline
              />
            </div>
            <div className="space-y-2">
              <Label>Size</Label>
              <Select
                value={selectedNode.data.size || '1024x1024'}
                onValueChange={(value) => handleUpdate('size', value)}
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

      case 'conditional':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={selectedNode.data.label || ''}
                onChange={(e) => handleUpdate('label', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <VariableAutocomplete
                nodeId={selectedNode.id}
                value={selectedNode.data.condition || ''}
                onChange={(value) => handleUpdate('condition', value)}
                placeholder={'e.g. len({{text.content}}) > 100'}
              />
              <p className="text-xs text-gray-500">
                Expression that evaluates to true/false
              </p>
            </div>
          </div>
        );

      case 'loop':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={selectedNode.data.label || ''}
                onChange={(e) => handleUpdate('label', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Iterations</Label>
              <Input
                type="number"
                value={selectedNode.data.iterations || 1}
                onChange={(e) =>
                  handleUpdate('iterations', parseInt(e.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Exit Condition</Label>
              <VariableAutocomplete
                nodeId={selectedNode.id}
                value={selectedNode.data.condition || ''}
                onChange={(value) => handleUpdate('condition', value)}
                placeholder={'e.g. {{loop.index}} >= 5'}
              />
            </div>
          </div>
        );

      case 'context_retrieval':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={selectedNode.data.label || ''}
                onChange={(e) => handleUpdate('label', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Search Query</Label>
              <VariableAutocomplete
                nodeId={selectedNode.id}
                value={selectedNode.data.query || ''}
                onChange={(value) => handleUpdate('query', value)}
                placeholder="Search terms..."
              />
            </div>
            <div className="space-y-2">
              <Label>Max Results</Label>
              <Input
                type="number"
                value={selectedNode.data.maxResults || 5}
                onChange={(e) =>
                  handleUpdate('maxResults', parseInt(e.target.value))
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={selectedNode.data.useRag !== false}
                onCheckedChange={(checked) => handleUpdate('useRag', checked)}
              />
              <Label>Use RAG</Label>
            </div>
          </div>
        );

      case 'attach_creative':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={selectedNode.data.label || ''}
                onChange={(e) => handleUpdate('label', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Document Source</Label>
              <Select
                value={selectedNode.data.documentSource || 'from_node'}
                onValueChange={(value) =>
                  handleUpdate('documentSource', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="from_node">
                    From Connected Node
                  </SelectItem>
                  <SelectItem value="from_project">From Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedNode.data.documentSource === 'from_project' && (
              <div className="space-y-2">
                <Label>Document ID</Label>
                <Input
                  value={selectedNode.data.documentId || ''}
                  onChange={(e) =>
                    handleUpdate('documentId', e.target.value)
                  }
                  placeholder="Enter document ID"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Image Source</Label>
              <Select
                value={selectedNode.data.imageSource || 'from_node'}
                onValueChange={(value) =>
                  handleUpdate('imageSource', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="from_node">
                    From Connected Node
                  </SelectItem>
                  <SelectItem value="from_project">From Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedNode.data.imageSource === 'from_project' && (
              <div className="space-y-2">
                <Label>Image ID</Label>
                <Input
                  value={selectedNode.data.imageId || ''}
                  onChange={(e) => handleUpdate('imageId', e.target.value)}
                  placeholder="Enter image ID"
                />
              </div>
            )}
            <div className="text-xs text-muted-foreground p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
              <p className="font-medium mb-1">How it works</p>
              <p>
                Combines a text document with an image asset to create a
                complete creative output.
              </p>
            </div>
          </div>
        );

      case 'finish':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={selectedNode.data.label || ''}
                onChange={(e) => handleUpdate('label', e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={selectedNode.data.saveToProject || false}
                onCheckedChange={(checked) =>
                  handleUpdate('saveToProject', checked)
                }
              />
              <Label>Save to Project</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={selectedNode.data.notifyUser || false}
                onCheckedChange={(checked) =>
                  handleUpdate('notifyUser', checked)
                }
              />
              <Label>Notify on Completion</Label>
            </div>
          </div>
        );

      default:
        return <div>No configuration available</div>;
    }
  };

  return (
    <div
      className={cn('flex flex-col h-full overflow-hidden', className)}
    >
      <div
        className={cn(
          'p-3 flex items-center justify-between',
          glassPanelHeaderClasses,
        )}
      >
        <h2 className="text-sm font-semibold text-foreground">Configuration</h2>
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

export default NodeConfigPanel;
