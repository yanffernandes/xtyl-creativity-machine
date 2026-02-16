import { createFileRoute, useParams } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Workspace Settings (T104)
 *
 * Placeholder page for workspace-level settings.
 * Will be expanded with general, members, billing, and danger-zone sections.
 */
function WorkspaceSettings() {
  const { id: _workspaceId } = useParams({ from: '/workspace/$id/settings' });

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold tracking-tight mb-6 text-slate-900 dark:text-white">
        Workspace Settings
      </h1>
      <Card className="glass-subtle">
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Workspace settings coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute('/workspace/$id/settings')({
  component: WorkspaceSettings,
});
