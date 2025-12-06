'use client';

// Prevent static generation - requires runtime environment variables
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useAdminMemoryConfig, useAdminModels } from '@/hooks/use-admin';
import {
  Brain,
  Loader2,
  AlertCircle,
  Check,
  RefreshCw,
  Users,
  FolderOpen,
  Database,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Category display names
const CATEGORY_LABELS: Record<string, string> = {
  personal: 'Personal',
  professional: 'Professional',
  preference: 'Preferences',
  plan: 'Plans',
  health: 'Health',
  other: 'Other',
};

// Category icons
const CATEGORY_ICONS: Record<string, string> = {
  personal: '👤',
  professional: '💼',
  preference: '🎯',
  plan: '📅',
  health: '💪',
  other: '📝',
};

export default function AdminMemoryPage() {
  const {
    config,
    isLoading,
    isSaving,
    error,
    fetchConfig,
    updateConfig,
  } = useAdminMemoryConfig();

  const { availableModels, isLoadingModels } = useAdminModels();

  const [localChanges, setLocalChanges] = useState<{
    extraction_model?: string;
    system_enabled?: boolean;
    max_memories_per_project?: number;
  }>({});
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Merge local changes with server values
  const currentConfig = config
    ? {
        extraction_model: localChanges.extraction_model ?? config.extraction_model,
        system_enabled: localChanges.system_enabled ?? config.system_enabled,
        max_memories_per_project: localChanges.max_memories_per_project ?? config.max_memories_per_project,
      }
    : null;

  const handleSave = async () => {
    if (Object.keys(localChanges).length === 0) return;
    const result = await updateConfig(localChanges);
    if (result.success) {
      setLocalChanges({});
      setSaveSuccess('Memory configuration saved successfully');
      setTimeout(() => setSaveSuccess(null), 3000);
    }
  };

  const hasChanges = Object.keys(localChanges).length > 0;

  // Filter to only text models for extraction
  const textModels = availableModels.filter(
    (m) => m.output_modalities?.includes('text') || !m.output_modalities?.includes('image')
  );

  return (
    <>
      <AdminHeader title="Memory" description="AI memory system configuration" />

      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
              <Brain className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Memory System</h2>
              <p className="text-sm text-white/50">Configure AI memory and extraction settings</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchConfig()}
              disabled={isLoading}
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </div>

        {/* Success Message */}
        {saveSuccess && (
          <div className="mb-6 rounded-lg border border-green-500/20 bg-green-500/10 p-4">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-400" />
              <p className="text-sm text-green-400">{saveSuccess}</p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !config && (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          </div>
        )}

        {/* Content */}
        {config && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Configuration Card */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <h3 className="mb-6 text-lg font-medium text-white">Configuration</h3>

              <div className="space-y-6">
                {/* System Enabled Toggle */}
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="space-y-1">
                    <Label className="text-white">Enable Memory System</Label>
                    <p className="text-sm text-white/50">
                      When enabled, the assistant will remember facts about users
                    </p>
                  </div>
                  <Switch
                    checked={currentConfig?.system_enabled ?? false}
                    onCheckedChange={(checked) =>
                      setLocalChanges((prev) => ({ ...prev, system_enabled: checked }))
                    }
                  />
                </div>

                {/* Extraction Model */}
                <div className="space-y-2">
                  <Label className="text-white">Extraction Model</Label>
                  <Select
                    value={currentConfig?.extraction_model ?? ''}
                    onValueChange={(value) =>
                      setLocalChanges((prev) => ({ ...prev, extraction_model: value }))
                    }
                    disabled={isLoadingModels}
                  >
                    <SelectTrigger className="border-white/10 bg-white/5 text-white">
                      <SelectValue placeholder="Select a model..." />
                    </SelectTrigger>
                    <SelectContent>
                      {textModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name || model.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-white/50">
                    Model used for extracting and managing user memories
                  </p>
                </div>

                {/* Max Memories */}
                <div className="space-y-2">
                  <Label className="text-white">Max Memories per Project</Label>
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    value={currentConfig?.max_memories_per_project ?? 100}
                    onChange={(e) =>
                      setLocalChanges((prev) => ({
                        ...prev,
                        max_memories_per_project: parseInt(e.target.value, 10) || 100,
                      }))
                    }
                    className="border-white/10 bg-white/5 text-white"
                  />
                  <p className="text-sm text-white/50">
                    Maximum number of memories per user per project (1-1000)
                  </p>
                </div>
              </div>
            </div>

            {/* Statistics Card */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <h3 className="mb-6 text-lg font-medium text-white">Statistics</h3>

              {/* Main Stats */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <StatCard
                  label="Total Memories"
                  value={config.statistics.total_memories}
                  icon={Database}
                  color="purple"
                />
                <StatCard
                  label="Active Users"
                  value={config.statistics.unique_users}
                  icon={Users}
                  color="blue"
                />
                <StatCard
                  label="Projects"
                  value={config.statistics.unique_projects}
                  icon={FolderOpen}
                  color="green"
                />
                <StatCard
                  label="Avg per User"
                  value={config.statistics.avg_memories_per_user}
                  icon={BarChart3}
                  color="amber"
                />
              </div>

              {/* Category Breakdown */}
              <div>
                <h4 className="mb-3 text-sm font-medium text-white/70">By Category</h4>
                <div className="space-y-2">
                  {Object.entries(config.statistics.by_category).length === 0 ? (
                    <p className="text-sm text-white/50">No memories yet</p>
                  ) : (
                    Object.entries(config.statistics.by_category).map(([category, count]) => (
                      <div
                        key={category}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span>{CATEGORY_ICONS[category] || '📝'}</span>
                          <span className="text-sm text-white">
                            {CATEGORY_LABELS[category] || category}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-white/70">{count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'purple' | 'blue' | 'green' | 'amber';
}) {
  const colorClasses = {
    purple: 'bg-purple-500/20 text-purple-400',
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    amber: 'bg-amber-500/20 text-amber-400',
  };

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', colorClasses[color])}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold text-white">{value}</p>
          <p className="text-xs text-white/50">{label}</p>
        </div>
      </div>
    </div>
  );
}
