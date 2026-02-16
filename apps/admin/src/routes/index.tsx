import { useState, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Users, Building2, FileText, MessageSquare } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getDashboardStats, getDashboardActivity, getRecentActivity, verifyAdmin } from '@/lib/api';

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [adminVerified, setAdminVerified] = useState(false);

  useEffect(() => {
    verifyAdmin()
      .then(() => setAdminVerified(true))
      .catch(() => {
        navigate({ to: '/' });
      });
  }, [navigate]);

  const statsQuery = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => getDashboardStats(14),
    enabled: adminVerified,
  });

  const activityQuery = useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: () => getDashboardActivity(14),
    enabled: adminVerified,
  });

  const recentQuery = useQuery({
    queryKey: ['dashboard', 'recent'],
    queryFn: () => getRecentActivity(),
    enabled: adminVerified,
  });

  if (!adminVerified) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (statsQuery.isLoading || activityQuery.isLoading || recentQuery.isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (statsQuery.isError) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">
            Failed to load dashboard data. Please try again later.
          </p>
        </div>
      </AdminLayout>
    );
  }

  const stats = statsQuery.data;
  const activity = activityQuery.data;
  const recent = recentQuery.data;

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            System overview for the last 14 days
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Users"
            value={stats?.users?.total ?? 0}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            title="Active Workspaces"
            value={stats?.workspaces?.total ?? 0}
            icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            title="Documents"
            value={stats?.documents?.total ?? 0}
            icon={<FileText className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            title="Conversations"
            value={stats?.conversations?.total ?? 0}
            icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Activity Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {activity && activity.length > 0 ? (
                <div className="space-y-2">
                  {activity.map(
                    (day) => (
                      <div
                        key={day.date}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">{day.date}</span>
                        <Badge variant="secondary">{day.conversations + day.documents + day.imageGenerations} actions</Badge>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No activity data available.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Users</CardTitle>
              </CardHeader>
              <CardContent>
                {recent?.users && recent.users.length > 0 ? (
                  <div className="space-y-2">
                    {recent.users.map(
                      (user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="truncate">{user.email}</span>
                          <span className="text-muted-foreground text-xs">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No recent users.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Conversations</CardTitle>
              </CardHeader>
              <CardContent>
                {recent?.conversations &&
                recent.conversations.length > 0 ? (
                  <div className="space-y-2">
                    {recent.conversations.map(
                      (conv) => (
                        <div
                          key={conv.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="truncate">
                            {conv.title || 'Untitled'}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {new Date(conv.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No recent conversations.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
