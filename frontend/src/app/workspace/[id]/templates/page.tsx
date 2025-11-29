"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Search, Plus, Copy, Eye, ArrowLeft, Home, FileText } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useTemplates } from "@/hooks/use-templates"
import { templateService } from "@/lib/supabase/templates"
import type { Template } from "@/types/supabase"
import WorkspaceSidebar from "@/components/WorkspaceSidebar"
import Breadcrumbs from "@/components/Breadcrumbs"
import { useWorkspace } from "@/hooks/use-workspaces"

export default function TemplatesPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.id as string
  const { toast } = useToast()

  const { data: workspace } = useWorkspace(workspaceId)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  // Use Supabase hook for templates
  const { data: templates, isLoading: loading } = useTemplates(workspaceId)
  const templateList = templates ?? []

  const breadcrumbItems = [
    { label: workspace?.name || "Workspace", href: `/workspace/${workspaceId}`, icon: <Home className="h-3.5 w-3.5" /> },
    { label: "Templates", icon: <FileText className="h-3.5 w-3.5" /> },
  ]

  // Filter templates using useMemo for performance
  const filteredTemplates = useMemo(() => {
    let filtered = templateList

    if (selectedCategory !== "all") {
      filtered = filtered.filter(t => t.category === selectedCategory)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.tags?.some((tag: string) => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [templateList, selectedCategory, searchQuery])

  const categories = useMemo(() => [
    { id: "all", name: "Todos", count: templateList.length },
    { id: "ads", name: "Anúncios", count: templateList.filter(t => t.category === "ads").length },
    { id: "landing_page", name: "Landing Pages", count: templateList.filter(t => t.category === "landing_page").length },
    { id: "email", name: "Email Marketing", count: templateList.filter(t => t.category === "email").length },
    { id: "social_media", name: "Social Media", count: templateList.filter(t => t.category === "social_media").length },
    { id: "seo", name: "SEO & Blog", count: templateList.filter(t => t.category === "seo").length },
    { id: "creative", name: "Criativo", count: templateList.filter(t => t.category === "creative").length },
  ], [templateList])

  const copyToClipboard = async (template: Template) => {
    try {
      await navigator.clipboard.writeText(template.prompt || '')
      // Increment usage count via Supabase
      await templateService.incrementUsageCount(template.id)
      toast({ title: "Copiado!", description: "Template copiado para área de transferência" })
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao copiar template", variant: "destructive" })
    }
  }

  return (
    <div className="flex h-screen overflow-hidden relative">
      <div className="p-3 pr-0">
        <WorkspaceSidebar className="h-[calc(100vh-24px)]" />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-6 border-b border-white/10">
          <Breadcrumbs items={breadcrumbItems} className="mb-3" />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Templates de Marketing</h1>
              <p className="text-sm text-text-secondary mt-2">
                Templates profissionais para tráfego pago e marketing digital
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push(`/workspace/${workspaceId}`)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Criar Template
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

      {/* Search */}
      <div className="relative max-w-7xl mx-auto">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
        <Input
          placeholder="Buscar templates por nome, descrição ou tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="max-w-7xl mx-auto">
        <TabsList className="grid grid-cols-7 w-full">
          {categories.map(cat => (
            <TabsTrigger key={cat.id} value={cat.id} className="text-xs">
              {cat.name}
              <Badge variant="secondary" className="ml-2">{cat.count}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {loading ? (
            <div>Carregando...</div>
          ) : filteredTemplates.length === 0 ? (
            <Card glass>
              <CardContent className="p-12 text-center text-text-secondary">
                Nenhum template encontrado
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map(template => (
                <Card key={template.id} glass clickable>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{template.icon}</span>
                        <div>
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          {template.is_system && (
                            <Badge variant="outline" className="mt-1 text-xs">Sistema</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <CardDescription className="mt-2 line-clamp-2">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {template.tags?.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedTemplate(template)}>
                            <Eye className="h-3 w-3 mr-1" />
                            Ver
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <span className="text-2xl">{template.icon}</span>
                              {template.name}
                            </DialogTitle>
                            <DialogDescription>{template.description}</DialogDescription>
                          </DialogHeader>
                          <div className="mt-4">
                            <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg text-sm">
                              {template.prompt}
                            </pre>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button onClick={() => copyToClipboard(template)} className="flex-1">
                              <Copy className="h-4 w-4 mr-2" />
                              Copiar Template
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button size="sm" onClick={() => copyToClipboard(template)}>
                        <Copy className="h-3 w-3 mr-1" />
                        Usar
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground mt-3">
                      {template.usage_count} usos
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
        </div>
      </div>
    </div>
  )
}
