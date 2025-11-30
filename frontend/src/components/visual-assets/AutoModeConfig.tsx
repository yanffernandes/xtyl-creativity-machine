"use client"

import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import CategoryBadge from "./CategoryBadge"
import type { VisualAssetsSummary, AssetCategory } from "@/lib/api"

interface AutoModeConfigProps {
    assetsPerCategory: number
    onAssetsPerCategoryChange: (value: number) => void
    summary?: VisualAssetsSummary | null
    disabled?: boolean
}

const CATEGORY_ORDER: AssetCategory[] = ["Logo", "Pessoa", "Background", "Produto", "Outro"]

export default function AutoModeConfig({
    assetsPerCategory,
    onAssetsPerCategoryChange,
    summary,
    disabled = false
}: AutoModeConfigProps) {
    return (
        <div className="space-y-6">
            {/* Assets per category slider */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                        Assets por categoria
                    </Label>
                    <span className="text-sm font-medium text-accent-primary">
                        {assetsPerCategory}
                    </span>
                </div>
                <Slider
                    value={[assetsPerCategory]}
                    onValueChange={([value]) => onAssetsPerCategoryChange(value)}
                    min={1}
                    max={5}
                    step={1}
                    disabled={disabled}
                    className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                    Quantos assets de cada categoria serão incluídos automaticamente nas gerações
                </p>
            </div>

            {/* Category summary */}
            {summary && (
                <div className="space-y-3">
                    <Label className="text-sm font-medium">
                        Resumo por Categoria
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {CATEGORY_ORDER.map((category) => {
                            const count = summary.by_category[category] || 0
                            const willUse = Math.min(count, assetsPerCategory)

                            return (
                                <div
                                    key={category}
                                    className="p-3 bg-muted/50 rounded-lg"
                                >
                                    <CategoryBadge
                                        category={category}
                                        size="sm"
                                    />
                                    <div className="mt-2 text-sm">
                                        <span className="font-medium">{count}</span>
                                        <span className="text-muted-foreground"> disponíveis</span>
                                    </div>
                                    {count > 0 && (
                                        <div className="text-xs text-accent-primary mt-1">
                                            {willUse} será usado por geração
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        {/* Unclassified */}
                        {summary.by_category["unclassified"] > 0 && (
                            <div className="p-3 bg-muted/50 rounded-lg">
                                <Badge variant="outline" className="text-xs">
                                    Não classificados
                                </Badge>
                                <div className="mt-2 text-sm">
                                    <span className="font-medium">
                                        {summary.by_category["unclassified"]}
                                    </span>
                                    <span className="text-muted-foreground"> disponíveis</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    Classifique para usar
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Info box */}
            <div className="p-4 bg-accent-primary/5 rounded-lg border border-accent-primary/20">
                <h4 className="text-sm font-medium mb-1">Como funciona a rotação?</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Logos</strong> são sempre incluídos primeiro</li>
                    <li>• Assets usados recentemente têm menor prioridade</li>
                    <li>• Máximo de 5 assets por geração de imagem</li>
                    <li>• A rotação garante variedade nas gerações</li>
                </ul>
            </div>
        </div>
    )
}
