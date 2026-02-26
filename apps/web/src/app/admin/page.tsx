'use client';

// Prevent static generation - requires runtime environment variables
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { MetricCard } from '@/components/admin/MetricCard';
import { useAdminDashboard } from '@/hooks/use-admin';
import { formatDistanceToNow } from 'date-fns';
import {
  Users,
  Building2,
  MessageSquare,
  FileText,
  TrendingUp,
  Activity,
  RefreshCw,
  Loader2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function AdminDashboardPage() {
  const {
    metrics,
    activity,
    recentActivity,
    isLoading,
    error,
    fetchDashboardData,
  } = useAdminDashboard();

  const [periodDays, setPeriodDays] = useState(30);

  const handlePeriodChange = (value: string) => {
    const days = parseInt(value, 10);
    setPeriodDays(days);
    fetchDashboardData(days);
  };

  const handleRefresh = () => {
    fetchDashboardData(periodDays);
  };

  return (
    <>
      <AdminHeader title="Dashboard" description="System overview and metrics" />

      <div className="p-6">
        {/* Header Actions */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Select value={String(periodDays)} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[180px] border-white/10 bg-white/5 text-white">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-slate-900/95 backdrop-blur-xl">
                <SelectItem value="7" className="text-white">Last 7 days</SelectItem>
                <SelectItem value="30" className="text-white">Last 30 days</SelectItem>
                <SelectItem value="90" className="text-white">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

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
        {isLoading && !metrics && (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        )}

        {/* Metrics Grid */}
        {metrics && (
          <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Users"
              value={metrics.users.total}
              change={metrics.users.new}
              changeLabel={`new in ${periodDays}d`}
              icon={Users}
              iconColor="text-blue-400"
              iconBgColor="bg-blue-500/20"
            />
            <MetricCard
              title="Active Users"
              value={metrics.users.active}
              subtitle={`${Math.round((metrics.users.active / metrics.users.total) * 100) || 0}% of total`}
              icon={TrendingUp}
              iconColor="text-green-400"
              iconBgColor="bg-green-500/20"
            />
            <MetricCard
              title="Workspaces"
              value={metrics.workspaces.total}
              subtitle={`${metrics.workspaces.active} active`}
              icon={Building2}
              iconColor="text-purple-400"
              iconBgColor="bg-purple-500/20"
            />
            <MetricCard
              title="Conversations"
              value={metrics.conversations.total}
              change={metrics.conversations.in_period}
              changeLabel={`in ${periodDays}d`}
              icon={MessageSquare}
              iconColor="text-orange-400"
              iconBgColor="bg-orange-500/20"
            />
          </div>
        )}

        {/* Secondary Metrics */}
        {metrics && (
          <div className="mb-8 grid gap-6 sm:grid-cols-2">
            <MetricCard
              title="Total Documents"
              value={metrics.documents.total}
              change={metrics.documents.in_period}
              changeLabel={`in ${periodDays}d`}
              icon={FileText}
              iconColor="text-cyan-400"
              iconBgColor="bg-cyan-500/20"
            />
            <MetricCard
              title="New Users"
              value={metrics.users.new}
              subtitle={`in the last ${periodDays} days`}
              icon={Users}
              iconColor="text-emerald-400"
              iconBgColor="bg-emerald-500/20"
            />
          </div>
        )}

        {/* Activity Trends */}
        {activity && (
          <div className="mb-8 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-medium text-white">
              <Activity className="h-5 w-5 text-white/70" />
              Activity Trends (Last {periodDays} days)
            </h3>
            <div className="grid gap-6 sm:grid-cols-3">
              <ActivitySummary
                title="User Signups"
                data={activity.users}
                color="bg-blue-400"
              />
              <ActivitySummary
                title="Conversations"
                data={activity.conversations}
                color="bg-orange-400"
              />
              <ActivitySummary
                title="Documents"
                data={activity.documents}
                color="bg-cyan-400"
              />
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {recentActivity && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Users */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-medium text-white">
                <Users className="h-5 w-5 text-blue-400" />
                Recent Users
              </h3>
              <div className="space-y-3">
                {recentActivity.users.slice(0, 5).map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3"
                  >
                    <div>
                      <p className="font-medium text-white">{user.full_name || 'No name'}</p>
                      <p className="text-sm text-white/50">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-white/50">
                      <Clock className="h-3 w-3" />
                      {user.created_at
                        ? formatDistanceToNow(new Date(user.created_at), { addSuffix: true })
                        : 'Unknown'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Conversations */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-medium text-white">
                <MessageSquare className="h-5 w-5 text-orange-400" />
                Recent Conversations
              </h3>
              <div className="space-y-3">
                {recentActivity.conversations.slice(0, 5).map((conv) => (
                  <div
                    key={conv.id}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3"
                  >
                    <div>
                      <p className="font-medium text-white">{conv.title || 'Untitled'}</p>
                      <p className="text-sm text-white/50">ID: {conv.id.slice(0, 8)}...</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-white/50">
                      <Clock className="h-3 w-3" />
                      {conv.created_at
                        ? formatDistanceToNow(new Date(conv.created_at), { addSuffix: true })
                        : 'Unknown'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Activity Summary Component
function ActivitySummary({
  title,
  data,
  color,
}: {
  title: string;
  data: { date: string; count: number }[];
  color: string;
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-white/70">{title}</span>
        <span className="text-lg font-semibold text-white">{total}</span>
      </div>
      <div className="flex h-16 items-end gap-1">
        {data.slice(-14).map((d, i) => (
          <div
            key={i}
            className={cn('flex-1 rounded-t transition-all', color)}
            style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }}
            title={`${d.date}: ${d.count}`}
          />
        ))}
      </div>
    </div>
  );
}
