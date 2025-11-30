'use client';

// Prevent static generation - requires runtime environment variables
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useAdminSettings, LimitSettings, FeatureSettings } from '@/hooks/use-admin';
import {
  Settings,
  Sliders,
  ToggleLeft,
  Loader2,
  AlertCircle,
  Check,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export default function AdminSettingsPage() {
  const {
    settings,
    isLoading,
    isSaving,
    error,
    fetchSettings,
    updateLimits,
    updateFeatures,
  } = useAdminSettings();

  const [localLimits, setLocalLimits] = useState<Partial<LimitSettings>>({});
  const [localFeatures, setLocalFeatures] = useState<Partial<FeatureSettings>>({});
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Merge local changes with server values
  const currentLimits = settings ? { ...settings.limits, ...localLimits } : null;
  const currentFeatures = settings ? { ...settings.features, ...localFeatures } : null;

  const handleLimitChange = (key: keyof LimitSettings, value: number) => {
    setLocalLimits((prev) => ({ ...prev, [key]: value }));
  };

  const handleFeatureChange = (key: keyof FeatureSettings, value: boolean) => {
    setLocalFeatures((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveLimits = async () => {
    if (Object.keys(localLimits).length === 0) return;
    const result = await updateLimits(localLimits);
    if (result.success) {
      setLocalLimits({});
      setSaveSuccess('Limits saved successfully');
      setTimeout(() => setSaveSuccess(null), 3000);
    }
  };

  const handleSaveFeatures = async () => {
    if (Object.keys(localFeatures).length === 0) return;
    const result = await updateFeatures(localFeatures);
    if (result.success) {
      setLocalFeatures({});
      setSaveSuccess('Features saved successfully');
      setTimeout(() => setSaveSuccess(null), 3000);
    }
  };

  const hasLimitChanges = Object.keys(localLimits).length > 0;
  const hasFeatureChanges = Object.keys(localFeatures).length > 0;

  return (
    <>
      <AdminHeader title="Settings" description="System configuration" />

      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
              <Settings className="h-5 w-5 text-white/70" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">System Settings</h2>
              <p className="text-sm text-white/50">Configure global limits and features</p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSettings()}
            disabled={isLoading}
            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>
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
        {isLoading && !settings && (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        )}

        {/* Settings Tabs */}
        {settings && (
          <Tabs defaultValue="limits" className="space-y-6">
            <TabsList className="border-white/10 bg-white/5">
              <TabsTrigger
                value="limits"
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white"
              >
                <Sliders className="mr-2 h-4 w-4" />
                Limits
              </TabsTrigger>
              <TabsTrigger
                value="features"
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white"
              >
                <ToggleLeft className="mr-2 h-4 w-4" />
                Feature Flags
              </TabsTrigger>
            </TabsList>

            {/* Limits Tab */}
            <TabsContent value="limits">
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-white">Resource Limits</h3>
                    <p className="text-sm text-white/50">
                      Configure maximum resource limits for users and workspaces
                    </p>
                  </div>
                  <Button
                    onClick={handleSaveLimits}
                    disabled={!hasLimitChanges || isSaving}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  {currentLimits && (
                    <>
                      <LimitField
                        label="Max Workspaces per User"
                        description="Maximum number of workspaces a user can own"
                        value={currentLimits.max_workspaces_per_user}
                        onChange={(v) => handleLimitChange('max_workspaces_per_user', v)}
                      />
                      <LimitField
                        label="Max Members per Workspace"
                        description="Maximum number of members in a workspace"
                        value={currentLimits.max_members_per_workspace}
                        onChange={(v) => handleLimitChange('max_members_per_workspace', v)}
                      />
                      <LimitField
                        label="Max Projects per Workspace"
                        description="Maximum number of projects in a workspace"
                        value={currentLimits.max_projects_per_workspace}
                        onChange={(v) => handleLimitChange('max_projects_per_workspace', v)}
                      />
                      <LimitField
                        label="Max Documents per Project"
                        description="Maximum number of documents in a project"
                        value={currentLimits.max_documents_per_project}
                        onChange={(v) => handleLimitChange('max_documents_per_project', v)}
                      />
                      <LimitField
                        label="Max File Size (MB)"
                        description="Maximum file upload size in megabytes"
                        value={currentLimits.max_file_size_mb}
                        onChange={(v) => handleLimitChange('max_file_size_mb', v)}
                      />
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Features Tab */}
            <TabsContent value="features">
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-white">Feature Flags</h3>
                    <p className="text-sm text-white/50">
                      Enable or disable platform features globally
                    </p>
                  </div>
                  <Button
                    onClick={handleSaveFeatures}
                    disabled={!hasFeatureChanges || isSaving}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </div>

                <div className="space-y-6">
                  {currentFeatures && (
                    <>
                      <FeatureToggle
                        label="Image Generation"
                        description="Enable AI image generation feature"
                        enabled={currentFeatures.enable_image_generation}
                        onChange={(v) => handleFeatureChange('enable_image_generation', v)}
                      />
                      <FeatureToggle
                        label="Document Analysis"
                        description="Enable AI document analysis feature"
                        enabled={currentFeatures.enable_document_analysis}
                        onChange={(v) => handleFeatureChange('enable_document_analysis', v)}
                      />
                      <FeatureToggle
                        label="RAG (Retrieval Augmented Generation)"
                        description="Enable RAG for context-aware responses"
                        enabled={currentFeatures.enable_rag}
                        onChange={(v) => handleFeatureChange('enable_rag', v)}
                      />
                      <FeatureToggle
                        label="Workflows"
                        description="Enable workflow automation feature"
                        enabled={currentFeatures.enable_workflows}
                        onChange={(v) => handleFeatureChange('enable_workflows', v)}
                      />
                      <FeatureToggle
                        label="Public Sharing"
                        description="Allow users to share content publicly"
                        enabled={currentFeatures.enable_public_sharing}
                        onChange={(v) => handleFeatureChange('enable_public_sharing', v)}
                      />
                    </>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  );
}

// Limit Field Component
function LimitField({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-white">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        className="border-white/10 bg-white/5 text-white"
      />
      <p className="text-sm text-white/50">{description}</p>
    </div>
  );
}

// Feature Toggle Component
function FeatureToggle({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="space-y-1">
        <Label className="text-white">{label}</Label>
        <p className="text-sm text-white/50">{description}</p>
      </div>
      <Switch checked={enabled} onCheckedChange={onChange} />
    </div>
  );
}
