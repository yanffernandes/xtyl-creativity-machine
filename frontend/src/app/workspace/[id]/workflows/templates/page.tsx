"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { LayoutTemplate, Search, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TemplateCard from "@/components/workflow/TemplateCard";
import InstantiateTemplateModal from "@/components/workflow/InstantiateTemplateModal";
import api from "@/lib/api";

interface WorkflowTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    is_system: boolean;
    usage_count: number;
    nodes_json: any[];
    edges_json: any[];
    default_params_json: Record<string, any>;
    created_at: string;
}

export default function TemplateLibraryPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
    const [launchModalOpen, setLaunchModalOpen] = useState(false);

    useEffect(() => {
        fetchTemplates();
    }, [workspaceId]);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            // Fetch both system templates and workspace templates
            const response = await api.get("/workflows/templates", {
                params: {
                    workspace_id: workspaceId,
                },
            });
            setTemplates(response.data);
        } catch (error) {
            console.error("Error fetching templates:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUseTemplate = (template: WorkflowTemplate) => {
        setSelectedTemplate(template);
        setLaunchModalOpen(true);
    };

    const filteredTemplates = templates.filter((template) =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const systemTemplates = filteredTemplates.filter(t => t.is_system);
    const workspaceTemplates = filteredTemplates.filter(t => !t.is_system);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
                            <LayoutTemplate className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                                Template Library
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                                Start from pre-built workflows or create your own templates
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() => router.push(`/workspace/${workspaceId}/workflows/builder/new?is_template=true`)}
                        className="gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create Template
                    </Button>
                </div>

                {/* Search */}
                <div className="relative mb-8">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                        placeholder="Search templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-12 text-lg bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                    />
                </div>

                {/* Templates Tabs */}
                <Tabs defaultValue="system" className="space-y-6">
                    <TabsList className="bg-white dark:bg-gray-900 p-1 border border-gray-200 dark:border-gray-800">
                        <TabsTrigger value="system" className="px-6">System Templates</TabsTrigger>
                        <TabsTrigger value="workspace" className="px-6">My Templates</TabsTrigger>
                    </TabsList>

                    <TabsContent value="system" className="space-y-6">
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[1, 2, 3].map((i) => (
                                    <Card key={i} className="h-64 animate-pulse bg-white dark:bg-gray-900" />
                                ))}
                            </div>
                        ) : systemTemplates.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {systemTemplates.map((template) => (
                                    <TemplateCard
                                        key={template.id}
                                        template={template}
                                        onClick={() => handleUseTemplate(template)}
                                        onEdit={() => {}}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                No system templates found matching your search.
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="workspace" className="space-y-6">
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[1, 2, 3].map((i) => (
                                    <Card key={i} className="h-64 animate-pulse bg-white dark:bg-gray-900" />
                                ))}
                            </div>
                        ) : workspaceTemplates.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {workspaceTemplates.map((template) => (
                                    <TemplateCard
                                        key={template.id}
                                        template={template}
                                        onClick={() => handleUseTemplate(template)}
                                        onEdit={() => router.push(`/workspace/${workspaceId}/workflows/builder/${template.id}`)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                                <LayoutTemplate className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No custom templates yet</h3>
                                <p className="text-gray-500 mb-6">Create your first template to reuse workflows across projects.</p>
                                <Button onClick={() => router.push(`/workspace/${workspaceId}/workflows/builder/new?is_template=true`)}>
                                    Create Template
                                </Button>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                <InstantiateTemplateModal
                    template={selectedTemplate}
                    open={launchModalOpen}
                    onClose={() => setLaunchModalOpen(false)}
                    workspaceId={workspaceId}
                />
            </div>
        </div>
    );
}
