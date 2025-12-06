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
    const t = useTranslations("auth")
    const tValidation = useTranslations("validation")
    const tCommon = useTranslations("common")

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

        if (password.length < 6) {
            setError(tValidation("minLength", { min: 6 }))
            return
        }

        if (password !== confirmPassword) {
            setError(tValidation("passwordMatch"))
            return
        }

        if (!token) {
            setError(tValidation("invalidFormat"))
            return
        }

        setLoading(true)

        try {
            await api.post("/auth/password-reset/confirm", {
                token,
                new_password: password
            })
            setSuccess(true)

            setTimeout(() => {
                router.push("/login")
            }, 3000)
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || tValidation("invalidFormat")
            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen relative">
            <Card glass className="w-[450px]">
                <CardHeader>
                    <CardTitle className="text-2xl">{t("resetPassword")}</CardTitle>
                    <CardDescription className="text-text-secondary mt-2">
                        {t("newPassword")}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {success ? (
                        <Alert className="border-green-500/20 bg-green-500/10">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-700 dark:text-green-300">
                                {t("passwordResetSuccess")}
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {!token && (
                                <Alert className="border-red-500/20 bg-red-500/10">
                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                    <AlertDescription className="text-red-700 dark:text-red-300">
                                        {tValidation("invalidFormat")}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium">{t("newPassword")}</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="********"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading || !token}
                                    minLength={6}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-sm font-medium">{t("confirmNewPassword")}</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="********"
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
                                {loading ? `${t("resetPassword")}...` : t("resetPassword")}
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

export default function ResetPasswordPage() {
    const t = useTranslations("auth")
    const tCommon = useTranslations("common")

    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen relative">
                <Card glass className="w-[450px]">
                    <CardHeader>
                        <CardTitle className="text-2xl">{t("resetPassword")}</CardTitle>
                        <CardDescription className="text-text-secondary mt-2">{tCommon("loading")}</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    )
}
