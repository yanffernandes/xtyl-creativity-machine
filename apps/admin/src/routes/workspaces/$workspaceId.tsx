import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowLeft, Users, FolderOpen, FileText, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/AdminLayout';
import { StatCard } from '@/components/StatCard';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getWorkspaceDetails, transferWorkspaceOwnership, WorkspaceDetails } from '@/lib/api';

export const Route = createFileRoute('/workspaces/$workspaceId')({
  component: WorkspaceDetailPage,
});

type WorkspaceMember = WorkspaceDetails['members'][number];

function WorkspaceDetailPage() {
  const { workspaceId } = Route.useParams();
  const queryClient = useQueryClient();
  const [transferOpen, setTransferOpen] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState('');

  const workspaceQuery = useQuery({
    queryKey: ['workspaces', workspaceId],
    queryFn: () => getWorkspaceDetails(workspaceId),
  });

  const transferMutation = useMutation({
    mutationFn: (ownerId: string) =>
      transferWorkspaceOwnership(workspaceId, ownerId),
    onSuccess: () => {
      toast.success('Workspace ownership transferred successfully');
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setTransferOpen(false);
      setNewOwnerId('');
    },
    onError: () => {
      toast.error('Failed to transfer ownership');
    },
  });

  const memberColumns = [
    {
      key: 'email' as const,
      header: 'Email',
      render: (member: WorkspaceMember) => (
        <span className="font-medium">{member.email}</span>
      ),
    },
    {
      key: 'fullName' as const,
      header: 'Name',
      render: (member: WorkspaceMember) => member.fullName || '-',
    },
    {
      key: 'role' as const,
      header: 'Role',
      render: (member: WorkspaceMember) => (
        <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
          {member.role}
        </Badge>
      ),
    },
  ];

  if (workspaceQuery.isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (workspaceQuery.isError || !workspaceQuery.data) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Link to="/workspaces">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Workspaces
            </Button>
          </Link>
          <div className="flex items-center justify-center h-64">
            <p className="text-destructive">
              Failed to load workspace details.
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const workspace = workspaceQuery.data;
  const members: WorkspaceMember[] = workspace.members ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Link to="/workspaces">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Workspaces
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {workspace.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              Owner: {workspace.owner.email || workspace.owner.fullName || 'Unknown'}
            </p>
          </div>
          <Button variant="outline" onClick={() => setTransferOpen(true)}>
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Transfer Ownership
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Workspace Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Name
                </dt>
                <dd className="mt-1 text-sm">{workspace.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Owner
                </dt>
                <dd className="mt-1 text-sm">
                  {workspace.owner.email || 'Unknown'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Created
                </dt>
                <dd className="mt-1 text-sm">
                  {new Date(workspace.createdAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Members"
            value={workspace.stats.memberCount ?? members.length}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            title="Projects"
            value={workspace.stats.projectCount ?? 0}
            icon={<FolderOpen className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            title="Documents"
            value={workspace.stats.documentCount ?? 0}
            icon={<FileText className="h-4 w-4 text-muted-foreground" />}
          />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Members</h2>
          <DataTable columns={memberColumns} data={members} />
        </div>
      </div>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Workspace Ownership</DialogTitle>
            <DialogDescription>
              Select a member to become the new owner of this workspace. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newOwnerId} onValueChange={setNewOwnerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select new owner" />
              </SelectTrigger>
              <SelectContent>
                {members
                  .filter((m) => m.role !== 'owner')
                  .map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.fullName || member.email}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTransferOpen(false);
                setNewOwnerId('');
              }}
              disabled={transferMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (newOwnerId) {
                  transferMutation.mutate(newOwnerId);
                }
              }}
              disabled={!newOwnerId || transferMutation.isPending}
            >
              {transferMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
