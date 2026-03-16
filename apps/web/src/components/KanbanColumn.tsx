"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import KanbanCard from "./KanbanCard"
import { FileText, Plus } from "lucide-react"
import type { BoardColumn } from "@/types/supabase"

interface Document {
  id: string
  title: string
  status: string
  board_column_id?: string | null
  created_at: string
  type: "creation" | "context"
  content?: string
}

interface KanbanColumnProps {
  column: BoardColumn
  documents: Document[]
  isOver?: boolean
  onSelectDocument: (doc: Document) => void
  onDelete?: (e: React.MouseEvent, doc: Document) => void
  onAddToLibrary?: (doc: Document) => void
  onCreateInColumn?: (columnId: string) => void
  selectedIds?: Set<string>
  onMultiSelect?: (doc: Document, e: React.MouseEvent) => void
}

export default function KanbanColumn({
  column,
  documents,
  isOver,
  onSelectDocument,
  onDelete,
  onAddToLibrary,
  onCreateInColumn,
  selectedIds,
  onMultiSelect,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: column.id })

  const accentColor = column.color ?? "#64748b"

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-w-[280px] w-[320px] h-full rounded-xl transition-all duration-200 flex flex-col overflow-hidden",
        "bg-secondary/30 dark:bg-secondary/20 border border-border/50",
        isOver && "ring-2 ring-primary shadow-lg scale-[1.01] bg-primary/5"
      )}
    >
      {/* Header */}
      <div className="flex-shrink-0 rounded-t-xl">
        {/* Colored accent bar */}
        <div className="h-1.5 w-full rounded-t-xl" style={{ backgroundColor: accentColor }} />

        <div className="px-4 py-3 flex items-center justify-between gap-2">
          <h3 className="font-semibold text-sm text-foreground truncate">{column.name}</h3>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="secondary" className="font-medium">
              {documents.length}
            </Badge>
            {onCreateInColumn && column.id !== "__unassigned__" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md opacity-60 hover:opacity-100"
                onClick={() => onCreateInColumn(column.id)}
                title={`Criar em ${column.name}`}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable cards */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-thin min-h-0">
        <SortableContext items={documents.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3 min-h-[200px]">
            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                <FileText className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-xs text-muted-foreground">Arraste documentos aqui</p>
              </div>
            ) : (
              documents.map((doc) => (
                <KanbanCard
                  key={doc.id}
                  document={doc}
                  onSelect={onSelectDocument}
                  onDelete={onDelete}
                  onAddToLibrary={onAddToLibrary}
                  isSelected={selectedIds?.has(doc.id)}
                  onMultiSelect={onMultiSelect}
                />
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}
