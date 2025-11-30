"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Type, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Label } from "@/components/ui/label"
import { BrandTypography } from "@/lib/api"

// Curated list of popular fonts (15 fonts as per spec)
const POPULAR_FONTS = [
    { name: "Inter", category: "Sans-serif" },
    { name: "Roboto", category: "Sans-serif" },
    { name: "Open Sans", category: "Sans-serif" },
    { name: "Lato", category: "Sans-serif" },
    { name: "Montserrat", category: "Sans-serif" },
    { name: "Poppins", category: "Sans-serif" },
    { name: "Raleway", category: "Sans-serif" },
    { name: "Nunito", category: "Sans-serif" },
    { name: "Arial", category: "Sans-serif" },
    { name: "Helvetica", category: "Sans-serif" },
    { name: "Playfair Display", category: "Serif" },
    { name: "Merriweather", category: "Serif" },
    { name: "Source Serif Pro", category: "Serif" },
    { name: "Oswald", category: "Display" },
    { name: "Ubuntu", category: "Sans-serif" },
]

interface FontSelectorProps {
    label: string
    description: string
    value: string | null
    onChange: (value: string | null) => void
    disabled?: boolean
}

function FontSelector({
    label,
    description,
    value,
    onChange,
    disabled = false,
}: FontSelectorProps) {
    const [open, setOpen] = useState(false)
    const [inputValue, setInputValue] = useState("")

    const selectedFont = value || ""

    const handleSelect = (fontName: string) => {
        onChange(fontName || null)
        setOpen(false)
        setInputValue("")
    }

    const handleInputChange = (value: string) => {
        setInputValue(value)
    }

    const handleCustomFontSubmit = () => {
        if (inputValue.trim()) {
            onChange(inputValue.trim())
            setOpen(false)
            setInputValue("")
        }
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Label className="text-sm font-medium text-foreground">{label}</Label>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <Info className="w-3.5 h-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="max-w-xs text-xs">{description}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled}
                        className={cn(
                            "w-full justify-between",
                            !selectedFont && "text-muted-foreground"
                        )}
                    >
                        {selectedFont || "Select font..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                        <CommandInput
                            placeholder="Search or type custom font..."
                            value={inputValue}
                            onValueChange={handleInputChange}
                        />
                        <CommandList>
                            <CommandEmpty>
                                <div className="p-2 text-center">
                                    <p className="text-sm text-muted-foreground mb-2">
                                        No font found.
                                    </p>
                                    {inputValue.trim() && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCustomFontSubmit}
                                        >
                                            Use "{inputValue.trim()}" as custom font
                                        </Button>
                                    )}
                                </div>
                            </CommandEmpty>
                            <CommandGroup heading="Popular Fonts">
                                {POPULAR_FONTS.map((font) => (
                                    <CommandItem
                                        key={font.name}
                                        value={font.name}
                                        onSelect={() => handleSelect(font.name)}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedFont === font.name
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                            )}
                                        />
                                        <span className="flex-1">{font.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {font.category}
                                        </span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                            {selectedFont && !POPULAR_FONTS.some(f => f.name === selectedFont) && (
                                <CommandGroup heading="Custom">
                                    <CommandItem
                                        value={selectedFont}
                                        onSelect={() => handleSelect(selectedFont)}
                                    >
                                        <Check className="mr-2 h-4 w-4 opacity-100" />
                                        <span>{selectedFont}</span>
                                        <span className="text-xs text-muted-foreground ml-auto">
                                            Custom
                                        </span>
                                    </CommandItem>
                                </CommandGroup>
                            )}
                            {/* Option to clear */}
                            {selectedFont && (
                                <CommandGroup>
                                    <CommandItem
                                        value="__clear__"
                                        onSelect={() => handleSelect("")}
                                        className="text-muted-foreground"
                                    >
                                        Clear selection
                                    </CommandItem>
                                </CommandGroup>
                            )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    )
}

interface TypographySettingsProps {
    typography: BrandTypography
    onChange: (typography: BrandTypography) => void
    disabled?: boolean
}

export default function TypographySettings({
    typography,
    onChange,
    disabled = false,
}: TypographySettingsProps) {
    const handleFontChange = (tier: keyof BrandTypography, value: string | null) => {
        onChange({
            ...typography,
            [tier]: value,
        })
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Typography</span>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <Info className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="max-w-xs text-xs">
                                Define your brand fonts. These will be included as context for AI-generated content.
                                Custom fonts are accepted - they will be used as text references.
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Font selectors */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FontSelector
                    label="Primary Font"
                    description="Used for headlines, titles, and important text. Should be bold and attention-grabbing."
                    value={typography.primary}
                    onChange={(value) => handleFontChange("primary", value)}
                    disabled={disabled}
                />
                <FontSelector
                    label="Secondary Font"
                    description="Used for body text and paragraphs. Should be readable and comfortable for long text."
                    value={typography.secondary}
                    onChange={(value) => handleFontChange("secondary", value)}
                    disabled={disabled}
                />
                <FontSelector
                    label="Tertiary Font"
                    description="Used for accents, captions, and metadata. Can be more decorative or subtle."
                    value={typography.tertiary}
                    onChange={(value) => handleFontChange("tertiary", value)}
                    disabled={disabled}
                />
            </div>

            {/* Preview (optional visual feedback) */}
            {(typography.primary || typography.secondary || typography.tertiary) && (
                <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-2">
                    <p className="text-xs text-muted-foreground mb-2">Font Preview</p>
                    {typography.primary && (
                        <p className="text-lg font-semibold">
                            {typography.primary} - Headlines
                        </p>
                    )}
                    {typography.secondary && (
                        <p className="text-base">
                            {typography.secondary} - Body text
                        </p>
                    )}
                    {typography.tertiary && (
                        <p className="text-sm text-muted-foreground">
                            {typography.tertiary} - Captions
                        </p>
                    )}
                </div>
            )}

            {/* Empty state */}
            {!typography.primary && !typography.secondary && !typography.tertiary && (
                <p className="text-sm text-muted-foreground">
                    No fonts configured yet. Select fonts from the dropdowns above.
                </p>
            )}
        </div>
    )
}
