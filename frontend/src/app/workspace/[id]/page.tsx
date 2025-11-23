"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/store"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Folder } from "lucide-react"

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
        <div className="min-h-screen bg-background p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <Button variant="ghost" onClick={() => router.push("/dashboard")} className="mb-2 pl-0 hover:pl-2 transition-all">
                        &larr; Back to Dashboard
                    </Button>
                    <h1 className="text-3xl font-bold">Workspace Projects</h1>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {projects.map((project) => (
                    <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/workspace/${workspaceId}/project/${project.id}`)}>
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className="bg-primary/10 p-2 rounded-lg">
                                <Folder className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle>{project.name}</CardTitle>
                                <CardDescription>{project.description}</CardDescription>
                            </div>
                        </CardHeader>
                    </Card>
                ))}

                <Card className="border-dashed flex flex-col justify-center items-center p-6 h-[150px]">
                    {!isCreating ? (
                        <Button variant="ghost" className="h-full w-full flex flex-col gap-2" onClick={() => setIsCreating(true)}>
                            <Plus className="h-8 w-8" />
                            <span>Create New Project</span>
                        </Button>
                    ) : (
                        <form onSubmit={handleCreateProject} className="w-full space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Project Name</Label>
                                <Input
                                    id="name"
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
    )
}
