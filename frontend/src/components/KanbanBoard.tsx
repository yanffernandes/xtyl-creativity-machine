"use client"

import { useState, useCallback, useRef } from "react"
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
  getFirstCollision,
} from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, GripVertical, Star, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import KanbanCard from "./KanbanCard"
import KanbanColumn from "./KanbanColumn"
import api from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"

interface Document {
  id: string
  title: string
  status: string
  created_at: string
  type: "creation" | "context"
  content?: string
  is_context?: boolean
}

interface KanbanBoardProps {
  documents: Document[]
  onSelectDocument: (doc: Document) => void
  onToggleContext?: (e: React.MouseEvent, doc: Document) => void
  onDelete?: (e: React.MouseEvent, doc: Document) => void
  onStatusChange?: (docId: string, newStatus: string) => void
}

const COLUMNS = [
  {
    id: "draft",
    title: "Rascunho",
    accentColor: "bg-slate-400",
    badgeColor: "bg-slate-500"
  },
  {
    id: "text_ok",
    title: "Texto OK",
    accentColor: "bg-blue-500",
    badgeColor: "bg-blue-500"
  },
  {
    id: "art_ok",
    title: "Arte OK",
    accentColor: "bg-green-500",
    badgeColor: "bg-green-500"
  },
  {
    id: "done",
    title: "Finalizado",
    accentColor: "bg-purple-500",
    badgeColor: "bg-purple-500"
  },
  {
    id: "published",
    title: "Publicado",
    accentColor: "bg-amber-500",
    badgeColor: "bg-amber-500"
  },
]

export default function KanbanBoard({
  documents,
  onSelectDocument,
  onToggleContext,
  onDelete,
  onStatusChange
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const lastOverId = useRef<string | null>(null)
  const { toast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const getDocsByStatus = (status: string) => {
    return documents.filter(doc => (doc.status || "draft") === status)
  }

  const findContainer = useCallback((id: string) => {
    // Check if id is a column
    if (COLUMNS.find(col => col.id === id)) {
      return id
    }

    // Otherwise find which column contains the document
    const doc = documents.find(d => d.id === id)
    return doc?.status || "draft"
  }, [documents])

  // Custom collision detection that prioritizes columns
  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      // First, check if we're over a droppable column using pointerWithin
      const pointerCollisions = pointerWithin(args)
      const columnCollision = pointerCollisions.find(
        collision => COLUMNS.some(col => col.id === collision.id)
      )

      if (columnCollision) {
        return [columnCollision]
      }

      // Fallback to rectangle intersection for better detection
      const rectCollisions = rectIntersection(args)
      const rectColumnCollision = rectCollisions.find(
        collision => COLUMNS.some(col => col.id === collision.id)
      )

      if (rectColumnCollision) {
        return [rectColumnCollision]
      }

      // Return any collision found
      return pointerCollisions.length > 0 ? pointerCollisions : rectCollisions
    },
    []
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    const overId = over?.id as string | undefined

    if (overId) {
      const container = findContainer(overId)
      setOverId(container)
      lastOverId.current = container
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    setOverId(null)

    if (!over) {
      setActiveId(null)
      return
    }

    const activeContainer = findContainer(active.id as string)
    // Use the over id to find the container, prioritizing columns
    let overContainer = COLUMNS.find(col => col.id === over.id)?.id || findContainer(over.id as string)

    if (activeContainer !== overContainer) {
      const doc = documents.find(d => d.id === active.id)
      if (doc) {
        try {
          // Update status via API
          await api.put(`/documents/${doc.id}`, { status: overContainer })

          // Notify parent component
          if (onStatusChange) {
            onStatusChange(doc.id, overContainer)
          }

          toast({
            title: "Status atualizado",
            description: `"${doc.title}" movido para ${COLUMNS.find(c => c.id === overContainer)?.title}`,
          })
        } catch (error) {
          console.error("Failed to update document status", error)
          toast({
            title: "Erro",
            description: "Falha ao atualizar status do documento",
            variant: "destructive"
          })
        }
      }
    }

    setActiveId(null)
  }

  const handleDragCancel = () => {
    setActiveId(null)
    setOverId(null)
  }

  const activeDocument = activeId ? documents.find(d => d.id === activeId) : null

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
        {COLUMNS.map((column) => {
          const columnDocs = getDocsByStatus(column.id)

          return (
            <KanbanColumn
              key={column.id}
              column={column}
              documents={columnDocs}
              onSelectDocument={onSelectDocument}
              onToggleContext={onToggleContext}
              onDelete={onDelete}
            />
          )
        })}
      </div>

      <DragOverlay>
        {activeDocument ? (
          <Card className="w-[280px] rotate-3 shadow-2xl cursor-grabbing opacity-90 border-primary border-2">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <FileText className="h-5 w-5 text-primary" />
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-medium text-sm line-clamp-2">{activeDocument.title}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(activeDocument.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
