"use client"

import { useState, useEffect } from "react"
import { Eye, Copy, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { getProjectContext, ProjectContext } from "@/lib/api"

interface ProjectContextPreviewProps {
    projectId: string
}

const FIELD_SUGGESTIONS: Record<string, string> = {
    description: "Add a project description to help the AI understand your goals",
    target_audience: "Define your target audience for more relevant content",
    brand_voice: "Set a brand voice/tone for consistent messaging",
    key_messages: "Add key messages to reinforce important talking points",
}

export default function ProjectContextPreview({ projectId }: ProjectContextPreviewProps) {
    const { toast } = useToast()
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [context, setContext] = useState<ProjectContext | null>(null)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (isOpen) {
            loadContext()
        }
    }, [isOpen, projectId])

    async function loadContext() {
        try {
            setIsLoading(true)
            const data = await getProjectContext(projectId)
            setContext(data)
        } catch (error) {
            console.error("Error loading context:", error)
            toast({
                title: "Error",
                description: "Failed to load AI context preview",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    async function handleCopy() {
        if (!context?.formatted_context) return

        try {
            await navigator.clipboard.writeText(context.formatted_context)
            setCopied(true)
            toast({
                title: "Copied!",
                description: "AI context copied to clipboard",
            })
            setTimeout(() => setCopied(false), 2000)
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to copy to clipboard",
                variant: "destructive",
            })
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="gap-2 border-border-primary text-text-secondary hover:bg-surface-tertiary hover:text-text-primary"
                >
                    <Eye className="h-4 w-4" />
                    View AI Context
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col bg-surface-secondary border-border-primary">
                <DialogHeader>
                    <DialogTitle className="text-text-primary">AI Context Preview</DialogTitle>
                    <DialogDescription className="text-text-secondary">
                        This is the context that will be sent to the AI assistant for this project.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary" />
                    </div>
                ) : context ? (
                    <div className="flex-1 overflow-auto space-y-4">
                        {/* Missing Fields Suggestions */}
                        {context.missing_fields.length > 0 && (
                            <div className="bg-accent-warning/10 border border-accent-warning/30 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-accent-warning flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-accent-warning mb-2">
                                            Improve your AI responses
                                        </h4>
                                        <ul className="space-y-1">
                                            {context.missing_fields.map((field) => (
                                                <li key={field} className="text-sm text-text-secondary">
                                                    {FIELD_SUGGESTIONS[field] || `Add ${field.replace(/_/g, " ")}`}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Context Preview */}
                        {context.has_settings ? (
                            <div className="relative">
                                <div className="absolute top-2 right-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCopy}
                                        className="h-8 px-2 text-text-secondary hover:text-text-primary hover:bg-surface-tertiary"
                                    >
                                        {copied ? (
                                            <Check className="h-4 w-4 text-accent-success" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                        <span className="ml-1 text-xs">
                                            {copied ? "Copied!" : "Copy"}
                                        </span>
                                    </Button>
                                </div>
                                <pre className="bg-surface-tertiary text-text-primary rounded-lg p-4 pr-20 text-sm overflow-auto whitespace-pre-wrap font-mono border border-border-primary">
                                    {context.formatted_context}
                                </pre>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-text-secondary">
                                <p>No project settings configured yet.</p>
                                <p className="text-sm mt-2 text-text-tertiary">
                                    Add at least a client name to enable AI context.
                                </p>
                            </div>
                        )}
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    )
}
