"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useAuthStore } from "@/lib/store"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Plus, Upload, FileText, MoreHorizontal, Trash, X, Star, FolderOpen, Home, Sparkles, ImageIcon, Download, FileType, Share2, Workflow } from "lucide-react"
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
import ChatSidebar from "@/components/ChatSidebar"
import SmartEditor from "@/components/SmartEditor"
import KanbanBoard from "@/components/KanbanBoard"
import WorkspaceSidebar from "@/components/WorkspaceSidebar"
import CommandPalette from "@/components/CommandPalette"
import Breadcrumbs from "@/components/Breadcrumbs"
import ImageGallery from "@/components/ImageGallery"
import ImageUpload from "@/components/ImageUpload"
import LoadingSkeleton from "@/components/LoadingSkeleton"
import EmptyState from "@/components/EmptyState"
import ArchiveView from "@/components/ArchiveView"
import ActivityLogPanel from "@/components/ActivityLogPanel"
import ImageGenerationPanel from "@/components/ImageGenerationPanel"
import ImageViewer from "@/components/ImageViewer"
import ShareDialog from "@/components/ShareDialog"
import VisualAssetsLibrary from "@/components/VisualAssetsLibrary"
import DocumentAttachments from "@/components/document/DocumentAttachments"
import AttachImageModal from "@/components/document/AttachImageModal"

interface Document {
    id: string
    title: string
    status: string
    content?: string
    created_at: string
    type: "creation" | "context"
    is_context?: boolean
    media_type?: string
    file_url?: string
    thumbnail_url?: string
    generation_metadata?: any
}

