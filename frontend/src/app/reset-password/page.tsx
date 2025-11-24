"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle } from "lucide-react"

function ResetPasswordForm() {
    const [token, setToken] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const tokenFromUrl = searchParams.get("token")
        if (tokenFromUrl) {
            setToken(tokenFromUrl)
        }
    }, [searchParams])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSuccess(false)

        // Validation
        if (password.length < 6) {
            setError("A senha deve ter pelo menos 6 caracteres")
            return
        }

        if (password !== confirmPassword) {
            setError("As senhas não coincidem")
            return
        }

        if (!token) {
            setError("Token inválido. Use o link do email.")
            return
        }

        setLoading(true)

        try {
            await api.post("/auth/password-reset/confirm", {
                token,
                new_password: password
            })
            setSuccess(true)

            // Redirect to login after 3 seconds
            setTimeout(() => {
                router.push("/login")
            }, 3000)
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || "Token inválido ou expirado"
            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-[450px]">
                <CardHeader>
                    <CardTitle>Redefinir Senha</CardTitle>
                    <CardDescription>
                        Digite sua nova senha
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {success ? (
                        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800 dark:text-green-200">
                                Senha redefinida com sucesso! Redirecionando para o login...
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {!token && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Token não encontrado. Use o link enviado por email.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="password">Nova Senha</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Digite sua nova senha"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading || !token}
                                    minLength={6}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="Confirme sua nova senha"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    disabled={loading || !token}
                                    minLength={6}
                                />
                            </div>

                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loading || !token}
                            >
                                {loading ? "Redefinindo..." : "Redefinir Senha"}
                            </Button>

                            <div className="text-center">
                                <Link
                                    href="/login"
                                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                                >
                                    Voltar para o login
                                </Link>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Card className="w-[450px]">
                    <CardHeader>
                        <CardTitle>Redefinir Senha</CardTitle>
                        <CardDescription>Carregando...</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    )
}
