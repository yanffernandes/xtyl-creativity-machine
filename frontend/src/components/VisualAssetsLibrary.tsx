"use client"

import { useState, useEffect, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import api from "@/lib/api"
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
import { useToast } from "@/hooks/use-toast"
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
} from "lucide-react"

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
    folder_id?: string
    created_at: string
    updated_at?: string
}

interface VisualAssetsLibraryProps {
    projectId: string
}

const ASSET_TYPES = [
    { value: "logo", label: "Logo", icon: "🎨" },
    { value: "background", label: "Background", icon: "🖼️" },
    { value: "person", label: "Pessoa", icon: "👤" },
    { value: "reference", label: "Referência", icon: "📐" },
    { value: "other", label: "Outro", icon: "📁" },
]

export default function VisualAssetsLibrary({ projectId }: VisualAssetsLibraryProps) {
    const [assets, setAssets] = useState<VisualAsset[]>([])
    const [filteredAssets, setFilteredAssets] = useState<VisualAsset[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [selectedAssetType, setSelectedAssetType] = useState<string>("all")
    const [searchQuery, setSearchQuery] = useState("")
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [assetToDelete, setAssetToDelete] = useState<VisualAsset | null>(null)
    const [editingAsset, setEditingAsset] = useState<VisualAsset | null>(null)
    const [editTitle, setEditTitle] = useState("")
    const [editTags, setEditTags] = useState("")
    const [editAssetType, setEditAssetType] = useState("")
    const [totalAssets, setTotalAssets] = useState(0)
    const [currentOffset, setCurrentOffset] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const { toast } = useToast()

    const LIMIT = 20 // Load 20 assets at a time

    // Fetch assets
    const fetchAssets = async (offset = 0, append = false) => {
        try {
            if (append) {
                setIsLoadingMore(true)
            } else {
                setIsLoading(true)
            }
            const response = await api.get(`/projects/${projectId}/assets?limit=${LIMIT}&offset=${offset}`)
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

    useEffect(() => {
        fetchAssets()
    }, [projectId])

    // Filter assets
    useEffect(() => {
        let filtered = assets

        // Filter by asset type
        if (selectedAssetType !== "all") {
            filtered = filtered.filter((asset) => asset.asset_type === selectedAssetType)
        }

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(
                (asset) =>
                    asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    asset.asset_metadata?.tags?.some((tag) =>
                        tag.toLowerCase().includes(searchQuery.toLowerCase())
                    )
            )
        }

        setFilteredAssets(filtered)
    }, [assets, selectedAssetType, searchQuery])

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

                await api.post(`/projects/${projectId}/assets/upload`, formData, {
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
            await api.delete(`/projects/${projectId}/assets/${assetToDelete.id}`)

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
            const formData = new FormData()
            if (editTitle) formData.append("title", editTitle)
            if (editTags) formData.append("tags", editTags)
            if (editAssetType && editAssetType !== editingAsset.asset_type) {
                formData.append("asset_type", editAssetType)
            }

            await api.put(`/projects/${projectId}/assets/${editingAsset.id}`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            })

            toast({
                title: "Asset atualizado",
                description: "As informações do asset foram atualizadas",
            })

            setEditingAsset(null)
            setEditTitle("")
            setEditTags("")
            setEditAssetType("")
            fetchAssets()
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

        return (
            <Card className="overflow-hidden group hover:shadow-md transition-shadow">
                {/* Image with checkerboard background */}
                <div
                    className="aspect-square relative"
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
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDownload(asset)}
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                                setEditingAsset(asset)
                                setEditTitle(asset.title)
                                setEditTags(asset.asset_metadata?.tags?.join(", ") || "")
                                setEditAssetType(asset.asset_type)
                            }}
                        >
                            <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                                setAssetToDelete(asset)
                                setDeleteDialogOpen(true)
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Info */}
                <div className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium text-sm truncate flex-1">{asset.title}</h4>
                        <Badge variant="secondary" className="text-xs shrink-0">
                            {typeInfo?.icon} {typeInfo?.label}
                        </Badge>
                    </div>

                    {/* Metadata */}
                    <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center gap-1">
                            <FileImage className="h-3 w-3" />
                            {asset.asset_metadata?.dimensions} • {asset.asset_metadata?.format}
                        </div>
                        <div>{asset.asset_metadata?.file_size}</div>
                    </div>

                    {/* Tags */}
                    {asset.asset_metadata?.tags && asset.asset_metadata.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {asset.asset_metadata.tags.slice(0, 3).map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                    {tag}
                                </Badge>
                            ))}
                            {asset.asset_metadata.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                    +{asset.asset_metadata.tags.length - 3}
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
                    <h3 className="font-bold text-lg">Biblioteca de Assets Visuais</h3>
                    <p className="text-sm text-muted-foreground">
                        Logos, backgrounds e referências para usar nas gerações de imagem
                    </p>
                </div>
                <Button
                    onClick={() => document.getElementById("asset-upload-input")?.click()}
                    disabled={isUploading}
                    className="gap-2"
                >
                    {isUploading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Enviando...
                        </>
                    ) : (
                        <>
                            <Upload className="h-4 w-4" />
                            Fazer Upload
                        </>
                    )}
                </Button>
                <input
                    id="asset-upload-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                            handleUpload(Array.from(e.target.files), "other")
                        }
                    }}
                />
            </div>

            {/* Filters */}
            <div className="flex-shrink-0 flex gap-3 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome ou tags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
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
                        <h3 className="font-medium mb-1">Nenhum asset encontrado</h3>
                        <p className="text-sm text-muted-foreground">
                            {searchQuery || selectedAssetType !== "all"
                                ? "Tente ajustar os filtros"
                                : "Faça upload de imagens para começar"}
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
                            <Label htmlFor="edit-asset-type">Tipo de Asset</Label>
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
                        <div>
                            <Label htmlFor="edit-tags">Tags (separadas por vírgula)</Label>
                            <Input
                                id="edit-tags"
                                value={editTags}
                                onChange={(e) => setEditTags(e.target.value)}
                                placeholder="tecnologia, moderno, azul"
                            />
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
                        <AlertDialogTitle>Arquivar asset?</AlertDialogTitle>
                        <AlertDialogDescription>
                            O asset "{assetToDelete?.title}" será movido para o arquivo. Você pode
                            restaurá-lo posteriormente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive">
                            Arquivar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
