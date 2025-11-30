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
    StopCircle
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
    search_documents: Search,
    move_file: Move,
    move_folder: Move,
    delete_file: Trash2,
    delete_folder: Trash2,
    web_search: Globe,
    rename_document: Pencil,
    rename_folder: Pencil,
    get_folder_contents: FolderOpen
}

// Map tool names to friendly labels
const TOOL_LABELS: Record<string, string> = {
    read_document: "Ler Documento",
    edit_document: "Editar Documento",
    create_document: "Criar Documento",
    create_folder: "Criar Pasta",
    list_documents: "Listar Documentos",
    list_folders: "Listar Pastas",
    search_documents: "Buscar Documentos",
    move_file: "Mover Arquivo",
    move_folder: "Mover Pasta",
    delete_file: "Deletar Arquivo",
    delete_folder: "Deletar Pasta",
    web_search: "Buscar na Web",
    rename_document: "Renomear Documento",
    rename_folder: "Renomear Pasta",
    get_folder_contents: "Listar Conteúdo da Pasta"
}

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
