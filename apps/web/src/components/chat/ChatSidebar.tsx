/**
 * ChatSidebar Component
 *
 * Core chat interface with SSE streaming, tool execution, approval flow,
 * conversation management, voice input, image variations, and template support.
 *
 * Ported from: frontend/src/components/ChatSidebar.tsx (1,996 lines)
 *
 * Changes from original:
 * - Removed 'use client' directive (Vite, not Next.js)
 * - Replaced useTranslations (next-intl) with hardcoded English strings
 * - Replaced useAuthStore with supabase.auth.getSession()
 * - Replaced useToast with toast from sonner
 * - Replaced process.env.NEXT_PUBLIC_API_URL with import.meta.env.VITE_API_URL
 * - Added /api/ prefix to API endpoints (NestJS backend)
 * - Used unknown instead of any where practical
 */

import { useState, useEffect, useRef, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import api, { startChatFromTemplate, transcribeAudio } from "@/lib/api"
import {
    getModelsCache,
    setModelsCache,
    isModelsCacheStale,
    type CachedModel,
} from "@/lib/models-cache"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Send,
    Bot,
    Settings,
    FileText,
    ChevronDown,
    ChevronUp,
    Trash2,
    Check,
    ChevronsUpDown,
    Paperclip,
    Sparkles,
    Folder,
    Search,
    X,
    History,
    ExternalLink,
    Image,
    MoreVertical,
    Plus,
    Loader2,
    Mic,
    Square,
    Brain,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
// Tooltip components available if needed:
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import ToolExecutionCard from "@/components/chat/ToolExecutionCard"
import TaskListCard, { type TaskItem } from "@/components/chat/TaskListCard"
import { useUserPreferences } from "@/hooks/useUserPreferences"
import ConversationsList from "@/components/chat/ConversationsList"
import { conversationService } from "@/lib/supabase/conversations"
import VisualContextSelector from "@/components/visual-assets/VisualContextSelector"
import { TemplateSelector, TemplateForm } from "@/components/templates"
import { useVoiceRecording } from "@/hooks/useVoiceRecording"
import { MemoryDrawer } from "@/components/memory/MemoryDrawer"
import { useImageVariations } from "@/hooks/useImageVariations"
import { ImageVariationGrid } from "@/components/chat/ImageVariationGrid"
import type { ImageVariation } from "@/types/image-variations"
import { useFolders } from "@/hooks/use-folders"
import { useTemplates } from "@/hooks/use-templates"

// ============================================================================
// Helpers
// ============================================================================

/** Generate a title from the first user message (truncate at ~50 chars on word boundary) */
function generateTitleFromMessage(content: string): string {
    const cleaned = content.trim().replace(/\s+/g, " ")
    if (cleaned.length <= 50) return cleaned
    const truncated = cleaned.substring(0, 50)
    const lastSpace = truncated.lastIndexOf(" ")
    return (lastSpace > 20 ? truncated.substring(0, lastSpace) : truncated) + "..."
}

// ============================================================================
// Types
// ============================================================================

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
    args?: unknown
    index?: number
    total?: number
    completed?: boolean
}

