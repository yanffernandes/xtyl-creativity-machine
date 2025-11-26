"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/store"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Settings, Users, Sparkles, Eye, ArrowLeft, Trash2, UserPlus, Palette, Moon, Sun } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTheme } from "next-themes"
import { Combobox, ComboboxOption } from "@/components/ui/combobox"
import { Checkbox } from "@/components/ui/checkbox"
import WorkspaceSidebar from "@/components/WorkspaceSidebar"
import Breadcrumbs from "@/components/Breadcrumbs"
import { Home, SettingsIcon } from "lucide-react"

interface Workspace {
    id: string
    name: string
    description?: string
    default_text_model?: string
    default_vision_model?: string
    attachment_analysis_model?: string
    available_models?: string[]
}

interface WorkspaceMember {
    id: string
    email: string
    role: string
    joined_at: string
}

interface Model {
    id: string
    name: string
    pricing?: {
        prompt: string
        completion: string
    }
    architecture?: {
        modality?: string[]
    }
}

export default function SettingsPage() {
    const params = useParams()
    const workspaceId = params.id as string
    const router = useRouter()
    const { token } = useAuthStore()
    const { toast } = useToast()
    const { theme, setTheme } = useTheme()

    const [workspace, setWorkspace] = useState<Workspace | null>(null)
    const [members, setMembers] = useState<WorkspaceMember[]>([])
    const [textModels, setTextModels] = useState<Model[]>([])
    const [visionModels, setVisionModels] = useState<Model[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [newMemberEmail, setNewMemberEmail] = useState("")

    // Form states
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [defaultTextModel, setDefaultTextModel] = useState("")
    const [defaultVisionModel, setDefaultVisionModel] = useState("")
    const [attachmentAnalysisModel, setAttachmentAnalysisModel] = useState("")
    const [availableModels, setAvailableModels] = useState<string[]>([])
    const [modelFilter, setModelFilter] = useState("")

    useEffect(() => {
        if (!token) {
            router.push("/login")
            return
        }
        fetchData()
    }, [token, workspaceId])

    const fetchData = async () => {
        setIsLoading(true)
        try {
            // Fetch workspace details
            const workspacesRes = await api.get("/workspaces/")
            const currentWorkspace = workspacesRes.data.find((w: Workspace) => w.id === workspaceId)

            if (currentWorkspace) {
                setWorkspace(currentWorkspace)
                setName(currentWorkspace.name)
                setDescription(currentWorkspace.description || "")
                setDefaultTextModel(currentWorkspace.default_text_model || "")
                setDefaultVisionModel(currentWorkspace.default_vision_model || "")
                setAttachmentAnalysisModel(currentWorkspace.attachment_analysis_model || "")
                setAvailableModels(currentWorkspace.available_models || [])
            }

            // Fetch available models
            const modelsRes = await api.get("/chat/models")
            const models = modelsRes.data

            // Use the same models for both text and vision (OpenRouter provides multimodal models)
            setTextModels(models)
            setVisionModels(models)

            // Fetch workspace members
            const membersRes = await api.get(`/workspaces/${workspaceId}/members`)
            setMembers(membersRes.data)
        } catch (error) {
            console.error("Failed to fetch settings data", error)
            toast({ title: "Erro", description: "Falha ao carregar configurações", variant: "destructive" })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSaveWorkspace = async () => {
        if (!workspace) return

        setIsSaving(true)
        try {
            await api.put(`/workspaces/${workspaceId}`, {
                name,
                description,
                default_text_model: defaultTextModel,
                default_vision_model: defaultVisionModel,
                attachment_analysis_model: attachmentAnalysisModel,
                available_models: availableModels,
            })

            toast({ title: "Sucesso", description: "Configurações salvas com sucesso!" })
            fetchData()
        } catch (error) {
            console.error("Failed to save workspace", error)
            toast({ title: "Erro", description: "Falha ao salvar configurações", variant: "destructive" })
        } finally {
            setIsSaving(false)
        }
    }

    const handleAddMember = async () => {
        if (!newMemberEmail.trim()) {
            toast({ title: "Erro", description: "Digite um email válido", variant: "destructive" })
            return
        }

        try {
            await api.post(`/workspaces/${workspaceId}/members`, {
                email: newMemberEmail,
                role: "member"
            })

            toast({ title: "Sucesso", description: "Membro adicionado com sucesso!" })
            setNewMemberEmail("")
            fetchData() // Refresh members list
        } catch (error: any) {
            console.error("Failed to add member", error)
            const errorMsg = error?.response?.data?.detail || "Falha ao adicionar membro"
            toast({ title: "Erro", description: errorMsg, variant: "destructive" })
        }
    }

    const handleRemoveMember = async (memberId: string) => {
        if (!confirm("Tem certeza que deseja remover este membro?")) return

        try {
            await api.delete(`/workspaces/${workspaceId}/members/${memberId}`)
            toast({ title: "Sucesso", description: "Membro removido com sucesso!" })
            fetchData() // Refresh members list
        } catch (error: any) {
            console.error("Failed to remove member", error)
            const errorMsg = error?.response?.data?.detail || "Falha ao remover membro"
            toast({ title: "Erro", description: errorMsg, variant: "destructive" })
        }
    }

    const formatPrice = (price: string | number | undefined) => {
        if (!price) return "$0.00"
        const num = typeof price === 'string' ? parseFloat(price) : price
        if (isNaN(num) || num === 0) return "$0.00"

        // OpenRouter returns price per TOKEN, we want to show per 1M tokens
        // So we multiply by 1,000,000
        const pricePerMillion = num * 1000000

        // Format with appropriate decimal places
        if (pricePerMillion < 1) {
            return `$${pricePerMillion.toFixed(3)}`
        }
        return `$${pricePerMillion.toFixed(2)}`
    }

    const toggleModelAvailability = (modelId: string) => {
        setAvailableModels(prev =>
            prev.includes(modelId)
                ? prev.filter(id => id !== modelId)
                : [...prev, modelId]
        )
    }

    const breadcrumbItems = [
        { label: workspace?.name || "Workspace", href: `/workspace/${workspaceId}`, icon: <Home className="h-3.5 w-3.5" /> },
        { label: "Configurações", icon: <SettingsIcon className="h-3.5 w-3.5" /> },
    ]

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
        )
    }

    return (
        <div className="flex h-screen overflow-hidden relative">
            <WorkspaceSidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-6 border-b border-white/10">
                    <Breadcrumbs items={breadcrumbItems} className="mb-3" />
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Configurações do Workspace</h1>
                            <p className="text-sm text-text-secondary mt-2">
                                Gerencie as configurações e membros do seu workspace
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/workspace/${workspaceId}`)}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Voltar
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <Tabs defaultValue="general" className="w-full">
                        <TabsList className="mb-6">
                            <TabsTrigger value="general" className="gap-2">
                                <Settings className="h-4 w-4" />
                                Geral
                            </TabsTrigger>
                            <TabsTrigger value="appearance" className="gap-2">
                                <Palette className="h-4 w-4" />
                                Aparência
                            </TabsTrigger>
                            <TabsTrigger value="ai-models" className="gap-2">
                                <Sparkles className="h-4 w-4" />
                                Modelos de IA
                            </TabsTrigger>
                            <TabsTrigger value="members" className="gap-2">
                                <Users className="h-4 w-4" />
                                Membros
                            </TabsTrigger>
                        </TabsList>

                        {/* General Tab */}
                        <TabsContent value="general" className="space-y-6">
                            <Card glass>
                                <CardHeader>
                                    <CardTitle className="text-xl">Informações do Workspace</CardTitle>
                                    <CardDescription className="text-text-secondary mt-2">
                                        Configure as informações básicas do seu workspace
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-sm font-medium">Nome do Workspace</Label>
                                        <Input
                                            id="name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Meu Workspace"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description" className="text-sm font-medium">Descrição</Label>
                                        <Textarea
                                            id="description"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Descreva seu workspace..."
                                            rows={4}
                                        />
                                    </div>

                                    <Button onClick={handleSaveWorkspace} disabled={isSaving}>
                                        {isSaving ? "Salvando..." : "Salvar Alterações"}
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Appearance Tab */}
                        <TabsContent value="appearance" className="space-y-6">
                            <Card glass>
                                <CardHeader>
                                    <CardTitle className="text-xl">Tema</CardTitle>
                                    <CardDescription className="text-text-secondary mt-2">
                                        Escolha entre modo claro, escuro ou automático baseado nas preferências do sistema
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        <button
                                            onClick={() => setTheme("light")}
                                            className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all hover:border-accent-primary ${
                                                theme === "light" ? "border-accent-primary bg-accent-primary/5" : "border-border-primary"
                                            }`}
                                        >
                                            <Sun className="h-6 w-6" />
                                            <span className="text-sm font-medium">Claro</span>
                                        </button>

                                        <button
                                            onClick={() => setTheme("dark")}
                                            className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all hover:border-accent-primary ${
                                                theme === "dark" ? "border-accent-primary bg-accent-primary/5" : "border-border-primary"
                                            }`}
                                        >
                                            <Moon className="h-6 w-6" />
                                            <span className="text-sm font-medium">Escuro</span>
                                        </button>

                                        <button
                                            onClick={() => setTheme("system")}
                                            className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all hover:border-accent-primary ${
                                                theme === "system" ? "border-accent-primary bg-accent-primary/5" : "border-border-primary"
                                            }`}
                                        >
                                            <Settings className="h-6 w-6" />
                                            <span className="text-sm font-medium">Sistema</span>
                                        </button>
                                    </div>

                                    <p className="text-xs text-muted-foreground">
                                        O modo sistema ajusta automaticamente com base nas preferências do seu dispositivo
                                    </p>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* AI Models Tab */}
                        <TabsContent value="ai-models" className="space-y-6">
                            <Card glass>
                                <CardHeader>
                                    <CardTitle className="text-xl">Modelos de IA Disponíveis</CardTitle>
                                    <CardDescription className="text-text-secondary mt-2">
                                        Selecione quais modelos estarão disponíveis no workspace e defina os padrões
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Default Text Model */}
                                    <div className="space-y-2">
                                        <Label htmlFor="text-model" className="text-sm font-medium">Modelo de Texto Padrão</Label>
                                        <Combobox
                                            options={textModels
                                                .filter(m => availableModels.length === 0 || availableModels.includes(m.id))
                                                .map(m => ({ value: m.id, label: m.name }))}
                                            value={defaultTextModel}
                                            onValueChange={setDefaultTextModel}
                                            placeholder="Selecione um modelo"
                                            searchPlaceholder="Buscar modelo..."
                                            emptyText="Nenhum modelo encontrado"
                                        />
                                    </div>

                                    {/* Attachment Analysis Model */}
                                    <div className="space-y-2">
                                        <Label htmlFor="attachment-model" className="text-sm font-medium">Modelo para Análise de Anexos</Label>
                                        <p className="text-xs text-text-secondary">
                                            Modelo usado para analisar imagens e PDFs enviados no chat (📎)
                                        </p>
                                        <Combobox
                                            options={[
                                                { value: "default", label: "Usar modelo de visão padrão" },
                                                ...visionModels
                                                    .filter(m => {
                                                        // Filter only models with vision capability
                                                        const hasVision = m.architecture?.modality?.includes('image') ||
                                                                         m.id.includes('vision') ||
                                                                         m.id.includes('claude-3') ||
                                                                         m.id.includes('gpt-4') ||
                                                                         m.id.includes('gemini')
                                                        return hasVision
                                                    })
                                                    .map(m => ({ value: m.id, label: m.name }))
                                            ]}
                                            value={attachmentAnalysisModel || "default"}
                                            onValueChange={(value) => setAttachmentAnalysisModel(value === "default" ? "" : value)}
                                            placeholder="Usar modelo de visão padrão"
                                            searchPlaceholder="Buscar modelo vision..."
                                            emptyText="Nenhum modelo vision encontrado"
                                        />
                                    </div>

                                    {/* Recommended Models List */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-medium">Modelos Recomendados</Label>
                                        <p className="text-xs text-text-secondary">
                                            Selecione quais modelos aparecerão como sugestões rápidas para sua equipe
                                        </p>
                                        <Input
                                            placeholder="Buscar modelos por nome ou ID..."
                                            value={modelFilter}
                                            onChange={(e) => setModelFilter(e.target.value)}
                                            className="mb-2"
                                        />
                                        <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-md p-4">
                                            {textModels
                                                .filter(model =>
                                                    model.name.toLowerCase().includes(modelFilter.toLowerCase()) ||
                                                    model.id.toLowerCase().includes(modelFilter.toLowerCase())
                                                )
                                                .map((model) => (
                                                <div key={model.id} className="flex items-start space-x-3 p-2 hover:bg-muted/50 rounded-md">
                                                    <Checkbox
                                                        id={`model-${model.id}`}
                                                        checked={availableModels.includes(model.id)}
                                                        onCheckedChange={() => toggleModelAvailability(model.id)}
                                                        className="mt-1"
                                                    />
                                                    <div className="flex-1 space-y-1">
                                                        <label
                                                            htmlFor={`model-${model.id}`}
                                                            className="text-sm font-medium leading-none cursor-pointer"
                                                        >
                                                            {model.name}
                                                        </label>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <span className="font-mono">{model.id}</span>
                                                            {model.pricing && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span>Input: {formatPrice(model.pricing.prompt)}/1M</span>
                                                                    <span>•</span>
                                                                    <span>Output: {formatPrice(model.pricing.completion)}/1M</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Marque os modelos que estarão disponíveis para uso neste workspace. Preços em USD por milhão de tokens.
                                        </p>
                                    </div>

                                    <Button onClick={handleSaveWorkspace} disabled={isSaving}>
                                        {isSaving ? "Salvando..." : "Salvar Alterações"}
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Members Tab */}
                        <TabsContent value="members" className="space-y-6">
                            <Card glass>
                                <CardHeader>
                                    <CardTitle className="text-xl">Gerenciar Membros</CardTitle>
                                    <CardDescription className="text-text-secondary mt-2">
                                        Adicione ou remova membros do seu workspace
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Email do novo membro"
                                            value={newMemberEmail}
                                            onChange={(e) => setNewMemberEmail(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleAddMember()}
                                        />
                                        <Button onClick={handleAddMember}>
                                            <UserPlus className="h-4 w-4 mr-2" />
                                            Adicionar
                                        </Button>
                                    </div>

                                    <div className="space-y-2 mt-6">
                                        <h4 className="text-sm font-medium">Membros atuais</h4>
                                        {members.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">Nenhum membro encontrado</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {members.map((member) => (
                                                    <div
                                                        key={member.id}
                                                        className="flex items-center justify-between p-3 border rounded-lg"
                                                    >
                                                        <div>
                                                            <p className="text-sm font-medium">{member.email}</p>
                                                            <p className="text-xs text-muted-foreground capitalize">
                                                                {member.role}
                                                            </p>
                                                        </div>
                                                        {member.role !== "owner" && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleRemoveMember(member.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
