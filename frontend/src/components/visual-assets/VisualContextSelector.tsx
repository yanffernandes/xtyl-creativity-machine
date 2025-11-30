"use client"

import { useState, useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Loader2, Image, Settings2, RotateCcw, ChevronRight, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    getVisualSettings,
    updateVisualSettings,
    getAssetSelections,
    updateAssetSelections,
    getVisualAssets,
    getVisualAssetsSummary,
    type VisualContextMode,
    type VisualAsset,
    type VisualAssetsSummary,
    type AssetCategory,
} from "@/lib/api"
import CategoryBadge from "./CategoryBadge"

interface VisualContextSelectorProps {
    projectId: string
    onSettingsChange?: () => void
    onOpenAdvancedSettings?: () => void
}

const CATEGORY_ORDER: AssetCategory[] = ['Logo', 'Pessoa', 'Background', 'Produto', 'Outro']

// Cache outside component to persist across re-renders
const dataCache = new Map<string, {
    settings: { isEnabled: boolean; mode: VisualContextMode; assetsPerCategory: number };
    assets: VisualAsset[];
    selectedIds: string[];
    summary: VisualAssetsSummary | null;
    timestamp: number;
}>()

const CACHE_TTL = 60000 // 1 minute

export default function VisualContextSelector({
    projectId,
    onSettingsChange,
    onOpenAdvancedSettings
}: VisualContextSelectorProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isInitialized, setIsInitialized] = useState(false)

    // Settings state
    const [isEnabled, setIsEnabled] = useState(false)
    const [mode, setMode] = useState<VisualContextMode>("manual")
    const [assetsPerCategory, setAssetsPerCategory] = useState(2)

    // Assets state
    const [assets, setAssets] = useState<VisualAsset[]>([])
    const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])
    const [summary, setSummary] = useState<VisualAssetsSummary | null>(null)

    // Load data on mount - with caching
    useEffect(() => {
        if (!projectId) return

        // Check cache first
        const cached = dataCache.get(projectId)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            setIsEnabled(cached.settings.isEnabled)
            setMode(cached.settings.mode)
            setAssetsPerCategory(cached.settings.assetsPerCategory)
            setAssets(cached.assets)
            setSelectedAssetIds(cached.selectedIds)
            setSummary(cached.summary)
            setIsInitialized(true)
            return
        }

        loadData()
    }, [projectId])

    const loadData = async () => {
        if (!projectId) return

        setIsLoading(true)
        try {
            const [settingsData, assetsData, selectionsData, summaryData] = await Promise.all([
                getVisualSettings(projectId),
                getVisualAssets(projectId),
                getAssetSelections(projectId),
                getVisualAssetsSummary(projectId)
            ])

            const selectedIds = selectionsData.selections
                .filter(s => s.is_enabled)
                .map(s => s.asset_id)

            setIsEnabled(settingsData.is_enabled)
            setMode(settingsData.mode)
            setAssetsPerCategory(settingsData.assets_per_category)
            setAssets(assetsData.assets)
            setSelectedAssetIds(selectedIds)
            setSummary(summaryData)

            // Update cache
            dataCache.set(projectId, {
                settings: {
                    isEnabled: settingsData.is_enabled,
                    mode: settingsData.mode,
                    assetsPerCategory: settingsData.assets_per_category
                },
                assets: assetsData.assets,
                selectedIds,
                summary: summaryData,
                timestamp: Date.now()
            })

        } catch (err) {
            console.error("Failed to load visual context:", err)
        } finally {
            setIsLoading(false)
            setIsInitialized(true)
        }
    }

    const updateCache = (updates: Partial<{
        isEnabled: boolean;
        mode: VisualContextMode;
        selectedIds: string[];
    }>) => {
        const cached = dataCache.get(projectId)
        if (cached) {
            dataCache.set(projectId, {
                ...cached,
                settings: {
                    ...cached.settings,
                    isEnabled: updates.isEnabled ?? cached.settings.isEnabled,
                    mode: updates.mode ?? cached.settings.mode,
                },
                selectedIds: updates.selectedIds ?? cached.selectedIds,
                timestamp: Date.now()
            })
        }
    }

    const handleToggleEnabled = async (enabled: boolean) => {
        setIsSaving(true)
        try {
            await updateVisualSettings(projectId, { is_enabled: enabled })
            setIsEnabled(enabled)
            updateCache({ isEnabled: enabled })
            onSettingsChange?.()
        } catch (err) {
            console.error("Failed to toggle visual context:", err)
        } finally {
            setIsSaving(false)
        }
    }

    const handleModeChange = async (newMode: VisualContextMode) => {
        setIsSaving(true)
        try {
            await updateVisualSettings(projectId, { mode: newMode })
            setMode(newMode)
            updateCache({ mode: newMode })
            onSettingsChange?.()
        } catch (err) {
            console.error("Failed to change mode:", err)
        } finally {
            setIsSaving(false)
        }
    }

    const handleAssetToggle = async (assetId: string) => {
        const newSelectedIds = selectedAssetIds.includes(assetId)
            ? selectedAssetIds.filter(id => id !== assetId)
            : [...selectedAssetIds, assetId]

        setSelectedAssetIds(newSelectedIds)

        // Save immediately
        try {
            await updateAssetSelections(projectId, newSelectedIds)
            updateCache({ selectedIds: newSelectedIds })
            onSettingsChange?.()
        } catch (err) {
            console.error("Failed to update selections:", err)
            // Revert on error
            setSelectedAssetIds(selectedAssetIds)
        }
    }

    // Group assets by category
    const assetsByCategory = assets.reduce((acc, asset) => {
        const category = asset.category || 'Outro'
        if (!acc[category]) acc[category] = []
        acc[category].push(asset)
        return acc
    }, {} as Record<string, VisualAsset[]>)

    // Show loading only on first load
    if (!isInitialized && isLoading) {
        return (
            <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const totalAssets = assets.length
    const selectedCount = selectedAssetIds.length

    return (
        <div className="space-y-3">
            {/* Header with toggle */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Image className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">Contexto Visual</span>
                    {isEnabled && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                            {mode === 'auto' ? 'Auto' : `${selectedCount} selecionados`}
                        </Badge>
                    )}
                </div>
                <Switch
                    checked={isEnabled}
                    onCheckedChange={handleToggleEnabled}
                    disabled={isSaving || totalAssets === 0}
                    className="scale-75"
                />
            </div>

            {totalAssets === 0 && (
                <p className="text-[11px] text-muted-foreground italic px-1">
                    Nenhum asset visual no projeto. Faça upload na aba Assets.
                </p>
            )}

            {isEnabled && totalAssets > 0 && (
                <>
                    {/* Mode selector */}
                    <div className="flex items-center gap-1 px-1 p-1 bg-muted/30 rounded-lg">
                        <button
                            onClick={() => handleModeChange('manual')}
                            disabled={isSaving}
                            className={cn(
                                "flex-1 text-[11px] py-1.5 px-2 rounded-md transition-all",
                                mode === 'manual'
                                    ? "bg-background text-foreground font-medium shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Manual
                        </button>
                        <button
                            onClick={() => handleModeChange('auto')}
                            disabled={isSaving}
                            className={cn(
                                "flex-1 text-[11px] py-1.5 px-2 rounded-md transition-all",
                                mode === 'auto'
                                    ? "bg-background text-foreground font-medium shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Automático
                        </button>
                    </div>

                    {/* Manual mode: Visual Grid Selection */}
                    {mode === 'manual' && (
                        <div className="max-h-[220px] overflow-y-auto space-y-3 px-1">
                            {CATEGORY_ORDER.map(category => {
                                const categoryAssets = assetsByCategory[category]
                                if (!categoryAssets?.length) return null

                                return (
                                    <div key={category} className="space-y-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <CategoryBadge category={category} size="sm" showIcon={false} />
                                            <span className="text-[10px] text-muted-foreground">
                                                ({categoryAssets.length})
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-4 gap-1.5">
                                            {categoryAssets.map(asset => {
                                                const isSelected = selectedAssetIds.includes(asset.id)
                                                return (
                                                    <button
                                                        key={asset.id}
                                                        type="button"
                                                        onClick={() => handleAssetToggle(asset.id)}
                                                        className={cn(
                                                            "relative aspect-square rounded-md overflow-hidden border-2 transition-all",
                                                            isSelected
                                                                ? "border-primary ring-1 ring-primary/30"
                                                                : "border-transparent hover:border-muted-foreground/30"
                                                        )}
                                                    >
                                                        {asset.thumbnail_url ? (
                                                            <img
                                                                src={asset.thumbnail_url}
                                                                alt={asset.title}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-muted flex items-center justify-center">
                                                                <Image className="h-4 w-4 text-muted-foreground" />
                                                            </div>
                                                        )}
                                                        {isSelected && (
                                                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                                <div className="bg-primary rounded-full p-0.5">
                                                                    <Check className="h-3 w-3 text-primary-foreground" />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Auto mode: Summary */}
                    {mode === 'auto' && (
                        <div className="px-1 space-y-2">
                            <div className="text-[11px] text-muted-foreground space-y-1">
                                <div className="flex items-center gap-1.5">
                                    <RotateCcw className="h-3 w-3" />
                                    <span>{assetsPerCategory} assets por categoria (rotativo)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Image className="h-3 w-3" />
                                    <span>Logos sempre incluídos</span>
                                </div>
                            </div>

                            {summary && (
                                <div className="flex flex-wrap gap-1">
                                    {CATEGORY_ORDER.map(category => {
                                        const count = summary.by_category[category] || 0
                                        if (count === 0) return null
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
                                </div>
                            )}
                        </div>
                    )}

                    {/* Advanced settings link */}
                    {onOpenAdvancedSettings && (
                        <>
                            <Separator className="my-2" />
                            <button
                                onClick={onOpenAdvancedSettings}
                                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1 w-full"
                            >
                                <Settings2 className="h-3 w-3" />
                                <span>Configurações avançadas</span>
                                <ChevronRight className="h-3 w-3 ml-auto" />
                            </button>
                        </>
                    )}
                </>
            )}
        </div>
    )
}
