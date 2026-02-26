"use client"

/**
 * Workspace Sidebar Component
 *
 * Displays cached workspace projects and documents with background refresh.
 * Features: instant cache load, loading indicator, smooth animations.
 *
 * Feature: 013-sidebar-cache
 */

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

// T027/T028: Animation variants for smooth enter/exit
const projectItemVariants = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } }
}

export default function WorkspaceSidebar({ className, onDocumentNavigate }: WorkspaceSidebarProps) {
  // Persist collapsed state in localStorage with hydration guard
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

  // T013-T016: Use sidebar cache hook instead of direct hooks
  const {
    workspace,
    projects: projectsWithDocs,
    isRefreshing,
    isInitialLoad,
    invalidate
  } = useSidebarCache(workspaceId)

  // T024: Wire invalidate to handleRefresh
  const handleRefresh = useCallback(() => {
    invalidate()
  }, [invalidate])

  useEffect(() => {
    const onExternalRefresh = () => handleRefresh()
    window.addEventListener('workspace-sidebar-refresh', onExternalRefresh)
    return () => window.removeEventListener('workspace-sidebar-refresh', onExternalRefresh)
  }, [handleRefresh])

  // Hydrate collapsed state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed') === 'true'
    setIsCollapsed(saved)
    setIsHydrated(true)
  }, [])

  // Persist collapsed state to localStorage (skip initial hydration)
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('sidebar-collapsed', String(isCollapsed))
    }
  }, [isCollapsed, isHydrated])

  // Fetch user data on mount
  useEffect(() => {
    if (authLoading) return
    if (token && !user) {
      fetchUser()
    }
  }, [token, authLoading, user, fetchUser])

  // Auto-expand active project (only when sidebar is expanded)
  useEffect(() => {
    if (projectId && !isCollapsed) {
      setExpandedProjects(prev => {
        if (prev.has(projectId)) return prev
        return new Set([...prev, projectId])
      })
    }
  }, [projectId, isCollapsed])

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
    let result = projectsWithDocs as Project[]

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
      const boardMatches = project.boards?.some(board =>
        board.name.toLowerCase().includes(query)
      )
      const docMatches = project.documents?.some(doc =>
        doc.title.toLowerCase().includes(query)
      )
      return projectMatches || boardMatches || docMatches
    })
  }, [projectsWithDocs, searchQuery, mediaFilter])

  // Auto-expand projects with search matches
  useEffect(() => {
    if (!searchQuery.trim()) return

    const allProjectIds = projectsWithDocs.map(p => p.id)
    setExpandedProjects(prev => {
      const newSet = new Set([...prev, ...allProjectIds])
      if (newSet.size === prev.size) return prev
      return newSet
    })
  }, [searchQuery, projectsWithDocs])

  // T018: Show skeleton on initial load (no cache) or before hydration
  if (isInitialLoad || !isHydrated) {
    return (
      <div
        className={cn(
          "flex flex-col transition-smooth overflow-hidden",
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
        {/* Skeleton Header */}
        <div className="p-4 flex justify-between items-center border-b border-white/[0.06]">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-5 bg-muted/30 rounded animate-pulse w-32" />
            <div className="h-3 bg-muted/20 rounded animate-pulse w-24" />
          </div>
        </div>
        {/* Skeleton Projects */}
        <div className="p-3 space-y-2">
          <div className="h-4 bg-muted/20 rounded animate-pulse w-20 mb-4" />
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-muted/10 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (isCollapsed) {
    return (
      <div className={cn(
        "w-16 flex flex-col items-center py-4 transition-smooth",
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
        <div className="flex flex-col gap-2 flex-1 overflow-y-auto w-full px-2 mt-1">
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
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {/* T043: Manual refresh button for user-triggered updates */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="hover:bg-primary/10"
            title={t("refresh")}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            className="hover:bg-primary/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-white/[0.06] space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
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
          <span className="text-xs text-muted-foreground mr-1">{t("filter")}:</span>
          <Button
            variant={mediaFilter === "all" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-7 text-xs transition-all",
              mediaFilter === "all" ? "px-2.5" : "px-2 w-8"
            )}
            onClick={() => setMediaFilter("all")}
            title={t("all")}
          >
            <List className={cn("h-3.5 w-3.5", mediaFilter === "all" && "mr-1.5")} />
            {mediaFilter === "all" && t("all")}
          </Button>
          <Button
            variant={mediaFilter === "text" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-7 text-xs transition-all",
              mediaFilter === "text" ? "px-2.5" : "px-2 w-8"
            )}
            onClick={() => setMediaFilter("text")}
            title={t("texts")}
          >
            <FileText className={cn("h-3.5 w-3.5", mediaFilter === "text" && "mr-1.5")} />
            {mediaFilter === "text" && t("texts")}
          </Button>
          <Button
            variant={mediaFilter === "image" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-7 text-xs transition-all",
              mediaFilter === "image" ? "px-2.5" : "px-2 w-8"
            )}
            onClick={() => setMediaFilter("image")}
            title={t("images")}
          >
            <FileImage className={cn("h-3.5 w-3.5", mediaFilter === "image" && "mr-1.5")} />
            {mediaFilter === "image" && t("images")}
          </Button>
        </div>
      </div>

      {/* Projects Tree */}
      <ScrollArea className="flex-1 scrollbar-thin overflow-x-hidden">
        <div className="p-3 space-y-1 overflow-hidden">
          {/* T019-T023: Projects header with loading indicator */}
          <div className="flex justify-between items-center mb-3 px-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {t("projects")} ({filteredProjects.length})
              </h3>
              {/* T022-T023: Loading indicator during background refresh */}
              <AnimatePresence>
                {isRefreshing && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
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
              className="h-7 w-7 hover:bg-primary/10"
              onClick={() => router.push(`/workspace/${workspaceId}`)}
              title={t("createProject")}
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-8 px-4">
              <p className="text-sm text-muted-foreground">
                {searchQuery ? t("noResults") : t("noProjects")}
              </p>
            </div>
          )}

          {/* T027: AnimatePresence wrapper for smooth enter/exit */}
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project) => (
              // T028: motion.div with fade animation
              <motion.div
                key={project.id}
                variants={projectItemVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {/* T025-T026: Pass invalidate to onRefresh, stable key */}
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
            <DropdownMenuLabel>{t("myAccount")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/workspace/${workspaceId}/profile`)}>
              <User className="mr-2 h-4 w-4" />
              <span>{t("profile")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/workspace/${workspaceId}/settings`)}>
              <Settings className="mr-2 h-4 w-4" />
              <span>{t("settings")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/workspace/${workspaceId}/templates`)}>
              <Sparkles className="mr-2 h-4 w-4" />
              <span>{t("templates")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/workspace/${workspaceId}/ai-usage`)}>
              <Activity className="mr-2 h-4 w-4" />
              <span>{t("aiUsage")}</span>
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
              <span>{t("logout")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
