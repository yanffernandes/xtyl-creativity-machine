'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import api from '@/lib/api';
import {
  MessageSquare,
  Plus,
  Loader2,
  AlertCircle,
  Check,
  RefreshCw,
  Pencil,
  Trash2,
  AlertTriangle,
  Info,
  Megaphone,
  Wrench,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useConfirm } from '@/components/confirm-dialog';

interface SystemMessage {
  id: string;
  type: 'maintenance' | 'announcement' | 'warning' | 'info';
  title: string;
  content: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  dismissible: boolean;
  priority: number;
  created_at: string;
  updated_at: string | null;
}

const MESSAGE_TYPES = {
  maintenance: { label: 'Manutenção', icon: Wrench, color: 'text-orange-400 bg-orange-400/10' },
  announcement: { label: 'Anúncio', icon: Megaphone, color: 'text-blue-400 bg-blue-400/10' },
  warning: { label: 'Aviso', icon: AlertTriangle, color: 'text-amber-400 bg-amber-400/10' },
  info: { label: 'Informação', icon: Info, color: 'text-cyan-400 bg-cyan-400/10' },
};

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<SystemMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<SystemMessage | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();
  const confirm = useConfirm();

  // Form state
  const [formData, setFormData] = useState({
    type: 'info' as SystemMessage['type'],
    title: '',
    content: '',
    is_active: true,
    dismissible: true,
    priority: 0,
  });

  const fetchMessages = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/admin/settings/messages?include_inactive=true');
      setMessages(response.data.messages || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao carregar mensagens');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleCreate = () => {
    setEditingMessage(null);
    setFormData({
      type: 'info',
      title: '',
      content: '',
      is_active: true,
      dismissible: true,
      priority: 0,
    });
    setDialogOpen(true);
  };

  const handleEdit = (message: SystemMessage) => {
    setEditingMessage(message);
    setFormData({
      type: message.type,
      title: message.title,
      content: message.content,
      is_active: message.is_active,
      dismissible: message.dismissible,
      priority: message.priority,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (message: SystemMessage) => {
    const confirmed = await confirm({
      title: 'Excluir mensagem',
      description: `Tem certeza que deseja excluir a mensagem "${message.title}"?`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      variant: 'destructive',
    });

    if (!confirmed) return;

    try {
      await api.delete(`/admin/settings/messages/${message.id}`);
      toast({ title: 'Mensagem excluída', description: 'A mensagem foi removida com sucesso.' });
      fetchMessages();
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err.response?.data?.detail || 'Não foi possível excluir a mensagem.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (message: SystemMessage) => {
    try {
      await api.put(`/admin/settings/messages/${message.id}`, {
        is_active: !message.is_active,
      });
      toast({
        title: message.is_active ? 'Mensagem desativada' : 'Mensagem ativada',
        description: message.is_active
          ? 'A mensagem não será mais exibida.'
          : 'A mensagem será exibida para os usuários.',
      });
      fetchMessages();
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.response?.data?.detail || 'Não foi possível atualizar a mensagem.',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Título e conteúdo são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingMessage) {
        await api.put(`/admin/settings/messages/${editingMessage.id}`, formData);
        toast({ title: 'Mensagem atualizada', description: 'As alterações foram salvas.' });
      } else {
        await api.post('/admin/settings/messages', formData);
        toast({ title: 'Mensagem criada', description: 'A nova mensagem foi adicionada.' });
      }
      setDialogOpen(false);
      fetchMessages();
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.response?.data?.detail || 'Não foi possível salvar a mensagem.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <AdminHeader title="Mensagens do Sistema" description="Gerenciar avisos e anúncios" />

      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
              <MessageSquare className="h-5 w-5 text-white/70" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Mensagens do Sistema</h2>
              <p className="text-sm text-white/50">
                Crie avisos de manutenção, anúncios e alertas
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMessages}
              disabled={isLoading}
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
              Atualizar
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Mensagem
            </Button>
          </div>
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
        {isLoading && messages.length === 0 && (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && messages.length === 0 && (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5">
            <MessageSquare className="mb-4 h-12 w-12 text-white/30" />
            <p className="text-white/50">Nenhuma mensagem do sistema</p>
            <p className="text-sm text-white/30">
              Clique em "Nova Mensagem" para criar um aviso
            </p>
          </div>
        )}

        {/* Messages List */}
        {messages.length > 0 && (
          <div className="space-y-4">
            {messages.map((message) => {
              const typeConfig = MESSAGE_TYPES[message.type];
              const TypeIcon = typeConfig.icon;

              return (
                <div
                  key={message.id}
                  className={cn(
                    'rounded-xl border border-white/10 bg-white/5 p-4 transition-all',
                    !message.is_active && 'opacity-50'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={cn('rounded-lg p-2', typeConfig.color)}>
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-white">{message.title}</h3>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs',
                              typeConfig.color
                            )}
                          >
                            {typeConfig.label}
                          </span>
                          {!message.is_active && (
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50">
                              Inativo
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-white/70">{message.content}</p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-white/40">
                          <span>Prioridade: {message.priority}</span>
                          <span>
                            {message.dismissible ? 'Dispensável' : 'Não dispensável'}
                          </span>
                          <span>
                            Criada em:{' '}
                            {new Date(message.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(message)}
                        className="text-white/50 hover:text-white"
                        title={message.is_active ? 'Desativar' : 'Ativar'}
                      >
                        {message.is_active ? (
                          <ToggleRight className="h-5 w-5 text-green-400" />
                        ) : (
                          <ToggleLeft className="h-5 w-5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(message)}
                        className="text-white/50 hover:text-white"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(message)}
                        className="text-white/50 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingMessage ? 'Editar Mensagem' : 'Nova Mensagem'}
              </DialogTitle>
              <DialogDescription>
                {editingMessage
                  ? 'Atualize os detalhes da mensagem do sistema.'
                  : 'Crie uma nova mensagem para exibir aos usuários.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) =>
                    setFormData({ ...formData, type: v as SystemMessage['type'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MESSAGE_TYPES).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className="h-4 w-4" />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Título da mensagem"
                />
              </div>

              <div className="space-y-2">
                <Label>Conteúdo</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Conteúdo da mensagem..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Prioridade (0-100)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: parseInt(e.target.value, 10) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Mensagens com prioridade maior aparecem primeiro
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Ativa</Label>
                  <p className="text-xs text-muted-foreground">
                    Exibir esta mensagem aos usuários
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Dispensável</Label>
                  <p className="text-xs text-muted-foreground">
                    Permitir que usuários fechem a mensagem
                  </p>
                </div>
                <Switch
                  checked={formData.dismissible}
                  onCheckedChange={(v) => setFormData({ ...formData, dismissible: v })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingMessage ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
