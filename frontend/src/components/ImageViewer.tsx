"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, Download, ZoomIn, ZoomOut, Sparkles, ChevronLeft, ChevronRight, Trash2, Loader2 } from "lucide-react"
import api from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"
import { useConfirm } from "@/components/confirm-dialog"
import { useFormatter } from "next-intl"

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
  const t = useTranslations("imageViewer")
  const tCommon = useTranslations("common")
  const format = useFormatter()
  const [zoom, setZoom] = useState(100)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(image?.title || "")
  const [isDownloading, setIsDownloading] = useState(false)
  const { toast } = useToast()
  const confirm = useConfirm()

  // Zoom handlers - must be before early return to maintain hook order
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 25, 300))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 25, 50))
  }, [])

  // Reset zoom when image changes
  useEffect(() => {
    setZoom(100)
  }, [image?.id])

  // Keyboard navigation
  useEffect(() => {
    if (!image) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose()
          break
        case "ArrowLeft":
          handlePrevious()
          break
        case "ArrowRight":
          handleNext()
          break
        case "+":
        case "=":
          handleZoomIn()
          break
        case "-":
          handleZoomOut()
          break
        case "0":
          setZoom(100)
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [image, allImages, onClose, handleZoomIn, handleZoomOut])

  if (!image) return null

  const currentIndex = allImages.findIndex(img => img.id === image.id)
  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex < allImages.length - 1

  const handlePrevious = () => {
    if (hasPrevious && allImages[currentIndex - 1]) {
      window.dispatchEvent(new CustomEvent('navigate-image', {
        detail: { imageId: allImages[currentIndex - 1].id }
      }))
    }
  }

  const handleNext = () => {
    if (hasNext && allImages[currentIndex + 1]) {
      window.dispatchEvent(new CustomEvent('navigate-image', {
        detail: { imageId: allImages[currentIndex + 1].id }
      }))
    }
  }

  // Download using fetch+blob to handle cross-origin URLs (R2/CDN)
  const handleDownload = async () => {
    if (!image.file_url) return

    setIsDownloading(true)
    try {
      const response = await fetch(image.file_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${image.title || 'image'}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Download failed:", error)
      // Fallback: open in new tab if fetch fails (CORS)
      window.open(image.file_url, '_blank')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleArchive = async () => {
    const confirmed = await confirm({
      title: t("archiveImage"),
      description: t("archiveConfirm"),
      confirmLabel: t("archive"),
      cancelLabel: tCommon("cancel"),
      variant: "destructive",
    })
    if (!confirmed) return

    try {
      await api.delete(`/documents/${image.id}`)
      toast({
        title: t("archived"),
        description: t("archivedDesc")
      })

      if (onArchive) {
        onArchive(image.id)
      }

      onClose()
    } catch (error) {
      console.error("Failed to archive image:", error)
      toast({
        title: t("archiveError"),
        description: t("archiveErrorDesc"),
        variant: "destructive"
      })
    }
  }

  const handleStartEditTitle = () => {
    setEditedTitle(image.title)
    setIsEditingTitle(true)
  }

  const handleSaveTitle = async () => {
    const trimmedTitle = editedTitle.trim()
    if (!trimmedTitle) {
      toast({
        title: tCommon("error"),
        description: t("titleEmpty"),
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
        title: t("titleUpdated"),
        description: t("titleUpdatedDesc")
      })

      image.title = trimmedTitle
      setIsEditingTitle(false)

      window.dispatchEvent(new CustomEvent('image-title-updated', {
        detail: { imageId: image.id, newTitle: trimmedTitle }
      }))
    } catch (error) {
      console.error("Failed to update title:", error)
      toast({
        title: t("titleUpdateError"),
        description: t("titleUpdateErrorDesc"),
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
      e.stopPropagation()
      handleCancelEditTitle()
    }
  }

  // Close when clicking backdrop
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const metadata = image.generation_metadata || {}

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-sm flex flex-col"
      onClick={handleBackdropClick}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/50 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              onBlur={handleSaveTitle}
              autoFocus
              className="text-lg font-semibold bg-white/10 border border-white/20 rounded px-2 py-1 w-full max-w-md text-white"
            />
          ) : (
            <h2
              className="text-lg font-semibold truncate cursor-pointer hover:text-white/80 transition-colors text-white"
              onClick={handleStartEditTitle}
              title={t("clickToEdit")}
            >
              {image.title}
            </h2>
          )}
          <div className="flex items-center gap-4 mt-1">
            {metadata.model && (
              <span className="text-xs text-white/60">
                {t("model", { model: metadata.model.split('/').pop() })}
              </span>
            )}
            {metadata.size && (
              <span className="text-xs text-white/60">
                {metadata.size}
              </span>
            )}
            {image.created_at && (
              <span className="text-xs text-white/60">
                {format.dateTime(new Date(image.created_at), { dateStyle: "short" })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Navigation */}
          {allImages.length > 1 && (
            <div className="flex items-center gap-1 mr-2 border-r border-white/20 pr-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevious}
                disabled={!hasPrevious}
                className="text-white hover:bg-white/20 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-white/60 px-2">
                {currentIndex + 1} / {allImages.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNext}
                disabled={!hasNext}
                className="text-white hover:bg-white/20 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-black/30 rounded-lg px-2 py-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 50}
              className="h-8 w-8 p-0 text-white hover:bg-white/20 disabled:opacity-30"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-white w-12 text-center">
              {zoom}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 300}
              className="h-8 w-8 p-0 text-white hover:bg-white/20 disabled:opacity-30"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Download */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
            className="text-white hover:bg-white/20"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>

          {/* Archive */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleArchive}
            className="text-red-400 hover:bg-red-500/20 hover:text-red-300"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          {/* Refine */}
          {onRefine && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onRefine(image.id)}
              className="bg-white/10 hover:bg-white/20 text-white"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {t("refine")}
            </Button>
          )}

          {/* Close */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Image Container - Fullscreen with proper sizing */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden p-4"
        onClick={handleBackdropClick}
      >
        <img
          src={image.file_url || image.thumbnail_url}
          alt={image.title}
          className="object-contain rounded-lg shadow-2xl"
          style={{
            maxWidth: '90vw',
            maxHeight: 'calc(100vh - 180px)',
            transform: zoom !== 100 ? `scale(${zoom / 100})` : 'none',
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease-out'
          }}
          onClick={(e) => e.stopPropagation()}
          draggable={false}
        />
      </div>

      {/* Footer - Prompt (collapsible) */}
      {image.content && (
        <div
          className="px-6 py-3 bg-gradient-to-t from-black/50 to-transparent"
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="p-3 bg-white/5 border-white/10 max-w-3xl mx-auto">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 mt-0.5 text-white/60 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/80 mb-1">{t("prompt")}</p>
                <p className="text-xs text-white/60 line-clamp-2">
                  {image.content}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Keyboard Navigation Hint */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-xs text-white/40 bg-black/30 px-4 py-2 rounded-full">
        {t("navigationHint") || "Use arrow keys to navigate • +/- to zoom • Esc to close"}
      </div>
    </div>
  )
}
