"use client"

import { useState, useEffect } from "react"
import api from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    FileText,
    FolderPlus,
    Edit3,
    Search,
    Trash2,
    Move,
    ChevronDown,
    ChevronUp,
    Check,
    X,
    Loader2,
    Copy,
    Globe,
    Pencil,
    FolderOpen,
    LayoutDashboard,
    StopCircle,
    Image,
    Eye,
    Sparkles,
    Images
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ToolExecutionCardProps {
    id: string
    tool: string
    args?: Record<string, any>
    result?: any
    status: "pending" | "executing" | "completed" | "error"
    duration?: number
    timestamp?: string
    index?: number
    total?: number
}

// Map tool names to icons
const TOOL_ICONS: Record<string, any> = {
    read_document: FileText,
    edit_document: Edit3,
    create_document: FileText,
    create_folder: FolderPlus,
    list_documents: FileText,
    list_folders: FolderPlus,
    list_boards: LayoutDashboard,
    create_board: LayoutDashboard,
    search_documents: Search,
    move_file: Move,
    move_file_to_board: Move,
    move_folder: Move,
    move_board: Move,
    delete_file: Trash2,
    delete_folder: Trash2,
    delete_board: Trash2,
    web_search: Globe,
    rename_document: Pencil,
    rename_folder: Pencil,
    rename_board: Pencil,
    get_folder_contents: FolderOpen,
    generate_image: Image,
    attach_image_to_document: Image,
    // Image Analysis & Refinement Tools (Feature 023)
    list_document_images: Images,
    analyze_image: Eye,
    analyze_document_images: Eye,
    refine_image: Sparkles
}

// Map tool names to friendly labels
const TOOL_LABELS: Record<string, string> = {
    read_document: "Ler Documento",
    edit_document: "Editar Documento",
    create_document: "Criar Documento",
    create_folder: "Criar Pasta",
    list_documents: "Listar Documentos",
    list_folders: "Listar Pastas",
    list_boards: "Listar Quadros",
    create_board: "Criar Quadro",
    search_documents: "Buscar Documentos",
    move_file: "Mover Arquivo",
    move_file_to_board: "Mover Arquivo para Quadro",
    move_folder: "Mover Pasta",
    move_board: "Mover Quadro",
    delete_file: "Deletar Arquivo",
    delete_folder: "Deletar Pasta",
    delete_board: "Deletar Quadro",
    web_search: "Buscar na Web",
    rename_document: "Renomear Documento",
    rename_folder: "Renomear Pasta",
    rename_board: "Renomear Quadro",
    get_folder_contents: "Listar Conteúdo da Pasta",
    generate_image: "Gerar Imagem",
    attach_image_to_document: "Anexar Imagem",
    // Image Analysis & Refinement Tools (Feature 023)
    list_document_images: "Listar Imagens do Documento",
    analyze_image: "Analisar Imagem",
    analyze_document_images: "Analisar Imagens do Documento",
    refine_image: "Refinar Imagem"
}

// Tools that can display thumbnail previews
const IMAGE_RESULT_TOOLS = [
    'list_document_images',
    'analyze_image',
    'analyze_document_images',
    'refine_image',
    'generate_image'
]

