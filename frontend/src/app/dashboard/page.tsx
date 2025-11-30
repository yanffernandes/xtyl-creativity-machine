"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/store"
import { useWorkspaces, useCreateWorkspace } from "@/hooks/use-workspaces"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Loader2 } from "lucide-react"

export default function DashboardPage() {
    const [newWorkspaceName, setNewWorkspaceName] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    const { session, isLoading: authLoading, logout } = useAuthStore()
    const router = useRouter()

    // Supabase hooks for workspace operations
    const { data: workspaces = [], isLoading: workspacesLoading } = useWorkspaces()
    const createWorkspace = useCreateWorkspace()

    useEffect(() => {
        if (authLoading) return

        if (!session) {
            router.push("/login")
            return
        }
    }, [session, authLoading, router])

    // Auto-redirect if only one workspace
    useEffect(() => {
        if (!workspacesLoading && workspaces && workspaces.length === 1) {
            router.push(`/workspace/${workspaces[0].id}`)
        }
    }, [workspaces, workspacesLoading, router])

    const handleCreateWorkspace = async (e: React.FormEvent) => {
        e.preventDefault()
        createWorkspace.mutate(
            {
                name: newWorkspaceName,
                description: "Created via Dashboard"
            },
            {
                onSuccess: () => {
                    setNewWorkspaceName("")
                    setIsCreating(false)
                }
            }
        )
    }

    const isLoading = authLoading || workspacesLoading

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
            </div>
        )
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
                    {(workspaces || []).map((workspace) => (
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
