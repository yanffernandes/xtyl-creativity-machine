"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Save, AlertCircle } from "lucide-react"
import {
    getVisualSettings,
    updateVisualSettings,
    getAssetSelections,
    updateAssetSelections,
    getVisualAssets,
    getVisualAssetsSummary,
    type AssistantVisualSettings,
    type VisualContextMode,
    type VisualAsset,
    type VisualAssetsSummary,
} from "@/lib/api"
import VisualContextToggle from "./VisualContextToggle"
import ModeSelector from "./ModeSelector"
import AssetSelectorGrid from "./AssetSelectorGrid"
import AutoModeConfig from "./AutoModeConfig"

interface VisualContextSettingsProps {
    projectId: string
}

export default function VisualContextSettings({ projectId }: VisualContextSettingsProps) {
    const t = useTranslations("visualAssets")
    const tCommon = useTranslations("common")
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Settings state
    const [isEnabled, setIsEnabled] = useState(false)
    const [mode, setMode] = useState<VisualContextMode>("manual")
    const [assetsPerCategory, setAssetsPerCategory] = useState(2)

    // Assets state
    const [assets, setAssets] = useState<VisualAsset[]>([])
    const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])
    const [summary, setSummary] = useState<VisualAssetsSummary | null>(null)

    // Track if there are unsaved changes
    const [hasChanges, setHasChanges] = useState(false)
    const [originalState, setOriginalState] = useState({
        isEnabled: false,
        mode: "manual" as VisualContextMode,
        assetsPerCategory: 2,
        selectedAssetIds: [] as string[]
    })

    const { toast } = useToast()

    // Load initial data
    useEffect(() => {
        loadData()
    }, [projectId])

    // Track changes
    useEffect(() => {
        const changed =
            isEnabled !== originalState.isEnabled ||
            mode !== originalState.mode ||
            assetsPerCategory !== originalState.assetsPerCategory ||
            JSON.stringify(selectedAssetIds.sort()) !== JSON.stringify(originalState.selectedAssetIds.sort())

        setHasChanges(changed)
    }, [isEnabled, mode, assetsPerCategory, selectedAssetIds, originalState])

    const loadData = async () => {
        setIsLoading(true)
        setError(null)

        try {
            // Load all data in parallel
            const [settingsData, assetsData, selectionsData, summaryData] = await Promise.all([
                getVisualSettings(projectId),
                getVisualAssets(projectId),
                getAssetSelections(projectId),
                getVisualAssetsSummary(projectId)
            ])

            // Set settings
            setIsEnabled(settingsData.is_enabled)
            setMode(settingsData.mode)
            setAssetsPerCategory(settingsData.assets_per_category)

            // Set assets
            setAssets(assetsData.assets)
            setSummary(summaryData)

            // Set selections
            const selectedIds = selectionsData.selections
                .filter(s => s.is_enabled)
                .map(s => s.asset_id)
            setSelectedAssetIds(selectedIds)

            // Store original state
            setOriginalState({
                isEnabled: settingsData.is_enabled,
                mode: settingsData.mode,
                assetsPerCategory: settingsData.assets_per_category,
                selectedAssetIds: selectedIds
            })

        } catch (err: any) {
            console.error("Failed to load visual context settings:", err)
            setError(err.response?.data?.detail || t("loadError"))
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async () => {
        setIsSaving(true)

        try {
            // Save settings
            await updateVisualSettings(projectId, {
                is_enabled: isEnabled,
                mode,
                assets_per_category: assetsPerCategory
            })

            // Save selections (only in manual mode)
            if (mode === "manual") {
                await updateAssetSelections(projectId, selectedAssetIds)
            }

            // Update original state
            setOriginalState({
                isEnabled,
                mode,
                assetsPerCategory,
                selectedAssetIds
            })

            setHasChanges(false)

            toast({
                title: t("settingsSaved"),
                description: t("settingsSavedDescription", { count: assetsPerCategory })
            })

        } catch (err: any) {
            console.error("Failed to save settings:", err)
            toast({
                title: t("settingsSaveError"),
                description: err.response?.data?.detail || t("settingsSaveErrorDesc"),
                variant: "destructive"
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleReset = () => {
        setIsEnabled(originalState.isEnabled)
        setMode(originalState.mode)
        setAssetsPerCategory(originalState.assetsPerCategory)
        setSelectedAssetIds(originalState.selectedAssetIds)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mb-3" />
                <h3 className="font-medium mb-1">{t("loadErrorTitle")}</h3>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button onClick={loadData} variant="outline">
                    {t("tryAgain")}
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Toggle */}
            <Card className="p-6">
                <VisualContextToggle
                    isEnabled={isEnabled}
                    onToggle={setIsEnabled}
                    disabled={isSaving}
                />
            </Card>

            {/* Mode selector (only show when enabled) */}
            {isEnabled && (
                <Card className="p-6">
                    <ModeSelector
                        mode={mode}
                        onModeChange={setMode}
                        disabled={isSaving}
                    />
                </Card>
            )}

            {/* Mode-specific config */}
            {isEnabled && mode === "manual" && (
                <Card className="p-6">
                    <h3 className="font-medium mb-4">{t("assetSelection")}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        {t("assetSelectionHint")}
                    </p>
                    <AssetSelectorGrid
                        assets={assets}
                        selectedIds={selectedAssetIds}
                        onSelectionChange={setSelectedAssetIds}
                        maxSelections={20}
                    />
                </Card>
            )}

            {isEnabled && mode === "auto" && (
                <Card className="p-6">
                    <h3 className="font-medium mb-4">{t("autoConfig")}</h3>
                    <AutoModeConfig
                        assetsPerCategory={assetsPerCategory}
                        onAssetsPerCategoryChange={setAssetsPerCategory}
                        summary={summary}
                        disabled={isSaving}
                    />
                </Card>
            )}

            {/* Save button */}
            {hasChanges && (
                <div className="flex justify-end gap-3 sticky bottom-4 bg-background/80 backdrop-blur-sm p-4 rounded-lg border">
                    <Button
                        variant="outline"
                        onClick={handleReset}
                        disabled={isSaving}
                    >
                        {t("discardChanges")}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="gap-2"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {t("saving")}
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                {t("saveChanges")}
                            </>
                        )}
                    </Button>
                </div>
            )}
        </div>
    )
}
