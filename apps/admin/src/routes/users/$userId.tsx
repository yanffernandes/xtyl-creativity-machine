import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowLeft, ShieldCheck, ShieldOff, Ban, CheckCircle, Building2, FolderOpen, FileText, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/AdminLayout';
import { StatCard } from '@/components/StatCard';
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
import { getUserDetails, blockUser, unblockUser, updateUser } from '@/lib/api';
import { useState } from 'react';

export const Route = createFileRoute('/users/$userId')({
  component: UserDetailPage,
});

function UserDetailPage() {
  const { userId } = Route.useParams();
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<
    'block' | 'unblock' | 'promote' | 'demote' | null
  >(null);

  const userQuery = useQuery({
    queryKey: ['users', userId],
    queryFn: () => getUserDetails(userId),
  });

  const blockMutation = useMutation({
    mutationFn: () => blockUser(userId),
    onSuccess: () => {
      toast.success('User blocked successfully');
      queryClient.invalidateQueries({ queryKey: ['users', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmAction(null);
    },
    onError: () => {
      toast.error('Failed to block user');
    },
  });

  const unblockMutation = useMutation({
    mutationFn: () => unblockUser(userId),
    onSuccess: () => {
      toast.success('User unblocked successfully');
      queryClient.invalidateQueries({ queryKey: ['users', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmAction(null);
    },
    onError: () => {
      toast.error('Failed to unblock user');
    },
  });

  const promoteMutation = useMutation({
    mutationFn: () => updateUser(userId, { isSuperAdmin: true }),
    onSuccess: () => {
      toast.success('User promoted to admin');
      queryClient.invalidateQueries({ queryKey: ['users', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmAction(null);
    },
    onError: () => {
      toast.error('Failed to promote user');
    },
  });

  const demoteMutation = useMutation({
    mutationFn: () => updateUser(userId, { isSuperAdmin: false }),
    onSuccess: () => {
      toast.success('User demoted to regular user');
      queryClient.invalidateQueries({ queryKey: ['users', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmAction(null);
    },
    onError: () => {
      toast.error('Failed to demote user');
    },
  });

  function handleConfirmAction() {
    switch (confirmAction) {
      case 'block':
        blockMutation.mutate();
        break;
      case 'unblock':
        unblockMutation.mutate();
        break;
      case 'promote':
        promoteMutation.mutate();
        break;
      case 'demote':
        demoteMutation.mutate();
        break;
    }
  }

  const isActionPending =
    blockMutation.isPending ||
    unblockMutation.isPending ||
    promoteMutation.isPending ||
    demoteMutation.isPending;

  if (userQuery.isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (userQuery.isError || !userQuery.data) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Link to="/users">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Users
            </Button>
          </Link>
          <div className="flex items-center justify-center h-64">
            <p className="text-destructive">Failed to load user details.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const user = userQuery.data;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Link to="/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {user.fullName || user.email}
            </h1>
            <p className="text-muted-foreground mt-1">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={user.isSuperAdmin ? 'default' : 'secondary'}>
              {user.isSuperAdmin ? 'Admin' : 'User'}
            </Badge>
            <Badge variant={user.isBlocked ? 'destructive' : 'outline'}>
              {user.isBlocked ? 'Blocked' : 'Active'}
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Email
                </dt>
                <dd className="mt-1 text-sm">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Full Name
                </dt>
                <dd className="mt-1 text-sm">{user.fullName || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Role
                </dt>
                <dd className="mt-1 text-sm">
                  {user.isSuperAdmin ? 'Super Admin' : 'User'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Status
                </dt>
                <dd className="mt-1 text-sm">
                  {user.isBlocked ? 'Blocked' : 'Active'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Created
                </dt>
                <dd className="mt-1 text-sm">
                  {new Date(user.createdAt).toLocaleString()}
                </dd>
              </div>
              {user.lastSignInAt && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Last Login
                  </dt>
                  <dd className="mt-1 text-sm">
                    {new Date(user.lastSignInAt).toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Workspaces"
            value={user.stats.workspaces ?? 0}
            icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            title="Projects"
            value={user.stats.projects ?? 0}
            icon={<FolderOpen className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            title="Documents"
            value={user.stats.documents ?? 0}
            icon={<FileText className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            title="Conversations"
            value={user.stats.conversations ?? 0}
            icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
          />
        </div>

        <div className="flex items-center gap-2">
          {user.isBlocked ? (
            <Button
              variant="outline"
              onClick={() => setConfirmAction('unblock')}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Unblock User
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={() => setConfirmAction('block')}
            >
              <Ban className="mr-2 h-4 w-4" />
              Block User
            </Button>
          )}
          {user.isSuperAdmin ? (
            <Button
              variant="outline"
              onClick={() => setConfirmAction('demote')}
            >
              <ShieldOff className="mr-2 h-4 w-4" />
              Demote from Admin
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setConfirmAction('promote')}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Promote to Admin
            </Button>
          )}
        </div>
      </div>

      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === 'block' && 'Block User'}
              {confirmAction === 'unblock' && 'Unblock User'}
              {confirmAction === 'promote' && 'Promote to Admin'}
              {confirmAction === 'demote' && 'Demote from Admin'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === 'block' &&
                `Are you sure you want to block ${user.email}? They will no longer be able to access the system.`}
              {confirmAction === 'unblock' &&
                `Are you sure you want to unblock ${user.email}? They will regain access to the system.`}
              {confirmAction === 'promote' &&
                `Are you sure you want to promote ${user.email} to admin? They will gain full administrative privileges.`}
              {confirmAction === 'demote' &&
                `Are you sure you want to demote ${user.email} from admin? They will lose administrative privileges.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmAction(null)}
              disabled={isActionPending}
            >
              Cancel
            </Button>
            <Button
              variant={confirmAction === 'block' ? 'destructive' : 'default'}
              onClick={handleConfirmAction}
              disabled={isActionPending}
            >
              {isActionPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
