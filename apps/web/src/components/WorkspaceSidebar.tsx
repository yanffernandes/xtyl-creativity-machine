"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { useAuthStore } from "@/lib/store"
import { useSidebarCache } from "@/hooks/use-sidebar-cache"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
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
  Loader2,
  RefreshCw
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import ProjectTreeItem from "./ProjectTreeItem"

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
  boards?: Array<{
    id: string
    name: string
    description?: string | null
    position?: number
  }>
}

interface WorkspaceSidebarProps {
  className?: string
  onDocumentNavigate?: (url: string) => void
}

const projectItemVariants = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8, transition: { duration: 0.12 } }
}

// Shared sidebar surface classes — solid, no glassmorphism
const sidebarClasses = "flex flex-col bg-surface-secondary dark:bg-surface-secondary border border-border/60 rounded-xl shadow-sm"

export default function WorkspaceSidebar({ className, onDocumentNavigate }: WorkspaceSidebarProps) {
  const [isHydrated, setIsHydrated] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [mediaFilter, setMediaFilter] = useState<"all" | "text" | "image">("all")
  const { token, logout, user, fetchUser, isLoading: authLoading } = useAuthStore()
  const router = useRouter()
  const params = useParams()
  const workspaceId = params.id as string
  const projectId = params.projectId as string
  const t = useTranslations("sidebar")

  const {
    workspace,
    projects: projectsWithDocs,
    isRefreshing,
    isInitialLoad,
    invalidate
  } = useSidebarCache(workspaceId)

  const handleRefresh = useCallback(() => {
    invalidate()
  }, [invalidate])

  useEffect(() => {
    const onExternalRefresh = () => handleRefresh()
    window.addEventListener('workspace-sidebar-refresh', onExternalRefresh)
    return () => window.removeEventListener('workspace-sidebar-refresh', onExternalRefresh)
  }, [handleRefresh])

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed') === 'true'
    setIsCollapsed(saved)
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('sidebar-collapsed', String(isCollapsed))
    }
  }, [isCollapsed, isHydrated])

  useEffect(() => {
    if (authLoading) return
    if (token && !user) fetchUser()
  }, [token, authLoading, user, fetchUser])

  useEffect(() => {
    if (projectId && !isCollapsed) {
      setExpandedProjects(prev => {
        if (prev.has(projectId)) return prev
        return new Set([...prev, projectId])
      })
    }
  }, [projectId, isCollapsed])

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filteredProjects = useMemo(() => {
    let result = projectsWithDocs as Project[]

    if (mediaFilter !== "all") {
      result = result.map(project => ({
        ...project,
        documents: project.documents?.filter(doc =>
          (doc.media_type || "text") === mediaFilter
        )
      }))
    }

    if (!searchQuery.trim()) return result

    const query = searchQuery.toLowerCase()
    return result.filter(project => {
      return (
        project.name.toLowerCase().includes(query) ||
        project.boards?.some(b => b.name.toLowerCase().includes(query)) ||
        project.documents?.some(d => d.title.toLowerCase().includes(query))
      )
    })
  }, [projectsWithDocs, searchQuery, mediaFilter])

  useEffect(() => {
    if (!searchQuery.trim()) return
    setExpandedProjects(prev => {
      const next = new Set([...prev, ...projectsWithDocs.map(p => p.id)])
      return next.size === prev.size ? prev : next
    })
  }, [searchQuery, projectsWithDocs])

  // Loading skeleton
  if (isInitialLoad || !isHydrated) {
    return (
      <div
        className={cn(sidebarClasses, "transition-smooth overflow-hidden", className)}
        style={{ width: "var(--sidebar-width)" }}
      >
        <div className="p-4 flex justify-between items-center border-b border-border/50">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="h-4 bg-muted/50 rounded animate-pulse w-28" />
            <div className="h-3 bg-muted/30 rounded animate-pulse w-20" />
          </div>
        </div>
        <div className="p-3 space-y-1.5">
          <div className="h-3.5 bg-muted/30 rounded animate-pulse w-16 mb-3" />
          {[1, 2, 3].map(i => (
            <div key={i} className="h-9 bg-muted/20 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Collapsed state
  if (isCollapsed) {
    return (
      <div className={cn(
        "w-14 flex flex-col items-center py-3 gap-1 transition-smooth",
        "bg-surface-secondary dark:bg-surface-secondary",
        "border border-border/60 rounded-xl shadow-sm",
        className
      )}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="h-8 w-8 mb-2"
          title="Expandir sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Separator className="w-6 mb-1" />
        <div className="flex flex-col gap-1 flex-1 overflow-y-auto w-full px-1.5">
          {projectsWithDocs.map((project) => (
            <Button
              key={project.id}
              variant={projectId === project.id ? "default" : "ghost"}
              size="icon"
              onClick={() => router.push(`/workspace/${workspaceId}/project/${project.id}`)}
              className={cn(
                "h-9 w-9 text-sm font-semibold relative",
                projectId === project.id && "shadow-sm shadow-primary/20"
              )}
              title={project.name}
            >
              {project.name.charAt(0).toUpperCase()}
              {project.documents && project.documents.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary text-primary-foreground rounded-full text-[9px] font-bold flex items-center justify-center">
                  {project.documents.length > 9 ? '9+' : project.documents.length}
                </span>
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
        "bg-surface-secondary dark:bg-surface-secondary",
        "border border-border/60 rounded-xl shadow-sm",
        className
      )}
      style={{ width: "var(--sidebar-width)" }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex justify-between items-center border-b border-border/50">
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate">{workspace?.name || "Workspace"}</h2>
          {workspace?.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{workspace.description}</p>
          )}
        </div>
        <div className="flex items-center gap-0.5 ml-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-7 w-7"
            title={t("refresh")}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            className="h-7 w-7"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="p-3 border-b border-border/50 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-8 h-8 text-sm bg-background/60 border-border/50 focus-visible:ring-1"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="flex gap-1 items-center">
          <span className="text-xs text-muted-foreground mr-0.5">{t("filter")}:</span>
          {(["all", "text", "image"] as const).map((filter) => {
            const Icon = filter === "all" ? List : filter === "text" ? FileText : FileImage
            const label = filter === "all" ? t("all") : filter === "text" ? t("texts") : t("images")
            const active = mediaFilter === filter
            return (
              <Button
                key={filter}
                variant={active ? "default" : "ghost"}
                size="sm"
                className={cn("h-6 text-xs transition-all", active ? "px-2" : "px-1.5 w-7")}
                onClick={() => setMediaFilter(filter)}
                title={label}
              >
                <Icon className={cn("h-3 w-3", active && "mr-1")} />
                {active && label}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Projects list */}
      <ScrollArea className="flex-1 scrollbar-thin overflow-x-hidden">
        <div className="p-2 space-y-0.5">
          <div className="flex justify-between items-center mb-2 px-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("projects")} · {filteredProjects.length}
              </span>
              <AnimatePresence>
                {isRefreshing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => router.push(`/workspace/${workspaceId}`)}
              title={t("createProject")}
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-8 px-4">
              <p className="text-sm text-muted-foreground">
                {searchQuery ? t("noResults") : t("noProjects")}
              </p>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project) => (
              <motion.div
                key={project.id}
                variants={projectItemVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                <ProjectTreeItem
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
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* User menu */}
      <div className="p-2 border-t border-border/50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start px-2 h-auto py-2 hover:bg-background/60"
            >
              <Avatar className="h-8 w-8 mr-2.5 shrink-0">
                <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">
                  {user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left overflow-hidden flex-1">
                <span className="text-sm font-medium truncate w-full leading-tight">
                  {user?.full_name || user?.email?.split('@')[0]}
                </span>
                <span className="text-xs text-muted-foreground truncate w-full leading-tight">
                  {user?.email}
                </span>
              </div>
              <MoreHorizontal className="ml-1.5 h-4 w-4 opacity-40 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t("myAccount")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/workspace/${workspaceId}/profile`)}>
              <User className="mr-2 h-4 w-4" />
              {t("profile")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/workspace/${workspaceId}/settings`)}>
              <Settings className="mr-2 h-4 w-4" />
              {t("settings")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/workspace/${workspaceId}/templates`)}>
              <Sparkles className="mr-2 h-4 w-4" />
              {t("templates")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/workspace/${workspaceId}/ai-usage`)}>
              <Activity className="mr-2 h-4 w-4" />
              {t("aiUsage")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => { logout(); router.push("/login") }}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
