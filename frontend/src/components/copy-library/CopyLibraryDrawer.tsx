'use client'

import { useState, useMemo } from 'react'
import { Library, Plus, Search, X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useCopyLibrary,
  useCreateCopy,
  useUpdateCopy,
  useDeleteCopy,
} from '@/hooks/useCopyLibrary'
import { CopyLibraryCard } from './CopyLibraryCard'
import { CopyLibraryItem } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'

interface CopyLibraryDrawerProps {
  workspaceId: string
  onUseAsPrompt?: (content: string) => void
  trigger?: React.ReactNode
}

interface CopyFormData {
  title: string
  content: string
  tags: string[]
}

export function CopyLibraryDrawer({
  workspaceId,
  onUseAsPrompt,
  trigger,
}: CopyLibraryDrawerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingCopy, setEditingCopy] = useState<CopyLibraryItem | null>(null)
  const [formData, setFormData] = useState<CopyFormData>({
    title: '',
    content: '',
    tags: [],
  })
  const [tagInput, setTagInput] = useState('')

  const { data, isLoading } = useCopyLibrary(workspaceId, { search: search || undefined })
  const createMutation = useCreateCopy(workspaceId)
  const updateMutation = useUpdateCopy(workspaceId)
  const deleteMutation = useDeleteCopy(workspaceId)

  const copies = useMemo(() => data?.items || [], [data])

  const handleOpenCreateDialog = () => {
    setFormData({ title: '', content: '', tags: [] })
    setTagInput('')
    setEditingCopy(null)
    setShowCreateDialog(true)
  }

  const handleOpenEditDialog = (copy: CopyLibraryItem) => {
    setFormData({
      title: copy.title,
      content: copy.content,
      tags: copy.tags || [],
    })
    setTagInput('')
    setEditingCopy(copy)
    setShowCreateDialog(true)
  }

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 20) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }))
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }))
  }

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) return

    try {
      if (editingCopy) {
        await updateMutation.mutateAsync({
          copyId: editingCopy.id,
          data: formData,
        })
      } else {
        await createMutation.mutateAsync(formData)
      }
      setShowCreateDialog(false)
      setEditingCopy(null)
    } catch {
      // Error handled by mutation hook
    }
  }

  const handleDelete = async (copyId: string) => {
    try {
      await deleteMutation.mutateAsync(copyId)
    } catch {
      // Error handled by mutation hook
    }
  }

  const handleUseAsPrompt = (content: string) => {
    onUseAsPrompt?.(content)
    setOpen(false)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm">
              <Library className="mr-2 h-4 w-4" />
              Biblioteca de Copy
            </Button>
          )}
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Library className="h-5 w-5" />
              Biblioteca de Copy
            </SheetTitle>
            <SheetDescription>
              Textos reutilizáveis para geração de imagens
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar copies..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleOpenCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Nova
              </Button>
            </div>

            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="space-y-3 pr-4">
                {isLoading ? (
                  <>
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full rounded-lg" />
                    ))}
                  </>
                ) : copies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Library className="h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-sm text-muted-foreground">
                      {search
                        ? 'Nenhuma copy encontrada'
                        : 'Biblioteca vazia. Crie sua primeira copy!'}
                    </p>
                    {!search && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={handleOpenCreateDialog}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Criar copy
                      </Button>
                    )}
                  </div>
                ) : (
                  copies.map((copy) => (
                    <CopyLibraryCard
                      key={copy.id}
                      copy={copy}
                      onUseAsPrompt={handleUseAsPrompt}
                      onEdit={handleOpenEditDialog}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCopy ? 'Editar copy' : 'Nova copy'}
            </DialogTitle>
            <DialogDescription>
              {editingCopy
                ? 'Edite os detalhes da copy'
                : 'Crie uma nova copy para reutilizar como prompt'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                placeholder="Ex: CTA Black Friday"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo</Label>
              <Textarea
                id="content"
                placeholder="Digite o texto da copy..."
                rows={4}
                value={formData.content}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, content: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Adicionar tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}
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
                !formData.title.trim() ||
                !formData.content.trim() ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {editingCopy ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
