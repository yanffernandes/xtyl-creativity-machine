"use client"

import { useState } from "react"
import { X, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface ColorSwatchProps {
    color: string
    index: number
    onRemove?: () => void
    onEdit?: (newColor: string) => void
    isDragging?: boolean
    showDragHandle?: boolean
    size?: "sm" | "md" | "lg"
    className?: string
}

// Calculate contrast color for text visibility
function getContrastColor(hexColor: string): string {
    // Remove # if present
    const hex = hexColor.replace("#", "")
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? "#000000" : "#FFFFFF"
}

// Get priority label based on index
function getPriorityLabel(index: number): string {
    const labels = ["Primary", "Secondary", "Tertiary", "Accent 1", "Accent 2", "Accent 3"]
    return labels[index] || `Color ${index + 1}`
}

export default function ColorSwatch({
    color,
    index,
    onRemove,
    onEdit,
    isDragging = false,
    showDragHandle = true,
    size = "md",
    className,
}: ColorSwatchProps) {
    const [isHovered, setIsHovered] = useState(false)
    const contrastColor = getContrastColor(color)

    const sizeClasses = {
        sm: "w-12 h-12",
        md: "w-16 h-16",
        lg: "w-20 h-20",
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={cn(
                            "relative rounded-lg transition-all duration-200 group cursor-pointer",
                            sizeClasses[size],
                            isDragging && "opacity-50 scale-105 shadow-lg",
                            isHovered && !isDragging && "ring-2 ring-primary ring-offset-2",
                            className
                        )}
                        style={{ backgroundColor: color }}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        onClick={() => onEdit?.(color)}
                    >
                        {/* Drag handle */}
                        {showDragHandle && (
                            <div
                                className={cn(
                                    "absolute -left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing",
                                )}
                            >
                                <GripVertical
                                    className="w-4 h-4 text-muted-foreground"
                                />
                            </div>
                        )}

                        {/* Remove button */}
                        {onRemove && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onRemove()
                                }}
                                className={cn(
                                    "absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground",
                                    "flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                                    "hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-destructive"
                                )}
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}

                        {/* HEX code overlay on hover */}
                        <div
                            className={cn(
                                "absolute inset-0 flex items-center justify-center rounded-lg",
                                "opacity-0 group-hover:opacity-100 transition-opacity",
                                "bg-black/20"
                            )}
                        >
                            <span
                                className="text-[10px] font-mono font-medium"
                                style={{ color: contrastColor }}
                            >
                                {color.toUpperCase()}
                            </span>
                        </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    <p className="text-xs">
                        <span className="font-medium">{getPriorityLabel(index)}</span>
                        <br />
                        {color.toUpperCase()}
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
