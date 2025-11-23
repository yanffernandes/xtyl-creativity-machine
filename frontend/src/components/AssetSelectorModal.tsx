"use client"

import { useState, useEffect } from "react"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Search, Check, FileImage } from "lucide-react"

interface VisualAsset {
    id: string
    title: string
    asset_type: string
    file_url: string
    thumbnail_url: string
    asset_metadata: {
        dimensions: string
        width: number
        height: number
        file_size: string
        format: string
        tags: string[]
    }
}

interface AssetSelectorModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectId: string
    maxSelection?: number
    onConfirm: (selectedAssets: VisualAsset[]) => void
    initialSelection?: string[]  // Initial selected asset IDs
}

const ASSET_TYPES = [
    { value: "all", label: "Todos os tipos", icon: "📁" },
    { value: "logo", label: "Logo", icon: "🎨" },
    { value: "background", label: "Background", icon: "🖼️" },
    { value: "person", label: "Pessoa", icon: "👤" },
    { value: "reference", label: "Referência", icon: "📐" },
    { value: "other", label: "Outro", icon: "📦" },
]

export default function AssetSelectorModal({
    open,
    onOpenChange,
    projectId,
    maxSelection = 5,
    onConfirm,
    initialSelection = []
}: AssetSelectorModalProps) {
    const [assets, setAssets] = useState<VisualAsset[]>([])
    const [filteredAssets, setFilteredAssets] = useState<VisualAsset[]>([])
    const [selectedIds, setSelectedIds] = useState<string[]>(initialSelection)
    const [isLoading, setIsLoading] = useState(false)
    const [assetTypeFilter, setAssetTypeFilter] = useState("all")
    const [searchQuery, setSearchQuery] = useState("")
    const { toast } = useToast()

    // Fetch assets
    useEffect(() => {
        if (open && projectId) {
            fetchAssets()
        }
    }, [open, projectId])

    // Apply filters
    useEffect(() => {
        let filtered = assets

        if (assetTypeFilter !== "all") {
            filtered = filtered.filter((a) => a.asset_type === assetTypeFilter)
        }

        if (searchQuery) {
            filtered = filtered.filter(
                (a) =>
                    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    a.asset_metadata?.tags?.some((tag) =>
                        tag.toLowerCase().includes(searchQuery.toLowerCase())
                    )
            )
        }

        setFilteredAssets(filtered)
    }, [assets, assetTypeFilter, searchQuery])

    const fetchAssets = async () => {
        try {
            setIsLoading(true)
            const response = await api.get(`/projects/${projectId}/assets`)
            setAssets(response.data.assets)
            setFilteredAssets(response.data.assets)
        } catch (error: any) {
            console.error("Failed to fetch assets:", error)
            toast({
                title: "Erro ao carregar assets",
                description: error.response?.data?.detail || "Não foi possível carregar os assets",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const toggleSelection = (assetId: string) => {
        setSelectedIds((prev) => {
            if (prev.includes(assetId)) {
                return prev.filter((id) => id !== assetId)
            } else {
                if (prev.length >= maxSelection) {
                    toast({
                        title: "Limite atingido",
                        description: `Você pode selecionar no máximo ${maxSelection} assets`,
                        variant: "destructive",
                    })
                    return prev
                }
                return [...prev, assetId]
            }
        })
    }

    const handleConfirm = () => {
        const selectedAssets = assets.filter((a) => selectedIds.includes(a.id))
        onConfirm(selectedAssets)
        onOpenChange(false)
    }

    const handleCancel = () => {
        setSelectedIds(initialSelection)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Selecionar Assets Visuais</DialogTitle>
                    <DialogDescription>
                        Escolha até {maxSelection} imagens de referência para usar na geração.
                        {selectedIds.length > 0 && (
                            <span className="ml-2 font-medium text-primary">
                                {selectedIds.length} de {maxSelection} selecionados
                            </span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                {/* Filters */}
                <div className="flex gap-3 pb-4 border-b">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome ou tags..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Select value={assetTypeFilter} onValueChange={setAssetTypeFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtrar por tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            {ASSET_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                    {type.icon} {type.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Assets Grid */}
                <ScrollArea className="h-[400px] pr-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredAssets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <FileImage className="h-12 w-12 text-muted-foreground mb-3" />
                            <p className="text-sm text-muted-foreground">
                                {searchQuery || assetTypeFilter !== "all"
                                    ? "Nenhum asset encontrado com os filtros aplicados"
                                    : "Nenhum asset disponível. Vá para a aba 'Assets Visuais' para fazer upload."}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 gap-4">
                            {filteredAssets.map((asset) => {
                                const isSelected = selectedIds.includes(asset.id)
                                const typeInfo = ASSET_TYPES.find((t) => t.value === asset.asset_type)

                                return (
                                    <button
                                        key={asset.id}
                                        onClick={() => toggleSelection(asset.id)}
                                        className={`relative group rounded-lg border-2 overflow-hidden transition-all ${
                                            isSelected
                                                ? "border-primary ring-2 ring-primary ring-offset-2"
                                                : "border-transparent hover:border-muted-foreground/50"
                                        }`}
                                    >
                                        {/* Checkerboard background */}
                                        <div
                                            className="aspect-square"
                                            style={{
                                                backgroundImage: `
                                                    linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
                                                    linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
                                                    linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
                                                    linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)
                                                `,
                                                backgroundSize: '12px 12px',
                                                backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
                                                backgroundColor: '#ffffff'
                                            }}
                                        >
                                            <img
                                                src={asset.thumbnail_url || asset.file_url}
                                                alt={asset.title}
                                                className="w-full h-full object-contain p-2"
                                            />
                                        </div>

                                        {/* Selection indicator */}
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                                                <Check className="h-4 w-4" />
                                            </div>
                                        )}

                                        {/* Info overlay on hover */}
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-left opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="text-white text-xs font-medium truncate mb-1">
                                                {asset.title}
                                            </p>
                                            <Badge variant="secondary" className="text-xs">
                                                {typeInfo?.icon} {typeInfo?.label}
                                            </Badge>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </ScrollArea>

                <DialogFooter>
                    <Button variant="outline" onClick={handleCancel}>
                        Cancelar
                    </Button>
                    <Button onClick={handleConfirm} disabled={selectedIds.length === 0}>
                        Confirmar ({selectedIds.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
