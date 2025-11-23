"use client"

import { useState } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
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
    title: "Rascunhos",
    color: "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800",
    badgeColor: "bg-slate-500"
  },
  {
    id: "review",
    title: "Copys",
    color: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900",
    badgeColor: "bg-blue-500"
  },
  {
    id: "approved",
    title: "Em Criação",
    color: "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900",
    badgeColor: "bg-green-500"
  },
  {
    id: "production",
    title: "Finalizados",
    color: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900",
    badgeColor: "bg-purple-500"
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
  const { toast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const getDocsByStatus = (status: string) => {
    return documents.filter(doc => (doc.status || "draft") === status)
  }

  const findContainer = (id: string) => {
    if (COLUMNS.find(col => col.id === id)) {
      return id
    }

    const doc = documents.find(d => d.id === id)
    return doc?.status || "draft"
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      return
    }

    const activeContainer = findContainer(active.id as string)
    const overContainer = findContainer(over.id as string)

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
  }

  const activeDocument = activeId ? documents.find(d => d.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 min-h-full overflow-x-auto pb-4 scrollbar-thin">
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
