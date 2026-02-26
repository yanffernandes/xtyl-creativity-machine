"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Loader2, Image, Sparkles } from "lucide-react"
import {
    getVisualAssetsSummary,
    type VisualAssetsSummary,
    type AssetCategory,
} from "@/lib/api"

interface VisualContextSelectorProps {
    projectId: string
    onSettingsChange?: () => void
    onOpenAdvancedSettings?: () => void
}

const CATEGORY_ORDER: AssetCategory[] = ['Logo', 'Pessoa', 'Background', 'Produto', 'Outro']

// Cache outside component to persist across re-renders
const summaryCache = new Map<string, {
    summary: VisualAssetsSummary | null;
    timestamp: number;
}>()

const CACHE_TTL = 60000 // 1 minute

/**
 * Simplified Visual Context display component.
 *
 * Since Feature 028, visual assets are ALWAYS automatically injected
 * into image generation (up to 7 assets using rotation algorithm).
 *
 * This component now only shows an informative summary of available assets,
 * without any configuration controls.
 */
export default function VisualContextSelector({
    projectId,
}: VisualContextSelectorProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isInitialized, setIsInitialized] = useState(false)
    const [summary, setSummary] = useState<VisualAssetsSummary | null>(null)

    // Load summary on mount - with caching
    useEffect(() => {
        if (!projectId) return

        // Check cache first
        const cached = summaryCache.get(projectId)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            setSummary(cached.summary)
            setIsInitialized(true)
            return
        }

        loadSummary()
    }, [projectId])

    const loadSummary = async () => {
        if (!projectId) return

        setIsLoading(true)
        try {
            const summaryData = await getVisualAssetsSummary(projectId)
            setSummary(summaryData)

            // Update cache
            summaryCache.set(projectId, {
                summary: summaryData,
                timestamp: Date.now()
            })

        } catch (err) {
            console.error("Failed to load visual context summary:", err)
        } finally {
            setIsLoading(false)
            setIsInitialized(true)
        }
    }

    // Show loading only on first load
    if (!isInitialized && isLoading) {
        return (
            <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const totalAssets = summary?.total || 0

    // No assets - show helpful message
    if (totalAssets === 0) {
        return (
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Image className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">Contexto Visual</span>
                </div>
                <p className="text-[11px] text-muted-foreground italic px-1">
                    Nenhum asset visual no projeto. Faça upload na aba Assets para enriquecer suas gerações de imagem.
                </p>
            </div>
        )
    }

    // Count categories with assets
    const categoriesWithAssets = CATEGORY_ORDER.filter(
        cat => (summary?.by_category[cat] || 0) > 0
    )

    return (
        <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium">Contexto Visual</span>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-primary/10 text-primary">
                        Automático
                    </Badge>
                </div>
            </div>

            {/* Info text */}
            <p className="text-[11px] text-muted-foreground px-1">
                Até 7 assets são automaticamente incluídos nas gerações de imagem para manter consistência visual.
            </p>

            {/* Category summary */}
            {summary && (
                <div className="flex flex-wrap gap-1 px-1">
                    {categoriesWithAssets.map(category => {
                        const count = summary.by_category[category] || 0
                        return (
                            <Badge
                                key={category}
                                variant="outline"
                                className="text-[10px] px-1.5 py-0"
                            >
                                {category}: {count}
                            </Badge>
                        )
                    })}
                    <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 font-medium"
                    >
                        Total: {totalAssets}
                    </Badge>
                </div>
            )}
        </div>
    )
}
