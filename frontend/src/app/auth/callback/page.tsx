"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function AuthCallbackPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                // Get the code from URL if present (for OAuth flows)
                const code = searchParams.get("code")
                const errorParam = searchParams.get("error")
                const errorDescription = searchParams.get("error_description")

                if (errorParam) {
                    setError(errorDescription || errorParam)
                    return
                }

                if (code) {
                    // Exchange code for session
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

                    if (exchangeError) {
                        setError(exchangeError.message)
                        return
                    }
                }

                // Check if this is a password reset flow
                const type = searchParams.get("type")

                if (type === "recovery") {
                    // Redirect to reset password page
                    router.push("/reset-password")
                    return
                }

                // Default: redirect to dashboard
                router.push("/dashboard")
            } catch (err) {
                console.error("Auth callback error:", err)
                setError("Ocorreu um erro ao processar a autenticacao.")
            }
        }

        handleAuthCallback()
    }, [router, searchParams])

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen relative">
                <Card glass className="w-[420px]">
                    <CardHeader>
                        <CardTitle className="text-2xl text-center text-red-500">Erro de Autenticacao</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-center text-text-secondary">{error}</p>
                        <button
                            onClick={() => router.push("/login")}
                            className="mt-4 w-full text-accent-primary hover:text-accent-primary/80"
                        >
                            Voltar para o login
                        </button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen relative">
            <Card glass className="w-[420px]">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">Processando...</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
                    <p className="text-text-secondary">Aguarde enquanto processamos sua autenticacao.</p>
                </CardContent>
            </Card>
        </div>
    )
}
