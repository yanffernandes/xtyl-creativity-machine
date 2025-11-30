"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import api from "@/lib/api"
import { useAuthStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, ArrowLeft, Home, User } from "lucide-react"
import WorkspaceSidebar from "@/components/WorkspaceSidebar"
import Breadcrumbs from "@/components/Breadcrumbs"
import { useWorkspace } from "@/hooks/use-workspaces"

export default function ProfilePage() {
    const params = useParams()
    const workspaceId = params.id as string
    const [user, setUser] = useState<any>(null)
    const [fullName, setFullName] = useState("")
    const [password, setPassword] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const { session, isLoading: authLoading } = useAuthStore()
    const { toast } = useToast()
    const router = useRouter()

    const { data: workspace } = useWorkspace(workspaceId)

    const breadcrumbItems = [
        { label: workspace?.name || "Workspace", href: `/workspace/${workspaceId}`, icon: <Home className="h-3.5 w-3.5" /> },
        { label: "Meu Perfil", icon: <User className="h-3.5 w-3.5" /> },
    ]

    useEffect(() => {
        if (authLoading) return

        if (!session) {
            router.push("/login")
            return
        }

        api.get("/auth/me").then(res => {
            setUser(res.data)
            setFullName(res.data.full_name || "")
        }).catch(console.error)
    }, [session, authLoading, router])

    const handleSave = async () => {
        try {
            setIsSaving(true)
            const data: any = { full_name: fullName }
            if (password) {
                data.password = password
            }
            await api.put("/auth/me", data)
            toast({ title: "Sucesso", description: "Perfil atualizado com sucesso." })
            setPassword("") // Clear password field
        } catch (error) {
            console.error("Failed to update profile", error)
            toast({ title: "Erro", description: "Falha ao atualizar perfil.", variant: "destructive" })
        } finally {
            setIsSaving(false)
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
                            <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
                            <p className="text-sm text-text-secondary mt-2">
                                Gerencie suas informações pessoais
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
                <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
                    <Card glass className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle className="text-2xl">Informações Pessoais</CardTitle>
                            <CardDescription className="text-text-secondary mt-2">Atualize seus dados de perfil.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                                <Input id="email" value={user?.email || ""} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fullName" className="text-sm font-medium">Nome Completo</Label>
                                <Input
                                    id="fullName"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Seu nome"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium">Nova Senha</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Deixe em branco para manter a atual"
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end pt-2">
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Alterações
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    )
}
