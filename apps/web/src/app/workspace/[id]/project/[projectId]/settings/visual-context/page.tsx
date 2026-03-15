"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAuthStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ImageIcon } from "lucide-react"
import Breadcrumbs from "@/components/Breadcrumbs"
import VisualContextSettings from "@/components/visual-assets/VisualContextSettings"

export default function VisualContextSettingsPage() {
    const params = useParams()
    const router = useRouter()
    const workspaceId = params.id as string
    const projectId = params.projectId as string

    const { session, isLoading: authLoading } = useAuthStore()

    useEffect(() => {
        if (!authLoading && !session) {
            router.push("/login")
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, authLoading])

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary" />
            </div>
        )
    }

    const breadcrumbItems = [
        { label: "Projeto", href: `/workspace/${workspaceId}/project/${projectId}` },
        { label: "Configurações", href: `/workspace/${workspaceId}/project/${projectId}/settings` },
        { label: "Contexto Visual" },
    ]

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/workspace/${workspaceId}/project/${projectId}/settings`)}
                        className="mb-4 -ml-2"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar para Configurações
                    </Button>

                    <Breadcrumbs items={breadcrumbItems} className="mb-4" />

                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-accent-primary/10 rounded-lg">
                            <ImageIcon className="h-6 w-6 text-accent-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Contexto Visual</h1>
                            <p className="text-muted-foreground mt-1">
                                Configure quais assets visuais o assistente deve usar automaticamente nas gerações de imagem
                            </p>
                        </div>
                    </div>
                </div>

                {/* Settings Component */}
                <VisualContextSettings projectId={projectId} />
            </div>
        </div>
    )
}
