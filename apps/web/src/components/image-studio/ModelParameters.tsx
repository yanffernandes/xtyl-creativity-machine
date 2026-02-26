'use client';

/**
 * ModelParameters Component
 * Feature 029: Dynamic model parameter controls
 *
 * Renders UI controls for model-specific parameters based on the
 * selected model's configuration from modelConfig.ts.
 */

import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { getModelById, type ModelParameter, type ModelConfig } from '@/lib/modelConfig';

interface ModelParametersProps {
  /** Model ID to show parameters for */
  modelId: string;
  /** Current parameter values */
  values: Record<string, unknown>;
  /** Callback when a parameter changes */
  onChange: (params: Record<string, unknown>) => void;
  /** Whether controls are disabled */
  disabled?: boolean;
  /** Parameter names to exclude from rendering (handled separately by parent) */
  excludeParams?: string[];
  /** Whether to show the header */
  showHeader?: boolean;
  /** Additional class names */
  className?: string;
}

export function ModelParameters({
  modelId,
  values,
  onChange,
  disabled = false,
  excludeParams = [],
  showHeader = true,
  className,
}: ModelParametersProps) {
  const model = getModelById(modelId);

  const handleChange = useCallback(
    (name: string, value: unknown) => {
      onChange({ ...values, [name]: value });
    },
    [values, onChange]
  );

  if (!model) {
    return null;
  }

  // Filter out excluded parameters
  const visibleParams = model.parameters.filter(
    (param) => !excludeParams.includes(param.name)
  );

  if (visibleParams.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {showHeader && (
        <div className="text-xs font-medium text-muted-foreground mb-2">
          Parâmetros do {model.name}
        </div>
      )}
      <div className="grid gap-4">
        {visibleParams.map((param) => (
          <ParameterControl
            key={param.name}
            param={param}
            value={values[param.name] ?? param.default}
            onChange={(value) => handleChange(param.name, value)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

interface ParameterControlProps {
  param: ModelParameter;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

function ParameterControl({ param, value, onChange, disabled }: ParameterControlProps) {
  switch (param.type) {
    case 'select':
      return (
        <div className="space-y-2">
          <Label htmlFor={param.name} className="text-sm">
            {param.label}
          </Label>
          <Select
            value={String(value)}
            onValueChange={onChange}
            disabled={disabled}
          >
            <SelectTrigger id={param.name} className="w-full">
              <SelectValue placeholder={`Selecione ${param.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {param.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {param.description && (
            <p className="text-xs text-muted-foreground">{param.description}</p>
          )}
        </div>
      );

    case 'number':
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={param.name} className="text-sm">
              {param.label}
            </Label>
            <span className="text-sm font-medium">{String(value)}</span>
          </div>
          <Slider
            id={param.name}
            value={[Number(value)]}
            onValueChange={([v]) => onChange(v)}
            min={param.min ?? 1}
            max={param.max ?? 10}
            step={param.step ?? 1}
            disabled={disabled}
            className="w-full"
          />
          {param.description && (
            <p className="text-xs text-muted-foreground">{param.description}</p>
          )}
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor={param.name} className="text-sm">
              {param.label}
            </Label>
            {param.description && (
              <p className="text-xs text-muted-foreground">{param.description}</p>
            )}
          </div>
          <Switch
            id={param.name}
            checked={Boolean(value)}
            onCheckedChange={onChange}
            disabled={disabled}
          />
        </div>
      );

    default:
      return null;
  }
}

/**
 * Hook to manage model parameters state
 */
export function useModelParameters(modelId: string) {
  const model = getModelById(modelId);

  // Build initial values from model defaults
  const getDefaultValues = useCallback((): Record<string, unknown> => {
    if (!model) return {};
    return model.parameters.reduce((acc, param) => {
      acc[param.name] = param.default;
      return acc;
    }, {} as Record<string, unknown>);
  }, [model]);

  return {
    model,
    getDefaultValues,
    supportsMask: model?.supportsMask ?? false,
    maxImages: model?.maxImages ?? 4,
    modelType: model?.type ?? 'text-to-image',
  };
}

export default ModelParameters;
