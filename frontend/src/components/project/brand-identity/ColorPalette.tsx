"use client"

import { useState, useCallback } from "react"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core"
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    horizontalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, X, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import ColorPicker from "./ColorPicker"

const MAX_COLORS = 6

interface ColorPaletteProps {
    colors: string[]
    onChange: (colors: string[]) => void
    disabled?: boolean
}

// Priority labels for each position
const PRIORITY_LABELS = ["Primary", "Secondary", "Tertiary", "Accent 1", "Accent 2", "Accent 3"]

// Calculate contrast color for text visibility
function getContrastColor(hexColor: string): string {
    const hex = hexColor.replace("#", "")
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? "#000000" : "#FFFFFF"
}

interface SortableColorItemProps {
    id: string
    color: string
    index: number
    onRemove: () => void
    onEdit: (newColor: string) => void
    disabled?: boolean
}

function SortableColorItem({
    id,
    color,
    index,
    onRemove,
    onEdit,
    disabled,
}: SortableColorItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, disabled })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    const contrastColor = getContrastColor(color)
    const [isEditing, setIsEditing] = useState(false)

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "relative group flex flex-col items-center gap-1",
                isDragging && "z-50"
            )}
        >
            {/* Color swatch */}
            <div
                className={cn(
                    "relative w-16 h-16 rounded-lg transition-all duration-200",
                    isDragging && "opacity-80 scale-105 shadow-xl",
                    !disabled && "cursor-pointer hover:ring-2 hover:ring-primary hover:ring-offset-2"
                )}
                style={{ backgroundColor: color }}
                onClick={() => !disabled && setIsEditing(true)}
            >
                {/* Drag handle */}
                {!disabled && (
                    <div
                        {...attributes}
                        {...listeners}
                        className={cn(
                            "absolute -left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity",
                            "cursor-grab active:cursor-grabbing p-1 rounded hover:bg-black/10"
                        )}
                    >
                        <GripVertical className="w-4 h-4" style={{ color: contrastColor }} />
                    </div>
                )}

                {/* Remove button */}
                {!disabled && (
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

                {/* HEX code overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                    <span
                        className="text-[10px] font-mono font-medium"
                        style={{ color: contrastColor }}
                    >
                        {color.toUpperCase()}
                    </span>
                </div>
            </div>

            {/* Priority label */}
            <span className="text-[10px] text-muted-foreground font-medium">
                {PRIORITY_LABELS[index]}
            </span>

            {/* Edit popover */}
            {isEditing && (
                <div className="absolute top-0 left-0 z-50">
                    <ColorPicker
                        value={color}
                        onChange={(newColor) => {
                            onEdit(newColor)
                            setIsEditing(false)
                        }}
                        onCancel={() => setIsEditing(false)}
                        mode="edit"
                    />
                </div>
            )}
        </div>
    )
}

export default function ColorPalette({
    colors,
    onChange,
    disabled = false,
}: ColorPaletteProps) {
    const [editingIndex, setEditingIndex] = useState<number | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event

            if (over && active.id !== over.id) {
                const oldIndex = colors.findIndex((c) => c === active.id)
                const newIndex = colors.findIndex((c) => c === over.id)
                onChange(arrayMove(colors, oldIndex, newIndex))
            }
        },
        [colors, onChange]
    )

    const handleAddColor = useCallback(
        (newColor: string) => {
            if (colors.length < MAX_COLORS) {
                onChange([...colors, newColor])
            }
        },
        [colors, onChange]
    )

    const handleRemoveColor = useCallback(
        (index: number) => {
            onChange(colors.filter((_, i) => i !== index))
        },
        [colors, onChange]
    )

    const handleEditColor = useCallback(
        (index: number, newColor: string) => {
            const newColors = [...colors]
            newColors[index] = newColor
            onChange(newColors)
            setEditingIndex(null)
        },
        [colors, onChange]
    )

    const canAddMore = colors.length < MAX_COLORS

    return (
        <div className="space-y-3">
            {/* Header with info */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">Color Palette</span>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Info className="w-4 h-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="max-w-xs text-xs">
                                    Add up to {MAX_COLORS} brand colors. Drag to reorder by priority.
                                    First color is primary, used most prominently.
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <span className="text-xs text-muted-foreground">
                    {colors.length}/{MAX_COLORS} colors
                </span>
            </div>

            {/* Color swatches with drag-and-drop */}
            <div className="flex items-start gap-4 flex-wrap">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={colors}
                        strategy={horizontalListSortingStrategy}
                    >
                        {colors.map((color, index) => (
                            <SortableColorItem
                                key={color + index}
                                id={color}
                                color={color}
                                index={index}
                                onRemove={() => handleRemoveColor(index)}
                                onEdit={(newColor) => handleEditColor(index, newColor)}
                                disabled={disabled}
                            />
                        ))}
                    </SortableContext>
                </DndContext>

                {/* Add color button */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div>
                                <ColorPicker
                                    onChange={handleAddColor}
                                    disabled={disabled || !canAddMore}
                                    mode="add"
                                />
                            </div>
                        </TooltipTrigger>
                        {!canAddMore && (
                            <TooltipContent>
                                <p className="text-xs">Maximum {MAX_COLORS} colors reached</p>
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Empty state */}
            {colors.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    No colors added yet. Click the + button to add your first brand color.
                </p>
            )}
        </div>
    )
}
