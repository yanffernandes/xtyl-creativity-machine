import * as React from "react"
import { FileText, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Empty Project State
 *
 * Contextual empty state with clear next actions for projects
 *
 * @version 1.0.0
 * @feature 001-premium-visual-redesign
 */

interface EmptyProjectProps {
    onCreateCreation?: () => void
    className?: string
}

export function EmptyProject({ onCreateCreation, className }: EmptyProjectProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center py-16 px-4 text-center",
                className
            )}
        >
            <div className="rounded-full bg-accent-primary/10 p-6 mb-6">
                <FileText className="h-12 w-12 text-accent-primary" />
            </div>

            <h3 className="text-2xl font-semibold text-text-primary mb-2">
                Nenhuma criação ainda
            </h3>

            <p className="text-text-secondary max-w-md mb-8">
                Criações são onde você desenvolve seus conteúdos com ajuda da IA.
                Comece sua primeira criação agora.
            </p>

            {onCreateCreation && (
                <Button onClick={onCreateCreation} size="lg" className="gap-2">
                    <Plus className="h-5 w-5" />
                    Criar Primeira Criação
                </Button>
            )}

            <div className="mt-8 space-y-2 text-sm text-text-tertiary max-w-sm">
                <p className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-primary" />
                    Use templates especializados
                </p>
                <p className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-primary" />
                    Refine com o assistente IA
                </p>
                <p className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-primary" />
                    Salve e organize suas versões
                </p>
            </div>
        </div>
    )
}
