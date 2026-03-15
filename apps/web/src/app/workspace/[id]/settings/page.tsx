"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useAuthStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Settings, Users, ArrowLeft, Trash2, UserPlus, Palette, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import WorkspaceSidebar from "@/components/WorkspaceSidebar"
import Breadcrumbs from "@/components/Breadcrumbs"
import { Home, SettingsIcon } from "lucide-react"
import { useWorkspace, useUpdateWorkspace, useWorkspaceMembers, useRemoveWorkspaceMember } from "@/hooks/use-workspaces"
import { useConfirm } from "@/components/confirm-dialog"
import api from "@/lib/api"

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


export default function SettingsPage() {
    const params = useParams()
    const workspaceId = params.id as string
    const router = useRouter()
    const { token, isLoading: authLoading } = useAuthStore()
    const { toast } = useToast()
    const { theme, setTheme } = useTheme()
    const confirm = useConfirm()
    const t = useTranslations("settings")
    const tCommon = useTranslations("common")
    const tNav = useTranslations("navigation")

    // Supabase hooks for workspace and members
    const { data: workspace, isLoading: workspaceLoading } = useWorkspace(workspaceId)
    const { data: members = [], isLoading: membersLoading } = useWorkspaceMembers(workspaceId)
    const updateWorkspace = useUpdateWorkspace()
    const removeMember = useRemoveWorkspaceMember()

    const [newMemberEmail, setNewMemberEmail] = useState("")
    const [isAddingMember, setIsAddingMember] = useState(false)
    const [pendingInvites, setPendingInvites] = useState<any[]>([])

    // Form states
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    // Initialize form when workspace data loads
    useEffect(() => {
        if (workspace) {
            setName(workspace.name)
            setDescription(workspace.description || "")
        }
    }, [workspace])

    useEffect(() => {
        if (authLoading) return

        if (!token) {
            router.push("/login")
            return
        }
        fetchPendingInvites()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, authLoading, workspaceId])

    // Fetch pending invites
    const fetchPendingInvites = async () => {
        try {
            const response = await api.get(`/workspaces/${workspaceId}/invites`)
            setPendingInvites(response.data || [])
        } catch (error) {
            console.error("Failed to fetch pending invites", error)
        }
    }

    const isLoading = authLoading || workspaceLoading || membersLoading

    const handleSaveWorkspace = () => {
        if (!workspace) return

        updateWorkspace.mutate({
            id: workspaceId,
            data: { name, description },
        })
    }

    const handleAddMember = async () => {
        if (!newMemberEmail.trim()) {
            toast({ title: tCommon("error"), description: t("enterValidEmail"), variant: "destructive" })
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
                    title: t("memberAdded"),
                    description: message || t("userAddedToWorkspace")
                })
            } else if (invite_sent) {
                toast({
                    title: t("inviteSent"),
                    description: message || t("inviteEmailSent")
                })
            }

            setNewMemberEmail("")
            // Refresh members list and invites
            fetchPendingInvites()
            window.location.reload()
        } catch (error: any) {
            console.error("Failed to add member", error)
            const errorMsg = error?.response?.data?.detail || t("failedToAddMember")
            toast({ title: tCommon("error"), description: errorMsg, variant: "destructive" })
        } finally {
            setIsAddingMember(false)
        }
    }

    const handleCancelInvite = async (inviteId: string) => {
        const confirmed = await confirm({
            title: t("cancelInvite"),
            description: t("cancelInviteConfirm"),
            confirmLabel: t("cancelInviteButton"),
            variant: "destructive"
        })

        if (!confirmed) return

        try {
            await api.delete(`/workspaces/${workspaceId}/invites/${inviteId}`)
            toast({
                title: t("cancelInvite"),
                description: t("inviteCancelled")
            })
            fetchPendingInvites()
        } catch (error: any) {
            console.error("Failed to cancel invite", error)
            const errorMsg = error?.response?.data?.detail || t("failedToCancelInvite")
            toast({ title: tCommon("error"), description: errorMsg, variant: "destructive" })
        }
    }

    const handleRemoveMember = async (memberId: string) => {
        const confirmed = await confirm({
            title: t("removeMember"),
            description: t("removeMemberConfirm"),
            confirmLabel: t("remove"),
            cancelLabel: tCommon("cancel"),
            variant: "destructive",
        })
        if (!confirmed) return

        removeMember.mutate({ workspaceId, userId: memberId })
    }

    // formatPrice and toggleModelAvailability removed - model selection is now in admin panel

    const breadcrumbItems = [
        { label: workspace?.name || "Workspace", href: `/workspace/${workspaceId}`, icon: <Home className="h-3.5 w-3.5" /> },
        { label: tNav("settings"), icon: <SettingsIcon className="h-3.5 w-3.5" /> },
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
                            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                            <p className="text-sm text-text-secondary mt-2">
                                {t("subtitle")}
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/workspace/${workspaceId}`)}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {t("back")}
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <Tabs defaultValue="general" className="w-full">
                        <TabsList className="mb-6">
                            <TabsTrigger value="general" className="gap-2">
                                <Settings className="h-4 w-4" />
                                {t("general")}
                            </TabsTrigger>
                            <TabsTrigger value="appearance" className="gap-2">
                                <Palette className="h-4 w-4" />
                                {t("appearance")}
                            </TabsTrigger>
                            <TabsTrigger value="members" className="gap-2">
                                <Users className="h-4 w-4" />
                                {t("members")}
                            </TabsTrigger>
                        </TabsList>

                        {/* General Tab */}
                        <TabsContent value="general" className="space-y-6">
                            <Card glass>
                                <CardHeader>
                                    <CardTitle className="text-xl">{t("workspaceInfo")}</CardTitle>
                                    <CardDescription className="text-text-secondary mt-2">
                                        {t("workspaceInfoDesc")}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-sm font-medium">{t("workspaceName")}</Label>
                                        <Input
                                            id="name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder={t("workspaceNamePlaceholder")}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description" className="text-sm font-medium">{t("description")}</Label>
                                        <Textarea
                                            id="description"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder={t("descriptionPlaceholder")}
                                            rows={4}
                                        />
                                    </div>

                                    <Button onClick={handleSaveWorkspace} disabled={updateWorkspace.isPending}>
                                        {updateWorkspace.isPending ? t("saving") : t("saveChanges")}
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Appearance Tab */}
                        <TabsContent value="appearance" className="space-y-6">
                            <Card glass>
                                <CardHeader>
                                    <CardTitle className="text-xl">{t("theme")}</CardTitle>
                                    <CardDescription className="text-text-secondary mt-2">
                                        {t("themeDesc")}
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
                                            <span className="text-sm font-medium">{t("light")}</span>
                                        </button>

                                        <button
                                            onClick={() => setTheme("dark")}
                                            className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all hover:border-accent-primary ${
                                                theme === "dark" ? "border-accent-primary bg-accent-primary/5" : "border-border-primary"
                                            }`}
                                        >
                                            <Moon className="h-6 w-6" />
                                            <span className="text-sm font-medium">{t("dark")}</span>
                                        </button>

                                        <button
                                            onClick={() => setTheme("system")}
                                            className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all hover:border-accent-primary ${
                                                theme === "system" ? "border-accent-primary bg-accent-primary/5" : "border-border-primary"
                                            }`}
                                        >
                                            <Settings className="h-6 w-6" />
                                            <span className="text-sm font-medium">{t("system")}</span>
                                        </button>
                                    </div>

                                    <p className="text-xs text-muted-foreground">
                                        {t("themeHint")}
                                    </p>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Members Tab */}
                        <TabsContent value="members" className="space-y-6">
                            <Card glass>
                                <CardHeader>
                                    <CardTitle className="text-xl">{t("manageMembers")}</CardTitle>
                                    <CardDescription className="text-text-secondary mt-2">
                                        {t("manageMembersDesc")}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder={t("newMemberEmail")}
                                            value={newMemberEmail}
                                            onChange={(e) => setNewMemberEmail(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && !isAddingMember && handleAddMember()}
                                            disabled={isAddingMember}
                                        />
                                        <Button onClick={handleAddMember} disabled={isAddingMember}>
                                            <UserPlus className="h-4 w-4 mr-2" />
                                            {isAddingMember ? t("adding") : t("add")}
                                        </Button>
                                    </div>

                                    <div className="space-y-2 mt-6">
                                        <h4 className="text-sm font-medium">{t("currentMembers")}</h4>
                                        {(members || []).length === 0 && pendingInvites.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">{t("noMembersFound")}</p>
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
                                                        <h4 className="text-sm font-medium mt-4 pt-4 border-t">{t("pendingInvites")}</h4>
                                                        {pendingInvites.map((invite) => (
                                                            <div
                                                                key={invite.id}
                                                                className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-950"
                                                            >
                                                                <div>
                                                                    <p className="text-sm font-medium">{invite.email}</p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {t("inviteSentBy")} {invite.invited_by}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded">
                                                                        {t("pending")}
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
