"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Layers, Sparkles, Search, FolderOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { WorkflowCard } from "@/components/workflow/WorkflowCard";
import WorkspaceSidebar from "@/components/WorkspaceSidebar";
import Breadcrumbs from "@/components/Breadcrumbs";
import api from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  is_system: boolean;
  is_recommended?: boolean;
  usage_count: number;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
}

export default function WorkflowTemplatesPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const workspaceId = params.id as string;

  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");

  // Modal state
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [workspaceId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch workspace info
      const workspaceRes = await api.get(`/workspaces/`);
      const workspaces = workspaceRes.data;
      const currentWorkspace = workspaces.find((w: any) => w.id === workspaceId);
      if (currentWorkspace) {
        setWorkspaceName(currentWorkspace.name);
      }

      // Fetch projects
      const projectsRes = await api.get(`/workspaces/${workspaceId}/projects`);
      setProjects(projectsRes.data || []);

      // Fetch ONLY system templates (workflow templates)
      const templatesRes = await api.get("/workflows/", {
        params: {
          is_system: true,
        },
      });
      setTemplates(templatesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = (template: WorkflowTemplate) => {
    if (projects.length === 0) {
      toast({
        title: "No Projects",
        description: "Create a project first to use workflow templates",
        variant: "destructive",
      });
      return;
    }
    setSelectedTemplate(template);
    setSelectedProjectId(projects[0]?.id || "");
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate || !selectedProjectId) return;

    setIsCreating(true);
    try {
      const response = await api.post(
        `/workflows/${selectedTemplate.id}/duplicate`,
        null,
        {
          params: {
            workspace_id: workspaceId,
            project_id: selectedProjectId,
            name: `${selectedTemplate.name}`,
          },
        }
      );

      toast({
        title: "Workflow Created",
        description: `"${selectedTemplate.name}" added to your project`,
      });

      // Navigate to the new workflow editor
      router.push(
        `/workspace/${workspaceId}/project/${selectedProjectId}/workflows/${response.data.id}`
      );
    } catch (error: any) {
      console.error("Failed to create workflow:", error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to create workflow from template",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
      setSelectedTemplate(null);
    }
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      !selectedCategory || template.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = [
    { value: null, label: "All" },
    { value: "social_media", label: "Social Media" },
    { value: "paid_ads", label: "Paid Ads" },
    { value: "blog", label: "Blog" },
    { value: "email", label: "Email" },
    { value: "seo", label: "SEO" },
    { value: "creative", label: "Creative" },
  ];

  const breadcrumbItems = [
    { label: workspaceName || "Workspace", href: `/workspace/${workspaceId}`, icon: <FolderOpen className="h-3.5 w-3.5" /> },
    { label: "Workflow Templates", icon: <Layers className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Sidebar */}
      <div className="p-3 pr-0">
        <WorkspaceSidebar className="h-[calc(100vh-24px)]" />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-6 border-b border-white/[0.08]">
          <Breadcrumbs items={breadcrumbItems} className="mb-3" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Workflow Templates
                </h1>
                <p className="text-sm text-muted-foreground">
                  Pre-built automation workflows. Select a template to use it in your project.
                </p>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white/[0.03] border-white/[0.08]"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category.value || "all"}
                  onClick={() => setSelectedCategory(category.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                    selectedCategory === category.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground border border-white/[0.08]"
                  )}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-40 rounded-xl bg-white/[0.03] border border-white/[0.08] animate-pulse"
                />
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-white/[0.03] mb-4">
                <Sparkles className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No templates found
              </h3>
              <p className="text-muted-foreground max-w-sm">
                {searchQuery
                  ? "Try adjusting your search or filters"
                  : "No workflow templates available yet"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <WorkflowCard
                  key={template.id}
                  id={template.id}
                  name={template.name}
                  description={template.description}
                  category={template.category}
                  isSystem={true}
                  isRecommended={template.is_recommended}
                  usageCount={template.usage_count}
                  createdAt={template.created_at}
                  onDuplicate={() => handleUseTemplate(template)}
                  onEdit={() => handleUseTemplate(template)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Use Template Modal */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use Template</DialogTitle>
            <DialogDescription>
              Create a new workflow from "{selectedTemplate?.name}" in one of your projects.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="project">Select Project</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedTemplate(null)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFromTemplate}
              disabled={isCreating || !selectedProjectId}
            >
              {isCreating ? "Creating..." : "Create Workflow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
