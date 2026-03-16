"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { foldersApi } from "@/lib/folders-api"
import { boardsApi } from "@/lib/boards-api"
import { motion } from "framer-motion"
import {
  Folder, LayoutDashboard, ChevronRight, FileText,
  CheckCircle2, Clock
} from "lucide-react"
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
  board_column_id?: string | null
  media_type?: string
  is_context?: boolean
}

interface ColumnInfo {
  id: string
  name: string
  color: string | null
  position: number
}

type StatFilter = "all" | "done" | "in_progress"

interface ProjectDashboardProps {
  projectId: string
  projectName: string
  workspaceId: string
  allDocuments: Document[]
  onNavigateToBoard: (boardId: string) => void
  onNavigateToFolder: (folderId: string) => void
}

export default function ProjectDashboard({
  projectId,
  projectName,
  workspaceId,
  allDocuments,
  onNavigateToBoard,
  onNavigateToFolder,
}: ProjectDashboardProps) {
  const [allFolders, setAllFolders] = useState<FolderType[]>([])
  const [allBoards, setAllBoards] = useState<BoardType[]>([])
  const [columnsByBoard, setColumnsByBoard] = useState<Record<string, ColumnInfo[]>>({})
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<StatFilter>("all")

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      foldersApi.list(projectId),
      boardsApi.list(projectId),
    ]).then(async ([folders, boards]) => {
      if (cancelled) return
      setAllFolders(folders)
      setAllBoards(boards)

      // Load columns for all boards in parallel
      const colResults = await Promise.all(
        boards.map(async (b) => {
          try {
            const cols = await boardsApi.listColumns(b.id)
            return [b.id, cols] as [string, ColumnInfo[]]
          } catch {
            return [b.id, []] as [string, ColumnInfo[]]
          }
        })
      )
      if (!cancelled) {
        setColumnsByBoard(Object.fromEntries(colResults))
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [projectId])

  const rootFolders = useMemo(
    () => allFolders.filter(f => !f.parent_folder_id),
    [allFolders]
  )

  const rootBoards = useMemo(
    () => allBoards.filter(b => !b.folder_id),
    [allBoards]
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

  const textDocs = useMemo(
    () => allDocuments.filter(d => !d.is_context && d.media_type !== 'image'),
    [allDocuments]
  )

  // A doc is "done" when it sits in the last column of its board
  const lastColByBoard = useMemo(() => {
    const map: Record<string, string> = {}
    for (const [boardId, cols] of Object.entries(columnsByBoard)) {
      if (cols.length === 0) continue
      const last = [...cols].sort((a, b) => b.position - a.position)[0]
      map[boardId] = last.id
    }
    return map
  }, [columnsByBoard])

  const isDocDone = (doc: Document) => {
    if (!doc.board_id || !doc.board_column_id) return false
    return lastColByBoard[doc.board_id] === doc.board_column_id
  }

  const doneDocs = textDocs.filter(isDocDone)
  const inProgressDocs = textDocs.length - doneDocs.length

  const docsInFolder = (folderId: string): number => {
    const folderBoardIds = allBoards.filter(b => b.folder_id === folderId).map(b => b.id)
    return folderBoardIds.reduce((sum, bid) => sum + (docsByBoard[bid]?.length || 0), 0)
  }

  const boardsInFolder = (folderId: string): number =>
    allBoards.filter(b => b.folder_id === folderId).length

  const visibleRootBoards = useMemo(() => {
    if (activeFilter === "all") return rootBoards
    return rootBoards.filter(b => {
      const docs = docsByBoard[b.id] || []
      if (activeFilter === "done") return docs.some(isDocDone)
      if (activeFilter === "in_progress") return docs.some(d => !isDocDone(d))
      return true
    })
  }, [rootBoards, docsByBoard, activeFilter, lastColByBoard])

  if (loading) {
    return <ProjectDashboardSkeleton />
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{projectName}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {allBoards.length} quadro{allBoards.length !== 1 ? 's' : ''}
          {rootFolders.length > 0 && ` · ${rootFolders.length} pasta${rootFolders.length !== 1 ? 's' : ''}`}
          {textDocs.length > 0 && ` · ${textDocs.length} criação${textDocs.length !== 1 ? 'ões' : ''}`}
        </p>
      </div>

      {/* Filterable stats */}
      {textDocs.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<FileText className="h-4 w-4" />}
            label="Total"
            value={textDocs.length}
            color="text-muted-foreground"
            active={activeFilter === "all"}
            onClick={() => setActiveFilter("all")}
          />
          <StatCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Concluídas"
            value={doneDocs.length}
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

      {/* Folders */}
      {rootFolders.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Pastas</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {rootFolders.map((folder, i) => (
              <motion.button
                key={folder.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.12) }}
                onClick={() => onNavigateToFolder(folder.id)}
                className="group flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card/50 hover:bg-card hover:border-primary/30 hover:shadow-sm transition-all text-left"
              >
                <Folder className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{folder.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {boardsInFolder(folder.id)} quadro{boardsInFolder(folder.id) !== 1 ? 's' : ''}
                    {docsInFolder(folder.id) > 0 && ` · ${docsInFolder(folder.id)} doc`}
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-40 group-hover:opacity-100 shrink-0 transition-opacity" />
              </motion.button>
            ))}
          </div>
        </section>
      )}

      {/* Root boards */}
      {rootBoards.length > 0 && (
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
          </div>

          {visibleRootBoards.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhum quadro com esse filtro.{" "}
              <button onClick={() => setActiveFilter("all")} className="text-primary hover:underline">
                Ver todos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {visibleRootBoards.map((board, i) => {
                const boardDocs = docsByBoard[board.id] || []
                const cols = columnsByBoard[board.id] ?? []
                // Count docs per column
                const colCounts = boardDocs.reduce<Record<string, number>>((acc, doc) => {
                  const key = doc.board_column_id ?? "__unassigned__"
                  acc[key] = (acc[key] || 0) + 1
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

                    {boardDocs.length > 0 && cols.length > 0 && (
                      <div className="space-y-1.5">
                        {/* Column-based progress bar */}
                        <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                          {cols.map((col) => {
                            const count = colCounts[col.id] || 0
                            if (count === 0) return null
                            const pct = Math.round((count / boardDocs.length) * 100)
                            return (
                              <div
                                key={col.id}
                                className="rounded-full"
                                style={{ width: `${pct}%`, backgroundColor: col.color ?? "#64748b" }}
                                title={`${col.name}: ${count}`}
                              />
                            )
                          })}
                        </div>
                        {/* Column legend */}
                        <div className="flex flex-wrap gap-1.5">
                          {cols.map((col) => {
                            const count = colCounts[col.id] || 0
                            if (count === 0) return null
                            return (
                              <span key={col.id} className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full bg-muted/60">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col.color ?? "#64748b" }} />
                                {col.name} · {count}
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
      )}

      {/* Empty state */}
      {rootFolders.length === 0 && rootBoards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
          <LayoutDashboard className="h-10 w-10 mb-4 opacity-25" />
          <p className="text-sm font-medium">Projeto vazio</p>
          <p className="text-xs mt-1 max-w-xs">
            Use o painel lateral para criar pastas e quadros e começar a organizar suas criações.
          </p>
        </div>
      )}
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

function ProjectDashboardSkeleton() {
  return (
    <div className="h-full overflow-y-auto px-6 py-6 space-y-8 animate-pulse">
      <div className="space-y-1.5">
        <div className="h-5 w-40 rounded-md bg-muted/60" />
        <div className="h-3.5 w-56 rounded-md bg-muted/40" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-2">
            <div className="h-3 w-16 rounded bg-muted/60" />
            <div className="h-6 w-8 rounded bg-muted/60" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-4 w-14 rounded bg-muted/50" />
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
