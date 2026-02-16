import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search, Eye, ShieldCheck, ShieldOff, Ban, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/AdminLayout';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { listUsers, blockUser, unblockUser, updateUser } from '@/lib/api';
import type { UserListItem } from '@/lib/api';

export const Route = createFileRoute('/users/')({
  component: UsersPage,
});

function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'block' | 'unblock' | 'promote' | 'demote';
    user: UserListItem;
  } | null>(null);

  const usersQuery = useQuery({
    queryKey: ['users', search, statusFilter, roleFilter, page],
    queryFn: () =>
      listUsers({
        search: search || undefined,
        ...(statusFilter === 'blocked'
          ? { isBlocked: true }
          : statusFilter === 'active'
            ? { isBlocked: false }
            : {}),
        limit: 20,
        page: page + 1,
      }),
  });

  const blockMutation = useMutation({
    mutationFn: (userId: string) => blockUser(userId),
    onSuccess: () => {
      toast.success('User blocked successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmAction(null);
    },
    onError: () => {
      toast.error('Failed to block user');
    },
  });

  const unblockMutation = useMutation({
    mutationFn: (userId: string) => unblockUser(userId),
    onSuccess: () => {
      toast.success('User unblocked successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmAction(null);
    },
    onError: () => {
      toast.error('Failed to unblock user');
    },
  });

  const promoteMutation = useMutation({
    mutationFn: (userId: string) => updateUser(userId, { isSuperAdmin: true }),
    onSuccess: () => {
      toast.success('User promoted to admin');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmAction(null);
    },
    onError: () => {
      toast.error('Failed to promote user');
    },
  });

  const demoteMutation = useMutation({
    mutationFn: (userId: string) => updateUser(userId, { isSuperAdmin: false }),
    onSuccess: () => {
      toast.success('User demoted to regular user');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmAction(null);
    },
    onError: () => {
      toast.error('Failed to demote user');
    },
  });

  function handleConfirmAction() {
    if (!confirmAction) return;
    const { type, user } = confirmAction;
    switch (type) {
      case 'block':
        blockMutation.mutate(user.id);
        break;
      case 'unblock':
        unblockMutation.mutate(user.id);
        break;
      case 'promote':
        promoteMutation.mutate(user.id);
        break;
      case 'demote':
        demoteMutation.mutate(user.id);
        break;
    }
  }

  const isActionPending =
    blockMutation.isPending ||
    unblockMutation.isPending ||
    promoteMutation.isPending ||
    demoteMutation.isPending;

  const columns = [
    {
      key: 'email' as const,
      header: 'Email',
      render: (user: UserListItem) => (
        <span className="font-medium">{user.email}</span>
      ),
    },
    {
      key: 'fullName' as const,
      header: 'Name',
      render: (user: UserListItem) => user.fullName || '-',
    },
    {
      key: 'isSuperAdmin' as const,
      header: 'Role',
      render: (user: UserListItem) => (
        <Badge variant={user.isSuperAdmin ? 'default' : 'secondary'}>
          {user.isSuperAdmin ? 'Admin' : 'User'}
        </Badge>
      ),
    },
    {
      key: 'isBlocked' as const,
      header: 'Status',
      render: (user: UserListItem) => (
        <Badge variant={user.isBlocked ? 'destructive' : 'outline'}>
          {user.isBlocked ? 'Blocked' : 'Active'}
        </Badge>
      ),
    },
    {
      key: 'createdAt' as const,
      header: 'Created',
      render: (user: UserListItem) =>
        new Date(user.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions' as const,
      header: 'Actions',
      render: (user: UserListItem) => (
        <div className="flex items-center gap-1">
          <Link to="/users/$userId" params={{ userId: user.id }}>
            <Button variant="ghost" size="icon" title="View details">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          {user.isBlocked ? (
            <Button
              variant="ghost"
              size="icon"
              title="Unblock user"
              onClick={() =>
                setConfirmAction({ type: 'unblock', user })
              }
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              title="Block user"
              onClick={() =>
                setConfirmAction({ type: 'block', user })
              }
            >
              <Ban className="h-4 w-4" />
            </Button>
          )}
          {user.isSuperAdmin ? (
            <Button
              variant="ghost"
              size="icon"
              title="Demote from admin"
              onClick={() =>
                setConfirmAction({ type: 'demote', user })
              }
            >
              <ShieldOff className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              title="Promote to admin"
              onClick={() =>
                setConfirmAction({ type: 'promote', user })
              }
            >
              <ShieldCheck className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const allUsers: UserListItem[] = usersQuery.data?.users ?? [];
  const users = roleFilter === 'all'
    ? allUsers
    : roleFilter === 'admin'
      ? allUsers.filter((u) => u.isSuperAdmin)
      : allUsers.filter((u) => !u.isSuperAdmin);
  const total: number = usersQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">
            Manage user accounts and permissions
          </p>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by email or name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={roleFilter}
            onValueChange={(value) => {
              setRoleFilter(value);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {usersQuery.isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : usersQuery.isError ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-destructive">Failed to load users.</p>
          </div>
        ) : (
          <>
            <DataTable columns={columns} data={users} />
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {page * 20 + 1} to {Math.min((page + 1) * 20, total)} of{' '}
                  {total} users
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

      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === 'block' && 'Block User'}
              {confirmAction?.type === 'unblock' && 'Unblock User'}
              {confirmAction?.type === 'promote' && 'Promote to Admin'}
              {confirmAction?.type === 'demote' && 'Demote from Admin'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === 'block' &&
                `Are you sure you want to block ${confirmAction.user.email}? They will no longer be able to access the system.`}
              {confirmAction?.type === 'unblock' &&
                `Are you sure you want to unblock ${confirmAction.user.email}? They will regain access to the system.`}
              {confirmAction?.type === 'promote' &&
                `Are you sure you want to promote ${confirmAction.user.email} to admin? They will gain full administrative privileges.`}
              {confirmAction?.type === 'demote' &&
                `Are you sure you want to demote ${confirmAction.user.email} from admin? They will lose administrative privileges.`}
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
              variant={
                confirmAction?.type === 'block' ? 'destructive' : 'default'
              }
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
