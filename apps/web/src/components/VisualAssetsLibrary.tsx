"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslations } from "next-intl"
import { useDropzone } from "react-dropzone"
import api, {
    classifyAsset,
    updateAssetMetadata,
    getVisualAssetsSummary,
    type AssetCategory,
    type VisualAssetsSummary,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import {
    Upload,
    Image as ImageIcon,
    MoreVertical,
    Trash2,
    Edit2,
    Download,
    Tag,
    Filter,
    Search,
    Loader2,
    X,
    FileImage,
    Sparkles,
    RefreshCw,
    CheckSquare,
    Square,
    FolderInput,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import CategoryBadge from "./visual-assets/CategoryBadge"
import AssetUploadModal from "./visual-assets/AssetUploadModal"

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
        color_mode: string
        tags: string[]
    }
    // Smart Visual Assets fields (Feature 011)
    asset_category?: AssetCategory
    asset_tags?: string[]
    ai_description?: string
    folder_id?: string
    created_at: string
    updated_at?: string
}

interface VisualAssetsLibraryProps {
    projectId: string
}

// Legacy asset types (keeping for backwards compatibility)
const ASSET_TYPES = [
    { value: "logo", label: "Logo", icon: "🎨" },
    { value: "background", label: "Background", icon: "🖼️" },
    { value: "person", label: "Pessoa", icon: "👤" },
    { value: "reference", label: "Referência", icon: "📐" },
    { value: "other", label: "Outro", icon: "📁" },
]

// Smart category filters (Feature 011)
const SMART_CATEGORIES: { value: AssetCategory | "all" | "unclassified"; label: string }[] = [
    { value: "all", label: "Todas categorias" },
    { value: "Logo", label: "Logo" },
    { value: "Pessoa", label: "Pessoa" },
    { value: "Background", label: "Background" },
    { value: "Produto", label: "Produto" },
    { value: "Referência", label: "Referência" },
    { value: "Outro", label: "Outro" },
    { value: "unclassified", label: "Não classificados" },
]