export default function ToolExecutionCard({
    id,
    tool,
    args,
    result,
    status,
    duration,
    timestamp,
    index,
    total
}: ToolExecutionCardProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [elapsedTime, setElapsedTime] = useState(0)
    const [isCancelling, setIsCancelling] = useState(false)

    // Timer for executing state
    useEffect(() => {
        let interval: NodeJS.Timeout
        if (status === "executing") {
            const startTime = Date.now()
            setElapsedTime(0)
            interval = setInterval(() => {
                setElapsedTime(Date.now() - startTime)
            }, 100)
        }
        return () => clearInterval(interval)
    }, [status])

    const handleCancel = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (isCancelling) return

        setIsCancelling(true)
        try {
            await api.post("/chat/tool-cancel", { tool_call_id: id })
        } catch (error) {
            console.error("Failed to cancel tool", error)
        } finally {
            setIsCancelling(false)
        }
    }

    const Icon = TOOL_ICONS[tool] || FileText
    const label = TOOL_LABELS[tool] || tool

    // Format duration
    const formatDuration = (ms?: number) => {
        if (!ms) return ""
        if (ms < 1000) return `${ms}ms`
        return `${(ms / 1000).toFixed(2)}s`
    }

    // Format timestamp
    const formatTime = (time?: string) => {
        if (!time) return ""
        const date = new Date(time)
        return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    }

    // Copy to clipboard
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
    }

    // Extract thumbnails from image tool results
    const extractImagePreviews = (result: any): { url: string; title?: string }[] => {
        if (!result || typeof result !== 'object') return []

        const previews: { url: string; title?: string }[] = []

        // list_document_images: result.images[]
        if (result.images && Array.isArray(result.images)) {
            result.images.forEach((img: any) => {
                if (img.thumbnail_url || img.file_url) {
                    previews.push({
                        url: img.thumbnail_url || img.file_url,
                        title: img.title
                    })
                }
            })
        }

        // analyze_image / refine_image: result.thumbnail_url
        if (result.thumbnail_url) {
            previews.push({
                url: result.thumbnail_url,
                title: result.image_title || result.title
            })
        }

        // refine_image: result.refined_thumbnail_url
        if (result.refined_thumbnail_url) {
            previews.push({
                url: result.refined_thumbnail_url,
                title: 'Imagem Refinada'
            })
        }

        // analyze_document_images: result.analyses[]
        if (result.analyses && Array.isArray(result.analyses)) {
            result.analyses.forEach((analysis: any) => {
                if (analysis.thumbnail_url) {
                    previews.push({
                        url: analysis.thumbnail_url,
                        title: analysis.title || analysis.image_title
                    })
                }
            })
        }

        // generate_image: result.image_url
        if (result.image_url && !result.thumbnail_url) {
            previews.push({
                url: result.image_url,
                title: result.title
            })
        }

        return previews
    }

    const imagePreviews = IMAGE_RESULT_TOOLS.includes(tool) ? extractImagePreviews(result) : []

    return (
        <Card className={cn(
            "p-3 transition-all",
            status === "executing" && "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
            status === "completed" && "border-green-500/50 bg-green-50/30 dark:bg-green-950/10",
            status === "error" && "border-red-500 bg-red-50/50 dark:bg-red-950/20",
            status === "pending" && "border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/10"
        )}>
            <div className="space-y-2">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Icon with status indicator */}
                        <div className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-full",
                            status === "executing" && "bg-blue-100 dark:bg-blue-900/30",
                            status === "completed" && "bg-green-100 dark:bg-green-900/30",
                            status === "error" && "bg-red-100 dark:bg-red-900/30",
                            status === "pending" && "bg-amber-100 dark:bg-amber-900/30"
                        )}>
                            {status === "executing" ? (
                                <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
                            ) : status === "completed" ? (
                                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                            ) : status === "error" ? (
                                <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                            ) : (
                                <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            )}
                        </div>

                        {/* Tool name */}
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{label}</span>
                                {index && total && (
                                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                        {index}/{total}
                                    </Badge>
                                )}
                            </div>
                            {duration && status === "completed" && (
                                <span className="text-xs text-muted-foreground">
                                    {formatDuration(duration)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Timer and Cancel Button */}
                    {status === "executing" && (
                        <div className="flex items-center gap-2 mr-2">
                            <span className="text-xs font-mono text-muted-foreground w-12 text-right">
                                {(elapsedTime / 1000).toFixed(1)}s
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancel}
                                disabled={isCancelling}
                                className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                                title="Cancelar execução"
                            >
                                {isCancelling ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <StopCircle className="h-3 w-3" />
                                )}
                            </Button>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                        {timestamp && (
                            <span className="text-xs text-muted-foreground mr-2">
                                {formatTime(timestamp)}
                            </span>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="h-6 w-6 p-0"
                        >
                            {isExpanded ? (
                                <ChevronUp className="h-3 w-3" />
                            ) : (
                                <ChevronDown className="h-3 w-3" />
                            )}
                        </Button>
                    </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                    <div className="space-y-2 ml-10">
                        {/* Arguments */}
                        {args && Object.keys(args).length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        Argumentos
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(JSON.stringify(args, null, 2))}
                                        className="h-5 px-2 text-xs"
                                    >
                                        <Copy className="h-3 w-3 mr-1" />
                                        Copiar
                                    </Button>
                                </div>
                                <pre className="text-xs bg-muted/50 p-2 rounded border overflow-x-auto">
                                    <code>{JSON.stringify(args, null, 2)}</code>
                                </pre>
                            </div>
                        )}

                        {/* Result */}
                        {result && status === "completed" && (
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        Resultado
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(
                                            typeof result === "string" ? result : JSON.stringify(result, null, 2)
                                        )}
                                        className="h-5 px-2 text-xs"
                                    >
                                        <Copy className="h-3 w-3 mr-1" />
                                        Copiar
                                    </Button>
                                </div>
                                {/* Image Thumbnails */}
                                {imagePreviews.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {imagePreviews.slice(0, 6).map((preview, idx) => (
                                            <div key={idx} className="relative group">
                                                <img
                                                    src={preview.url}
                                                    alt={preview.title || `Imagem ${idx + 1}`}
                                                    className="w-16 h-16 object-cover rounded border border-border hover:border-primary transition-colors cursor-pointer"
                                                    onClick={() => window.open(preview.url, '_blank')}
                                                />
                                                {preview.title && (
                                                    <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[8px] px-1 py-0.5 truncate rounded-b opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {preview.title}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {imagePreviews.length > 6 && (
                                            <div className="w-16 h-16 flex items-center justify-center bg-muted rounded border text-xs text-muted-foreground">
                                                +{imagePreviews.length - 6}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="text-xs bg-green-50 dark:bg-green-950/20 p-2 rounded border border-green-200 dark:border-green-800">
                                    {typeof result === "string" ? (
                                        <p className="whitespace-pre-wrap">{result}</p>
                                    ) : (
                                        <pre className="overflow-x-auto">
                                            <code>{JSON.stringify(result, null, 2)}</code>
                                        </pre>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {result && status === "error" && (
                            <div>
                                <span className="text-xs font-medium text-muted-foreground block mb-1">
                                    Erro
                                </span>
                                <div className="text-xs bg-red-50 dark:bg-red-950/20 p-2 rounded border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
                                    {typeof result === "string" ? result : JSON.stringify(result)}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Card>
    )
}
