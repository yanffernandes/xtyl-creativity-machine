"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import api from "@/lib/api"
import { useAuthStore } from "@/lib/store"
import { useWorkspace } from "@/hooks/use-workspaces"
import { useProjects } from "@/hooks/use-projects"
import { documentService } from "@/lib/supabase/documents"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  User,
  LogOut,
  Search,
  X,
  FolderPlus,
  Settings,
  Sparkles,
  Activity,
  FileText,
  FileImage,
  List,
  Image as ImageIcon,
  Palette,
  Workflow
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import ProjectTreeItem from "./ProjectTreeItem"

interface Workspace {
  id: string
  name: string
  description?: string | null
}

interface SidebarDocument {
  id: string
  title: string
  status: string
  type?: "creation" | "context"
  media_type?: "text" | "image" | "pdf"
  is_reference_asset?: boolean
  asset_type?: string
}

interface Project {
  id: string
  name: string
  description?: string | null
  documents?: SidebarDocument[]
  visualAssets?: SidebarDocument[]
}

interface WorkspaceSidebarProps {
  className?: string
  onDocumentNavigate?: (url: string) => void
}

export default function WorkspaceSidebar({ className, onDocumentNavigate }: WorkspaceSidebarProps) {
  const [projectsWithDocs, setProjectsWithDocs] = useState<Project[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [mediaFilter, setMediaFilter] = useState<"all" | "text" | "image">("all")
  const { token, logout, user, fetchUser, isLoading: authLoading } = useAuthStore()
  const router = useRouter()
  const params = useParams()
  const workspaceId = params.id as string
  const projectId = params.projectId as string

  // Use Supabase hooks for workspace and projects
  const { data: workspace } = useWorkspace(workspaceId)
  const { data: projects = [], refetch: refetchProjects } = useProjects(workspaceId)

  // Track previous project IDs to prevent infinite loops
  const prevProjectIdsRef = useRef<string>('')
  const isFetchingRef = useRef(false)

  // Fetch documents for all projects when projects change
  const fetchDocumentsForProjects = useCallback(async (force = false) => {
    if (!projects || projects.length === 0) {
      if (prevProjectIdsRef.current !== '') {
        prevProjectIdsRef.current = ''
        setProjectsWithDocs([])
      }
      return
    }

    // Check if projects actually changed (by comparing IDs)
    const newProjectIds = projects.map((p: any) => p.id).sort().join(',')
    if (!force && newProjectIds === prevProjectIdsRef.current) {
      return // Skip if projects haven't changed
    }

    // Prevent concurrent fetches
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    prevProjectIdsRef.current = newProjectIds

    try {
      const projectsData = await Promise.all(
        projects.map(async (project: any) => {
          try {
            // Fetch documents and assets in parallel for each project
            // Use optimized listForSidebar for faster loading (fewer fields)
            const [docsResult, assetsResult] = await Promise.allSettled([
              documentService.listForSidebar(project.id),
              api.get(`/projects/${project.id}/assets`)
            ])

            // Process documents
            let regularDocs: SidebarDocument[] = []
            if (docsResult.status === 'fulfilled' && docsResult.value.data) {
              regularDocs = docsResult.value.data
                .filter((doc: any) => !doc.is_reference_asset)
                .map((doc: any) => ({
                  id: doc.id,
                  title: doc.title,
                  status: doc.status || 'draft',
                  type: 'creation' as const,
                  media_type: doc.media_type || 'text',
                  is_reference_asset: doc.is_reference_asset,
                }))
            }

            // Process assets
            let assets: SidebarDocument[] = []
            if (assetsResult.status === 'fulfilled') {
              assets = assetsResult.value.data.assets || []
            }

            return { ...project, documents: regularDocs, visualAssets: assets }
          } catch (error) {
            console.error(`Failed to fetch documents for project ${project.id}`, error)
            return { ...project, documents: [], visualAssets: [] }
          }
        })
      )

      setProjectsWithDocs(projectsData)
    } finally {
      isFetchingRef.current = false
    }
  }, [projects])

  // Fetch documents when projects change
  useEffect(() => {
    fetchDocumentsForProjects()
  }, [fetchDocumentsForProjects])

  // Refresh data periodically (for document title changes) - only when window is focused
  useEffect(() => {
    if (!workspaceId) return
    const interval = setInterval(() => {
      // Only refresh if the window is focused to avoid unnecessary requests
      if (document.hasFocus()) {
        refetchProjects()
        fetchDocumentsForProjects(true) // Force refresh
      }
    }, 30000) // Every 30 seconds - reduced frequency for better performance
    return () => clearInterval(interval)
  }, [workspaceId, refetchProjects, fetchDocumentsForProjects])

  // Fetch user data on mount
  useEffect(() => {
    if (authLoading) return
    if (token && !user) {
      fetchUser()
    }
  }, [token, authLoading, user, fetchUser])

  // Auto-expand active project
  useEffect(() => {
    if (projectId) {
      setExpandedProjects(prev => {
        if (prev.has(projectId)) return prev // Don't trigger re-render if already expanded
        return new Set([...prev, projectId])
      })
    }
  }, [projectId])

  // Refresh function for child components
  const handleRefresh = useCallback(() => {
    refetchProjects()
    fetchDocumentsForProjects(true) // Force refresh
  }, [refetchProjects, fetchDocumentsForProjects])

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev)
      if (newSet.has(projectId)) {
        newSet.delete(projectId)
      } else {
        newSet.add(projectId)
      }
      return newSet
    })
  }

  const filteredProjects = useMemo(() => {
    let result = projectsWithDocs

    // Apply media type filter
    if (mediaFilter !== "all") {
      result = result.map(project => ({
        ...project,
        documents: project.documents?.filter(doc => {
          const docMediaType = doc.media_type || "text"
          return docMediaType === mediaFilter
        })
      }))
    }

    // Apply search query
    if (!searchQuery.trim()) return result

    const query = searchQuery.toLowerCase()
    return result.filter(project => {
      const projectMatches = project.name.toLowerCase().includes(query)
      const docMatches = project.documents?.some(doc =>
        doc.title.toLowerCase().includes(query)
      )
      return projectMatches || docMatches
    })
  }, [projectsWithDocs, searchQuery, mediaFilter])

  // Auto-expand projects with search matches (separate effect to avoid infinite loop)
  // Only trigger on searchQuery change, not on filteredProjects
  useEffect(() => {
    if (!searchQuery.trim()) return

    // Expand all projects when searching to show matches
    const allProjectIds = projectsWithDocs.map(p => p.id)
    setExpandedProjects(prev => {
      const newSet = new Set([...prev, ...allProjectIds])
      // Only update if actually different to prevent re-renders
      if (newSet.size === prev.size) return prev
      return newSet
    })
  }, [searchQuery, projectsWithDocs])

  if (isCollapsed) {
    return (
      <div className={cn(
        "w-16 flex flex-col items-center py-4 transition-smooth",
        // Floating glass effect - Apple style
        "bg-white/[0.03] dark:bg-white/[0.02]",
        "backdrop-blur-2xl backdrop-saturate-150",
        "border border-white/[0.1]",
        "rounded-2xl",
        "shadow-[0_8px_32px_-8px_rgba(0,0,0,0.15),0_0_0_1px_rgba(255,255,255,0.05)_inset]",
        "dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.03)_inset]",
        className
      )}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="mb-4 hover:bg-primary/10"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Separator className="mb-4 w-8" />
        <div className="flex flex-col gap-2 flex-1 overflow-y-auto w-full px-2">
          {projectsWithDocs.map((project) => (
            <Button
              key={project.id}
              variant={projectId === project.id ? "default" : "ghost"}
              size="icon"
              onClick={() => router.push(`/workspace/${workspaceId}/project/${project.id}`)}
              className={cn(
                "relative transition-smooth",
                projectId === project.id && "shadow-lg shadow-primary/20"
              )}
              title={project.name}
            >
              <div className="text-lg font-semibold">
                {project.name.charAt(0).toUpperCase()}
              </div>
              {project.documents && project.documents.length > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground rounded-full text-[10px] font-bold flex items-center justify-center">
                  {project.documents.length}
                </div>
              )}
            </Button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col transition-smooth overflow-hidden",
        // Floating glass effect - Apple style
        "bg-white/[0.03] dark:bg-white/[0.02]",
        "backdrop-blur-2xl backdrop-saturate-150",
        "border border-white/[0.1]",
        "rounded-2xl",
        "shadow-[0_8px_32px_-8px_rgba(0,0,0,0.15),0_0_0_1px_rgba(255,255,255,0.05)_inset]",
        "dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.03)_inset]",
        className
      )}
      style={{ width: "var(--sidebar-width)" }}
    >
      {/* Header */}
      <div className="p-4 flex justify-between items-center border-b border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent">
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-base truncate">{workspace?.name || "Workspace"}</h2>
          {workspace?.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{workspace.description}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(true)}
          className="ml-2 flex-shrink-0 hover:bg-primary/10"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-white/[0.06] space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar projetos e documentos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-9 bg-secondary/50 border-0 focus-visible:ring-1"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Media Type Filter */}
        <div className="flex gap-1 items-center">
          <span className="text-xs text-muted-foreground mr-1">Filtro:</span>
          <Button
            variant={mediaFilter === "all" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-7 text-xs transition-all",
              mediaFilter === "all" ? "px-2.5" : "px-2 w-8"
            )}
            onClick={() => setMediaFilter("all")}
            title="Todos"
          >
            <List className={cn("h-3.5 w-3.5", mediaFilter === "all" && "mr-1.5")} />
            {mediaFilter === "all" && "Todos"}
          </Button>
          <Button
            variant={mediaFilter === "text" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-7 text-xs transition-all",
              mediaFilter === "text" ? "px-2.5" : "px-2 w-8"
            )}
            onClick={() => setMediaFilter("text")}
            title="Textos"
          >
            <FileText className={cn("h-3.5 w-3.5", mediaFilter === "text" && "mr-1.5")} />
            {mediaFilter === "text" && "Textos"}
          </Button>
          <Button
            variant={mediaFilter === "image" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-7 text-xs transition-all",
              mediaFilter === "image" ? "px-2.5" : "px-2 w-8"
            )}
            onClick={() => setMediaFilter("image")}
            title="Imagens"
          >
            <FileImage className={cn("h-3.5 w-3.5", mediaFilter === "image" && "mr-1.5")} />
            {mediaFilter === "image" && "Imagens"}
          </Button>
        </div>
      </div>

      {/* Projects Tree */}
      <ScrollArea className="flex-1 scrollbar-thin overflow-x-hidden">
        <div className="p-3 space-y-1 overflow-hidden">
          <div className="flex justify-between items-center mb-3 px-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Projetos ({filteredProjects.length})
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-primary/10"
              onClick={() => router.push(`/workspace/${workspaceId}`)}
              title="Criar novo projeto"
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-8 px-4">
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "Nenhum resultado encontrado" : "Nenhum projeto ainda"}
              </p>
            </div>
          )}

          {filteredProjects.map((project) => (
            <ProjectTreeItem
              key={project.id}
              project={project}
              workspaceId={workspaceId}
              isActive={projectId === project.id}
              isExpanded={expandedProjects.has(project.id)}
              onToggle={() => toggleProject(project.id)}
              documentCount={project.documents?.length || 0}
              visualAssets={project.visualAssets || []}
              onDocumentNavigate={onDocumentNavigate}
              onRefresh={handleRefresh}
            />
          ))}
        </div>
      </ScrollArea>

      {/* User Menu */}
      <div className="p-3 border-t border-white/[0.06] mt-auto bg-gradient-to-t from-white/[0.02] to-transparent">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start px-3 h-auto py-2 hover:bg-secondary transition-smooth"
            >
              <Avatar className="h-9 w-9 mr-3 ring-2 ring-primary/10">
                <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                  {user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left overflow-hidden flex-1">
                <span className="text-sm font-semibold truncate w-full">
                  {user?.full_name || user?.email?.split('@')[0]}
                </span>
                <span className="text-xs text-muted-foreground truncate w-full">
                  {user?.email}
                </span>
              </div>
              <MoreHorizontal className="ml-2 h-4 w-4 opacity-50 flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/workspace/${workspaceId}/profile`)}>
              <User className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/workspace/${workspaceId}/settings`)}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/workspace/${workspaceId}/templates`)}>
              <Sparkles className="mr-2 h-4 w-4" />
              <span>Templates</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/workspace/${workspaceId}/workflows`)}>
              <Workflow className="mr-2 h-4 w-4" />
              <span>Workflow Templates</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/workspace/${workspaceId}/ai-usage`)}>
              <Activity className="mr-2 h-4 w-4" />
              <span>Uso de IA</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout()
                router.push("/login")
              }}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
