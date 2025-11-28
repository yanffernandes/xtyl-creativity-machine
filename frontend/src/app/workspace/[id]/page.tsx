"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/store"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Folder, Workflow } from "lucide-react"

interface Project {
    id: string
    name: string
    description: string
    created_at: string
}

export default function WorkspacePage() {
    const params = useParams()
    const workspaceId = params.id as string
    const [projects, setProjects] = useState<Project[]>([])
    const [newProjectName, setNewProjectName] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    const { token } = useAuthStore()
    const router = useRouter()

    useEffect(() => {
        if (!token) {
            router.push("/login")
            return
        }
        if (workspaceId) {
            fetchProjects()
        }
    }, [token, workspaceId, router])

    const fetchProjects = async () => {
        try {
            const response = await api.get(`/workspaces/${workspaceId}/projects`)
            setProjects(response.data)
        } catch (error) {
            console.error("Failed to fetch projects", error)
        }
    }

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await api.post(`/workspaces/${workspaceId}/projects`, {
                name: newProjectName,
                description: "Project created via UI",
                workspace_id: workspaceId
            })
            setNewProjectName("")
            setIsCreating(false)
            fetchProjects()
        } catch (error) {
            console.error("Failed to create project", error)
        }
    }

    return (
        <div className="min-h-screen p-8 relative">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-12">
                    <div>
                        <div className="flex gap-2 mb-4">
                            <Button variant="ghost" onClick={() => router.push("/dashboard")} className="pl-0 hover:pl-2 transition-all">
                                &larr; Back to Dashboard
                            </Button>
                            <Button
                                onClick={() => router.push(`/workspace/${workspaceId}/workflows`)}
                                variant="outline"
                                className="gap-2"
                            >
                                <Workflow className="w-4 h-4" />
                                Workflow Templates
                            </Button>
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight mb-2">Workspace Projects</h1>
                        <p className="text-text-secondary">Select a project to continue or create a new one</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                        <Card key={project.id} glass clickable onClick={() => router.push(`/workspace/${workspaceId}/project/${project.id}`)}>
                            <CardHeader className="flex flex-row items-center gap-4">
                                <div className="bg-accent-primary/10 p-3 rounded-lg">
                                    <Folder className="h-6 w-6 text-accent-primary" />
                                </div>
                                <div className="flex-1">
                                    <CardTitle className="text-lg">{project.name}</CardTitle>
                                    <CardDescription>{project.description}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-text-tertiary">
                                    Created {new Date(project.created_at).toLocaleDateString()}
                                </p>
                            </CardContent>
                        </Card>
                    ))}

                    <Card glass className="border-dashed border-accent-primary/30 flex flex-col justify-center items-center p-6 min-h-[180px]">
                        {!isCreating ? (
                            <Button variant="ghost" className="h-full w-full flex flex-col gap-3" onClick={() => setIsCreating(true)}>
                                <div className="bg-accent-primary/10 p-3 rounded-lg">
                                    <Plus className="h-8 w-8 text-accent-primary" />
                                </div>
                                <span className="font-medium">Create New Project</span>
                            </Button>
                        ) : (
                            <form onSubmit={handleCreateProject} className="w-full space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-sm font-medium">Project Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="My Awesome Project"
                                        value={newProjectName}
                                        onChange={(e) => setNewProjectName(e.target.value)}
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
        </div>
    )
}
