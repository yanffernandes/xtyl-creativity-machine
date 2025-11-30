"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Copy, Folder } from "lucide-react";
import api from "@/lib/api";

interface Project {
    id: string;
    name: string;
}

interface InstantiateTemplateModalProps {
    template: any | null;
    open: boolean;
    onClose: () => void;
    workspaceId: string;
}

export default function InstantiateTemplateModal({
    template,
    open,
    onClose,
    workspaceId,
}: InstantiateTemplateModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");
    const [workflowName, setWorkflowName] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open && workspaceId) {
            fetchProjects();
        }
    }, [open, workspaceId]);

    useEffect(() => {
        if (template) {
            setWorkflowName(`${template.name} (Copy)`);
        }
    }, [template]);

    const fetchProjects = async () => {
        try {
            const response = await api.get(`/workspaces/${workspaceId}/projects`);
            setProjects(response.data);
            if (response.data.length > 0) {
                setSelectedProjectId(response.data[0].id);
            }
        } catch (error) {
            console.error("Error fetching projects:", error);
        }
    };

    const handleInstantiate = async () => {
        if (!template || !selectedProjectId) return;

        try {
            setLoading(true);
            setError(null);

            // Duplicate the template into the selected project
            const response = await api.post(`/workflows/${template.id}/duplicate`, {
                workspace_id: workspaceId,
                project_id: selectedProjectId,
                name: workflowName,
            });

            const newWorkflow = response.data;

            // Redirect to builder
            router.push(`/workspace/${workspaceId}/workflows/builder/${newWorkflow.id}`);
            onClose();
        } catch (err: any) {
            console.error("Error instantiating template:", err);
            setError(err.message || "Failed to create workflow from template");
        } finally {
            setLoading(false);
        }
    };

    if (!template) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Copy className="w-5 h-5 text-blue-500" />
                        Use Template
                    </DialogTitle>
                    <DialogDescription>
                        Create a new workflow from <strong>{template.name}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Workflow Name</Label>
                        <Input
                            value={workflowName}
                            onChange={(e) => setWorkflowName(e.target.value)}
                            placeholder="My New Workflow"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Target Project</Label>
                        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a project" />
                            </SelectTrigger>
                            <SelectContent>
                                {projects.map((project) => (
                                    <SelectItem key={project.id} value={project.id}>
                                        <div className="flex items-center gap-2">
                                            <Folder className="w-4 h-4 text-gray-400" />
                                            {project.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {projects.length === 0 && (
                            <p className="text-xs text-amber-600">
                                No projects found. Please create a project first.
                            </p>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleInstantiate}
                        disabled={loading || !selectedProjectId || !workflowName.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            "Create Workflow"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
