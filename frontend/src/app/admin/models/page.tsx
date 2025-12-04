'use client';

// Prevent static generation - requires runtime environment variables
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { ModelConfigForm } from '@/components/admin/ModelConfigForm';
import { useAdminModels, AvailableModel } from '@/hooks/use-admin';
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Cpu,
  Eye,
  Check,
  MessageSquare,
  Image as ImageIcon,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type TabType = 'defaults' | 'text' | 'image';

export default function AdminModelsPage() {
  const {
    config,
    availableModels,
    isLoading,
    isLoadingModels,
    isSaving,
    error,
    fetchConfig,
    fetchAvailableModels,
    updateDefaultModel,
    updateFallbackModel,
    updateVisibleTextModels,
    updateVisibleImageModels,
  } = useAdminModels();

  const [activeTab, setActiveTab] = useState<TabType>('defaults');

  // Filter models by output modality
  const textModels = useMemo(() => {
    return availableModels.filter(
      (m) => m.output_modalities?.includes('text') || !m.output_modalities?.includes('image')
    );
  }, [availableModels]);

  const imageModels = useMemo(() => {
    return availableModels.filter((m) => m.output_modalities?.includes('image'));
  }, [availableModels]);

  // Loading state
  if (isLoading) {
    return (
      <>
        <AdminHeader title="AI Models" description="Configure AI model defaults" />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            <p className="text-white/70">Loading configuration...</p>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (error && !config) {
    return (
      <>
        <AdminHeader title="AI Models" description="Configure AI model defaults" />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="mx-4 max-w-md rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center backdrop-blur-xl">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h2 className="mb-2 text-xl font-semibold text-white">Error Loading Configuration</h2>
            <p className="mb-4 text-white/70">{error}</p>
            <Button onClick={fetchConfig} className="bg-white/10 text-white hover:bg-white/20">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="AI Models" description="Configure AI model defaults for all system features" />

      <div className="p-6">
        {/* Header Actions */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
              <Cpu className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Model Configuration</h2>
              <p className="text-sm text-white/50">
                Configure default and visible models for each system feature
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchConfig();
              fetchAvailableModels();
            }}
            disabled={isLoading || isLoadingModels}
            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            <RefreshCw
              className={cn('mr-2 h-4 w-4', (isLoading || isLoadingModels) && 'animate-spin')}
            />
            Refresh
          </Button>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('defaults')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'defaults'
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-white/50 hover:text-white'
            )}
          >
            <Cpu className="h-4 w-4" />
            Default Models
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'text'
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-white/50 hover:text-white'
            )}
          >
            <MessageSquare className="h-4 w-4" />
            Text Models
            {config && (
              <Badge variant="outline" className="ml-1 border-white/20 text-xs">
                {config.visible_text_models?.length || 0}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'image'
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-white/50 hover:text-white'
            )}
          >
            <ImageIcon className="h-4 w-4" />
            Image Models
            {config && (
              <Badge variant="outline" className="ml-1 border-white/20 text-xs">
                {config.visible_image_models?.length || 0}
              </Badge>
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'defaults' && config && (
          <ModelConfigForm
            defaults={config.defaults}
            fallbacks={config.fallbacks}
            availableModels={availableModels}
            isLoadingModels={isLoadingModels}
            onUpdateDefault={updateDefaultModel}
            onUpdateFallback={updateFallbackModel}
          />
        )}

        {activeTab === 'text' && config && (
          <VisibleModelsConfig
            title="Visible Text Models"
            description="Select which text/LLM models users can choose from in the AI assistant"
            visibleModels={config.visible_text_models || []}
            availableModels={textModels}
            isLoadingModels={isLoadingModels}
            isSaving={isSaving}
            onUpdate={async (modelIds) => {
              const result = await updateVisibleTextModels(modelIds);
              if (result.success) {
                toast.success('Text models updated successfully');
              } else {
                toast.error(result.error || 'Failed to update text models');
              }
              return result;
            }}
          />
        )}

        {activeTab === 'image' && config && (
          <VisibleModelsConfig
            title="Visible Image Models"
            description="Select which image generation models users can choose from"
            visibleModels={config.visible_image_models || []}
            availableModels={imageModels}
            isLoadingModels={isLoadingModels}
            isSaving={isSaving}
            onUpdate={async (modelIds) => {
              const result = await updateVisibleImageModels(modelIds);
              if (result.success) {
                toast.success('Image models updated successfully');
              } else {
                toast.error(result.error || 'Failed to update image models');
              }
              return result;
            }}
          />
        )}

        {/* Status Banner */}
        {error && config && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// =============================================================================
// Visible Models Configuration Component
// =============================================================================

interface VisibleModelsConfigProps {
  title: string;
  description: string;
  visibleModels: string[];
  availableModels: AvailableModel[];
  isLoadingModels: boolean;
  isSaving: boolean;
  onUpdate: (modelIds: string[]) => Promise<unknown>;
}

function VisibleModelsConfig({
  title,
  description,
  visibleModels,
  availableModels,
  isLoadingModels,
  isSaving,
  onUpdate,
}: VisibleModelsConfigProps) {
  const [search, setSearch] = useState('');
  const [pendingChanges, setPendingChanges] = useState<string[]>(visibleModels);
  const [hasChanges, setHasChanges] = useState(false);

  // Update pending changes when visibleModels changes (e.g., after save)
  useEffect(() => {
    setPendingChanges(visibleModels);
    setHasChanges(false);
  }, [visibleModels]);

  const filteredModels = useMemo(() => {
    return availableModels.filter(
      (m) =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.id.toLowerCase().includes(search.toLowerCase())
    );
  }, [availableModels, search]);

  const toggleModel = (modelId: string) => {
    setPendingChanges((prev) => {
      const newList = prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId];
      setHasChanges(JSON.stringify(newList.sort()) !== JSON.stringify([...visibleModels].sort()));
      return newList;
    });
  };

  const handleSave = async () => {
    if (pendingChanges.length === 0) {
      toast.error('At least one model must be visible');
      return;
    }
    await onUpdate(pendingChanges);
    setHasChanges(false);
  };

  const handleCancel = () => {
    setPendingChanges(visibleModels);
    setHasChanges(false);
  };

  // Format pricing for display
  const formatPricing = (model: AvailableModel) => {
    if (!model.pricing_prompt && !model.pricing_completion) return null;
    const prompt = model.pricing_prompt ? `$${parseFloat(model.pricing_prompt).toFixed(4)}/1K` : '';
    const completion = model.pricing_completion ? `$${parseFloat(model.pricing_completion).toFixed(4)}/1K` : '';
    if (prompt && completion) return `${prompt} in / ${completion} out`;
    return prompt || completion;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-white">{title}</h3>
            <p className="text-sm text-white/50">{description}</p>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || pendingChanges.length === 0}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Input
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-white/10 bg-white/5 pl-9 text-white placeholder:text-white/40"
          />
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        </div>

        {/* Models Grid */}
        {isLoadingModels ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-white/50" />
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Eye className="mb-4 h-12 w-12 text-white/20" />
            <p className="text-white/50">No models found</p>
            {search && (
              <p className="mt-1 text-sm text-white/30">Try adjusting your search term</p>
            )}
          </div>
        ) : (
          <div className="max-h-[500px] space-y-2 overflow-y-auto">
            {filteredModels.slice(0, 100).map((model) => {
              const isSelected = pendingChanges.includes(model.id);
              const pricing = formatPricing(model);
              return (
                <button
                  key={model.id}
                  onClick={() => toggleModel(model.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors',
                    isSelected
                      ? 'border-blue-500/30 bg-blue-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white truncate">{model.name}</p>
                      {model.top_provider && (
                        <Badge variant="outline" className="border-white/20 text-xs text-white/50 shrink-0">
                          {model.top_provider}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-white/50 truncate">{model.id}</p>
                    {pricing && (
                      <p className="mt-1 text-xs text-green-400/70">{pricing}</p>
                    )}
                  </div>
                  <div
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-md shrink-0 ml-3',
                      isSelected ? 'bg-blue-500 text-white' : 'bg-white/10'
                    )}
                  >
                    {isSelected && <Check className="h-4 w-4" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Selected Count */}
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
          <p className="text-sm text-white/50">
            {pendingChanges.length} model{pendingChanges.length !== 1 ? 's' : ''} selected
            {pendingChanges.length === 0 && (
              <span className="ml-2 text-red-400">(minimum 1 required)</span>
            )}
          </p>
          {hasChanges && (
            <Badge variant="outline" className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400">
              Unsaved changes
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
