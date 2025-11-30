"use client"

import { useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, ImageIcon } from "lucide-react"
import CategoryBadge from "./CategoryBadge"
import type { VisualAsset, AssetCategory } from "@/lib/api"

interface AssetSelectorGridProps {
    assets: VisualAsset[]
    selectedIds: string[]
    onSelectionChange: (ids: string[]) => void
    isLoading?: boolean
    maxSelections?: number
}

const CATEGORY_ORDER: AssetCategory[] = ["Logo", "Pessoa", "Background", "Produto", "Outro"]

export default function AssetSelectorGrid({
    assets,
    selectedIds,
    onSelectionChange,
    isLoading = false,
    maxSelections = 20
}: AssetSelectorGridProps) {
    // Group assets by category
    const groupedAssets = CATEGORY_ORDER.reduce((acc, category) => {
        const categoryAssets = assets.filter(a => a.category === category)
        if (categoryAssets.length > 0) {
            acc[category] = categoryAssets
        }
        return acc
    }, {} as Record<AssetCategory, VisualAsset[]>)

    // Add unclassified assets
    const unclassifiedAssets = assets.filter(a => !a.category)
    if (unclassifiedAssets.length > 0) {
        groupedAssets["Outro"] = [
            ...(groupedAssets["Outro"] || []),
            ...unclassifiedAssets
        ]
    }

    const handleToggle = (assetId: string) => {
        if (selectedIds.includes(assetId)) {
            onSelectionChange(selectedIds.filter(id => id !== assetId))
        } else if (selectedIds.length < maxSelections) {
            onSelectionChange([...selectedIds, assetId])
        }
    }

    const handleSelectAll = (category: AssetCategory) => {
        const categoryAssets = groupedAssets[category] || []
        const categoryIds = categoryAssets.map(a => a.id)
        const currentlySelected = selectedIds.filter(id => categoryIds.includes(id))

        if (currentlySelected.length === categoryIds.length) {
            // Deselect all in category
            onSelectionChange(selectedIds.filter(id => !categoryIds.includes(id)))
        } else {
            // Select all in category (up to max)
            const newIds = [...selectedIds.filter(id => !categoryIds.includes(id)), ...categoryIds]
            onSelectionChange(newIds.slice(0, maxSelections))
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (assets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 text-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="font-medium mb-1">Nenhum asset disponível</h3>
                <p className="text-sm text-muted-foreground">
                    Faça upload de assets na biblioteca para selecioná-los aqui
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                    {selectedIds.length} de {maxSelections} selecionados
                </span>
                {selectedIds.length > 0 && (
                    <button
                        onClick={() => onSelectionChange([])}
                        className="text-xs text-accent-primary hover:underline"
                    >
                        Limpar seleção
                    </button>
                )}
            </div>

            {Object.entries(groupedAssets).map(([category, categoryAssets]) => {
                const categorySelectedCount = categoryAssets.filter(a =>
                    selectedIds.includes(a.id)
                ).length

                return (
                    <div key={category} className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CategoryBadge
                                    category={category as AssetCategory}
                                    size="sm"
                                />
                                <span className="text-xs text-muted-foreground">
                                    ({categorySelectedCount}/{categoryAssets.length})
                                </span>
                            </div>
                            <button
                                onClick={() => handleSelectAll(category as AssetCategory)}
                                className="text-xs text-accent-primary hover:underline"
                            >
                                {categorySelectedCount === categoryAssets.length
                                    ? "Desmarcar todos"
                                    : "Selecionar todos"
                                }
                            </button>
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
                            {categoryAssets.map((asset) => {
                                const isSelected = selectedIds.includes(asset.id)
                                const isDisabled = !isSelected && selectedIds.length >= maxSelections

                                return (
                                    <div
                                        key={asset.id}
                                        className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all
                                            ${isSelected
                                                ? 'border-accent-primary ring-2 ring-accent-primary/20'
                                                : 'border-transparent hover:border-muted-foreground/30'
                                            }
                                            ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                                        `}
                                        onClick={() => !isDisabled && handleToggle(asset.id)}
                                    >
                                        <img
                                            src={asset.thumbnail_url || asset.file_url}
                                            alt={asset.title}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className={`absolute inset-0 ${isSelected ? 'bg-accent-primary/10' : ''}`} />
                                        <div className="absolute top-1 left-1">
                                            <Checkbox
                                                checked={isSelected}
                                                disabled={isDisabled}
                                                className="data-[state=checked]:bg-accent-primary data-[state=checked]:border-accent-primary"
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
