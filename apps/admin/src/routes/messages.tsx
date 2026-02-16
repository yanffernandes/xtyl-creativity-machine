import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  listSystemMessages,
  createSystemMessage,
  updateSystemMessage,
  deleteSystemMessage,
} from '@/lib/api';
import type { SystemMessage } from '@/lib/api';

export const Route = createFileRoute('/messages')({
  component: MessagesPage,
});

interface MessageFormData {
  type: 'info' | 'warning' | 'error' | 'maintenance';
  title: string;
  content: string;
  priority: number;
  dismissible: boolean;
  startsAt: string;
  endsAt: string;
}

const emptyForm: MessageFormData = {
  type: 'info',
  title: '',
  content: '',
  priority: 0,
  dismissible: true,
  startsAt: '',
  endsAt: '',
};

const typeColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  maintenance: 'destructive',
  warning: 'secondary',
  announcement: 'default',
  info: 'outline',
};

function MessagesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MessageFormData>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const messagesQuery = useQuery({
    queryKey: ['system-messages'],
    queryFn: () => listSystemMessages(),
  });

  const createMutation = useMutation({
    mutationFn: (data: MessageFormData) =>
      createSystemMessage({
        ...data,
        startsAt: data.startsAt || undefined,
        endsAt: data.endsAt || undefined,
      }),
    onSuccess: () => {
      toast.success('System message created');
      queryClient.invalidateQueries({ queryKey: ['system-messages'] });
      closeDialog();
    },
    onError: () => {
      toast.error('Failed to create system message');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: MessageFormData }) =>
      updateSystemMessage(id, {
        ...data,
        startsAt: data.startsAt || undefined,
        endsAt: data.endsAt || undefined,
      }),
    onSuccess: () => {
      toast.success('System message updated');
      queryClient.invalidateQueries({ queryKey: ['system-messages'] });
      closeDialog();
    },
    onError: () => {
      toast.error('Failed to update system message');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSystemMessage(id),
    onSuccess: () => {
      toast.success('System message deleted');
      queryClient.invalidateQueries({ queryKey: ['system-messages'] });
      setDeleteId(null);
    },
    onError: () => {
      toast.error('Failed to delete system message');
    },
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  }

  function openEdit(message: SystemMessage) {
    setForm({
      type: message.type,
      title: message.title,
      content: message.content,
      priority: message.priority,
      dismissible: message.dismissible,
      startsAt: message.startsAt
        ? message.startsAt.slice(0, 16)
        : '',
      endsAt: message.endsAt
        ? message.endsAt.slice(0, 16)
        : '',
    });
    setEditingId(message.id);
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const messages: SystemMessage[] = messagesQuery.data ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              System Messages
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage system-wide notifications and announcements
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Message
          </Button>
        </div>

        {messagesQuery.isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : messagesQuery.isError ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-destructive">
              Failed to load system messages.
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">
              No system messages. Create one to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <Card key={message.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">
                        {message.title}
                      </CardTitle>
                      <Badge
                        variant={typeColors[message.type] ?? 'outline'}
                      >
                        {message.type}
                      </Badge>
                      <Badge
                        variant={message.isActive ? 'default' : 'secondary'}
                      >
                        {message.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Priority: {message.priority}
                      {message.dismissible ? ' | Dismissible' : ' | Persistent'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(message)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(message.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{message.content}</p>
                  {(message.startsAt || message.endsAt) && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {message.startsAt &&
                        `From: ${new Date(message.startsAt).toLocaleString()}`}
                      {message.startsAt && message.endsAt && ' | '}
                      {message.endsAt &&
                        `Until: ${new Date(message.endsAt).toLocaleString()}`}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit System Message' : 'Create System Message'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(value: string) =>
                  setForm((prev) => ({ ...prev, type: value as MessageFormData['type'] }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Message title"
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={form.content}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, content: e.target.value }))
                }
                placeholder="Message content"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={form.priority}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      priority: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Dismissible</Label>
                <Select
                  value={form.dismissible ? 'true' : 'false'}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      dismissible: value === 'true',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Starts At</Label>
                <Input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, startsAt: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Ends At</Label>
                <Input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, endsAt: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.title || !form.content || isPending}
            >
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete System Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this system message? This action
              cannot be undone.
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
