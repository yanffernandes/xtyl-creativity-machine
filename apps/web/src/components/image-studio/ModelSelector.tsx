
/**
 * ModelSelector Component
 * Feature 027: Visual Generation Studio
 *
 * Dropdown selector for image generation models.
 * Fetches available models from the API.
 */

import { useMemo } from 'react';
import { Cpu, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { AvailableModel } from '@/types/image-studio';

interface ModelSelectorProps {
  models: AvailableModel[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function ModelSelector({
  models,
  value,
  onChange,
  disabled = false,
  isLoading = false,
  className,
}: ModelSelectorProps) {
  // Group models by provider
  const groupedModels = useMemo(() => {
    const groups: Record<string, AvailableModel[]> = {};

    models.forEach((model) => {
      const provider = model.top_provider || 'Other';
      if (!groups[provider]) {
        groups[provider] = [];
      }
      groups[provider].push(model);
    });

    return groups;
  }, [models]);

  const selectedModel = models.find((m) => m.id === value);

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Modelo
        </label>
        <div className="h-10 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
        <Cpu className="w-4 h-4" />
        Modelo
      </label>

      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          className={cn(
            'w-full',
            'bg-white/50 dark:bg-gray-900/50',
            'border-gray-200/50 dark:border-gray-700/50',
            'backdrop-blur-xl'
          )}
        >
          <SelectValue placeholder="Selecione um modelo">
            {selectedModel && (
              <span className="flex items-center gap-2">
                <span className="truncate">{selectedModel.name}</span>
                {selectedModel.top_provider && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    ({selectedModel.top_provider})
                  </span>
                )}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          {Object.entries(groupedModels).map(([provider, providerModels]) => (
            <div key={provider}>
              {/* Provider header */}
              <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {provider}
              </div>

              {/* Models in this provider */}
              {providerModels.map((model) => (
                <SelectItem
                  key={model.id}
                  value={model.id}
                  className="cursor-pointer"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{model.name}</span>
                    {model.description && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {model.description}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </div>
          ))}

          {models.length === 0 && (
            <div className="px-2 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhum modelo disponível
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

export default ModelSelector;