interface PendingApproval {
    approval_id: string
    tool: string
    args: Record<string, unknown>
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
    args?: Record<string, unknown>
    result?: unknown
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

interface Attachment {
    filename: string
    type: string
    [key: string]: unknown
}

// ============================================================================
// Props
// ============================================================================

interface ChatSidebarProps {
    workspaceId: string
    projectId?: string
    currentDocument?: { id: string; title: string; content?: string } | null
    onAiSuggestion?: (content: string) => void
    documents?: Document[]
    autoApplyEdits?: boolean
    onAutoApplyChange?: (value: boolean) => void
    onDocumentUpdate?: (documentId: string) => Promise<void>
    onToolExecuted?: (toolName: string, toolResult?: unknown) => Promise<void>
    onNavigateToDocument?: (documentId: string) => void
    availableModels?: string[]
    defaultModel?: string
    className?: string
}

// ============================================================================
// Component
// ============================================================================

export default function ChatSidebar({
    workspaceId,
    projectId,
    currentDocument,
    onAiSuggestion,
    documents = [],
    onDocumentUpdate,
    onToolExecuted,
    onNavigateToDocument,
    availableModels = [],
    defaultModel,
    className,
}: ChatSidebarProps) {
    // ── Auth state ──────────────────────────────────────────────────────────
    const [token, setToken] = useState<string | null>(null)
    const [authLoading, setAuthLoading] = useState(true)

    useEffect(() => {
        let mounted = true
        const loadSession = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (mounted) {
                setToken(session?.access_token ?? null)
                setAuthLoading(false)
            }
        }
        loadSession()

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) {
                setToken(session?.access_token ?? null)
            }
        })

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [])

    // ── Core state ──────────────────────────────────────────────────────────
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [models, setModels] = useState<Model[]>([])
    const [selectedModel, setSelectedModel] = useState(defaultModel || "")
    const [useRag, setUseRag] = useState(true)
    const [openModelSelect, setOpenModelSelect] = useState(false)
    const [isContextExpanded, setIsContextExpanded] = useState(false)
    const [selectedContextIds, setSelectedContextIds] = useState<string[]>([])
    const [streamingStatus, setStreamingStatus] = useState<StreamingStatus | null>(null)
    const [showTemplateSelector, setShowTemplateSelector] = useState(false)
    const [showTemplateForm, setShowTemplateForm] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState<unknown>(null)
    const [isStartingFromTemplate, setIsStartingFromTemplate] = useState(false)
    const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null)
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const [uploadingAttachment, setUploadingAttachment] = useState(false)
    const [contextSearchQuery, setContextSearchQuery] = useState("")
    const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([])
    const [currentStreamingContent, setCurrentStreamingContent] = useState("")
    const [toolExecutions, setToolExecutions] = useState<ToolExecution[]>([])
    const [taskList, setTaskList] = useState<TaskItem[]>([])
    const [iterationInfo, setIterationInfo] = useState<{
        current: number
        max: number
    } | null>(null)

    // Conversation history states
    const [showConversationsList, setShowConversationsList] = useState(false)
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
    const [createdDocuments, setCreatedDocuments] = useState<CreatedDocument[]>([])

    // Memory drawer state (Feature 024)
    const [memoryDrawerOpen, setMemoryDrawerOpen] = useState(false)

    // Image variations state (Feature 026)
    const imageVariations = useImageVariations()
    const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null)

    // ── Refs ────────────────────────────────────────────────────────────────
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const contextRef = useRef<HTMLDivElement>(null)
    const userSelectedModelRef = useRef(false)
    const abortControllerRef = useRef<AbortController | null>(null)

    // ── Hooks ───────────────────────────────────────────────────────────────
    const { preferences, updatePreference, isLoading: preferencesLoading } =
        useUserPreferences(token)
    const { data: foldersData } = useFolders(projectId || "")
    const folders = foldersData ?? []
    const { data: templatesData } = useTemplates(workspaceId)

    // Voice recording hook (Feature 021)
    const {
        status: recordingStatus,
        duration: recordingDuration,
        isSupported: isRecordingSupported,
        startRecording,
        stopRecording,
        setStatus: setRecordingStatus,
        setError: setRecordingError,
    } = useVoiceRecording(() => {
        toast.info("Recording will end in 15 seconds.")
    })

    // ── Models cache ────────────────────────────────────────────────────────
    const [hasMounted, setHasMounted] = useState(false)
    const [, setIsModelsRefreshing] = useState(false)

    useEffect(() => {
        const cached = getModelsCache()
        if (cached && cached.length > 0) {
            setModels(cached)
        }
        setHasMounted(true)
    }, [])

    useEffect(() => {
        if (!hasMounted || authLoading || !token) return
        const shouldRefresh = isModelsCacheStale() || models.length === 0
        if (shouldRefresh) {
            fetchModels()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasMounted, token, authLoading])

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
        if (userSelectedModelRef.current) return
        if (defaultModel && defaultModel !== selectedModel) {
            setSelectedModel(defaultModel)
        } else if (!selectedModel && models.length > 0) {
            setSelectedModel(models[0].id)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultModel, models])

    // Close context dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contextRef.current && !contextRef.current.contains(event.target as Node)) {
                setIsContextExpanded(false)
            }
        }
        if (isContextExpanded) {
            document.addEventListener("mousedown", handleClickOutside)
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [isContextExpanded])

    // ── Data fetching ───────────────────────────────────────────────────────

    const fetchModels = async () => {
        setIsModelsRefreshing(true)
        try {
            const response = await api.get("/api/chat/models")
            const fetchedModels: CachedModel[] = response.data
            setModels(fetchedModels)
            setModelsCache(fetchedModels)
        } catch (error) {
            console.error("Failed to fetch models", error)
        } finally {
            setIsModelsRefreshing(false)
        }
    }

    // ── Template handlers ───────────────────────────────────────────────────

    const handleSelectTemplate = (template: unknown) => {
        setSelectedTemplate(template)
        setShowTemplateSelector(false)
        setShowTemplateForm(true)
    }

    const handleTemplateFormBack = () => {
        setShowTemplateForm(false)
        setSelectedTemplate(null)
        setShowTemplateSelector(true)
    }

    const handleStartChatFromTemplate = async (
        templateId: string,
        variables: Record<string, string>
    ) => {
        setIsStartingFromTemplate(true)
        try {
            const response = await startChatFromTemplate({
                template_id: templateId,
                variables,
                project_id: projectId,
            })

            setShowTemplateForm(false)
            setSelectedTemplate(null)
            setMessages([])
            setCurrentConversationId(response.conversation_id)
            setCreatedDocuments([])

            toast.success("Conversation started!", {
                description: `Template applied successfully.`,
            })

            if (response.first_message) {
                setInput(response.first_message)
                setTimeout(() => {
                    const form = document.querySelector("form") as HTMLFormElement
                    if (form) {
                        form.requestSubmit()
                    }
                }, 100)
            }
        } catch (error: unknown) {
            console.error("Failed to start chat from template:", error)
            const axiosErr = error as { response?: { data?: { detail?: string } } }
            toast.error("Failed to start conversation", {
                description: axiosErr.response?.data?.detail || "Failed to apply template",
            })
        } finally {
            setIsStartingFromTemplate(false)
        }
    }

    // ── Scroll ──────────────────────────────────────────────────────────────

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    // ── Conversation management ─────────────────────────────────────────────

    const handleClearChat = async () => {
        if (messages.length > 0 && workspaceId) {
            try {
                const chatMessages = messages.map((m) => ({
                    role: m.role,
                    content: m.content,
                    toolExecutions: m.toolExecutions,
                    taskList: m.taskList,
                }))

                if (currentConversationId) {
                    const { error } = await conversationService.update(currentConversationId, {
                        messages_json: chatMessages,
                        created_document_ids: createdDocuments.map((d) => d.id),
                        message_count: chatMessages.length,
                        last_message_at: new Date().toISOString(),
                    })
                    if (error) throw error
                } else {
                    const firstUserMsg = chatMessages.find((m) => m.role === "user")
                    const title = firstUserMsg
                        ? generateTitleFromMessage(firstUserMsg.content)
                        : undefined
                    const { error } = await conversationService.create({
                        workspace_id: workspaceId,
                        project_id: projectId || null,
                        title,
                        messages_json: chatMessages,
                        model_used: selectedModel,
                        document_ids_context: selectedContextIds,
                        folder_ids_context: selectedFolderIds,
                        message_count: chatMessages.length,
                        last_message_at: new Date().toISOString(),
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
        userSelectedModelRef.current = false
        toast.success("New conversation", {
            description: "Previous conversation saved to history.",
        })
    }

    const handleLoadConversation = async (conversationId: string) => {
        try {
            const { data: conversation, error } = await conversationService.get(conversationId)
            if (error) throw error
            if (!conversation) throw new Error("Conversation not found")

            const messages_json = (conversation.messages_json as unknown[]) || []
            setMessages(
                messages_json.map((m: unknown) => {
                    const msg = m as {
                        role: string
                        content: string
                        toolExecutions?: ToolExecution[]
                        taskList?: TaskItem[]
                    }
                    return {
                        role: msg.role as "user" | "assistant" | "system",
                        content: msg.content,
                        toolExecutions: msg.toolExecutions,
                        taskList: msg.taskList,
                    }
                })
            )
            setCurrentConversationId(conversationId)
            setSelectedModel(conversation.model_used || selectedModel)
            setSelectedContextIds(conversation.document_ids_context || [])
            setSelectedFolderIds(conversation.folder_ids_context || [])
            setCreatedDocuments([])
            setShowConversationsList(false)
            toast.success("Conversation loaded", {
                description: "Continuing previous conversation",
            })
        } catch (error) {
            console.error("Failed to load conversation:", error)
            toast.error("Error", { description: "Failed to load conversation" })
        }
    }

    // ── Context selection ───────────────────────────────────────────────────

    const toggleContextId = (id: string) => {
        setSelectedContextIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        )
    }

    const toggleFolderId = (id: string) => {
        setSelectedFolderIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        )
    }

    const filteredDocuments = useMemo(() => {
        const seen = new Set<string>()
        return documents.filter((d) => {
            if (seen.has(d.id)) return false
            seen.add(d.id)
            return (
                d.id !== currentDocument?.id &&
                d.media_type !== "image" &&
                (!contextSearchQuery ||
                    d.title.toLowerCase().includes(contextSearchQuery.toLowerCase()))
            )
        })
    }, [documents, currentDocument?.id, contextSearchQuery])

    const filteredFolders = folders.filter(
        (f) =>
            !contextSearchQuery ||
            f.name.toLowerCase().includes(contextSearchQuery.toLowerCase())
    )

    // ── Approval ────────────────────────────────────────────────────────────

    const handleApprovalResponse = async (approved: boolean) => {
        if (!pendingApproval) return

        try {
            await api.post("/api/chat/tool-approval", {
                approval_id: pendingApproval.approval_id,
                approved,
            })
            setPendingApproval(null)

            if (!approved) {
                toast.info("Operation cancelled", {
                    description: "Tool execution was cancelled.",
                })
            }
        } catch (error) {
            console.error("Failed to send approval response", error)
            toast.error("Error", {
                description: "Failed to send approval response.",
            })
        }
    }

    // ── Attachments ─────────────────────────────────────────────────────────

    const handleAttachmentClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        e.target.value = ""

        const maxSize = 10 * 1024 * 1024
        if (file.size > maxSize) {
            toast.error("File too large", {
                description: "File must be no larger than 10MB",
            })
            return
        }

        const validTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/gif",
            "image/webp",
            "image/bmp",
            "application/pdf",
        ]
        if (!validTypes.includes(file.type)) {
            toast.error("Unsupported file type", {
                description: "Please send only images (JPG, PNG, GIF, etc.) or PDFs",
            })
            return
        }

        setUploadingAttachment(true)

        try {
            const formData = new FormData()
            formData.append("file", file)
            if (projectId) {
                formData.append("project_id", projectId)
            }

            const response = await api.post("/api/chat/upload-attachment", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            })

            const attachment = response.data.attachment
            setAttachments((prev) => [...prev, attachment])
            toast.success("Attachment processed", {
                description: `${file.name} was analyzed successfully`,
            })
        } catch (error: unknown) {
            console.error("Failed to upload attachment", error)
            const axiosErr = error as { response?: { data?: { detail?: string } } }
            const errorMessage = axiosErr.response?.data?.detail || "Failed to process attachment"
            toast.error("Error processing attachment", { description: errorMessage })
        } finally {
            setUploadingAttachment(false)
        }
    }

    const removeAttachment = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index))
    }

    // ── Voice input (Feature 021) ───────────────────────────────────────────

    const handleVoiceInput = async () => {
        if (recordingStatus === "recording") {
            const audioBlob = await stopRecording()
            if (audioBlob) {
                try {
                    const result = await transcribeAudio(audioBlob)
                    setInput((prev) => (prev ? `${prev} ${result.text}` : result.text))
                    setRecordingStatus("idle")
                    toast.success("Transcription complete", {
                        description: `Processed in ${result.processing_time_ms}ms`,
                    })
                } catch (err: unknown) {
                    setRecordingStatus("error")
                    const axiosErr = err as { response?: { data?: { message?: string } } }
                    const errorMessage =
                        axiosErr.response?.data?.message ||
                        "Transcription failed. Please try again."
                    setRecordingError(errorMessage)
                    toast.error("Transcription error", { description: errorMessage })
                }
            }
        } else if (recordingStatus === "idle" || recordingStatus === "error") {
            await startRecording()
        }
    }

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    // ── Cancel streaming ────────────────────────────────────────────────────

    const handleCancelStream = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
            setIsLoading(false)
            setStreamingStatus(null)
            setCurrentStreamingContent("")
            toast.info("Operation cancelled", {
                description: "The streaming request was cancelled.",
            })
        }
    }

    // ── Send message (SSE streaming) ────────────────────────────────────────

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if ((!input.trim() && attachments.length === 0) || isLoading) return

        const userMessage: Message = { role: "user", content: input }
        setMessages((prev) => [...prev, userMessage])
        setInput("")
        setIsLoading(true)
        setStreamingStatus({ status: "Starting..." })
        setCurrentStreamingContent("")
        setToolExecutions([])
        setTaskList([])
        setIterationInfo(null)
        imageVariations.reset()
        setSelectedVariationId(null)

        try {
            // Prepare messages with attachments
            const messagesWithAttachments = [...messages, userMessage].map((msg, index) => {
                if (index === messages.length && attachments.length > 0) {
                    return { ...msg, attachments }
                }
                return msg
            })

            // Prepare context data
            const contextData: Record<string, unknown> = {
                messages: messagesWithAttachments,
                model: selectedModel,
                project_id: projectId,
                use_rag: useRag,
                document_ids: useRag ? selectedContextIds : [],
                folder_ids: useRag ? selectedFolderIds : [],
                autonomous_mode: preferences?.autonomous_mode ?? false,
            }

            // Clear attachments after adding to message
            setAttachments([])

            if (currentDocument) {
                if (useRag) {
                    contextData.current_document = {
                        id: currentDocument.id,
                        title: currentDocument.title,
                        content: currentDocument.content || "",
                    }
                }
                contextData.current_document_id = currentDocument.id
            }

            // Use streaming endpoint
            const apiUrl = `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/chat/completion-stream`

            // Create AbortController for cancellation support
            abortControllerRef.current = new AbortController()

            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(contextData),
                signal: abortControllerRef.current.signal,
            })

            if (!response.ok) {
                const errorText = await response.text()
                console.error("Response not OK:", errorText)
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()
            let currentContent = ""
            let localToolExecutions: ToolExecution[] = []
            let localTaskList: TaskItem[] = []
            let streamDone = false

            if (!reader) throw new Error("No reader available")

            while (!streamDone) {
                const { done, value } = await reader.read()
                if (done || streamDone) break

                const chunk = decoder.decode(value, { stream: true })
                const lines = chunk.split("\n")

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const data = line.slice(6)
                        if (data === "[DONE]") continue

                        try {
                            const event = JSON.parse(data)

                            switch (event.type) {
                                case "status":
                                    setStreamingStatus({ status: event.message })
                                    break

                                case "iteration":
                                    setIterationInfo({
                                        current: event.current,
                                        max: event.max,
                                    })
                                    break

                                case "iteration_limit":
                                    setIterationInfo({
                                        current: event.current,
                                        max: event.max,
                                    })
                                    toast.info("Iteration limit reached", {
                                        description: event.message,
                                    })
                                    break

                                case "task_list": {
                                    const newTaskList = event.tasks.map(
                                        (task: {
                                            id: string
                                            description: string
                                            tool_name?: string
                                            status: string
                                        }) => ({
                                            id: task.id,
                                            description: task.description,
                                            tool_name: task.tool_name,
                                            status: task.status,
                                        })
                                    )
                                    localTaskList = newTaskList
                                    setTaskList(newTaskList)
                                    break
                                }

                                case "task_update":
                                    localTaskList = localTaskList.map((task) =>
                                        task.id === event.task_id
                                            ? { ...task, status: event.status }
                                            : task
                                    )
                                    setTaskList(localTaskList)
                                    break

                                case "tool_approval_request": {
                                    if (
                                        event.tool === "edit_document" &&
                                        event.args?.content
                                    ) {
                                        currentContent = event.args.content
                                        setCurrentStreamingContent(currentContent)
                                    }

                                    setPendingApproval({
                                        approval_id: event.approval_id,
                                        tool: event.tool,
                                        args: event.args,
                                        index: event.index,
                                        total: event.total,
                                    })
                                    setStreamingStatus({
                                        status: `Awaiting approval: ${event.tool}`,
                                        tool: event.tool,
                                        args: event.args,
                                        index: event.index,
                                        total: event.total,
                                    })

                                    const pendingExecution: ToolExecution = {
                                        id: `${event.tool}-${Date.now()}-${event.index || 0}-pending`,
                                        tool: event.tool,
                                        args: event.args,
                                        status: "pending",
                                        timestamp: new Date().toISOString(),
                                        index: event.index,
                                        total: event.total,
                                    }
                                    localToolExecutions = [
                                        ...localToolExecutions,
                                        pendingExecution,
                                    ]
                                    setToolExecutions(localToolExecutions)
                                    break
                                }

                                case "tool_approved":
                                    setStreamingStatus({
                                        status: `Tool approved: ${event.tool}`,
                                    })
                                    localToolExecutions = localToolExecutions.map((exec) => {
                                        if (
                                            exec.tool === event.tool &&
                                            exec.status === "pending"
                                        ) {
                                            return { ...exec, status: "executing" }
                                        }
                                        return exec
                                    })
                                    setToolExecutions(localToolExecutions)
                                    break

                                case "tool_auto_approved": {
                                    setStreamingStatus({
                                        status: `Auto-executing: ${event.tool}`,
                                    })
                                    const autoExecution: ToolExecution = {
                                        id: `${event.tool}-${Date.now()}-auto`,
                                        tool: event.tool,
                                        status: "executing",
                                        timestamp: new Date().toISOString(),
                                    }
                                    localToolExecutions = [
                                        ...localToolExecutions,
                                        autoExecution,
                                    ]
                                    setToolExecutions(localToolExecutions)
                                    break
                                }

                                case "tool_rejected":
                                    setStreamingStatus({
                                        status: `Tool rejected: ${event.tool}`,
                                    })
                                    localToolExecutions = localToolExecutions.map((exec) => {
                                        if (
                                            exec.tool === event.tool &&
                                            exec.status === "pending"
                                        ) {
                                            return {
                                                ...exec,
                                                status: "error",
                                                result: "Rejected by user",
                                            }
                                        }
                                        return exec
                                    })
                                    setToolExecutions(localToolExecutions)
                                    break

                                case "tool_start": {
                                    setStreamingStatus({
                                        status: `Executing: ${event.tool}`,
                                        tool: event.tool,
                                        args: event.args,
                                        index: event.index,
                                        total: event.total,
                                    })

                                    const exists = localToolExecutions.some(
                                        (exec) =>
                                            exec.tool === event.tool &&
                                            exec.status === "executing"
                                    )
                                    if (!exists) {
                                        const newExecution: ToolExecution = {
                                            id: `${event.tool}-${Date.now()}-${event.index || 0}`,
                                            tool: event.tool,
                                            args: event.args,
                                            status: "executing",
                                            timestamp: new Date().toISOString(),
                                            index: event.index,
                                            total: event.total,
                                        }
                                        localToolExecutions = [
                                            ...localToolExecutions,
                                            newExecution,
                                        ]
                                        setToolExecutions(localToolExecutions)
                                    }
                                    break
                                }

                                case "tool_complete": {
                                    setStreamingStatus({
                                        status: `Completed: ${event.tool}`,
                                        tool: event.tool,
                                        completed: true,
                                    })

                                    localToolExecutions = localToolExecutions.map((exec) => {
                                        if (
                                            exec.tool === event.tool &&
                                            exec.status === "executing"
                                        ) {
                                            return {
                                                ...exec,
                                                status: "completed",
                                                result: event.result,
                                                duration: event.duration_ms,
                                            }
                                        }
                                        return exec
                                    })
                                    setToolExecutions(localToolExecutions)

                                    const refreshTools = [
                                        "create_document",
                                        "create_folder",
                                        "move_file",
                                        "move_folder",
                                        "delete_file",
                                        "delete_folder",
                                        "rename_document",
                                        "rename_folder",
                                        "generate_image",
                                        "attach_image_to_document",
                                        "edit_document",
                                    ]
                                    if (
                                        onToolExecuted &&
                                        refreshTools.includes(event.tool)
                                    ) {
                                        await onToolExecuted(event.tool, event.result)
                                    }

                                    if (
                                        event.tool === "create_document" &&
                                        event.result?.id
                                    ) {
                                        setCreatedDocuments((prev) => [
                                            ...prev,
                                            {
                                                id: event.result.id,
                                                title:
                                                    event.result.title || "New document",
                                                type: "text",
                                            },
                                        ])
                                    } else if (
                                        event.tool === "generate_image" &&
                                        event.result?.image_document_id
                                    ) {
                                        setCreatedDocuments((prev) => [
                                            ...prev,
                                            {
                                                id: event.result.image_document_id,
                                                title:
                                                    event.result.title || "New image",
                                                type: "image",
                                            },
                                        ])

                                        if (event.result?.attached_to_document_id) {
                                            if (event.result?.created_document_id) {
                                                toast.success("Document Created", {
                                                    description: `Document "${event.result.created_document_title || "New Creative"}" created with attached image.`,
                                                })
                                            } else {
                                                toast.success("Image Attached", {
                                                    description:
                                                        "Image automatically attached to the document.",
                                                })
                                            }
                                        }

                                        if (
                                            event.result?.visual_context?.asset_count
                                        ) {
                                            toast.success("Visual Context Applied", {
                                                description: `${event.result.visual_context.asset_count} visual assets were used as reference in generation.`,
                                            })
                                        }
                                    }
                                    break
                                }

                                case "tool_error":
                                    localToolExecutions = localToolExecutions.map(
                                        (exec) => {
                                            if (
                                                exec.tool === event.tool &&
                                                exec.status === "executing"
                                            ) {
                                                return {
                                                    ...exec,
                                                    status: "error",
                                                    result:
                                                        event.error || "Unknown error",
                                                }
                                            }
                                            return exec
                                        }
                                    )
                                    setToolExecutions(localToolExecutions)
                                    break

                                case "message_chunk":
                                    currentContent += event.content
                                    setCurrentStreamingContent(currentContent)
                                    break

                                case "done": {
                                    streamDone = true
                                    setIsLoading(false)
                                    setStreamingStatus(null)
                                    setCurrentStreamingContent("")
                                    setToolExecutions([])
                                    setTaskList([])

                                    const newAssistantMessage = {
                                        role: "assistant" as const,
                                        content: currentContent || "",
                                        isStreaming: false,
                                        toolExecutions:
                                            localToolExecutions.length > 0
                                                ? [...localToolExecutions]
                                                : undefined,
                                        taskList:
                                            localTaskList.length > 0
                                                ? [...localTaskList]
                                                : undefined,
                                    }

                                    if (
                                        currentContent.trim() ||
                                        localToolExecutions.length > 0
                                    ) {
                                        setMessages((prev) => [
                                            ...prev,
                                            newAssistantMessage,
                                        ])
                                    }

                                    // Save conversation to database (async, non-blocking)
                                    if (workspaceId) {
                                        const allMessages = [
                                            ...messages,
                                            userMessage,
                                        ]
                                        if (
                                            currentContent.trim() ||
                                            localToolExecutions.length > 0
                                        ) {
                                            allMessages.push(newAssistantMessage)
                                        }
                                        const chatMessages = allMessages.map((m) => ({
                                            role: m.role,
                                            content: m.content,
                                            toolExecutions: m.toolExecutions,
                                            taskList: m.taskList,
                                        }))

                                        // Fire and forget
                                        ;(async () => {
                                            try {
                                                if (currentConversationId) {
                                                    await conversationService.update(
                                                        currentConversationId,
                                                        {
                                                            messages_json:
                                                                chatMessages,
                                                            model_used:
                                                                selectedModel,
                                                            message_count:
                                                                chatMessages.length,
                                                            last_message_at:
                                                                new Date().toISOString(),
                                                        }
                                                    )
                                                } else {
                                                    const firstUserMsg =
                                                        chatMessages.find(
                                                            (m) =>
                                                                m.role === "user"
                                                        )
                                                    const title = firstUserMsg
                                                        ? generateTitleFromMessage(
                                                              firstUserMsg.content
                                                          )
                                                        : undefined
                                                    const { data, error } =
                                                        await conversationService.create(
                                                            {
                                                                workspace_id:
                                                                    workspaceId,
                                                                project_id:
                                                                    projectId ||
                                                                    null,
                                                                title,
                                                                messages_json:
                                                                    chatMessages,
                                                                model_used:
                                                                    selectedModel,
                                                                document_ids_context:
                                                                    selectedContextIds,
                                                                folder_ids_context:
                                                                    selectedFolderIds,
                                                                message_count:
                                                                    chatMessages.length,
                                                                last_message_at:
                                                                    new Date().toISOString(),
                                                            }
                                                        )
                                                    if (!error && data) {
                                                        setCurrentConversationId(
                                                            data.id
                                                        )
                                                    }
                                                }
                                            } catch (saveError) {
                                                console.error(
                                                    "Failed to save conversation:",
                                                    saveError
                                                )
                                            }
                                        })()
                                    }

                                    // Trigger document update
                                    const editedCurrentDoc =
                                        localToolExecutions.some(
                                            (exec) =>
                                                exec.tool === "edit_document" &&
                                                exec.status === "completed" &&
                                                (
                                                    exec.args as {
                                                        document_id?: string
                                                    }
                                                )?.document_id ===
                                                    currentDocument?.id
                                        )
                                    if (
                                        editedCurrentDoc &&
                                        currentDocument?.id &&
                                        onDocumentUpdate
                                    ) {
                                        onDocumentUpdate(
                                            currentDocument.id
                                        ).catch((updateErr) => {
                                            console.error(
                                                "Failed to update document after edit:",
                                                updateErr
                                            )
                                        })
                                    }
                                    break
                                }

                                case "memory_saved":
                                    // Memory extraction runs fully in background
                                    break

                                // Feature 026: Image variation events
                                case "variation_started":
                                    imageVariations.handleVariationEvent(event)
                                    setStreamingStatus({
                                        status: `Generating ${event.data.total_variations} image variations...`,
                                    })
                                    break

                                case "variation_complete":
                                    imageVariations.handleVariationEvent(event)
                                    setStreamingStatus({
                                        status: `Variation ${event.data.variation_index + 1}/${event.data.total_variations} complete`,
                                    })
                                    if (event.data.document_id) {
                                        setCreatedDocuments((prev) => [
                                            ...prev,
                                            {
                                                id: event.data.document_id,
                                                title:
                                                    event.data.title ||
                                                    `Variation ${event.data.variation_index + 1}`,
                                                type: "image",
                                            },
                                        ])
                                    }
                                    break

                                case "variation_failed":
                                    imageVariations.handleVariationEvent(event)
                                    toast.error("Variation failed", {
                                        description: `Error in variation ${event.data.variation_index + 1}: ${event.data.error}`,
                                    })
                                    break

                                case "all_variations_complete": {
                                    imageVariations.handleVariationEvent(event)
                                    const varData = event.data
                                    if (varData.total_failed > 0) {
                                        toast.info(
                                            "Variation generation complete",
                                            {
                                                description: `${varData.total_completed} variations generated, ${varData.total_failed} failed`,
                                            }
                                        )
                                    } else {
                                        toast.success("Variations generated!", {
                                            description: `${varData.total_completed} image variations created successfully`,
                                        })
                                    }
                                    break
                                }

                                case "error":
                                    throw new Error(event.message)
                            }
                        } catch (parseError) {
                            console.warn("Failed to parse SSE event:", data)
                        }
                    }
                }
            }
        } catch (error: unknown) {
            const err = error as { name?: string; response?: { status?: number } }
            if (err.name === "AbortError") {
                console.log("Request cancelled by user")
                return
            }

            console.error("Chat failed", error)
            const errorMsg =
                err.response?.status === 401
                    ? "Authentication error. Please log in again."
                    : "Sorry, I encountered an error processing your request."
            toast.error("Error", { description: errorMsg })
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: errorMsg },
            ])
        } finally {
            abortControllerRef.current = null
            setIsLoading(false)
            setStreamingStatus(null)
        }
    }

    // ── Styles ──────────────────────────────────────────────────────────────

    const floatingGlassClasses = cn(
        "flex flex-col w-[400px]",
        "bg-white/[0.03] dark:bg-white/[0.02]",
        "backdrop-blur-2xl backdrop-saturate-150",
        "border border-white/[0.1]",
        "rounded-2xl",
        "overflow-hidden",
        "shadow-[0_8px_32px_-8px_rgba(0,0,0,0.15),0_0_0_1px_rgba(255,255,255,0.05)_inset]",
        "dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.03)_inset]",
        className
    )

    // ── Render: Conversations list ──────────────────────────────────────────

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

    // ── Render: Main chat UI ────────────────────────────────────────────────

    return (
        <div className={floatingGlassClasses}>
            {/* ─── Header ─────────────────────────────────────────────── */}
            <div className="p-4 border-b border-white/[0.06] flex flex-col gap-4 bg-gradient-to-b from-white/[0.04] to-transparent">
                <div className="flex justify-between items-center">
                    <h2 className="text-sm font-semibold flex items-center gap-2">
                        <Bot className="h-4 w-4" /> AI Assistant
                    </h2>
                    <div className="flex items-center gap-1">
                        {/* Model selector */}
                        <Popover open={openModelSelect} onOpenChange={setOpenModelSelect}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openModelSelect}
                                    className="w-[180px] justify-between text-xs h-8"
                                    title={
                                        models.find((model) => model.id === selectedModel)
                                            ?.name || selectedModel
                                    }
                                >
                                    <span className="truncate">
                                        {selectedModel
                                            ? models.find(
                                                  (model) =>
                                                      model.id === selectedModel
                                              )?.name ||
                                              selectedModel.split("/").pop()
                                            : "Model"}
                                    </span>
                                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[220px] p-0" align="end">
                                <Command>
                                    <CommandInput placeholder="Search models..." />
                                    <CommandList>
                                        <CommandEmpty>No models found.</CommandEmpty>

                                        {models.length === 0 ? (
                                            <div className="py-6 text-center text-sm text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                                                Loading models...
                                            </div>
                                        ) : (
                                            <>
                                                {availableModels.length > 0 && (
                                                    <>
                                                        <CommandGroup heading="Recommended">
                                                            {models
                                                                .filter((model) =>
                                                                    availableModels.includes(
                                                                        model.id
                                                                    )
                                                                )
                                                                .map((model) => (
                                                                    <CommandItem
                                                                        key={model.id}
                                                                        value={model.name}
                                                                        onSelect={() => {
                                                                            userSelectedModelRef.current =
                                                                                true
                                                                            setSelectedModel(
                                                                                model.id
                                                                            )
                                                                            setOpenModelSelect(
                                                                                false
                                                                            )
                                                                        }}
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                selectedModel ===
                                                                                    model.id
                                                                                    ? "opacity-100"
                                                                                    : "opacity-0"
                                                                            )}
                                                                        />
                                                                        {model.name}
                                                                    </CommandItem>
                                                                ))}
                                                        </CommandGroup>
                                                        <CommandSeparator />
                                                    </>
                                                )}

                                                <CommandGroup
                                                    heading={
                                                        availableModels.length > 0
                                                            ? "All Models"
                                                            : undefined
                                                    }
                                                >
                                                    {models
                                                        .filter(
                                                            (model) =>
                                                                !availableModels.includes(
                                                                    model.id
                                                                )
                                                        )
                                                        .map((model) => (
                                                            <CommandItem
                                                                key={model.id}
                                                                value={model.name}
                                                                onSelect={() => {
                                                                    userSelectedModelRef.current =
                                                                        true
                                                                    setSelectedModel(
                                                                        model.id
                                                                    )
                                                                    setOpenModelSelect(
                                                                        false
                                                                    )
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        selectedModel ===
                                                                            model.id
                                                                            ? "opacity-100"
                                                                            : "opacity-0"
                                                                    )}
                                                                />
                                                                {model.name}
                                                            </CommandItem>
                                                        ))}
                                                </CommandGroup>
                                            </>
                                        )}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>

                        {/* Menu dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleClearChat}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    New Conversation
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setShowConversationsList(true)}
                                >
                                    <History className="h-4 w-4 mr-2" />
                                    Conversation History
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => setMemoryDrawerOpen(true)}
                                >
                                    <Brain className="h-4 w-4 mr-2" />
                                    Memories
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Autonomous Mode Toggle */}
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                            Autonomous Mode
                        </span>
                        {preferences?.autonomous_mode && (
                            <Badge
                                variant="secondary"
                                className="text-[10px] h-4 px-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            >
                                Active
                            </Badge>
                        )}
                    </div>
                    <Switch
                        checked={preferences?.autonomous_mode ?? false}
                        onCheckedChange={(checked) =>
                            updatePreference("autonomous_mode", checked)
                        }
                        disabled={preferencesLoading || isLoading}
                        className="scale-75"
                    />
                </div>

                {/* Context Selection */}
                <div ref={contextRef} className="border rounded-lg p-2 bg-muted/30">
                    <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setIsContextExpanded(!isContextExpanded)}
                    >
                        <div className="flex items-center gap-2 text-xs font-medium">
                            <Settings className="h-3 w-3" />
                            Context:{" "}
                            {useRag
                                ? currentDocument
                                    ? `Editing + ${selectedContextIds.length} docs + ${selectedFolderIds.length} folders`
                                    : `${selectedContextIds.length} docs + ${selectedFolderIds.length} folders`
                                : "Disabled"}
                        </div>
                        {isContextExpanded ? (
                            <ChevronUp className="h-3 w-3" />
                        ) : (
                            <ChevronDown className="h-3 w-3" />
                        )}
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
                                <label htmlFor="useRag">Enable context</label>
                            </div>

                            {useRag && (
                                <>
                                    {/* Search bar */}
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                        <Input
                                            placeholder="Search context..."
                                            value={contextSearchQuery}
                                            onChange={(e) =>
                                                setContextSearchQuery(e.target.value)
                                            }
                                            className="h-7 text-xs pl-7 pr-7"
                                        />
                                        {contextSearchQuery && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    setContextSearchQuery("")
                                                }
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
                                                <span className="font-medium truncate flex-1">
                                                    {currentDocument.title}
                                                </span>
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[10px] h-4 px-1"
                                                >
                                                    Current
                                                </Badge>
                                            </div>
                                        )}

                                        {/* Folders section */}
                                        {filteredFolders.length > 0 && (
                                            <>
                                                <div className="text-[10px] text-muted-foreground mt-2 mb-1 px-1 font-medium">
                                                    Folders
                                                </div>
                                                {filteredFolders.map((folder) => (
                                                    <div
                                                        key={folder.id}
                                                        className="flex items-center gap-2 text-xs px-1 hover:bg-muted/50 rounded"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedFolderIds.includes(
                                                                folder.id
                                                            )}
                                                            onChange={() =>
                                                                toggleFolderId(folder.id)
                                                            }
                                                            id={`folder-${folder.id}`}
                                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                                        />
                                                        <Folder className="h-3 w-3 text-amber-500" />
                                                        <label
                                                            htmlFor={`folder-${folder.id}`}
                                                            className="truncate flex-1 cursor-pointer py-1"
                                                            title={folder.name}
                                                        >
                                                            {folder.name}
                                                        </label>
                                                    </div>
                                                ))}
                                            </>
                                        )}

                                        {/* Documents section */}
                                        <div className="text-[10px] text-muted-foreground mt-2 mb-1 px-1 font-medium">
                                            Documents
                                        </div>
                                        {filteredDocuments.map((doc) => (
                                            <div
                                                key={doc.id}
                                                className="flex items-center gap-2 text-xs px-1 hover:bg-muted/50 rounded"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedContextIds.includes(
                                                        doc.id
                                                    )}
                                                    onChange={() =>
                                                        toggleContextId(doc.id)
                                                    }
                                                    id={`doc-${doc.id}`}
                                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                                />
                                                <FileText className="h-3 w-3 text-blue-500" />
                                                <label
                                                    htmlFor={`doc-${doc.id}`}
                                                    className="truncate flex-1 cursor-pointer py-1"
                                                    title={doc.title}
                                                >
                                                    {doc.title}
                                                </label>
                                            </div>
                                        ))}
                                        {filteredDocuments.length === 0 &&
                                            filteredFolders.length === 0 &&
                                            !currentDocument && (
                                                <div className="text-xs text-muted-foreground px-1 italic">
                                                    {contextSearchQuery
                                                        ? "No results found"
                                                        : "No context available"}
                                                </div>
                                            )}
                                    </div>

                                    {/* Visual Context Section */}
                                    {projectId && (
                                        <>
                                            <div className="border-t border-border/50 my-3" />
                                            <VisualContextSelector
                                                projectId={projectId}
                                            />
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Messages ───────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                    >
                        <div
                            className={`p-2 rounded-lg max-w-[80%] text-sm ${
                                msg.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                            }`}
                        >
                            {msg.role === "assistant" ? (
                                <div className="space-y-3">
                                    {/* Task List from completed message */}
                                    {msg.taskList && msg.taskList.length > 0 && (
                                        <TaskListCard tasks={msg.taskList} />
                                    )}

                                    {/* Tool Execution Cards from completed message */}
                                    {msg.toolExecutions &&
                                        msg.toolExecutions.length > 0 && (
                                            <div className="space-y-2">
                                                {msg.toolExecutions.map(
                                                    (execution) => (
                                                        <ToolExecutionCard
                                                            key={execution.id}
                                                            id={execution.id}
                                                            tool={execution.tool}
                                                            args={execution.args}
                                                            result={execution.result}
                                                            status={execution.status}
                                                            duration={
                                                                execution.duration
                                                            }
                                                            timestamp={
                                                                execution.timestamp
                                                            }
                                                            index={execution.index}
                                                            total={execution.total}
                                                        />
                                                    )
                                                )}
                                            </div>
                                        )}

                                    {/* Message content */}
                                    {msg.content && (
                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                msg.content
                            )}
                            {msg.role === "assistant" &&
                                onAiSuggestion &&
                                msg.content && (
                                    <div className="mt-2 pt-2 border-t border-border/50 flex justify-end">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-xs px-2"
                                            onClick={() =>
                                                onAiSuggestion(msg.content)
                                            }
                                        >
                                            Suggest Edit
                                        </Button>
                                    </div>
                                )}
                        </div>
                    </div>
                ))}

                {/* ─── Thinking Block ─────────────────────────────────── */}
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
                                        ? `Executing ${streamingStatus.tool}`
                                        : streamingStatus?.status ||
                                          "Generating response..."}
                                </span>
                                {iterationInfo && (
                                    <Badge
                                        variant="outline"
                                        className="ml-auto text-[10px] px-1.5 py-0.5"
                                    >
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
                                    <span className="inline-block w-2 h-4 bg-blue-600 dark:bg-blue-400 animate-pulse ml-1 align-middle" />
                                </div>
                            )}

                            {/* Task List Card */}
                            {taskList.length > 0 && (
                                <div className="ml-6">
                                    <TaskListCard tasks={taskList} />
                                </div>
                            )}

                            {/* Tool Execution Cards */}
                            {toolExecutions.length > 0 && (
                                <div className="ml-6 space-y-2">
                                    {toolExecutions.map((execution) => (
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
                                        Image Variations
                                        {imageVariations.isGenerating && (
                                            <span className="text-blue-500">
                                                ({imageVariations.completionProgress}%)
                                            </span>
                                        )}
                                    </div>
                                    <ImageVariationGrid
                                        totalVariations={
                                            imageVariations.totalVariations
                                        }
                                        completedVariations={
                                            imageVariations.completedVariations
                                        }
                                        failedVariations={
                                            imageVariations.failedVariations
                                        }
                                        isGenerating={imageVariations.isGenerating}
                                        onSelect={(variation: ImageVariation) => {
                                            setSelectedVariationId(variation.id)
                                            if (onNavigateToDocument) {
                                                onNavigateToDocument(
                                                    variation.documentId
                                                )
                                            }
                                        }}
                                        selectedId={
                                            selectedVariationId || undefined
                                        }
                                    />
                                </div>
                            )}

                            {/* Tool execution details */}
                            {streamingStatus?.tool && (
                                <div className="ml-6 space-y-2">
                                    <div className="flex items-center gap-2 text-xs">
                                        <div className="flex items-center gap-1.5 bg-background/60 px-2 py-1 rounded border border-border/40">
                                            <FileText className="h-3 w-3 text-amber-600" />
                                            <span className="font-mono font-medium">
                                                {streamingStatus.tool}
                                            </span>
                                        </div>
                                        {streamingStatus.index &&
                                            streamingStatus.total && (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[10px] h-5 px-1.5"
                                                >
                                                    {streamingStatus.index}/
                                                    {streamingStatus.total}
                                                </Badge>
                                            )}
                                    </div>

                                    {!!streamingStatus.args && (
                                        <div className="text-[10px] text-muted-foreground font-mono bg-background/40 p-1.5 rounded border border-border/30">
                                            {String(JSON.stringify(
                                                streamingStatus.args
                                            )).slice(0, 100)}
                                            {String(JSON.stringify(streamingStatus.args))
                                                .length > 100 && "..."}
                                        </div>
                                    )}

                                    {streamingStatus.completed && (
                                        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-medium">
                                            <div className="flex items-center justify-center h-4 w-4 bg-green-600/10 rounded-full">
                                                <Check className="h-2.5 w-2.5" />
                                            </div>
                                            <span>Completed</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Progress pulse animation */}
                            <div className="h-1 w-full bg-background/30 rounded-full overflow-hidden">
                                <div className="h-full w-1/3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" />
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Approval Request Card ──────────────────────────── */}
                {pendingApproval && (
                    <div className="flex gap-2">
                        <Card className="max-w-[85%] border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Bot className="h-4 w-4 text-amber-600" />
                                    Approval Required
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="text-sm">
                                    <p className="font-medium mb-2">
                                        The AI wants to execute:
                                    </p>
                                    <div className="flex items-center gap-2 bg-background/60 px-3 py-2 rounded border">
                                        <FileText className="h-4 w-4 text-amber-600" />
                                        <span className="font-mono font-medium">
                                            {pendingApproval.tool}
                                        </span>
                                        {pendingApproval.index &&
                                            pendingApproval.total && (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[10px] h-5 px-1.5 ml-auto"
                                                >
                                                    {pendingApproval.index}/
                                                    {pendingApproval.total}
                                                </Badge>
                                            )}
                                    </div>
                                </div>

                                {pendingApproval.args && (
                                    <div className="text-xs">
                                        {pendingApproval.tool === "edit_document" &&
                                        (
                                            pendingApproval.args as {
                                                content?: string
                                            }
                                        ).content ? (
                                            <>
                                                <p className="text-muted-foreground mb-1">
                                                    Document:{" "}
                                                    <span className="font-medium">
                                                        {(
                                                            pendingApproval.args as {
                                                                title?: string
                                                            }
                                                        ).title || "Untitled"}
                                                    </span>
                                                </p>
                                                <div className="bg-background/40 p-3 rounded border max-h-40 overflow-y-auto">
                                                    <p className="text-muted-foreground mb-1 text-[10px]">
                                                        New content:
                                                    </p>
                                                    <div className="prose prose-xs dark:prose-invert max-w-none">
                                                        {(
                                                            pendingApproval.args as {
                                                                content: string
                                                            }
                                                        ).content.substring(0, 300)}
                                                        {(
                                                            pendingApproval.args as {
                                                                content: string
                                                            }
                                                        ).content.length > 300 &&
                                                            "..."}
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-muted-foreground mb-1">
                                                    Parameters:
                                                </p>
                                                <div className="font-mono bg-background/40 p-2 rounded border text-[10px] max-h-20 overflow-y-auto">
                                                    <pre className="whitespace-pre-wrap">
                                                        {JSON.stringify(
                                                            pendingApproval.args,
                                                            null,
                                                            2
                                                        )}
                                                    </pre>
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
                                        Approve
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleApprovalResponse(false)}
                                        className="flex-1"
                                    >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Reject
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* ─── Created Documents Navigation ───────────────────── */}
                {createdDocuments.length > 0 && !isLoading && (
                    <div className="flex flex-col gap-2 px-2">
                        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                            Created Documents
                        </div>
                        {createdDocuments.map((doc, index) => (
                            <motion.div
                                key={doc.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="flex items-center gap-2 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg px-3 py-2"
                            >
                                {doc.type === "image" ? (
                                    <Image className="h-4 w-4 text-purple-500 flex-shrink-0" />
                                ) : (
                                    <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                )}
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-[10px] text-muted-foreground">
                                        {doc.type === "image"
                                            ? "Image created"
                                            : "Document created"}
                                    </span>
                                    <span className="text-xs font-medium truncate">
                                        {doc.title}
                                    </span>
                                </div>
                                {onNavigateToDocument && (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() =>
                                            onNavigateToDocument(doc.id)
                                        }
                                        className="gap-1 h-6 text-[10px] px-2"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        View
                                    </Button>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* ─── Input Area ─────────────────────────────────────────── */}
            <div className="p-4 border-t border-white/[0.06] bg-gradient-to-t from-white/[0.02] to-transparent">
                {/* Attachments preview */}
                {attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                        {attachments.map((att, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg text-xs"
                            >
                                <FileText className="h-3 w-3" />
                                <span className="max-w-[150px] truncate">
                                    {att.filename}
                                </span>
                                <Badge
                                    variant="secondary"
                                    className="text-[10px] h-4 px-1"
                                >
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

                    {/* Integrated ChatGPT/Claude-style container */}
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
                        {/* Clean textarea */}
                        <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSend(
                                        e as unknown as React.FormEvent
                                    )
                                }
                            }}
                            placeholder="Type your message..."
                            disabled={isLoading}
                            className="min-h-[60px] max-h-[200px] resize-none w-full border-0 bg-transparent px-4 py-3 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0 focus-visible:bg-transparent hover:border-0 hover:bg-transparent transition-none"
                            rows={2}
                        />

                        {/* Integrated action bar */}
                        <div className="flex items-center gap-1 px-2 py-2 border-t border-white/[0.04]">
                            {/* Action buttons (left side) */}
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => setShowTemplateSelector(true)}
                                disabled={isLoading}
                                title="Use template"
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
                                title="Attach file"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
                            >
                                <Paperclip
                                    className={cn(
                                        "h-4 w-4",
                                        uploadingAttachment && "animate-spin"
                                    )}
                                />
                            </Button>

                            {/* Voice Input Button */}
                            {isRecordingSupported && (
                                <AnimatePresence mode="wait">
                                    {recordingStatus === "recording" ? (
                                        <motion.div
                                            key="recording-bar"
                                            initial={{ opacity: 0, width: 0 }}
                                            animate={{
                                                opacity: 1,
                                                width: "auto",
                                            }}
                                            exit={{ opacity: 0, width: 0 }}
                                            className="flex items-center gap-2 px-2"
                                        >
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                onClick={handleVoiceInput}
                                                title="Stop recording"
                                                className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                            >
                                                <Square className="h-4 w-4" />
                                            </Button>
                                            <span className="tabular-nums text-xs text-red-400 font-medium">
                                                {formatDuration(recordingDuration)}
                                            </span>
                                            <motion.span
                                                animate={{
                                                    opacity: [1, 0.3, 1],
                                                }}
                                                transition={{
                                                    repeat: Infinity,
                                                    duration: 1,
                                                }}
                                                className="h-2 w-2 rounded-full bg-red-500"
                                            />
                                        </motion.div>
                                    ) : recordingStatus === "processing" ? (
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
                                                title="Record audio"
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
                                            >
                                                <Mic className="h-4 w-4" />
                                            </Button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            )}

                            <div className="flex-1" />

                            {/* Send / Cancel button (right side) */}
                            {isLoading ? (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={handleCancelStream}
                                    className="h-8 px-3 gap-1.5"
                                >
                                    <Square className="h-3.5 w-3.5" />
                                    <span className="text-xs">Cancel</span>
                                </Button>
                            ) : (
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={
                                        !input.trim() &&
                                        attachments.length === 0
                                    }
                                    className="h-8 px-3 gap-1.5 bg-primary/90 hover:bg-primary"
                                >
                                    <Send className="h-3.5 w-3.5" />
                                    <span className="text-xs">Send</span>
                                </Button>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            {/* ─── Modals ─────────────────────────────────────────────── */}
            <TemplateSelector
                open={showTemplateSelector}
                onOpenChange={setShowTemplateSelector}
                templates={templatesData ?? []}
                isLoading={false}
                onSelectTemplate={handleSelectTemplate}
            />

            <TemplateForm
                open={showTemplateForm}
                onOpenChange={setShowTemplateForm}
                template={selectedTemplate}
                onSubmit={handleStartChatFromTemplate}
                onBack={handleTemplateFormBack}
                isSubmitting={isStartingFromTemplate}
            />

            {/* Memory Drawer (Feature 024) */}
            {projectId && (
                <MemoryDrawer
                    open={memoryDrawerOpen}
                    onOpenChange={setMemoryDrawerOpen}
                    projectId={projectId}
                />
            )}
        </div>
    )
}
