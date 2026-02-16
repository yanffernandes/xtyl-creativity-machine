import { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSystemSettings, updateSystemSettings } from '@/lib/api';
import type { SystemSetting } from '@/lib/api';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => getSystemSettings(),
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Record<string, string>) =>
      updateSystemSettings(updates),
    onSuccess: () => {
      toast.success('System settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      setHasChanges(false);
    },
    onError: () => {
      toast.error('Failed to update system settings');
    },
  });

  // Parse settings into structured entries with category
  const settings = (settingsQuery.data ?? []).map((setting: SystemSetting) => ({
    ...setting,
    category: setting.key.includes('_')
      ? setting.key.split('_')[0]
      : 'general',
  }));

  // Initialize edited values from fetched data
  useEffect(() => {
    if (settingsQuery.data && Object.keys(editedValues).length === 0) {
      const initial: Record<string, string> = {};
      for (const setting of settingsQuery.data) {
        initial[setting.key] = setting.value;
      }
      setEditedValues(initial);
    }
  }, [settingsQuery.data, editedValues]);

  // Group settings by category
  const groupedSettings = settings.reduce<Record<string, typeof settings>>(
    (groups, setting) => {
      const category = setting.category || 'general';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(setting);
      return groups;
    },
    {},
  );

  function handleValueChange(key: string, value: string) {
    setEditedValues((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }

  function handleSave() {
    updateMutation.mutate(editedValues);
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

  if (settingsQuery.isError) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Failed to load system settings.</p>
        </div>
      </AdminLayout>
    );
  }

  const categoryOrder = Object.keys(groupedSettings).sort();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              System Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure system-wide settings and feature flags
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>

        {settings.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">No settings found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {categoryOrder.map((category) => (
              <Card key={category}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="capitalize">{category}</CardTitle>
                    <Badge variant="secondary">
                      {groupedSettings[category].length} settings
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {groupedSettings[category].map((setting) => (
                    <div
                      key={setting.key}
                      className="flex items-center gap-4"
                    >
                      <label className="text-sm font-medium min-w-[200px] truncate" title={setting.key}>
                        {setting.key}
                      </label>
                      <Input
                        value={editedValues[setting.key] ?? ''}
                        onChange={(e) =>
                          handleValueChange(setting.key, e.target.value)
                        }
                        className="flex-1"
                      />
                      <Badge variant="outline" className="shrink-0">
                        {category}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
