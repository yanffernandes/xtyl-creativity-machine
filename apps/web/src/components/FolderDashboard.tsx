"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { foldersApi } from "@/lib/folders-api"
import { boardsApi } from "@/lib/boards-api"
import { motion } from "framer-motion"
import { Folder, LayoutDashboard, Plus, ChevronRight, FileText, CheckCircle2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface FolderType {
  id: string
  name: string
  parent_folder_id: string | null
  project_id: string
}

interface BoardType {
  id: string
  name: string
  description?: string | null
  folder_id?: string | null
  project_id: string
}

interface Document {
  id: string
  title: string
  status: string
  board_id?: string | null
  media_type?: string
  is_context?: boolean
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:     { label: "Rascunho",  color: "bg-gray-400" },
  text_ok:   { label: "Texto OK",  color: "bg-blue-400" },
  art_ok:    { label: "Arte OK",   color: "bg-violet-400" },
  done:      { label: "Pronto",    color: "bg-emerald-400" },
  published: { label: "Publicado", color: "bg-green-500" },
}

type StatFilter = "all" | "done" | "in_progress"

interface FolderDashboardProps {
  folderId: string
  projectId: string
  workspaceId: string
  allDocuments: Document[]
  onNavigateToBoard: (boardId: string) => void
  onCreateBoard?: (folderId: string) => void
}

export default function FolderDashboard({
  folderId,
  projectId,
  workspaceId,
  allDocuments,
  onNavigateToBoard,
  onCreateBoard,
}: FolderDashboardProps) {
  const router = useRouter()
  const [folder, setFolder] = useState<FolderType | null>(null)
  const [allFolders, setAllFolders] = useState<FolderType[]>([])
  const [allBoards, setAllBoards] = useState<BoardType[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<StatFilter>("all")

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([
      foldersApi.list(projectId),
      boardsApi.list(projectId),
    ]).then(([folders, boards]) => {
      if (cancelled) return
      setAllFolders(folders)
      setAllBoards(boards)
      const found = folders.find((f: FolderType) => f.id === folderId)
      setFolder(found || null)
      setLoading(false)
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [folderId, projectId])

  const subFolders = useMemo(
    () => allFolders.filter(f => f.parent_folder_id === folderId),
    [allFolders, folderId]
  )

  const folderBoards = useMemo(
    () => allBoards.filter(b => b.folder_id === folderId),
    [allBoards, folderId]
  )

  const docsByBoard = useMemo(() => {
    const map: Record<string, Document[]> = {}
    for (const doc of allDocuments) {
      if (doc.is_context || doc.media_type === 'image') continue
      if (!doc.board_id) continue
      if (!map[doc.board_id]) map[doc.board_id] = []
      map[doc.board_id].push(doc)
    }
    return map
  }, [allDocuments])

  const navigateToSubFolder = (subFolderId: string) => {
    router.push(`/workspace/${workspaceId}/project/${projectId}?folder=${subFolderId}`)
  }

  const totalDocs = folderBoards.reduce((sum, b) => sum + (docsByBoard[b.id]?.length || 0), 0)
  const doneDocs = folderBoards.reduce((sum, b) => {
    return sum + (docsByBoard[b.id]?.filter(d => d.status === 'done' || d.status === 'published').length || 0)
  }, 0)
  const inProgressDocs = totalDocs - doneDocs

  // Filter boards based on active stat
  const visibleBoards = useMemo(() => {
    if (activeFilter === "all") return folderBoards
    return folderBoards.filter(b => {
      const docs = docsByBoard[b.id] || []
      if (activeFilter === "done") return docs.some(d => d.status === 'done' || d.status === 'published')
      if (activeFilter === "in_progress") return docs.some(d => d.status !== 'done' && d.status !== 'published')
      return true
    })
  }, [folderBoards, docsByBoard, activeFilter])

  if (loading) {
    return <FolderDashboardSkeleton />
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Folder className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{folder?.name || "Pasta"}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {folderBoards.length} quadro{folderBoards.length !== 1 ? 's' : ''}
            {subFolders.length > 0 && ` · ${subFolders.length} sub-pasta${subFolders.length !== 1 ? 's' : ''}`}
            {totalDocs > 0 && ` · ${totalDocs} criação${totalDocs !== 1 ? 'ões' : ''}`}
          </p>
        </div>
      </div>

      {/* Filterable stats — only shown when there are documents */}
      {totalDocs > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<FileText className="h-4 w-4" />}
            label="Total"
            value={totalDocs}
            color="text-muted-foreground"
            active={activeFilter === "all"}
            onClick={() => setActiveFilter(activeFilter === "all" ? "all" : "all")}
          />
          <StatCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Concluídas"
            value={doneDocs}
            color="text-emerald-600 dark:text-emerald-400"
            active={activeFilter === "done"}
            onClick={() => setActiveFilter(activeFilter === "done" ? "all" : "done")}
          />
          <StatCard
            icon={<Clock className="h-4 w-4" />}
            label="Em andamento"
            value={inProgressDocs}
            color="text-amber-600 dark:text-amber-400"
            active={activeFilter === "in_progress"}
            onClick={() => setActiveFilter(activeFilter === "in_progress" ? "all" : "in_progress")}
          />
        </div>
      )}

      {/* Sub-folders */}
      {subFolders.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Sub-pastas</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {subFolders.map((sf, i) => {
              const sfBoardIds = allBoards.filter(b => b.folder_id === sf.id).map(b => b.id)
              const sfDocCount = sfBoardIds.reduce((sum, bid) => sum + (docsByBoard[bid]?.length || 0), 0)
              return (
                <motion.button
                  key={sf.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.12) }}
                  onClick={() => navigateToSubFolder(sf.id)}
                  className="group flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card/50 hover:bg-card hover:border-primary/30 hover:shadow-sm transition-all text-left"
                >
                  <Folder className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{sf.name}</div>
                    {sfDocCount > 0 && (
                      <div className="text-xs text-muted-foreground">{sfDocCount} criação{sfDocCount !== 1 ? 'ões' : ''}</div>
                    )}
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-40 group-hover:opacity-100 shrink-0 transition-opacity" />
                </motion.button>
              )
            })}
          </div>
        </section>
      )}

      {/* Boards */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            Quadros
            {activeFilter !== "all" && (
              <button
                onClick={() => setActiveFilter("all")}
                className="ml-2 text-xs text-primary hover:underline"
              >
                limpar filtro
              </button>
            )}
          </h2>
          {onCreateBoard && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => onCreateBoard(folderId)}
            >
              <Plus className="h-3.5 w-3.5" />
              Novo quadro
            </Button>
          )}
        </div>

        {folderBoards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border border-dashed border-border/60 rounded-xl">
            <LayoutDashboard className="h-8 w-8 mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum quadro nesta pasta</p>
            {onCreateBoard && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-1.5"
                onClick={() => onCreateBoard(folderId)}
              >
                <Plus className="h-3.5 w-3.5" />
                Criar quadro
              </Button>
            )}
          </div>
        ) : visibleBoards.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhum quadro com esse filtro.{" "}
            <button onClick={() => setActiveFilter("all")} className="text-primary hover:underline">
              Ver todos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visibleBoards.map((board, i) => {
              const boardDocs = docsByBoard[board.id] || []
              const statusCounts = boardDocs.reduce<Record<string, number>>((acc, doc) => {
                acc[doc.status] = (acc[doc.status] || 0) + 1
                return acc
              }, {})

              return (
                <motion.div
                  key={board.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.05, 0.15) }}
                  onClick={() => onNavigateToBoard(board.id)}
                  className="group cursor-pointer rounded-xl border border-border/60 bg-card/60 hover:bg-card hover:border-primary/40 hover:shadow-md transition-all p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <LayoutDashboard className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium text-sm truncate">{board.name}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-40 group-hover:opacity-100 shrink-0 mt-0.5 transition-opacity" />
                  </div>

                  {board.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{board.description}</p>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    <span>{boardDocs.length} criação{boardDocs.length !== 1 ? 'ões' : ''}</span>
                  </div>

                  {boardDocs.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                        {Object.entries(STATUS_LABELS).map(([status, meta]) => {
                          const count = statusCounts[status] || 0
                          if (count === 0) return null
                          const pct = Math.round((count / boardDocs.length) * 100)
                          return (
                            <div
                              key={status}
                              className={cn("rounded-full transition-all", meta.color)}
                              style={{ width: `${pct}%` }}
                              title={`${meta.label}: ${count}`}
                            />
                          )
                        })}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(STATUS_LABELS).map(([status, meta]) => {
                          const count = statusCounts[status] || 0
                          if (count === 0) return null
                          return (
                            <span
                              key={status}
                              className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full bg-muted/60"
                            >
                              <span className={cn("w-1.5 h-1.5 rounded-full", meta.color)} />
                              {meta.label} · {count}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 space-y-1 text-left transition-all",
        active
          ? "border-primary/50 bg-primary/5 shadow-sm"
          : "border-border/60 bg-card/50 hover:bg-card hover:border-border"
      )}
    >
      <div className={cn("flex items-center gap-1.5 text-xs font-medium", color)}>
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
    </button>
  )
}

function FolderDashboardSkeleton() {
  return (
    <div className="h-full overflow-y-auto px-6 py-6 space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted/60" />
        <div className="space-y-1.5">
          <div className="h-5 w-32 rounded-md bg-muted/60" />
          <div className="h-3.5 w-48 rounded-md bg-muted/40" />
        </div>
      </div>
      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-2">
            <div className="h-3 w-16 rounded bg-muted/60" />
            <div className="h-6 w-8 rounded bg-muted/60" />
          </div>
        ))}
      </div>
      {/* Board cards skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-16 rounded bg-muted/50" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-3">
              <div className="h-4 w-3/4 rounded bg-muted/60" />
              <div className="h-3 w-1/3 rounded bg-muted/40" />
              <div className="h-2 w-full rounded-full bg-muted/50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
