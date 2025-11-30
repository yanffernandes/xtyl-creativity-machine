"use client"

import { useState, useEffect, useCallback } from "react"
import { HexColorPicker, HexColorInput } from "react-colorful"
import { Plus, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface ColorPickerProps {
    value?: string
    onChange: (color: string) => void
    onCancel?: () => void
    disabled?: boolean
    mode?: "add" | "edit"
    triggerClassName?: string
}

// Validate HEX color format
function isValidHex(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
}

// Normalize HEX (ensure #RRGGBB format)
function normalizeHex(color: string): string {
    if (!color.startsWith("#")) {
        color = "#" + color
    }
    // Expand shorthand (#RGB -> #RRGGBB)
    if (color.length === 4) {
        const r = color[1]
        const g = color[2]
        const b = color[3]
        return `#${r}${r}${g}${g}${b}${b}`.toUpperCase()
    }
    return color.toUpperCase()
}

export default function ColorPicker({
    value = "#5B8DEF",
    onChange,
    onCancel,
    disabled = false,
    mode = "add",
    triggerClassName,
}: ColorPickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [internalColor, setInternalColor] = useState(value)
    const [hexInput, setHexInput] = useState(value.replace("#", ""))
    const [error, setError] = useState<string | null>(null)

    // Sync internal state when value prop changes
    useEffect(() => {
        setInternalColor(value)
        setHexInput(value.replace("#", ""))
    }, [value])

    const handleColorChange = useCallback((newColor: string) => {
        setInternalColor(newColor)
        setHexInput(newColor.replace("#", ""))
        setError(null)
    }, [])

    const handleHexInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value.replace("#", "").toUpperCase()
        setHexInput(input)

        // Validate and update picker
        const fullHex = "#" + input
        if (isValidHex(fullHex)) {
            setInternalColor(normalizeHex(fullHex))
            setError(null)
        } else if (input.length >= 3) {
            setError("Invalid HEX format")
        }
    }, [])

    const handleConfirm = useCallback(() => {
        const finalColor = normalizeHex("#" + hexInput)
        if (isValidHex(finalColor)) {
            onChange(finalColor)
            setIsOpen(false)
            setError(null)
        } else {
            setError("Please enter a valid HEX color")
        }
    }, [hexInput, onChange])

    const handleCancel = useCallback(() => {
        setInternalColor(value)
        setHexInput(value.replace("#", ""))
        setError(null)
        setIsOpen(false)
        onCancel?.()
    }, [value, onCancel])

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                {mode === "add" ? (
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={disabled}
                        className={cn(
                            "h-16 w-16 border-dashed border-2 flex items-center justify-center",
                            "hover:border-primary hover:bg-primary/5",
                            disabled && "opacity-50 cursor-not-allowed",
                            triggerClassName
                        )}
                    >
                        <Plus className="w-5 h-5 text-muted-foreground" />
                    </Button>
                ) : (
                    <button
                        disabled={disabled}
                        className={cn(
                            "w-16 h-16 rounded-lg ring-2 ring-transparent hover:ring-primary transition-all",
                            disabled && "opacity-50 cursor-not-allowed",
                            triggerClassName
                        )}
                        style={{ backgroundColor: value }}
                    />
                )}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="start">
                <div className="space-y-4">
                    <Label className="text-sm font-medium">
                        {mode === "add" ? "Add Color" : "Edit Color"}
                    </Label>

                    {/* Color picker */}
                    <HexColorPicker
                        color={internalColor}
                        onChange={handleColorChange}
                        className="!w-full"
                    />

                    {/* HEX input */}
                    <div className="space-y-2">
                        <Label htmlFor="hex-input" className="text-xs text-muted-foreground">
                            HEX Value
                        </Label>
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-mono">#</span>
                            <Input
                                id="hex-input"
                                value={hexInput}
                                onChange={handleHexInputChange}
                                placeholder="5B8DEF"
                                maxLength={6}
                                className={cn(
                                    "font-mono uppercase",
                                    error && "border-destructive focus-visible:ring-destructive"
                                )}
                            />
                            {/* Preview swatch */}
                            <div
                                className="w-10 h-10 rounded-md border flex-shrink-0"
                                style={{
                                    backgroundColor: isValidHex("#" + hexInput)
                                        ? "#" + hexInput
                                        : internalColor
                                }}
                            />
                        </div>
                        {error && (
                            <p className="text-xs text-destructive">{error}</p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 justify-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancel}
                        >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleConfirm}
                            disabled={!!error}
                        >
                            <Check className="w-4 h-4 mr-1" />
                            {mode === "add" ? "Add" : "Save"}
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
