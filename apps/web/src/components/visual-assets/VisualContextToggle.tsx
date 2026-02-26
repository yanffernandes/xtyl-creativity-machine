"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ImageIcon, Sparkles } from "lucide-react"

interface VisualContextToggleProps {
    isEnabled: boolean
    onToggle: (enabled: boolean) => void
    disabled?: boolean
}

export default function VisualContextToggle({
    isEnabled,
    onToggle,
    disabled = false
}: VisualContextToggleProps) {
    return (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isEnabled ? 'bg-accent-primary/10' : 'bg-muted'}`}>
                    <Sparkles className={`h-5 w-5 ${isEnabled ? 'text-accent-primary' : 'text-muted-foreground'}`} />
                </div>
                <div>
                    <Label
                        htmlFor="visual-context-toggle"
                        className="text-sm font-medium cursor-pointer"
                    >
                        Contexto Visual Automático
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {isEnabled
                            ? "Seus assets visuais serão incluídos automaticamente nas gerações de imagem"
                            : "Ative para incluir assets visuais automaticamente nas gerações"
                        }
                    </p>
                </div>
            </div>
            <Switch
                id="visual-context-toggle"
                checked={isEnabled}
                onCheckedChange={onToggle}
                disabled={disabled}
            />
        </div>
    )
}
