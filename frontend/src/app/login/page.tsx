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
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-[350px]">
                <CardHeader>
                    <CardTitle>Login to XTYL</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <Button type="submit" className="w-full">Login</Button>
                        <div className="text-center">
                            <Link
                                href="/forgot-password"
                                className="text-sm text-muted-foreground hover:text-primary transition-colors"
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
