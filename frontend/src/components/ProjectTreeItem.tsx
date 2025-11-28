"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  Circle,
  FolderPlus,
  Trash2,
  Edit2,
  Image as ImageIcon,
  FileImage,
  Palette,
  Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
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
import { foldersApi, documentsApi } from "@/lib/folders-api"
import { useToast } from "@/components/ui/use-toast"

interface Document {
  id: string
  title: string
  status: string
  type?: "creation" | "context"
  folder_id?: string | null
  media_type?: "text" | "image" | "pdf"
  file_url?: string
  thumbnail_url?: string
  is_reference_asset?: boolean
  asset_type?: string
}

interface FolderType {
  id: string
  name: string
  parent_folder_id: string | null
  project_id: string
  created_at: string
  updated_at?: string
  deleted_at?: string | null
}

interface Project {
  id: string
  name: string
  description?: string
  documents?: Document[]
}

interface ProjectTreeItemProps {
  project: Project
  workspaceId: string
  isActive: boolean
  isExpanded: boolean
  onToggle: () => void
  documentCount?: number
  visualAssets?: Document[]
  onDocumentNavigate?: (url: string) => void
  onRefresh?: () => void
}

const statusColors: Record<string, string> = {
  draft: "text-slate-500",
  text_ok: "text-blue-500",
  art_ok: "text-green-500",
  done: "text-purple-500",
  published: "text-amber-500",
}

type TreeNode =
  | { type: 'folder'; data: FolderType; children: TreeNode[] }
  | { type: 'document'; data: Document }

