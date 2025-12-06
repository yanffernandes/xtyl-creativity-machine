"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useAuthStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export default function RegisterPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [fullName, setFullName] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const register = useAuthStore((state) => state.register)
    const router = useRouter()
    const t = useTranslations("auth")
    const tErrors = useTranslations("errors")
    const tValidation = useTranslations("validation")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            const result = await register(email, password, fullName)

            if (result.error) {
                setError(result.error)
                return
            }

            router.push("/dashboard")
        } catch (err) {
            setError(tErrors("generic"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen relative">
            <Card glass className="w-[420px]">
                <CardHeader>
                    <CardTitle className="text-3xl text-center">{t("createAccount")}</CardTitle>
                    <p className="text-center text-text-secondary mt-2">{t("enterCredentials")}</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="fullName" className="text-sm font-medium">{t("fullName")}</Label>
                            <Input
                                id="fullName"
                                placeholder="John Doe"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
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
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium">{t("password")}</Label>
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
                            <p className="text-xs text-text-secondary">{tValidation("minLength", { min: 6 })}</p>
                        </div>
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                <p className="text-red-500 text-sm">{error}</p>
                            </div>
                        )}
                        <Button type="submit" className="w-full" size="lg" disabled={loading}>
                            {loading ? `${t("signUp")}...` : t("signUp")}
                        </Button>
                        <div className="text-center">
                            <span className="text-sm text-text-secondary">{t("alreadyHaveAccount")} </span>
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
