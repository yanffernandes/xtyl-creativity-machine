import { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSystemSettings, updateSystemSettings } from '@/lib/api';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

interface Limits {
  max_workspaces_per_user?: number;
  max_members_per_workspace?: number;
  max_projects_per_workspace?: number;
  max_documents_per_project?: number;
  max_file_size_mb?: number;
}

interface Features {
  enable_image_generation?: boolean;
  enable_document_analysis?: boolean;
  enable_rag?: boolean;
  enable_workflows?: boolean;
  enable_public_sharing?: boolean;
}

function SettingsPage() {
  const queryClient = useQueryClient();
  const [limits, setLimits] = useState<Limits>({});
  const [features, setFeatures] = useState<Features>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ['system-settings'],
    queryFn: getSystemSettings,
  });

  useEffect(() => {
    if (settingsQuery.data && !initialized) {
      const data = settingsQuery.data as any;
      setLimits(data.limits ?? {});
      setFeatures(data.features ?? {});
      setInitialized(true);
    }
  }, [settingsQuery.data, initialized]);

  const updateMutation = useMutation({
    mutationFn: (updates: Record<string, any>) => updateSystemSettings(updates),
    onSuccess: () => {
      toast.success('Settings saved');
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      setHasChanges(false);
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });

  function setLimit(key: keyof Limits, value: string) {
    setLimits((prev) => ({ ...prev, [key]: value === '' ? undefined : Number(value) }));
    setHasChanges(true);
  }

  function setFeature(key: keyof Features, value: boolean) {
    setFeatures((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }

  function handleSave() {
    updateMutation.mutate({ limits, features });
  }

  if (settingsQuery.isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure system-wide limits and feature flags
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

        <Tabs defaultValue="limits">
          <TabsList>
            <TabsTrigger value="limits">Limits</TabsTrigger>
            <TabsTrigger value="features">Feature Flags</TabsTrigger>
          </TabsList>

          {/* ── Limits ── */}
          <TabsContent value="limits" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Usage Limits</CardTitle>
                <CardDescription>
                  Maximum values enforced across the platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <LimitRow
                  label="Max workspaces per user"
                  description="How many workspaces a single user can create"
                  value={limits.max_workspaces_per_user}
                  onChange={(v) => setLimit('max_workspaces_per_user', v)}
                />
                <LimitRow
                  label="Max members per workspace"
                  description="How many members a workspace can have"
                  value={limits.max_members_per_workspace}
                  onChange={(v) => setLimit('max_members_per_workspace', v)}
                />
                <LimitRow
                  label="Max projects per workspace"
                  description="How many projects a workspace can contain"
                  value={limits.max_projects_per_workspace}
                  onChange={(v) => setLimit('max_projects_per_workspace', v)}
                />
                <LimitRow
                  label="Max documents per project"
                  description="How many documents a project can contain"
                  value={limits.max_documents_per_project}
                  onChange={(v) => setLimit('max_documents_per_project', v)}
                />
                <LimitRow
                  label="Max file size (MB)"
                  description="Maximum size for uploaded files"
                  value={limits.max_file_size_mb}
                  onChange={(v) => setLimit('max_file_size_mb', v)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Feature Flags ── */}
          <TabsContent value="features" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Feature Flags</CardTitle>
                <CardDescription>
                  Enable or disable platform features globally
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <FeatureRow
                  label="Image generation"
                  description="Allow users to generate images in the Image Studio"
                  enabled={features.enable_image_generation ?? true}
                  onChange={(v) => setFeature('enable_image_generation', v)}
                />
                <FeatureRow
                  label="Document analysis"
                  description="Allow uploading and analyzing documents via AI"
                  enabled={features.enable_document_analysis ?? true}
                  onChange={(v) => setFeature('enable_document_analysis', v)}
                />
                <FeatureRow
                  label="RAG (knowledge retrieval)"
                  description="Allow the assistant to search project documents for context"
                  enabled={features.enable_rag ?? true}
                  onChange={(v) => setFeature('enable_rag', v)}
                />
                <FeatureRow
                  label="Workflows"
                  description="Allow users to create and run AI workflows"
                  enabled={features.enable_workflows ?? true}
                  onChange={(v) => setFeature('enable_workflows', v)}
                />
                <FeatureRow
                  label="Public sharing"
                  description="Allow users to share documents via public links"
                  enabled={features.enable_public_sharing ?? true}
                  onChange={(v) => setFeature('enable_public_sharing', v)}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function LimitRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value?: number;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Input
        type="number"
        min={0}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Unlimited"
        className="w-32 shrink-0"
      />
    </div>
  );
}

function FeatureRow({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2.5 gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Button
        variant={enabled ? 'default' : 'outline'}
        size="sm"
        className="shrink-0"
        onClick={() => onChange(!enabled)}
      >
        {enabled ? 'Enabled' : 'Disabled'}
      </Button>
    </div>
  );
}
