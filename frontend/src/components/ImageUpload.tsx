"use client"

import { useState, useCallback } from "react"
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

interface ImageUploadProps {
  onUpload: (file: File) => Promise<void>
  accept?: string
  maxSizeMB?: number
  className?: string
}

export default function ImageUpload({
  onUpload,
  accept = "image/*",
  maxSizeMB = 10,
  className
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  const validateFile = (file: File): boolean => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas imagens",
        variant: "destructive"
      })
      return false
    }

    // Check file size
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > maxSizeMB) {
      toast({
        title: "Erro",
        description: `Imagem muito grande. Tamanho máximo: ${maxSizeMB}MB`,
        variant: "destructive"
      })
      return false
    }

    return true
  }

  const handleFile = async (file: File) => {
    if (!validateFile(file)) return

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload file
    setIsUploading(true)
    try {
      await onUpload(file)
      toast({
        title: "Sucesso",
        description: "Imagem enviada com sucesso!"
      })
      setPreview(null)
    } catch (error) {
      console.error("Upload failed", error)
      toast({
        title: "Erro",
        description: "Falha no upload da imagem",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFile(files[0])
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const clearPreview = () => {
    setPreview(null)
  }

  return (
    <div className={cn("w-full", className)}>
      <Card
        className={cn(
          "relative border-2 border-dashed transition-all duration-200",
          isDragging && "border-primary bg-primary/5 scale-[1.02]",
          !isDragging && "border-border hover:border-primary/50"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          id="image-upload-input"
          className="hidden"
          accept={accept}
          onChange={handleFileInput}
          disabled={isUploading}
        />

        {preview ? (
          <div className="relative p-4">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background"
              onClick={clearPreview}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
            <img
              src={preview}
              alt="Preview"
              className="w-full h-auto max-h-96 object-contain rounded-lg"
            />
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
        ) : (
          <label
            htmlFor="image-upload-input"
            className="flex flex-col items-center justify-center p-12 cursor-pointer"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              {isUploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                <Upload className="h-8 w-8 text-primary" />
              )}
            </div>
            <p className="text-lg font-semibold mb-2">
              {isDragging ? "Solte a imagem aqui" : "Enviar imagem"}
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Arraste e solte ou clique para selecionar
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              PNG, JPG, GIF até {maxSizeMB}MB
            </p>
          </label>
        )}
      </Card>
    </div>
  )
}
