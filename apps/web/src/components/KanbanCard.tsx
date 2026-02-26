"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Image as ImageIcon, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { TagDisplay } from "@/components/document/TagInput"

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
  attachments?: ImageAttachment[]
  // Feature 028 T053: Tags support
  tags?: string[]
  channel?: string
}

interface KanbanCardProps {
  document: Document
  onSelect: (doc: Document) => void
  onDelete?: (e: React.MouseEvent, doc: Document) => void
  /** Feature 028 T031: Add document content to copy library */
  onAddToLibrary?: (doc: Document) => void
  /** Feature 028 T015: Multi-select support */
  isSelected?: boolean
  onMultiSelect?: (doc: Document, e: React.MouseEvent) => void
}

export default function KanbanCard({
  document,
  onSelect,
  onDelete,
  onAddToLibrary,
  isSelected = false,
  onMultiSelect
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

  // Feature 028 T015: Handle click with multi-select support
  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) return

    // Ctrl/Cmd+click or Shift+click for multi-select
    if ((e.ctrlKey || e.metaKey || e.shiftKey) && onMultiSelect) {
      e.preventDefault()
      onMultiSelect(document, e)
    } else {
      onSelect(document)
    }
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab active:cursor-grabbing hover:shadow-md transition-all bg-card group relative border-border",
        "hover:scale-[1.02] hover:border-primary/50",
        isDragging && "opacity-50 rotate-2 scale-105 shadow-2xl z-50 cursor-grabbing",
        // Feature 028 T015: Selected state styling
        isSelected && "ring-2 ring-primary border-primary bg-primary/5"
      )}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        {/* Feature 028 T015: Title with selection indicator */}
        <div className="flex items-start gap-2 mb-3">
          {isSelected && (
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          )}
          <p className="font-semibold text-sm line-clamp-2 flex-1">{document.title}</p>
        </div>

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

        {/* Feature 028 T053: Tags display */}
        {document.tags && document.tags.length > 0 && (
          <div className="mb-2">
            <TagDisplay tags={document.tags} maxVisible={2} />
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{new Date(document.created_at).toLocaleDateString('pt-BR')}</span>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(e, document)
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
