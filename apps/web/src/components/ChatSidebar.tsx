"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useTranslations } from "next-intl"
import { useAuthStore } from "@/lib/store"
import api from "@/lib/api"
import type { CachedModel } from "@/lib/models-cache"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, Bot, User as UserIcon, Settings, FileText, ChevronDown, ChevronUp, Trash2, Check, ChevronsUpDown, Paperclip, RotateCcw, Sparkles, Folder, Search, X, History, ExternalLink, Image, MoreVertical, Plus, Loader2, Mic, Square, PanelRightClose } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import ToolExecutionCard from "@/components/ToolExecutionCard"
import TaskListCard, { TaskItem } from "@/components/TaskListCard"
import { useUserPreferences } from "@/hooks/useUserPreferences"
import { buildApiUrl } from "@/lib/env"
import ConversationsList from "@/components/ConversationsList"
import { conversationService } from "@/lib/supabase/conversations"
import VisualContextSelector from "@/components/visual-assets/VisualContextSelector"
import { TemplateSelector, TemplateForm } from "@/components/templates"
import { startChatFromTemplate, transcribeAudio } from "@/lib/api"
import { useVoiceRecording } from "@/hooks/useVoiceRecording"
import { AnimatePresence } from "framer-motion"
import { useImageVariations } from "@/hooks/useImageVariations"
import { ImageVariationGrid } from "@/components/chat/ImageVariationGrid"
import type { ImageVariation } from "@/types/image-variations"

// Generate a title from the first user message (truncate at ~50 chars on word boundary)
function generateTitleFromMessage(content: string): string {
    const cleaned = content.trim().replace(/\s+/g, ' ')
    if (cleaned.length <= 50) return cleaned
    const truncated = cleaned.substring(0, 50)
    const lastSpace = truncated.lastIndexOf(' ')
    return (lastSpace > 20 ? truncated.substring(0, lastSpace) : truncated) + '...'
}

interface ChatMessage {
    role: "user" | "assistant" | "system"
    content: string
    toolExecutions?: any[]
    taskList?: any[]
}
import { useFolders } from "@/hooks/use-folders"
import { useTemplates } from "@/hooks/use-templates"
import { templateService } from "@/lib/supabase/templates"

interface Message {
    role: "user" | "assistant" | "system"
    content: string
    isStreaming?: boolean
    toolExecutions?: ToolExecution[]
    taskList?: TaskItem[]
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
    media_type?: string
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

interface CreatedDocument {
    id: string
    title: string
    type: "text" | "image"
}

interface ChatSidebarProps {
    workspaceId: string
    projectId?: string
    currentBoardId?: string | null
    currentDocument?: { id: string; title: string; content?: string } | null
    onAiSuggestion?: (content: string) => void
    documents?: Document[]
    autoApplyEdits?: boolean
    onAutoApplyChange?: (value: boolean) => void
    onDocumentUpdate?: (documentId: string) => Promise<void>
    onToolExecuted?: (toolName: string, toolResult?: any) => Promise<void>  // New callback for any tool execution
    onNavigateToDocument?: (documentId: string) => void  // Navigate to a document
    availableModels?: string[]
    defaultModel?: string
    className?: string
    onCollapsedChange?: (collapsed: boolean) => void
}

export default function ChatSidebar({
    workspaceId,
    projectId,
    currentBoardId,
    currentDocument,
    onAiSuggestion,
    documents = [],
    autoApplyEdits = false,
    onAutoApplyChange,
    onDocumentUpdate,
    onToolExecuted,
    onNavigateToDocument,
    availableModels = [],
    defaultModel,
    className,
    onCollapsedChange
}: ChatSidebarProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [models, setModels] = useState<Model[]>([])
    const [selectedModel, setSelectedModel] = useState("")
    const [useRag, setUseRag] = useState(true)
    const [openModelSelect, setOpenModelSelect] = useState(false)
    const [isContextExpanded, setIsContextExpanded] = useState(false)
    const [selectedContextIds, setSelectedContextIds] = useState<string[]>([])
    const [streamingStatus, setStreamingStatus] = useState<StreamingStatus | null>(null)
    const [openTemplates, setOpenTemplates] = useState(false)
    const [showTemplateSelector, setShowTemplateSelector] = useState(false)
    const [showTemplateForm, setShowTemplateForm] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
    const [isStartingFromTemplate, setIsStartingFromTemplate] = useState(false)
    const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null)
    const [attachments, setAttachments] = useState<any[]>([])
    const [uploadingAttachment, setUploadingAttachment] = useState(false)
    const [contextSearchQuery, setContextSearchQuery] = useState("")
    const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([])
    const [currentStreamingContent, setCurrentStreamingContent] = useState("")
    const [toolExecutions, setToolExecutions] = useState<ToolExecution[]>([])
    const [taskList, setTaskList] = useState<TaskItem[]>([])
    const [iterationInfo, setIterationInfo] = useState<{ current: number; max: number } | null>(null)

    // Sidebar collapsed state
    const [isCollapsed, setIsCollapsed] = useState(false)

    // Conversation history states
    const [showConversationsList, setShowConversationsList] = useState(false)
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
    const [createdDocuments, setCreatedDocuments] = useState<CreatedDocument[]>([])

    // Image variations state (Feature 026)
    const imageVariations = useImageVariations()
    const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const contextRef = useRef<HTMLDivElement>(null)
    const userSelectedModelRef = useRef(false) // Track if user manually selected a model
    const abortControllerRef = useRef<AbortController | null>(null) // For cancelling streaming requests
    const { token, isLoading: authLoading } = useAuthStore()
    const { toast } = useToast()
    const t = useTranslations("chat")
    const tCommon = useTranslations("common")
    const tMemory = useTranslations("memory")

    // User preferences for autonomous mode
    const { preferences } = useUserPreferences(token)

