import { createFileRoute, useParams } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

function ProjectSettings() {
  const { projectId } = useParams({ from: '/workspace/$id/project/$projectId/settings/' });
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<Record<string, any>>({});

  const { data } = useQuery({
    queryKey: ['project-settings', projectId],
    queryFn: async () => {
      const { data } = await api.get(`/api/projects/${projectId}/settings`);
      return data;
    },
  });

  useEffect(() => {
    if (data) setSettings(data);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      await api.put(`/api/projects/${projectId}/settings`, settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-settings', projectId] });
    },
  });

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Project Settings</h1>
      <Card className="glass-subtle">
        <CardHeader>
          <CardTitle>Brand Identity</CardTitle>
          <CardDescription>Configure your brand settings for AI context</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Client Name</Label>
            <Input value={settings.client_name ?? ''} onChange={(e) => setSettings({ ...settings, client_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Target Audience</Label>
            <Textarea value={settings.target_audience ?? ''} onChange={(e) => setSettings({ ...settings, target_audience: e.target.value })} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Brand Voice</Label>
            <Textarea value={settings.brand_voice ?? ''} onChange={(e) => setSettings({ ...settings, brand_voice: e.target.value })} rows={3} />
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute('/workspace/$id/project/$projectId/settings/')({
  component: ProjectSettings,
});
