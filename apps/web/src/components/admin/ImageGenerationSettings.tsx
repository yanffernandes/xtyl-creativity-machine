"use client";

/**
 * ImageGenerationSettings Component - Smart Image Generation (Feature 026)
 *
 * Admin panel component for configuring image variation settings:
 * - Number of variations per request (1-3)
 * - Enable/disable variation system
 */

import { useState, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useImageGenerationConfig } from "@/hooks/useImageGenerationConfig";
import { VARIATION_COUNT_OPTIONS } from "@/types/image-variations";
import { cn } from "@/lib/utils";

interface ImageGenerationSettingsProps {
  className?: string;
}

export function ImageGenerationSettings({
  className,
}: ImageGenerationSettingsProps) {
  const { toast } = useToast();
  const { config, isLoading, isError, updateConfig, isUpdating } =
    useImageGenerationConfig();

  // Local state for form
  const [variationCount, setVariationCount] = useState<number>(2);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state with fetched config
  useEffect(() => {
    if (config) {
      setVariationCount(config.count);
      setEnabled(config.enabled);
      setHasChanges(false);
    }
  }, [config]);

  // Track changes
  useEffect(() => {
    if (config) {
      setHasChanges(
        variationCount !== config.count || enabled !== config.enabled
      );
    }
  }, [variationCount, enabled, config]);

  const handleSave = async () => {
    try {
      await updateConfig({
        count: variationCount,
        enabled: enabled,
      });
      toast({
        title: "Configurações salvas",
        description: "As configurações de geração de imagem foram atualizadas.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={cn("space-y-4", className)}>
        <h3 className="text-lg font-medium">Geração de Imagens</h3>
        <p className="text-sm text-destructive">
          Erro ao carregar configurações. Verifique suas permissões de admin.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm", className)}>
      <div className="mb-6">
        <h3 className="text-lg font-medium text-white">Geração de Imagens</h3>
        <p className="text-sm text-white/50 mt-1">
          Configure o comportamento padrão de geração de variações de imagem.
        </p>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4 mb-6">
        <div className="space-y-0.5">
          <Label htmlFor="variations-enabled" className="text-base text-white">
            Sistema de Variações
          </Label>
          <p className="text-sm text-white/50">
            Quando ativado, múltiplas variações são geradas automaticamente.
          </p>
        </div>
        <Switch
          id="variations-enabled"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
      </div>

      {/* Variation Count Selection */}
      <div className={cn("space-y-4 mb-6", !enabled && "opacity-50 pointer-events-none")}>
        <Label className="text-white">Número de variações por geração</Label>
        <RadioGroup
          value={String(variationCount)}
          onValueChange={(v) => setVariationCount(Number(v))}
          className="grid gap-4"
        >
          {VARIATION_COUNT_OPTIONS.map((option) => (
            <div
              key={option.value}
              className={cn(
                "flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                variationCount === option.value
                  ? "border-blue-500/50 bg-blue-500/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              )}
              onClick={() => setVariationCount(option.value)}
            >
              <RadioGroupItem
                value={String(option.value)}
                id={`variation-${option.value}`}
              />
              <Label
                htmlFor={`variation-${option.value}`}
                className="flex-1 cursor-pointer text-white"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Info Box */}
      <div className="rounded-lg bg-white/5 border border-white/10 p-4 text-sm mb-6">
        <p className="font-medium mb-2 text-white">Como funciona:</p>
        <ul className="list-disc list-inside space-y-1 text-white/60">
          <li>
            Cada variação usa um modificador de estilo diferente (minimalista,
            vibrante, sofisticado)
          </li>
          <li>
            As variações são geradas em paralelo para reduzir o tempo de espera
          </li>
          <li>
            Usuários podem escolher a variação que melhor atende suas
            necessidades
          </li>
        </ul>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={!hasChanges || isUpdating}
        className="bg-blue-600 text-white hover:bg-blue-700"
      >
        {isUpdating ? "Salvando..." : "Salvar configurações"}
      </Button>
    </div>
  );
}

export default ImageGenerationSettings;
