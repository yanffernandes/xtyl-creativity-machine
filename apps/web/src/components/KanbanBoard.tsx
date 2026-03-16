"use client"

import { useState, useCallback } from "react"
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  CollisionDetection,
} from "@dnd-kit/core"
import { SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import KanbanCard from "./KanbanCard"
import KanbanColumn from "./KanbanColumn"
import boardsApi from "@/lib/boards-api"
import { useToast } from "@/components/ui/use-toast"
import type { BoardColumn } from "@/types/supabase"

interface Document {
  id: string
  title: string
  status: string
  board_column_id?: string | null
  created_at: string
  type: "creation" | "context"
  content?: string
  is_reference_asset?: boolean
}

interface KanbanBoardProps {
  boardId: string
  columns: BoardColumn[]
  documents: Document[]
  onSelectDocument: (doc: Document) => void
  onDelete?: (e: React.MouseEvent, doc: Document) => void
  onColumnChange?: (docId: string, newColumnId: string) => void
  onAddToLibrary?: (doc: Document) => void
  onCreateInColumn?: (columnId: string) => void
  selectedIds?: Set<string>
  onMultiSelect?: (doc: Document, e: React.MouseEvent) => void
}

export default function KanbanBoard({
  boardId,
  columns,
  documents,
  onSelectDocument,
  onDelete,
  onColumnChange,
  onAddToLibrary,
  onCreateInColumn,
  selectedIds,
  onMultiSelect,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const { toast } = useToast()

  const columnIds = columns.map((c) => c.id)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const getDocsByColumn = useCallback(
    (columnId: string) =>
      documents.filter(
        (doc) => doc.board_column_id === columnId && !doc.is_reference_asset
      ),
    [documents]
  )

  const getUnassignedDocs = useCallback(
    () =>
      documents.filter(
        (doc) =>
          !doc.board_column_id && !doc.is_reference_asset
      ),
    [documents]
  )

  const findContainer = useCallback(
    (id: string): string | null => {
      if (columnIds.includes(id) || id === "__unassigned__") return id
      const doc = documents.find((d) => d.id === id)
      return doc?.board_column_id ?? "__unassigned__"
    },
    [columnIds, documents]
  )

  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      const pointerCollisions = pointerWithin(args)
      const colCollision = pointerCollisions.find(
        (c) => columnIds.includes(c.id as string) || c.id === "__unassigned__"
      )
      if (colCollision) return [colCollision]

      const rectCollisions = rectIntersection(args)
      const rectColCollision = rectCollisions.find(
        (c) => columnIds.includes(c.id as string) || c.id === "__unassigned__"
      )
      if (rectColCollision) return [rectColCollision]

      return pointerCollisions.length > 0 ? pointerCollisions : rectCollisions
    },
    [columnIds]
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (over?.id) {
      const container = findContainer(over.id as string)
      setOverId(container)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setOverId(null)

    if (!over) { setActiveId(null); return }

    const activeContainer = findContainer(active.id as string)
    const overContainer =
      columnIds.includes(over.id as string) || over.id === "__unassigned__"
        ? (over.id as string)
        : findContainer(over.id as string)

    if (activeContainer !== overContainer && overContainer && overContainer !== "__unassigned__") {
      const doc = documents.find((d) => d.id === active.id)
      if (doc) {
        // Optimistic update
        onColumnChange?.(doc.id, overContainer)

        boardsApi.assignDocument(doc.id, boardId, overContainer)
          .then(() => {
            const colName = columns.find((c) => c.id === overContainer)?.name ?? overContainer
            toast({ title: "Card movido", description: `"${doc.title}" → ${colName}` })
          })
          .catch(() => {
            // Revert
            onColumnChange?.(doc.id, activeContainer ?? doc.board_column_id ?? "")
            toast({ title: "Erro", description: "Falha ao mover o card. Revertendo...", variant: "destructive" })
          })
      }
    }

    setActiveId(null)
  }

  const handleDragCancel = () => {
    setActiveId(null)
    setOverId(null)
  }

  const activeDocument = activeId ? documents.find((d) => d.id === activeId) : null
  const unassignedDocs = getUnassignedDocs()

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 h-full overflow-x-auto pb-4 scrollbar-thin">
        {/* Real columns from board_columns table */}
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            documents={getDocsByColumn(column.id)}
            isOver={overId === column.id}
            onSelectDocument={onSelectDocument}
            onDelete={onDelete}
            onAddToLibrary={onAddToLibrary}
            onCreateInColumn={onCreateInColumn}
            selectedIds={selectedIds}
            onMultiSelect={onMultiSelect}
          />
        ))}

        {/* Unassigned bucket — shown only when there are unassigned docs */}
        {unassignedDocs.length > 0 && (
          <KanbanColumn
            column={{ id: "__unassigned__", board_id: boardId, name: "Sem Coluna", color: "#94a3b8", position: -1, is_default: false, created_at: "", updated_at: null }}
            documents={unassignedDocs}
            isOver={overId === "__unassigned__"}
            onSelectDocument={onSelectDocument}
            onDelete={onDelete}
            onAddToLibrary={onAddToLibrary}
            selectedIds={selectedIds}
            onMultiSelect={onMultiSelect}
          />
        )}
      </div>

      <DragOverlay>
        {activeDocument ? (
          <Card className="w-[280px] rotate-3 shadow-2xl cursor-grabbing opacity-90 border-primary border-2">
            <CardContent className="p-4">
              <p className="font-medium text-sm line-clamp-2 mb-2">{activeDocument.title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(activeDocument.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