export default function ProjectTreeItem({
  project,
  workspaceId,
  isActive,
  isExpanded,
  onToggle,
  documentCount = 0,
  visualAssets = [],
  onDocumentNavigate,
  onRefresh
}: ProjectTreeItemProps) {
  const router = useRouter()
  const params = useParams()
  const currentDocId = params.documentId as string
  const { toast } = useToast()

  const [folders, setFolders] = useState<FolderType[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [showRenameFolderDialog, setShowRenameFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [parentFolder, setParentFolder] = useState<FolderType | null>(null)
  const [folderToRename, setFolderToRename] = useState<FolderType | null>(null)
  const [renameValue, setRenameValue] = useState("")

  const [draggedItem, setDraggedItem] = useState<{type: 'document' | 'folder', id: string} | null>(null)
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null)

  // Visual Assets state
  const [expandedAssetTypes, setExpandedAssetTypes] = useState<Set<string>>(new Set())
  const [showAssetsSection, setShowAssetsSection] = useState(true)

  useEffect(() => {
    if (isExpanded && project.id) {
      loadFolders()
    }
  }, [isExpanded, project.id])

  const loadFolders = async () => {
    try {
      const data = await foldersApi.list(project.id)
      // Handle both array and object responses
      const foldersArray = Array.isArray(data) ? data : (data.folders || [])
      const activeFolders = foldersArray.filter((f: FolderType) => !f.deleted_at)
      setFolders(activeFolders)
    } catch (error) {
      console.error('Failed to load folders:', error)
      setFolders([])
    }
  }

  const buildTree = (): TreeNode[] => {
    const folderMap = new Map<string, TreeNode>()
    const rootNodes: TreeNode[] = []

    folders.forEach(folder => {
      folderMap.set(folder.id, { type: 'folder', data: folder, children: [] })
    })

    folders.forEach(folder => {
      const node = folderMap.get(folder.id)!
      if (folder.parent_folder_id && folderMap.has(folder.parent_folder_id)) {
        const parentNode = folderMap.get(folder.parent_folder_id)!
        if (parentNode.type === 'folder') {
          parentNode.children.push(node)
        }
      } else {
        rootNodes.push(node)
      }
    })

    const documents = project.documents || []
    documents.forEach(doc => {
      const docNode: TreeNode = { type: 'document', data: doc }

      if (doc.folder_id && folderMap.has(doc.folder_id)) {
        const folder = folderMap.get(doc.folder_id)!
        if (folder.type === 'folder') {
          folder.children.push(docNode)
        }
      } else {
        rootNodes.push(docNode)
      }
    })

    return rootNodes
  }

  // Asset type info for grouping
  const assetTypeInfo: Record<string, { label: string; icon: any }> = {
    'logo': { label: 'Logos', icon: Palette },
    'icon': { label: 'Ícones', icon: Sparkles },
    'reference': { label: 'Imagens de Referência', icon: ImageIcon },
    'texture': { label: 'Texturas', icon: ImageIcon },
    'pattern': { label: 'Padrões', icon: ImageIcon },
    'outros': { label: 'Outros', icon: FileImage }
  }

  // Group visual assets by type
  const groupedAssets: Record<string, Document[]> = {}
  visualAssets.forEach(asset => {
    const type = asset.asset_type || 'outros'
    if (!groupedAssets[type]) {
      groupedAssets[type] = []
    }
    groupedAssets[type].push(asset)
  })

  const toggleAssetType = (assetType: string) => {
    setExpandedAssetTypes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(assetType)) {
        newSet.delete(assetType)
      } else {
        newSet.add(assetType)
      }
      return newSet
    })
  }

  const handleProjectClick = () => {
    router.push(`/workspace/${workspaceId}/project/${project.id}`)
    if (!isExpanded) {
      onToggle()
    }
  }

  const handleDocumentClick = (docId: string) => {
    const url = `/workspace/${workspaceId}/project/${project.id}?doc=${docId}`
    if (onDocumentNavigate) {
      onDocumentNavigate(url)
    } else {
      router.push(url)
    }
  }

  const handleAssetClick = (assetId: string) => {
    const url = `/workspace/${workspaceId}/project/${project.id}?tab=assets&assetId=${assetId}`
    if (onDocumentNavigate) {
      onDocumentNavigate(url)
    } else {
      router.push(url)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    try {
      await foldersApi.create(project.id, newFolderName, parentFolder?.id)
      toast({ title: "Sucesso", description: "Pasta criada com sucesso" })
      setNewFolderName("")
      setParentFolder(null)
      setShowNewFolderDialog(false)
      await loadFolders()
      onRefresh?.()
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao criar pasta", variant: "destructive" })
    }
  }

  const handleRenameFolder = async () => {
    if (!folderToRename || !renameValue.trim()) return

    try {
      await foldersApi.update(folderToRename.id, renameValue)
      toast({ title: "Sucesso", description: "Pasta renomeada" })
      setFolderToRename(null)
      setRenameValue("")
      setShowRenameFolderDialog(false)
      await loadFolders()
      onRefresh?.()
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao renomear pasta", variant: "destructive" })
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await foldersApi.delete(folderId)
      toast({ title: "Sucesso", description: "Pasta arquivada" })
      await loadFolders()
      onRefresh?.()
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao arquivar pasta", variant: "destructive" })
    }
  }

  const handleMoveDocument = async (doc: Document, targetFolderId: string | null) => {
    try {
      await documentsApi.move(doc.id, targetFolderId)

      // Small delay to ensure backend has processed the change
      await new Promise(resolve => setTimeout(resolve, 300))

      toast({ title: "Sucesso", description: "Documento movido" })

      // Reload folders first
      await loadFolders()

      // Force immediate refresh of parent component
      if (onRefresh) {
        await onRefresh()

        // Give React time to re-render with new data
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch (error) {
      console.error('Error moving document:', error)
      toast({ title: "Erro", description: "Falha ao mover documento", variant: "destructive" })
    }
  }

  const handleMoveFolder = async (folderId: string, targetParentId: string | null) => {
    try {
      await foldersApi.move(folderId, targetParentId)
      toast({ title: "Sucesso", description: "Pasta movida" })
      await loadFolders()
      onRefresh?.()
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao mover pasta", variant: "destructive" })
    }
  }

  const handleDragStart = (e: React.DragEvent, type: 'document' | 'folder', id: string) => {
    e.stopPropagation()
    setDraggedItem({ type, id })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDragOverFolder(folderId || 'root')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation()
    setDragOverFolder(null)
  }

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedItem) return

    if (draggedItem.type === 'document') {
      const doc = project.documents?.find(d => d.id === draggedItem.id)
      if (doc) {
        await handleMoveDocument(doc, targetFolderId)
      }
    } else if (draggedItem.type === 'folder') {
      if (draggedItem.id !== targetFolderId) {
        await handleMoveFolder(draggedItem.id, targetFolderId)
      }
    }

    setDraggedItem(null)
    setDragOverFolder(null)
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

  const renderNode = (node: TreeNode, depth: number = 0): React.ReactElement => {
    if (node.type === 'folder') {
      const folder = node.data as FolderType
      const isFolderExpanded = expandedFolders.has(folder.id)
      const isDragOver = dragOverFolder === folder.id
      const isDragging = draggedItem?.type === 'folder' && draggedItem.id === folder.id

      return (
        <div key={folder.id} className="overflow-hidden">
          <ContextMenu>
            <ContextMenuTrigger>
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, 'folder', folder.id)}
                onDragOver={(e) => handleDragOver(e, folder.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, folder.id)}
                style={{ paddingLeft: depth * 12 + 'px' }}
                className={cn(
                  "flex items-center gap-2 py-1 px-2 hover:bg-secondary/60 rounded-md cursor-pointer transition-colors w-full overflow-hidden",
                  isDragOver && "bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500",
                  isDragging && "opacity-50"
                )}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFolder(folder.id)
                  }}
                >
                  {isFolderExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </Button>
                {isFolderExpanded ? (
                  <FolderOpen className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                ) : (
                  <Folder className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                )}
                <span className="text-sm truncate w-0 flex-1" title={folder.name}>{folder.name}</span>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => {
                setParentFolder(folder)
                setShowNewFolderDialog(true)
              }}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Nova subpasta
              </ContextMenuItem>
              <ContextMenuItem onClick={() => {
                setFolderToRename(folder)
                setRenameValue(folder.name)
                setShowRenameFolderDialog(true)
              }}>
                <Edit2 className="h-4 w-4 mr-2" />
                Renomear
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                className="text-destructive"
                onClick={() => handleDeleteFolder(folder.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Arquivar
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>

          <AnimatePresence>
            {isFolderExpanded && node.children.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {node.children.map(child => renderNode(child, depth + 1))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )
    } else {
      const doc = node.data as Document
      const isDocActive = currentDocId === doc.id
      const statusColor = statusColors[doc.status.toLowerCase() as keyof typeof statusColors] || "text-muted-foreground"
      const isDragging = draggedItem?.type === 'document' && draggedItem.id === doc.id

      // Select icon based on media type
      const DocIcon = doc.media_type === 'image' ? FileImage : FileText
      const iconColor = doc.media_type === 'image' ? 'text-blue-500' : ''

      return (
        <div
          key={doc.id}
          draggable
          onDragStart={(e) => handleDragStart(e, 'document', doc.id)}
          style={{ paddingLeft: (depth * 12 + 24) + 'px' }}
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-smooth text-sm w-full overflow-hidden",
            "hover:bg-secondary/60",
            isDocActive && "bg-primary/10 text-primary font-medium",
            isDragging && "opacity-50"
          )}
          onClick={() => handleDocumentClick(doc.id)}
        >
          <DocIcon className={cn("h-3.5 w-3.5 flex-shrink-0", isDocActive ? "text-primary" : (iconColor || "text-muted-foreground"))} />
          <span className="truncate w-0 flex-1" title={doc.title}>{doc.title}</span>
          <Circle className={cn("h-2 w-2 fill-current flex-shrink-0", statusColor)} />
        </div>
      )
    }
  }

  const tree = isExpanded ? buildTree() : []

  return (
    <>
      <div className="select-none overflow-hidden">
        <div
          className={cn(
            "group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-smooth w-full overflow-hidden",
            "hover:bg-secondary/80",
            isActive && "bg-secondary"
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0 hover:bg-transparent flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>

          <div
            className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden"
            onClick={handleProjectClick}
            onDragOver={(e) => handleDragOver(e, null)}
            onDrop={(e) => handleDrop(e, null)}
          >
            {isActive || isExpanded ? (
              <FolderOpen className="h-4 w-4 text-primary flex-shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <span
              className={cn(
                "text-sm truncate transition-smooth w-0 flex-1",
                isActive ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
              )}
              title={project.name}
            >
              {project.name}
            </span>
          </div>

          {documentCount > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
              {documentCount}
            </span>
          )}

          {isExpanded && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                setParentFolder(null)
                setShowNewFolderDialog(true)
              }}
              title="Criar nova pasta"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              {tree.length > 0 ? (
                <div className="ml-3 mt-1 space-y-0.5 overflow-hidden">
                  {tree.map(node => renderNode(node, 0))}
                </div>
              ) : (
                <div className="ml-3 mt-1 px-2 py-3 text-xs text-muted-foreground overflow-hidden">
                  <p className="mb-1">Nenhum documento ou pasta ainda.</p>
                  <p>Clique no ícone <FolderPlus className="inline h-3 w-3" /> para criar uma pasta.</p>
                </div>
              )}

              {/* Visual Assets Section */}
              {visualAssets.length > 0 && (
                <div className="ml-3 mt-2 border-t pt-2 overflow-hidden">
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-full overflow-hidden">
                    <ImageIcon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate w-0 flex-1">Assets Visuais</span>
                    <span className="flex-shrink-0 bg-secondary px-1.5 py-0.5 rounded text-xs">
                      {visualAssets.length}
                    </span>
                  </div>

                  <div className="space-y-0.5 mt-1 overflow-hidden">
                    {Object.entries(groupedAssets).map(([assetType, assets]) => {
                      const typeInfo = assetTypeInfo[assetType] || assetTypeInfo['outros']
                      const Icon = typeInfo.icon
                      const isExpanded = expandedAssetTypes.has(assetType)

                      return (
                        <div key={assetType} className="overflow-hidden">
                          {/* Asset Type Folder */}
                          <div
                            className={cn(
                              "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-smooth text-sm w-full overflow-hidden",
                              "hover:bg-secondary/60"
                            )}
                            onClick={() => toggleAssetType(assetType)}
                          >
                            <ChevronRight className={cn(
                              "h-3.5 w-3.5 text-muted-foreground transition-transform flex-shrink-0",
                              isExpanded && "rotate-90"
                            )} />
                            <Icon className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                            <span className="truncate w-0 flex-1 text-sm" title={typeInfo.label}>{typeInfo.label}</span>
                            <span className="flex-shrink-0 text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                              {assets.length}
                            </span>
                          </div>

                          {/* Asset Items */}
                          {isExpanded && (
                            <div className="ml-6 mt-0.5 space-y-0.5 overflow-hidden">
                              {assets.map(asset => (
                                <div
                                  key={asset.id}
                                  className={cn(
                                    "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-smooth text-sm w-full overflow-hidden",
                                    "hover:bg-secondary/60"
                                  )}
                                  onClick={() => handleAssetClick(asset.id)}
                                >
                                  <ImageIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                  <span className="truncate w-0 flex-1" title={asset.title}>{asset.title}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {parentFolder ? `Nova pasta em "${parentFolder.name}"` : "Nova pasta"}
            </DialogTitle>
            <DialogDescription>
              Crie uma nova pasta para organizar seus documentos
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Nome da pasta"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder()
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateFolder}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRenameFolderDialog} onOpenChange={setShowRenameFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear pasta</DialogTitle>
            <DialogDescription>
              Digite o novo nome para a pasta
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Nome da pasta"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameFolder()
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameFolderDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRenameFolder}>Renomear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
