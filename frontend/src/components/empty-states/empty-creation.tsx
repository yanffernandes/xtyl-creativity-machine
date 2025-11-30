import * as React from "react"
import { Sparkles, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Empty Creation State
 *
 * Contextual empty state for when a creation has no content yet
 *
 * @version 1.0.0
 * @feature 001-premium-visual-redesign
 */

interface EmptyCreationProps {
    onStartChat?: () => void
    className?: string
}

export function EmptyCreation({ onStartChat, className }: EmptyCreationProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center py-16 px-4 text-center",
                className
            )}
        >
            <div className="rounded-full bg-accent-primary/10 p-6 mb-6">
                <Sparkles className="h-12 w-12 text-accent-primary" />
            </div>

            <h3 className="text-2xl font-semibold text-text-primary mb-2">
                Pronto para criar?
            </h3>

            <p className="text-text-secondary max-w-md mb-8">
                Converse com o assistente IA para começar a desenvolver seu conteúdo.
                Ele vai te guiar em cada etapa do processo criativo.
            </p>

            {onStartChat && (
                <Button onClick={onStartChat} size="lg" className="gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Começar Conversa
                </Button>
            )}

            <div className="mt-8 space-y-2 text-sm text-text-tertiary max-w-sm">
                <p className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-primary" />
                    Descreva o que você quer criar
                </p>
                <p className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-primary" />
                    Refine com feedback do assistente
                </p>
                <p className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-primary" />
                    Gere o conteúdo final otimizado
                </p>
            </div>
        </div>
    )
}
