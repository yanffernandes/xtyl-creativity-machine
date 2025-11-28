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
  accentColor: string
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
        "min-w-[280px] w-[320px] h-full rounded-xl transition-all duration-200 flex flex-col overflow-hidden",
        "bg-secondary/30 dark:bg-secondary/20 border border-border/50",
        isOver && "ring-2 ring-primary shadow-lg scale-[1.01] bg-primary/5"
      )}
    >
      {/* Fixed header with glass effect - Apple style */}
      <div className="flex-shrink-0 rounded-t-xl">
        {/* Colored accent bar at top */}
        <div className={cn("h-1.5 w-full", column.accentColor)} />

        <div className="px-4 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">{column.title}</h3>
          <Badge variant="secondary" className="font-medium">
            {documents.length}
          </Badge>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-thin min-h-0">
        <SortableContext items={documents.map(d => d.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3 min-h-[200px]">
            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                <FileText className="h-10 w-10 text-muted-foreground/50 mb-2" />
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
    </div>
  )
}
