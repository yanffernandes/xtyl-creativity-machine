"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import { useAuthStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null)
    const [fullName, setFullName] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const { token } = useAuthStore()
    const { toast } = useToast()
    const router = useRouter()

    useEffect(() => {
        if (token) {
            api.get("/auth/me").then(res => {
                setUser(res.data)
                setFullName(res.data.full_name || "")
            }).catch(console.error)
        }
    }, [token])

    const handleSave = async () => {
        try {
            setIsLoading(true)
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
            setIsLoading(false)
        }
    }

    return (
        <div className="flex-1 h-full p-8 flex items-center justify-center bg-background">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Meu Perfil</CardTitle>
                    <CardDescription>Gerencie suas informações pessoais.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" value={user?.email || ""} disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Nome Completo</Label>
                        <Input
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Seu nome"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Nova Senha</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Deixe em branco para manter a atual"
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={() => router.back()}>Voltar</Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Alterações
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
