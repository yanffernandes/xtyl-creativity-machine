'use client';

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
import type { ModelParameter } from '@/types/image-studio';

interface ModelParametersProps {
  parameters: ModelParameter[];
  modelName?: string;
  values: Record<string, unknown>;
  onChange: (params: Record<string, unknown>) => void;
  disabled?: boolean;
  excludeParams?: string[];
  showHeader?: boolean;
  className?: string;
}

export function ModelParameters({
  parameters,
  modelName,
  values,
  onChange,
  disabled = false,
  excludeParams = [],
  showHeader = true,
  className,
}: ModelParametersProps) {
  const handleChange = useCallback(
    (name: string, value: unknown) => {
      onChange({ ...values, [name]: value });
    },
    [values, onChange],
  );

  const visibleParams = parameters.filter((p) => !excludeParams.includes(p.name));

  if (visibleParams.length === 0) return null;

  return (
    <div className={cn('space-y-4', className)}>
      {showHeader && modelName && (
        <div className="text-xs font-medium text-muted-foreground mb-2">
          Parâmetros do {modelName}
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
          <Select value={String(value)} onValueChange={onChange} disabled={disabled}>
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

export default ModelParameters;
