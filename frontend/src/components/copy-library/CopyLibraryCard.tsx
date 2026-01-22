'use client'

import { useState } from 'react'
import { Copy, MoreVertical, Pencil, Trash2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { CopyLibraryItem } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CopyLibraryCardProps {
  copy: CopyLibraryItem
  onUseAsPrompt?: (content: string) => void
  onEdit?: (copy: CopyLibraryItem) => void
  onDelete?: (copyId: string) => void
  isSelected?: boolean
}

export function CopyLibraryCard({
  copy,
  onUseAsPrompt,
  onEdit,
  onDelete,
  isSelected,
}: CopyLibraryCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(copy.content)
      toast.success('Copiado para a área de transferência')
    } catch {
      toast.error('Falha ao copiar')
    }
  }

  const handleUseAsPrompt = () => {
    onUseAsPrompt?.(copy.content)
  }

  const handleDelete = () => {
    onDelete?.(copy.id)
    setShowDeleteDialog(false)
  }

  return (
    <>
      <div
        className={cn(
          'group rounded-lg border bg-card p-4 transition-all hover:shadow-md',
          isSelected && 'ring-2 ring-primary'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{copy.title}</h4>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
              {copy.content}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleUseAsPrompt}>
                <Wand2 className="mr-2 h-4 w-4" />
                Usar como Prompt
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyToClipboard}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar texto
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit?.(copy)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {copy.tags && copy.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {copy.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {copy.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{copy.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {new Date(copy.updated_at).toLocaleDateString('pt-BR')}
          </span>
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs"
            onClick={handleUseAsPrompt}
          >
            <Wand2 className="mr-1 h-3 w-3" />
            Usar como Prompt
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover copy da biblioteca?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A copy "{copy.title}" será
              permanentemente removida da biblioteca.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
