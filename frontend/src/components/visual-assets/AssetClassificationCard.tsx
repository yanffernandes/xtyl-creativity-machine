"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Check, X, Pencil, Sparkles, Loader2 } from "lucide-react"
import CategoryBadge, { CATEGORY_CONFIG } from "./CategoryBadge"
import type { AssetCategory, AssetClassificationResult } from "@/lib/api"

interface AssetClassificationCardProps {
    classification: AssetClassificationResult
    thumbnailUrl?: string
    assetName?: string
    onConfirm: (category: AssetCategory, tags: string[], description: string) => Promise<void>
    onCancel?: () => void
    isLoading?: boolean
}

const CATEGORIES: AssetCategory[] = ["Logo", "Pessoa", "Background", "Produto", "Referência", "Outro"]

export default function AssetClassificationCard({
    classification,
    thumbnailUrl,
    assetName,
    onConfirm,
    onCancel,
    isLoading = false
}: AssetClassificationCardProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [category, setCategory] = useState<AssetCategory>(classification.suggested_category)
    const [tags, setTags] = useState<string>(classification.suggested_tags.join(", "))
    const [description, setDescription] = useState<string>(classification.ai_description)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Reset state when classification changes (different asset)
    useEffect(() => {
        setCategory(classification.suggested_category)
        setTags(classification.suggested_tags.join(", "))
        setDescription(classification.ai_description)
        setIsEditing(false)
    }, [classification.asset_id])

    const handleConfirm = async () => {
        setIsSubmitting(true)
        try {
            const tagList = tags.split(",").map(t => t.trim()).filter(t => t.length > 0)
            await onConfirm(category, tagList, description)
        } finally {
            setIsSubmitting(false)
        }
    }

    const confidence = classification.confidence || 0.85
    const confidencePercent = Math.round(confidence * 100)

    return (
        <Card className="w-full">
            <div className="flex flex-col sm:flex-row p-4 gap-4">
                {/* Thumbnail */}
                {thumbnailUrl && (
                    <div className="sm:w-36 sm:min-w-[144px] sm:max-w-[144px] w-full h-36 flex-shrink-0 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                        <img
                            src={thumbnailUrl}
                            alt={assetName || "Asset"}
                            className="w-full h-full object-contain p-2"
                        />
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Sparkles className="h-4 w-4 text-accent-primary flex-shrink-0" />
                                <span className="text-sm font-medium">Classificação IA</span>
                                <Badge variant="secondary" className="text-xs">
                                    {confidencePercent}% confiança
                                </Badge>
                            </div>
                            {assetName && (
                                <p className="text-sm text-muted-foreground truncate" title={assetName}>
                                    {assetName}
                                </p>
                            )}
                        </div>
                        {!isEditing && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsEditing(true)}
                                disabled={isLoading || isSubmitting}
                                className="flex-shrink-0"
                            >
                                <Pencil className="h-4 w-4 mr-1" />
                                Editar
                            </Button>
                        )}
                    </div>

                    {isEditing ? (
                        /* Edit mode */
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="category" className="text-sm">Categoria</Label>
                                <Select
                                    value={category}
                                    onValueChange={(v) => setCategory(v as AssetCategory)}
                                >
                                    <SelectTrigger id="category" className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map((cat) => {
                                            const config = CATEGORY_CONFIG[cat]
                                            const Icon = config.icon
                                            return (
                                                <SelectItem key={cat} value={cat}>
                                                    <span className="flex items-center gap-2">
                                                        <Icon className="h-4 w-4" />
                                                        {config.label}
                                                    </span>
                                                </SelectItem>
                                            )
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="tags" className="text-sm">
                                    Tags (separadas por vírgula)
                                </Label>
                                <Input
                                    id="tags"
                                    value={tags}
                                    onChange={(e) => setTags(e.target.value)}
                                    placeholder="logo, tecnologia, moderno"
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="description" className="text-sm">Descrição</Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Descrição do asset..."
                                    className="mt-1 resize-none"
                                    rows={3}
                                />
                            </div>

                            <div className="flex gap-2 justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setIsEditing(false)
                                        setCategory(classification.suggested_category)
                                        setTags(classification.suggested_tags.join(", "))
                                        setDescription(classification.ai_description)
                                    }}
                                    disabled={isSubmitting}
                                >
                                    <X className="h-4 w-4 mr-1" />
                                    Cancelar
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleConfirm}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    ) : (
                                        <Check className="h-4 w-4 mr-1" />
                                    )}
                                    Salvar
                                </Button>
                            </div>
                        </div>
                    ) : (
                        /* View mode */
                        <div className="space-y-3">
                            <div>
                                <span className="text-xs text-muted-foreground">Categoria</span>
                                <div className="mt-1">
                                    <CategoryBadge category={category} size="md" />
                                </div>
                            </div>

                            {tags && tags.trim() && (
                                <div>
                                    <span className="text-xs text-muted-foreground">Tags</span>
                                    <div className="flex flex-wrap gap-1 mt-1 max-h-20 overflow-y-auto">
                                        {tags.split(",").filter(t => t.trim()).map((tag, idx) => (
                                            <Badge key={idx} variant="outline" className="text-xs">
                                                {tag.trim()}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {description && (
                                <div>
                                    <span className="text-xs text-muted-foreground">Descrição</span>
                                    <p className="text-sm mt-1 text-muted-foreground line-clamp-2">
                                        {description}
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-2 justify-end pt-2">
                                {onCancel && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onCancel}
                                        disabled={isLoading || isSubmitting}
                                    >
                                        <X className="h-4 w-4 mr-1" />
                                        Cancelar
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    onClick={handleConfirm}
                                    disabled={isLoading || isSubmitting}
                                >
                                    {(isLoading || isSubmitting) ? (
                                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    ) : (
                                        <Check className="h-4 w-4 mr-1" />
                                    )}
                                    Confirmar
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    )
}
