import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/AdminLayout';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { listMemories, deleteMemory } from '@/lib/api';
import type { MemoryItem } from '@/lib/api';

export const Route = createFileRoute('/memory')({
  component: MemoryPage,
});

function MemoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const memoriesQuery = useQuery({
    queryKey: ['memories', search, page],
    queryFn: () =>
      listMemories({
        search: search || undefined,
        limit: 20,
        page: page + 1,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMemory(id),
    onSuccess: () => {
      toast.success('Memory deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      setDeleteId(null);
    },
    onError: () => {
      toast.error('Failed to delete memory');
    },
  });

  const columns = [
    {
      key: 'userEmail' as const,
      header: 'User Email',
      render: (memory: MemoryItem) => (
        <span className="font-medium">{memory.userEmail}</span>
      ),
    },
    {
      key: 'content' as const,
      header: 'Content',
      render: (memory: MemoryItem) => (
        <span className="truncate max-w-[300px] block" title={memory.content}>
          {memory.content.length > 80
            ? `${memory.content.slice(0, 80)}...`
            : memory.content}
        </span>
      ),
    },
    {
      key: 'category' as const,
      header: 'Type',
      render: (memory: MemoryItem) => (
        <Badge variant="secondary">{memory.category}</Badge>
      ),
    },
    {
      key: 'createdAt' as const,
      header: 'Created',
      render: (memory: MemoryItem) =>
        new Date(memory.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions' as const,
      header: 'Actions',
      render: (memory: MemoryItem) => (
        <Button
          variant="ghost"
          size="icon"
          title="Delete memory"
          onClick={() => setDeleteId(memory.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const memories: MemoryItem[] = memoriesQuery.data?.memories ?? [];
  const total: number = memoriesQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Memory Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse and manage user memories across the system
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search memories..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9"
          />
        </div>

        {memoriesQuery.isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : memoriesQuery.isError ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-destructive">Failed to load memories.</p>
          </div>
        ) : (
          <>
            <DataTable columns={columns} data={memories} />
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {page * 20 + 1} to{' '}
                  {Math.min((page + 1) * 20, total)} of {total} memories
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

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Memory</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this memory? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteMutation.mutate(deleteId);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
