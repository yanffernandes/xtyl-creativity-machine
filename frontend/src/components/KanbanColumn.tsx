"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import KanbanCard from "./KanbanCard"
import EmptyState from "./EmptyState"
import { FileText } from "lucide-react"

interface Document {
  id: string
  title: string
  status: string
  created_at: string
  type: "creation" | "context"
  content?: string
  is_context?: boolean
}

interface Column {
  id: string
  title: string
  color: string
  badgeColor: string
}

interface KanbanColumnProps {
  column: Column
  documents: Document[]
  onSelectDocument: (doc: Document) => void
  onToggleContext?: (e: React.MouseEvent, doc: Document) => void
  onDelete?: (e: React.MouseEvent, doc: Document) => void
}

export default function KanbanColumn({
  column,
  documents,
  onSelectDocument,
  onToggleContext,
  onDelete
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-w-[280px] w-[320px] rounded-xl p-4 transition-all duration-200 border",
        column.color,
        isOver && "ring-2 ring-primary shadow-lg scale-[1.02]"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm uppercase tracking-wide">{column.title}</h3>
        <Badge className={cn("text-white font-semibold", column.badgeColor)}>
          {documents.length}
        </Badge>
      </div>

      <SortableContext items={documents.map(d => d.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 min-h-[200px]">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
              <FileText className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">
                Arraste documentos aqui
              </p>
            </div>
          ) : (
            documents.map((doc) => (
              <KanbanCard
                key={doc.id}
                document={doc}
                onSelect={onSelectDocument}
                onToggleContext={onToggleContext}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  )
}
