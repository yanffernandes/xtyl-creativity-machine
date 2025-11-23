"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import api from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Search, Plus, Copy, Eye } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface Template {
  id: string
  name: string
  description: string
  category: string
  icon: string
  prompt: string
  tags: string[]
  is_system: boolean
  usage_count: number
}

export default function TemplatesPage() {
  const params = useParams()
  const workspaceId = params.id as string
  const { toast } = useToast()

  const [templates, setTemplates] = useState<Template[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTemplates()
  }, [workspaceId])

  useEffect(() => {
    filterTemplates()
  }, [searchQuery, selectedCategory, templates])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/templates?workspace_id=${workspaceId}&include_system=true`)
      setTemplates(response.data)
    } catch (error) {
      console.error("Failed to fetch templates", error)
      toast({ title: "Erro", description: "Falha ao carregar templates", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const filterTemplates = () => {
    let filtered = templates

    if (selectedCategory !== "all") {
      filtered = filtered.filter(t => t.category === selectedCategory)
    }

    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    setFilteredTemplates(filtered)
  }

  const categories = [
    { id: "all", name: "Todos", count: templates.length },
    { id: "ads", name: "Anúncios", count: templates.filter(t => t.category === "ads").length },
    { id: "landing_page", name: "Landing Pages", count: templates.filter(t => t.category === "landing_page").length },
    { id: "email", name: "Email Marketing", count: templates.filter(t => t.category === "email").length },
    { id: "social_media", name: "Social Media", count: templates.filter(t => t.category === "social_media").length },
    { id: "seo", name: "SEO & Blog", count: templates.filter(t => t.category === "seo").length },
    { id: "creative", name: "Criativo", count: templates.filter(t => t.category === "creative").length },
  ]

  const copyToClipboard = async (template: Template) => {
    try {
      await navigator.clipboard.writeText(template.prompt)
      await api.post(`/templates/${template.id}/use`)
      toast({ title: "Copiado!", description: "Template copiado para área de transferência" })
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao copiar template", variant: "destructive" })
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Templates de Marketing</h1>
          <p className="text-muted-foreground">Templates profissionais para tráfego pago e marketing digital</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Criar Template
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar templates por nome, descrição ou tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
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
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                Nenhum template encontrado
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map(template => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer">
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
  )
}
