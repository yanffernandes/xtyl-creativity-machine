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
        <div className="flex items-center justify-center min-h-screen relative">
            <Card glass className="w-[450px]">
                <CardHeader>
                    <CardTitle className="text-2xl">Redefinir Senha</CardTitle>
                    <CardDescription className="text-text-secondary mt-2">
                        Digite sua nova senha
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {success ? (
                        <Alert className="border-green-500/20 bg-green-500/10">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-700 dark:text-green-300">
                                Senha redefinida com sucesso! Redirecionando para o login...
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {!token && (
                                <Alert className="border-red-500/20 bg-red-500/10">
                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                    <AlertDescription className="text-red-700 dark:text-red-300">
                                        Token não encontrado. Use o link enviado por email.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium">Nova Senha</Label>
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
                                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar Senha</Label>
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
                                <Alert className="border-red-500/20 bg-red-500/10">
                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                    <AlertDescription className="text-red-700 dark:text-red-300">{error}</AlertDescription>
                                </Alert>
                            )}

                            <Button
                                type="submit"
                                className="w-full"
                                size="lg"
                                disabled={loading || !token}
                            >
                                {loading ? "Redefinindo..." : "Redefinir Senha"}
                            </Button>

                            <div className="text-center">
                                <Link
                                    href="/login"
                                    className="text-sm text-accent-primary hover:text-accent-primary/80 transition-colors font-medium"
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
            <div className="flex items-center justify-center min-h-screen relative">
                <Card glass className="w-[450px]">
                    <CardHeader>
                        <CardTitle className="text-2xl">Redefinir Senha</CardTitle>
                        <CardDescription className="text-text-secondary mt-2">Carregando...</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    )
}
