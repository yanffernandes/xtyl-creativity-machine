"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Sparkles, ImageIcon, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { getVisualContext, type VisualAsset, type VisualContextResponse } from "@/lib/api"
import CategoryBadge from "./CategoryBadge"

interface VisualContextPreviewProps {
    projectId: string
    compact?: boolean
    showToggle?: boolean
}

export default function VisualContextPreview({
    projectId,
    compact = false,
    showToggle = true
}: VisualContextPreviewProps) {
    const [context, setContext] = useState<VisualContextResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isExpanded, setIsExpanded] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadVisualContext()
    }, [projectId])

    const loadVisualContext = async () => {
        try {
            setIsLoading(true)
            setError(null)
            const data = await getVisualContext(projectId)
            setContext(data)
        } catch (err: any) {
            console.error("Failed to load visual context:", err)
            setError("Erro ao carregar contexto visual")
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Carregando contexto visual...</span>
            </div>
        )
    }

    if (error || !context) {
        return null
    }

    if (!context.is_enabled) {
        return null
    }

    if (context.assets.length === 0) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ImageIcon className="h-4 w-4" />
                <span>Contexto visual ativo, mas nenhum asset selecionado</span>
            </div>
        )
    }

    if (compact) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 px-2 py-1 bg-accent-primary/10 rounded-full cursor-help">
                            <Sparkles className="h-3 w-3 text-accent-primary" />
                            <span className="text-xs font-medium text-accent-primary">
                                {context.assets.length} assets
                            </span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Contexto Visual Ativo</p>
                            <p className="text-xs text-muted-foreground">
                                {context.assets.length} asset(s) serão usados como referência
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {context.assets.slice(0, 5).map((asset) => (
                                    <img
                                        key={asset.id}
                                        src={asset.thumbnail_url || asset.file_url}
                                        alt={asset.title}
                                        className="w-8 h-8 rounded object-cover"
                                    />
                                ))}
                                {context.assets.length > 5 && (
                                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs">
                                        +{context.assets.length - 5}
                                    </div>
                                )}
                            </div>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    return (
        <Card className="overflow-hidden">
            <div
                className="flex items-center justify-between p-3 cursor-pointer"
                onClick={() => showToggle && setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent-primary/10 rounded-lg">
                        <Sparkles className="h-4 w-4 text-accent-primary" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Contexto Visual</span>
                            <Badge variant="secondary" className="text-xs">
                                {context.mode === 'auto' ? 'Automático' : 'Manual'}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {context.assets.length} asset(s) serão usados nas gerações
                        </p>
                    </div>
                </div>
                {showToggle && (
                    <button className="p-1 hover:bg-muted rounded">
                        {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                    </button>
                )}
            </div>

            {(isExpanded || !showToggle) && (
                <div className="p-3 pt-0 border-t">
                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2 mt-3">
                        {context.assets.map((asset) => (
                            <TooltipProvider key={asset.id}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:ring-2 hover:ring-accent-primary/50 transition-all">
                                            <img
                                                src={asset.thumbnail_url || asset.file_url}
                                                alt={asset.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                        <div className="space-y-1">
                                            <p className="font-medium text-sm">{asset.title}</p>
                                            <CategoryBadge category={asset.category} size="sm" />
                                            {asset.tags && asset.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {asset.tags.slice(0, 3).map((tag, idx) => (
                                                        <Badge key={idx} variant="outline" className="text-xs">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    )
}
