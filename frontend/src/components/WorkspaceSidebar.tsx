"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import api from "@/lib/api"
import { useAuthStore } from "@/lib/store"
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
  Palette
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
  description?: string
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
  description?: string
  documents?: SidebarDocument[]
  visualAssets?: SidebarDocument[]
}

interface WorkspaceSidebarProps {
  className?: string
  onDocumentNavigate?: (url: string) => void
}

export default function WorkspaceSidebar({ className, onDocumentNavigate }: WorkspaceSidebarProps) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [mediaFilter, setMediaFilter] = useState<"all" | "text" | "image">("all")
  const { token, logout, user, fetchUser } = useAuthStore()
  const router = useRouter()
  const params = useParams()
  const workspaceId = params.id as string
  const projectId = params.projectId as string

  useEffect(() => {
    if (token && workspaceId) {
      fetchWorkspaceData()
      // Refresh data every 5 seconds to catch document title changes
      const interval = setInterval(() => {
        fetchWorkspaceData()
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [token, workspaceId])

  // Fetch user data on mount
  useEffect(() => {
    if (token && !user) {
      fetchUser()
    }
  }, [token, user, fetchUser])

  // Auto-expand active project
  useEffect(() => {
    if (projectId && !expandedProjects.has(projectId)) {
      setExpandedProjects(prev => new Set([...prev, projectId]))
    }
  }, [projectId])

  const fetchWorkspaceData = async () => {
    try {
      const workspacesRes = await api.get("/workspaces/")
      const currentWorkspace = workspacesRes.data.find((w: Workspace) => w.id === workspaceId)
      setWorkspace(currentWorkspace)

      const projectsRes = await api.get(`/workspaces/${workspaceId}/projects`)
      const projectsData = projectsRes.data

      // Fetch documents AND visual assets for each project
      const projectsWithDocs = await Promise.all(
        projectsData.map(async (project: Project) => {
          try {
            // Fetch regular documents
            const docsRes = await api.get(`/documents/projects/${project.id}/documents`)
            const regularDocs = (docsRes.data || []).filter((doc: any) => !doc.is_reference_asset)

            // Fetch visual assets
            let assets: SidebarDocument[] = []
            try {
              const assetsRes = await api.get(`/projects/${project.id}/assets`)
              assets = assetsRes.data.assets || []
            } catch (assetError) {
              console.error(`Failed to fetch assets for project ${project.id}`, assetError)
            }

            return { ...project, documents: regularDocs, visualAssets: assets }
          } catch (error) {
            console.error(`Failed to fetch documents for project ${project.id}`, error)
            return { ...project, documents: [], visualAssets: [] }
          }
        })
      )

      setProjects(projectsWithDocs)
    } catch (error) {
      console.error("Failed to fetch workspace data", error)
    }
  }

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
    let result = projects

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
    }).map(project => {
      // If searching, expand projects with matches
      if (searchQuery && !expandedProjects.has(project.id)) {
        setExpandedProjects(prev => new Set([...prev, project.id]))
      }
      return project
    })
  }, [projects, searchQuery, mediaFilter])

  if (isCollapsed) {
    return (
      <div className={cn("w-16 border-r bg-card/50 backdrop-blur-sm flex flex-col items-center py-4 transition-smooth", className)}>
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
          {projects.map((project) => (
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
    <div className={cn("flex flex-col border-r bg-card/50 backdrop-blur-sm transition-smooth overflow-x-hidden", className)} style={{ width: "var(--sidebar-width)" }}>
      {/* Header */}
      <div className="p-4 flex justify-between items-center border-b bg-gradient-to-br from-primary/5 to-transparent">
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
      <div className="p-3 border-b space-y-2">
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
            className="h-7 px-2 text-xs"
            onClick={() => setMediaFilter("all")}
          >
            <List className="h-3 w-3 mr-1" />
            Todos
          </Button>
          <Button
            variant={mediaFilter === "text" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setMediaFilter("text")}
          >
            <FileText className="h-3 w-3 mr-1" />
            Textos
          </Button>
          <Button
            variant={mediaFilter === "image" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setMediaFilter("image")}
          >
            <FileImage className="h-3 w-3 mr-1" />
            Imagens
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
              onRefresh={fetchWorkspaceData}
            />
          ))}
        </div>
      </ScrollArea>

      {/* User Menu */}
      <div className="p-3 border-t mt-auto bg-gradient-to-t from-primary/5 to-transparent">
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