    // Supabase hooks for folders and templates
    const { data: foldersData } = useFolders(projectId || '')
    const folders = foldersData ?? []
    const { data: templatesData } = useTemplates(workspaceId)
    const templates = (templatesData ?? []).slice(0, 10) // Top 10 templates

    // Voice recording hook (Feature 021)
    const {
        status: recordingStatus,
        duration: recordingDuration,
        error: recordingError,
        isSupported: isRecordingSupported,
        startRecording,
        stopRecording,
        cancelRecording,
        setStatus: setRecordingStatus,
        setError: setRecordingError
    } = useVoiceRecording(() => {
        // Warning callback at 4:45
        toast({
            title: "Aviso",
            description: "A gravação será encerrada em 15 segundos.",
            variant: "default"
        })
    })

    const [isModelsRefreshing, setIsModelsRefreshing] = useState(false)

    // Fetch models on mount once token is ready
    useEffect(() => {
        if (authLoading || !token) return
        fetchModels()
    }, [token, authLoading])

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


    // Close context dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contextRef.current && !contextRef.current.contains(event.target as Node)) {
                setIsContextExpanded(false)
            }
        }

        if (isContextExpanded) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isContextExpanded])

    const fetchModels = async () => {
        setIsModelsRefreshing(true)
        try {
            const response = await api.get("/chat/models")
            const { models: fetchedModels, defaultModel: apiDefault } = response.data
            setModels(fetchedModels)
            if (!userSelectedModelRef.current && apiDefault) {
                setSelectedModel(apiDefault)
            }
        } catch (error) {
            console.error("Failed to fetch models", error)
        } finally {
            setIsModelsRefreshing(false)
        }
    }

    const useTemplate = async (template: any) => {
        setInput(template.prompt || '')
        setOpenTemplates(false)
        // Increment usage count via Supabase
        await templateService.incrementUsageCount(template.id)
        toast({ title: "Template carregado!", description: template.name })
    }

    // New template flow - select template then fill form
    const handleSelectTemplate = (template: any) => {
        setSelectedTemplate(template)
        setShowTemplateSelector(false)
        setShowTemplateForm(true)
    }

    const handleTemplateFormBack = () => {
        setShowTemplateForm(false)
        setSelectedTemplate(null)
        setShowTemplateSelector(true)
    }

    const handleStartChatFromTemplate = async (templateId: string, variables: Record<string, string>) => {
        setIsStartingFromTemplate(true)
        try {
            const response = await startChatFromTemplate({
                template_id: templateId,
                variables,
                project_id: projectId,
            })

            // Close forms
            setShowTemplateForm(false)
            setSelectedTemplate(null)

            // Clear current chat and set new conversation
            setMessages([])
            setCurrentConversationId(response.conversation_id)
            setCreatedDocuments([])

            toast({
                title: "Conversa iniciada!",
                description: `Template "${selectedTemplate?.name}" aplicado com sucesso.`
            })

            // If there's a first_message (user's initial request), set it in input and auto-send
            if (response.first_message) {
                // Set the message in input field and trigger send after a brief delay
                setInput(response.first_message)
                // Use setTimeout to ensure state is updated before sending
                setTimeout(() => {
                    const form = document.querySelector('form') as HTMLFormElement
                    if (form) {
                        form.requestSubmit()
                    }
                }, 100)
            }
        } catch (error: any) {
            console.error("Failed to start chat from template:", error)
            toast({
                title: "Erro ao iniciar conversa",
                description: error.response?.data?.detail || "Falha ao aplicar template",
                variant: "destructive"
            })
        } finally {
            setIsStartingFromTemplate(false)
        }
    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    const handleClearChat = async () => {
        // Save current conversation before clearing if there are messages
        if (messages.length > 0 && workspaceId) {
            try {
                const chatMessages = messages.map(m => ({
                    role: m.role,
                    content: m.content,
                    toolExecutions: m.toolExecutions,
                    taskList: m.taskList
                }))

                if (currentConversationId) {
                    // Update existing conversation
                    const { error } = await conversationService.update(currentConversationId, {
                        messages_json: chatMessages,
                        created_document_ids: createdDocuments.map(d => d.id),
                        message_count: chatMessages.length,
                        last_message_at: new Date().toISOString()
                    })
                    if (error) throw error
                } else {
                    // Create new conversation with auto-generated title
                    const firstUserMsg = chatMessages.find(m => m.role === 'user')
                    const title = firstUserMsg ? generateTitleFromMessage(firstUserMsg.content) : undefined
                    const { error } = await conversationService.create({
                        workspace_id: workspaceId,
                        project_id: projectId || null,
                        title,
                        messages_json: chatMessages,
                        model_used: selectedModel,
                        document_ids_context: selectedContextIds,
                        folder_ids_context: selectedFolderIds,
                        message_count: chatMessages.length,
                        last_message_at: new Date().toISOString()
                    })
                    if (error) throw error
                }
            } catch (error) {
                console.error("Failed to save conversation:", error)
            }
        }

        setMessages([])
        setCurrentConversationId(null)
        setCreatedDocuments([])
        userSelectedModelRef.current = false // Reset so defaultModel can take effect again
        toast({ title: "Nova conversa", description: "Conversa anterior salva no histórico." })
    }

    const handleLoadConversation = async (conversationId: string) => {
        try {
            const { data: conversation, error } = await conversationService.get(conversationId)
            if (error) throw error
            if (!conversation) throw new Error("Conversation not found")

            const messages_json = conversation.messages_json || []
            setMessages(messages_json.map((m: any) => ({
                role: m.role as "user" | "assistant" | "system",
                content: m.content,
                toolExecutions: m.toolExecutions,
                taskList: m.taskList
            })))
            setCurrentConversationId(conversationId)
            setSelectedModel(conversation.model_used || selectedModel)
            setSelectedContextIds(conversation.document_ids_context || [])
            setSelectedFolderIds(conversation.folder_ids_context || [])
            setCreatedDocuments([]) // Clear created documents for loaded conversation
            setShowConversationsList(false)
            toast({ title: "Conversa carregada", description: "Continuando conversa anterior" })
        } catch (error) {
            console.error("Failed to load conversation:", error)
            toast({ title: "Erro", description: "Falha ao carregar conversa", variant: "destructive" })
        }
    }

    const handleDocumentCreated = async (docId: string, docTitle: string, docType: "text" | "image") => {
        setCreatedDocuments(prev => [...prev, { id: docId, title: docTitle, type: docType }])

        // Also track in current conversation via backend (uses addCreatedDocument endpoint)
        if (currentConversationId) {
            try {
                await api.post(`/conversations/${currentConversationId}/add-document`, null, {
                    params: { document_id: docId }
                })
            } catch (error) {
                console.error("Failed to add document to conversation:", error)
            }
        }
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

    // Filter documents and folders by search query, removing duplicates
    // Exclude images - only show text documents as context
    const filteredDocuments = useMemo(() => {
        const seen = new Set<string>()
        return documents.filter(d => {
            if (seen.has(d.id)) return false
            seen.add(d.id)
            return d.id !== currentDocument?.id &&
                d.media_type !== 'image' &&
                (!contextSearchQuery || d.title.toLowerCase().includes(contextSearchQuery.toLowerCase()))
        })
    }, [documents, currentDocument?.id, contextSearchQuery])

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

    // Voice input handler (Feature 021)
    const handleVoiceInput = async () => {
        if (recordingStatus === 'recording') {
            // Stop recording and transcribe
            const audioBlob = await stopRecording()
            if (audioBlob) {
                try {
                    const result = await transcribeAudio(audioBlob)
                    // Append transcribed text to existing input with space separator
                    setInput(prev => prev ? `${prev} ${result.text}` : result.text)
                    setRecordingStatus('idle')
                    toast({
                        title: "Transcrição concluída",
                        description: `Processado em ${result.processing_time_ms}ms`
                    })
                } catch (err: any) {
                    setRecordingStatus('error')
                    const errorMessage = err.response?.data?.message || "Falha ao transcrever. Tente novamente."
                    setRecordingError(errorMessage)
                    toast({
                        title: "Erro na transcrição",
                        description: errorMessage,
                        variant: "destructive"
                    })
                }
            }
        } else if (recordingStatus === 'idle' || recordingStatus === 'error') {
            // Start recording
            await startRecording()
        }
    }

    // Format duration as MM:SS
    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Cancel ongoing streaming request
    const handleCancelStream = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
            setIsLoading(false)
            setStreamingStatus(null)
            setCurrentStreamingContent("")
            toast({
                title: t("operationCancelled"),
                description: t("operationCancelledDescription"),
            })
        }
    }

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        // Allow sending if there's text OR attachments
        if ((!input.trim() && attachments.length === 0) || isLoading) return

        // Feature 025: Removed console.log statements that exposed sensitive data

        const userMessage: Message = { role: "user", content: input }
        setMessages((prev) => [...prev, userMessage])
        setInput("")
        setIsLoading(true)
        setStreamingStatus({ status: "Iniciando..." })
        setCurrentStreamingContent("")  // Clear previous streaming content
        setToolExecutions([])  // Clear previous tool executions
        setTaskList([])  // Clear previous task list
        setIterationInfo(null)  // Clear iteration info
        imageVariations.reset()  // Clear previous image variations (Feature 026)
        setSelectedVariationId(null)  // Clear selected variation

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
                workspace_id: workspaceId,
                conversation_id: currentConversationId,
                project_id: projectId,
                active_board_id: currentBoardId || null,
                use_rag: useRag,
                document_ids: useRag ? selectedContextIds : [],
                folder_ids: useRag ? selectedFolderIds : [],
                autonomous_mode: preferences?.autonomous_mode ?? false
            }

            // Clear attachments after adding to message
            setAttachments([])

            // Feature 028: Always pass current_document_id for auto-attach of generated images
            // Even without RAG, we want to know which document is being edited
            if (currentDocument) {
                // For RAG context, include full document info
                if (useRag) {
                    contextData.current_document = {
                        id: currentDocument.id,
                        title: currentDocument.title,
                        content: currentDocument.content || ""
                    }
                }
                // Always include current_document_id for auto-attach functionality
                contextData.current_document_id = currentDocument.id
            }

            // Use streaming endpoint
            const apiUrl = buildApiUrl("/chat/completion-stream")

            // Create AbortController for cancellation support
            abortControllerRef.current = new AbortController()

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(contextData),
                signal: abortControllerRef.current.signal
            })

            if (!response.ok) {
                const errorText = await response.text()
                console.error('❌ Response not OK:', errorText)
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()
            let currentContent = ""
            let localToolExecutions: ToolExecution[] = []
            let localTaskList: TaskItem[] = []
            let streamDone = false
            let activeConversationId = currentConversationId

            if (!reader) throw new Error("No reader available")

            while (!streamDone) {
                const { done, value } = await reader.read()
                if (done || streamDone) {
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

                            switch (event.type) {
                                case 'status':
                                    setStreamingStatus({ status: event.message })
                                    break

                                case 'conversation_created':
                                    if (event.conversation_id) {
                                        activeConversationId = event.conversation_id
                                        setCurrentConversationId(event.conversation_id)
                                    }
                                    break

                                case 'iteration':
                                    setIterationInfo({ current: event.current, max: event.max })
                                    break

                                case 'iteration_limit':
                                    setIterationInfo({ current: event.current, max: event.max })
                                    break

                                case 'task_list':
                                    // Receive planned task list
                                    const newTaskList = event.tasks.map((task: any) => ({
                                        id: task.id,
                                        description: task.description,
                                        tool_name: task.tool_name,
                                        status: task.status
                                    }))
                                    localTaskList = newTaskList
                                    setTaskList(newTaskList)
                                    break

                                case 'task_update':
                                    // Update individual task status
                                    localTaskList = localTaskList.map(task =>
                                        task.id === event.task_id
                                            ? { ...task, status: event.status }
                                            : task
                                    )
                                    setTaskList(localTaskList)
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
                                    localToolExecutions = [...localToolExecutions, pendingExecution]
                                    setToolExecutions(localToolExecutions)
                                    break

                                case 'tool_approved':
                                    setStreamingStatus({ status: `Ferramenta aprovada: ${event.tool}` })
                                    // Update pending tool execution to executing
                                    localToolExecutions = localToolExecutions.map(exec => {
                                        if (exec.tool === event.tool && exec.status === "pending") {
                                            return { ...exec, status: "executing" }
                                        }
                                        return exec
                                    })
                                    setToolExecutions(localToolExecutions)
                                    break

                                case 'tool_auto_approved':
                                    setStreamingStatus({ status: `Auto-executando: ${event.tool}` })
                                    // In autonomous mode, add tool execution card directly as executing
                                    const autoExecution: ToolExecution = {
                                        id: `${event.tool}-${Date.now()}-auto`,
                                        tool: event.tool,
                                        status: "executing",
                                        timestamp: new Date().toISOString()
                                    }
                                    localToolExecutions = [...localToolExecutions, autoExecution]
                                    setToolExecutions(localToolExecutions)
                                    break

                                case 'tool_rejected':
                                    setStreamingStatus({ status: `Ferramenta recusada: ${event.tool}` })
                                    // Update pending tool execution to error
                                    localToolExecutions = localToolExecutions.map(exec => {
                                        if (exec.tool === event.tool && exec.status === "pending") {
                                            return { ...exec, status: "error", result: "Rejected by user" }
                                        }
                                        return exec
                                    })
                                    setToolExecutions(localToolExecutions)
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
                                    {
                                        const matchingIndex = localToolExecutions.findIndex(exec =>
                                            exec.id === event.tool_call_id ||
                                            (exec.tool === event.tool && (exec.status === "pending" || exec.status === "executing"))
                                        )

                                        if (matchingIndex >= 0) {
                                            localToolExecutions = localToolExecutions.map((exec, index) =>
                                                index === matchingIndex
                                                    ? {
                                                        ...exec,
                                                        id: event.tool_call_id || exec.id,
                                                        args: event.args,
                                                        status: "executing",
                                                        timestamp: exec.timestamp || new Date().toISOString(),
                                                        index: event.index,
                                                        total: event.total
                                                    }
                                                    : exec
                                            )
                                            setToolExecutions(localToolExecutions)
                                        } else {
                                            const newExecution: ToolExecution = {
                                                id: event.tool_call_id || `${event.tool}-${Date.now()}-${event.index || 0}`,
                                                tool: event.tool,
                                                args: event.args,
                                                status: "executing",
                                                timestamp: new Date().toISOString(),
                                                index: event.index,
                                                total: event.total
                                            }
                                            localToolExecutions = [...localToolExecutions, newExecution]
                                            setToolExecutions(localToolExecutions)
                                        }
                                    }
                                    break

                                case 'tool_complete':
                                    setStreamingStatus({
                                        status: `Completado: ${event.tool}`,
                                        tool: event.tool,
                                        completed: true
                                    })

                                    // Update tool execution card
                                    localToolExecutions = localToolExecutions.map(exec => {
                                        if (
                                            (event.tool_call_id && exec.id === event.tool_call_id) ||
                                            (!event.tool_call_id && exec.tool === event.tool && exec.status === "executing")
                                        ) {
                                            return {
                                                ...exec,
                                                id: event.tool_call_id || exec.id,
                                                status: "completed",
                                                result: event.result,
                                                duration: event.duration_ms
                                            }
                                        }
                                        return exec
                                    })
                                    setToolExecutions(localToolExecutions)

                                    // Trigger refresh for tools that modify the file system or edit documents
                                    const refreshTools = [
                                        'create_document', 'create_folder',
                                        'move_file', 'move_folder',
                                        'delete_file', 'delete_folder',
                                        'rename_document', 'rename_folder',
                                        'list_boards', 'create_board',
                                        'move_file_to_board', 'move_board',
                                        'rename_board', 'delete_board',
                                        'generate_image', 'attach_image_to_document',
                                        'edit_document'  // Include edit_document to update editor in real-time
                                    ]
                                    if (onToolExecuted && refreshTools.includes(event.tool)) {
                                        await onToolExecuted(event.tool, event.result)
                                        window.dispatchEvent(new CustomEvent('workspace-sidebar-refresh'))
                                    }

                                    // Track created documents for navigation links
                                    if (event.tool === 'create_document' && event.result?.id) {
                                        setCreatedDocuments(prev => [...prev, {
                                            id: event.result.id,
                                            title: event.result.title || "Novo documento",
                                            type: "text"
                                        }])
                                    } else if (event.tool === 'generate_image' && event.result?.image_document_id) {
                                        setCreatedDocuments(prev => [...prev, {
                                            id: event.result.image_document_id,
                                            title: event.result.title || "Nova imagem",
                                            type: "image"
                                        }])

                                        // Feature 028: Show toast for auto-attach
                                        if (event.result?.attached_to_document_id) {
                                            // Check if a new document was created
                                            if (event.result?.created_document_id) {
                                                toast({
                                                    title: "Documento Criado",
                                                    description: `Documento "${event.result.created_document_title || 'Novo Criativo'}" criado com imagem anexada.`,
                                                })
                                            } else {
                                                toast({
                                                    title: "Imagem Anexada",
                                                    description: `Imagem anexada automaticamente ao documento.`,
                                                })
                                            }
                                        }

                                        // T046: Show visual context feedback
                                        if (event.result?.visual_context?.asset_count) {
                                            toast({
                                                title: "Contexto Visual Aplicado",
                                                description: `${event.result.visual_context.asset_count} assets visuais foram usados como referência na geração.`,
                                            })
                                        }
                                    }
                                    break

                                case 'tool_error':
                                    // Update tool execution card with error
                                    localToolExecutions = localToolExecutions.map(exec => {
                                        if (
                                            (event.tool_call_id && exec.id === event.tool_call_id) ||
                                            (!event.tool_call_id && exec.tool === event.tool && exec.status === "executing")
                                        ) {
                                            return {
                                                ...exec,
                                                id: event.tool_call_id || exec.id,
                                                status: "error",
                                                result: event.error || "Unknown error"
                                            }
                                        }
                                        return exec
                                    })
                                    setToolExecutions(localToolExecutions)
                                    break

                                case 'message_chunk':
                                    // Accumulate streaming content
                                    currentContent += event.content
                                    setCurrentStreamingContent(currentContent)
                                    break

                                case 'done':
                                    // IMMEDIATELY mark stream as done and update UI
                                    streamDone = true
                                    setIsLoading(false)
                                    setStreamingStatus(null)
                                    setCurrentStreamingContent("")
                                    setToolExecutions([])
                                    setTaskList([])

                                    // Add final message to history with tool executions and task list
                                    const newAssistantMessage = {
                                        role: "assistant" as const,
                                        content: currentContent || "",
                                        isStreaming: false,
                                        toolExecutions: localToolExecutions.length > 0 ? [...localToolExecutions] : undefined,
                                        taskList: localTaskList.length > 0 ? [...localTaskList] : undefined
                                    }

                                    if (currentContent.trim() || localToolExecutions.length > 0) {
                                        setMessages((prev) => [...prev, newAssistantMessage])
                                    }

                                    // Save conversation to database (async, non-blocking)
                                    if (workspaceId) {
                                        const allMessages = [...messages, userMessage]
                                        if (currentContent.trim() || localToolExecutions.length > 0) {
                                            allMessages.push(newAssistantMessage)
                                        }
                                        const chatMessages = allMessages.map(m => ({
                                            role: m.role,
                                            content: m.content,
                                            toolExecutions: m.toolExecutions,
                                            taskList: m.taskList
                                        }))

                                        // Fire and forget - don't block UI
                                        ;(async () => {
                                            try {
                                                if (activeConversationId) {
                                                    await conversationService.update(activeConversationId, {
                                                        messages_json: chatMessages,
                                                        model_used: selectedModel,
                                                        message_count: chatMessages.length,
                                                        last_message_at: new Date().toISOString()
                                                    })
                                                } else {
                                                    const firstUserMsg = chatMessages.find(m => m.role === 'user')
                                                    const title = firstUserMsg ? generateTitleFromMessage(firstUserMsg.content) : undefined
                                                    const { data, error } = await conversationService.create({
                                                        workspace_id: workspaceId,
                                                        project_id: projectId || null,
                                                        title,
                                                        messages_json: chatMessages,
                                                        model_used: selectedModel,
                                                        document_ids_context: selectedContextIds,
                                                        folder_ids_context: selectedFolderIds,
                                                        message_count: chatMessages.length,
                                                        last_message_at: new Date().toISOString()
                                                    })
                                                    if (!error && data) {
                                                        activeConversationId = data.id
                                                        setCurrentConversationId(data.id)
                                                    }
                                                }
                                            } catch (saveError) {
                                                console.error("Failed to save conversation:", saveError)
                                            }
                                        })()
                                    }

                                    // Trigger document update (async, non-blocking)
                                    const editedCurrentDoc = localToolExecutions.some(
                                        exec => exec.tool === 'edit_document' &&
                                               exec.status === 'completed' &&
                                               exec.args?.document_id === currentDocument?.id
                                    )
                                    if (editedCurrentDoc && currentDocument?.id && onDocumentUpdate) {
                                        onDocumentUpdate(currentDocument.id).catch(updateErr => {
                                            console.error('Failed to update document after edit:', updateErr)
                                        })
                                    }
                                    break

                                case 'memory_saved':
                                    // Memory extraction now runs fully in background
                                    // No action needed here - memories will be refreshed when user opens the panel
                                    break

                                // Feature 026: Image variation events
                                case 'variation_started':
                                    imageVariations.handleVariationEvent(event)
                                    setStreamingStatus({ status: `Gerando ${event.data.total_variations} variações de imagem...` })
                                    break

                                case 'variation_complete':
                                    imageVariations.handleVariationEvent(event)
                                    setStreamingStatus({
                                        status: `Variação ${event.data.variation_index + 1}/${event.data.total_variations} concluída`
                                    })
                                    // Track completed variation document
                                    if (event.data.document_id) {
                                        setCreatedDocuments(prev => [...prev, {
                                            id: event.data.document_id,
                                            title: event.data.title || `Variação ${event.data.variation_index + 1}`,
                                            type: "image"
                                        }])
                                    }
                                    break

                                case 'variation_failed':
                                    imageVariations.handleVariationEvent(event)
                                    toast({
                                        title: "Variação falhou",
                                        description: `Erro na variação ${event.data.variation_index + 1}: ${event.data.error}`,
                                        variant: "destructive"
                                    })
                                    break

                                case 'all_variations_complete':
                                    imageVariations.handleVariationEvent(event)
                                    {
                                        const data = event.data
                                        if (data.total_failed > 0) {
                                            toast({
                                                title: "Geração de variações concluída",
                                                description: `${data.total_completed} variações geradas, ${data.total_failed} falharam`,
                                                variant: "default"
                                            })
                                        } else {
                                            toast({
                                                title: "Variações geradas!",
                                                description: `${data.total_completed} variações de imagem criadas com sucesso`,
                                            })
                                        }
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
            // Don't show error if request was cancelled by user
            if (error.name === 'AbortError') {
                console.log("Request cancelled by user")
                return
            }

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
            abortControllerRef.current = null
            setIsLoading(false)
            setStreamingStatus(null)
        }
    }

    const floatingGlassClasses = cn(
        "flex flex-col w-[320px]",
        "bg-surface-secondary dark:bg-surface-secondary",
        "border border-border/60",
        "rounded-xl",
        "overflow-hidden",
        "shadow-sm",
        className
    )

    // Show conversations list when active
    if (showConversationsList) {
        return (
            <div className={floatingGlassClasses}>
                <ConversationsList
                    workspaceId={workspaceId}
                    projectId={projectId}
                    onSelectConversation={handleLoadConversation}
                    onClose={() => setShowConversationsList(false)}
                />
            </div>
        )
    }

    // Collapsed state — only the button floats; no bar, content shows behind
    if (isCollapsed) {
        return (
            <div className={cn("absolute right-0 top-0 bottom-0 flex items-center justify-center pointer-events-none", className)}>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-xl border border-border/60 bg-surface-secondary shadow-sm pointer-events-auto"
                    onClick={() => { setIsCollapsed(false); onCollapsedChange?.(false) }}
                    title="Expandir chat"
                >
                    <Bot className="h-4 w-4" />
                </Button>
            </div>
        )
    }

    return (
        <div className={floatingGlassClasses}>
            {/* Header — single line */}
            <div className="px-3 py-2.5 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bot className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                    <span className="text-xs font-semibold tracking-wide text-foreground/80">{t("title")}</span>
                </div>
                <div className="flex items-center gap-0.5">
                    {/* Menu dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            >
                                <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleClearChat}>
                                <Plus className="h-4 w-4 mr-2" />
                                {t("newConversation")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShowConversationsList(true)}>
                                <History className="h-4 w-4 mr-2" />
                                {t("conversationHistory")}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {/* Collapse button */}
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => { setIsCollapsed(true); onCollapsedChange?.(true) }}
                        title="Recolher chat"
                    >
                        <PanelRightClose className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* Context Selection */}
            <div className="px-3 py-2 border-b border-border/50">
                <div ref={contextRef} className="border rounded-lg p-2 bg-muted/30">
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
                            {/* Visual assets are now always auto-injected (Feature 028) */}
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
                                <label htmlFor="useRag">{t("enableContext")}</label>
                            </div>

                            {useRag && (
                                <>
                                    {/* Search bar */}
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                        <Input
                                            placeholder={t("searchContext")}
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
                                                <Badge variant="secondary" className="text-[11px] h-4 px-1">{t("currentDocument")}</Badge>
                                            </div>
                                        )}

                                        {/* Folders section */}
                                        {filteredFolders.length > 0 && (
                                            <>
                                                <div className="text-[11px] text-muted-foreground mt-2 mb-1 px-1 font-medium">{t("foldersSection")}</div>
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
                                                    </div>
                                                ))}
                                            </>
                                        )}

                                        {/* Documents section */}
                                        <div className="text-[11px] text-muted-foreground mt-2 mb-1 px-1 font-medium">{t("documentsSection")}</div>
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
                                                {contextSearchQuery ? t("noResultsFound") : t("noContextAvailable")}
                                            </div>
                                        )}
                                    </div>

                                    {/* Visual Context Section - Feature 028: Now automatic */}
                                    {projectId && (
                                        <>
                                            <div className="border-t border-border/50 my-3" />
                                            <VisualContextSelector projectId={projectId} />
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`p-2 rounded-lg max-w-[80%] text-sm ${msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                            }`}>
                            {msg.role === "assistant" ? (
                                <div className="space-y-3">
                                    {/* Task List from completed message */}
                                    {msg.taskList && msg.taskList.length > 0 && (
                                        <TaskListCard tasks={msg.taskList} />
                                    )}

                                    {/* Tool Execution Cards from completed message */}
                                    {msg.toolExecutions && msg.toolExecutions.length > 0 && (
                                        <div className="space-y-2">
                                            {msg.toolExecutions.map(execution => (
                                                <ToolExecutionCard
                                                    key={execution.id}
                                                    id={execution.id}
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

                                    {/* Message content */}
                                    {msg.content && (
                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                msg.content
                            )}
                            {msg.role === "assistant" && onAiSuggestion && msg.content && (
                                <div className="mt-2 pt-2 border-t border-border/50 flex justify-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs px-2"
                                        onClick={() => onAiSuggestion(msg.content)}
                                    >
                                        {t("suggestEdit")}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Thinking Block - Always visible when loading */}
                {isLoading && (
                    <div className="flex gap-2">
                        <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl max-w-[85%] space-y-3">
                            {/* Header with animated icon */}
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <Bot className="h-4 w-4 text-primary animate-pulse shrink-0" />
                                <span className="text-text-primary">
                                    {streamingStatus?.tool
                                        ? `${t("executing")} ${streamingStatus.tool}`
                                        : streamingStatus?.status || t("generatingResponse")}
                                </span>
                                {iterationInfo && (
                                    <Badge variant="outline" className="ml-auto text-[11px] px-1.5 py-0.5">
                                        {iterationInfo.current}/{iterationInfo.max}
                                    </Badge>
                                )}
                            </div>

                            {/* Streaming text content */}
                            {currentStreamingContent && (
                                <div className="prose prose-sm max-w-none dark:prose-invert ml-6">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {currentStreamingContent}
                                    </ReactMarkdown>
                                    <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-1 align-middle rounded-sm" />
                                </div>
                            )}

                            {/* Task List Card - Visual plan of execution */}
                            {taskList.length > 0 && (
                                <div className="ml-6">
                                    <TaskListCard tasks={taskList} />
                                </div>
                            )}

                            {/* Tool Execution Cards */}
                            {toolExecutions.length > 0 && (
                                <div className="ml-6 space-y-2">
                                    {toolExecutions.map(execution => (
                                        <ToolExecutionCard
                                            key={execution.id}
                                            id={execution.id}
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

                            {/* Image Variation Grid (Feature 026) */}
                            {imageVariations.totalVariations > 0 && (
                                <div className="ml-6">
                                    <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                        <Image className="h-3 w-3" />
                                        Variações de Imagem
                                        {imageVariations.isGenerating && (
                                            <span className="text-blue-500">
                                                ({imageVariations.completionProgress}%)
                                            </span>
                                        )}
                                    </div>
                                    <ImageVariationGrid
                                        totalVariations={imageVariations.totalVariations}
                                        completedVariations={imageVariations.completedVariations}
                                        failedVariations={imageVariations.failedVariations}
                                        isGenerating={imageVariations.isGenerating}
                                        onSelect={(variation) => {
                                            setSelectedVariationId(variation.id)
                                            if (onNavigateToDocument) {
                                                onNavigateToDocument(variation.documentId)
                                            }
                                        }}
                                        selectedId={selectedVariationId || undefined}
                                    />
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
                                            <Badge variant="secondary" className="text-[11px] h-5 px-1.5">
                                                {streamingStatus.index}/{streamingStatus.total}
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Tool arguments preview */}
                                    {streamingStatus.args && (
                                        <div className="text-[11px] text-muted-foreground font-mono bg-background/40 p-1.5 rounded border border-border/30">
                                            {JSON.stringify(streamingStatus.args).slice(0, 100)}
                                            {JSON.stringify(streamingStatus.args).length > 100 && "..."}
                                        </div>
                                    )}

                                    {streamingStatus.completed && (
                                        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-medium">
                                            <div className="flex items-center justify-center h-4 w-4 bg-green-600/10 rounded-full">
                                                <Check className="h-2.5 w-2.5" />
                                            </div>
                                            <span>{t("completed")}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Progress indicator */}
                            <div className="h-0.5 w-full bg-border/60 rounded-full overflow-hidden">
                                <div className="h-full w-1/3 bg-primary/50 rounded-full animate-pulse" />
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
                                    {t("approvalRequired")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="text-sm">
                                    <p className="font-medium mb-2">{t("aiWantsToExecute")}</p>
                                    <div className="flex items-center gap-2 bg-background/60 px-3 py-2 rounded border">
                                        <FileText className="h-4 w-4 text-amber-600" />
                                        <span className="font-mono font-medium">{pendingApproval.tool}</span>
                                        {pendingApproval.index && pendingApproval.total && (
                                            <Badge variant="secondary" className="text-[11px] h-5 px-1.5 ml-auto">
                                                {pendingApproval.index}/{pendingApproval.total}
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {pendingApproval.args && (
                                    <div className="text-xs">
                                        {pendingApproval.tool === 'edit_document' && pendingApproval.args.content ? (
                                            <>
                                                <p className="text-muted-foreground mb-1">{t("documentLabel")} <span className="font-medium">{pendingApproval.args.title || 'Sem título'}</span></p>
                                                <div className="bg-background/40 p-3 rounded border max-h-40 overflow-y-auto">
                                                    <p className="text-muted-foreground mb-1 text-[11px]">{t("newContent")}</p>
                                                    <div className="prose prose-xs dark:prose-invert max-w-none">
                                                        {pendingApproval.args.content.substring(0, 300)}
                                                        {pendingApproval.args.content.length > 300 && '...'}
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-muted-foreground mb-1">{t("parameters")}</p>
                                                <div className="font-mono bg-background/40 p-2 rounded border text-[11px] max-h-20 overflow-y-auto">
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
                                        {t("approve")}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleApprovalResponse(false)}
                                        className="flex-1"
                                    >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        {t("reject")}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Created Documents Navigation */}
                {createdDocuments.length > 0 && !isLoading && (
                    <div className="flex flex-col gap-2 px-2">
                        <div className="text-xs font-medium text-muted-foreground">
                            {t("createdDocuments")}
                        </div>
                        {createdDocuments.map((doc, index) => (
                            <motion.div
                                key={doc.id}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(index * 0.06, 0.18) }}
                                className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2"
                            >
                                {doc.type === "image" ? (
                                    <Image className="h-4 w-4 text-primary/70 flex-shrink-0" />
                                ) : (
                                    <FileText className="h-4 w-4 text-primary/70 flex-shrink-0" />
                                )}
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-[11px] text-muted-foreground">
                                        {doc.type === "image" ? t("imageCreated") : t("documentCreated")}
                                    </span>
                                    <span className="text-xs font-medium truncate">
                                        {doc.title}
                                    </span>
                                </div>
                                {onNavigateToDocument && (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => onNavigateToDocument(doc.id)}
                                        className="gap-1 h-6 text-[11px] px-2"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        {t("view")}
                                    </Button>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-border/50">
                {/* Attachments preview */}
                {attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                        {attachments.map((att, index) => (
                            <div key={index} className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg text-xs">
                                <FileText className="h-3 w-3" />
                                <span className="max-w-[150px] truncate">{att.filename}</span>
                                <Badge variant="secondary" className="text-[11px] h-4 px-1">
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

                <form onSubmit={handleSend}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    {/* Container integrado estilo ChatGPT/Claude */}
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
                        {/* Textarea limpo */}
                        <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSend(e as any)
                                }
                            }}
                            placeholder={t("placeholder")}
                            disabled={isLoading}
                            className="min-h-[60px] max-h-[200px] resize-none w-full border-0 bg-transparent px-4 py-3 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0 focus-visible:bg-transparent hover:border-0 hover:bg-transparent transition-none"
                            rows={2}
                        />

                        {/* Barra de ações integrada */}
                        <div className="flex items-center gap-1 px-2 py-2 border-t border-white/[0.04]">
                            {/* Botões de ação à esquerda - icon only */}
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => setShowTemplateSelector(true)}
                                disabled={isLoading}
                                title={t("useTemplate")}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
                            >
                                <Sparkles className="h-4 w-4" />
                            </Button>

                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={handleAttachmentClick}
                                disabled={isLoading || uploadingAttachment}
                                title={t("attachFile")}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
                            >
                                <Paperclip className={cn("h-4 w-4", uploadingAttachment && "animate-spin")} />
                            </Button>

                            {/* Voice Input Button */}
                            {isRecordingSupported && (
                                <AnimatePresence mode="wait">
                                    {recordingStatus === 'recording' ? (
                                        <motion.div
                                            key="recording-bar"
                                            initial={{ opacity: 0, width: 0 }}
                                            animate={{ opacity: 1, width: 'auto' }}
                                            exit={{ opacity: 0, width: 0 }}
                                            className="flex items-center gap-2 px-2"
                                        >
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                onClick={handleVoiceInput}
                                                title={t("stopRecording")}
                                                className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                            >
                                                <Square className="h-4 w-4" />
                                            </Button>
                                            <span className="tabular-nums text-xs text-red-400 font-medium">
                                                {formatDuration(recordingDuration)}
                                            </span>
                                            <motion.span
                                                animate={{ opacity: [1, 0.3, 1] }}
                                                transition={{ repeat: Infinity, duration: 1 }}
                                                className="h-2 w-2 rounded-full bg-red-500"
                                            />
                                        </motion.div>
                                    ) : recordingStatus === 'processing' ? (
                                        <motion.div
                                            key="processing"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                disabled
                                                className="h-8 w-8 text-muted-foreground"
                                            >
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            </Button>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="idle"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                onClick={handleVoiceInput}
                                                disabled={isLoading}
                                                title={t("recordAudio")}
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
                                            >
                                                <Mic className="h-4 w-4" />
                                            </Button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            )}

                            <div className="flex-1" />

                            {/* Model selector — subtle, bottom bar */}
                            <Popover open={openModelSelect} onOpenChange={setOpenModelSelect}>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className="flex items-center gap-1 px-1.5 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors max-w-[90px]"
                                        title={models.find(m => m.id === selectedModel)?.name || selectedModel}
                                    >
                                        <span className="truncate">
                                            {selectedModel
                                                ? (models.find(m => m.id === selectedModel)?.name || selectedModel.split('/').pop())
                                                : t("model")}
                                        </span>
                                        <ChevronsUpDown className="h-2.5 w-2.5 shrink-0 opacity-50" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[220px] p-0" align="end" side="top">
                                    <Command>
                                        <CommandInput placeholder={t("searchModels")} />
                                        <CommandList>
                                            <CommandEmpty>{t("noModelsFound")}</CommandEmpty>
                                            {models.length === 0 ? (
                                                <div className="py-6 text-center text-sm text-muted-foreground">
                                                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                                                    {t("loadingModels")}
                                                </div>
                                            ) : (
                                                <>
                                                    {availableModels.length > 0 && (
                                                        <>
                                                            <CommandGroup heading={t("recommended")}>
                                                                {models.filter(m => availableModels.includes(m.id)).map(m => (
                                                                    <CommandItem key={m.id} value={m.name} onSelect={() => { userSelectedModelRef.current = true; setSelectedModel(m.id); setOpenModelSelect(false) }}>
                                                                        <Check className={cn("mr-2 h-4 w-4", selectedModel === m.id ? "opacity-100" : "opacity-0")} />
                                                                        {m.name}
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                            <CommandSeparator />
                                                        </>
                                                    )}
                                                    <CommandGroup heading={availableModels.length > 0 ? t("allModels") : undefined}>
                                                        {models.filter(m => !availableModels.includes(m.id)).map(m => (
                                                            <CommandItem key={m.id} value={m.name} onSelect={() => { userSelectedModelRef.current = true; setSelectedModel(m.id); setOpenModelSelect(false) }}>
                                                                <Check className={cn("mr-2 h-4 w-4", selectedModel === m.id ? "opacity-100" : "opacity-0")} />
                                                                {m.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </>
                                            )}
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>

                            {/* Botão enviar/cancelar à direita */}
                            {isLoading ? (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={handleCancelStream}
                                    className="h-8 px-3 gap-1.5"
                                >
                                    <Square className="h-3.5 w-3.5" />
                                    <span className="text-xs">{t("cancel")}</span>
                                </Button>
                            ) : (
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={!input.trim() && attachments.length === 0}
                                    className="h-8 px-3 gap-1.5 bg-primary/90 hover:bg-primary"
                                >
                                    <Send className="h-3.5 w-3.5" />
                                    <span className="text-xs">{t("send")}</span>
                                </Button>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            {/* Template Selector Modal */}
            <TemplateSelector
                open={showTemplateSelector}
                onOpenChange={setShowTemplateSelector}
                templates={templatesData ?? []}
                isLoading={false}
                onSelectTemplate={handleSelectTemplate}
            />

            {/* Template Form Modal */}
            <TemplateForm
                open={showTemplateForm}
                onOpenChange={setShowTemplateForm}
                template={selectedTemplate}
                onSubmit={handleStartChatFromTemplate}
                onBack={handleTemplateFormBack}
                isSubmitting={isStartingFromTemplate}
            />

        </div >
    )
}
