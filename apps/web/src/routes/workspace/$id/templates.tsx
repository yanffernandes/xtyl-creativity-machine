import { createFileRoute, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

/**
 * Templates Page (T107)
 *
 * Lists available workflow/document templates for the workspace.
 * Templates are fetched from the /api/templates endpoint.
 */
function TemplatesPage() {
  const { id: workspaceId } = useParams({ from: '/workspace/$id/templates' });

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates', workspaceId],
    queryFn: async () => {
      const { data } = await api.get('/api/templates', {
        params: { workspace_id: workspaceId },
      });
      return data;
    },
  });

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold tracking-tight mb-6 text-slate-900 dark:text-white">
        Templates
      </h1>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-24" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(templates ?? []).map(
            (t: { id: string; name: string; description?: string }) => (
              <Card
                key={t.id}
                className="glass-subtle cursor-pointer hover:shadow-lg transition-all"
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#5B8DEF]" />
                    <CardTitle className="text-sm">{t.name}</CardTitle>
                  </div>
                </CardHeader>
                {t.description && (
                  <CardContent>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {t.description}
                    </p>
                  </CardContent>
                )}
              </Card>
            ),
          )}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/workspace/$id/templates')({
  component: TemplatesPage,
});