export default function VisualAssetsLibrary({ projectId }: VisualAssetsLibraryProps) {
    const [assets, setAssets] = useState<VisualAsset[]>([])
    const [filteredAssets, setFilteredAssets] = useState<VisualAsset[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [selectedAssetType, setSelectedAssetType] = useState<string>("all")
    const [selectedCategory, setSelectedCategory] = useState<string>("all")
    const [searchQuery, setSearchQuery] = useState("")
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [assetToDelete, setAssetToDelete] = useState<VisualAsset | null>(null)
    const [editingAsset, setEditingAsset] = useState<VisualAsset | null>(null)
    const [editTitle, setEditTitle] = useState("")
    const [editTags, setEditTags] = useState("")
    const [editAssetType, setEditAssetType] = useState("")
    const [editCategory, setEditCategory] = useState<AssetCategory | "">("")
    const [totalAssets, setTotalAssets] = useState(0)
    const [currentOffset, setCurrentOffset] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    // Feature 011: Smart Visual Assets
    const [uploadModalOpen, setUploadModalOpen] = useState(false)
    const [categorySummary, setCategorySummary] = useState<VisualAssetsSummary | null>(null)
    const [classifyingAssetId, setClassifyingAssetId] = useState<string | null>(null)

    // Bulk selection state
    const [selectionMode, setSelectionMode] = useState(false)
    const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set())
    const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false)
    const [bulkActionType, setBulkActionType] = useState<"delete" | "changeCategory" | null>(null)
    const [bulkNewCategory, setBulkNewCategory] = useState<AssetCategory | "">("")
    const [isBulkProcessing, setIsBulkProcessing] = useState(false)

    const { toast } = useToast()
    const t = useTranslations("visualAssets")
    const tCommon = useTranslations("common")

    const LIMIT = 20 // Load 20 assets at a time

    // Fetch assets
    const fetchAssets = async (offset = 0, append = false) => {
        try {
            if (append) {
                setIsLoadingMore(true)
            } else {
                setIsLoading(true)
            }
            const response = await api.get(`/projects/${projectId}/visual-assets?limit=${LIMIT}&offset=${offset}`)
            const newAssets = response.data.assets

            setTotalAssets(response.data.total)
            setCurrentOffset(offset + newAssets.length)
            setHasMore(offset + newAssets.length < response.data.total)

            if (append) {
                setAssets(prev => [...prev, ...newAssets])
                setFilteredAssets(prev => [...prev, ...newAssets])
            } else {
                setAssets(newAssets)
                setFilteredAssets(newAssets)
            }
        } catch (error: any) {
            console.error("Failed to fetch assets:", error)
            toast({
                title: "Erro ao carregar assets",
                description: error.response?.data?.detail || "Não foi possível carregar os assets visuais",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
            setIsLoadingMore(false)
        }
    }

    const loadMoreAssets = () => {
        fetchAssets(currentOffset, true)
    }

    // Fetch category summary for smart filtering
    const fetchCategorySummary = async () => {
        try {
            const summary = await getVisualAssetsSummary(projectId)
            setCategorySummary(summary)
        } catch (error) {
            console.error("Failed to fetch category summary:", error)
        }
    }

    // Classify an asset with AI
    const handleClassifyAsset = async (assetId: string) => {
        setClassifyingAssetId(assetId)
        try {
            const result = await classifyAsset(assetId, true) // force reclassify

            // Update the asset in local state
            await updateAssetMetadata(assetId, {
                category: result.suggested_category,
                tags: result.suggested_tags,
                ai_description: result.ai_description
            })

            // Optimistic update: immediately update local state
            setAssets(prev => prev.map(asset =>
                asset.id === assetId
                    ? {
                        ...asset,
                        asset_category: result.suggested_category,
                        asset_tags: result.suggested_tags,
                        ai_description: result.ai_description
                    }
                    : asset
            ))

            toast({
                title: "Asset classificado!",
                description: `Classificado como "${result.suggested_category}"`
            })

            // Refresh category summary
            fetchCategorySummary()
        } catch (error: any) {
            console.error("Classification failed:", error)
            toast({
                title: "Erro na classificação",
                description: error.response?.data?.detail || "Não foi possível classificar o asset",
                variant: "destructive"
            })
        } finally {
            setClassifyingAssetId(null)
        }
    }

    useEffect(() => {
        fetchAssets()
        fetchCategorySummary()
    }, [projectId])

    // Filter assets
    useEffect(() => {
        let filtered = assets

        // Filter by asset type (legacy)
        if (selectedAssetType !== "all") {
            filtered = filtered.filter((asset) => asset.asset_type === selectedAssetType)
        }

        // Filter by smart category (Feature 011)
        if (selectedCategory !== "all") {
            if (selectedCategory === "unclassified") {
                filtered = filtered.filter((asset) => !asset.asset_category)
            } else {
                filtered = filtered.filter((asset) => asset.asset_category === selectedCategory)
            }
        }

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(
                (asset) =>
                    asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    asset.asset_metadata?.tags?.some((tag) =>
                        tag.toLowerCase().includes(searchQuery.toLowerCase())
                    ) ||
                    asset.asset_tags?.some((tag) =>
                        tag.toLowerCase().includes(searchQuery.toLowerCase())
                    ) ||
                    asset.ai_description?.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }

        setFilteredAssets(filtered)
    }, [assets, selectedAssetType, selectedCategory, searchQuery])

    // Upload asset
    const handleUpload = async (files: File[], assetType: string) => {
        if (!files || files.length === 0) return

        setIsUploading(true)

        try {
            for (const file of files) {
                const formData = new FormData()
                formData.append("file", file)
                formData.append("asset_type", assetType)
                formData.append("name", file.name)

                await api.post(`/projects/${projectId}/visual-assets/upload`, formData, {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                })
            }

            toast({
                title: "Upload concluído!",
                description: `${files.length} asset(s) enviado(s) com sucesso`,
            })

            fetchAssets()
        } catch (error: any) {
            console.error("Failed to upload asset:", error)
            toast({
                title: "Erro no upload",
                description: error.response?.data?.detail || "Não foi possível fazer upload do asset",
                variant: "destructive",
            })
        } finally {
            setIsUploading(false)
        }
    }

    // Delete asset
    const handleDelete = async () => {
        if (!assetToDelete) return

        try {
            await api.delete(`/visual-assets/${assetToDelete.id}`)

            toast({
                title: "Asset arquivado",
                description: "O asset foi arquivado com sucesso",
            })

            setAssets(assets.filter((a) => a.id !== assetToDelete.id))
            setDeleteDialogOpen(false)
            setAssetToDelete(null)
        } catch (error: any) {
            console.error("Failed to delete asset:", error)
            toast({
                title: "Erro ao arquivar",
                description: error.response?.data?.detail || "Não foi possível arquivar o asset",
                variant: "destructive",
            })
        }
    }

    // Update asset
    const handleUpdate = async () => {
        if (!editingAsset) return

        try {
            // Update basic info (title, asset_type, legacy tags)
            const formData = new FormData()
            if (editTitle) formData.append("title", editTitle)
            if (editAssetType && editAssetType !== editingAsset.asset_type) {
                formData.append("asset_type", editAssetType)
            }

            await api.put(`/visual-assets/${editingAsset.id}`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            })

            // Update classification metadata (category and smart tags)
            const tagList = editTags.split(",").map(t => t.trim()).filter(t => t.length > 0)
            await updateAssetMetadata(editingAsset.id, {
                category: editCategory as AssetCategory || undefined,
                tags: tagList,
                ai_description: editingAsset.ai_description
            })

            // Optimistic update: immediately update local state
            setAssets(prev => prev.map(asset =>
                asset.id === editingAsset.id
                    ? {
                        ...asset,
                        title: editTitle || asset.title,
                        asset_type: editAssetType || asset.asset_type,
                        asset_category: editCategory as AssetCategory || asset.asset_category,
                        asset_tags: tagList
                    }
                    : asset
            ))

            toast({
                title: "Asset atualizado",
                description: "As informações do asset foram atualizadas",
            })

            setEditingAsset(null)
            setEditTitle("")
            setEditTags("")
            setEditAssetType("")
            setEditCategory("")
            fetchCategorySummary()
        } catch (error: any) {
            console.error("Failed to update asset:", error)
            toast({
                title: "Erro ao atualizar",
                description: error.response?.data?.detail || "Não foi possível atualizar o asset",
                variant: "destructive",
            })
        }
    }

    // Download asset
    const handleDownload = (asset: VisualAsset) => {
        window.open(asset.file_url, "_blank")
    }

    // ============================================================================
    // BULK SELECTION & ACTIONS
    // ============================================================================

    // Toggle selection mode
    const toggleSelectionMode = () => {
        setSelectionMode(!selectionMode)
        setSelectedAssetIds(new Set())
    }

    // Toggle asset selection
    const toggleAssetSelection = (assetId: string) => {
        const newSelected = new Set(selectedAssetIds)
        if (newSelected.has(assetId)) {
            newSelected.delete(assetId)
        } else {
            newSelected.add(assetId)
        }
        setSelectedAssetIds(newSelected)
    }

    // Select all visible assets
    const selectAllAssets = () => {
        const allIds = new Set(filteredAssets.map(a => a.id))
        setSelectedAssetIds(allIds)
    }

    // Deselect all
    const deselectAllAssets = () => {
        setSelectedAssetIds(new Set())
    }

    // Open bulk action dialog
    const openBulkAction = (action: "delete" | "changeCategory") => {
        setBulkActionType(action)
        setBulkActionDialogOpen(true)
    }

    // Execute bulk delete
    const executeBulkDelete = async () => {
        if (selectedAssetIds.size === 0) return

        setIsBulkProcessing(true)
        let successCount = 0
        let failCount = 0

        for (const assetId of selectedAssetIds) {
            try {
                await api.delete(`/visual-assets/${assetId}`)
                successCount++
            } catch (error) {
                console.error(`Failed to delete asset ${assetId}:`, error)
                failCount++
            }
        }

        // Update local state
        setAssets(prev => prev.filter(a => !selectedAssetIds.has(a.id)))
        setSelectedAssetIds(new Set())
        setSelectionMode(false)
        setBulkActionDialogOpen(false)
        setIsBulkProcessing(false)

        toast({
            title: "Exclusão em massa concluída",
            description: `${successCount} asset(s) arquivado(s)${failCount > 0 ? `, ${failCount} falha(s)` : ""}`,
            variant: failCount > 0 ? "destructive" : "default",
        })

        fetchCategorySummary()
    }

    // Execute bulk category change
    const executeBulkCategoryChange = async () => {
        if (selectedAssetIds.size === 0 || !bulkNewCategory) return

        setIsBulkProcessing(true)
        let successCount = 0
        let failCount = 0

        for (const assetId of selectedAssetIds) {
            try {
                await updateAssetMetadata(assetId, {
                    category: bulkNewCategory as AssetCategory,
                })
                successCount++
            } catch (error) {
                console.error(`Failed to update asset ${assetId}:`, error)
                failCount++
            }
        }

        // Update local state
        setAssets(prev => prev.map(asset =>
            selectedAssetIds.has(asset.id)
                ? { ...asset, asset_category: bulkNewCategory as AssetCategory }
                : asset
        ))

        setSelectedAssetIds(new Set())
        setSelectionMode(false)
        setBulkActionDialogOpen(false)
        setBulkNewCategory("")
        setIsBulkProcessing(false)

        toast({
            title: "Categorias atualizadas",
            description: `${successCount} asset(s) movido(s) para "${bulkNewCategory}"${failCount > 0 ? `, ${failCount} falha(s)` : ""}`,
            variant: failCount > 0 ? "destructive" : "default",
        })

        fetchCategorySummary()
    }

    // Selected count for UI
    const selectedCount = selectedAssetIds.size
    const allSelected = filteredAssets.length > 0 && selectedAssetIds.size === filteredAssets.length

    // Asset type filter component
    const AssetTypeFilter = () => (
        <Select value={selectedAssetType} onValueChange={setSelectedAssetType}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {ASSET_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                        {type.icon} {type.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )

    // Upload dropzone component
    const UploadZone = ({ assetType }: { assetType: string }) => {
        const { getRootProps, getInputProps, isDragActive } = useDropzone({
            accept: {
                "image/png": [".png"],
                "image/jpeg": [".jpg", ".jpeg"],
                "image/webp": [".webp"],
            },
            onDrop: (files) => handleUpload(files, assetType),
            disabled: isUploading,
        })

        const typeLabel = ASSET_TYPES.find((t) => t.value === assetType)

        return (
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:border-primary/50"
                } ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
                <input {...getInputProps()} />
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                {isUploading ? (
                    <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <p className="text-sm text-muted-foreground">Enviando...</p>
                    </div>
                ) : isDragActive ? (
                    <p className="text-sm text-muted-foreground">Solte as imagens aqui...</p>
                ) : (
                    <>
                        <p className="text-sm font-medium mb-1">
                            Arraste imagens ou clique para selecionar
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {typeLabel?.icon} {typeLabel?.label} • PNG, JPEG, WebP (máx 20MB)
                        </p>
                    </>
                )}
            </div>
        )
    }

    // Asset card component
    const AssetCard = ({ asset }: { asset: VisualAsset }) => {
        const typeInfo = ASSET_TYPES.find((t) => t.value === asset.asset_type)
        const isClassifying = classifyingAssetId === asset.id
        const isClassified = !!asset.asset_category
        const isSelected = selectedAssetIds.has(asset.id)

        // Use smart tags (asset_tags) if available, fallback to legacy metadata tags
        const displayTags = asset.asset_tags?.length ? asset.asset_tags : asset.asset_metadata?.tags

        return (
            <Card
                className={`overflow-hidden group hover:shadow-md transition-all cursor-pointer ${
                    isSelected ? "ring-2 ring-primary ring-offset-2" : ""
                }`}
                onClick={selectionMode ? () => toggleAssetSelection(asset.id) : undefined}
            >
                {/* Image with checkerboard background */}
                <div
                    className="aspect-square relative overflow-hidden"
                    style={{
                        backgroundImage: `
                            linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
                            linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
                            linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
                            linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)
                        `,
                        backgroundSize: '20px 20px',
                        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                        backgroundColor: '#ffffff'
                    }}
                >
                    <img
                        src={asset.thumbnail_url || asset.file_url}
                        alt={asset.title}
                        className="w-full h-full object-contain p-2"
                    />

                    {/* Selection checkbox */}
                    {selectionMode && (
                        <div className="absolute top-2 left-2 z-10">
                            <div
                                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                                    isSelected
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : "bg-white/80 border-gray-300 hover:border-primary"
                                }`}
                            >
                                {isSelected && <CheckSquare className="h-4 w-4" />}
                            </div>
                        </div>
                    )}

                    {/* Classifying overlay */}
                    {isClassifying && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-white mb-2" />
                            <span className="text-white text-sm">Classificando...</span>
                        </div>
                    )}
                    {/* Overlay on hover (only when not in selection mode) */}
                    {!isClassifying && !selectionMode && (
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={(e) => { e.stopPropagation(); handleDownload(asset) }}
                                    title="Download"
                                >
                                    <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={(e) => { e.stopPropagation(); handleClassifyAsset(asset.id) }}
                                    title={isClassified ? "Reclassificar com IA" : "Classificar com IA"}
                                >
                                    <Sparkles className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setEditingAsset(asset)
                                        setEditTitle(asset.title)
                                        setEditTags(asset.asset_tags?.join(", ") || displayTags?.join(", ") || "")
                                        setEditAssetType(asset.asset_type)
                                        setEditCategory(asset.asset_category || "")
                                    }}
                                    title="Editar"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setAssetToDelete(asset)
                                        setDeleteDialogOpen(true)
                                    }}
                                    title="Arquivar"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium text-sm truncate flex-1">{asset.title}</h4>
                        {/* Show smart category badge (Feature 011) */}
                        <CategoryBadge category={asset.asset_category} size="sm" showIcon={false} />
                    </div>

                    {/* AI Description preview */}
                    {asset.ai_description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {asset.ai_description}
                        </p>
                    )}

                    {/* Metadata */}
                    <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center gap-1">
                            <FileImage className="h-3 w-3" />
                            {asset.asset_metadata?.dimensions} • {asset.asset_metadata?.format}
                        </div>
                        <div>{asset.asset_metadata?.file_size}</div>
                    </div>

                    {/* Tags */}
                    {displayTags && displayTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {displayTags.slice(0, 3).map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                    {tag}
                                </Badge>
                            ))}
                            {displayTags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                    +{displayTags.length - 3}
                                </Badge>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        )
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header with Upload Button */}
            <div className="flex-shrink-0 flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-bold text-lg">{t("title")}</h3>
                    <p className="text-sm text-muted-foreground">
                        {t("subtitle")}
                    </p>
                    {/* Category summary */}
                    {categorySummary && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                            {Object.entries(categorySummary.by_category)
                                .filter(([_, count]) => count > 0)
                                .map(([cat, count]) => (
                                    <Badge key={cat} variant="outline" className="text-xs">
                                        {cat}: {count}
                                    </Badge>
                                ))}
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    {/* Selection mode toggle */}
                    <Button
                        variant={selectionMode ? "secondary" : "outline"}
                        onClick={toggleSelectionMode}
                        className="gap-2"
                    >
                        <CheckSquare className="h-4 w-4" />
                        {selectionMode ? "Cancelar seleção" : "Selecionar"}
                    </Button>

                    {/* Smart Upload button with AI classification (Feature 011) */}
                    <Button
                        onClick={() => setUploadModalOpen(true)}
                        className="gap-2"
                        disabled={selectionMode}
                    >
                        <Sparkles className="h-4 w-4" />
                        Upload com IA
                    </Button>
                </div>
            </div>

            {/* Bulk action bar (appears when in selection mode with items selected) */}
            {selectionMode && (
                <div className="flex-shrink-0 flex items-center justify-between bg-muted/50 rounded-lg p-3 mb-4 border">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">
                            {selectedCount} {selectedCount === 1 ? "asset selecionado" : "assets selecionados"}
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={allSelected ? deselectAllAssets : selectAllAssets}
                            >
                                {allSelected ? "Desmarcar todos" : "Selecionar todos"}
                            </Button>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openBulkAction("changeCategory")}
                            disabled={selectedCount === 0}
                            className="gap-2"
                        >
                            <FolderInput className="h-4 w-4" />
                            Mover categoria
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openBulkAction("delete")}
                            disabled={selectedCount === 0}
                            className="gap-2"
                        >
                            <Trash2 className="h-4 w-4" />
                            Arquivar ({selectedCount})
                        </Button>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex-shrink-0 flex gap-3 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome, tags ou descrição..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                {/* Smart Category Filter (Feature 011) */}
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Categoria IA" />
                    </SelectTrigger>
                    <SelectContent>
                        {SMART_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {/* Legacy Asset Type Filter */}
                <AssetTypeFilter />
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto">
                {/* Assets grid */}
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : filteredAssets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground mb-3" />
                        <h3 className="font-medium mb-1">{t("noAssets")}</h3>
                        <p className="text-sm text-muted-foreground">
                            {t("noAssetsDescription")}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="mb-4">
                            <p className="text-sm text-muted-foreground">
                                Mostrando {filteredAssets.length} de {totalAssets} assets
                            </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-6">
                            {filteredAssets.map((asset) => (
                                <AssetCard key={asset.id} asset={asset} />
                            ))}
                        </div>
                        {hasMore && !searchQuery && selectedAssetType === "all" && (
                            <div className="flex justify-center pb-6">
                                <Button
                                    onClick={loadMoreAssets}
                                    disabled={isLoadingMore}
                                    variant="outline"
                                    size="lg"
                                >
                                    {isLoadingMore ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Carregando...
                                        </>
                                    ) : (
                                        `Carregar Mais (${totalAssets - filteredAssets.length} restantes)`
                                    )}
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Edit Dialog */}
            <AlertDialog open={!!editingAsset} onOpenChange={() => setEditingAsset(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Editar Asset</AlertDialogTitle>
                        <AlertDialogDescription>
                            Atualize as informações do asset visual
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="edit-title">Título</Label>
                            <Input
                                id="edit-title"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                placeholder="Nome do asset"
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-category">Categoria</Label>
                            <Select value={editCategory} onValueChange={(v) => setEditCategory(v as AssetCategory)}>
                                <SelectTrigger id="edit-category">
                                    <SelectValue placeholder="Selecione uma categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SMART_CATEGORIES.filter(c => c.value !== 'all' && c.value !== 'unclassified').map((cat) => (
                                        <SelectItem key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="edit-tags">Tags (separadas por vírgula)</Label>
                            <Input
                                id="edit-tags"
                                value={editTags}
                                onChange={(e) => setEditTags(e.target.value)}
                                placeholder="tecnologia, moderno, azul"
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-asset-type">Tipo de Asset (legado)</Label>
                            <Select value={editAssetType} onValueChange={setEditAssetType}>
                                <SelectTrigger id="edit-asset-type">
                                    <SelectValue placeholder="Selecione um tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ASSET_TYPES.filter(t => t.value !== 'all').map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.icon} {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setEditingAsset(null)}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleUpdate}>Salvar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("deleteConfirm")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("deleteDescription")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
                            {tCommon("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive">
                            {tCommon("delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Smart Upload Modal with AI Classification (Feature 011) */}
            <AssetUploadModal
                open={uploadModalOpen}
                onOpenChange={setUploadModalOpen}
                projectId={projectId}
                onUploadComplete={() => {
                    fetchAssets()
                    fetchCategorySummary()
                }}
            />

            {/* Bulk Action Dialog */}
            <AlertDialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {bulkActionType === "delete"
                                ? `Arquivar ${selectedCount} assets?`
                                : `Mover ${selectedCount} assets para outra categoria`
                            }
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {bulkActionType === "delete"
                                ? "Os assets selecionados serão arquivados. Esta ação pode ser desfeita pela administração."
                                : "Selecione a nova categoria para os assets selecionados."
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {/* Category selector for move action */}
                    {bulkActionType === "changeCategory" && (
                        <div className="py-4">
                            <Label htmlFor="bulk-category">Nova Categoria</Label>
                            <Select value={bulkNewCategory} onValueChange={(v) => setBulkNewCategory(v as AssetCategory)}>
                                <SelectTrigger id="bulk-category" className="mt-2">
                                    <SelectValue placeholder="Selecione uma categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SMART_CATEGORIES.filter(c => c.value !== 'all' && c.value !== 'unclassified').map((cat) => (
                                        <SelectItem key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isBulkProcessing}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={bulkActionType === "delete" ? executeBulkDelete : executeBulkCategoryChange}
                            disabled={isBulkProcessing || (bulkActionType === "changeCategory" && !bulkNewCategory)}
                            className={bulkActionType === "delete" ? "bg-destructive" : ""}
                        >
                            {isBulkProcessing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                bulkActionType === "delete" ? "Arquivar" : "Mover"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
