"use client"

import React, { useState, useEffect } from "react"
import { ChevronRight, ChevronDown, Folder, FolderOpen, File, Plus, Trash2, Edit2, FolderPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { foldersApi, documentsApi, Folder as FolderType } from "@/lib/folders-api"
import { useToast } from "@/components/ui/use-toast"

interface Document {
  id: string
  title: string
  folder_id?: string | null
  status: string
  content?: string
  created_at: string
  type: "creation" | "context"
  is_context?: boolean
}

interface FolderTreeProps {
  projectId: string
  documents: Document[]
  selectedDoc: Document | null
  onSelectDocument: (doc: Document) => void
  onRefresh: () => void
}

interface TreeNode {
  type: 'folder' | 'document'
  data: FolderType | Document
  children?: TreeNode[]
  expanded?: boolean
}

export default function FolderTree({
  projectId,
  documents,
  selectedDoc,
  onSelectDocument,
  onRefresh
}: FolderTreeProps) {
  const [folders, setFolders] = useState<FolderType[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [showRenameFolderDialog, setShowRenameFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [renameFolderName, setRenameFolderName] = useState("")
  const [selectedFolder, setSelectedFolder] = useState<FolderType | null>(null)
  const [parentFolder, setParentFolder] = useState<FolderType | null>(null)
  const [draggedItem, setDraggedItem] = useState<{type: 'document' | 'folder', id: string} | null>(null)
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadFolders()
  }, [projectId])

  const loadFolders = async () => {
    try {
      const response = await foldersApi.list(projectId)
      setFolders(response.folders || [])
    } catch (error) {
      console.error("Failed to load folders", error)
    }
  }

  const buildTree = (): TreeNode[] => {
    const tree: TreeNode[] = []
    const folderMap = new Map<string, TreeNode>()

    // Create folder nodes
    folders.forEach(folder => {
      const node: TreeNode = {
        type: 'folder',
        data: folder,
        children: [],
        expanded: expandedFolders.has(folder.id)
      }
      folderMap.set(folder.id, node)
    })

    // Build folder hierarchy
    folders.forEach(folder => {
      const node = folderMap.get(folder.id)!
      if (folder.parent_folder_id) {
        const parent = folderMap.get(folder.parent_folder_id)
        if (parent) {
          parent.children!.push(node)
        } else {
          tree.push(node)
        }
      } else {
        tree.push(node)
      }
    })

    // Add documents to their folders or root
    documents.forEach(doc => {
      const docNode: TreeNode = {
        type: 'document',
        data: doc
      }

      if (doc.folder_id) {
        const parent = folderMap.get(doc.folder_id)
        if (parent) {
          parent.children!.push(docNode)
        } else {
          tree.push(docNode)
        }
      } else {
        tree.push(docNode)
      }
    })

    return tree
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    try {
      await foldersApi.create(projectId, newFolderName, parentFolder?.id)
      toast({
        title: "Pasta criada",
        description: `Pasta "${newFolderName}" criada com sucesso`
      })
      setNewFolderName("")
      setParentFolder(null)
      setShowNewFolderDialog(false)
      loadFolders()
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao criar pasta",
        variant: "destructive"
      })
    }
  }

  const handleRenameFolder = async () => {
    if (!selectedFolder || !renameFolderName.trim()) return

    try {
      await foldersApi.update(selectedFolder.id, renameFolderName)
      toast({
        title: "Pasta renomeada",
        description: `Pasta renomeada para "${renameFolderName}"`
      })
      setRenameFolderName("")
      setSelectedFolder(null)
      setShowRenameFolderDialog(false)
      loadFolders()
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao renomear pasta",
        variant: "destructive"
      })
    }
  }

  const handleDeleteFolder = async (folder: FolderType) => {
    if (!confirm(`Arquivar pasta "${folder.name}" e todo seu conteúdo?`)) return

    try {
      await foldersApi.delete(folder.id, true)
      toast({
        title: "Pasta arquivada",
        description: `Pasta "${folder.name}" foi arquivada. Você pode restaurá-la depois.`
      })
      loadFolders()
      onRefresh()
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao arquivar pasta",
        variant: "destructive"
      })
    }
  }

  const handleMoveDocument = async (doc: Document, targetFolderId: string | null) => {
    try {
      await documentsApi.move(doc.id, targetFolderId)
      toast({
        title: "Documento movido",
        description: `"${doc.title}" foi movido com sucesso`
      })
      onRefresh()
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao mover documento",
        variant: "destructive"
      })
    }
  }

  const handleMoveFolder = async (folderId: string, targetParentId: string | null) => {
    try {
      await foldersApi.move(folderId, targetParentId)
      toast({
        title: "Pasta movida",
        description: "Pasta movida com sucesso"
      })
      loadFolders()
      onRefresh()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.response?.data?.detail || "Falha ao mover pasta",
        variant: "destructive"
      })
    }
  }

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, type: 'document' | 'folder', id: string) => {
    setDraggedItem({ type, id })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverFolder(folderId || 'root')
  }

  const handleDragLeave = () => {
    setDragOverFolder(null)
  }

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedItem) return

    if (draggedItem.type === 'document') {
      const doc = documents.find(d => d.id === draggedItem.id)
      if (doc) {
        await handleMoveDocument(doc, targetFolderId)
      }
    } else if (draggedItem.type === 'folder') {
      // Don't allow dropping folder into itself
      if (draggedItem.id !== targetFolderId) {
        await handleMoveFolder(draggedItem.id, targetFolderId)
      }
    }

    setDraggedItem(null)
    setDragOverFolder(null)
  }

  const renderNode = (node: TreeNode, depth: number = 0): React.ReactElement => {
    if (node.type === 'folder') {
      const folder = node.data as FolderType
      const isExpanded = expandedFolders.has(folder.id)
      const isDragOver = dragOverFolder === folder.id

      return (
        <div key={folder.id}>
          <ContextMenu>
            <ContextMenuTrigger>
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, 'folder', folder.id)}
                onDragOver={(e) => handleDragOver(e, folder.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, folder.id)}
                className={`flex items-center gap-2 py-1 px-2 hover:bg-accent rounded-md cursor-pointer transition-colors ${
                  isDragOver ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500' : ''
                }`}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                onClick={() => toggleFolder(folder.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                {isExpanded ? (
                  <FolderOpen className="h-4 w-4 text-blue-500" />
                ) : (
                  <Folder className="h-4 w-4 text-blue-500" />
                )}
                <span className="text-sm font-medium">{folder.name}</span>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => {
                setParentFolder(folder)
                setShowNewFolderDialog(true)
              }}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Nova pasta aqui
              </ContextMenuItem>
              <ContextMenuItem onClick={() => {
                setSelectedFolder(folder)
                setRenameFolderName(folder.name)
                setShowRenameFolderDialog(true)
              }}>
                <Edit2 className="h-4 w-4 mr-2" />
                Renomear
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => handleDeleteFolder(folder)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Arquivar pasta
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>

          {isExpanded && node.children && (
            <div>
              {node.children.map(child => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      )
    } else {
      const doc = node.data as Document
      const isSelected = selectedDoc?.id === doc.id
      const isDragging = draggedItem?.type === 'document' && draggedItem.id === doc.id

      return (
        <div
          key={doc.id}
          draggable
          onDragStart={(e) => handleDragStart(e, 'document', doc.id)}
          className={`flex items-center gap-2 py-1 px-2 hover:bg-accent rounded-md cursor-pointer ${
            isSelected ? 'bg-accent' : ''
          } ${isDragging ? 'opacity-50' : ''}`}
          style={{ paddingLeft: `${depth * 16 + 32}px` }}
          onClick={() => onSelectDocument(doc)}
        >
          <File className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm truncate">{doc.title}</span>
        </div>
      )
    }
  }

  const tree = buildTree()
  const isDragOverRoot = dragOverFolder === 'root'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-2 px-2">
        <h3 className="text-sm font-semibold">Arquivos</h3>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={() => {
            setParentFolder(null)
            setShowNewFolderDialog(true)
          }}
          title="Nova pasta na raiz"
        >
          <FolderPlus className="h-4 w-4" />
        </Button>
      </div>

      {/* Drop zone for root */}
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            onDragOver={(e) => handleDragOver(e, null)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, null)}
            className={`min-h-[200px] ${isDragOverRoot ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-500 rounded-md' : ''}`}
          >
            {tree.map(node => renderNode(node))}
            {tree.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Folder className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-xs">Nenhum arquivo ainda</p>
                <p className="text-xs">Arraste arquivos aqui</p>
              </div>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => {
            setParentFolder(null)
            setShowNewFolderDialog(true)
          }}>
            <FolderPlus className="h-4 w-4 mr-2" />
            Nova pasta na raiz
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar nova pasta</DialogTitle>
            <DialogDescription>
              {parentFolder ? `Dentro de "${parentFolder.name}"` : 'Na raiz do projeto'}
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Nome da pasta"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateFolder}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={showRenameFolderDialog} onOpenChange={setShowRenameFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear pasta</DialogTitle>
            <DialogDescription>
              Renomear "{selectedFolder?.name}"
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Novo nome"
            value={renameFolderName}
            onChange={(e) => setRenameFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRenameFolder()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameFolderDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRenameFolder}>Renomear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
