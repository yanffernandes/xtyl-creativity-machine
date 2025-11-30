"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/store"

export default function Home() {
    const router = useRouter()
    const { session, isLoading } = useAuthStore()

    useEffect(() => {
        if (isLoading) return

        if (session) {
            router.push("/dashboard")
        } else {
            router.push("/login")
        }
    }, [session, isLoading, router])

    return null
}
