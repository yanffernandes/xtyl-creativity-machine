import { useState, useEffect, useRef } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Eye, EyeOff, Search, ChevronDown, X } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getModelConfig, getAvailableModels, updateModelConfig, getModelSchema } from '@/lib/api';
import type { AvailableModel, ModelConfig, ModelSchema } from '@/lib/api';

export const Route = createFileRoute('/models')({
  component: ModelsPage,
});

function ModelsPage() {
  const queryClient = useQueryClient();
  const [defaults, setDefaults] = useState<ModelConfig['defaults']>({});
  const [visibleTextModels, setVisibleTextModels] = useState<Set<string>>(new Set());
  const [enabledImageModels, setEnabledImageModels] = useState<Map<string, object>>(new Map());
  const [loadingModelSchema, setLoadingModelSchema] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [textSearch, setTextSearch] = useState('');
  const [imageSearch, setImageSearch] = useState('');
  const [initialized, setInitialized] = useState(false);

  const configQuery = useQuery({
    queryKey: ['models', 'config'],
    queryFn: getModelConfig,
  });

  const availableQuery = useQuery({
    queryKey: ['models', 'available'],
    queryFn: getAvailableModels,
  });

  useEffect(() => {
    if (configQuery.data && !initialized) {
      const config = configQuery.data;
      setDefaults(config.defaults ?? {});
      setVisibleTextModels(new Set(config.visibleTextModels ?? []));

      // Populate enabledImageModels from stored config
      const stored: any[] = config.visibleImageModels ?? [];
      const map = new Map<string, object>();
      for (const item of stored) {
        if (typeof item === 'string') {
          map.set(item, { id: item });
        } else if (item && typeof item === 'object' && item.id) {
          map.set(item.id, item);
        }
      }
      setEnabledImageModels(map);
      setInitialized(true);
    }
  }, [configQuery.data, initialized]);

  const updateMutation = useMutation({
    mutationFn: updateModelConfig,
    onSuccess: () => {
      toast.success('Configuração de modelos salva');
      queryClient.invalidateQueries({ queryKey: ['models'] });
      setHasChanges(false);
    },
    onError: () => {
      toast.error('Erro ao salvar configuração');
    },
  });

  function handleSave() {
    updateMutation.mutate({
      defaults,
      visibleTextModels: Array.from(visibleTextModels),
      visibleImageModels: Array.from(enabledImageModels.values()),
    });
  }

  function setDefault(key: keyof ModelConfig['defaults'], value: string) {
    setDefaults((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }

  function toggleTextModel(id: string) {
    setVisibleTextModels((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setHasChanges(true);
  }

  async function toggleImageModel(model: AvailableModel) {
    if (enabledImageModels.has(model.id)) {
      // Disable: remove from map
      setEnabledImageModels((prev) => {
        const next = new Map(prev);
        next.delete(model.id);
        return next;
      });
      setHasChanges(true);
    } else {
      // Enable: fetch schema then store full config object
      setLoadingModelSchema(model.id);
      try {
        const schema: ModelSchema = await getModelSchema(model.id);
        const modelType = model.id.includes('/edit') ? 'image-to-image' : 'text-to-image';
        const fullConfig = {
          id: model.id,
          name: model.name,
          provider: model.provider,
          modelType,
          supportsMask: schema.supportsMask,
          maxImages: schema.maxImages,
          parameters: schema.parameters,
        };
        setEnabledImageModels((prev) => {
          const next = new Map(prev);
          next.set(model.id, fullConfig);
          return next;
        });
        setHasChanges(true);
      } catch {
        toast.error(`Failed to load schema for ${model.name}`);
      } finally {
        setLoadingModelSchema(null);
      }
    }
  }

  const isLoading = configQuery.isLoading || availableQuery.isLoading;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  const available: AvailableModel[] = availableQuery.data ?? [];
  const textModels = available.filter((m) => m.type === 'text');
  const visionModels = available.filter((m) => m.type === 'text' && m.hasVision);
  const imageModels = available.filter((m) => m.type === 'image');

  const filteredTextModels = textModels.filter(
    (m) =>
      !textSearch ||
      m.name.toLowerCase().includes(textSearch.toLowerCase()) ||
      m.id.toLowerCase().includes(textSearch.toLowerCase()) ||
      m.provider.toLowerCase().includes(textSearch.toLowerCase()),
  );

  const filteredImageModels = imageModels.filter(
    (m) =>
      !imageSearch ||
      m.name.toLowerCase().includes(imageSearch.toLowerCase()) ||
      m.id.toLowerCase().includes(imageSearch.toLowerCase()),
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Models</h1>
            <p className="text-muted-foreground mt-1">
              Configure default models and which ones are visible to users
            </p>
          </div>
          <Button onClick={handleSave} disabled={!hasChanges || updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>

        <Tabs defaultValue="chat">
          <TabsList>
            <TabsTrigger value="chat">Chat &amp; Text</TabsTrigger>
            <TabsTrigger value="image">Image Generation</TabsTrigger>
          </TabsList>

          {/* ── Chat & Text Tab ── */}
          <TabsContent value="chat" className="space-y-6 mt-4">
            {/* Defaults */}
            <Card>
              <CardHeader>
                <CardTitle>Default Models</CardTitle>
                <CardDescription>
                  Models used by default for each function in the chat interface
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <DefaultRow
                  label="Text generation"
                  description="Model used for chat messages and document generation"
                  value={defaults.chat ?? ''}
                  models={textModels}
                  onChange={(v) => setDefault('chat', v)}
                />
                <DefaultRow
                  label="Vision (attachments)"
                  description="Model used to interpret images sent in chat"
                  value={defaults.vision ?? ''}
                  models={visionModels}
                  onChange={(v) => setDefault('vision', v)}
                  badge="vision"
                />
              </CardContent>
            </Card>

            {/* Visibility */}
            <Card>
              <CardHeader>
                <CardTitle>Visible Text Models</CardTitle>
                <CardDescription>
                  {visibleTextModels.size} of {textModels.length} models enabled for users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Filter models..."
                    value={textSearch}
                    onChange={(e) => setTextSearch(e.target.value)}
                  />
                </div>
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {filteredTextModels.map((model) => (
                    <ModelRow
                      key={model.id}
                      model={model}
                      enabled={visibleTextModels.has(model.id)}
                      isDefault={model.id === defaults.chat || model.id === defaults.vision}
                      onToggle={() => toggleTextModel(model.id)}
                    />
                  ))}
                  {filteredTextModels.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">No models found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Image Generation Tab ── */}
          <TabsContent value="image" className="space-y-6 mt-4">
            {/* Default */}
            <Card>
              <CardHeader>
                <CardTitle>Default Model</CardTitle>
                <CardDescription>Model used by default in the Image Studio</CardDescription>
              </CardHeader>
              <CardContent>
                <DefaultRow
                  label="Image generation"
                  description="Default model for text-to-image generation in the Studio"
                  value={defaults.image_generation ?? ''}
                  models={imageModels}
                  onChange={(v) => setDefault('image_generation', v)}
                />
              </CardContent>
            </Card>

            {/* Visibility */}
            <Card>
              <CardHeader>
                <CardTitle>Visible Image Models</CardTitle>
                <CardDescription>
                  {enabledImageModels.size} of {imageModels.length} models enabled for users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Filter models..."
                    value={imageSearch}
                    onChange={(e) => setImageSearch(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  {filteredImageModels.map((model) => (
                    <ModelRow
                      key={model.id}
                      model={model}
                      enabled={enabledImageModels.has(model.id)}
                      isDefault={model.id === defaults.image_generation}
                      isLoading={loadingModelSchema === model.id}
                      onToggle={() => toggleImageModel(model)}
                    />
                  ))}
                  {filteredImageModels.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">No models found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

// ── Sub-components ──────────────────────────────────────────

function SearchableSelect({
  value,
  models,
  onChange,
  placeholder = 'Select model...',
}: {
  value: string;
  models: AvailableModel[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = models.find((m) => m.id === value);

  const filtered = models.filter(
    (m) =>
      !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase()) ||
      m.provider.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleOpen() {
    setOpen(true);
    setSearch('');
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleSelect(id: string) {
    onChange(id);
    setOpen(false);
    setSearch('');
  }

  return (
    <div ref={containerRef} className="relative w-[340px]">
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <span className={selected ? 'text-foreground truncate' : 'text-muted-foreground'}>
          {selected ? selected.name || selected.id : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground ml-2" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          {/* Search input */}
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              className="flex h-9 w-full bg-transparent py-3 pl-2 text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Search models..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No models found</p>
            ) : (
              filtered.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelect(m.id)}
                  className={`flex w-full flex-col items-start rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground ${
                    m.id === value ? 'bg-accent text-accent-foreground' : ''
                  }`}
                >
                  <span className="font-medium">{m.name || m.id}</span>
                  <span className="text-xs text-muted-foreground">{m.id}</span>
                </button>
              ))
            )}
          </div>
          <div className="border-t px-3 py-1.5 text-xs text-muted-foreground">
            {filtered.length} model{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}

function DefaultRow({
  label,
  description,
  value,
  models,
  onChange,
  badge,
}: {
  label: string;
  description: string;
  value: string;
  models: AvailableModel[];
  onChange: (v: string) => void;
  badge?: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{label}</p>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <SearchableSelect value={value} models={models} onChange={onChange} />
    </div>
  );
}

function ModelRow({
  model,
  enabled,
  isDefault,
  isLoading,
  onToggle,
}: {
  model: AvailableModel;
  enabled: boolean;
  isDefault: boolean;
  isLoading?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2.5 gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{model.name || model.id}</p>
          {isDefault && (
            <Badge variant="outline" className="text-xs shrink-0">
              default
            </Badge>
          )}
          {model.hasVision && (
            <Badge variant="secondary" className="text-xs shrink-0">
              vision
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{model.id}</p>
      </div>
      <Button
        variant={enabled ? 'default' : 'outline'}
        size="sm"
        className="shrink-0 gap-1.5"
        onClick={onToggle}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : enabled ? (
          <Eye className="h-3.5 w-3.5" />
        ) : (
          <EyeOff className="h-3.5 w-3.5" />
        )}
        {isLoading ? 'Loading...' : enabled ? 'Visible' : 'Hidden'}
      </Button>
    </div>
  );
}
