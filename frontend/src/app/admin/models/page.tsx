'use client';

import { useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { ModelConfigForm } from '@/components/admin/ModelConfigForm';
import { useAdminModels } from '@/hooks/use-admin';
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Cpu,
  Eye,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
    updateVisibleModels,
  } = useAdminModels();

  const [activeTab, setActiveTab] = useState<'defaults' | 'visible'>('defaults');

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
                Configure default and fallback models for each system feature
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
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'defaults'
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-white/50 hover:text-white'
            )}
          >
            Default Models
          </button>
          <button
            onClick={() => setActiveTab('visible')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'visible'
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-white/50 hover:text-white'
            )}
          >
            Visible Models
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

        {activeTab === 'visible' && config && (
          <VisibleModelsConfig
            visibleModels={config.visible_models}
            availableModels={availableModels}
            isLoadingModels={isLoadingModels}
            isSaving={isSaving}
            onUpdate={updateVisibleModels}
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
// Visible Models Configuration
// =============================================================================

interface VisibleModelsConfigProps {
  visibleModels: string[];
  availableModels: { id: string; name: string }[];
  isLoadingModels: boolean;
  isSaving: boolean;
  onUpdate: (modelIds: string[]) => Promise<unknown>;
}

function VisibleModelsConfig({
  visibleModels,
  availableModels,
  isLoadingModels,
  isSaving,
  onUpdate,
}: VisibleModelsConfigProps) {
  const [search, setSearch] = useState('');
  const [pendingChanges, setPendingChanges] = useState<string[]>(visibleModels);
  const [hasChanges, setHasChanges] = useState(false);

  const filteredModels = availableModels.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase())
  );

  const toggleModel = (modelId: string) => {
    setPendingChanges((prev) => {
      const newList = prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId];
      setHasChanges(JSON.stringify(newList.sort()) !== JSON.stringify(visibleModels.sort()));
      return newList;
    });
  };

  const handleSave = async () => {
    await onUpdate(pendingChanges);
    setHasChanges(false);
  };

  const handleCancel = () => {
    setPendingChanges(visibleModels);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-white">User-Visible Models</h3>
            <p className="text-sm text-white/50">
              Select which models users can choose from in the model selector
            </p>
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
                  disabled={isSaving}
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
          <Eye className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        </div>

        {/* Models Grid */}
        {isLoadingModels ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-white/50" />
          </div>
        ) : (
          <div className="max-h-[500px] space-y-2 overflow-y-auto">
            {filteredModels.slice(0, 100).map((model) => {
              const isSelected = pendingChanges.includes(model.id);
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
                  <div className="flex-1">
                    <p className="font-medium text-white">{model.name}</p>
                    <p className="text-xs text-white/50">{model.id}</p>
                  </div>
                  <div
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-md',
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
