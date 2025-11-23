"use client"

import { useState, useEffect, useRef } from "react"
import { useAuthStore } from "@/lib/store"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, Bot, User as UserIcon, Settings, FileText, ChevronDown, ChevronUp, Trash2, Check, ChevronsUpDown, Paperclip, RotateCcw, Sparkles, Folder, Search, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import ToolExecutionCard from "@/components/ToolExecutionCard"

interface Message {
    role: "user" | "assistant" | "system"
    content: string
    isStreaming?: boolean
}

interface StreamingStatus {
    status?: string
    tool?: string
    args?: any
    index?: number
    total?: number
    completed?: boolean
}

interface PendingApproval {
    approval_id: string
    tool: string
    args: any
    index: number
    total: number
}

interface Model {
    id: string
    name: string
}

interface Document {
    id: string
    title: string
}

interface Folder {
    id: string
    name: string
    document_count?: number
}

interface ToolExecution {
    id: string
    tool: string
    args?: Record<string, any>
    result?: any
    status: "pending" | "executing" | "completed" | "error"
    duration?: number
    timestamp: string
    index?: number
    total?: number
}

interface ChatSidebarProps {
    projectId?: string
    currentDocument?: { id: string; title: string; content?: string } | null
    onAiSuggestion?: (content: string) => void
    documents?: Document[]
    autoApplyEdits?: boolean
    onAutoApplyChange?: (value: boolean) => void
    onDocumentUpdate?: (documentId: string) => Promise<void>
    onToolExecuted?: (toolName: string) => Promise<void>  // New callback for any tool execution
    availableModels?: string[]
    defaultModel?: string
}

