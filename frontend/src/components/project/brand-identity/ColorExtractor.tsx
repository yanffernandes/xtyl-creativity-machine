"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, Loader2, Image as ImageIcon, Plus, Check, X, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { extractColorsFromImage, ColorExtractionResult } from "@/lib/api"
import AssetColorExtractor from "./AssetColorExtractor"

interface ColorExtractorProps {
    projectId: string
    onColorsExtracted: (colors: string[]) => void
    currentColorCount: number
    maxColors?: number
    disabled?: boolean
}

// Calculate contrast color for text visibility
function getContrastColor(hexColor: string): string {
    const hex = hexColor.replace("#", "")
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? "#000000" : "#FFFFFF"
}

export default function ColorExtractor({
    projectId,
    onColorsExtracted,
    currentColorCount,
    maxColors = 6,
    disabled = false,
}: ColorExtractorProps) {
    const [isExtracting, setIsExtracting] = useState(false)
    const [extractedColors, setExtractedColors] = useState<string[]>([])
    const [selectedColors, setSelectedColors] = useState<Set<string>>(new Set())
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)

    const remainingSlots = maxColors - currentColorCount

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (!file) return

        setError(null)
        setMessage(null)
        setIsExtracting(true)
        setExtractedColors([])
        setSelectedColors(new Set())
        setUploadedFileName(file.name)

        try {
            const result = await extractColorsFromImage(projectId, file)
            setExtractedColors(result.colors)
            if (result.message) {
                setMessage(result.message)
            }
        } catch (err: any) {
            console.error("Color extraction failed:", err)
            setError(
                err.response?.data?.detail ||
                "Failed to extract colors. Please try again with a different image."
            )
        } finally {
            setIsExtracting(false)
        }
    }, [projectId])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/png': ['.png'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/webp': ['.webp'],
        },
        maxSize: 5 * 1024 * 1024, // 5MB
        multiple: false,
        disabled: disabled || isExtracting,
    })

    const toggleColorSelection = (color: string) => {
        setSelectedColors(prev => {
            const next = new Set(prev)
            if (next.has(color)) {
                next.delete(color)
            } else {
                next.add(color)
            }
            return next
        })
    }

    const handleAddSelected = () => {
        if (selectedColors.size === 0) return
        const colorsToAdd = Array.from(selectedColors).slice(0, remainingSlots)
        onColorsExtracted(colorsToAdd)
        setSelectedColors(new Set())
    }

    const handleAddAll = () => {
        const colorsToAdd = extractedColors.slice(0, remainingSlots)
        onColorsExtracted(colorsToAdd)
        setExtractedColors([])
        setSelectedColors(new Set())
    }

    const handleReset = () => {
        setExtractedColors([])
        setSelectedColors(new Set())
        setError(null)
        setMessage(null)
        setUploadedFileName(null)
    }

    const canAddSelected = selectedColors.size > 0 && remainingSlots > 0
    const canAddAll = extractedColors.length > 0 && remainingSlots > 0

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Extract from Image</span>
                {remainingSlots === 0 && (
                    <span className="text-xs text-muted-foreground">
                        Palette full (remove colors to add more)
                    </span>
                )}
            </div>

            {/* Dropzone */}
            <div
                {...getRootProps()}
                className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer",
                    "hover:border-primary hover:bg-primary/5",
                    isDragActive && "border-primary bg-primary/10",
                    (disabled || isExtracting) && "opacity-50 cursor-not-allowed",
                    error && "border-destructive"
                )}
            >
                <input {...getInputProps()} />
                {isExtracting ? (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Extracting colors...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            {isDragActive ? (
                                <ImageIcon className="w-6 h-6 text-primary" />
                            ) : (
                                <Upload className="w-6 h-6 text-muted-foreground" />
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground">
                                {isDragActive ? "Drop image here" : "Upload image to extract colors"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                PNG, JPG, or WEBP up to 5MB
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Or extract from existing assets */}
            <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
            </div>

            <AssetColorExtractor
                projectId={projectId}
                onColorsExtracted={onColorsExtracted}
                currentColorCount={currentColorCount}
                maxColors={maxColors}
                disabled={disabled}
            />

            {/* Error message */}
            {error && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm text-destructive">{error}</p>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReset}
                            className="mt-2 h-7 text-xs"
                        >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Try Again
                        </Button>
                    </div>
                </div>
            )}

            {/* Extracted colors */}
            {extractedColors.length > 0 && (
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                            Extracted Colors
                            {uploadedFileName && (
                                <span className="text-muted-foreground font-normal ml-2">
                                    from {uploadedFileName}
                                </span>
                            )}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReset}
                            className="h-7 text-xs"
                        >
                            <X className="w-3 h-3 mr-1" />
                            Clear
                        </Button>
                    </div>

                    {message && (
                        <p className="text-xs text-muted-foreground">{message}</p>
                    )}

                    {/* Color grid */}
                    <div className="flex flex-wrap gap-2">
                        {extractedColors.map((color, index) => {
                            const isSelected = selectedColors.has(color)
                            const contrastColor = getContrastColor(color)
                            return (
                                <button
                                    key={`${color}-${index}`}
                                    onClick={() => toggleColorSelection(color)}
                                    disabled={!isSelected && remainingSlots <= selectedColors.size}
                                    className={cn(
                                        "relative w-14 h-14 rounded-lg transition-all",
                                        "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary",
                                        isSelected && "ring-2 ring-primary ring-offset-2",
                                        !isSelected && remainingSlots <= selectedColors.size && "opacity-50 cursor-not-allowed"
                                    )}
                                    style={{ backgroundColor: color }}
                                >
                                    {/* Selection indicator */}
                                    {isSelected && (
                                        <div
                                            className="absolute inset-0 flex items-center justify-center rounded-lg"
                                            style={{ backgroundColor: `${color}dd` }}
                                        >
                                            <Check className="w-5 h-5" style={{ color: contrastColor }} />
                                        </div>
                                    )}
                                    {/* HEX tooltip */}
                                    <span
                                        className="absolute bottom-0 left-0 right-0 text-[8px] font-mono text-center pb-1 opacity-0 hover:opacity-100 transition-opacity"
                                        style={{ color: contrastColor }}
                                    >
                                        {color}
                                    </span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAddSelected}
                            disabled={!canAddSelected}
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Selected ({selectedColors.size})
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAddAll}
                            disabled={!canAddAll}
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Add All ({Math.min(extractedColors.length, remainingSlots)})
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
