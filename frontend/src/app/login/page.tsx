"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuthStore } from "@/lib/store"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
    const [email, setEmail] = useState("yan@xtyl.digital")
    const [password, setPassword] = useState("123321313")
    const [error, setError] = useState("")
    const login = useAuthStore((state) => state.login)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        try {
            const formData = new FormData()
            formData.append("username", email)
            formData.append("password", password)

            const response = await api.post("/auth/token", formData, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" }
            })

            login(response.data.access_token, response.data.refresh_token)
            router.push("/dashboard")
        } catch (err) {
            setError("Invalid credentials")
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen relative">
            <Card glass className="w-[420px]">
                <CardHeader>
                    <CardTitle className="text-3xl text-center">Login to XTYL</CardTitle>
                    <p className="text-center text-text-secondary mt-2">Welcome back! Please enter your details.</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                <p className="text-red-500 text-sm">{error}</p>
                            </div>
                        )}
                        <Button type="submit" className="w-full" size="lg">Login</Button>
                        <div className="text-center">
                            <Link
                                href="/forgot-password"
                                className="text-sm text-accent-primary hover:text-accent-primary/80 transition-colors font-medium"
                            >
                                Esqueci minha senha
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
