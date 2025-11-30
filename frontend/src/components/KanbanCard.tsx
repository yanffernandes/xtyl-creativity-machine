"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, GripVertical, Star, Trash2, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageAttachment {
  id: string
  image_id: string
  is_primary: boolean
  attachment_order: number
  image?: {
    id: string
    title: string
    file_url?: string
    thumbnail_url?: string
  }
}

interface Document {
  id: string
  title: string
  status: string
  created_at: string
  type: "creation" | "context"
  content?: string
  is_context?: boolean
  attachments?: ImageAttachment[]
}

interface KanbanCardProps {
  document: Document
  onSelect: (doc: Document) => void
  onToggleContext?: (e: React.MouseEvent, doc: Document) => void
  onDelete?: (e: React.MouseEvent, doc: Document) => void
}

export default function KanbanCard({
  document,
  onSelect,
  onToggleContext,
  onDelete
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: document.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-pointer hover:shadow-md transition-all bg-card group relative border-border",
        "hover:scale-[1.02] hover:border-primary/50",
        isDragging && "opacity-50 rotate-2 scale-105 shadow-2xl z-50"
      )}
      onClick={() => !isDragging && onSelect(document)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex items-center gap-1">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-secondary rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            {onToggleContext && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity",
                  document.is_context && "opacity-100 text-yellow-500 hover:text-yellow-600"
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleContext(e, document)
                }}
              >
                <Star
                  className="h-4 w-4"
                  fill={document.is_context ? "currentColor" : "none"}
                />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(e, document)
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <p className="font-semibold text-sm line-clamp-2 mb-3">{document.title}</p>

        {/* Image Attachments Preview */}
        {document.attachments && document.attachments.length > 0 && (
          <div className="mb-3 flex gap-1.5 flex-wrap">
            {document.attachments.slice(0, 3).map((attachment) => (
              <div
                key={attachment.id}
                className="relative w-12 h-12 rounded border border-border overflow-hidden bg-muted flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {attachment.image?.file_url ? (
                  <img
                    src={attachment.image.thumbnail_url || attachment.image.file_url}
                    alt={attachment.image.title || 'Attached image'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                {attachment.is_primary && (
                  <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-primary rounded-full border border-white" />
                )}
              </div>
            ))}
            {document.attachments.length > 3 && (
              <div className="w-12 h-12 rounded border border-border bg-muted flex items-center justify-center text-xs text-muted-foreground font-medium">
                +{document.attachments.length - 3}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{new Date(document.created_at).toLocaleDateString('pt-BR')}</span>
          {document.is_context && (
            <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 px-2 py-0.5 rounded-full font-medium">
              Contexto
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
