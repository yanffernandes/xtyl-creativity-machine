"use client";

/**
 * Model Selector Component
 *
 * Searchable model selector using Command component.
 * Fetches models from appropriate API endpoint based on type:
 * - /chat/models for text models
 * - /image-generation/models for image models
 */

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Image as ImageIcon, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { glassModalClasses } from "@/lib/glass-utils";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";

interface Model {
  id: string;
  name: string;
  provider?: string;
}

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  type: "text" | "image";
  disabled?: boolean;
  className?: string;
}

// Categorize models by their ID prefix
const getModelProvider = (modelId: string): string => {
  if (modelId.startsWith("anthropic/")) return "Anthropic";
  if (modelId.startsWith("openai/")) return "OpenAI";
  if (modelId.startsWith("google/")) return "Google";
  if (modelId.startsWith("x-ai/")) return "xAI";
  if (modelId.startsWith("black-forest-labs/")) return "Black Forest Labs";
  if (modelId.startsWith("stability-ai/")) return "Stability AI";
  if (modelId.startsWith("meta/")) return "Meta";
  if (modelId.startsWith("ideogram/")) return "Ideogram";
  if (modelId.startsWith("recraft/")) return "Recraft";
  return "Outro";
};

// Get display name from model ID
const getDisplayName = (modelId: string, modelName?: string): string => {
  if (modelName) return modelName;
  const parts = modelId.split("/");
  return parts[parts.length - 1]
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function ModelSelector({
  value,
  onChange,
  type,
  disabled = false,
  className
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const { token, isLoading: authLoading } = useAuthStore();

  useEffect(() => {
    if (authLoading) return;
    if (token) {
      fetchModels();
    }
  }, [token, authLoading, type]);

  const fetchModels = async () => {
    try {
      setLoading(true);

      // Use different endpoint based on type - API returns only relevant models
      const endpoint = type === "image" ? "/image-generation/models" : "/chat/models";
      const response = await api.get(endpoint);

      // Map API response to our model format
      const fetchedModels: Model[] = response.data.map((m: any) => ({
        id: m.id,
        name: m.name || getDisplayName(m.id),
        provider: getModelProvider(m.id),
      }));

      setModels(fetchedModels);

      // Auto-select first model if no value is set
      if (!value && fetchedModels.length > 0) {
        onChange(fetchedModels[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch models", error);
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  const selectedModel = models.find(m => m.id === value);
  const displayValue = selectedModel?.name || (value ? getDisplayName(value) : "Select model...");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn(
            "w-full justify-between",
            "bg-white/[0.04] border-white/[0.1]",
            "hover:bg-white/[0.08] hover:border-primary/30",
            "text-sm h-10",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            {type === "image" ? (
              <ImageIcon className="h-4 w-4 text-pink-500 shrink-0" />
            ) : (
              <Type className="h-4 w-4 text-purple-500 shrink-0" />
            )}
            <span className="truncate">
              {loading ? "Carregando..." : displayValue}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-[300px] p-0",
          glassModalClasses
        )}
        align="start"
      >
        <Command className="bg-transparent">
          <CommandInput
            placeholder="Buscar modelos..."
            className="border-0 focus:ring-0"
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>Nenhum modelo encontrado.</CommandEmpty>

            {models.length > 0 && (
              <CommandGroup heading={type === "image" ? "Modelos de Imagem" : "Modelos de Texto"}>
                {models.map((model) => (
                  <CommandItem
                    key={model.id}
                    value={model.name}
                    onSelect={() => {
                      onChange(model.id);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        value === model.id ? "opacity-100 text-primary" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="truncate">{model.name}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {model.provider}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
