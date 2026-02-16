import { createFileRoute, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Zap, Image, MessageSquare } from 'lucide-react';

/**
 * AI Usage Page (T106)
 *
 * Dashboard showing AI usage metrics:
 * - Total requests
 * - Chat messages
 * - Images generated
 * - Total cost
 *
 * Data fetched from the /api/ai-usage/summary endpoint.
 */
function AiUsagePage() {
  const { id: workspaceId } = useParams({ from: '/workspace/$id/ai-usage' });

  const { data: summary } = useQuery({
    queryKey: ['ai-usage', 'summary', workspaceId],
    queryFn: async () => {
      const { data } = await api.get('/api/ai-usage/summary', {
        params: { workspace_id: workspaceId },
      });
      return data;
    },
  });

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold tracking-tight mb-6 text-slate-900 dark:text-white">
        AI Usage
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-subtle">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Requests
            </CardTitle>
            <Zap className="h-4 w-4 text-[#5B8DEF]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {summary?.total_requests ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-subtle">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Chat Messages
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {summary?.chat_requests ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-subtle">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Images Generated
            </CardTitle>
            <Image className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {summary?.image_requests ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-subtle">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Cost
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              ${summary?.total_cost?.toFixed(2) ?? '0.00'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/workspace/$id/ai-usage')({
  component: AiUsagePage,
});
