'use client';

import { useState } from 'react';
import { Check, ChevronDown, Loader2, Search, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { MODEL_TYPES, AvailableModel } from '@/hooks/use-admin';

interface ModelConfigFormProps {
  defaults: Record<string, string>;
  fallbacks: Record<string, string>;
  availableModels: AvailableModel[];
  isLoadingModels: boolean;
  onUpdateDefault: (modelType: string, modelId: string) => Promise<unknown>;
  onUpdateFallback: (modelType: string, modelId: string) => Promise<unknown>;
}

export function ModelConfigForm({
  defaults,
  fallbacks,
  availableModels,
  isLoadingModels,
  onUpdateDefault,
  onUpdateFallback,
}: ModelConfigFormProps) {
  return (
    <div className="space-y-6">
      {MODEL_TYPES.map((type) => (
        <ModelTypeConfig
          key={type.key}
          typeKey={type.key}
          label={type.label}
          description={type.description}
          defaultModel={defaults[type.key] || ''}
          fallbackModel={fallbacks[type.key] || ''}
          availableModels={availableModels}
          isLoadingModels={isLoadingModels}
          onUpdateDefault={(modelId) => onUpdateDefault(type.key, modelId)}
          onUpdateFallback={(modelId) => onUpdateFallback(type.key, modelId)}
        />
      ))}
    </div>
  );
}

interface ModelTypeConfigProps {
  typeKey: string;
  label: string;
  description: string;
  defaultModel: string;
  fallbackModel: string;
  availableModels: AvailableModel[];
  isLoadingModels: boolean;
  onUpdateDefault: (modelId: string) => Promise<unknown>;
  onUpdateFallback: (modelId: string) => Promise<unknown>;
}

// Helper to filter models by type based on output_modalities
function filterModelsByType(models: AvailableModel[], typeKey: string): AvailableModel[] {
  // Map model type keys to expected output modalities
  const modalityMap: Record<string, string[]> = {
    embedding: ['embeddings'],
    image_generation: ['image'],
  };

  const expectedModalities = modalityMap[typeKey];

  if (!expectedModalities) {
    // For chat, vision, document, image_naming - show all models
    return models;
  }

  // For embedding or image_generation - filter by specific modality
  return models.filter((m) => {
    const modalities = m.output_modalities || [];
    return expectedModalities.some((mod) => modalities.includes(mod));
  });
}

function ModelTypeConfig({
  typeKey,
  label,
  description,
  defaultModel,
  fallbackModel,
  availableModels,
  isLoadingModels,
  onUpdateDefault,
  onUpdateFallback,
}: ModelTypeConfigProps) {
  const [isEditingDefault, setIsEditingDefault] = useState(false);
  const [isEditingFallback, setIsEditingFallback] = useState(false);
  const [savingDefault, setSavingDefault] = useState(false);
  const [savingFallback, setSavingFallback] = useState(false);

  // Filter models based on model type
  const filteredByType = filterModelsByType(availableModels, typeKey);

  const handleDefaultChange = async (modelId: string) => {
    setSavingDefault(true);
    try {
      await onUpdateDefault(modelId);
      setIsEditingDefault(false);
    } finally {
      setSavingDefault(false);
    }
  };

  const handleFallbackChange = async (modelId: string) => {
    setSavingFallback(true);
    try {
      await onUpdateFallback(modelId);
      setIsEditingFallback(false);
    } finally {
      setSavingFallback(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-white">{label}</h3>
        <p className="text-sm text-white/50">{description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Default Model */}
        <div className="space-y-2">
          <Label className="text-sm text-white/70">Default Model</Label>
          <ModelSelector
            value={defaultModel}
            models={filteredByType}
            isLoading={isLoadingModels}
            isSaving={savingDefault}
            open={isEditingDefault}
            onOpenChange={setIsEditingDefault}
            onSelect={handleDefaultChange}
          />
        </div>

        {/* Fallback Model */}
        <div className="space-y-2">
          <Label className="text-sm text-white/70">Fallback Model</Label>
          <ModelSelector
            value={fallbackModel}
            models={filteredByType}
            isLoading={isLoadingModels}
            isSaving={savingFallback}
            open={isEditingFallback}
            onOpenChange={setIsEditingFallback}
            onSelect={handleFallbackChange}
          />
        </div>
      </div>
    </div>
  );
}

interface ModelSelectorProps {
  value: string;
  models: AvailableModel[];
  isLoading: boolean;
  isSaving: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (modelId: string) => void;
}

function ModelSelector({
  value,
  models,
  isLoading,
  isSaving,
  open,
  onOpenChange,
  onSelect,
}: ModelSelectorProps) {
  const [search, setSearch] = useState('');
  const [manualInput, setManualInput] = useState('');

  const selectedModel = models.find((m) => m.id === value);
  const displayValue = selectedModel?.name || value || 'Select model...';

  const filteredModels = models.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onSelect(manualInput.trim());
      setManualInput('');
    }
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between border-white/10 bg-white/5 text-left font-normal text-white hover:bg-white/10 hover:text-white"
          disabled={isSaving}
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </span>
          ) : (
            <span className="truncate">{displayValue}</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[400px] border-white/10 bg-slate-900/95 p-0 backdrop-blur-xl"
        align="start"
      >
        <div className="flex flex-col">
          {/* Search Input */}
          <div className="border-b border-white/10 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <Input
                placeholder="Search models..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-white/10 bg-white/5 pl-9 text-white placeholder:text-white/40"
                autoFocus
              />
            </div>
          </div>

          {/* Models List */}
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-white/50" />
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="py-6 text-center text-sm text-white/50">
                No models found.
              </div>
            ) : (
              <div className="p-1">
                {filteredModels.slice(0, 100).map((model) => (
                  <div
                    key={model.id}
                    onClick={() => {
                      console.log('[ModelSelector] Clicked:', model.id);
                      onSelect(model.id);
                    }}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm text-white outline-none hover:bg-white/10"
                  >
                    <div className="flex flex-1 items-center gap-2">
                      <Check
                        className={cn(
                          'h-4 w-4 shrink-0',
                          value === model.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex-1 truncate">
                        <p className="truncate font-medium">{model.name}</p>
                        <p className="truncate text-xs text-white/50">{model.id}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Manual Input */}
          <div className="border-t border-white/10 p-3">
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                placeholder="Or enter model ID manually..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="flex-1 border-white/10 bg-white/5 text-sm text-white placeholder:text-white/40"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!manualInput.trim()}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                Use
              </Button>
            </form>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
