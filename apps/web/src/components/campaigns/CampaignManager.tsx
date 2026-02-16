'use client'

import { useState } from 'react'
import { Folder, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  useCampaigns,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  type Campaign,
} from '@/hooks/useCampaigns'
import { CHANNEL_OPTIONS } from '@/types/agency-studio'

interface CampaignManagerProps {
  projectId: string
  onSelectCampaign?: (campaign: Campaign) => void
}

interface CampaignFormData {
  name: string
  channel: string
}

export function CampaignManager({
  projectId,
  onSelectCampaign,
}: CampaignManagerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null)
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    channel: '',
  })

  const { data, isLoading } = useCampaigns(projectId)
  const createMutation = useCreateCampaign(projectId)
  const updateMutation = useUpdateCampaign(projectId)
  const deleteMutation = useDeleteCampaign(projectId)

  const campaigns = data?.items || []

  const handleOpenCreateDialog = () => {
    setFormData({ name: '', channel: '' })
    setEditingCampaign(null)
    setShowCreateDialog(true)
  }

  const handleOpenEditDialog = (campaign: Campaign) => {
    setFormData({
      name: campaign.name,
      channel: campaign.channel || '',
    })
    setEditingCampaign(campaign)
    setShowCreateDialog(true)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) return

    const data = {
      name: formData.name.trim(),
      channel: formData.channel || undefined,
    }

    try {
      if (editingCampaign) {
        await updateMutation.mutateAsync({
          campaignId: editingCampaign.id,
          data,
        })
      } else {
        await createMutation.mutateAsync(data)
      }
      setShowCreateDialog(false)
      setEditingCampaign(null)
    } catch {
      // Error handled by mutation hook
    }
  }

  const handleDelete = async () => {
    if (!campaignToDelete) return

    try {
      await deleteMutation.mutateAsync(campaignToDelete.id)
      setCampaignToDelete(null)
    } catch {
      // Error handled by mutation hook
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Campanhas
          </CardTitle>
          <Button size="sm" onClick={handleOpenCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nova
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Folder className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Nenhuma campanha criada
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={handleOpenCreateDialog}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar campanha
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => onSelectCampaign?.(campaign)}
                  >
                    <div className="flex items-center gap-3">
                      <Folder className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{campaign.name}</p>
                        {campaign.channel && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {campaign.channel}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenEditDialog(campaign)
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            setCampaignToDelete(campaign)
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCampaign ? 'Editar campanha' : 'Nova campanha'}
            </DialogTitle>
            <DialogDescription>
              {editingCampaign
                ? 'Edite os detalhes da campanha'
                : 'Crie uma nova campanha para organizar seus materiais'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="Ex: Black Friday 2025"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel">Canal</Label>
              <Select
                value={formData.channel}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, channel: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar canal..." />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_OPTIONS.map((channel) => (
                    <SelectItem key={channel.value} value={channel.value}>
                      {channel.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !formData.name.trim() ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {editingCampaign ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!campaignToDelete}
        onOpenChange={() => setCampaignToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A campanha "
              {campaignToDelete?.name}" será permanentemente excluída.
              Documentos associados não serão excluídos, apenas desvinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
