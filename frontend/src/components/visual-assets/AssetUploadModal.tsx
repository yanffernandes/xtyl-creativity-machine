"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import {
    Upload,
    Loader2,
    Sparkles,
    CheckCircle2,
    XCircle,
    Image as ImageIcon,
} from "lucide-react"
import api, {
    classifyAsset,
    updateAssetMetadata,
    type AssetCategory,
    type AssetClassificationResult,
} from "@/lib/api"
import AssetClassificationCard from "./AssetClassificationCard"

interface AssetUploadModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectId: string
    onUploadComplete?: () => void
}

type UploadStatus = "idle" | "uploading" | "classifying" | "review" | "saving" | "complete" | "error"

interface UploadState {
    file: File
    status: UploadStatus
    progress: number
    assetId?: string
    thumbnailUrl?: string
    classification?: AssetClassificationResult
    error?: string
}

export default function AssetUploadModal({
    open,
    onOpenChange,
    projectId,
    onUploadComplete
}: AssetUploadModalProps) {
    const [uploadState, setUploadState] = useState<UploadState | null>(null)
    const [isSavingClassification, setIsSavingClassification] = useState(false)
    const { toast } = useToast()

    const resetState = () => {
        setUploadState(null)
        setIsSavingClassification(false)
    }

    const handleClose = () => {
        if (uploadState?.status === "complete") {
            onUploadComplete?.()
        }
        resetState()
        onOpenChange(false)
    }

    const handleUpload = async (file: File) => {
        // Initialize upload state
        setUploadState({
            file,
            status: "uploading",
            progress: 0
        })

        try {
            // Step 1: Upload the file
            setUploadState(prev => prev ? { ...prev, progress: 20 } : null)

            const formData = new FormData()
            formData.append("file", file)
            formData.append("asset_type", "other") // Default type, will be updated after classification
            formData.append("name", file.name)

            const uploadResponse = await api.post(
                `/projects/${projectId}/assets/upload`,
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" }
                }
            )

            const assetId = uploadResponse.data.id
            const thumbnailUrl = uploadResponse.data.thumbnail_url

            setUploadState(prev => prev ? {
                ...prev,
                status: "classifying",
                progress: 50,
                assetId,
                thumbnailUrl
            } : null)

            // Step 2: Classify the asset with AI
            try {
                const classification = await classifyAsset(assetId)
                setUploadState(prev => prev ? {
                    ...prev,
                    status: "review",
                    progress: 75,
                    classification
                } : null)
            } catch (classifyError: any) {
                // T056: Handle AI classification failure gracefully - allow manual classification
                console.warn("AI classification failed, allowing manual classification:", classifyError)
                toast({
                    title: "Classificação automática indisponível",
                    description: "Você pode classificar o asset manualmente abaixo.",
                    variant: "default"
                })
                // Set default classification for manual editing (must match AssetClassificationResult interface)
                setUploadState(prev => prev ? {
                    ...prev,
                    status: "review",
                    progress: 75,
                    classification: {
                        asset_id: assetId,
                        suggested_category: "Outro" as AssetCategory,
                        suggested_tags: [],
                        ai_description: "",
                        confidence: 0
                    }
                } : null)
            }

        } catch (error: any) {
            console.error("Upload failed:", error)
            setUploadState(prev => prev ? {
                ...prev,
                status: "error",
                error: error.response?.data?.detail || "Falha no upload do arquivo"
            } : null)
        }
    }

    const handleConfirmClassification = async (
        category: AssetCategory,
        tags: string[],
        description: string
    ) => {
        if (!uploadState?.assetId) return

        setIsSavingClassification(true)
        setUploadState(prev => prev ? {
            ...prev,
            progress: 90
        } : null)

        try {
            await updateAssetMetadata(uploadState.assetId, {
                category,
                tags,
                ai_description: description
            })

            setUploadState(prev => prev ? {
                ...prev,
                status: "complete",
                progress: 100
            } : null)

            toast({
                title: "Asset classificado!",
                description: `O asset foi classificado como "${category}" com sucesso.`
            })

        } catch (error: any) {
            console.error("Failed to save classification:", error)
            toast({
                title: "Erro ao salvar classificação",
                description: error.response?.data?.detail || "Não foi possível salvar a classificação",
                variant: "destructive"
            })
            // Still mark as complete since the upload succeeded
            setUploadState(prev => prev ? {
                ...prev,
                status: "complete",
                progress: 100
            } : null)
        } finally {
            setIsSavingClassification(false)
        }
    }

    const handleSkipClassification = () => {
        setUploadState(prev => prev ? {
            ...prev,
            status: "complete",
            progress: 100
        } : null)
        toast({
            title: "Upload concluído",
            description: "O asset foi enviado sem classificação automática."
        })
    }

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            handleUpload(acceptedFiles[0])
        }
    }, [projectId])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: {
            "image/png": [".png"],
            "image/jpeg": [".jpg", ".jpeg"],
            "image/webp": [".webp"],
        },
        maxFiles: 1,
        maxSize: 10 * 1024 * 1024, // 10MB
        onDrop,
        disabled: uploadState !== null && uploadState.status !== "complete" && uploadState.status !== "error"
    })

    const getStatusMessage = () => {
        switch (uploadState?.status) {
            case "uploading":
                return "Enviando arquivo..."
            case "classifying":
                return "Analisando imagem com IA..."
            case "review":
                return "Revise a classificação"
            case "saving":
                return "Salvando classificação..."
            case "complete":
                return "Concluído!"
            case "error":
                return uploadState.error || "Erro no processamento"
            default:
                return ""
        }
    }

    const StatusIcon = () => {
        switch (uploadState?.status) {
            case "uploading":
            case "classifying":
            case "saving":
                return <Loader2 className="h-5 w-5 animate-spin text-accent-primary" />
            case "review":
                return <Sparkles className="h-5 w-5 text-accent-primary" />
            case "complete":
                return <CheckCircle2 className="h-5 w-5 text-green-500" />
            case "error":
                return <XCircle className="h-5 w-5 text-destructive" />
            default:
                return null
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Upload de Asset Visual</DialogTitle>
                    <DialogDescription>
                        Envie uma imagem e a IA irá classificá-la automaticamente
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Upload zone or status */}
                    {!uploadState || uploadState.status === "error" ? (
                        <>
                            <div
                                {...getRootProps()}
                                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                                    isDragActive
                                        ? "border-primary bg-primary/5"
                                        : "border-muted-foreground/25 hover:border-primary/50"
                                }`}
                            >
                                <input {...getInputProps()} />
                                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                                {isDragActive ? (
                                    <p className="text-sm text-muted-foreground">
                                        Solte a imagem aqui...
                                    </p>
                                ) : (
                                    <>
                                        <p className="text-sm font-medium mb-1">
                                            Arraste uma imagem ou clique para selecionar
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            PNG, JPEG, WebP (máx 10MB)
                                        </p>
                                    </>
                                )}
                            </div>

                            {uploadState?.status === "error" && (
                                <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-destructive text-sm">
                                    <XCircle className="h-4 w-4 flex-shrink-0" />
                                    <span>{uploadState.error}</span>
                                </div>
                            )}
                        </>
                    ) : uploadState.status === "review" && uploadState.classification ? (
                        /* Classification review */
                        <AssetClassificationCard
                            classification={uploadState.classification}
                            thumbnailUrl={uploadState.thumbnailUrl}
                            assetName={uploadState.file.name}
                            onConfirm={handleConfirmClassification}
                            onCancel={handleSkipClassification}
                            isLoading={isSavingClassification}
                        />
                    ) : (
                        /* Progress display */
                        <div className="space-y-4 py-4">
                            {/* File preview */}
                            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                                {uploadState.thumbnailUrl ? (
                                    <img
                                        src={uploadState.thumbnailUrl}
                                        alt={uploadState.file.name}
                                        className="w-12 h-12 object-cover rounded"
                                    />
                                ) : (
                                    <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">
                                        {uploadState.file.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {(uploadState.file.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                                <StatusIcon />
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{getStatusMessage()}</span>
                                    <span className="font-medium">{uploadState.progress}%</span>
                                </div>
                                <Progress value={uploadState.progress} />
                            </div>

                            {/* Complete state */}
                            {uploadState.status === "complete" && (
                                <div className="flex justify-end">
                                    <Button onClick={handleClose}>
                                        Concluir
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
