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
        <div className="min-h-screen p-8 relative">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight mb-2">Your Workspaces</h1>
                        <p className="text-text-secondary">Select a workspace to continue or create a new one</p>
                    </div>
                    <Button variant="outline" onClick={logout}>Logout</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {workspaces.map((workspace) => (
                        <Card
                            key={workspace.id}
                            glass
                            clickable
                            onClick={() => router.push(`/workspace/${workspace.id}`)}
                        >
                            <CardHeader>
                                <CardTitle className="text-xl">{workspace.name}</CardTitle>
                                <CardDescription>{workspace.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-text-tertiary">
                                    Created {new Date(workspace.created_at).toLocaleDateString()}
                                </p>
                            </CardContent>
                        </Card>
                    ))}

                    <Card glass className="border-dashed flex flex-col justify-center items-center p-6 min-h-[200px]">
                        {!isCreating ? (
                            <Button variant="ghost" className="h-full w-full flex flex-col gap-3" onClick={() => setIsCreating(true)}>
                                <div className="w-12 h-12 rounded-full bg-accent-primary/10 flex items-center justify-center">
                                    <Plus className="h-6 w-6 text-accent-primary" />
                                </div>
                                <span className="font-semibold">Create New Workspace</span>
                            </Button>
                        ) : (
                            <form onSubmit={handleCreateWorkspace} className="w-full space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-sm font-medium">Workspace Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="My Workspace"
                                        value={newWorkspaceName}
                                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button type="submit" size="sm" className="flex-1">Create</Button>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreating(false)}>Cancel</Button>
                                </div>
                            </form>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    )
}
