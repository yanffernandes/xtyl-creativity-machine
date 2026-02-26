"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Image as ImageIcon,
  X,
  ZoomIn,
  Download,
  Eye,
  Trash2,
  Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface ImageItem {
  id: string
  title: string
  url?: string
  thumbnail?: string
  created_at: string
  metadata?: {
    width?: number
    height?: number
    format?: string
    size_bytes?: number
  }
}

interface ImageGalleryProps {
  images: ImageItem[]
  onSelect?: (image: ImageItem) => void
  onDelete?: (image: ImageItem) => void
  onAnalyze?: (image: ImageItem) => void
  columns?: number
  className?: string
}

export default function ImageGallery({
  images,
  onSelect,
  onDelete,
  onAnalyze,
  columns = 3,
  className
}: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  const openLightbox = (image: ImageItem) => {
    setSelectedImage(image)
    setIsLightboxOpen(true)
  }

  const closeLightbox = () => {
    setIsLightboxOpen(false)
    setTimeout(() => setSelectedImage(null), 200)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  }[columns] || "grid-cols-3"

  return (
    <>
      <div className={cn(`grid gap-4 ${gridCols}`, className)}>
        {images.map((image, index) => (
          <motion.div
            key={image.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="group relative overflow-hidden hover:shadow-lg transition-all duration-200 border-border hover:border-primary/50">
              <CardContent className="p-0">
                {/* Image */}
                <div
                  className="relative aspect-video bg-muted cursor-pointer overflow-hidden"
                  onClick={() => openLightbox(image)}
                >
                  {image.thumbnail || image.url ? (
                    <img
                      src={image.thumbnail || image.url}
                      alt={image.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        openLightbox(image)
                      }}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    {onAnalyze && (
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          onAnalyze(image)
                        }}
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(image)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="font-semibold text-sm truncate mb-1">{image.title}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(image.created_at).toLocaleDateString('pt-BR')}</span>
                    {image.metadata && (
                      <div className="flex gap-2">
                        {image.metadata.width && image.metadata.height && (
                          <Badge variant="outline" className="text-xs">
                            {image.metadata.width}×{image.metadata.height}
                          </Badge>
                        )}
                        {image.metadata.size_bytes && (
                          <Badge variant="outline" className="text-xs">
                            {formatFileSize(image.metadata.size_bytes)}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          {selectedImage && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedImage.title}</DialogTitle>
                <DialogDescription>
                  {selectedImage.metadata && (
                    <div className="flex gap-3 mt-2">
                      {selectedImage.metadata.format && (
                        <Badge variant="outline">{selectedImage.metadata.format}</Badge>
                      )}
                      {selectedImage.metadata.width && selectedImage.metadata.height && (
                        <Badge variant="outline">
                          {selectedImage.metadata.width} × {selectedImage.metadata.height}
                        </Badge>
                      )}
                      {selectedImage.metadata.size_bytes && (
                        <Badge variant="outline">
                          {formatFileSize(selectedImage.metadata.size_bytes)}
                        </Badge>
                      )}
                    </div>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4">
                <img
                  src={selectedImage.url || selectedImage.thumbnail}
                  alt={selectedImage.title}
                  className="w-full h-auto rounded-lg"
                />
              </div>

              <div className="flex gap-2 mt-4">
                {onSelect && (
                  <Button
                    onClick={() => {
                      onSelect(selectedImage)
                      closeLightbox()
                    }}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Selecionar
                  </Button>
                )}
                {onAnalyze && (
                  <Button
                    onClick={() => {
                      onAnalyze(selectedImage)
                      closeLightbox()
                    }}
                    variant="secondary"
                    className="flex-1"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analisar com IA
                  </Button>
                )}
                {selectedImage.url && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(selectedImage.url, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
