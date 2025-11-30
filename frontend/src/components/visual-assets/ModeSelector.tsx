"use client"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { MousePointer2, RefreshCw } from "lucide-react"
import type { VisualContextMode } from "@/lib/api"

interface ModeSelectorProps {
    mode: VisualContextMode
    onModeChange: (mode: VisualContextMode) => void
    disabled?: boolean
}

export default function ModeSelector({
    mode,
    onModeChange,
    disabled = false
}: ModeSelectorProps) {
    return (
        <div className="space-y-3">
            <Label className="text-sm font-medium">Modo de Seleção</Label>
            <RadioGroup
                value={mode}
                onValueChange={(value) => onModeChange(value as VisualContextMode)}
                disabled={disabled}
                className="grid grid-cols-2 gap-4"
            >
                <div>
                    <RadioGroupItem
                        value="manual"
                        id="mode-manual"
                        className="peer sr-only"
                    />
                    <Label
                        htmlFor="mode-manual"
                        className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all
                            ${mode === 'manual'
                                ? 'border-accent-primary bg-accent-primary/5'
                                : 'border-muted hover:border-muted-foreground/50'
                            }
                            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        <MousePointer2 className={`h-6 w-6 mb-2 ${mode === 'manual' ? 'text-accent-primary' : 'text-muted-foreground'}`} />
                        <span className={`text-sm font-medium ${mode === 'manual' ? 'text-accent-primary' : ''}`}>
                            Manual
                        </span>
                        <span className="text-xs text-muted-foreground text-center mt-1">
                            Escolha os assets específicos
                        </span>
                    </Label>
                </div>

                <div>
                    <RadioGroupItem
                        value="auto"
                        id="mode-auto"
                        className="peer sr-only"
                    />
                    <Label
                        htmlFor="mode-auto"
                        className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all
                            ${mode === 'auto'
                                ? 'border-accent-primary bg-accent-primary/5'
                                : 'border-muted hover:border-muted-foreground/50'
                            }
                            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        <RefreshCw className={`h-6 w-6 mb-2 ${mode === 'auto' ? 'text-accent-primary' : 'text-muted-foreground'}`} />
                        <span className={`text-sm font-medium ${mode === 'auto' ? 'text-accent-primary' : ''}`}>
                            Automático
                        </span>
                        <span className="text-xs text-muted-foreground text-center mt-1">
                            Rotação inteligente de assets
                        </span>
                    </Label>
                </div>
            </RadioGroup>
        </div>
    )
}
