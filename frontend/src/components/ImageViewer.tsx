"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, Download, Maximize2, Minimize2, ZoomIn, ZoomOut, Sparkles, ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import api from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface ImageDocument {
  id: string
  title: string
  file_url?: string
  thumbnail_url?: string
  content?: string
  generation_metadata?: any
  created_at?: string
}

interface ImageViewerProps {
  image: ImageDocument | null
  onClose: () => void
  onRefine?: (imageId: string) => void
  onArchive?: (imageId: string) => void
  allImages?: ImageDocument[]
}

export default function ImageViewer({ image, onClose, onRefine, onArchive, allImages = [] }: ImageViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(image?.title || "")
  const { toast } = useToast()

  if (!image) return null

  const currentIndex = allImages.findIndex(img => img.id === image.id)
  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex < allImages.length - 1

  const handlePrevious = () => {
    if (hasPrevious && allImages[currentIndex - 1]) {
      // Trigger navigation to previous image
      window.dispatchEvent(new CustomEvent('navigate-image', {
        detail: { imageId: allImages[currentIndex - 1].id }
      }))
    }
  }

  const handleNext = () => {
    if (hasNext && allImages[currentIndex + 1]) {
      // Trigger navigation to next image
      window.dispatchEvent(new CustomEvent('navigate-image', {
        detail: { imageId: allImages[currentIndex + 1].id }
      }))
    }
  }

  const handleDownload = () => {
    if (image.file_url) {
      const link = document.createElement('a')
      link.href = image.file_url
      link.download = `${image.title}.png`
      link.click()
    }
  }

  const handleArchive = async () => {
    if (!confirm("Tem certeza que deseja arquivar esta imagem?")) return

    try {
      await api.delete(`/documents/${image.id}`)
      toast({
        title: "Imagem arquivada",
        description: "A imagem foi movida para arquivados"
      })

      // Notify parent component
      if (onArchive) {
        onArchive(image.id)
      }

      // Close viewer
      onClose()
    } catch (error) {
      console.error("Failed to archive image:", error)
      toast({
        title: "Erro ao arquivar",
        description: "Não foi possível arquivar a imagem. Tente novamente.",
        variant: "destructive"
      })
    }
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50))
  }

  const handleStartEditTitle = () => {
    setEditedTitle(image.title)
    setIsEditingTitle(true)
  }

  const handleSaveTitle = async () => {
    const trimmedTitle = editedTitle.trim()
    if (!trimmedTitle) {
      toast({
        title: "Erro",
        description: "O título não pode estar vazio",
        variant: "destructive"
      })
      return
    }

    if (trimmedTitle === image.title) {
      setIsEditingTitle(false)
      return
    }

    try {
      await api.put(`/documents/${image.id}`, { title: trimmedTitle })
      toast({
        title: "Título atualizado",
        description: "O título da imagem foi alterado com sucesso"
      })

      // Update local state
      image.title = trimmedTitle
      setIsEditingTitle(false)

      // Trigger refresh in parent
      window.dispatchEvent(new CustomEvent('image-title-updated', {
        detail: { imageId: image.id, newTitle: trimmedTitle }
      }))
    } catch (error) {
      console.error("Failed to update title:", error)
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o título. Tente novamente.",
        variant: "destructive"
      })
    }
  }

  const handleCancelEditTitle = () => {
    setEditedTitle(image.title)
    setIsEditingTitle(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveTitle()
    } else if (e.key === "Escape") {
      handleCancelEditTitle()
    }
  }

  const metadata = image.generation_metadata || {}

  return (
    <div
      className={cn(
        "fixed top-0 right-0 bottom-0 left-[280px] bg-background/95 backdrop-blur-sm z-50 flex flex-col",
        isFullscreen ? "p-0" : "p-6"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-4 py-3 bg-card/50 rounded-lg border">
        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              onBlur={handleSaveTitle}
              autoFocus
              className="text-lg font-semibold bg-background border rounded px-2 py-1 w-full max-w-md"
            />
          ) : (
            <h2
              className="text-lg font-semibold truncate cursor-pointer hover:text-primary transition-colors"
              onClick={handleStartEditTitle}
              title="Clique para editar"
            >
              {image.title}
            </h2>
          )}
          <div className="flex items-center gap-4 mt-1">
            {metadata.model && (
              <span className="text-xs text-muted-foreground">
                Modelo: {metadata.model.split('/').pop()}
              </span>
            )}
            {metadata.size && (
              <span className="text-xs text-muted-foreground">
                {metadata.size}
              </span>
            )}
            {image.created_at && (
              <span className="text-xs text-muted-foreground">
                {new Date(image.created_at).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Navigation */}
          {allImages.length > 1 && (
            <div className="flex items-center gap-1 mr-2 border-r pr-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevious}
                disabled={!hasPrevious}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                {currentIndex + 1} / {allImages.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNext}
                disabled={!hasNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Zoom Controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 50}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-12 text-center">
            {zoom}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 200}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>

          {/* Download */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
          </Button>

          {/* Archive */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleArchive}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          {/* Refine */}
          {onRefine && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onRefine(image.id)}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Refinar
            </Button>
          )}

          {/* Close */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Image Container */}
      <div className="flex-1 flex items-center justify-center overflow-auto">
        <div
          className="relative"
          style={{
            transform: `scale(${zoom / 100})`,
            transition: 'transform 0.2s ease-in-out'
          }}
        >
          <img
            src={image.file_url || image.thumbnail_url}
            alt={image.title}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        </div>
      </div>

      {/* Footer - Prompt */}
      {image.content && (
        <Card className="mt-4 p-4 bg-card/50">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-1">Prompt:</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {image.content}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Keyboard Navigation Hint */}
      {allImages.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground bg-card/80 px-3 py-1 rounded-full">
          Use ← → para navegar entre imagens
        </div>
      )}
    </div>
  )
}
