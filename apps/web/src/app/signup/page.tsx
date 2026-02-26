"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useTranslations } from "next-intl"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle, Loader2, Users, Mail } from "lucide-react"

interface InviteDetails {
    valid: boolean
    email?: string
    workspace_name?: string
    invited_by?: string
    expires_at?: string
    message?: string
}

function SignupForm() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [fullName, setFullName] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)
    const [validatingInvite, setValidatingInvite] = useState(true)
    const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null)
    const [inviteToken, setInviteToken] = useState<string | null>(null)

    const router = useRouter()
    const searchParams = useSearchParams()
    const t = useTranslations("auth")
    const tValidation = useTranslations("validation")
    const tErrors = useTranslations("errors")

    useEffect(() => {
        const token = searchParams.get("invite")
        const emailParam = searchParams.get("email")

        if (token) {
            setInviteToken(token)
            validateInvite(token)
        } else {
            // No invite token - redirect to regular register page
            router.push("/register")
        }

        if (emailParam) {
            setEmail(emailParam)
        }
    }, [searchParams, router])

    const validateInvite = async (token: string) => {
        setValidatingInvite(true)
        try {
            const response = await api.get(`/auth/invite/${token}/validate`)
            setInviteDetails(response.data)

            if (response.data.valid && response.data.email) {
                setEmail(response.data.email)
            }
        } catch (err: any) {
            setInviteDetails({
                valid: false,
                message: "Erro ao validar convite. Tente novamente."
            })
        } finally {
            setValidatingInvite(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSuccess(false)

        // Validations
        if (password.length < 6) {
            setError(tValidation("minLength", { min: 6 }))
            return
        }

        if (password !== confirmPassword) {
            setError(tValidation("passwordMatch"))
            return
        }

        if (!fullName.trim()) {
            setError("Nome completo é obrigatório")
            return
        }

        if (!inviteToken) {
            setError("Token de convite não encontrado")
            return
        }

        setLoading(true)

        try {
            const response = await api.post("/auth/signup/invite", {
                email,
                password,
                full_name: fullName,
                invite_token: inviteToken
            })

            if (response.data.success) {
                setSuccess(true)
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    router.push("/login")
                }, 3000)
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || tErrors("generic")
            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    // Loading state while validating invite
    if (validatingInvite) {
        return (
            <div className="flex items-center justify-center min-h-screen relative">
                <Card glass className="w-[480px]">
                    <CardHeader>
                        <CardTitle className="text-2xl text-center">Validando Convite</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
                        <p className="text-text-secondary">Aguarde enquanto validamos seu convite...</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Invalid invite
    if (inviteDetails && !inviteDetails.valid) {
        return (
            <div className="flex items-center justify-center min-h-screen relative">
                <Card glass className="w-[480px]">
                    <CardHeader>
                        <CardTitle className="text-2xl text-center text-red-500">Convite Inválido</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <AlertCircle className="h-12 w-12 text-red-500" />
                        <p className="text-center text-text-secondary">
                            {inviteDetails.message || "Este convite não é válido ou expirou."}
                        </p>
                        <div className="flex gap-4 mt-4">
                            <Button variant="outline" onClick={() => router.push("/login")}>
                                Fazer Login
                            </Button>
                            <Button onClick={() => router.push("/register")}>
                                Criar Conta
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Success state
    if (success) {
        return (
            <div className="flex items-center justify-center min-h-screen relative">
                <Card glass className="w-[480px]">
                    <CardHeader>
                        <CardTitle className="text-2xl text-center text-green-600">Conta Criada!</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <CheckCircle2 className="h-12 w-12 text-green-600" />
                        <p className="text-center text-text-secondary">
                            Sua conta foi criada com sucesso e você foi adicionado ao workspace
                            <strong className="text-foreground"> {inviteDetails?.workspace_name}</strong>.
                        </p>
                        <p className="text-sm text-text-secondary">
                            Redirecionando para o login...
                        </p>
                        <Button onClick={() => router.push("/login")} className="mt-2">
                            Ir para Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Signup form
    return (
        <div className="flex items-center justify-center min-h-screen relative py-8">
            <Card glass className="w-[480px]">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">{t("createAccount")}</CardTitle>
                    <CardDescription className="text-center mt-2">
                        Você foi convidado para participar de um workspace
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Invite Details */}
                    {inviteDetails && inviteDetails.valid && (
                        <div className="mb-6 p-4 rounded-lg bg-accent-primary/10 border border-accent-primary/20">
                            <div className="flex items-center gap-3 mb-3">
                                <Users className="h-5 w-5 text-accent-primary" />
                                <span className="font-medium text-foreground">
                                    {inviteDetails.workspace_name}
                                </span>
                            </div>
                            <p className="text-sm text-text-secondary">
                                Convidado por <strong>{inviteDetails.invited_by}</strong>
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="fullName" className="text-sm font-medium">
                                {t("fullName")}
                            </Label>
                            <Input
                                id="fullName"
                                placeholder="Seu nome completo"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium">
                                {t("email")}
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={true} // Email is locked to the invite
                                    className="pl-10 bg-muted"
                                />
                            </div>
                            <p className="text-xs text-text-secondary">
                                O email está vinculado ao convite e não pode ser alterado
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium">
                                {t("password")}
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="********"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                                minLength={6}
                            />
                            <p className="text-xs text-text-secondary">
                                {tValidation("minLength", { min: 6 })}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-sm font-medium">
                                {t("confirmNewPassword")}
                            </Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="********"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={loading}
                                minLength={6}
                            />
                        </div>

                        {error && (
                            <Alert className="border-red-500/20 bg-red-500/10">
                                <AlertCircle className="h-4 w-4 text-red-600" />
                                <AlertDescription className="text-red-700 dark:text-red-300">
                                    {error}
                                </AlertDescription>
                            </Alert>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            size="lg"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Criando conta...
                                </>
                            ) : (
                                "Criar Conta e Entrar no Workspace"
                            )}
                        </Button>

                        <div className="text-center">
                            <span className="text-sm text-text-secondary">
                                {t("alreadyHaveAccount")}{" "}
                            </span>
                            <Link
                                href="/login"
                                className="text-sm text-accent-primary hover:text-accent-primary/80 transition-colors font-medium"
                            >
                                {t("signIn")}
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

function LoadingFallback() {
    return (
        <div className="flex items-center justify-center min-h-screen relative">
            <Card glass className="w-[480px]">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">Carregando...</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
                </CardContent>
            </Card>
        </div>
    )
}

export default function SignupPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <SignupForm />
        </Suspense>
    )
}
