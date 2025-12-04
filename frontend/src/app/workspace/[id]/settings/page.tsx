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
import { Settings, Users, Sparkles, ArrowLeft, Trash2, UserPlus, Palette, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Combobox } from "@/components/ui/combobox"
// Checkbox removed - was used for Modelos Recomendados section (now in admin panel)
import WorkspaceSidebar from "@/components/WorkspaceSidebar"
import Breadcrumbs from "@/components/Breadcrumbs"
import { Home, SettingsIcon } from "lucide-react"
import { useWorkspace, useUpdateWorkspace, useWorkspaceMembers, useRemoveWorkspaceMember } from "@/hooks/use-workspaces"
import { useConfirm } from "@/components/confirm-dialog"

interface Workspace {
    id: string
    name: string
    description?: string
    default_text_model?: string
    default_vision_model?: string
    attachment_analysis_model?: string
    available_models?: string[]
}

// WorkspaceMember type is from Supabase hooks
// It has structure: { workspace_id, user_id, role, user: { id, email, full_name } }

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
    const { session, isLoading: authLoading } = useAuthStore()
    const { toast } = useToast()
    const { theme, setTheme } = useTheme()
    const confirm = useConfirm()

    // Supabase hooks for workspace and members
    const { data: workspace, isLoading: workspaceLoading } = useWorkspace(workspaceId)
    const { data: members = [], isLoading: membersLoading } = useWorkspaceMembers(workspaceId)
    const updateWorkspace = useUpdateWorkspace()
    const removeMember = useRemoveWorkspaceMember()

    const [textModels, setTextModels] = useState<Model[]>([])
    const [visionModels, setVisionModels] = useState<Model[]>([])
    const [modelsLoading, setModelsLoading] = useState(true)
    const [newMemberEmail, setNewMemberEmail] = useState("")
    const [isAddingMember, setIsAddingMember] = useState(false)
    const [pendingInvites, setPendingInvites] = useState<any[]>([])

    // Form states
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [defaultTextModel, setDefaultTextModel] = useState("")
    const [defaultVisionModel, setDefaultVisionModel] = useState("")
    const [attachmentAnalysisModel, setAttachmentAnalysisModel] = useState("")
    // availableModels and modelFilter removed - now managed in admin panel

    // Initialize form when workspace data loads
    useEffect(() => {
        if (workspace) {
            setName(workspace.name)
            setDescription(workspace.description || "")
            setDefaultTextModel(workspace.default_text_model || "")
            setDefaultVisionModel(workspace.default_vision_model || "")
            setAttachmentAnalysisModel(workspace.attachment_analysis_model || "")
            // availableModels is now managed in admin panel, not workspace settings
        }
    }, [workspace])

    useEffect(() => {
        if (authLoading) return

        if (!session) {
            router.push("/login")
            return
        }
        fetchModels()
        fetchPendingInvites()
    }, [session, authLoading, router, workspaceId])

    // Fetch AI models from backend API (OpenRouter proxy)
    const fetchModels = async () => {
        setModelsLoading(true)
        try {
            const modelsRes = await api.get("/chat/models")
            const models = modelsRes.data

            // Use the same models for both text and vision (OpenRouter provides multimodal models)
            setTextModels(models)
            setVisionModels(models)
        } catch (error) {
            console.error("Failed to fetch models", error)
            toast({ title: "Erro", description: "Falha ao carregar modelos de IA", variant: "destructive" })
        } finally {
            setModelsLoading(false)
        }
    }

    // Fetch pending invites
    const fetchPendingInvites = async () => {
        try {
            const response = await api.get(`/workspaces/${workspaceId}/invites`)
            setPendingInvites(response.data || [])
        } catch (error) {
            console.error("Failed to fetch pending invites", error)
        }
    }

    const isLoading = authLoading || workspaceLoading || membersLoading || modelsLoading

    const handleSaveWorkspace = () => {
        if (!workspace) return

        updateWorkspace.mutate({
            id: workspaceId,
            data: {
                name,
                description,
                default_text_model: defaultTextModel,
                default_vision_model: defaultVisionModel,
                attachment_analysis_model: attachmentAnalysisModel,
                // available_models is now managed in admin panel, not workspace settings
            },
        })
    }

    const handleAddMember = async () => {
        if (!newMemberEmail.trim()) {
            toast({ title: "Erro", description: "Digite um email válido", variant: "destructive" })
            return
        }

        setIsAddingMember(true)
        try {
            const response = await api.post(`/workspaces/${workspaceId}/members`, {
                email: newMemberEmail.trim(),
                role: "member"
            })

            const { user_exists, invite_sent, message } = response.data

            if (user_exists) {
                toast({
                    title: "Membro adicionado",
                    description: message || "O usuário foi adicionado ao workspace."
                })
            } else if (invite_sent) {
                toast({
                    title: "Convite enviado",
                    description: message || "Um email de convite foi enviado para o usuário."
                })
            }

            setNewMemberEmail("")
            // Refresh members list and invites
            fetchPendingInvites()
            window.location.reload()
        } catch (error: any) {
            console.error("Failed to add member", error)
            const errorMsg = error?.response?.data?.detail || "Falha ao adicionar membro"
            toast({ title: "Erro", description: errorMsg, variant: "destructive" })
        } finally {
            setIsAddingMember(false)
        }
    }

    const handleCancelInvite = async (inviteId: string) => {
        const confirmed = await confirm({
            title: "Cancelar convite",
            description: "Tem certeza que deseja cancelar este convite?",
            confirmLabel: "Cancelar convite",
            variant: "destructive"
        })

        if (!confirmed) return

        try {
            await api.delete(`/workspaces/${workspaceId}/invites/${inviteId}`)
            toast({
                title: "Convite cancelado",
                description: "O convite foi cancelado com sucesso."
            })
            fetchPendingInvites()
        } catch (error: any) {
            console.error("Failed to cancel invite", error)
            const errorMsg = error?.response?.data?.detail || "Falha ao cancelar convite"
            toast({ title: "Erro", description: errorMsg, variant: "destructive" })
        }
    }

    const handleRemoveMember = async (memberId: string) => {
        const confirmed = await confirm({
            title: "Remover membro",
            description: "Tem certeza que deseja remover este membro?",
            confirmLabel: "Remover",
            cancelLabel: "Cancelar",
            variant: "destructive",
        })
        if (!confirmed) return

        removeMember.mutate({ workspaceId, userId: memberId })
    }

    // formatPrice and toggleModelAvailability removed - model selection is now in admin panel

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
            <div className="p-3 pr-0">
                <WorkspaceSidebar className="h-[calc(100vh-24px)]" />
            </div>

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

                                    <Button onClick={handleSaveWorkspace} disabled={updateWorkspace.isPending}>
                                        {updateWorkspace.isPending ? "Salvando..." : "Salvar Alterações"}
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
                                            options={textModels.map(m => ({ value: m.id, label: m.name }))}
                                            value={defaultTextModel}
                                            onValueChange={setDefaultTextModel}
                                            placeholder="Selecione um modelo"
                                            searchPlaceholder="Buscar modelo..."
                                            emptyText="Nenhum modelo encontrado"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Os modelos disponíveis são configurados pelo administrador
                                        </p>
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

                                    <Button onClick={handleSaveWorkspace} disabled={updateWorkspace.isPending}>
                                        {updateWorkspace.isPending ? "Salvando..." : "Salvar Alterações"}
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
                                            onKeyPress={(e) => e.key === 'Enter' && !isAddingMember && handleAddMember()}
                                            disabled={isAddingMember}
                                        />
                                        <Button onClick={handleAddMember} disabled={isAddingMember}>
                                            <UserPlus className="h-4 w-4 mr-2" />
                                            {isAddingMember ? "Adicionando..." : "Adicionar"}
                                        </Button>
                                    </div>

                                    <div className="space-y-2 mt-6">
                                        <h4 className="text-sm font-medium">Membros atuais</h4>
                                        {(members || []).length === 0 && pendingInvites.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">Nenhum membro encontrado</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {(members || []).map((member) => (
                                                    <div
                                                        key={member.user_id}
                                                        className="flex items-center justify-between p-3 border rounded-lg"
                                                    >
                                                        <div>
                                                            <p className="text-sm font-medium">{member.user?.email || member.user_id}</p>
                                                            <p className="text-xs text-muted-foreground capitalize">
                                                                {member.role}
                                                            </p>
                                                        </div>
                                                        {member.role !== "owner" && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleRemoveMember(member.user_id)}
                                                            >
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}

                                                {pendingInvites.length > 0 && (
                                                    <>
                                                        <h4 className="text-sm font-medium mt-4 pt-4 border-t">Convites Pendentes</h4>
                                                        {pendingInvites.map((invite) => (
                                                            <div
                                                                key={invite.id}
                                                                className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-950"
                                                            >
                                                                <div>
                                                                    <p className="text-sm font-medium">{invite.email}</p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Convite enviado por {invite.invited_by}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded">
                                                                        Pendente
                                                                    </span>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleCancelInvite(invite.id)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </>
                                                )}
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
