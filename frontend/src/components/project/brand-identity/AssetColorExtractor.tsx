"use client"

import { useState, useEffect, useCallback } from "react"
import { ImageIcon, Loader2, Plus, Check, X, AlertCircle, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { getVisualAssets, extractColorsFromAsset, VisualAsset } from "@/lib/api"

interface AssetColorExtractorProps {
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

export default function AssetColorExtractor({
    projectId,
    onColorsExtracted,
    currentColorCount,
    maxColors = 6,
    disabled = false,
}: AssetColorExtractorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isExtracting, setIsExtracting] = useState(false)
    const [assets, setAssets] = useState<VisualAsset[]>([])
    const [error, setError] = useState<string | null>(null)
    const [selectedAsset, setSelectedAsset] = useState<VisualAsset | null>(null)
    const [extractedColors, setExtractedColors] = useState<string[]>([])
    const [selectedColors, setSelectedColors] = useState<Set<string>>(new Set())
    const [extractionMessage, setExtractionMessage] = useState<string | null>(null)

    const remainingSlots = maxColors - currentColorCount

    // Load assets when dialog opens
    useEffect(() => {
        if (isOpen && assets.length === 0) {
            loadAssets()
        }
    }, [isOpen])

    const loadAssets = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const result = await getVisualAssets(projectId)
            setAssets(result.assets || [])
        } catch (err: any) {
            console.error("Failed to load assets:", err)
            setError("Failed to load visual assets")
        } finally {
            setIsLoading(false)
        }
    }

    const handleAssetSelect = async (asset: VisualAsset) => {
        setSelectedAsset(asset)
        setExtractedColors([])
        setSelectedColors(new Set())
        setExtractionMessage(null)
        setError(null)
        setIsExtracting(true)

        try {
            const result = await extractColorsFromAsset(projectId, asset.id)
            setExtractedColors(result.colors)
            if (result.message) {
                setExtractionMessage(result.message)
            }
        } catch (err: any) {
            console.error("Color extraction failed:", err)
            setError(
                err.response?.data?.detail ||
                "Failed to extract colors from this asset. Please try another image."
            )
        } finally {
            setIsExtracting(false)
        }
    }

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
        handleClose()
    }

    const handleAddAll = () => {
        const colorsToAdd = extractedColors.slice(0, remainingSlots)
        onColorsExtracted(colorsToAdd)
        handleClose()
    }

    const handleClose = () => {
        setIsOpen(false)
        setSelectedAsset(null)
        setExtractedColors([])
        setSelectedColors(new Set())
        setExtractionMessage(null)
        setError(null)
    }

    const canAddSelected = selectedColors.size > 0 && remainingSlots > 0
    const canAddAll = extractedColors.length > 0 && remainingSlots > 0

    return (
        <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : handleClose()}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled || remainingSlots === 0}
                    className="gap-2"
                >
                    <FolderOpen className="w-4 h-4" />
                    Extract from Assets
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Extract Colors from Visual Assets</DialogTitle>
                    <DialogDescription>
                        Select an image from your project&apos;s visual assets library to extract colors.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 py-4">
                    {/* Loading state */}
                    {isLoading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <span className="ml-2 text-muted-foreground">Loading assets...</span>
                        </div>
                    )}

                    {/* Error state */}
                    {error && !isLoading && (
                        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    )}

                    {/* Empty state */}
                    {!isLoading && !error && assets.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-2">
                                No Visual Assets
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-sm">
                                Upload some visual assets to your project library first.
                                You can then extract brand colors from logos, backgrounds, or any reference images.
                            </p>
                        </div>
                    )}

                    {/* Asset grid */}
                    {!isLoading && assets.length > 0 && !selectedAsset && (
                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                            {assets.map((asset) => (
                                <button
                                    key={asset.id}
                                    onClick={() => handleAssetSelect(asset)}
                                    className={cn(
                                        "relative aspect-square rounded-lg overflow-hidden",
                                        "border-2 border-transparent hover:border-primary",
                                        "transition-all focus:outline-none focus:ring-2 focus:ring-primary",
                                        "group"
                                    )}
                                >
                                    {asset.thumbnail_url ? (
                                        <img
                                            src={asset.thumbnail_url}
                                            alt={asset.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-muted flex items-center justify-center">
                                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                                        </div>
                                    )}
                                    {/* Hover overlay with name */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                        <span className="text-xs text-white truncate w-full">
                                            {asset.title}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Selected asset with extraction */}
                    {selectedAsset && (
                        <div className="space-y-4">
                            {/* Back button */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSelectedAsset(null)
                                    setExtractedColors([])
                                    setSelectedColors(new Set())
                                    setError(null)
                                }}
                                className="gap-1"
                            >
                                <X className="w-4 h-4" />
                                Back to assets
                            </Button>

                            {/* Selected asset preview */}
                            <div className="flex gap-4">
                                <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                                    {selectedAsset.thumbnail_url ? (
                                        <img
                                            src={selectedAsset.thumbnail_url}
                                            alt={selectedAsset.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-medium text-foreground">{selectedAsset.title}</h4>
                                    {selectedAsset.category && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Category: {selectedAsset.category}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Extracting state */}
                            {isExtracting && (
                                <div className="flex items-center gap-2 py-4">
                                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                    <span className="text-sm text-muted-foreground">
                                        Extracting colors...
                                    </span>
                                </div>
                            )}

                            {/* Extracted colors */}
                            {!isExtracting && extractedColors.length > 0 && (
                                <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-foreground">
                                            Extracted Colors
                                        </span>
                                    </div>

                                    {extractionMessage && (
                                        <p className="text-xs text-muted-foreground">{extractionMessage}</p>
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
                                                    {isSelected && (
                                                        <div
                                                            className="absolute inset-0 flex items-center justify-center rounded-lg"
                                                            style={{ backgroundColor: `${color}dd` }}
                                                        >
                                                            <Check className="w-5 h-5" style={{ color: contrastColor }} />
                                                        </div>
                                                    )}
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
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