export default function ChatSidebar({
    projectId,
    currentDocument,
    onAiSuggestion,
    documents = [],
    autoApplyEdits = false,
    onAutoApplyChange,
    onDocumentUpdate,
    onToolExecuted,
    availableModels = [],
    defaultModel
}: ChatSidebarProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [models, setModels] = useState<Model[]>([])
    const [selectedModel, setSelectedModel] = useState(defaultModel || "x-ai/grok-beta")
    const [useRag, setUseRag] = useState(true)
    const [openModelSelect, setOpenModelSelect] = useState(false)
    const [isContextExpanded, setIsContextExpanded] = useState(false)
    const [selectedContextIds, setSelectedContextIds] = useState<string[]>([])
    const [streamingStatus, setStreamingStatus] = useState<StreamingStatus | null>(null)
    const [templates, setTemplates] = useState<any[]>([])
    const [openTemplates, setOpenTemplates] = useState(false)
    const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null)
    const [attachments, setAttachments] = useState<any[]>([])
    const [uploadingAttachment, setUploadingAttachment] = useState(false)
    const [contextSearchQuery, setContextSearchQuery] = useState("")
    const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([])
    const [folders, setFolders] = useState<Folder[]>([])
    const [currentStreamingContent, setCurrentStreamingContent] = useState("")
    const [toolExecutions, setToolExecutions] = useState<ToolExecution[]>([])

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { token } = useAuthStore()
    const { toast } = useToast()

    // Fetch models only on client side with token
    useEffect(() => {
        if (typeof window !== 'undefined' && token) {
            fetchModels()
        }
    }, [token])

    // Fetch folders when projectId changes
    useEffect(() => {
        if (projectId && token) {
            fetchFolders()
        }
    }, [projectId, token])

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Auto-scroll during streaming
    useEffect(() => {
        if (isLoading) {
            scrollToBottom()
        }
    }, [currentStreamingContent, toolExecutions, isLoading])

    // Update selected model when defaultModel prop changes
    useEffect(() => {
        if (defaultModel && defaultModel !== selectedModel) {
            setSelectedModel(defaultModel)
        }
    }, [defaultModel])

    const fetchModels = async () => {
        try {
            const response = await api.get("/chat/models")
            setModels(response.data)
        } catch (error) {
            console.error("Failed to fetch models", error)
        }
    }

    const fetchTemplates = async () => {
        try {
            const response = await api.get("/templates?include_system=true")
            setTemplates(response.data.slice(0, 10)) // Top 10 templates
        } catch (error) {
            console.error("Failed to fetch templates", error)
        }
    }

    const fetchFolders = async () => {
        if (!projectId) return
        try {
            const response = await api.get(`/folders/project/${projectId}`)
            setFolders(response.data.folders || [])
        } catch (error) {
            console.error("Failed to fetch folders", error)
        }
    }

    const useTemplate = async (template: any) => {
        setInput(template.prompt)
        setOpenTemplates(false)
        try {
            await api.post(`/templates/${template.id}/use`)
        } catch (error) {
            console.error("Failed to log template usage", error)
        }
        toast({ title: "Template carregado!", description: template.name })
    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    const handleClearChat = () => {
        setMessages([])
        toast({ title: "Chat cleared", description: "Conversation history has been cleared." })
    }

    const toggleContextId = (id: string) => {
        setSelectedContextIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    const toggleFolderId = (id: string) => {
        setSelectedFolderIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    // Filter documents and folders by search query
    const filteredDocuments = documents.filter(d =>
        d.id !== currentDocument?.id &&
        (!contextSearchQuery || d.title.toLowerCase().includes(contextSearchQuery.toLowerCase()))
    )

    const filteredFolders = folders.filter(f =>
        !contextSearchQuery || f.name.toLowerCase().includes(contextSearchQuery.toLowerCase())
    )

    const handleApprovalResponse = async (approved: boolean) => {
        if (!pendingApproval) return

        try {
            await api.post("/chat/tool-approval", {
                approval_id: pendingApproval.approval_id,
                approved: approved
            })

            // Clear pending approval
            setPendingApproval(null)

            if (!approved) {
                toast({
                    title: "Operação cancelada",
                    description: "A execução da ferramenta foi cancelada.",
                    variant: "default"
                })
            }
        } catch (error) {
            console.error("Failed to send approval response", error)
            toast({
                title: "Erro",
                description: "Falha ao enviar resposta de aprovação.",
                variant: "destructive"
            })
        }
    }

    const handleAttachmentClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Reset input value to allow selecting the same file again
        e.target.value = ''

        // Check file size (10MB limit)
        const maxSize = 10 * 1024 * 1024
        if (file.size > maxSize) {
            toast({
                title: "Arquivo muito grande",
                description: "O arquivo deve ter no máximo 10MB",
                variant: "destructive"
            })
            return
        }

        // Check file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'application/pdf']
        if (!validTypes.includes(file.type)) {
            toast({
                title: "Tipo de arquivo não suportado",
                description: "Envie apenas imagens (JPG, PNG, GIF, etc.) ou PDFs",
                variant: "destructive"
            })
            return
        }

        setUploadingAttachment(true)

        try {
            const formData = new FormData()
            formData.append('file', file)
            if (projectId) {
                formData.append('project_id', projectId)
            }

            const response = await api.post('/chat/upload-attachment', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })

            const attachment = response.data.attachment
            setAttachments(prev => [...prev, attachment])

            toast({
                title: "Anexo processado",
                description: `${file.name} foi analisado com sucesso`,
            })
        } catch (error: any) {
            console.error("Failed to upload attachment", error)
            const errorMessage = error.response?.data?.detail || "Falha ao processar anexo"
            toast({
                title: "Erro ao processar anexo",
                description: errorMessage,
                variant: "destructive"
            })
        } finally {
            setUploadingAttachment(false)
        }
    }

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index))
    }

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        // Allow sending if there's text OR attachments
        if ((!input.trim() && attachments.length === 0) || isLoading) return

        console.log('🚀 CHAT SEND STARTED')
        console.log('Input:', input)
        console.log('Model:', selectedModel)
        console.log('Project ID:', projectId)

        const userMessage: Message = { role: "user", content: input }
        setMessages((prev) => [...prev, userMessage])
        setInput("")
        setIsLoading(true)
        setStreamingStatus({ status: "Iniciando..." })
        setCurrentStreamingContent("")  // Clear previous streaming content
        setToolExecutions([])  // Clear previous tool executions

        try {
            // Prepare messages with attachments
            const messagesWithAttachments = [...messages, userMessage].map((msg, index) => {
                // Add attachments only to the last message (current user message)
                if (index === messages.length && attachments.length > 0) {
                    return {
                        ...msg,
                        attachments: attachments
                    }
                }
                return msg
            })

            // Prepare context data
            const contextData: any = {
                messages: messagesWithAttachments,
                model: selectedModel,
                project_id: projectId,
                use_rag: useRag,
                document_ids: useRag ? selectedContextIds : [],
                folder_ids: useRag ? selectedFolderIds : []
            }

            // Clear attachments after adding to message
            setAttachments([])

            // If we have a current document, include it in the context
            if (currentDocument && useRag) {
                contextData.current_document = {
                    id: currentDocument.id,
                    title: currentDocument.title,
                    content: currentDocument.content || ""
                }
            }

            // Use streaming endpoint
            const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/chat/completion-stream`
            console.log('📡 Calling streaming endpoint:', apiUrl)
            console.log('Context data:', JSON.stringify(contextData, null, 2))

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(contextData)
            })

            console.log('📬 Response status:', response.status, response.statusText)

            if (!response.ok) {
                const errorText = await response.text()
                console.error('❌ Response not OK:', errorText)
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()
            let currentContent = ""

            if (!reader) throw new Error("No reader available")

            console.log('📖 Starting to read stream...')

            while (true) {
                const { done, value } = await reader.read()
                if (done) {
                    console.log('✅ Stream completed')
                    break
                }

                const chunk = decoder.decode(value, { stream: true })
                const lines = chunk.split('\n')

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6)
                        if (data === '[DONE]') continue

                        try {
                            const event = JSON.parse(data)
                            console.log('📨 SSE Event:', event.type, event)

                            switch (event.type) {
                                case 'status':
                                    setStreamingStatus({ status: event.message })
                                    break

                                case 'tool_approval_request':
                                    // If it's edit_document, show the generated content in streaming
                                    if (event.tool === 'edit_document' && event.args?.content) {
                                        currentContent = event.args.content
                                        setCurrentStreamingContent(currentContent)
                                    }

                                    setPendingApproval({
                                        approval_id: event.approval_id,
                                        tool: event.tool,
                                        args: event.args,
                                        index: event.index,
                                        total: event.total
                                    })
                                    setStreamingStatus({
                                        status: `Aguardando aprovação: ${event.tool}`,
                                        tool: event.tool,
                                        args: event.args,
                                        index: event.index,
                                        total: event.total
                                    })

                                    // Add pending tool execution card
                                    const pendingExecution: ToolExecution = {
                                        id: `${event.tool}-${Date.now()}-${event.index || 0}-pending`,
                                        tool: event.tool,
                                        args: event.args,
                                        status: "pending",
                                        timestamp: new Date().toISOString(),
                                        index: event.index,
                                        total: event.total
                                    }
                                    setToolExecutions(prev => [...prev, pendingExecution])
                                    break

                                case 'tool_approved':
                                    setStreamingStatus({ status: `Ferramenta aprovada: ${event.tool}` })
                                    // Update pending tool execution to executing
                                    setToolExecutions(prev => prev.map(exec => {
                                        if (exec.tool === event.tool && exec.status === "pending") {
                                            return { ...exec, status: "executing" }
                                        }
                                        return exec
                                    }))
                                    break

                                case 'tool_rejected':
                                    setStreamingStatus({ status: `Ferramenta recusada: ${event.tool}` })
                                    // Update pending tool execution to error
                                    setToolExecutions(prev => prev.map(exec => {
                                        if (exec.tool === event.tool && exec.status === "pending") {
                                            return { ...exec, status: "error", result: "Rejected by user" }
                                        }
                                        return exec
                                    }))
                                    break

                                case 'tool_start':
                                    setStreamingStatus({
                                        status: `Executando: ${event.tool}`,
                                        tool: event.tool,
                                        args: event.args,
                                        index: event.index,
                                        total: event.total
                                    })

                                    // Add tool execution card only if one doesn't already exist (from approval)
                                    setToolExecutions(prev => {
                                        const exists = prev.some(exec =>
                                            exec.tool === event.tool && exec.status === "executing"
                                        )
                                        if (!exists) {
                                            const newExecution: ToolExecution = {
                                                id: `${event.tool}-${Date.now()}-${event.index || 0}`,
                                                tool: event.tool,
                                                args: event.args,
                                                status: "executing",
                                                timestamp: new Date().toISOString(),
                                                index: event.index,
                                                total: event.total
                                            }
                                            return [...prev, newExecution]
                                        }
                                        return prev
                                    })
                                    break

                                case 'tool_complete':
                                    setStreamingStatus({
                                        status: `Completado: ${event.tool}`,
                                        tool: event.tool,
                                        completed: true
                                    })

                                    // Update tool execution card
                                    setToolExecutions(prev => prev.map(exec => {
                                        // Match by tool name and executing status (to update the most recent one)
                                        if (exec.tool === event.tool && exec.status === "executing") {
                                            return {
                                                ...exec,
                                                status: "completed",
                                                result: event.result,
                                                duration: event.duration_ms
                                            }
                                        }
                                        return exec
                                    }))

                                    // Trigger refresh for file/folder creation tools
                                    if (onToolExecuted && ['create_document', 'create_folder'].includes(event.tool)) {
                                        await onToolExecuted(event.tool)
                                    }
                                    break

                                case 'tool_error':
                                    // Update tool execution card with error
                                    setToolExecutions(prev => prev.map(exec => {
                                        if (exec.tool === event.tool && exec.status === "executing") {
                                            return {
                                                ...exec,
                                                status: "error",
                                                result: event.error || "Unknown error"
                                            }
                                        }
                                        return exec
                                    }))
                                    break

                                case 'message_chunk':
                                    // Accumulate streaming content
                                    currentContent += event.content
                                    setCurrentStreamingContent(currentContent)
                                    break

                                case 'done':
                                    // Add final message to history if there's content
                                    if (currentContent.trim()) {
                                        setMessages((prev) => [...prev, {
                                            role: "assistant",
                                            content: currentContent,
                                            isStreaming: false
                                        }])
                                    }
                                    setStreamingStatus(null)
                                    setCurrentStreamingContent("")  // Clear streaming content
                                    setIsLoading(false)

                                    // Trigger document update if needed
                                    if (currentDocument?.id && onDocumentUpdate) {
                                        await onDocumentUpdate(currentDocument.id)
                                    }
                                    break

                                case 'error':
                                    throw new Error(event.message)
                            }
                        } catch (parseError) {
                            console.warn('Failed to parse SSE event:', data)
                        }
                    }
                }
            }
        } catch (error: any) {
            console.error("Chat failed", error)
            const errorMsg = error?.response?.status === 401
                ? "Authentication error. Please log in again."
                : "Sorry, I encountered an error processing your request."
            toast({ title: "Error", description: errorMsg, variant: "destructive" })
            // Add error message to chat history
            setMessages((prev) => [...prev, {
                role: "assistant",
                content: errorMsg
            }])
        } finally {
            setIsLoading(false)
            setStreamingStatus(null)
        }
    }

    return (
        <div className="flex flex-col h-full border-l bg-background w-[400px]">
            <div className="p-4 border-b flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold flex items-center gap-2">
                        <Bot className="h-5 w-5" /> Assistente IA
                    </h2>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleClearChat}
                            title="Nova conversa"
                            className="h-8 w-8"
                        >
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Popover open={openModelSelect} onOpenChange={setOpenModelSelect}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openModelSelect}
                                    className="w-[200px] justify-between text-xs h-8"
                                >
                                    {selectedModel
                                        ? models.find((model) => model.id === selectedModel)?.name
                                        : "Selecionar Modelo..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0">
                                <Command>
                                    <CommandInput placeholder="Buscar modelos..." />
                                    <CommandList>
                                        <CommandEmpty>Nenhum modelo encontrado.</CommandEmpty>

                                        {/* Recommended Models (Available in Workspace) */}
                                        {availableModels.length > 0 && (
                                            <>
                                                <CommandGroup heading="Recomendados">
                                                    {models
                                                        .filter(model => availableModels.includes(model.id))
                                                        .map((model) => (
                                                            <CommandItem
                                                                key={model.id}
                                                                value={model.name}
                                                                onSelect={() => {
                                                                    setSelectedModel(model.id === selectedModel ? "" : model.id)
                                                                    setOpenModelSelect(false)
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        selectedModel === model.id ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {model.name}
                                                            </CommandItem>
                                                        ))}
                                                </CommandGroup>
                                                <CommandSeparator />
                                            </>
                                        )}

                                        {/* All Other Models */}
                                        <CommandGroup heading={availableModels.length > 0 ? "Todos os Modelos" : undefined}>
                                            {models
                                                .filter(model => !availableModels.includes(model.id))
                                                .map((model) => (
                                                    <CommandItem
                                                        key={model.id}
                                                        value={model.name}
                                                        onSelect={() => {
                                                            setSelectedModel(model.id === selectedModel ? "" : model.id)
                                                            setOpenModelSelect(false)
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedModel === model.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {model.name}
                                                    </CommandItem>
                                                ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {/* Auto-apply Toggle */}
                {
                    onAutoApplyChange && (
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-medium text-muted-foreground">Aplicar edições automaticamente</span>
                            <Switch
                                checked={autoApplyEdits}
                                onCheckedChange={onAutoApplyChange}
                                className="scale-75"
                            />
                        </div>
                    )
                }

                {/* Context Selection */}
                <div className="border rounded-lg p-2 bg-muted/30">
                    <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setIsContextExpanded(!isContextExpanded)}
                    >
                        <div className="flex items-center gap-2 text-xs font-medium">
                            <Settings className="h-3 w-3" />
                            Contexto: {useRag ? (
                                currentDocument
                                    ? `Editando + ${selectedContextIds.length} docs + ${selectedFolderIds.length} pastas`
                                    : `${selectedContextIds.length} docs + ${selectedFolderIds.length} pastas`
                            ) : "Desligado"}
                        </div>
                        {isContextExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </div>

                    {isContextExpanded && (
                        <div className="mt-2 space-y-2">
                            <div className="flex items-center gap-2 text-xs">
                                <input
                                    type="checkbox"
                                    checked={useRag}
                                    onChange={(e) => setUseRag(e.target.checked)}
                                    id="useRag"
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label htmlFor="useRag">Habilitar Contexto</label>
                            </div>

                            {useRag && (
                                <>
                                    {/* Search bar */}
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar contextos..."
                                            value={contextSearchQuery}
                                            onChange={(e) => setContextSearchQuery(e.target.value)}
                                            className="h-7 text-xs pl-7 pr-7"
                                        />
                                        {contextSearchQuery && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setContextSearchQuery("")}
                                                className="absolute right-0 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>

                                    <div className="pl-2 space-y-1 max-h-[300px] overflow-y-auto mt-2">
                                        {currentDocument && (
                                            <div className="flex items-center gap-2 text-xs p-1 bg-background rounded border border-primary/20">
                                                <FileText className="h-3 w-3 text-primary" />
                                                <span className="font-medium truncate flex-1">{currentDocument.title}</span>
                                                <Badge variant="secondary" className="text-[10px] h-4 px-1">Atual</Badge>
                                            </div>
                                        )}

                                        {/* Folders section */}
                                        {filteredFolders.length > 0 && (
                                            <>
                                                <div className="text-[10px] text-muted-foreground mt-2 mb-1 px-1 font-medium">Pastas</div>
                                                {filteredFolders.map(folder => (
                                                    <div key={folder.id} className="flex items-center gap-2 text-xs px-1 hover:bg-muted/50 rounded">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedFolderIds.includes(folder.id)}
                                                            onChange={() => toggleFolderId(folder.id)}
                                                            id={`folder-${folder.id}`}
                                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                                        />
                                                        <Folder className="h-3 w-3 text-amber-500" />
                                                        <label htmlFor={`folder-${folder.id}`} className="truncate flex-1 cursor-pointer py-1" title={folder.name}>
                                                            {folder.name}
                                                        </label>
                                                        {folder.document_count !== undefined && (
                                                            <Badge variant="outline" className="text-[9px] h-4 px-1">
                                                                {folder.document_count} docs
                                                            </Badge>
                                                        )}
                                                    </div>
                                                ))}
                                            </>
                                        )}

                                        {/* Documents section */}
                                        <div className="text-[10px] text-muted-foreground mt-2 mb-1 px-1 font-medium">Documentos</div>
                                        {filteredDocuments.map(doc => (
                                            <div key={doc.id} className="flex items-center gap-2 text-xs px-1 hover:bg-muted/50 rounded">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedContextIds.includes(doc.id)}
                                                    onChange={() => toggleContextId(doc.id)}
                                                    id={`doc-${doc.id}`}
                                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                                />
                                                <FileText className="h-3 w-3 text-blue-500" />
                                                <label htmlFor={`doc-${doc.id}`} className="truncate flex-1 cursor-pointer py-1" title={doc.title}>
                                                    {doc.title}
                                                </label>
                                            </div>
                                        ))}
                                        {filteredDocuments.length === 0 && filteredFolders.length === 0 && !currentDocument && (
                                            <div className="text-xs text-muted-foreground px-1 italic">
                                                {contextSearchQuery ? "Nenhum resultado encontrado" : "Nenhum contexto disponível"}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div >

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`p-2 rounded-lg max-w-[80%] text-sm ${msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                            }`}>
                            {msg.role === "assistant" ? (
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                msg.content
                            )}
                            {msg.role === "assistant" && onAiSuggestion && (
                                <div className="mt-2 pt-2 border-t border-border/50 flex justify-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs px-2"
                                        onClick={() => onAiSuggestion(msg.content)}
                                    >
                                        Sugerir Edição
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Thinking Block - Always visible when loading */}
                {isLoading && (
                    <div className="flex gap-2">
                        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 p-4 rounded-lg max-w-[85%] space-y-3 shadow-sm">
                            {/* Header with animated icon */}
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <div className="relative">
                                    <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    <div className="absolute inset-0 animate-ping">
                                        <Bot className="h-4 w-4 text-blue-600/50 dark:text-blue-400/50" />
                                    </div>
                                </div>
                                <span className="text-blue-700 dark:text-blue-300">
                                    {streamingStatus?.tool
                                        ? `Executando: ${streamingStatus.tool}`
                                        : streamingStatus?.status || "Gerando resposta..."}
                                </span>
                            </div>

                            {/* Streaming text content */}
                            {currentStreamingContent && (
                                <div className="prose prose-sm max-w-none dark:prose-invert ml-6">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {currentStreamingContent}
                                    </ReactMarkdown>
                                    {/* Blinking cursor */}
                                    <span className="inline-block w-2 h-4 bg-blue-600 dark:bg-blue-400 animate-pulse ml-1 align-middle" />
                                </div>
                            )}

                            {/* Tool Execution Cards */}
                            {toolExecutions.length > 0 && (
                                <div className="ml-6 space-y-2">
                                    {toolExecutions.map(execution => (
                                        <ToolExecutionCard
                                            key={execution.id}
                                            tool={execution.tool}
                                            args={execution.args}
                                            result={execution.result}
                                            status={execution.status}
                                            duration={execution.duration}
                                            timestamp={execution.timestamp}
                                            index={execution.index}
                                            total={execution.total}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Tool execution details */}
                            {streamingStatus?.tool && (
                                <div className="ml-6 space-y-2">
                                    <div className="flex items-center gap-2 text-xs">
                                        <div className="flex items-center gap-1.5 bg-background/60 px-2 py-1 rounded border border-border/40">
                                            <FileText className="h-3 w-3 text-amber-600" />
                                            <span className="font-mono font-medium">{streamingStatus.tool}</span>
                                        </div>
                                        {streamingStatus.index && streamingStatus.total && (
                                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                                {streamingStatus.index}/{streamingStatus.total}
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Tool arguments preview */}
                                    {streamingStatus.args && (
                                        <div className="text-[10px] text-muted-foreground font-mono bg-background/40 p-1.5 rounded border border-border/30">
                                            {JSON.stringify(streamingStatus.args).slice(0, 100)}
                                            {JSON.stringify(streamingStatus.args).length > 100 && "..."}
                                        </div>
                                    )}

                                    {streamingStatus.completed && (
                                        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-medium">
                                            <div className="flex items-center justify-center h-4 w-4 bg-green-600/10 rounded-full">
                                                <Check className="h-2.5 w-2.5" />
                                            </div>
                                            <span>Concluído</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Progress pulse animation */}
                            <div className="h-1 w-full bg-background/30 rounded-full overflow-hidden">
                                <div className="h-full w-1/3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Approval Request Card */}
                {pendingApproval && (
                    <div className="flex gap-2">
                        <Card className="max-w-[85%] border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Bot className="h-4 w-4 text-amber-600" />
                                    Aprovação Necessária
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="text-sm">
                                    <p className="font-medium mb-2">A IA quer executar a seguinte ação:</p>
                                    <div className="flex items-center gap-2 bg-background/60 px-3 py-2 rounded border">
                                        <FileText className="h-4 w-4 text-amber-600" />
                                        <span className="font-mono font-medium">{pendingApproval.tool}</span>
                                        {pendingApproval.index && pendingApproval.total && (
                                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 ml-auto">
                                                {pendingApproval.index}/{pendingApproval.total}
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {pendingApproval.args && (
                                    <div className="text-xs">
                                        {pendingApproval.tool === 'edit_document' && pendingApproval.args.content ? (
                                            <>
                                                <p className="text-muted-foreground mb-1">Documento: <span className="font-medium">{pendingApproval.args.title || 'Sem título'}</span></p>
                                                <div className="bg-background/40 p-3 rounded border max-h-40 overflow-y-auto">
                                                    <p className="text-muted-foreground mb-1 text-[10px]">Novo conteúdo:</p>
                                                    <div className="prose prose-xs dark:prose-invert max-w-none">
                                                        {pendingApproval.args.content.substring(0, 300)}
                                                        {pendingApproval.args.content.length > 300 && '...'}
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-muted-foreground mb-1">Parâmetros:</p>
                                                <div className="font-mono bg-background/40 p-2 rounded border text-[10px] max-h-20 overflow-y-auto">
                                                    <pre className="whitespace-pre-wrap">{JSON.stringify(pendingApproval.args, null, 2)}</pre>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-2 pt-2">
                                    <Button
                                        size="sm"
                                        variant="default"
                                        onClick={() => handleApprovalResponse(true)}
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                    >
                                        <Check className="h-4 w-4 mr-1" />
                                        Aprovar
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleApprovalResponse(false)}
                                        className="flex-1"
                                    >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Recusar
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t">
                {/* Attachments preview */}
                {attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                        {attachments.map((att, index) => (
                            <div key={index} className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg text-xs">
                                <FileText className="h-3 w-3" />
                                <span className="max-w-[150px] truncate">{att.filename}</span>
                                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                    {att.type}
                                </Badge>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                    onClick={() => removeAttachment(index)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSend} className="flex gap-2">
                    <div className="flex-1 flex gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <Popover open={openTemplates} onOpenChange={setOpenTemplates}>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    onClick={() => {
                                        if (templates.length === 0) fetchTemplates()
                                    }}
                                    disabled={isLoading}
                                    title="Usar template"
                                >
                                    <Sparkles className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Buscar templates..." />
                                    <CommandList>
                                        <CommandEmpty>Nenhum template encontrado.</CommandEmpty>
                                        <CommandGroup heading="Templates Populares">
                                            {templates.map((template) => (
                                                <CommandItem
                                                    key={template.id}
                                                    onSelect={() => useTemplate(template)}
                                                    className="cursor-pointer"
                                                >
                                                    <span className="mr-2">{template.icon}</span>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium">{template.name}</div>
                                                        <div className="text-xs text-muted-foreground line-clamp-1">
                                                            {template.description}
                                                        </div>
                                                    </div>
                                                    <Badge variant="secondary" className="text-xs ml-2">
                                                        {template.category}
                                                    </Badge>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={handleAttachmentClick}
                            disabled={isLoading || uploadingAttachment}
                            title="Adicionar anexo (imagem ou PDF)"
                        >
                            <Paperclip className={cn("h-4 w-4", uploadingAttachment && "animate-spin")} />
                        </Button>
                        <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSend(e as any)
                                }
                            }}
                            placeholder="Pergunte qualquer coisa... (Enter para enviar, Shift+Enter para nova linha)"
                            disabled={isLoading}
                            className="min-h-[60px] max-h-[200px] resize-none"
                            rows={2}
                        />
                    </div>
                    <Button type="submit" size="icon" disabled={isLoading || (!input.trim() && attachments.length === 0)}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div >
    )
}
