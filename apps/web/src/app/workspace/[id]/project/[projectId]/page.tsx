"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import { useAuthStore } from "@/lib/store"
import api, { getProjectSettings, ProjectSettings } from "@/lib/api"
import { useWorkspace } from "@/hooks/use-workspaces"
import { useProjects } from "@/hooks/use-projects"
import { useDocuments } from "@/hooks/use-documents"
import { documentService } from "@/lib/supabase/documents"
import { boardService } from "@/lib/supabase/boards"
import { foldersApi } from "@/lib/folders-api"
import { useContextFiles } from "@/hooks/use-context-files"
import { useCreateCopy } from "@/hooks/useCopyLibrary"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Plus, Upload, FileText, MoreHorizontal, Trash, X, FolderOpen, Folder, Home, Sparkles, Download, FileType, Share2, ArrowRight, Settings, History, Archive, LayoutDashboard } from "lucide-react"
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import ChatSidebar from "@/components/ChatSidebar"
import SmartEditor from "@/components/SmartEditor"
import KanbanBoard from "@/components/KanbanBoard"
import FolderDashboard from "@/components/FolderDashboard"
import ProjectDashboard from "@/components/ProjectDashboard"
import WorkspaceSidebar from "@/components/WorkspaceSidebar"
import CommandPalette from "@/components/CommandPalette"
import Breadcrumbs from "@/components/Breadcrumbs"
import ImageGallery from "@/components/ImageGallery"
import ImageUpload from "@/components/ImageUpload"
import LoadingSkeleton from "@/components/LoadingSkeleton"
import EmptyState from "@/components/EmptyState"
import DocumentAttachments from "@/components/document/DocumentAttachments"

// Feature 030: Dynamic imports for modal components to reduce initial bundle size
const ArchiveView = dynamic(() => import("@/components/ArchiveView"), {
    loading: () => <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
})
const ActivityLogPanel = dynamic(() => import("@/components/ActivityLogPanel"), {
    loading: () => <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
})
const ImageGenerationPanel = dynamic(() => import("@/components/ImageGenerationPanel"), {
    loading: () => <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
})
const ImageViewer = dynamic(() => import("@/components/ImageViewer"), {
    loading: () => <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
})
const ShareDialog = dynamic(() => import("@/components/ShareDialog"))
const VisualAssetsLibrary = dynamic(() => import("@/components/VisualAssetsLibrary"), {
    loading: () => <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
})
const AttachImageModal = dynamic(() => import("@/components/document/AttachImageModal"))
const ProjectSettingsForm = dynamic(() => import("@/components/project/ProjectSettingsForm"), {
    loading: () => <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
})
import { DocumentFilters, useDocumentFilters } from "@/components/document/DocumentFilters"
import { VersionHistoryPanel } from "@/components/document/VersionHistoryPanel"
import { MultiSelectProvider, MultiSelectActionBar, useMultiSelect } from "@/components/kanban"
import { useConfirm } from "@/components/confirm-dialog"
import { ImageIcon } from "lucide-react"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"

interface DocumentAttachment {
    id: string
    document_id: string
    image_id: string
    is_primary?: boolean
    attachment_order?: number
}

/**
 * Feature 028 T015-T016: Wrapper component that connects KanbanBoard to multi-select context
 */
function KanbanBoardWithMultiSelect({
    documents,
    onSelectDocument,
    onDelete,
    onStatusChange,
    onAddToLibrary,
    workspaceId,
    projectId
}: {
    documents: Document[]
    onSelectDocument: (doc: Document) => void
    onDelete?: (e: React.MouseEvent, doc: Document) => void
    onStatusChange?: (docId: string, newStatus: string) => void
    onAddToLibrary?: (doc: Document) => void
    workspaceId: string
    projectId: string
}) {
    const { selectedIds, toggleSelection } = useMultiSelect()

    const handleMultiSelect = (doc: Document, e: React.MouseEvent) => {
        const allIds = documents.map(d => d.id)
        toggleSelection(doc.id, e.shiftKey, allIds)
    }

    return (
        <>
            <KanbanBoard
                documents={documents}
                onSelectDocument={onSelectDocument}
                onDelete={onDelete}
                onStatusChange={onStatusChange}
                onAddToLibrary={onAddToLibrary}
                selectedIds={selectedIds}
                onMultiSelect={handleMultiSelect}
            />
            <MultiSelectActionBar
                documents={documents}
                workspaceId={workspaceId}
                projectId={projectId}
            />
        </>
    )
}

interface Document {
    id: string
    title: string
    status: string
    content?: string
    created_at: string
    type: "creation" | "context"
    is_context?: boolean
    board_id?: string | null
    board_column_id?: string | null
    media_type?: string
    file_url?: string
    thumbnail_url?: string
    generation_metadata?: any
    attachments?: DocumentAttachment[]
}

