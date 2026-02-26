"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

function ResetPasswordForm() {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)
    const [checkingSession, setCheckingSession] = useState(true)
    const [hasValidSession, setHasValidSession] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const t = useTranslations("auth")
    const tValidation = useTranslations("validation")
    const tCommon = useTranslations("common")

    useEffect(() => {
        checkRecoverySession()
    }, [])

    const checkRecoverySession = async () => {
        setCheckingSession(true)
        try {
            // Check if we have a valid session (from recovery flow)
            const { data: { session }, error } = await supabase.auth.getSession()

            if (error) {
                console.error("Session error:", error)
                setHasValidSession(false)
                setError("Sessão inválida. Solicite um novo link de recuperação.")
                return
            }

            if (session) {
                setHasValidSession(true)
            } else {
                // Check URL for recovery params (hash fragment from Supabase)
                // Supabase sometimes passes tokens in the URL hash
                const hash = window.location.hash
                if (hash && hash.includes("access_token")) {
                    // Let Supabase handle the hash and create session
                    const { data, error: hashError } = await supabase.auth.getSession()
                    if (!hashError && data.session) {
                        setHasValidSession(true)
                        return
                    }
                }

                setHasValidSession(false)
                setError("Link de recuperação inválido ou expirado. Solicite um novo link.")
            }
        } catch (err) {
            console.error("Check session error:", err)
            setHasValidSession(false)
            setError("Erro ao verificar sessão. Tente novamente.")
        } finally {
            setCheckingSession(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSuccess(false)

        if (password.length < 6) {
            setError(tValidation("minLength", { min: 6 }))
            return
        }

        if (password !== confirmPassword) {
            setError(tValidation("passwordMatch"))
            return
        }

        setLoading(true)

        try {
            // Use Supabase to update password directly
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            })

            if (updateError) {
                throw updateError
            }

            setSuccess(true)

            // Sign out after password reset
            await supabase.auth.signOut()

            setTimeout(() => {
                router.push("/login")
            }, 3000)
        } catch (err: any) {
            console.error("Password update error:", err)
            const errorMessage = err.message || "Erro ao atualizar senha. Tente novamente."
            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    // Loading state while checking session
    if (checkingSession) {
        return (
            <div className="flex items-center justify-center min-h-screen relative">
                <Card glass className="w-[450px]">
                    <CardHeader>
                        <CardTitle className="text-2xl">{t("resetPassword")}</CardTitle>
                        <CardDescription className="text-text-secondary mt-2">
                            Verificando link de recuperação...
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen relative">
            <Card glass className="w-[450px]">
                <CardHeader>
                    <CardTitle className="text-2xl">{t("resetPassword")}</CardTitle>
                    <CardDescription className="text-text-secondary mt-2">
                        {hasValidSession ? t("newPassword") : "Link de recuperação"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {success ? (
                        <div className="space-y-4">
                            <Alert className="border-green-500/20 bg-green-500/10">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-700 dark:text-green-300">
                                    {t("passwordResetSuccess")}
                                </AlertDescription>
                            </Alert>
                            <p className="text-sm text-text-secondary text-center">
                                Redirecionando para o login...
                            </p>
                            <Button
                                onClick={() => router.push("/login")}
                                className="w-full"
                                variant="outline"
                            >
                                Ir para Login
                            </Button>
                        </div>
                    ) : !hasValidSession ? (
                        <div className="space-y-4">
                            <Alert className="border-red-500/20 bg-red-500/10">
                                <AlertCircle className="h-4 w-4 text-red-600" />
                                <AlertDescription className="text-red-700 dark:text-red-300">
                                    {error || "Link de recuperação inválido ou expirado."}
                                </AlertDescription>
                            </Alert>
                            <p className="text-sm text-text-secondary text-center">
                                Solicite um novo link de recuperação de senha.
                            </p>
                            <div className="flex flex-col gap-2">
                                <Button
                                    onClick={() => router.push("/forgot-password")}
                                    className="w-full"
                                >
                                    Solicitar Novo Link
                                </Button>
                                <Button
                                    onClick={() => router.push("/login")}
                                    className="w-full"
                                    variant="outline"
                                >
                                    {t("backToLogin")}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium">
                                    {t("newPassword")}
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
                                        Atualizando...
                                    </>
                                ) : (
                                    t("resetPassword")
                                )}
                            </Button>

                            <div className="text-center">
                                <Link
                                    href="/login"
                                    className="text-sm text-accent-primary hover:text-accent-primary/80 transition-colors font-medium"
                                >
                                    {t("backToLogin")}
                                </Link>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

function LoadingFallback() {
    const t = useTranslations("auth")
    const tCommon = useTranslations("common")

    return (
        <div className="flex items-center justify-center min-h-screen relative">
            <Card glass className="w-[450px]">
                <CardHeader>
                    <CardTitle className="text-2xl">{t("resetPassword")}</CardTitle>
                    <CardDescription className="text-text-secondary mt-2">
                        {tCommon("loading")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
                </CardContent>
            </Card>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <ResetPasswordForm />
        </Suspense>
    )
}
