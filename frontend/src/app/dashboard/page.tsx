"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/store"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"

interface Workspace {
    id: string
    name: string
    description: string
    created_at: string
}

export default function DashboardPage() {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [newWorkspaceName, setNewWorkspaceName] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    const { token, logout } = useAuthStore()
    const router = useRouter()

    useEffect(() => {
        if (!token) {
            router.push("/login")
            return
        }

        fetchWorkspaces()
    }, [token, router])

    const fetchWorkspaces = async () => {
        try {
            const response = await api.get("/workspaces/")
            const workspaceData = response.data
            setWorkspaces(workspaceData)

            // Auto-redirect if only one workspace
            if (workspaceData.length === 1) {
                router.push(`/workspace/${workspaceData[0].id}`)
            }
        } catch (error) {
            console.error("Failed to fetch workspaces", error)
        }
    }

    const handleCreateWorkspace = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await api.post("/workspaces/", {
                name: newWorkspaceName,
                description: "Created via Dashboard"
            })
            setNewWorkspaceName("")
            setIsCreating(false)
            fetchWorkspaces()
        } catch (error) {
            console.error("Failed to create workspace", error)
        }
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Your Workspaces</h1>
                <Button variant="outline" onClick={logout}>Logout</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {workspaces.map((workspace) => (
                    <Card key={workspace.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/workspace/${workspace.id}`)}>
                        <CardHeader>
                            <CardTitle>{workspace.name}</CardTitle>
                            <CardDescription>{workspace.description}</CardDescription>
                        </CardHeader>
                    </Card>
                ))}

                <Card className="border-dashed flex flex-col justify-center items-center p-6 h-[200px]">
                    {!isCreating ? (
                        <Button variant="ghost" className="h-full w-full flex flex-col gap-2" onClick={() => setIsCreating(true)}>
                            <Plus className="h-8 w-8" />
                            <span>Create New Workspace</span>
                        </Button>
                    ) : (
                        <form onSubmit={handleCreateWorkspace} className="w-full space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Workspace Name</Label>
                                <Input
                                    id="name"
                                    value={newWorkspaceName}
                                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button type="submit" size="sm">Create</Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreating(false)}>Cancel</Button>
                            </div>
                        </form>
                    )}
                </Card>
            </div>
        </div>
    )
}