export default function ProjectPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const workspaceId = params.id as string
    const projectId = params.projectId as string

    const [creations, setCreations] = useState<Document[]>([])
    const [contextFiles, setContextFiles] = useState<Document[]>([])
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban")
    const [suggestedContent, setSuggestedContent] = useState<string | null>(null)
    const [tab, setTab] = useState<"creations" | "context" | "assets">("creations")
    const [editingTitle, setEditingTitle] = useState<string | null>(null)
    const [tempTitle, setTempTitle] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [autoApplyEdits, setAutoApplyEdits] = useState(false)
    const [projectName, setProjectName] = useState("")
    const [workspaceName, setWorkspaceName] = useState("")
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

    const { token } = useAuthStore()
    const router = useRouter()
    const { toast } = useToast()

    const hasUnsavedChanges = selectedDoc && savedContent !== currentContent

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

    // Handle tool execution (for file/folder creation and image attachment)
    const handleToolExecuted = async (toolName: string) => {
        console.log(`Tool executed: ${toolName}`)
        // Refresh the document list when files/folders are created
        if (['create_document', 'create_folder'].includes(toolName)) {
            await fetchDocuments()
            toast({ title: "Atualizado", description: "Lista de arquivos atualizada." })
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
        const fetchDocumentContent = async () => {
            if (!selectedDoc?.id) return

            try {
                const response = await api.get(`/documents/${selectedDoc.id}`)
                if (response.data) {
                    // Check if it's an image
                    if (response.data.media_type === 'image') {
                        setViewingImage(response.data)
                        setSelectedDoc(null)
                        return
                    }

                    const content = response.data.content || ""
                    setSelectedDoc(prev => prev?.id === response.data.id ? { ...prev, ...response.data } : prev)
                    setSavedContent(content)
                    setCurrentContent(content)
                }
            } catch (error) {
                console.error("Failed to fetch document content", error)
            }
        }

        if (selectedDoc?.id) {
            fetchDocumentContent()
        }
    }, [selectedDoc?.id])

    // Listen for image navigation events
    useEffect(() => {
        const handleImageNavigation = (e: any) => {
            const imageId = e.detail?.imageId
            if (imageId) {
                const allDocs = [...creations, ...contextFiles]
                const image = allDocs.find(doc => doc.id === imageId)
                if (image && image.media_type === 'image') {
                    setViewingImage(image)
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
        if (!token) {
            router.push("/login")
            return
        }
        fetchDocuments()
    }, [token, projectId, router])

    // Handle ?doc= query parameter to auto-select document from sidebar
    useEffect(() => {
        const docId = searchParams.get('doc')
        if (docId && creations.length > 0) {
            // Find document in creations or context files
            const doc = creations.find(d => d.id === docId) || contextFiles.find(f => f.id === docId)
            if (doc && doc.id !== selectedDoc?.id) {
                handleSelectDocument(doc)
            }
        }
    }, [searchParams, creations, contextFiles])

    const fetchDocuments = async () => {
        setIsLoading(true)
        try {
            // Fetch project info
            const projectRes = await api.get(`/workspaces/${workspaceId}/projects`)
            const projects = projectRes.data
            setAllProjects(projects)
            const currentProject = projects.find((p: any) => p.id === projectId)
            if (currentProject) {
                setProjectName(currentProject.name)
            }

            // Fetch workspace info
            const workspaceRes = await api.get(`/workspaces/`)
            const workspaces = workspaceRes.data
            const currentWorkspace = workspaces.find((w: any) => w.id === workspaceId)
            if (currentWorkspace) {
                setWorkspaceName(currentWorkspace.name)
                setAvailableModels(currentWorkspace.available_models || [])
                setDefaultTextModel(currentWorkspace.default_text_model || "")
            }

            const response = await api.get(`/documents/projects/${projectId}/documents`)
            const docs = response.data

            // Separate creations from context files
            setCreations(docs.map((d: any) => ({ ...d, type: "creation", is_context: false })))

            // Context files would come from a different endpoint or be filtered
            // For now, keeping the mock context files
            setContextFiles([
                { id: "ctx-1", title: "Brand Guidelines.pdf", status: "processed", type: "context", created_at: new Date().toISOString(), content: "<h1>Brand Guidelines</h1><p>Logo usage, colors, typography...</p>" },
                { id: "ctx-2", title: "Client Brief.txt", status: "processed", type: "context", created_at: new Date().toISOString(), content: "<h1>Client Brief</h1><p>Project objectives and requirements...</p>" },
            ])
        } catch (error) {
            console.error("Failed to fetch documents", error)
            toast({ title: "Erro", description: "Falha ao carregar documentos", variant: "destructive" })
        } finally {
            setIsLoading(false)
        }
    }

    const handleFileUpload = async (file: File) => {
        const formData = new FormData()
        formData.append("file", file)

        setIsUploading(true)
        try {
            await api.post(`/documents/upload/${projectId}`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            })
            toast({ title: "Sucesso", description: "Arquivo enviado com sucesso! Processamento iniciado." })
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

    const breadcrumbItems = [
        { label: "Home", href: `/workspace/${workspaceId}`, icon: <Home className="h-3.5 w-3.5" /> },
        { label: workspaceName || "Workspace", href: `/workspace/${workspaceId}`, icon: <FolderOpen className="h-3.5 w-3.5" /> },
        { label: projectName || "Projeto", href: `/workspace/${workspaceId}/project/${projectId}`, icon: <FolderOpen className="h-3.5 w-3.5" /> },
    ]

    const handleSaveDocument = async (content: string, documentId?: string) => {
        // Use the provided documentId or fallback to selectedDoc.id
        // This ensures we save to the correct document even if selectedDoc changed
        const docId = documentId || selectedDoc?.id
        if (!docId) return

        const docToSave = creations.find(d => d.id === docId) || contextFiles.find(f => f.id === docId)
        if (!docToSave) return

        try {
            const response = await api.put(`/documents/${docId}`, { content })

            // Use the backend response to ensure we have the latest data including updated_at
            const updatedDoc = { ...docToSave, ...response.data }

            if (docToSave.type === "creation") {
                setCreations(docs => docs.map(d => d.id === docId ? updatedDoc : d))
            } else {
                setContextFiles(files => files.map(f => f.id === docId ? updatedDoc : f))
            }

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
        try {
            const newDocData = {
                title: "Nova Criação",
                content: "",
                status: "draft"
            }

            const response = await api.post(`/documents/projects/${projectId}/documents`, newDocData)
            const newDoc = { ...response.data, type: "creation" as const, is_context: false }

            setCreations(prev => [newDoc, ...prev])

            // Small delay to ensure state is updated before navigating
            setTimeout(() => {
                handleSelectDocument(newDoc)
            }, 100)

            toast({ title: "Criado", description: "Nova criação iniciada." })
        } catch (error) {
            console.error("Failed to create document", error)
            toast({ title: "Erro", description: "Falha ao criar documento", variant: "destructive" })
        }
    }

    const handleToggleContext = (e: React.MouseEvent, doc: Document) => {
        e.stopPropagation()
        const updatedDoc = { ...doc, is_context: !doc.is_context }

        if (doc.type === "creation") {
            setCreations(prev => prev.map(d => d.id === doc.id ? updatedDoc : d))

            // If it became context, add to context files (mock logic)
            if (updatedDoc.is_context) {
                setContextFiles(prev => [...prev, { ...updatedDoc, type: "context", id: `ctx-from-${doc.id}` }])
                toast({ title: "Atualizado", description: "Marcado como arquivo de contexto." })
            } else {
                // Remove from context if un-starred
                setContextFiles(prev => prev.filter(f => f.id !== `ctx-from-${doc.id}`))
                toast({ title: "Atualizado", description: "Removido dos arquivos de contexto." })
            }
        }
    }

    const handleDelete = async (e: React.MouseEvent, doc: Document) => {
        e.stopPropagation()
        if (!confirm("Tem certeza que deseja excluir este item?")) return

        try {
            await api.delete(`/documents/${doc.id}`)

            if (doc.type === "creation") {
                setCreations(prev => prev.filter(d => d.id !== doc.id))
            } else {
                setContextFiles(prev => prev.filter(f => f.id !== doc.id))
            }
            if (selectedDoc?.id === doc.id) setSelectedDoc(null)
            toast({ title: "Excluído", description: "Documento excluído com sucesso." })
        } catch (error) {
            console.error("Failed to delete document", error)
            toast({ title: "Erro", description: "Falha ao excluir documento", variant: "destructive" })
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

            const updateTitle = (docs: Document[]) =>
                docs.map(d => d.id === editingTitle ? { ...d, title: tempTitle.trim() } : d)

            setCreations(updateTitle)
            setContextFiles(updateTitle)

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

            <WorkspaceSidebar onDocumentNavigate={handleNavigateToDocument} />
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header with Breadcrumbs */}
                <div className="px-6 py-6 border-b border-white/10">
                    <Breadcrumbs items={breadcrumbItems} className="mb-3" />
                    <div className="flex items-center justify-between">
                        <h1 className="flex-1 min-w-0 text-2xl font-bold tracking-tight truncate">
                            {projectName || "Conteúdo do Projeto"}
                        </h1>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowImageGenerator(true)}
                                className="gap-2"
                            >
                                <Sparkles className="h-4 w-4" />
                                Gerar Imagem
                            </Button>
                            <ArchiveView
                                projectId={projectId}
                                onRestore={() => {
                                    fetchDocuments()
                                }}
                            />
                            <ActivityLogPanel projectId={projectId} />
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

                {!selectedDoc && (
                    <div className="border-b border-white/10 px-6">
                        <div className="flex gap-4">
                            <button
                                onClick={() => setTab("creations")}
                                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${tab === "creations" ? "border-accent-primary text-accent-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}
                            >
                                Criações
                            </button>
                            <button
                                onClick={() => setTab("context")}
                                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${tab === "context" ? "border-accent-primary text-accent-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}
                            >
                                Arquivos de Contexto
                            </button>
                            <button
                                onClick={() => setTab("assets")}
                                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${tab === "assets" ? "border-accent-primary text-accent-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}
                            >
                                Assets Visuais
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-6">
                    {selectedDoc ? (
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
                                    {selectedDoc.type === "creation" && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => handleToggleContext(e, selectedDoc)}
                                            className={selectedDoc.is_context ? "text-yellow-500" : "text-muted-foreground"}
                                            title={selectedDoc.is_context ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                                        >
                                            <Star className="h-4 w-4" fill={selectedDoc.is_context ? "currentColor" : "none"} />
                                        </Button>
                                    )}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => setSelectedDoc(null)}>
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
                            <div className="flex-1 border rounded-lg overflow-auto flex flex-col">
                                <div className="flex-1 min-h-0">
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
                                    />
                                </div>

                                {/* Document Attachments - Only show for text documents */}
                                {selectedDoc.media_type !== 'image' && (
                                    <div className="flex-shrink-0 p-6 border-t bg-gray-50 dark:bg-gray-900/50">
                                        <DocumentAttachments
                                            key={attachmentsRefreshKey}
                                            documentId={selectedDoc.id}
                                            onAttachImage={() => setShowAttachImageModal(true)}
                                            onViewImage={(imageId) => {
                                                // Find the image document and open in ImageViewer
                                                const allImages = [...creations, ...contextFiles].filter(doc => doc.media_type === 'image')
                                                const imageDoc = allImages.find(img => img.id === imageId)
                                                if (imageDoc) {
                                                    setViewingImage(imageDoc)
                                                }
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full overflow-hidden">
                            <>
                            {tab === "creations" ? (
                                <div className="h-full flex flex-col gap-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-lg">Criações</h3>
                                        <Button onClick={handleCreateCreation} className="gap-2">
                                            <Plus className="h-4 w-4" />
                                            Nova Criação
                                        </Button>
                                    </div>

                                    <div className="flex-1 overflow-x-auto">
                                        {isLoading ? (
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
                                            <KanbanBoard
                                                documents={creations}
                                                onSelectDocument={handleSelectDocument}
                                                onToggleContext={handleToggleContext}
                                                onDelete={handleDelete}
                                                onStatusChange={(docId, newStatus) => {
                                                    setCreations(prev => prev.map(d =>
                                                        d.id === docId ? { ...d, status: newStatus } : d
                                                    ))
                                                }}
                                            />
                                        ) : (
                                            <div className="grid grid-cols-1 gap-4">
                                                {creations.map(doc => (
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
                                                                    className={`h-8 w-8 ${doc.is_context ? "text-yellow-500" : "text-muted-foreground/50"}`}
                                                                    onClick={(e) => handleToggleContext(e, doc)}
                                                                >
                                                                    ★
                                                                </Button>
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
                            ) : tab === "assets" ? (
                                <VisualAssetsLibrary projectId={projectId} />
                            ) : (
                                <div className="h-full flex flex-col gap-6">
                                    {/* Hidden file input for Command Palette */}
                                    <input
                                        id="file-upload-trigger"
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.txt,.md,.png,.jpg,.jpeg"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) handleFileUpload(file)
                                        }}
                                    />

                                    <ImageUpload
                                        onUpload={handleFileUpload}
                                        accept=".pdf,.txt,.md,.png,.jpg,.jpeg"
                                    />

                                    {isLoading ? (
                                        <LoadingSkeleton type="card" count={6} />
                                    ) : contextFiles.length === 0 ? (
                                        <EmptyState
                                            icon={Upload}
                                            title="Nenhum arquivo de contexto"
                                            description="Faça upload de PDFs, imagens ou documentos de texto para adicionar contexto ao assistente de IA"
                                        />
                                    ) : (
                                        <div className="flex-1 overflow-y-auto">
                                            <ImageGallery
                                                images={contextFiles.map(f => ({
                                                    id: f.id,
                                                    title: f.title,
                                                    created_at: f.created_at,
                                                }))}
                                                onSelect={(img) => {
                                                    const doc = contextFiles.find(f => f.id === img.id)
                                                    if (doc) handleSelectDocument(doc)
                                                }}
                                                onAnalyze={(img) => {
                                                    toast({
                                                        title: "Análise de Imagem",
                                                        description: "Recurso de visão com IA será implementado em breve!"
                                                    })
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                        </div>
                    )}
                </div>
            </div>

            <ChatSidebar
                projectId={projectId}
                currentDocument={selectedDoc}
                onAiSuggestion={setSuggestedContent}
                documents={[...creations, ...contextFiles]}
                autoApplyEdits={autoApplyEdits}
                onAutoApplyChange={setAutoApplyEdits}
                onDocumentUpdate={handleDocumentUpdate}
                onToolExecuted={handleToolExecuted}
                availableModels={availableModels}
                defaultModel={defaultTextModel}
            />

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
                documents={[...creations, ...contextFiles]}
                documentId={refiningImage?.id}
                existingPrompt={refiningImage?.content || ""}
                onImageGenerated={() => {
                    fetchDocuments()
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
                allImages={[...creations, ...contextFiles].filter(doc => doc.media_type === 'image')}
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
