"use client"

import { useState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useAuthStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, ArrowLeft } from "lucide-react"

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)
    const resetPassword = useAuthStore((state) => state.resetPassword)
    const t = useTranslations("auth")
    const tErrors = useTranslations("errors")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSuccess(false)
        setLoading(true)

        try {
            const result = await resetPassword(email)

            if (result.error) {
                setError(result.error)
                return
            }

            setSuccess(true)
        } catch (err) {
            setError(tErrors("generic"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen relative">
            <Card glass className="w-[450px]">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                        <Link href="/login" className="hover:text-accent-primary transition-colors">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        {t("resetPassword")}
                    </CardTitle>
                    <CardDescription className="text-text-secondary mt-2">
                        {t("checkEmail")}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {success ? (
                        <Alert className="border-green-500/20 bg-green-500/10">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-700 dark:text-green-300">
                                {t("checkEmail")}
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium">{t("email")}</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>
                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                    <p className="text-red-500 text-sm">{error}</p>
                                </div>
                            )}
                            <Button type="submit" className="w-full" size="lg" disabled={loading}>
                                {loading ? `${t("sendResetLink")}...` : t("sendResetLink")}
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
