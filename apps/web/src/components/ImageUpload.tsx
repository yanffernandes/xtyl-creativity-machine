"use client"

import { useState, useCallback } from "react"
import { Upload, X, Image as ImageIcon, Loader2, FileText } from "lucide-react"
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

// Helper to check if accept includes non-image types
const acceptsNonImages = (accept: string): boolean => {
  return accept.includes('.pdf') || accept.includes('.txt') || accept.includes('.md') || accept.includes('.doc')
}

// Get allowed extensions from accept string
const getAllowedExtensions = (accept: string): string[] => {
  const extensions: string[] = []
  if (accept.includes('.pdf')) extensions.push('.pdf')
  if (accept.includes('.txt')) extensions.push('.txt')
  if (accept.includes('.md')) extensions.push('.md')
  if (accept.includes('.doc')) extensions.push('.doc', '.docx')
  if (accept.includes('image') || accept.includes('.png') || accept.includes('.jpg') || accept.includes('.jpeg')) {
    extensions.push('.png', '.jpg', '.jpeg', '.gif', '.webp')
  }
  return extensions
}

// Check if file is an image
const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/')
}

export default function ImageUpload({
  onUpload,
  accept = "image/*",
  maxSizeMB = 10,
  className
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isImage, setIsImage] = useState(true)
  const { toast } = useToast()

  const isMultiType = acceptsNonImages(accept)

  const validateFile = (file: File): boolean => {
    // If we accept non-images, validate by extension
    if (isMultiType) {
      const allowedExt = getAllowedExtensions(accept)
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!allowedExt.some(ext => fileExt === ext || file.type.startsWith('image/'))) {
        toast({
          title: "Erro",
          description: `Tipo de arquivo não suportado. Permitidos: ${allowedExt.join(', ')}`,
          variant: "destructive"
        })
        return false
      }
    } else {
      // Only images allowed
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erro",
          description: "Por favor, selecione apenas imagens",
          variant: "destructive"
        })
        return false
      }
    }

    // Check file size
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > maxSizeMB) {
      toast({
        title: "Erro",
        description: `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`,
        variant: "destructive"
      })
      return false
    }

    return true
  }

  const handleFile = async (file: File) => {
    if (!validateFile(file)) return

    const fileIsImage = isImageFile(file)
    setIsImage(fileIsImage)
    setFileName(file.name)

    // Create preview only for images
    if (fileIsImage) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      // For non-images, just set preview to a placeholder
      setPreview('file')
    }

    // Upload file
    setIsUploading(true)
    try {
      await onUpload(file)
      toast({
        title: "Sucesso",
        description: isMultiType ? "Arquivo enviado com sucesso!" : "Imagem enviada com sucesso!"
      })
      setPreview(null)
      setFileName(null)
    } catch (error) {
      console.error("Upload failed", error)
      toast({
        title: "Erro",
        description: isMultiType ? "Falha no upload do arquivo" : "Falha no upload da imagem",
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
            {isImage && preview !== 'file' ? (
              <img
                src={preview}
                alt="Preview"
                className="w-full h-auto max-h-96 object-contain rounded-lg"
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <FileText className="h-16 w-16 text-primary mb-4" />
                <p className="text-sm font-medium text-foreground">{fileName}</p>
                <p className="text-xs text-muted-foreground mt-1">Enviando arquivo...</p>
              </div>
            )}
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
              ) : isMultiType ? (
                <FileText className="h-8 w-8 text-primary" />
              ) : (
                <Upload className="h-8 w-8 text-primary" />
              )}
            </div>
            <p className="text-lg font-semibold mb-2">
              {isDragging
                ? (isMultiType ? "Solte o arquivo aqui" : "Solte a imagem aqui")
                : (isMultiType ? "Enviar arquivo" : "Enviar imagem")
              }
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Arraste e solte ou clique para selecionar
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {isMultiType
                ? `PDF, TXT, MD, PNG, JPG até ${maxSizeMB}MB`
                : `PNG, JPG, GIF até ${maxSizeMB}MB`
              }
            </p>
          </label>
        )}
      </Card>
    </div>
  )
}
