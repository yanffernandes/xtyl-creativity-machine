"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, Save, RotateCcw, Image, Info } from "lucide-react"
import {
    getVisualSettings,
    updateVisualSettings,
    getVisualAssetsSummary,
    type VisualAssetsSummary,
} from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"

interface AdvancedVisualSettingsModalProps {
    projectId: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onSettingsSaved?: () => void
}

export default function AdvancedVisualSettingsModal({
    projectId,
    open,
    onOpenChange,
    onSettingsSaved
}: AdvancedVisualSettingsModalProps) {
    const t = useTranslations("visualAssets")
    const tCommon = useTranslations("common")
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [assetsPerCategory, setAssetsPerCategory] = useState(2)
    const [originalValue, setOriginalValue] = useState(2)
    const [summary, setSummary] = useState<VisualAssetsSummary | null>(null)

    const { toast } = useToast()

    useEffect(() => {
        if (open) {
            loadData()
        }
    }, [open, projectId])

    const loadData = async () => {
        setIsLoading(true)
        try {
            const [settingsData, summaryData] = await Promise.all([
                getVisualSettings(projectId),
                getVisualAssetsSummary(projectId)
            ])
            setAssetsPerCategory(settingsData.assets_per_category)
            setOriginalValue(settingsData.assets_per_category)
            setSummary(summaryData)
        } catch (err) {
            console.error("Failed to load settings:", err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await updateVisualSettings(projectId, {
                assets_per_category: assetsPerCategory
            })
            setOriginalValue(assetsPerCategory)
            toast({
                title: t("settingsSaved"),
                description: t("settingsSavedDescription", { count: assetsPerCategory })
            })
            onSettingsSaved?.()
            onOpenChange(false)
        } catch (err) {
            console.error("Failed to save:", err)
            toast({
                title: t("settingsSaveError"),
                description: t("settingsSaveErrorDesc"),
                variant: "destructive"
            })
        } finally {
            setIsSaving(false)
        }
    }

    const hasChanges = assetsPerCategory !== originalValue

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Image className="h-5 w-5 text-purple-500" />
                        {t("settingsTitle")}
                    </DialogTitle>
                    <DialogDescription>
                        {t("settingsDescription")}
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-6 py-4">
                        {/* Assets per category slider */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">
                                    {t("assetsPerCategory")}
                                </label>
                                <Badge variant="secondary" className="text-sm">
                                    {assetsPerCategory}
                                </Badge>
                            </div>
                            <Slider
                                value={[assetsPerCategory]}
                                onValueChange={([value]) => setAssetsPerCategory(value)}
                                min={1}
                                max={5}
                                step={1}
                                disabled={isSaving}
                            />
                            <p className="text-xs text-muted-foreground">
                                {t("assetsPerCategoryHint")}
                            </p>
                        </div>

                        <Separator />

                        {/* Rotation info */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <RotateCcw className="h-4 w-4 text-muted-foreground" />
                                {t("smartRotation")}
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                                <p className="text-xs text-muted-foreground">
                                    {t("smartRotationHint")}
                                </p>
                                <div className="flex items-center gap-1.5 text-xs">
                                    <Info className="h-3 w-3 text-blue-500" />
                                    <span className="text-blue-600 dark:text-blue-400">
                                        {t("logosAlwaysIncluded")}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Category summary */}
                        {summary && summary.total > 0 && (
                            <>
                                <Separator />
                                <div className="space-y-3">
                                    <div className="text-sm font-medium">{t("assetsInProject")}</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(summary.by_category).map(([category, count]) => (
                                            <div
                                                key={category}
                                                className="flex items-center justify-between bg-muted/30 rounded px-3 py-2"
                                            >
                                                <span className="text-xs">{category}</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {count}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center">
                                        {t("total", { count: summary.total })}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        {tCommon("cancel")}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || !hasChanges}
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
                                {tCommon("save")}
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
