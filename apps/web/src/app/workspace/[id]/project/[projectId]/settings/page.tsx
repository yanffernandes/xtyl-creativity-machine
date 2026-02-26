"use client"

import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import ProjectSettingsForm from "@/components/project/ProjectSettingsForm"
import ProjectContextPreview from "@/components/project/ProjectContextPreview"
import { useProject } from "@/hooks/use-projects"

export default function ProjectSettingsPage() {
    const params = useParams()
    const router = useRouter()
    const workspaceId = params.id as string
    const projectId = params.projectId as string

    // Fetch project to display name (Feature 020)
    const { data: project, isLoading: isLoadingProject } = useProject(projectId)

    return (
        <div className="min-h-screen bg-surface-primary">
            <div className="max-w-4xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/workspace/${workspaceId}/project/${projectId}`)}
                        className="mb-4 text-text-secondary hover:text-text-primary hover:bg-surface-tertiary"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Project
                    </Button>
                    <div className="flex items-start justify-between">
                        <div>
                            {/* Project name badge (Feature 020) */}
                            {!isLoadingProject && project && (
                                <div className="flex items-center gap-2 mb-2">
                                    <Settings className="w-4 h-4 text-text-tertiary" />
                                    <span className="text-sm font-medium text-text-secondary">
                                        {project.name}
                                    </span>
                                </div>
                            )}
                            <h1 className="text-3xl font-semibold text-text-primary tracking-tight">
                                Project Settings
                            </h1>
                            <p className="text-text-secondary mt-2">
                                Configure project information that will be used as context for AI-generated content.
                            </p>
                        </div>
                        <ProjectContextPreview projectId={projectId} />
                    </div>
                </div>

                {/* Settings Form */}
                <ProjectSettingsForm
                    projectId={projectId}
                    workspaceId={workspaceId}
                />
            </div>
        </div>
    )
}
