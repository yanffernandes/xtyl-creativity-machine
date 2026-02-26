import * as React from "react"
import { Briefcase, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Empty Workspace State
 *
 * Contextual empty state with clear next actions for workspaces
 *
 * @version 1.0.0
 * @feature 001-premium-visual-redesign
 */

interface EmptyWorkspaceProps {
    onCreateProject?: () => void
    className?: string
}

export function EmptyWorkspace({ onCreateProject, className }: EmptyWorkspaceProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center py-16 px-4 text-center",
                className
            )}
        >
            <div className="rounded-full bg-accent-primary/10 p-6 mb-6">
                <Briefcase className="h-12 w-12 text-accent-primary" />
            </div>

            <h3 className="text-2xl font-semibold text-text-primary mb-2">
                Nenhum projeto ainda
            </h3>

            <p className="text-text-secondary max-w-md mb-8">
                Projetos são onde você organiza suas ideias e trabalhos criativos.
                Crie seu primeiro projeto para começar.
            </p>

            {onCreateProject && (
                <Button onClick={onCreateProject} size="lg" className="gap-2">
                    <Plus className="h-5 w-5" />
                    Criar Primeiro Projeto
                </Button>
            )}

            <div className="mt-8 space-y-2 text-sm text-text-tertiary max-w-sm">
                <p className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-primary" />
                    Organize ideias e criações por projeto
                </p>
                <p className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-primary" />
                    Colabore com sua equipe em tempo real
                </p>
                <p className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-primary" />
                    Acompanhe o progresso com IA assistente
                </p>
            </div>
        </div>
    )
}
