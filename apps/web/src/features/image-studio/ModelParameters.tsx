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
import { getModelById, type ModelParameter } from '@/lib/modelConfig';

interface ModelParametersProps {
  modelId: string;
  values: Record<string, unknown>;
  onChange: (params: Record<string, unknown>) => void;
  disabled?: boolean;
  excludeParams?: string[];
  showHeader?: boolean;
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

  if (!model) return null;

  const visibleParams = model.parameters.filter((p) => !excludeParams.includes(p.name));
  if (visibleParams.length === 0) return null;

  return (
    <div className={cn('space-y-4', className)}>
      {showHeader && (
        <div className="text-xs font-medium text-muted-foreground mb-2">
          Parametros do {model.name}
        </div>
      )}
      <div className="grid gap-4">
        {visibleParams.map((param) => (
          <ParameterControl
            key={param.name}
            param={param}
            value={values[param.name] ?? param.default}
            onChange={(v) => handleChange(param.name, v)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

function ParameterControl({
  param,
  value,
  onChange,
  disabled,
}: {
  param: ModelParameter;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  switch (param.type) {
    case 'select':
      return (
        <div className="space-y-2">
          <Label htmlFor={param.name} className="text-sm">
            {param.label}
          </Label>
          <Select value={String(value)} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger id={param.name} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {param.options?.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
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
            <Label className="text-sm">{param.label}</Label>
            <span className="text-sm font-medium">{String(value)}</span>
          </div>
          <Slider
            value={[Number(value)]}
            onValueChange={([v]: number[]) => onChange(v)}
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
            <Label className="text-sm">{param.label}</Label>
            {param.description && (
              <p className="text-xs text-muted-foreground">{param.description}</p>
            )}
          </div>
          <Switch checked={Boolean(value)} onCheckedChange={onChange} disabled={disabled} />
        </div>
      );

    default:
      return null;
  }
}