export default function ProjectPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const activeBoardId = searchParams.get('board')
    const activeFolderId = searchParams.get('folder')
    const requestedView = searchParams.get('view')
    const workspaceId = params.id as string
    const projectId = params.projectId as string

    const [creations, setCreations] = useState<Document[]>([])
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban")
    const [suggestedContent, setSuggestedContent] = useState<string | null>(null)
    const [showAssetsModal, setShowAssetsModal] = useState(false)
    const [showArchiveModal, setShowArchiveModal] = useState(false)
    const [showActivityModal, setShowActivityModal] = useState(false)
    const [showSettingsModal, setShowSettingsModal] = useState(false)
    const [editingTitle, setEditingTitle] = useState<string | null>(null)
    const [tempTitle, setTempTitle] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [autoApplyEdits, setAutoApplyEdits] = useState(false)
    const [isChatCollapsed, setIsChatCollapsed] = useState(false)
    const [projectName, setProjectName] = useState("")
    const [workspaceName, setWorkspaceName] = useState("")
    const [activeBoardName, setActiveBoardName] = useState<string | null>(null)
    const [activeBoardFolderName, setActiveBoardFolderName] = useState<string | null>(null)
    const [allProjects, setAllProjects] = useState<any[]>([])
    const [savedContent, setSavedContent] = useState<string>("")
    const [currentContent, setCurrentContent] = useState<string>("")
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
    const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
    const [pendingDocument, setPendingDocument] = useState<Document | null>(null)
    const [availableModels, setAvailableModels] = useState<string[]>([])
    const [defaultTextModel, setDefaultTextModel] = useState<string>("")
    const [showImageGenerator, setShowImageGenerator] = useState(false)
    const [refiningImage, setRefiningImage] = useState<Document | null>(null)
    const [viewingImage, setViewingImage] = useState<Document | null>(null)
    const [shareDialogOpen, setShareDialogOpen] = useState(false)
    const [sharingDocument, setSharingDocument] = useState<Document | null>(null)
    const [showAttachImageModal, setShowAttachImageModal] = useState(false)
    const [attachmentsRefreshKey, setAttachmentsRefreshKey] = useState(0)
    const [isSavingDocument, setIsSavingDocument] = useState(false)
    const [isCreatingDocument, setIsCreatingDocument] = useState(false)

    const { session, isLoading: authLoading } = useAuthStore()
    const router = useRouter()
    const { toast } = useToast()
    const confirm = useConfirm()

    // Use Supabase hooks for workspace, projects, and documents
    // These MUST be declared before any useEffects that use their data
    const { data: workspace } = useWorkspace(workspaceId)
    const { data: projects = [] } = useProjects(workspaceId)
    const { data: documents = [], isLoading: docsLoading, isRefreshing: docsRefreshing, isInitialLoad: docsInitialLoad, refetch: refetchDocuments } = useDocuments(projectId)
    const { data: contextFiles = [], isLoading: contextLoading, refetch: refetchContextFiles } = useContextFiles(projectId)
    // Feature 028 T031: Copy Library mutation
    const createCopyMutation = useCreateCopy(workspaceId)

    const hasUnsavedChanges = selectedDoc && savedContent !== currentContent

    // Filter creations for Kanban: show only text documents (exclude all images)
    const kanbanDocumentsBase = useMemo(() => {
        return creations.filter(doc => {
            // Only show text documents in Kanban
            // Images are accessible via "Assets Visuais" modal or as attachments
            if (doc.media_type === 'image') return false
            if (activeBoardId) return doc.board_id === activeBoardId
            return true
        })
    }, [creations, activeBoardId])

    useEffect(() => {
        if (requestedView === 'kanban' || requestedView === 'list') {
            setViewMode(requestedView)
        }
    }, [requestedView])

    // Feature 028 (T054, T055): Document filtering by tags and channel
    const {
        filteredDocuments: kanbanDocuments,
        selectedTags,
        selectedChannel,
        setSelectedTags,
        setSelectedChannel,
        hasActiveFilters
    } = useDocumentFilters(kanbanDocumentsBase)

    // Handle document updates from AI
    const handleDocumentUpdate = async (documentId: string) => {
        try {
            // Fetch the updated document content from the backend
            const response = await api.get(`/documents/${documentId}`)
            const updatedDoc = response.data

            if (updatedDoc && selectedDoc?.id === documentId) {
                const newContent = updatedDoc.content || ""

                if (autoApplyEdits) {
                    // Auto-apply: update the document immediately
                    setSelectedDoc({ ...selectedDoc, content: newContent })
                    setCreations(prev => prev.map(d => d.id === documentId ? { ...d, content: newContent } : d))
                    toast({ title: "Atualizado", description: "Alterações da IA aplicadas automaticamente." })
                } else {
                    // Manual review: show as suggestion
                    setSuggestedContent(newContent)
                    toast({ title: "Revisão Necessária", description: "A IA sugeriu alterações. Por favor, revise." })
                }
            }
        } catch (error) {
            console.error("Failed to fetch updated document", error)
        }
    }

    // Handle tool execution (for file/folder creation, editing and image attachment)
    const handleToolExecuted = async (toolName: string, toolResult?: any) => {
        console.log(`Tool executed: ${toolName}`, toolResult)

        // Refresh the document list when files/folders are created or moved
        if ([
            'create_document', 'create_folder',
            'move_file', 'move_folder',
            'delete_file', 'delete_folder',
            'rename_document', 'rename_folder',
            'list_boards', 'create_board',
            'move_file_to_board', 'move_board',
            'rename_board', 'delete_board'
        ].includes(toolName)) {
            await fetchDocuments()
            toast({ title: "Atualizado", description: "Lista de arquivos atualizada." })
        }

        // Handle document edits - refresh the current document if it was edited
        // Note: edit_document tool returns { id, title, content, status, message }
        if (toolName === 'edit_document' && toolResult?.id && selectedDoc && selectedDoc.id === toolResult.id) {
            // Use the content directly from the tool result (already have it)
            const newContent = toolResult.content || ""
            // Preserve existing title if tool result doesn't provide one
            // (toolResult.title can be null/undefined if not explicitly changed)
            const newTitle = toolResult.title ?? selectedDoc.title

            // Update editor with the new content immediately
            const updatedSelectedDoc: Document = {
                ...selectedDoc,
                content: newContent,
                title: newTitle
            }
            setSelectedDoc(updatedSelectedDoc)
            setSavedContent(newContent)
            setCurrentContent(newContent)
            setCreations(prev => prev.map(d => d.id === toolResult.id ? { ...d, content: newContent, title: newTitle } : d))
        }

        // Refresh attachments when images are generated or attached
        if (['generate_image', 'attach_image_to_document'].includes(toolName)) {
            await fetchDocuments()
            setAttachmentsRefreshKey(prev => prev + 1)
            toast({ title: "Imagem anexada", description: "A imagem foi anexada ao documento." })
        }
    }

    // Fetch full content when document is selected
    useEffect(() => {
        const docId = selectedDoc?.id
        if (!docId) return

        // Skip fetch for temp documents (being created in background)
        if (docId.startsWith('temp-')) return

        let cancelled = false

        const fetchDocumentContent = async () => {
            console.log(`📄 Fetching document content for: ${docId} (Supabase direct)`)
            try {
                // Use Supabase direct for faster loading
                const { data: docData, error } = await documentService.get(docId)

                // Check if this request was cancelled (user selected another doc)
                if (cancelled) {
                    console.log(`📄 Fetch cancelled for: ${docId} (user selected another doc)`)
                    return
                }

                if (error) {
                    throw error
                }

                if (docData) {
                    console.log(`📄 Document fetched successfully: ${docId}`, docData.title)

                    // Check if it's an image
                    if (docData.media_type === 'image') {
                        setViewingImage(docData as any)
                        setSelectedDoc(null)
                        return
                    }

                    const content = docData.content || ""
                    // Always update if the response matches the current request
                    setSelectedDoc(prev => {
                        if (prev?.id !== docId) {
                            console.log(`📄 Skipping update - selected doc changed from ${docId} to ${prev?.id}`)
                            return prev
                        }
                        // Cast to Document to handle null/undefined type mismatches from API
                        return {
                            ...prev,
                            ...docData,
                        } as Document
                    })
                    setSavedContent(content)
                    setCurrentContent(content)
                }
            } catch (error) {
                if (!cancelled) {
                    console.error("Failed to fetch document content", error)
                }
            }
        }

        fetchDocumentContent()

        // Cleanup function to cancel if doc changes
        return () => {
            cancelled = true
        }
    }, [selectedDoc?.id])

    // Listen for image navigation events
    useEffect(() => {
        const handleImageNavigation = (e: any) => {
            const imageId = e.detail?.imageId
            if (imageId) {
                const allDocs = [...creations, ...(contextFiles || [])]
                const image = allDocs.find(doc => doc.id === imageId)
                if (image && image.media_type === 'image') {
                    setViewingImage(image as Document)
                }
            }
        }

        const handleImageTitleUpdate = () => {
            // Refresh documents when title is updated
            fetchDocuments()
        }

        window.addEventListener('navigate-image', handleImageNavigation)
        window.addEventListener('image-title-updated', handleImageTitleUpdate)
        return () => {
            window.removeEventListener('navigate-image', handleImageNavigation)
            window.removeEventListener('image-title-updated', handleImageTitleUpdate)
        }
    }, [creations, contextFiles])

    useEffect(() => {
        if (authLoading) return

        if (!session) {
            router.push("/login")
            return
        }
        // Documents and context files are now loaded automatically via hooks
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, authLoading, projectId])

    // Handle ?doc= query parameter to auto-select document from sidebar
    useEffect(() => {
        const docId = searchParams.get('doc')
        if (docId && creations.length > 0) {
            // Find document in creations or context files
            const doc = creations.find(d => d.id === docId) || contextFiles?.find(f => f.id === docId)
            if (doc && doc.id !== selectedDoc?.id) {
                handleSelectDocument(doc as Document)
            }
        }
    }, [searchParams, creations, contextFiles])

    // Track previous document signature to avoid stale local state when metadata changes
    const prevDocsSignatureRef = useRef<string>('')

    // Update local state when hooks data changes
    useEffect(() => {
        if (workspace) {
            setWorkspaceName(workspace.name || '')
            setAvailableModels((workspace as any).available_models || [])
            setDefaultTextModel((workspace as any).default_text_model || '')
        }
    }, [workspace])

    // Nome do quadro ativo quando ?board= está na URL
    useEffect(() => {
        if (!projectId) return
        if (!activeBoardId) {
            setActiveBoardName(null)
            setActiveBoardFolderName(null)
            return
        }
        let cancelled = false

        const loadBoardPath = async () => {
            const { data } = await boardService.listByProject(projectId)
            if (cancelled || !data) return

            const board = data.find(b => b.id === activeBoardId)
            if (!board) {
                setActiveBoardName(null)
                setActiveBoardFolderName(null)
                return
            }

            setActiveBoardName(board.name)

            if (!board.folder_id) {
                setActiveBoardFolderName(null)
                return
            }

            const folders = await foldersApi.list(projectId)
            if (cancelled) return
            const folder = folders.find((f: any) => f.id === board.folder_id)
            setActiveBoardFolderName(folder?.name || null)
        }

        loadBoardPath().catch(() => {
            if (!cancelled) {
                setActiveBoardName(null)
                setActiveBoardFolderName(null)
            }
        })
        return () => { cancelled = true }
    }, [projectId, activeBoardId])

    useEffect(() => {
        if (projects && projects.length > 0) {
            setAllProjects(projects)
            const currentProject = projects.find((p: any) => p.id === projectId)
            if (currentProject) {
                setProjectName(currentProject.name)
            }
        }
    }, [projects, projectId])

    useEffect(() => {
        if (documents) {
            // Update when IDs OR relevant metadata (board/status/title/update time) change
            const newSignature = documents
                .map((d: any) => `${d.id}:${d.updated_at || ''}:${d.board_id || ''}:${d.board_column_id || ''}:${d.status || ''}:${d.title || ''}`)
                .sort()
                .join('|')

            if (newSignature !== prevDocsSignatureRef.current) {
                prevDocsSignatureRef.current = newSignature
                if (documents.length > 0) {
                    setCreations(documents.map((d: any) => ({ ...d, type: "creation", is_context: false })))
                } else {
                    setCreations([])
                }
            }
        }
    }, [documents])

    useEffect(() => {
        setIsLoading(docsLoading)
    }, [docsLoading])

    // Legacy fetchDocuments function - now just triggers refetch
    const fetchDocuments = async () => {
        refetchDocuments()
        refetchContextFiles()
    }

    const handleFileUpload = async (file: File, isContext: boolean = false) => {
        const formData = new FormData()
        formData.append("file", file)

        setIsUploading(true)
        try {
            await api.post(`/documents/upload/${projectId}?is_context=${isContext}`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            })
            toast({
                title: "Sucesso",
                description: isContext
                    ? "Arquivo de contexto enviado! Será usado como referência pelo chat."
                    : "Arquivo enviado com sucesso! Processamento iniciado."
            })
            // Refresh documents after upload
            setTimeout(() => fetchDocuments(), 2000)
        } catch (error) {
            console.error("Upload failed", error)
            toast({ title: "Erro", description: "Falha no upload", variant: "destructive" })
            throw error
        } finally {
            setIsUploading(false)
        }
    }

    // Handle breadcrumb click for current project - should close document and return to kanban
    const closeEditor = useCallback(() => {
        setSelectedDoc(null)
        setViewingImage(null)
        setSavedContent("")
        setCurrentContent("")
    }, [])

    const handleProjectBreadcrumbClick = () => {
        if (selectedDoc || viewingImage) closeEditor()
    }

    useEffect(() => {
        const onBoardSelected = (event: Event) => {
            const custom = event as CustomEvent<{ projectId?: string }>
            if (custom.detail?.projectId && custom.detail.projectId !== projectId) return
            closeEditor()
        }
        window.addEventListener('project-board-selected', onBoardSelected as EventListener)
        return () => window.removeEventListener('project-board-selected', onBoardSelected as EventListener)
    }, [projectId, closeEditor])

    const breadcrumbItems = [
        { label: "Home", href: `/workspace/${workspaceId}`, icon: <Home className="h-3.5 w-3.5" /> },
        { label: workspaceName || "Workspace", href: `/workspace/${workspaceId}`, icon: <FolderOpen className="h-3.5 w-3.5" /> },
        { label: projectName || "Projeto", onClick: handleProjectBreadcrumbClick, icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
        ...(activeBoardFolderName ? [{ label: activeBoardFolderName, onClick: handleProjectBreadcrumbClick, icon: <Folder className="h-3.5 w-3.5" /> }] : []),
        { label: "Criações", onClick: handleProjectBreadcrumbClick, icon: <FileText className="h-3.5 w-3.5" /> },
    ]

    const handleSaveDocument = async (content: string, documentId?: string) => {
        // Use the provided documentId or fallback to selectedDoc.id
        // This ensures we save to the correct document even if selectedDoc changed
        const docId = documentId || selectedDoc?.id
        if (!docId) return

        const docToSave = creations.find(d => d.id === docId) || (contextFiles || []).find(f => f.id === docId)
        if (!docToSave) return

        setIsSavingDocument(true)
        try {
            const response = await api.put(`/documents/${docId}`, { content })

            // Use the backend response to ensure we have the latest data including updated_at
            const updatedDoc = { ...docToSave, ...response.data }
            setCreations(docs => docs.map(d => d.id === docId ? updatedDoc : d))

            // Only update selected doc and content states if this is the currently selected document
            if (selectedDoc?.id === docId) {
                setSelectedDoc(updatedDoc)
                setSavedContent(content)
                setCurrentContent(content)
            }

            // Show updated_at in toast if available
            const timestamp = updatedDoc.updated_at ? new Date(updatedDoc.updated_at).toLocaleTimeString('pt-BR') : ''
            toast({
                title: "Salvo",
                description: timestamp ? `Documento salvo às ${timestamp}` : "Conteúdo do documento salvo com sucesso."
            })
        } catch (error) {
            console.error("Failed to save document", error)
            toast({ title: "Erro", description: "Falha ao salvar documento", variant: "destructive" })
        } finally {
            setIsSavingDocument(false)
        }
    }

    // Create a save handler that captures the current document ID
    // This prevents saving to the wrong document when selectedDoc changes during async operations
    const createSaveHandler = useCallback((docId: string) => {
        return (content: string) => handleSaveDocument(content, docId)
    }, [creations, contextFiles])

    // Navigation with unsaved changes check
    const handleNavigateToDocument = (url: string) => {
        if (hasUnsavedChanges) {
            setPendingNavigation(url)
            setShowUnsavedDialog(true)
        } else {
            router.push(url)
        }
    }

    const handleConfirmNavigationWithoutSave = () => {
        if (pendingNavigation) {
            setShowUnsavedDialog(false)
            router.push(pendingNavigation)
            setPendingNavigation(null)
            // Don't clear savedContent/currentContent here - let the useEffect handle it when new doc loads
        }
    }

    const handleSaveAndNavigate = async () => {
        if (selectedDoc && currentContent) {
            await handleSaveDocument(currentContent)
        }
        if (pendingNavigation) {
            setShowUnsavedDialog(false)
            router.push(pendingNavigation)
            setPendingNavigation(null)
        }
    }

    const handleCancelNavigation = () => {
        setShowUnsavedDialog(false)
        setPendingNavigation(null)
        setPendingDocument(null)
    }

    // Handle document selection with unsaved changes check
    const handleSelectDocument = (doc: Document) => {
        // Don't do anything if clicking the same document
        if (selectedDoc?.id === doc.id) return

        if (hasUnsavedChanges) {
            setPendingDocument(doc)
            setShowUnsavedDialog(true)
        } else {
            // Clear current content to prevent showing wrong document's content while loading
            setCurrentContent("")
            setSavedContent("")
            setSelectedDoc(doc)
        }
    }

    const handleConfirmDocumentChangeWithoutSave = () => {
        if (pendingDocument) {
            setShowUnsavedDialog(false)
            // Clear current content to prevent showing wrong document's content while loading
            setCurrentContent("")
            setSavedContent("")
            setSelectedDoc(pendingDocument)
            setPendingDocument(null)
            setPendingNavigation(null)
        } else if (pendingNavigation) {
            handleConfirmNavigationWithoutSave()
        }
    }

    const handleSaveAndChangeDocument = async () => {
        if (selectedDoc && currentContent) {
            await handleSaveDocument(currentContent)
        }
        if (pendingDocument) {
            setShowUnsavedDialog(false)
            // Clear current content to prevent showing wrong document's content while loading
            setCurrentContent("")
            setSavedContent("")
            setSelectedDoc(pendingDocument)
            setPendingDocument(null)
            setPendingNavigation(null)
        } else if (pendingNavigation) {
            handleSaveAndNavigate()
        }
    }

    const handleCreateCreation = async () => {
        // Prevent multiple clicks with debounce
        if (isCreatingDocument) return
        setIsCreatingDocument(true)

        // Generate a temporary ID for optimistic UI
        const tempId = `temp-${Date.now()}`
        const tempDoc: Document = {
            id: tempId,
            title: "Nova Criação",
            content: "",
            status: "draft",
            type: "creation",
            is_context: false,
            board_id: activeBoardId || null,
            created_at: new Date().toISOString()
        }

        // INSTANT FEEDBACK: Add temp doc to list and select it immediately
        // This provides <200ms feedback to the user
        setCreations(prev => [tempDoc, ...prev])
        setSelectedDoc(tempDoc)
        setSavedContent("")
        setCurrentContent("")

        try {
            // Create document in background
            const newDocData = {
                title: "Nova Criação",
                content: "",
                status: "draft",
                board_id: activeBoardId || null,
            }

            const response = await api.post(`/documents/projects/${projectId}/documents`, newDocData)
            // API returns camelCase (Drizzle), normalize to snake_case for frontend consistency
            const d = response.data
            const newDoc = {
                ...d,
                project_id: d.projectId ?? d.project_id,
                folder_id: d.folderId ?? d.folder_id,
                board_id: d.boardId ?? d.board_id,
                board_column_id: d.boardColumnId ?? d.board_column_id,
                is_context: d.isContext ?? d.is_context ?? false,
                is_reference_asset: d.isReferenceAsset ?? d.is_reference_asset ?? false,
                media_type: d.mediaType ?? d.media_type,
                created_at: d.createdAt ?? d.created_at,
                updated_at: d.updatedAt ?? d.updated_at,
                type: "creation" as const,
            }

            // Replace temp doc with real doc in list
            setCreations(prev => prev.map(d => d.id === tempId ? newDoc : d))

            // Update selected doc to real doc (seamless transition)
            setSelectedDoc(newDoc)

            toast({ title: "Criado", description: "Nova criação iniciada." })
        } catch (error) {
            console.error("Failed to create document", error)

            // Remove temp doc on error
            setCreations(prev => prev.filter(d => d.id !== tempId))

            // Clear selection and show error
            setSelectedDoc(null)

            toast({
                title: "Erro",
                description: "Falha ao criar documento. Tente novamente.",
                variant: "destructive"
            })
        } finally {
            setIsCreatingDocument(false)
        }
    }

    // Feature 028 T031: Add document to copy library
    const handleAddToLibrary = async (doc: Document) => {
        if (!doc.content && doc.media_type !== 'text') {
            toast({
                title: "Conteúdo vazio",
                description: "Este documento não possui conteúdo de texto para adicionar à biblioteca",
                variant: "destructive"
            })
            return
        }

        try {
            await createCopyMutation.mutateAsync({
                title: doc.title,
                content: doc.content || '',
                tags: []
            })
            toast({
                title: "Adicionado à Biblioteca",
                description: `"${doc.title}" foi salvo na biblioteca de copies`
            })
        } catch (error) {
            console.error("Failed to add to library", error)
            toast({
                title: "Erro",
                description: "Falha ao adicionar à biblioteca",
                variant: "destructive"
            })
        }
    }

    const handleDelete = async (e: React.MouseEvent, doc: Document) => {
        e.stopPropagation()

        // Check if document has attachments
        const hasAttachments = doc.attachments && doc.attachments.length > 0

        if (hasAttachments) {
            const imageCount = doc.attachments!.length
            const confirmed = await confirm({
                title: "Excluir documento",
                description: `Este documento possui ${imageCount} ${imageCount === 1 ? 'imagem anexada' : 'imagens anexadas'}. O que deseja fazer?`,
                confirmLabel: "Apagar documento + imagens",
                cancelLabel: "Apagar só documento",
                variant: "destructive",
            })

            // User clicked "Cancel" (actually means delete only document)
            if (confirmed === false) {
                // Delete only document, keep images
                try {
                    await api.delete(`/documents/${doc.id}`)
                    setCreations(prev => prev.filter(d => d.id !== doc.id))
                    if (selectedDoc?.id === doc.id) setSelectedDoc(null)
                    fetchDocuments()
                    toast({ title: "Excluído", description: "Documento excluído. Imagens mantidas em Assets Visuais." })
                } catch (error) {
                    console.error("Failed to delete document", error)
                    toast({ title: "Erro", description: "Falha ao excluir documento", variant: "destructive" })
                }
                return
            }

            // User clicked "Confirm" (delete document + images)
            if (confirmed === true) {
                try {
                    // Delete document (will cascade delete attachments)
                    await api.delete(`/documents/${doc.id}`)
                    // Delete each attached image
                    for (const attachment of doc.attachments!) {
                        try {
                            await api.delete(`/documents/${attachment.image_id}`)
                        } catch (err) {
                            console.warn(`Failed to delete image ${attachment.image_id}`, err)
                        }
                    }
                    setCreations(prev => prev.filter(d => d.id !== doc.id))
                    if (selectedDoc?.id === doc.id) setSelectedDoc(null)
                    fetchDocuments()
                    toast({ title: "Excluído", description: "Documento e imagens excluídos com sucesso." })
                } catch (error) {
                    console.error("Failed to delete document", error)
                    toast({ title: "Erro", description: "Falha ao excluir documento", variant: "destructive" })
                }
                return
            }
        } else {
            // No attachments, simple delete
            const confirmed = await confirm({
                title: "Excluir documento",
                description: "Tem certeza que deseja excluir este documento?",
                confirmLabel: "Excluir",
                cancelLabel: "Cancelar",
                variant: "destructive",
            })
            if (!confirmed) return

            try {
                await api.delete(`/documents/${doc.id}`)
                setCreations(prev => prev.filter(d => d.id !== doc.id))
                if (selectedDoc?.id === doc.id) setSelectedDoc(null)
                fetchDocuments()
                toast({ title: "Excluído", description: "Documento excluído com sucesso." })
            } catch (error) {
                console.error("Failed to delete document", error)
                toast({ title: "Erro", description: "Falha ao excluir documento", variant: "destructive" })
            }
        }
    }

    const handleExport = async (format: 'pdf' | 'docx' | 'md') => {
        if (!selectedDoc) return

        try {
            const response = await api.get(`/documents/${selectedDoc.id}/export/${format}`, {
                responseType: 'blob'
            })

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.download = `${selectedDoc.title}.${format}`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)

            toast({
                title: "Exportado com sucesso!",
                description: `Documento exportado como ${format.toUpperCase()}`
            })
        } catch (error: any) {
            console.error("Failed to export document", error)
            toast({
                title: "Erro ao exportar",
                description: error.response?.data?.detail || "Falha ao exportar documento",
                variant: "destructive"
            })
        }
    }

    const handleShare = () => {
        if (selectedDoc) {
            setSharingDocument(selectedDoc)
            setShareDialogOpen(true)
        }
    }

    const handleStartEditTitle = (doc: Document) => {
        setEditingTitle(doc.id)
        setTempTitle(doc.title)
    }

    const handleSaveTitle = async () => {
        if (!editingTitle || !tempTitle.trim()) {
            setEditingTitle(null)
            return
        }

        try {
            await api.put(`/documents/${editingTitle}`, { title: tempTitle.trim() })

            setCreations(prev =>
                prev.map(d => d.id === editingTitle ? { ...d, title: tempTitle.trim() } : d)
            )

            if (selectedDoc?.id === editingTitle) {
                setSelectedDoc({ ...selectedDoc, title: tempTitle.trim() })
            }

            setEditingTitle(null)
            toast({ title: "Atualizado", description: "Título atualizado com sucesso." })
        } catch (error) {
            console.error("Failed to update title", error)
            toast({ title: "Erro", description: "Falha ao atualizar título", variant: "destructive" })
        }
    }

    return (
        <div className="flex h-screen overflow-hidden relative">
            {/* Command Palette */}
            <CommandPalette
                projects={allProjects}
                documents={creations.map(d => ({ ...d, projectId }))}
                workspaceId={workspaceId}
                onCreateDocument={handleCreateCreation}
                onUploadFile={() => document.getElementById('file-upload-trigger')?.click()}
            />

            {/* Floating sidebar container */}
            <div className="p-3 pr-0">
                <WorkspaceSidebar onDocumentNavigate={handleNavigateToDocument} className="h-[calc(100vh-24px)]" />
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header with Breadcrumbs */}
                <div className="px-6 py-6 border-b border-white/10">
                    <Breadcrumbs items={breadcrumbItems} className="mb-3" />
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl font-bold tracking-tight truncate">
                                {activeBoardName ?? projectName ?? "Conteúdo do Projeto"}
                            </h1>
                            {projectName && (
                                <p className="text-sm text-slate-500 truncate mt-0.5">
                                    Projeto: {projectName}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/workspace/${workspaceId}/project/${projectId}/studio`)}
                                className="gap-2"
                            >
                                <Sparkles className="h-4 w-4" />
                                Gerar Imagem
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAssetsModal(true)}
                                className="gap-2"
                            >
                                <ImageIcon className="h-4 w-4" />
                                Assets Visuais
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowSettingsModal(true)}
                                className="gap-2"
                            >
                                <Settings className="h-4 w-4" />
                                Configurações
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <MoreHorizontal className="h-4 w-4" />
                                        Mais
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setShowArchiveModal(true)}>
                                        <Archive className="mr-2 h-4 w-4" />
                                        Arquivados
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setShowActivityModal(true)}>
                                        <History className="mr-2 h-4 w-4" />
                                        Atividades
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toast({
                                    title: "Dica",
                                    description: "Pressione Cmd+K para abrir a paleta de comandos"
                                })}
                            >
                                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground opacity-100">
                                    <span className="text-xs">⌘</span>K
                                </kbd>
                            </Button>
                        </div>
                    </div>
                </div>

                <MultiSelectProvider>
                <div className="flex-1 overflow-y-auto p-6">
                    {selectedDoc ? (
                        // Show loading skeleton for temp documents being created
                        selectedDoc.id.startsWith('temp-') ? (
                            <div className="h-full flex flex-col gap-4">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                        <h2 className="text-xl font-semibold text-muted-foreground">
                                            Criando documento...
                                        </h2>
                                    </div>
                                </div>
                                <div className="flex-1 border rounded-lg overflow-hidden">
                                    <div className="h-full flex flex-col p-6 gap-4">
                                        <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-3/4" />
                                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-full" />
                                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-5/6" />
                                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-4/6" />
                                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-2/3" />
                                    </div>
                                </div>
                            </div>
                        ) : (
                        <div className="h-full flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                {editingTitle === selectedDoc.id ? (
                                    <Input
                                        value={tempTitle}
                                        onChange={(e) => setTempTitle(e.target.value)}
                                        onBlur={handleSaveTitle}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveTitle()
                                            if (e.key === 'Escape') setEditingTitle(null)
                                        }}
                                        autoFocus
                                        className="text-xl font-semibold"
                                    />
                                ) : (
                                    <h2
                                        className="text-xl font-semibold cursor-pointer hover:text-primary"
                                        onDoubleClick={() => handleStartEditTitle(selectedDoc)}
                                        title="Clique duplo para editar"
                                    >
                                        {selectedDoc.title}
                                    </h2>
                                )}
                                <div className="flex gap-2 items-center">
                                    <Button variant="outline" size="sm" onClick={closeEditor} className="gap-1.5">
                                        <X className="h-4 w-4" />
                                        Fechar
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={closeEditor}>
                                                <X className="mr-2 h-4 w-4" />
                                                Fechar Editor
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => handleExport('pdf')}>
                                                <Download className="mr-2 h-4 w-4" />
                                                Exportar como PDF
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleExport('docx')}>
                                                <FileType className="mr-2 h-4 w-4" />
                                                Exportar como DOCX
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleExport('md')}>
                                                <FileText className="mr-2 h-4 w-4" />
                                                Exportar como Markdown
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={handleShare}>
                                                <Share2 className="mr-2 h-4 w-4" />
                                                Compartilhar Publicamente
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            {/* Feature 028 T061: Version history */}
                                            <VersionHistoryPanel
                                                documentId={selectedDoc.id}
                                                currentTitle={selectedDoc.title}
                                                onRestoreComplete={() => fetchDocuments()}
                                                trigger={
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                        <History className="mr-2 h-4 w-4" />
                                                        Ver Histórico
                                                    </DropdownMenuItem>
                                                }
                                            />
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={(e) => handleDelete(e, selectedDoc)}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash className="mr-2 h-4 w-4" />
                                                Excluir Arquivo
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                            <div className="flex-1 border rounded-lg overflow-hidden">
                                {selectedDoc.media_type !== 'image' ? (
                                    <ResizablePanelGroup direction="vertical" className="h-full">
                                        <ResizablePanel defaultSize={70} minSize={10}>
                                            <div className="h-full">
                                                <SmartEditor
                                                    key={selectedDoc.id}
                                                    initialContent={selectedDoc.content || ""}
                                                    onSave={createSaveHandler(selectedDoc.id)}
                                                    suggestedContent={suggestedContent}
                                                    onAcceptSuggestion={() => {
                                                        if (suggestedContent && selectedDoc) {
                                                            handleSaveDocument(suggestedContent)
                                                            setSuggestedContent(null)
                                                        }
                                                    }}
                                                    onRejectSuggestion={() => setSuggestedContent(null)}
                                                    onChange={setCurrentContent}
                                                    isSaving={isSavingDocument}
                                                />
                                            </div>
                                        </ResizablePanel>
                                        <ResizableHandle withHandle />
                                        <ResizablePanel defaultSize={30} minSize={5}>
                                            <div className="h-full overflow-auto p-4 bg-gray-50/50 dark:bg-gray-900/30">
                                                <DocumentAttachments
                                                    key={attachmentsRefreshKey}
                                                    documentId={selectedDoc.id}
                                                    onAttachImage={() => setShowAttachImageModal(true)}
                                                    compact
                                                />
                                            </div>
                                        </ResizablePanel>
                                    </ResizablePanelGroup>
                                ) : (
                                    <div className="h-full">
                                        <SmartEditor
                                            key={selectedDoc.id}
                                            initialContent={selectedDoc.content || ""}
                                            onSave={createSaveHandler(selectedDoc.id)}
                                            suggestedContent={suggestedContent}
                                            onAcceptSuggestion={() => {
                                                if (suggestedContent && selectedDoc) {
                                                    handleSaveDocument(suggestedContent)
                                                    setSuggestedContent(null)
                                                }
                                            }}
                                            onRejectSuggestion={() => setSuggestedContent(null)}
                                            onChange={setCurrentContent}
                                            isSaving={isSavingDocument}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        )
                    ) : activeFolderId ? (
                        <FolderDashboard
                            folderId={activeFolderId}
                            projectId={projectId}
                            workspaceId={workspaceId}
                            allDocuments={creations}
                            onNavigateToBoard={(boardId) => {
                                router.push(`/workspace/${workspaceId}/project/${projectId}?board=${boardId}&view=kanban`)
                            }}
                        />
                    ) : !activeBoardId && requestedView !== 'kanban' ? (
                        <ProjectDashboard
                            projectId={projectId}
                            projectName={projectName}
                            workspaceId={workspaceId}
                            allDocuments={creations}
                            onNavigateToBoard={(boardId) => {
                                router.push(`/workspace/${workspaceId}/project/${projectId}?board=${boardId}&view=kanban`)
                            }}
                            onNavigateToFolder={(folderId) => {
                                router.push(`/workspace/${workspaceId}/project/${projectId}?folder=${folderId}`)
                            }}
                        />
                    ) : (
                        <div className="h-full overflow-hidden">
                            <div className="h-full flex flex-col gap-6">
                                    {/* Feature 028 (T054, T055): Document filters */}
                                    {creations.length > 0 && (
                                        <DocumentFilters
                                            documents={kanbanDocumentsBase}
                                            selectedTags={selectedTags}
                                            selectedChannel={selectedChannel}
                                            onTagsChange={setSelectedTags}
                                            onChannelChange={setSelectedChannel}
                                        />
                                    )}

                                    <div className="flex-1 overflow-x-auto">
                                        {docsInitialLoad ? (
                                            <LoadingSkeleton type="kanban" />
                                        ) : creations.length === 0 ? (
                                            <EmptyState
                                                icon={FileText}
                                                title="Nenhuma criação ainda"
                                                description="Comece criando seu primeiro documento de conteúdo"
                                                action={{
                                                    label: "Nova Criação",
                                                    onClick: handleCreateCreation
                                                }}
                                            />
                                        ) : viewMode === "kanban" ? (
                                            <KanbanBoardWithMultiSelect
                                                documents={kanbanDocuments}
                                                onSelectDocument={handleSelectDocument}
                                                onDelete={handleDelete}
                                                onStatusChange={(docId, newStatus) => {
                                                    setCreations(prev => prev.map(d =>
                                                        d.id === docId ? { ...d, status: newStatus } : d
                                                    ))
                                                }}
                                                onAddToLibrary={handleAddToLibrary}
                                                workspaceId={workspaceId}
                                                projectId={projectId}
                                            />
                                        ) : (
                                            <div className="grid grid-cols-1 gap-4">
                                                {kanbanDocuments.map(doc => (
                                                    <Card key={doc.id} glass className="p-4 cursor-pointer" onClick={() => handleSelectDocument(doc)}>
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex-1" onDoubleClick={(e) => { e.stopPropagation(); handleStartEditTitle(doc); }}>
                                                                {editingTitle === doc.id ? (
                                                                    <Input
                                                                        value={tempTitle}
                                                                        onChange={(e) => setTempTitle(e.target.value)}
                                                                        onBlur={handleSaveTitle}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') handleSaveTitle()
                                                                            if (e.key === 'Escape') setEditingTitle(null)
                                                                        }}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        autoFocus
                                                                        className="font-medium mb-1"
                                                                    />
                                                                ) : (
                                                                    <div className="font-medium" title="Clique duplo para editar">{doc.title}</div>
                                                                )}
                                                                <div className="text-sm text-muted-foreground">{doc.status}</div>
                                                            </div>
                                                            <div className="flex gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-destructive/50 hover:text-destructive"
                                                                    onClick={(e) => handleDelete(e, doc)}
                                                                >
                                                                    ×
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                    )}
                </div>
                </MultiSelectProvider>

                {/* FAB - Floating Action Button (only in kanban/board view) */}
                {!selectedDoc && !activeFolderId && (activeBoardId || requestedView === 'kanban') && (
                    <Button
                        onClick={handleCreateCreation}
                        disabled={isCreatingDocument}
                        className="fixed bottom-8 right-[420px] z-40 gap-2 shadow-2xl hover:shadow-xl transition-all hover:scale-105"
                    >
                        {isCreatingDocument ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Criando...
                            </>
                        ) : (
                            <>
                                <Plus className="h-4 w-4" />
                                Nova Criação
                            </>
                        )}
                    </Button>
                )}
            </div>

            {/* Floating chat sidebar container — when collapsed, no width so content goes full width; only the button floats */}
            <div className={isChatCollapsed ? "absolute right-0 top-0 bottom-0 w-0 overflow-visible z-10" : "p-3 pl-0"}>
                <ChatSidebar
                    workspaceId={workspaceId}
                    projectId={projectId}
                    currentBoardId={activeBoardId}
                    currentDocument={selectedDoc}
                    onAiSuggestion={setSuggestedContent}
                    documents={[...creations, ...(contextFiles || []).map((f: any) => ({ ...f, type: "context" as const }))]}
                    autoApplyEdits={autoApplyEdits}
                    onAutoApplyChange={setAutoApplyEdits}
                    onDocumentUpdate={handleDocumentUpdate}
                    onToolExecuted={handleToolExecuted}
                    onNavigateToDocument={(docId) => {
                        // Find the document and select it
                        const doc = creations.find(d => d.id === docId) || contextFiles?.find(f => f.id === docId)
                        if (doc) {
                            handleSelectDocument(doc as Document)
                        } else {
                            // If not found in current list, refresh and try again
                            fetchDocuments().then(() => {
                                const updatedDoc = creations.find(d => d.id === docId) || (contextFiles || []).find(f => f.id === docId)
                                if (updatedDoc) {
                                    handleSelectDocument(updatedDoc as Document)
                                }
                            })
                        }
                    }}
                    availableModels={availableModels}
                    defaultModel={defaultTextModel}
                    className="h-[calc(100vh-24px)]"
                    onCollapsedChange={setIsChatCollapsed}
                />
            </div>

            {/* Unsaved Changes Dialog */}
            <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você tem alterações não salvas neste documento. O que deseja fazer?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancelNavigation}>
                            Cancelar
                        </AlertDialogCancel>
                        <Button variant="destructive" onClick={handleConfirmDocumentChangeWithoutSave}>
                            Descartar alterações
                        </Button>
                        <AlertDialogAction onClick={handleSaveAndChangeDocument}>
                            Salvar e continuar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Assets Visuais Modal */}
            <Dialog open={showAssetsModal} onOpenChange={setShowAssetsModal}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Assets Visuais</DialogTitle>
                    </DialogHeader>
                    <VisualAssetsLibrary projectId={projectId} />
                </DialogContent>
            </Dialog>

            {/* Configurações Modal */}
            <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Configurações do Projeto</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4">
                        <ProjectSettingsForm
                            projectId={projectId}
                            workspaceId={workspaceId}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Arquivados Modal (Controlled) */}
            <ArchiveView
                projectId={projectId}
                onRestore={() => {
                    fetchDocuments()
                    setShowArchiveModal(false)
                }}
                controlled
                open={showArchiveModal}
                onOpenChange={setShowArchiveModal}
            />

            {/* Atividades Modal (Controlled) */}
            <ActivityLogPanel
                projectId={projectId}
                controlled
                open={showActivityModal}
                onOpenChange={setShowActivityModal}
            />

            {/* Image Generation Panel */}
            <ImageGenerationPanel
                open={showImageGenerator}
                onOpenChange={(open) => {
                    setShowImageGenerator(open)
                    if (!open) {
                        // Clear refining image when closing
                        setRefiningImage(null)
                    }
                }}
                projectId={projectId}
                documents={[...creations, ...(contextFiles || []).map((f: any) => ({ ...f, type: "context" as const }))]}
                documentId={refiningImage?.id}
                existingPrompt={refiningImage?.content || ""}
                attachToDocumentId={selectedDoc?.media_type !== 'image' ? selectedDoc?.id : undefined}
                attachToDocumentTitle={selectedDoc?.media_type !== 'image' ? selectedDoc?.title : undefined}
                onImageGenerated={() => {
                    fetchDocuments()
                    setAttachmentsRefreshKey(prev => prev + 1)
                    setRefiningImage(null)
                    toast({
                        title: refiningImage ? "Imagem refinada!" : "Imagem criada!",
                        description: refiningImage
                            ? "A imagem foi refinada com sucesso"
                            : "A imagem foi gerada e adicionada ao projeto"
                    })
                }}
            />

            {/* Image Viewer */}
            <ImageViewer
                image={viewingImage}
                onClose={() => setViewingImage(null)}
                onRefine={(imageId) => {
                    // Store the image being refined
                    setRefiningImage(viewingImage)
                    setViewingImage(null)
                    setShowImageGenerator(true)
                }}
                onArchive={() => {
                    fetchDocuments()
                }}
                allImages={[...creations, ...(contextFiles || []).map((f: any) => ({ ...f, type: "context" as const }))].filter(doc => doc.media_type === 'image')}
            />

            {/* Share Dialog */}
            <ShareDialog
                open={shareDialogOpen}
                onOpenChange={setShareDialogOpen}
                documentId={sharingDocument?.id || null}
                documentTitle={sharingDocument?.title || ""}
            />

            {/* Attach Image Modal */}
            {selectedDoc && (
                <AttachImageModal
                    isOpen={showAttachImageModal}
                    onClose={() => setShowAttachImageModal(false)}
                    documentId={selectedDoc.id}
                    projectId={projectId}
                    onSuccess={() => {
                        // Increment key to force DocumentAttachments to re-mount and fetch fresh data
                        setAttachmentsRefreshKey(prev => prev + 1)
                    }}
                />
            )}
        </div>
    )
}
