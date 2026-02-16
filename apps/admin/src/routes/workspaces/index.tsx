import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { listWorkspaces, WorkspaceListItem } from '@/lib/api';

export const Route = createFileRoute('/workspaces/')({
  component: WorkspacesPage,
});

function WorkspacesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const workspacesQuery = useQuery({
    queryKey: ['workspaces', search, page],
    queryFn: () =>
      listWorkspaces({
        search: search || undefined,
        limit: 20,
        page: page + 1,
      }),
  });

  const columns = [
    {
      key: 'name' as const,
      header: 'Name',
      render: (ws: WorkspaceListItem) => (
        <span className="font-medium">{ws.name}</span>
      ),
    },
    {
      key: 'ownerEmail' as const,
      header: 'Owner',
      render: (ws: WorkspaceListItem) => ws.ownerEmail || '-',
    },
    {
      key: 'memberCount' as const,
      header: 'Members',
      render: (ws: WorkspaceListItem) => ws.memberCount,
    },
    {
      key: 'projectCount' as const,
      header: 'Projects',
      render: (ws: WorkspaceListItem) => ws.projectCount,
    },
    {
      key: 'createdAt' as const,
      header: 'Created',
      render: (ws: WorkspaceListItem) =>
        new Date(ws.createdAt).toLocaleDateString(),
    },
  ];

  const workspaces: WorkspaceListItem[] = workspacesQuery.data?.workspaces ?? [];
  const total: number = workspacesQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  function handleRowClick(ws: WorkspaceListItem) {
    navigate({ to: '/workspaces/$workspaceId', params: { workspaceId: ws.id } });
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
          <p className="text-muted-foreground mt-1">
            Browse and manage all workspaces
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search workspaces..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9 max-w-md"
          />
        </div>

        {workspacesQuery.isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : workspacesQuery.isError ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-destructive">Failed to load workspaces.</p>
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={workspaces}
              onRowClick={handleRowClick}
            />
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {page * 20 + 1} to{' '}
                  {Math.min((page + 1) * 20, total)} of {total} workspaces
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
