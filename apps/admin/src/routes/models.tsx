import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getModelConfig, getAvailableModels, updateModelConfig } from '@/lib/api';
import type { AvailableModel, ModelConfig } from '@/lib/api';

export const Route = createFileRoute('/models')({
  component: ModelsPage,
});

function ModelsPage() {
  const queryClient = useQueryClient();
  const [defaults, setDefaults] = useState<Record<string, string>>({});
  const [visibleTextModels, setVisibleTextModels] = useState<Set<string>>(
    new Set(),
  );
  const [visibleImageModels, setVisibleImageModels] = useState<Set<string>>(
    new Set(),
  );
  const [hasChanges, setHasChanges] = useState(false);

  const configQuery = useQuery({
    queryKey: ['models', 'config'],
    queryFn: () => getModelConfig(),
  });

  const availableQuery = useQuery({
    queryKey: ['models', 'available'],
    queryFn: () => getAvailableModels(),
  });

  // Sync state when data loads
  if (configQuery.data && !hasChanges) {
    const config = configQuery.data;
    if (Object.keys(defaults).length === 0) {
      setDefaults({
        chat: config.defaultTextModel,
        image_generation: config.defaultImageModel,
      });
      setVisibleTextModels(new Set(config.enabledTextModels));
      setVisibleImageModels(new Set(config.enabledImageModels));
    }
  }

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ModelConfig>) => updateModelConfig(data),
    onSuccess: () => {
      toast.success('Model configuration updated successfully');
      queryClient.invalidateQueries({ queryKey: ['models'] });
      setHasChanges(false);
    },
    onError: () => {
      toast.error('Failed to update model configuration');
    },
  });

  function handleSave() {
    updateMutation.mutate({
      defaultTextModel: defaults['chat'] || '',
      defaultImageModel: defaults['image_generation'] || '',
      enabledTextModels: Array.from(visibleTextModels),
      enabledImageModels: Array.from(visibleImageModels),
    });
  }

  function toggleTextModel(modelId: string) {
    setVisibleTextModels((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) {
        next.delete(modelId);
      } else {
        next.add(modelId);
      }
      return next;
    });
    setHasChanges(true);
  }

  function toggleImageModel(modelId: string) {
    setVisibleImageModels((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) {
        next.delete(modelId);
      } else {
        next.add(modelId);
      }
      return next;
    });
    setHasChanges(true);
  }

  const isLoading = configQuery.isLoading || availableQuery.isLoading;
  const isError = configQuery.isError || availableQuery.isError;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (isError) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">
            Failed to load model configuration.
          </p>
        </div>
      </AdminLayout>
    );
  }

  const available: AvailableModel[] = availableQuery.data ?? [];
  const textModels = available.filter((m) => m.type === 'text');
  const imageModels = available.filter((m) => m.type === 'image');

  const defaultCategories = [
    { key: 'chat', label: 'Default Text Model', models: textModels },
    { key: 'image_generation', label: 'Default Image Model', models: imageModels },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Model Configuration
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure default models and visibility settings
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

        <Tabs defaultValue="defaults">
          <TabsList>
            <TabsTrigger value="defaults">Default Models</TabsTrigger>
            <TabsTrigger value="text">Text Models</TabsTrigger>
            <TabsTrigger value="image">Image Models</TabsTrigger>
          </TabsList>

          <TabsContent value="defaults" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Default Model Selection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {defaultCategories.map((category) => (
                  <div
                    key={category.key}
                    className="flex items-center justify-between gap-4"
                  >
                    <label className="text-sm font-medium min-w-[160px]">
                      {category.label}
                    </label>
                    <Select
                      value={defaults[category.key] || ''}
                      onValueChange={(value) => {
                        setDefaults((prev) => ({
                          ...prev,
                          [category.key]: value,
                        }));
                        setHasChanges(true);
                      }}
                    >
                      <SelectTrigger className="w-[400px]">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {category.models.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name || model.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Text Model Visibility</CardTitle>
              </CardHeader>
              <CardContent>
                {textModels.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No text models available.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {textModels.map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {model.name || model.id}
                          </p>
                          {model.provider && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {model.provider}
                            </p>
                          )}
                        </div>
                        <Button
                          variant={
                            visibleTextModels.has(model.id)
                              ? 'default'
                              : 'outline'
                          }
                          size="sm"
                          onClick={() => toggleTextModel(model.id)}
                        >
                          {visibleTextModels.has(model.id)
                            ? 'Visible'
                            : 'Hidden'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="image" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Image Model Visibility</CardTitle>
              </CardHeader>
              <CardContent>
                {imageModels.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No image models available.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {imageModels.map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {model.name || model.id}
                          </p>
                          {model.provider && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {model.provider}
                            </p>
                          )}
                        </div>
                        <Button
                          variant={
                            visibleImageModels.has(model.id)
                              ? 'default'
                              : 'outline'
                          }
                          size="sm"
                          onClick={() => toggleImageModel(model.id)}
                        >
                          {visibleImageModels.has(model.id)
                            ? 'Visible'
                            : 'Hidden'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
