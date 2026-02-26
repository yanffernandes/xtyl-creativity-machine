"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FolderPlus,
  Trash2,
  Edit2,
  Image as ImageIcon,
  FileImage,
  Palette,
  Sparkles,
  LayoutDashboard,
  Columns3,
  Plus,
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
import { foldersApi } from "@/lib/folders-api"
import { boardsApi } from "@/lib/boards-api"
import { useToast } from "@/components/ui/use-toast"

interface Document {
  id: string
  title: string
  status: string
  board_id?: string | null
  media_type?: "text" | "image" | "pdf"
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

interface BoardType {
  id: string
  project_id: string
  folder_id?: string | null
  name: string
  description?: string | null
  position?: number
}

interface Project {
  id: string
  name: string
  description?: string | null
  documents?: Document[]
  boards?: Array<{
    id: string
    name: string
    description?: string | null
    position?: number
    folder_id?: string | null
  }>
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

export default function ProjectTreeItem({
  project,
  workspaceId,
  isActive,
  isExpanded,
  onToggle,
  documentCount = 0,
  visualAssets = [],
  onDocumentNavigate,
  onRefresh,
}: ProjectTreeItemProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentBoardId = searchParams.get("board") || undefined
  const { toast } = useToast()

  const [folders, setFolders] = useState<FolderType[]>([])
  const [boards, setBoards] = useState<BoardType[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [expandedAssetTypes, setExpandedAssetTypes] = useState<Set<string>>(new Set())

  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [showRenameFolderDialog, setShowRenameFolderDialog] = useState(false)
  const [showNewBoardDialog, setShowNewBoardDialog] = useState(false)
  const [showRenameBoardDialog, setShowRenameBoardDialog] = useState(false)

  const [newFolderName, setNewFolderName] = useState("")
  const [newBoardName, setNewBoardName] = useState("")
  const [newBoardParentFolderId, setNewBoardParentFolderId] = useState<string | null>(null)

  const [folderToRename, setFolderToRename] = useState<FolderType | null>(null)
  const [boardToRename, setBoardToRename] = useState<BoardType | null>(null)
  const [renameValue, setRenameValue] = useState("")

  const [draggedBoardId, setDraggedBoardId] = useState<string | null>(null)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  const [isDragOverRootBoards, setIsDragOverRootBoards] = useState(false)

  useEffect(() => {
    if (isExpanded && project.id) {
      void loadFolders()
      void loadBoards()
    }
  }, [isExpanded, project.id])

  useEffect(() => {
    if (project.boards && project.boards.length > 0) {
      setBoards(
        project.boards.map((b) => ({
          id: b.id,
          project_id: project.id,
          name: b.name,
          description: b.description,
          position: b.position,
          folder_id: b.folder_id ?? null,
        }))
      )
    }
  }, [project.boards, project.id])

  const loadFolders = async () => {
    try {
      const data = await foldersApi.list(project.id)
      const foldersArray = Array.isArray(data) ? data : ((data as any).folders || [])
      setFolders(foldersArray.filter((f: FolderType) => !f.deleted_at))
    } catch (error) {
      console.error("Failed to load folders:", error)
      setFolders([])
    }
  }

  const loadBoards = async () => {
    try {
      const boardList = await boardsApi.list(project.id)
      setBoards(boardList)
    } catch (error) {
      console.error("Failed to load boards:", error)
      setBoards([])
    }
  }

  const documents = useMemo(() => (project.documents || []).filter((doc) => !doc.is_reference_asset), [project.documents])

  const boardDocumentsCount = useMemo(() => {
    const countMap: Record<string, number> = {}
    documents.forEach((doc) => {
      if (!doc.board_id) return
      countMap[doc.board_id] = (countMap[doc.board_id] || 0) + 1
    })
    return countMap
  }, [documents])

  const foldersByParent = useMemo(() => {
    const map: Record<string, FolderType[]> = {}
    folders.forEach((folder) => {
      const key = folder.parent_folder_id ?? "__root__"
      if (!map[key]) map[key] = []
      map[key].push(folder)
    })
    return map
  }, [folders])

  const boardsByFolder = useMemo(() => {
    const map: Record<string, BoardType[]> = {}
    boards.forEach((board) => {
      const key = board.folder_id ?? "__root__"
      if (!map[key]) map[key] = []
      map[key].push(board)
    })
    return map
  }, [boards])

  const assetTypeInfo: Record<string, { label: string; icon: any }> = {
    logo: { label: "Logos", icon: Palette },
    icon: { label: "Icones", icon: Sparkles },
    reference: { label: "Imagens de Referencia", icon: ImageIcon },
    texture: { label: "Texturas", icon: ImageIcon },
    pattern: { label: "Padroes", icon: ImageIcon },
    outros: { label: "Outros", icon: FileImage },
  }

  const groupedAssets: Record<string, Document[]> = {}
  visualAssets.forEach((asset) => {
    const type = asset.asset_type || "outros"
    if (!groupedAssets[type]) groupedAssets[type] = []
    groupedAssets[type].push(asset)
  })

  const handleProjectClick = () => {
    router.push(`/workspace/${workspaceId}/project/${project.id}`)
    if (!isExpanded) onToggle()
  }

  const handleBoardClick = (boardId: string) => {
    const url = `/workspace/${workspaceId}/project/${project.id}?board=${boardId}&view=kanban`
    if (onDocumentNavigate) onDocumentNavigate(url)
    else router.push(url)
  }

  const handleAssetClick = (assetId: string) => {
    const url = `/workspace/${workspaceId}/project/${project.id}?tab=assets&assetId=${assetId}`
    if (onDocumentNavigate) onDocumentNavigate(url)
    else router.push(url)
  }

  const handleMoveBoardToFolder = async (boardId: string, folderId: string | null) => {
    try {
      await boardsApi.moveToFolder(boardId, folderId)
      toast({ title: "Sucesso", description: folderId ? "Quadro movido para pasta" : "Quadro movido para raiz" })
      await loadBoards()
      onRefresh?.()
    } catch {
      toast({ title: "Erro", description: "Falha ao mover quadro", variant: "destructive" })
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      await foldersApi.create(project.id, newFolderName)
      toast({ title: "Sucesso", description: "Pasta criada" })
      setNewFolderName("")
      setShowNewFolderDialog(false)
      await loadFolders()
      onRefresh?.()
    } catch {
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
    } catch {
      toast({ title: "Erro", description: "Falha ao renomear pasta", variant: "destructive" })
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await foldersApi.delete(folderId)
      toast({ title: "Sucesso", description: "Pasta arquivada" })
      await loadFolders()
      onRefresh?.()
    } catch {
      toast({ title: "Erro", description: "Falha ao arquivar pasta", variant: "destructive" })
    }
  }

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return
    try {
      await boardsApi.create(project.id, newBoardName, undefined, newBoardParentFolderId)
      toast({ title: "Sucesso", description: "Quadro criado" })
      setNewBoardName("")
      setNewBoardParentFolderId(null)
      setShowNewBoardDialog(false)
      await loadBoards()
      onRefresh?.()
    } catch {
      toast({ title: "Erro", description: "Falha ao criar quadro", variant: "destructive" })
    }
  }

  const handleRenameBoard = async () => {
    if (!boardToRename || !renameValue.trim()) return
    try {
      await boardsApi.update(boardToRename.id, { name: renameValue })
      toast({ title: "Sucesso", description: "Quadro renomeado" })
      setBoardToRename(null)
      setRenameValue("")
      setShowRenameBoardDialog(false)
      await loadBoards()
      onRefresh?.()
    } catch {
      toast({ title: "Erro", description: "Falha ao renomear quadro", variant: "destructive" })
    }
  }

  const handleDeleteBoard = async (boardId: string) => {
    try {
      await boardsApi.delete(boardId)
      toast({ title: "Sucesso", description: "Quadro removido" })
      await loadBoards()
      onRefresh?.()
    } catch {
      toast({ title: "Erro", description: "Falha ao remover quadro", variant: "destructive" })
    }
  }

  const renderBoardNode = (board: BoardType, depth = 0) => {
    const boardCount = boardDocumentsCount[board.id] || 0
    const isActiveBoard = currentBoardId === board.id

    return (
      <ContextMenu key={board.id}>
        <ContextMenuTrigger>
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move"
              e.dataTransfer.setData("text/plain", board.id)
              setDraggedBoardId(board.id)
            }}
            onDragEnd={() => {
              setDraggedBoardId(null)
              setDragOverFolderId(null)
              setIsDragOverRootBoards(false)
            }}
            style={{ paddingLeft: `${depth * 12}px` }}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-secondary/60",
              isActiveBoard && "bg-primary/10 text-primary"
            )}
            onClick={(e) => {
              e.stopPropagation()
              handleBoardClick(board.id)
            }}
          >
            <Columns3 className={cn("h-3.5 w-3.5", isActiveBoard ? "text-primary" : "text-indigo-500")} />
            <span className="text-sm truncate w-0 flex-1" title={board.name}>{board.name}</span>
            <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{boardCount}</span>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuItem onClick={() => {
            setBoardToRename(board)
            setRenameValue(board.name)
            setShowRenameBoardDialog(true)
          }}>
            <Edit2 className="h-4 w-4 mr-2" />
            Renomear
          </ContextMenuItem>
          <ContextMenuItem onClick={() => void handleMoveBoardToFolder(board.id, null)}>
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Mover para raiz
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem className="text-destructive" onClick={() => void handleDeleteBoard(board.id)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Remover
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    )
  }

  const renderFolderNode = (folder: FolderType, depth = 0): React.ReactElement => {
    const isExpanded = expandedFolders.has(folder.id)
    const childFolders = foldersByParent[folder.id] || []
    const childBoards = boardsByFolder[folder.id] || []

    return (
      <div key={folder.id} className="overflow-hidden">
        <ContextMenu>
          <ContextMenuTrigger>
            <div
              style={{ paddingLeft: `${depth * 12}px` }}
              className={cn(
                "group flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer transition-colors w-full overflow-hidden",
                "hover:bg-secondary/60",
                dragOverFolderId === folder.id && "bg-blue-100 dark:bg-blue-900/30 border border-blue-500"
              )}
              onClick={() => {
                setExpandedFolders((prev) => {
                  const next = new Set(prev)
                  if (next.has(folder.id)) next.delete(folder.id)
                  else next.add(folder.id)
                  return next
                })
              }}
              onDragOver={(e) => {
                if (!draggedBoardId) return
                e.preventDefault()
                setDragOverFolderId(folder.id)
              }}
              onDragEnter={(e) => {
                if (!draggedBoardId) return
                e.preventDefault()
                setDragOverFolderId(folder.id)
              }}
              onDragLeave={(e) => {
                const related = e.relatedTarget as Node | null
                if (related && e.currentTarget.contains(related)) return
                setDragOverFolderId(null)
              }}
              onDrop={async (e) => {
                if (!draggedBoardId) return
                e.preventDefault()
                await handleMoveBoardToFolder(draggedBoardId, folder.id)
                setDraggedBoardId(null)
                setDragOverFolderId(null)
              }}
            >
              <div className="relative h-3.5 w-3.5 flex-shrink-0">
                {isExpanded ? (
                  <FolderOpen className="absolute inset-0 h-3.5 w-3.5 text-primary group-hover:opacity-0" />
                ) : (
                  <Folder className="absolute inset-0 h-3.5 w-3.5 text-muted-foreground group-hover:opacity-0" />
                )}
                {isExpanded ? (
                  <ChevronDown className="absolute inset-0 h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
                ) : (
                  <ChevronRight className="absolute inset-0 h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
                )}
              </div>
              <span className="text-sm truncate w-0 flex-1" title={folder.name}>{folder.name}</span>
            </div>
          </ContextMenuTrigger>

          <ContextMenuContent>
            <ContextMenuItem onClick={() => {
              setNewBoardParentFolderId(folder.id)
              setShowNewBoardDialog(true)
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo quadro aqui
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
            <ContextMenuItem className="text-destructive" onClick={() => void handleDeleteFolder(folder.id)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Arquivar
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {childFolders.map((child) => renderFolderNode(child, depth + 1))}
              {childBoards.map((board) => renderBoardNode(board, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  const rootFolders = foldersByParent["__root__"] || []
  const rootBoards = boardsByFolder["__root__"] || []

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
          <div
            className="relative h-4 w-4 flex-shrink-0 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
          >
            <LayoutDashboard className={cn("absolute inset-0 h-4 w-4", isActive || isExpanded ? "text-primary group-hover:opacity-0" : "text-muted-foreground group-hover:opacity-0")} />
            {isExpanded ? (
              <ChevronDown className="absolute inset-0 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
            ) : (
              <ChevronRight className="absolute inset-0 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
            )}
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden" onClick={handleProjectClick}>
            <span className={cn("text-sm truncate transition-smooth w-0 flex-1", isActive ? "font-semibold text-foreground" : "font-medium text-muted-foreground")}>
              {project.name}
            </span>
          </div>

          {documentCount > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">{documentCount}</span>
          )}

          {isExpanded && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowNewFolderDialog(true)
                }}
                title="Criar pasta"
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  setNewBoardParentFolderId(null)
                  setShowNewBoardDialog(true)
                }}
                title="Criar quadro na raiz"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
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
              <div className="ml-3 mt-1 space-y-0.5 overflow-hidden">
                <div
                  className={cn(
                    "rounded-md",
                    isDragOverRootBoards && "bg-blue-100 dark:bg-blue-900/30 border border-blue-500"
                  )}
                  onDragOver={(e) => {
                    if (!draggedBoardId) return
                    e.preventDefault()
                    setIsDragOverRootBoards(true)
                  }}
                  onDragEnter={(e) => {
                    if (!draggedBoardId) return
                    e.preventDefault()
                    setIsDragOverRootBoards(true)
                  }}
                  onDragLeave={(e) => {
                    const related = e.relatedTarget as Node | null
                    if (related && e.currentTarget.contains(related)) return
                    setIsDragOverRootBoards(false)
                  }}
                  onDrop={async (e) => {
                    if (!draggedBoardId) return
                    e.preventDefault()
                    await handleMoveBoardToFolder(draggedBoardId, null)
                    setDraggedBoardId(null)
                    setIsDragOverRootBoards(false)
                  }}
                >
                  {rootFolders.map((folder) => renderFolderNode(folder, 0))}
                  {rootBoards.map((board) => renderBoardNode(board, 0))}
                  {rootFolders.length === 0 && rootBoards.length === 0 && (
                    <div className="px-2 py-1 text-xs text-muted-foreground">Sem itens.</div>
                  )}
                </div>
              </div>

              {visualAssets.length > 0 && (
                <div className="ml-3 mt-2 border-t pt-2 overflow-hidden">
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-full overflow-hidden">
                    <ImageIcon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate w-0 flex-1">Assets Visuais</span>
                    <span className="flex-shrink-0 bg-secondary px-1.5 py-0.5 rounded text-xs">{visualAssets.length}</span>
                  </div>

                  <div className="space-y-0.5 mt-1 overflow-hidden">
                    {Object.entries(groupedAssets).map(([assetType, assets]) => {
                      const typeInfo = assetTypeInfo[assetType] || assetTypeInfo.outros
                      const Icon = typeInfo.icon
                      const isExpanded = expandedAssetTypes.has(assetType)

                      return (
                        <div key={assetType} className="overflow-hidden">
                          <div
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-smooth text-sm w-full overflow-hidden hover:bg-secondary/60"
                            onClick={() => {
                              setExpandedAssetTypes((prev) => {
                                const next = new Set(prev)
                                if (next.has(assetType)) next.delete(assetType)
                                else next.add(assetType)
                                return next
                              })
                            }}
                          >
                            <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform flex-shrink-0", isExpanded && "rotate-90")} />
                            <Icon className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                            <span className="truncate w-0 flex-1 text-sm">{typeInfo.label}</span>
                            <span className="flex-shrink-0 text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{assets.length}</span>
                          </div>

                          {isExpanded && (
                            <div className="ml-6 mt-0.5 space-y-0.5 overflow-hidden">
                              {assets.map((asset) => (
                                <div
                                  key={asset.id}
                                  className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-smooth text-sm w-full overflow-hidden hover:bg-secondary/60"
                                  onClick={() => handleAssetClick(asset.id)}
                                >
                                  <ImageIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                  <span className="truncate w-0 flex-1">{asset.title}</span>
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
            <DialogTitle>Nova pasta</DialogTitle>
            <DialogDescription>Crie uma pasta para organizar quadros</DialogDescription>
          </DialogHeader>
          <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Nome da pasta" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>Cancelar</Button>
            <Button onClick={() => void handleCreateFolder()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRenameFolderDialog} onOpenChange={setShowRenameFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear pasta</DialogTitle>
            <DialogDescription>Digite o novo nome para a pasta</DialogDescription>
          </DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="Nome da pasta" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameFolderDialog(false)}>Cancelar</Button>
            <Button onClick={() => void handleRenameFolder()}>Renomear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewBoardDialog} onOpenChange={setShowNewBoardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo quadro</DialogTitle>
            <DialogDescription>{newBoardParentFolderId ? "Criar quadro dentro da pasta" : "Criar quadro na raiz do projeto"}</DialogDescription>
          </DialogHeader>
          <Input value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} placeholder="Nome do quadro" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewBoardDialog(false)}>Cancelar</Button>
            <Button onClick={() => void handleCreateBoard()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRenameBoardDialog} onOpenChange={setShowRenameBoardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear quadro</DialogTitle>
            <DialogDescription>Digite o novo nome para o quadro</DialogDescription>
          </DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="Nome do quadro" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameBoardDialog(false)}>Cancelar</Button>
            <Button onClick={() => void handleRenameBoard()}>Renomear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
