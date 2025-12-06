"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Target, Smartphone, Mail, PenTool, FileText, Palette, Star, Sparkles, User, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Template } from "@/types/supabase"

// Category definitions with icons
const CATEGORIES = [
  { id: "all", name: "Todos", icon: Sparkles },
  { id: "trafego_pago", name: "Trafego Pago", icon: Target },
  { id: "social_media", name: "Social Media", icon: Smartphone },
  { id: "email", name: "Email Marketing", icon: Mail },
  { id: "copy", name: "Copywriting", icon: PenTool },
  { id: "seo", name: "SEO & Blog", icon: FileText },
  { id: "criativo", name: "Criativo", icon: Palette },
] as const

interface TemplateSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templates: Template[]
  isLoading?: boolean
  onSelectTemplate: (template: Template) => void
}

export default function TemplateSelector({
  open,
  onOpenChange,
  templates,
  isLoading = false,
  onSelectTemplate,
}: TemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let filtered = templates

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(t => t.category === selectedCategory)
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.expert_name?.toLowerCase().includes(query) ||
        t.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Sort: featured first, then by usage
    return filtered.sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1
      if (!a.is_featured && b.is_featured) return 1
      return (b.usage_count || 0) - (a.usage_count || 0)
    })
  }, [templates, selectedCategory, searchQuery])

  // Count per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: templates.length }
    templates.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1
    })
    return counts
  }, [templates])

  const handleSelect = (template: Template) => {
    onSelectTemplate(template)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Escolha um Template
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar with categories */}
          <div className="w-56 border-r bg-muted/30 p-4 flex-shrink-0">
            <div className="space-y-1">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon
                const count = categoryCounts[cat.id] || 0
                const isActive = selectedCategory === cat.id

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-left truncate">{cat.name}</span>
                    <Badge
                      variant={isActive ? "secondary" : "outline"}
                      className={cn(
                        "text-[10px] h-5 min-w-[20px] justify-center",
                        isActive && "bg-primary-foreground/20 text-primary-foreground"
                      )}
                    >
                      {count}
                    </Badge>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Templates grid */}
            <ScrollArea className="flex-1 p-4">
              {isLoading ? (
                <div className="grid grid-cols-2 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader className="pb-2">
                        <div className="h-5 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2 mt-2" />
                      </CardHeader>
                      <CardContent>
                        <div className="h-3 bg-muted rounded w-full" />
                        <div className="h-3 bg-muted rounded w-2/3 mt-2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum template encontrado</p>
                  {searchQuery && (
                    <p className="text-sm mt-1">Tente buscar por outro termo</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {filteredTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className={cn(
                        "cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
                        template.is_featured && "border-amber-500/30 bg-amber-500/5"
                      )}
                      onClick={() => handleSelect(template)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-xl flex-shrink-0">{template.icon || "📄"}</span>
                            <div className="min-w-0">
                              <CardTitle className="text-sm truncate">
                                {template.name}
                              </CardTitle>
                              {template.expert_name && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                  <User className="h-3 w-3" />
                                  <span className="truncate">{template.expert_name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {template.is_featured && (
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="line-clamp-2 text-xs mb-3">
                          {template.description}
                        </CardDescription>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3 text-muted-foreground">
                            {template.estimated_outputs && (
                              <span className="flex items-center gap-1" title="Resultados esperados">
                                <FileText className="h-3 w-3" />
                                {template.estimated_outputs}
                              </span>
                            )}
                            {template.variables && template.variables.length > 0 && (
                              <span className="text-muted-foreground/70">
                                {template.variables.length} {template.variables.length === 1 ? "campo" : "campos"}
                              </span>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-[10px]">
                            {template.usage_count || 0} usos
                          </Badge>
                        </div>

                        {template.tags && template.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {template.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
