"use client"

import { useState, useCallback } from "react"
import { useTranslations } from "next-intl"
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
import { useToast } from "@/components/ui/use-toast"
import {
    Upload,
    Loader2,
    Sparkles,
    CheckCircle2,
    XCircle,
    Image as ImageIcon,
    ChevronLeft,
    ChevronRight,
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
    id: string
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
    const t = useTranslations("visualAssets")
    const tCommon = useTranslations("common")
    const [uploads, setUploads] = useState<UploadState[]>([])
    const [currentReviewIndex, setCurrentReviewIndex] = useState(0)
    const [isSavingClassification, setIsSavingClassification] = useState(false)
    const { toast } = useToast()

    const resetState = () => {
        setUploads([])
        setCurrentReviewIndex(0)
        setIsSavingClassification(false)
    }

    const handleClose = () => {
        const hasCompleted = uploads.some(u => u.status === "complete")
        if (hasCompleted) {
            onUploadComplete?.()
        }
        resetState()
        onOpenChange(false)
    }

    const updateUpload = (id: string, updates: Partial<UploadState>) => {
        setUploads(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u))
    }

    const handleUpload = async (file: File, uploadId: string) => {
        try {
            // Step 1: Upload the file
            updateUpload(uploadId, { progress: 20 })

            const formData = new FormData()
            formData.append("file", file)
            formData.append("asset_type", "other")
            formData.append("name", file.name)

            const uploadResponse = await api.post(
                `/projects/${projectId}/visual-assets/upload`,
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" }
                }
            )

            const assetId = uploadResponse.data.id
            const thumbnailUrl = uploadResponse.data.thumbnail_url

            updateUpload(uploadId, {
                status: "classifying",
                progress: 50,
                assetId,
                thumbnailUrl
            })

            // Step 2: Classify the asset with AI
            try {
                const classification = await classifyAsset(assetId)
                updateUpload(uploadId, {
                    status: "review",
                    progress: 75,
                    classification
                })
            } catch (classifyError: any) {
                console.warn("AI classification failed, allowing manual classification:", classifyError)
                updateUpload(uploadId, {
                    status: "review",
                    progress: 75,
                    classification: {
                        asset_id: assetId,
                        suggested_category: "Outro" as AssetCategory,
                        suggested_tags: [],
                        ai_description: "",
                        confidence: 0
                    }
                })
            }

        } catch (error: any) {
            console.error("Upload failed:", error)
            updateUpload(uploadId, {
                status: "error",
                error: error.response?.data?.detail || t("uploadFailed")
            })
        }
    }

    const currentReviewUpload = uploads.find((u, i) => u.status === "review" && i >= currentReviewIndex)
    const reviewUploads = uploads.filter(u => u.status === "review")
    const currentReviewPosition = reviewUploads.findIndex(u => u.id === currentReviewUpload?.id) + 1
    const totalReviews = reviewUploads.length

    const handleConfirmClassification = async (
        category: AssetCategory,
        tags: string[],
        description: string
    ) => {
        if (!currentReviewUpload?.assetId) return

        setIsSavingClassification(true)
        updateUpload(currentReviewUpload.id, { progress: 90 })

        try {
            await updateAssetMetadata(currentReviewUpload.assetId, {
                category,
                tags,
                ai_description: description
            })

            updateUpload(currentReviewUpload.id, {
                status: "complete",
                progress: 100
            })

            toast({
                title: t("assetClassified"),
                description: t("classifiedAs", { name: currentReviewUpload.file.name, category })
            })

        } catch (error: any) {
            console.error("Failed to save classification:", error)
            toast({
                title: t("classificationError"),
                description: error.response?.data?.detail || t("classificationSaveFailed"),
                variant: "destructive"
            })
            updateUpload(currentReviewUpload.id, {
                status: "complete",
                progress: 100
            })
        } finally {
            setIsSavingClassification(false)
        }
    }

    const handleSkipClassification = () => {
        if (!currentReviewUpload) return

        updateUpload(currentReviewUpload.id, {
            status: "complete",
            progress: 100
        })
        toast({
            title: t("uploadCompleted"),
            description: t("uploadedWithoutClassification", { name: currentReviewUpload.file.name })
        })
    }

    const handleSkipAll = () => {
        uploads.filter(u => u.status === "review").forEach(u => {
            updateUpload(u.id, {
                status: "complete",
                progress: 100
            })
        })
        toast({
            title: t("uploadsCompleted"),
            description: t("allWithoutClassification")
        })
    }

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return

        const newUploads: UploadState[] = acceptedFiles.map(file => ({
            id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            status: "uploading" as UploadStatus,
            progress: 0
        }))

        setUploads(prev => [...prev, ...newUploads])

        // Start all uploads in parallel
        newUploads.forEach(upload => {
            handleUpload(upload.file, upload.id)
        })
    }, [projectId])

    const isProcessing = uploads.some(u =>
        u.status === "uploading" || u.status === "classifying" || u.status === "saving"
    )
    const hasReviews = uploads.some(u => u.status === "review")
    const allComplete = uploads.length > 0 && uploads.every(u => u.status === "complete" || u.status === "error")

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: {
            "image/png": [".png"],
            "image/jpeg": [".jpg", ".jpeg"],
            "image/webp": [".webp"],
        },
        maxSize: 10 * 1024 * 1024, // 10MB
        onDrop,
        disabled: isProcessing
    })

    const getStatusMessage = (status: UploadStatus, error?: string) => {
        switch (status) {
            case "uploading":
                return t("uploading")
            case "classifying":
                return t("analyzing")
            case "review":
                return t("awaitingReview")
            case "saving":
                return t("saving")
            case "complete":
                return t("completed")
            case "error":
                return error || tCommon("error")
            default:
                return ""
        }
    }

    const getStatusIcon = (status: UploadStatus) => {
        switch (status) {
            case "uploading":
            case "classifying":
            case "saving":
                return <Loader2 className="h-4 w-4 animate-spin text-accent-primary" />
            case "review":
                return <Sparkles className="h-4 w-4 text-accent-primary" />
            case "complete":
                return <CheckCircle2 className="h-4 w-4 text-green-500" />
            case "error":
                return <XCircle className="h-4 w-4 text-destructive" />
            default:
                return null
        }
    }

    const completedCount = uploads.filter(u => u.status === "complete").length
    const errorCount = uploads.filter(u => u.status === "error").length
    const processingCount = uploads.filter(u => u.status === "uploading" || u.status === "classifying").length

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t("uploadTitle")}</DialogTitle>
                    <DialogDescription>
                        {t("uploadDescription")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Upload zone - always visible when not processing */}
                    {!isProcessing && !hasReviews && (
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
                                    {t("dropImages")}
                                </p>
                            ) : (
                                <>
                                    <p className="text-sm font-medium mb-1">
                                        {t("dragOrClick")}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {t("maxFileSize")}
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {/* Upload progress list */}
                    {uploads.length > 0 && !hasReviews && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>
                                    {processingCount > 0
                                        ? t("processingFiles", { count: processingCount })
                                        : t("completedWithErrors", { completed: completedCount, errors: errorCount })
                                    }
                                </span>
                                <span>{t("files", { count: uploads.length })}</span>
                            </div>

                            <div className="max-h-60 overflow-y-auto space-y-2">
                                {uploads.map(upload => (
                                    <div
                                        key={upload.id}
                                        className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
                                    >
                                        {upload.thumbnailUrl ? (
                                            <img
                                                src={upload.thumbnailUrl}
                                                alt={upload.file.name}
                                                className="w-10 h-10 object-cover rounded"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">
                                                {upload.file.name}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground">
                                                    {getStatusMessage(upload.status, upload.error)}
                                                </span>
                                                {(upload.status === "uploading" || upload.status === "classifying") && (
                                                    <Progress value={upload.progress} className="h-1 flex-1" />
                                                )}
                                            </div>
                                        </div>
                                        {getStatusIcon(upload.status)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Classification review - one at a time */}
                    {currentReviewUpload && currentReviewUpload.classification && (
                        <div className="space-y-3">
                            {totalReviews > 1 && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        {t("classifyingOf", { current: currentReviewPosition, total: totalReviews })}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleSkipAll}
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        {t("skipAll")}
                                    </Button>
                                </div>
                            )}

                            <AssetClassificationCard
                                classification={currentReviewUpload.classification}
                                thumbnailUrl={currentReviewUpload.thumbnailUrl}
                                assetName={currentReviewUpload.file.name}
                                onConfirm={handleConfirmClassification}
                                onCancel={handleSkipClassification}
                                isLoading={isSavingClassification}
                            />
                        </div>
                    )}

                    {/* All complete state */}
                    {allComplete && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-center gap-2 py-4 text-green-600">
                                <CheckCircle2 className="h-5 w-5" />
                                <span className="font-medium">
                                    {t("assetsUploaded", { count: completedCount })}
                                </span>
                            </div>
                            <div className="flex justify-end">
                                <Button onClick={handleClose}>
                                    {t("finish")}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
