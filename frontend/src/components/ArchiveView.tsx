"use client"

import { useState, useEffect } from "react"
import { Archive, RotateCcw, File, Folder, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { foldersApi, documentsApi, ArchivedItem } from "@/lib/folders-api"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

interface ArchiveViewProps {
  projectId: string
  onRestore?: () => void
}

export default function ArchiveView({ projectId, onRestore }: ArchiveViewProps) {
  const [open, setOpen] = useState(false)
  const [archivedDocuments, setArchivedDocuments] = useState<any[]>([])
  const [archivedFolders, setArchivedFolders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadArchivedItems()
    }
  }, [open, projectId])

  const loadArchivedItems = async () => {
    setLoading(true)
    try {
      const [docsResponse, foldersResponse] = await Promise.all([
        documentsApi.listArchived(projectId),
        foldersApi.listArchived(projectId)
      ])

      // APIs now return arrays directly (migrated to Supabase)
      setArchivedDocuments(Array.isArray(docsResponse) ? docsResponse : (docsResponse as any).documents || [])
      setArchivedFolders(Array.isArray(foldersResponse) ? foldersResponse : (foldersResponse as any).folders || [])
    } catch (error) {
      console.error("Failed to load archived items", error)
      toast({
        title: "Erro",
        description: "Falha ao carregar itens arquivados",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRestoreDocument = async (docId: string, title: string) => {
    try {
      await documentsApi.restore(docId)
      toast({
        title: "Restaurado",
        description: `Documento "${title}" foi restaurado com sucesso`
      })
      loadArchivedItems()
      onRestore?.()
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao restaurar documento",
        variant: "destructive"
      })
    }
  }

  const handleRestoreFolder = async (folderId: string, name: string, restoreContents: boolean = false) => {
    try {
      await foldersApi.restore(folderId, restoreContents)
      toast({
        title: "Restaurado",
        description: `Pasta "${name}" foi restaurada com sucesso`
      })
      loadArchivedItems()
      onRestore?.()
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao restaurar pasta",
        variant: "destructive"
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const totalItems = archivedDocuments.length + archivedFolders.length

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Archive className="h-4 w-4" />
          Arquivados
          {totalItems > 0 && (
            <Badge variant="secondary" className="ml-1">
              {totalItems}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Itens Arquivados</DialogTitle>
          <DialogDescription>
            Restaure documentos e pastas arquivados para voltar a usá-los
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Carregando...</div>
            </div>
          ) : totalItems === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Archive className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium">Nenhum item arquivado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Itens arquivados aparecem aqui
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Archived Folders */}
              {archivedFolders.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                    Pastas ({archivedFolders.length})
                  </h4>
                  <div className="space-y-2">
                    {archivedFolders.map(folder => (
                      <Card key={folder.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <Folder className="h-5 w-5 text-blue-500" />
                            <div className="flex-1">
                              <div className="font-medium">{folder.name}</div>
                              <div className="text-xs text-muted-foreground">
                                Arquivado em {formatDate(folder.deleted_at)}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRestoreFolder(folder.id, folder.name, false)}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Restaurar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleRestoreFolder(folder.id, folder.name, true)}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Restaurar com conteúdo
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Archived Documents */}
              {archivedDocuments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                    Documentos ({archivedDocuments.length})
                  </h4>
                  <div className="space-y-2">
                    {archivedDocuments.map(doc => (
                      <Card key={doc.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <File className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1">
                              <div className="font-medium">{doc.title}</div>
                              <div className="text-xs text-muted-foreground">
                                Arquivado em {formatDate(doc.deleted_at)}
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleRestoreDocument(doc.id, doc.title)}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Restaurar
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
